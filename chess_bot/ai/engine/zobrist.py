import random

class Zobrist:
    """Zobrist hashing for position identification"""
    
    # Random numbers for hashing
    pieces_array = None  # [piece_type][square_index]
    castling_rights = None  # [16 possible castling states]
    en_passant_file = None  # [9 files: 0=none, 1-8=files a-h]
    side_to_move = None
    
    @classmethod
    def initialize(cls):
        """Initialize Zobrist random numbers with fixed seed"""
        random.seed(29426028)  # Same seed as C# implementation
        
        # Piece array: 15 piece types (including color) x 64 squares
        cls.pieces_array = [[cls._random_64bit() for _ in range(64)] 
                           for _ in range(15)]
        
        # Castling rights: 16 possible states (4 bits)
        cls.castling_rights = [cls._random_64bit() for _ in range(16)]
        
        # En passant file: 0 = none, 1-8 = files a-h
        cls.en_passant_file = [0] + [cls._random_64bit() for _ in range(8)]
        
        # Side to move
        cls.side_to_move = cls._random_64bit()
    
    @classmethod
    def calculate_zobrist_key(cls, board):
        """
        Calculate zobrist key from board position.
        Slow method - only use for initial position.
        During search, update incrementally.
        """
        if cls.pieces_array is None:
            cls.initialize()
        
        zobrist_key = 0
        
        # Hash all pieces
        for square_index in range(64):
            piece = board.square[square_index]
            if piece != 0:
                zobrist_key ^= cls.pieces_array[piece][square_index]
        
        # Hash en passant file
        zobrist_key ^= cls.en_passant_file[board.en_passant_file]
        
        # Hash side to move (if black to move)
        if not board.white_to_move:
            zobrist_key ^= cls.side_to_move
        
        # Hash castling rights
        zobrist_key ^= cls.castling_rights[board.castling_rights]
        
        return zobrist_key
    
    @staticmethod
    def _random_64bit():
        """Generate random 64-bit number"""
        return random.randint(0, 2**64 - 1)


# Initialize on module load
Zobrist.initialize()