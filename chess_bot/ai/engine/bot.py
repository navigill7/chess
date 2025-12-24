from .board import Board
from .searcher import Searcher
from .move import Move
from .opening_book import OpeningBook
import time

"""
Improved Bot with opening book support and better configuration.
"""
class Bot:  
    def __init__(self, use_opening_book=True):
        """Initialize bot"""
        self.board = Board()
        self.searcher = Searcher(self.board)
        self.opening_book = OpeningBook() if use_opening_book else None
        
        # Configuration
        self.use_max_think_time = False
        self.max_think_time_ms = 2500
        self.max_book_ply = 16  # Use book for first 8 moves
        
        # State
        self.is_thinking = False
        self.latest_move_is_book_move = False
    
    def notify_new_game(self):
        """Notify bot of new game"""
        self.searcher.clear_for_new_position()
        self.latest_move_is_book_move = False
    
    def set_position(self, fen: str):
        """Set board position from FEN"""
        self.board = Board(fen)
        self.searcher.board = self.board
    
    def make_move(self, move_string: str):
        """Make move on board"""
        move = Move.from_uci(move_string)
        self.board.make_move(move)
    
    def choose_think_time(self, time_remaining_white_ms: int, time_remaining_black_ms: int,
                          increment_white_ms: int, increment_black_ms: int) -> int:
        """
        Calculate thinking time based on time control.
        """
        my_time_remaining_ms = time_remaining_white_ms if self.board.white_to_move else time_remaining_black_ms
        my_increment_ms = increment_white_ms if self.board.white_to_move else increment_black_ms
        
        # Get fraction of remaining time (plan for 40 moves)
        think_time_ms = my_time_remaining_ms / 40.0
        
        # Clamp if maximum limit imposed
        if self.use_max_think_time:
            think_time_ms = min(self.max_think_time_ms, think_time_ms)
        
        # Add increment
        if my_time_remaining_ms > my_increment_ms * 2:
            think_time_ms += my_increment_ms * 0.8
        
        min_think_time = min(50, my_time_remaining_ms * 0.25)
        return int(max(min_think_time, think_time_ms))
    
    def think_timed(self, time_ms: int) -> tuple:
        """
        Main thinking function.
        Returns: (best_move_uci, evaluation, nodes_searched)
        """
        self.latest_move_is_book_move = False
        self.is_thinking = True
        
        # Try opening book first
        if self.opening_book and self.board.ply_count <= self.max_book_ply:
            book_move, is_book = self.opening_book.try_get_book_move(self.board)
            if is_book:
                self.latest_move_is_book_move = True
                self.is_thinking = False
                return book_move, 0, 0
        
        # Run search
        best_move, evaluation, nodes = self.searcher.start_search(time_ms)
        
        self.is_thinking = False
        
        if best_move:
            return best_move.to_uci(), evaluation, nodes
        else:
            return None, 0, 0
    
    def get_board_fen(self) -> str:
        """Get current board FEN"""
        return self.board.to_fen()


# Legacy function for backward compatibility
def get_bot_move(request):
    """
    Legacy endpoint - use game session endpoints instead.
    """
    from django.http import JsonResponse
    import json
    
    try:
        data = json.loads(request.body)
        fen = data.get('fen', Board.START_FEN)
        time_ms = data.get('time_ms', 2000)
        
        bot = Bot()
        bot.set_position(fen)
        
        move_uci, evaluation, nodes = bot.think_timed(time_ms)
        
        if move_uci is None:
            return JsonResponse({
                'success': False,
                'error': 'No legal moves available'
            }, status=400)
        
        return JsonResponse({
            'success': True,
            'move': move_uci,
            'evaluation': evaluation,
            'nodes_searched': nodes,
            'time_ms': time_ms,
            'is_book_move': bot.latest_move_is_book_move
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


def validate_move(request):
    """Legacy endpoint - validate move"""
    from django.http import JsonResponse
    from .move_generator import MoveGenerator
    import json
    
    try:
        data = json.loads(request.body)
        fen = data.get('fen')
        move_uci = data.get('move')
        
        if not fen or not move_uci:
            return JsonResponse({
                'success': False,
                'error': 'Missing fen or move'
            }, status=400)
        
        board = Board(fen)
        move = Move.from_uci(move_uci)
        
        gen = MoveGenerator()
        legal_moves = gen.generate_moves(board)
        legal_moves_uci = [m.to_uci() for m in legal_moves]
        
        is_legal = move_uci in legal_moves_uci
        
        if is_legal:
            board.make_move(move)
            new_fen = board.to_fen()
        else:
            new_fen = None
        
        return JsonResponse({
            'success': True,
            'legal': is_legal,
            'new_fen': new_fen,
            'legal_moves': legal_moves_uci
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)