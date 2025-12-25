"""
Opening Book for chess bot - plays known good opening moves.
"""

import random


class OpeningBook:
    """Opening book with weighted move selection"""
    
    def __init__(self, book_data=None):
        """
        Initialize opening book.
        book_data format: { "fen": [("move_uci", play_count), ...], ... }
        """
        self.moves_by_position = {}
        self.rng = random.Random()
        
        if book_data:
            self.load_book(book_data)
        else:
            self._load_default_book()
    
    def _load_default_book(self):
        """Load a small default opening book"""
        # Starting position common responses
        start_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        
        self.moves_by_position = {
            # Starting position - most popular moves
            start_fen: [
                ("e2e4", 100),  # King's Pawn
                ("d2d4", 80),   # Queen's Pawn
                ("c2c4", 50),   # English
                ("g1f3", 60),   # Reti
            ],
            
            # After 1.e4
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1": [
                ("e7e5", 100),  # Open game
                ("c7c5", 80),   # Sicilian
                ("e7e6", 60),   # French
                ("c7c6", 50),   # Caro-Kann
                ("d7d6", 40),   # Pirc
                ("g8f6", 50),   # Alekhine
            ],
            
            # After 1.e4 e5 2.Nf3
            "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2": [
                ("b8c6", 100),  # Knight
                ("g8f6", 80),   # Petrov
                ("d7d6", 40),   # Philidor
            ],
            
            # After 1.d4
            "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1": [
                ("d7d5", 100),  # Closed
                ("g8f6", 90),   # Indian
                ("e7e6", 60),   # French-style
                ("c7c5", 50),   # Benoni
            ],
            
            # After 1.d4 d5 2.c4
            "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2": [
                ("e7e6", 100),  # QGD
                ("c7c6", 80),   # Slav
                ("d5c4", 60),   # QGA
                ("g8f6", 70),   # Semi-Slav
            ],
            
            # After 1.e4 c5 2.Nf3 (Sicilian)
            "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2": [
                ("d7d6", 100),  # Dragon/Classical
                ("b8c6", 90),   # Sveshnikov/Accelerated Dragon
                ("e7e6", 80),   # Paulsen/Taimanov
                ("g7g6", 50),   # Hyperaccelerated Dragon
            ],
        }
    
    def load_book(self, book_data):
        """Load book from dictionary"""
        self.moves_by_position = book_data
    
    def has_book_move(self, fen):
        """Check if position is in book"""
        simplified_fen = self._simplify_fen(fen)
        return simplified_fen in self.moves_by_position
    
    def try_get_book_move(self, board, weight_pow=0.5):
        """
        Get a book move for current position.
        weight_pow: 0 = random, 1 = always most popular
        Returns: (move_uci, is_book_move)
        """
        fen = board.to_fen() if hasattr(board, 'to_fen') else board
        simplified_fen = self._simplify_fen(fen)
        
        if simplified_fen not in self.moves_by_position:
            return None, False
        
        moves = self.moves_by_position[simplified_fen]
        
        # Calculate weighted probabilities
        total_weight = sum(count ** weight_pow for _, count in moves)
        
        # Build cumulative probability distribution
        cumulative_probs = []
        cumulative = 0
        
        for move_uci, count in moves:
            weight = (count ** weight_pow) / total_weight
            cumulative += weight
            cumulative_probs.append((move_uci, cumulative))
        
        # Select move based on weighted random
        rand = self.rng.random()
        
        for move_uci, prob in cumulative_probs:
            if rand <= prob:
                return move_uci, True
        
        # Fallback (shouldn't reach here)
        return moves[0][0], True
    
    def _simplify_fen(self, fen):
        """
        Simplify FEN to match book.txt format.
        book.txt uses: position side castling ep (with '-' for ep if none)
        """
        parts = fen.split()
        if len(parts) >= 4:
            # Return: position side castling ep
            return ' '.join(parts[:4])
        return fen

# Example usage with polyglot book format (for .bin files)
class PolyglotBook:
    """
    Support for Polyglot opening book format (.bin files).
    These are widely available chess opening books.
    """
    
    def __init__(self, book_path):
        """Load polyglot book from .bin file"""
        self.entries = []
        self._load_polyglot_book(book_path)
    
    def _load_polyglot_book(self, book_path):
        """Load binary polyglot book"""
        try:
            import struct
            
            with open(book_path, 'rb') as f:
                while True:
                    # Polyglot entry: 8 bytes key + 2 bytes move + 2 bytes weight + 4 bytes learn
                    data = f.read(16)
                    if len(data) < 16:
                        break
                    
                    key, move, weight, learn = struct.unpack(">QHHІ", data)
                    self.entries.append({
                        'key': key,
                        'move': move,
                        'weight': weight,
                        'learn': learn
                    })
        except FileNotFoundError:
            print(f"Warning: Book file {book_path} not found")
        except Exception as e:
            print(f"Error loading book: {e}")
    
    def probe(self, zobrist_key):
        """Find moves for given zobrist key"""
        moves = []
        for entry in self.entries:
            if entry['key'] == zobrist_key:
                moves.append((entry['move'], entry['weight']))
        return moves
