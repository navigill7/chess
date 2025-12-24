from .piece import Piece
from .move import Move
from .zobrist import Zobrist


class GameState:
    """
    Stores all the state information needed to unmake a move.
    This allows fast unmake without FEN reload.
    """
    def __init__(self, captured_piece_type=0, en_passant_file=0, 
                 castling_rights=0, fifty_move_counter=0, zobrist_key=0):
        self.captured_piece_type = captured_piece_type
        self.en_passant_file = en_passant_file
        self.castling_rights = castling_rights
        self.fifty_move_counter = fifty_move_counter
        self.zobrist_key = zobrist_key


class Board:
    """Chess board with FEN support, proper unmake, and Zobrist hashing"""
    
    START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    
    # Castling right masks
    WHITE_KINGSIDE_MASK = 0b0001
    WHITE_QUEENSIDE_MASK = 0b0010
    BLACK_KINGSIDE_MASK = 0b0100
    BLACK_QUEENSIDE_MASK = 0b1000
    
    CLEAR_WHITE_KINGSIDE_MASK = 0b1110
    CLEAR_WHITE_QUEENSIDE_MASK = 0b1101
    CLEAR_BLACK_KINGSIDE_MASK = 0b1011
    CLEAR_BLACK_QUEENSIDE_MASK = 0b0111
    
    def __init__(self, fen=None):
        """Initialize board"""
        self.square = [0] * 64
        self.white_to_move = True
        self.castling_rights = 0
        self.en_passant_file = 0
        self.fifty_move_counter = 0
        self.move_count = 1
        self.ply_count = 0
        self.king_square = [0, 0]  # [white_king, black_king]
        
        # Game state history for unmake
        self.game_state_history = []
        self.current_game_state = GameState()
        
        # Repetition history (for draw detection)
        self.repetition_position_history = []
        
        if fen is None:
            fen = Board.START_FEN
        self.load_position(fen)
    
    def load_position(self, fen):
        """Load position from FEN string"""
        self.square = [0] * 64
        self.game_state_history = []
        self.repetition_position_history = []
        
        parts = fen.split()
        
        # Parse piece placement
        rank = 7
        file = 0
        for char in parts[0]:
            if char == '/':
                rank -= 1
                file = 0
            elif char.isdigit():
                file += int(char)
            else:
                piece_type = {
                    'p': Piece.PAWN, 'n': Piece.KNIGHT, 'b': Piece.BISHOP,
                    'r': Piece.ROOK, 'q': Piece.QUEEN, 'k': Piece.KING
                }[char.lower()]
                
                color = Piece.WHITE if char.isupper() else Piece.BLACK
                piece = Piece.make_piece(piece_type, color)
                
                square_index = rank * 8 + file
                self.square[square_index] = piece
                
                if piece_type == Piece.KING:
                    self.king_square[0 if color == Piece.WHITE else 1] = square_index
                
                file += 1
        
        # Parse side to move
        self.white_to_move = parts[1] == 'w'
        
        # Parse castling rights
        self.castling_rights = 0
        if 'K' in parts[2]:
            self.castling_rights |= self.WHITE_KINGSIDE_MASK
        if 'Q' in parts[2]:
            self.castling_rights |= self.WHITE_QUEENSIDE_MASK
        if 'k' in parts[2]:
            self.castling_rights |= self.BLACK_KINGSIDE_MASK
        if 'q' in parts[2]:
            self.castling_rights |= self.BLACK_QUEENSIDE_MASK
        
        # Parse en passant
        if parts[3] != '-':
            self.en_passant_file = ord(parts[3][0]) - ord('a') + 1
        else:
            self.en_passant_file = 0
        
        # Parse move counters
        if len(parts) > 4:
            self.fifty_move_counter = int(parts[4])
        if len(parts) > 5:
            self.move_count = int(parts[5])
        
        self.ply_count = (self.move_count - 1) * 2 + (0 if self.white_to_move else 1)
        
        # Calculate initial zobrist key
        zobrist_key = Zobrist.calculate_zobrist_key(self)
        self.current_game_state = GameState(
            captured_piece_type=0,
            en_passant_file=self.en_passant_file,
            castling_rights=self.castling_rights,
            fifty_move_counter=self.fifty_move_counter,
            zobrist_key=zobrist_key
        )
        
        # Initialize history
        self.game_state_history = [self.current_game_state]
        self.repetition_position_history = [zobrist_key]
    
    def make_move(self, move, in_search=False):
        """
        Make a move on the board with proper state tracking.
        in_search: if True, don't update repetition history (for search)
        """
        start_square = move.start_square
        target_square = move.target_square
        move_flag = move.flag
        
        moved_piece = self.square[start_square]
        moved_piece_type = Piece.piece_type(moved_piece)
        captured_piece = self.square[target_square]
        captured_piece_type = Piece.piece_type(captured_piece)
        
        # Special case: en passant capture
        is_en_passant = move_flag == Move.EN_PASSANT_FLAG
        if is_en_passant:
            captured_piece_type = Piece.PAWN
            captured_piece = Piece.make_piece(Piece.PAWN, 
                                             Piece.BLACK if self.white_to_move else Piece.WHITE)
        
        # Save current state
        prev_castling_state = self.castling_rights
        prev_en_passant_file = self.en_passant_file
        new_zobrist_key = self.current_game_state.zobrist_key
        new_castling_rights = self.castling_rights
        new_en_passant_file = 0
        
        # Update zobrist key - remove old piece position
        new_zobrist_key ^= Zobrist.pieces_array[moved_piece][start_square]
        
        # Move piece
        self.square[target_square] = moved_piece
        self.square[start_square] = 0
        
        # Update zobrist key - add new piece position (will be updated if promotion)
        new_zobrist_key ^= Zobrist.pieces_array[moved_piece][target_square]
        
        # Update king position
        if moved_piece_type == Piece.KING:
            color_index = 0 if self.white_to_move else 1
            self.king_square[color_index] = target_square
            
            # Remove castling rights
            if self.white_to_move:
                new_castling_rights &= 0b1100  # Clear white castling
            else:
                new_castling_rights &= 0b0011  # Clear black castling
        
        # Handle captures
        if captured_piece_type != Piece.NONE:
            if is_en_passant:
                # En passant capture
                capture_square = target_square + (-8 if self.white_to_move else 8)
                self.square[capture_square] = 0
                new_zobrist_key ^= Zobrist.pieces_array[captured_piece][capture_square]
            else:
                # Normal capture
                new_zobrist_key ^= Zobrist.pieces_array[captured_piece][target_square]
        
        # Handle castling
        if move_flag == Move.CASTLE_FLAG:
            # Determine rook squares
            if target_square == 6 or target_square == 62:  # Kingside (g1 or g8)
                rook_start = target_square + 1
                rook_target = target_square - 1
            else:  # Queenside (c1 or c8)
                rook_start = target_square - 2
                rook_target = target_square + 1
            
            rook_piece = self.square[rook_start]
            self.square[rook_target] = rook_piece
            self.square[rook_start] = 0
            
            # Update zobrist for rook movement
            new_zobrist_key ^= Zobrist.pieces_array[rook_piece][rook_start]
            new_zobrist_key ^= Zobrist.pieces_array[rook_piece][rook_target]
        
        # Handle promotion
        if move.is_promotion:
            promo_map = {
                Move.PROMOTE_TO_QUEEN_FLAG: Piece.QUEEN,
                Move.PROMOTE_TO_KNIGHT_FLAG: Piece.KNIGHT,
                Move.PROMOTE_TO_ROOK_FLAG: Piece.ROOK,
                Move.PROMOTE_TO_BISHOP_FLAG: Piece.BISHOP
            }
            promo_type = promo_map.get(move_flag, Piece.QUEEN)
            color = Piece.piece_color(moved_piece)
            promo_piece = Piece.make_piece(promo_type, color)
            
            # Remove pawn from zobrist, add promoted piece
            new_zobrist_key ^= Zobrist.pieces_array[moved_piece][target_square]
            new_zobrist_key ^= Zobrist.pieces_array[promo_piece][target_square]
            
            self.square[target_square] = promo_piece
        
        # Handle double pawn push (set en passant square)
        if move_flag == Move.PAWN_TWO_UP_FLAG:
            file = (start_square % 8) + 1
            new_en_passant_file = file
            new_zobrist_key ^= Zobrist.en_passant_file[file]
        
        # Update castling rights based on rook/king movement
        if prev_castling_state != 0:
            # Moving to/from rook squares removes castling
            if target_square == 7 or start_square == 7:  # h1
                new_castling_rights &= self.CLEAR_WHITE_KINGSIDE_MASK
            elif target_square == 0 or start_square == 0:  # a1
                new_castling_rights &= self.CLEAR_WHITE_QUEENSIDE_MASK
            elif target_square == 63 or start_square == 63:  # h8
                new_castling_rights &= self.CLEAR_BLACK_KINGSIDE_MASK
            elif target_square == 56 or start_square == 56:  # a8
                new_castling_rights &= self.CLEAR_BLACK_QUEENSIDE_MASK
        
        # Update zobrist for state changes
        new_zobrist_key ^= Zobrist.side_to_move  # Toggle side
        new_zobrist_key ^= Zobrist.en_passant_file[prev_en_passant_file]  # Remove old EP
        if new_castling_rights != prev_castling_state:
            new_zobrist_key ^= Zobrist.castling_rights[prev_castling_state]
            new_zobrist_key ^= Zobrist.castling_rights[new_castling_rights]
        
        # Update board state
        self.white_to_move = not self.white_to_move
        self.castling_rights = new_castling_rights
        self.en_passant_file = new_en_passant_file
        self.ply_count += 1
        
        # Update fifty move counter
        new_fifty_move_counter = self.fifty_move_counter + 1
        if moved_piece_type == Piece.PAWN or captured_piece_type != Piece.NONE:
            new_fifty_move_counter = 0
            if not in_search:
                self.repetition_position_history.clear()
        
        self.fifty_move_counter = new_fifty_move_counter
        
        if not self.white_to_move:
            self.move_count += 1
        
        # Save state for unmake
        new_state = GameState(
            captured_piece_type=captured_piece_type,
            en_passant_file=new_en_passant_file,
            castling_rights=new_castling_rights,
            fifty_move_counter=new_fifty_move_counter,
            zobrist_key=new_zobrist_key
        )
        self.game_state_history.append(new_state)
        self.current_game_state = new_state
        
        if not in_search:
            self.repetition_position_history.append(new_zobrist_key)
    
    def unmake_move(self, move, in_search=False):
        """
        Unmake a move - fast version using state stack.
        This is 100x+ faster than FEN reload!
        """
        # Restore side to move first
        self.white_to_move = not self.white_to_move
        
        start_square = move.start_square
        target_square = move.target_square
        move_flag = move.flag
        
        is_promotion = move.is_promotion
        is_en_passant = move_flag == Move.EN_PASSANT_FLAG
        
        # Get captured piece type from saved state
        captured_piece_type = self.current_game_state.captured_piece_type
        
        # Get moved piece (might be promoted piece currently on target)
        moved_piece_current = self.square[target_square]
        
        # If promotion, actual moved piece was a pawn
        if is_promotion:
            color = Piece.piece_color(moved_piece_current)
            moved_piece = Piece.make_piece(Piece.PAWN, color)
        else:
            moved_piece = moved_piece_current
        
        # Move piece back
        self.square[start_square] = moved_piece
        self.square[target_square] = 0
        
        # Restore captured piece
        if captured_piece_type != Piece.NONE:
            opponent_color = Piece.BLACK if self.white_to_move else Piece.WHITE
            captured_piece = Piece.make_piece(captured_piece_type, opponent_color)
            
            if is_en_passant:
                # Restore pawn captured by en passant
                capture_square = target_square + (-8 if self.white_to_move else 8)
                self.square[capture_square] = captured_piece
            else:
                # Normal capture - restore piece to target square
                self.square[target_square] = captured_piece
        
        # Restore king position
        moved_piece_type = Piece.piece_type(moved_piece)
        if moved_piece_type == Piece.KING:
            color_index = 0 if self.white_to_move else 1
            self.king_square[color_index] = start_square
            
            # Unmake castling
            if move_flag == Move.CASTLE_FLAG:
                if target_square == 6 or target_square == 62:  # Kingside
                    rook_start = target_square + 1
                    rook_target = target_square - 1
                else:  # Queenside
                    rook_start = target_square - 2
                    rook_target = target_square + 1
                
                rook_piece = self.square[rook_target]
                self.square[rook_start] = rook_piece
                self.square[rook_target] = 0
        
        # Restore state from history
        self.game_state_history.pop()
        self.current_game_state = self.game_state_history[-1]
        
        self.castling_rights = self.current_game_state.castling_rights
        self.en_passant_file = self.current_game_state.en_passant_file
        self.fifty_move_counter = self.current_game_state.fifty_move_counter
        
        self.ply_count -= 1
        if self.white_to_move:
            self.move_count -= 1
        
        if not in_search and self.repetition_position_history:
            self.repetition_position_history.pop()
    
    def to_fen(self):
        """Convert current position to FEN string"""
        fen_parts = []
        
        # Piece placement
        for rank in range(7, -1, -1):
            empty = 0
            rank_str = ""
            for file in range(8):
                square = rank * 8 + file
                piece = self.square[square]
                if piece == 0:
                    empty += 1
                else:
                    if empty > 0:
                        rank_str += str(empty)
                        empty = 0
                    rank_str += Piece.get_symbol(piece)
            if empty > 0:
                rank_str += str(empty)
            fen_parts.append(rank_str)
        
        fen = '/'.join(fen_parts)
        
        # Side to move
        fen += ' w' if self.white_to_move else ' b'
        
        # Castling rights
        castling = ''
        if self.castling_rights & self.WHITE_KINGSIDE_MASK:
            castling += 'K'
        if self.castling_rights & self.WHITE_QUEENSIDE_MASK:
            castling += 'Q'
        if self.castling_rights & self.BLACK_KINGSIDE_MASK:
            castling += 'k'
        if self.castling_rights & self.BLACK_QUEENSIDE_MASK:
            castling += 'q'
        fen += ' ' + (castling if castling else '-')
        
        # En passant
        if self.en_passant_file > 0:
            file_char = chr(ord('a') + self.en_passant_file - 1)
            rank_char = '6' if self.white_to_move else '3'
            fen += f' {file_char}{rank_char}'
        else:
            fen += ' -'
        
        # Move counters
        fen += f' {self.fifty_move_counter} {self.move_count}'
        
        return fen
    
    @property
    def zobrist_key(self):
        """Get current zobrist key"""
        return self.current_game_state.zobrist_key