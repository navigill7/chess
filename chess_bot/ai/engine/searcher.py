import time
from typing import Optional, Tuple
from .board import Board
from .move import Move
from .move_generator import MoveGenerator
from .evaluation import Evaluation
from .transposition_table import TranspositionTable
from .move_ordering import MoveOrdering
from .repetition_table import RepetitionTable
from .piece import Piece


class Searcher:
    """Advanced chess search with transposition table, move ordering, etc."""
    
    # Constants
    MAX_EXTENSIONS = 16
    IMMEDIATE_MATE_SCORE = 100000
    POSITIVE_INFINITY = 9999999
    NEGATIVE_INFINITY = -9999999
    
    def __init__(self, board: Board):
        """Initialize searcher"""
        self.board = board
        self.evaluation = Evaluation()
        self.move_generator = MoveGenerator()
        self.transposition_table = TranspositionTable(size_mb=64)
        self.move_ordering = MoveOrdering()
        self.repetition_table = RepetitionTable()
        
        # Search state
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
    
    def clear_for_new_position(self):
        """Clear search data for new position"""
        self.move_ordering.clear()
        self.transposition_table.clear()
    
    def start_search(self, time_ms: int) -> Tuple[Optional[Move], int, int]:
        """
        Main search entry point.
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
        
        # Initialize repetition table
        self.repetition_table.init([])
        
        # Run iterative deepening search
        self.run_iterative_deepening_search()
        
        # Emergency fallback
        if self.best_move is None:
            moves = self.move_generator.generate_moves(self.board)
            self.best_move = moves[0] if moves else None
        
        return self.best_move, self.best_eval, self.nodes_searched
    
    def run_iterative_deepening_search(self):
        """Iterative deepening loop"""
        for search_depth in range(1, 257):
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
        Main alpha-beta search with enhancements.
        """
        if self.should_stop_search():
            self.search_cancelled = True
            return 0
        
        # Draw detection
        if ply_from_root > 0:
            # Fifty move rule
            if self.board.fifty_move_counter >= 100:
                return 0
            
            # Repetition
            zobrist_key = self._calculate_zobrist_key()
            if self.repetition_table.contains(zobrist_key):
                return 0
            
            # Mate distance pruning
            alpha = max(alpha, -self.IMMEDIATE_MATE_SCORE + ply_from_root)
            beta = min(beta, self.IMMEDIATE_MATE_SCORE - ply_from_root)
            if alpha >= beta:
                return alpha
        
        # Check transposition table
        zobrist_key = self._calculate_zobrist_key()
        tt_value = self.transposition_table.lookup_evaluation(
            zobrist_key, ply_remaining, ply_from_root, alpha, beta
        )
        if tt_value != TranspositionTable.LOOKUP_FAILED:
            if ply_from_root == 0:
                self.best_move_this_iteration = self.transposition_table.try_get_stored_move(zobrist_key)
                if self.best_move_this_iteration:
                    self.best_eval_this_iteration = tt_value
            return tt_value
        
        # Quiescence search at leaf nodes
        if ply_remaining == 0:
            return self.quiescence_search(alpha, beta)
        
        # Generate and order moves
        moves = self.move_generator.generate_moves(self.board)
        hash_move = self.transposition_table.try_get_stored_move(zobrist_key)
        ordered_moves = self.move_ordering.order_moves(
            moves, self.board, hash_move, ply_from_root
        )
        
        # Checkmate/stalemate detection
        if len(ordered_moves) == 0:
            if self.is_in_check():
                # Checkmate
                mate_score = self.IMMEDIATE_MATE_SCORE - ply_from_root
                return -mate_score
            else:
                # Stalemate
                return 0
        
        # Update repetition table
        if ply_from_root > 0 and prev_move:
            was_pawn_move = Piece.piece_type(self.board.square[prev_move.target_square]) == Piece.PAWN
            self.repetition_table.push(zobrist_key, prev_was_capture or was_pawn_move)
        
        evaluation_bound = TranspositionTable.UPPER_BOUND
        best_move_in_position = None
        
        for i, move in enumerate(ordered_moves):
            captured_piece_type = Piece.piece_type(self.board.square[move.target_square])
            is_capture = captured_piece_type != 0
            
            # Make move
            self.board.make_move(move, in_search=True)
            
            # Extensions
            extension = 0
            if num_extensions < self.MAX_EXTENSIONS:
                if self.is_in_check():
                    extension = 1
                elif Piece.piece_type(self.board.square[move.target_square]) == Piece.PAWN:
                    target_rank = move.target_square // 8
                    if target_rank == 1 or target_rank == 6:  # Passed pawn
                        extension = 1
            
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
            self.board.unmake_move(move, in_search=True)
            
            if self.search_cancelled:
                if ply_from_root > 0:
                    self.repetition_table.try_pop()
                return 0
            
            # Beta cutoff
            if eval_score >= beta:
                self.transposition_table.store_evaluation(
                    zobrist_key, ply_remaining, ply_from_root, beta,
                    TranspositionTable.LOWER_BOUND, move
                )
                
                # Update move ordering data
                if not is_capture:
                    self.move_ordering.add_killer_move(move, ply_from_root)
                    self.move_ordering.update_history(move, self.board, ply_remaining)
                
                if ply_from_root > 0:
                    self.repetition_table.try_pop()
                
                self.num_cutoffs += 1
                return beta
            
            # New best move
            if eval_score > alpha:
                evaluation_bound = TranspositionTable.EXACT
                best_move_in_position = move
                alpha = eval_score
                
                if ply_from_root == 0:
                    self.best_move_this_iteration = move
                    self.best_eval_this_iteration = eval_score
                    self.has_searched_at_least_one_move = True
        
        if ply_from_root > 0:
            self.repetition_table.try_pop()
        
        self.transposition_table.store_evaluation(
            zobrist_key, ply_remaining, ply_from_root, alpha,
            evaluation_bound, best_move_in_position
        )
        
        return alpha
    
    def quiescence_search(self, alpha: int, beta: int) -> int:
        """Search captures until quiet position"""
        if self.should_stop_search():
            self.search_cancelled = True
            return 0
        
        # Stand-pat
        eval_score = Evaluation.evaluate(self.board)
        self.nodes_searched += 1
        
        if eval_score >= beta:
            self.num_cutoffs += 1
            return beta
        
        if eval_score > alpha:
            alpha = eval_score
        
        # Generate capture moves
        moves = self.move_generator.generate_moves(self.board)
        capture_moves = [m for m in moves if self.board.square[m.target_square] != 0]
        
        for move in capture_moves:
            self.board.make_move(move, in_search=True)
            eval_score = -self.quiescence_search(-beta, -alpha)
            self.board.unmake_move(move, in_search=True)
            
            if eval_score >= beta:
                self.num_cutoffs += 1
                return beta
            
            if eval_score > alpha:
                alpha = eval_score
        
        return alpha
    
    def should_stop_search(self) -> bool:
        """Check if time limit exceeded"""
        elapsed_ms = (time.time() - self.search_start_time) * 1000
        return elapsed_ms >= self.time_limit_ms
    
    def is_in_check(self) -> bool:
        """Check if current side is in check"""
        return self.move_generator.is_in_check(self.board)
    
    def _calculate_zobrist_key(self) -> int:
        """Get zobrist hash for current position"""
        return self.board.zobrist_key
    
    @staticmethod
    def is_mate_score(score: int) -> bool:
        """Check if score represents mate"""
        return abs(score) > Searcher.IMMEDIATE_MATE_SCORE - 1000
    
    @staticmethod
    def num_ply_to_mate_from_score(score: int) -> int:
        """Get number of ply to mate from score"""
        return Searcher.IMMEDIATE_MATE_SCORE - abs(score)