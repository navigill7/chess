from .board import Board
from .searcher import Searcher
from .move import Move
import time

class Bot:
    USE_MAX_THINK_TIME = False
    MAX_THINK_TIME_MS = 2500
    
    def __init__(self):
        self.board = Board()
        self.searcher = Searcher(self.board)
        self.is_thinking = False
        self.latest_move_is_book_move = False
    
    def notify_new_game(self):
        """Notify bot of new game"""
        self.searcher.clear_for_new_position()
    
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
        Calculate thinking time - matches Bot.ChooseThinkTime()
        """
        my_time_remaining_ms = time_remaining_white_ms if self.board.white_to_move else time_remaining_black_ms
        my_increment_ms = increment_white_ms if self.board.white_to_move else increment_black_ms
        
        # Get fraction of remaining time
        think_time_ms = my_time_remaining_ms / 40.0
        
        # Clamp if maximum limit imposed
        if self.USE_MAX_THINK_TIME:
            think_time_ms = min(self.MAX_THINK_TIME_MS, think_time_ms)
        
        # Add increment
        if my_time_remaining_ms > my_increment_ms * 2:
            think_time_ms += my_increment_ms * 0.8
        
        min_think_time = min(50, my_time_remaining_ms * 0.25)
        return int(max(min_think_time, think_time_ms))
    
    def think_timed(self, time_ms: int) -> tuple:
        """
        Main thinking function - matches Bot.ThinkTimed()
        Returns: (best_move_uci, evaluation, nodes_searched)
        """
        self.latest_move_is_book_move = False
        self.is_thinking = True
        
        # TODO: Add opening book support later
        
        # Start search
        best_move, evaluation, nodes = self.searcher.start_search(time_ms)
        
        self.is_thinking = False
        
        if best_move:
            return best_move.to_uci(), evaluation, nodes
        else:
            return None, 0, 0