import time
import math
from typing import Optional, Tuple
from .board import Board
from .move import Move
from .move_generator import MoveGenerator
from .evaluation import Evaluation

class Searcher:
    IMMEDIATE_MATE_SCORE = 100000
    POSITIVE_INFINITY = 9999999
    NEGATIVE_INFINITY = -9999999
    MAX_EXTENSIONS = 16
    
    def __init__(self, board: Board):
        self.board = board
        self.evaluation = Evaluation()
        self.move_generator = MoveGenerator()
        
        # State
        self.current_depth = 0
        self.best_move = None
        self.best_eval = 0
        self.best_move_this_iteration = None
        self.best_eval_this_iteration = 0
        self.has_searched_at_least_one_move = False
        self.search_cancelled = False
        
        # Diagnostics
        self.nodes_searched = 0
        self.num_cutoffs = 0
        self.search_start_time = 0
        self.time_limit_ms = 0
        
        # Move ordering
        self.killer_moves = [[None, None] for _ in range(64)]
        self.history = [[[0 for _ in range(64)] for _ in range(64)] for _ in range(2)]
    
    def clear_for_new_position(self):
        """Clear search data for new position"""
        self.killer_moves = [[None, None] for _ in range(64)]
        self.history = [[[0 for _ in range(64)] for _ in range(64)] for _ in range(2)]
    
    def start_search(self, time_ms: int) -> Tuple[Optional[Move], int, int]:
        """
        Main search entry point - matches Bot.ThinkTimed() + Searcher.StartSearch()
        Returns: (best_move, evaluation, nodes_searched)
        """
        # Initialize
        self.best_eval_this_iteration = self.best_eval = 0
        self.best_move_this_iteration = self.best_move = None
        self.search_cancelled = False
        self.nodes_searched = 0
        self.num_cutoffs = 0
        self.current_depth = 0
        self.time_limit_ms = time_ms
        self.search_start_time = time.time()
        
        # Run iterative deepening search
        self.run_iterative_deepening_search()
        
        # Return best move found
        if self.best_move is None:
            # Emergency fallback - return any legal move
            moves = self.move_generator.generate_moves(self.board)
            self.best_move = moves[0] if moves else None
        
        return self.best_move, self.best_eval, self.nodes_searched
    
    def run_iterative_deepening_search(self):
        """
        Iterative deepening loop - matches Searcher.RunIterativeDeepeningSearch()
        """
        for search_depth in range(1, 257):  # Search up to depth 256
            self.has_searched_at_least_one_move = False
            self.current_iteration_depth = search_depth
            
            # Check time before starting iteration
            if self.should_stop_search():
                break
            
            # Search at current depth
            self.search(
                ply_remaining=search_depth,
                ply_from_root=0,
                alpha=self.NEGATIVE_INFINITY,
                beta=self.POSITIVE_INFINITY
            )
            
            # Check if search was cancelled
            if self.search_cancelled:
                if self.has_searched_at_least_one_move:
                    # Use partial result
                    self.best_move = self.best_move_this_iteration
                    self.best_eval = self.best_eval_this_iteration
                break
            else:
                # Iteration completed successfully
                self.current_depth = search_depth
                self.best_move = self.best_move_this_iteration
                self.best_eval = self.best_eval_this_iteration
                
                # Reset for next iteration
                self.best_eval_this_iteration = float('-inf')
                self.best_move_this_iteration = None
                
                # Stop if found mate within search depth
                if self.is_mate_score(self.best_eval):
                    num_ply_to_mate = self.num_ply_to_mate_from_score(self.best_eval)
                    if num_ply_to_mate <= search_depth:
                        break
    
    def search(self, ply_remaining: int, ply_from_root: int, alpha: int, beta: int,
               num_extensions: int = 0, prev_move: Optional[Move] = None, 
               prev_was_capture: bool = False) -> int:
        """
        Main alpha-beta search - matches Searcher.Search()
        """
        if self.should_stop_search():
            self.search_cancelled = True
            return 0
        
        # Draw detection (repetition/50-move rule)
        if ply_from_root > 0:
            if self.board.fifty_move_counter >= 100:
                return 0
            
            # Mate distance pruning
            alpha = max(alpha, -self.IMMEDIATE_MATE_SCORE + ply_from_root)
            beta = min(beta, self.IMMEDIATE_MATE_SCORE - ply_from_root)
            if alpha >= beta:
                return alpha
        
        # Quiescence search at leaf nodes
        if ply_remaining == 0:
            return self.quiescence_search(alpha, beta)
        
        # Generate moves
        moves = self.move_generator.generate_moves(self.board)
        
        # Order moves (simple ordering for now)
        self.order_moves(moves, ply_from_root)
        
        # Checkmate/stalemate detection
        if len(moves) == 0:
            if self.is_in_check():
                # Checkmate
                mate_score = self.IMMEDIATE_MATE_SCORE - ply_from_root
                return -mate_score
            else:
                # Stalemate
                return 0
        
        evaluation_bound = 'upper'
        best_move_in_position = None
        
        for i, move in enumerate(moves):
            captured_piece_type = self.get_piece_type_at(move.target_square)
            is_capture = captured_piece_type != 0
            
            # Make move
            self.board.make_move(move)
            
            # Extensions (checks, passed pawns)
            extension = 0
            if num_extensions < self.MAX_EXTENSIONS:
                if self.is_in_check():
                    extension = 1
            
            # Search extensions and reductions logic
            needs_full_search = True
            eval_score = 0
            
            # Late move reduction
            if extension == 0 and ply_remaining >= 3 and i >= 3 and not is_capture:
                reduce_depth = 1
                eval_score = -self.search(
                    ply_remaining - 1 - reduce_depth,
                    ply_from_root + 1,
                    -alpha - 1,
                    -alpha,
                    num_extensions,
                    move,
                    is_capture
                )
                needs_full_search = eval_score > alpha
            
            # Full depth search
            if needs_full_search:
                eval_score = -self.search(
                    ply_remaining - 1 + extension,
                    ply_from_root + 1,
                    -beta,
                    -alpha,
                    num_extensions + extension,
                    move,
                    is_capture
                )
            
            # Unmake move
            self.board.load_position(self.board.to_fen())  # Simple unmake via FEN reload
            
            if self.search_cancelled:
                return 0
            
            # Beta cutoff
            if eval_score >= beta:
                # Update killer moves and history
                if not is_capture and ply_from_root < 64:
                    self.add_killer_move(move, ply_from_root)
                    history_score = ply_remaining * ply_remaining
                    color_idx = 0 if self.board.white_to_move else 1
                    self.history[color_idx][move.start_square][move.target_square] += history_score
                
                self.num_cutoffs += 1
                return beta
            
            # New best move
            if eval_score > alpha:
                evaluation_bound = 'exact'
                best_move_in_position = move
                alpha = eval_score
                
                if ply_from_root == 0:
                    self.best_move_this_iteration = move
                    self.best_eval_this_iteration = eval_score
                    self.has_searched_at_least_one_move = True
        
        return alpha
    
    def quiescence_search(self, alpha: int, beta: int) -> int:
        """
        Quiescence search - matches Searcher.QuiescenceSearch()
        """
        if self.should_stop_search():
            self.search_cancelled = True
            return 0
        
        # Stand-pat evaluation
        eval_score = Evaluation.evaluate(self.board)
        self.nodes_searched += 1
        
        if eval_score >= beta:
            self.num_cutoffs += 1
            return beta
        
        if eval_score > alpha:
            alpha = eval_score
        
        # Generate and search captures only
        moves = self.move_generator.generate_moves(self.board)
        capture_moves = [m for m in moves if self.is_capture_move(m)]
        
        for move in capture_moves:
            self.board.make_move(move)
            eval_score = -self.quiescence_search(-beta, -alpha)
            self.board.load_position(self.board.to_fen())
            
            if eval_score >= beta:
                self.num_cutoffs += 1
                return beta
            
            if eval_score > alpha:
                alpha = eval_score
        
        return alpha
    
    def order_moves(self, moves: list, ply_from_root: int):
        """Simple move ordering - prioritize captures and killer moves"""
        def move_score(move):
            score = 0
            
            # Captures
            captured_type = self.get_piece_type_at(move.target_square)
            if captured_type != 0:
                moving_type = self.get_piece_type_at(move.start_square)
                score += 10 * captured_type - moving_type
            
            # Killer moves
            if ply_from_root < 64:
                if move == self.killer_moves[ply_from_root][0]:
                    score += 100
                elif move == self.killer_moves[ply_from_root][1]:
                    score += 90
            
            # History heuristic
            color_idx = 0 if self.board.white_to_move else 1
            score += self.history[color_idx][move.start_square][move.target_square]
            
            return score
        
        moves.sort(key=move_score, reverse=True)
    
    def add_killer_move(self, move: Move, ply: int):
        """Add killer move at given ply"""
        if self.killer_moves[ply][0] != move:
            self.killer_moves[ply][1] = self.killer_moves[ply][0]
            self.killer_moves[ply][0] = move
    
    def should_stop_search(self) -> bool:
        """Check if time limit exceeded"""
        elapsed_ms = (time.time() - self.search_start_time) * 1000
        return elapsed_ms >= self.time_limit_ms
    
    def is_in_check(self) -> bool:
        """Check if current side is in check"""
        # Implement check detection (simplified)
        return False  # TODO: Implement properly
    
    def is_capture_move(self, move: Move) -> bool:
        """Check if move is a capture"""
        return self.board.square[move.target_square] != 0
    
    def get_piece_type_at(self, square: int) -> int:
        """Get piece type at square"""
        piece = self.board.square[square]
        return piece & 0b0111 if piece != 0 else 0
    
    @staticmethod
    def is_mate_score(score: int) -> bool:
        """Check if score represents mate"""
        return abs(score) > Searcher.IMMEDIATE_MATE_SCORE - 1000
    
    @staticmethod
    def num_ply_to_mate_from_score(score: int) -> int:
        """Get number of ply to mate from score"""
        return Searcher.IMMEDIATE_MATE_SCORE - abs(score)