from .piece import Piece
from .move import Move


class MoveGenerator:
    """Generates legal moves with proper check detection"""
    
    def __init__(self):
        self.direction_offsets = [8, -8, -1, 1, 7, -7, 9, -9]
        self.knight_offsets = [15, 17, -17, -15, 10, -6, 6, -10]
        
        # Precompute number of squares to edge for each square
        self.num_squares_to_edge = [[0] * 8 for _ in range(64)]
        for square in range(64):
            rank = square // 8
            file = square % 8
            north = 7 - rank
            south = rank
            west = file
            east = 7 - file
            
            self.num_squares_to_edge[square] = [
                north, south, west, east,
                min(north, west), min(south, east),
                min(north, east), min(south, west)
            ]
    
    def generate_moves(self, board, captures_only=False):
        """Generate all pseudo-legal moves"""
        moves = []
        color = Piece.WHITE if board.white_to_move else Piece.BLACK
        
        for square in range(64):
            piece = board.square[square]
            if piece == 0 or Piece.piece_color(piece) != color:
                continue
            
            piece_type = Piece.piece_type(piece)
            
            if piece_type == Piece.PAWN:
                self._gen_pawn_moves(board, square, moves, captures_only)
            elif piece_type == Piece.KNIGHT:
                self._gen_knight_moves(board, square, moves, captures_only)
            elif piece_type == Piece.BISHOP:
                self._gen_sliding_moves(board, square, moves, [4, 5, 6, 7], captures_only)
            elif piece_type == Piece.ROOK:
                self._gen_sliding_moves(board, square, moves, [0, 1, 2, 3], captures_only)
            elif piece_type == Piece.QUEEN:
                self._gen_sliding_moves(board, square, moves, range(8), captures_only)
            elif piece_type == Piece.KING:
                self._gen_king_moves(board, square, moves, captures_only)
        
        # Filter out illegal moves (that leave king in check)
        legal_moves = []
        for move in moves:
            board.make_move(move, in_search=True)
            if not self.is_in_check(board):
                legal_moves.append(move)
            board.unmake_move(move, in_search=True)
        
        return legal_moves
    
    def is_in_check(self, board):
        """
        Check if current side to move is in check.
        CRITICAL: This must work correctly for legal move generation!
        """
        color_index = 0 if board.white_to_move else 1
        king_square = board.king_square[color_index]
        
        return self.is_square_attacked(board, king_square, not board.white_to_move)
    
    def is_square_attacked(self, board, square, by_white):
        """Check if a square is attacked by given color"""
        attacker_color = Piece.WHITE if by_white else Piece.BLACK
        
        # Check for pawn attacks
        pawn_direction = 1 if by_white else -1
        pawn_attacks = [square + pawn_direction * 7, square + pawn_direction * 9]
        
        for attack_square in pawn_attacks:
            if 0 <= attack_square < 64:
                # Check if pawn actually can reach this square (not wrapped)
                square_file = square % 8
                attack_file = attack_square % 8
                if abs(square_file - attack_file) == 1:
                    piece = board.square[attack_square]
                    if Piece.piece_type(piece) == Piece.PAWN and Piece.piece_color(piece) == attacker_color:
                        return True
        
        # Check for knight attacks
        for offset in self.knight_offsets:
            attack_square = square + offset
            if 0 <= attack_square < 64:
                square_rank = square // 8
                square_file = square % 8
                attack_rank = attack_square // 8
                attack_file = attack_square % 8
                
                # Verify knight move is valid (not wrapped)
                if abs(square_rank - attack_rank) <= 2 and abs(square_file - attack_file) <= 2:
                    piece = board.square[attack_square]
                    if Piece.piece_type(piece) == Piece.KNIGHT and Piece.piece_color(piece) == attacker_color:
                        return True
        
        # Check for king attacks
        for offset in self.direction_offsets:
            attack_square = square + offset
            if 0 <= attack_square < 64:
                square_file = square % 8
                attack_file = attack_square % 8
                
                # Check for valid king move (not wrapped)
                if abs(square_file - attack_file) <= 1:
                    piece = board.square[attack_square]
                    if Piece.piece_type(piece) == Piece.KING and Piece.piece_color(piece) == attacker_color:
                        return True
        
        # Check for sliding piece attacks (rook, bishop, queen)
        # Bishops and queens on diagonals
        for dir_index in [4, 5, 6, 7]:
            if self._is_attacked_by_slider(board, square, dir_index, attacker_color, diagonal=True):
                return True
        
        # Rooks and queens on orthogonals
        for dir_index in [0, 1, 2, 3]:
            if self._is_attacked_by_slider(board, square, dir_index, attacker_color, diagonal=False):
                return True
        
        return False
    
    def _is_attacked_by_slider(self, board, square, dir_index, attacker_color, diagonal):
        """Check if square is attacked by slider in given direction"""
        offset = self.direction_offsets[dir_index]
        
        for distance in range(1, self.num_squares_to_edge[square][dir_index] + 1):
            target = square + offset * distance
            
            if not (0 <= target < 64):
                break
            
            # Check if we've wrapped around board
            square_file = square % 8
            target_file = target % 8
            if abs(square_file - target_file) > distance:
                break
            
            piece = board.square[target]
            if piece != 0:
                if Piece.piece_color(piece) == attacker_color:
                    piece_type = Piece.piece_type(piece)
                    if piece_type == Piece.QUEEN:
                        return True
                    if diagonal and piece_type == Piece.BISHOP:
                        return True
                    if not diagonal and piece_type == Piece.ROOK:
                        return True
                break
        
        return False
    
    def _gen_pawn_moves(self, board, square, moves, captures_only):
        """Generate pawn moves"""
        direction = 1 if board.white_to_move else -1
        start_rank = 1 if board.white_to_move else 6
        promo_rank = 7 if board.white_to_move else 0
        
        rank = square // 8
        file = square % 8
        
        # Single push
        if not captures_only:
            target = square + direction * 8
            if 0 <= target < 64 and board.square[target] == 0:
                if rank + direction == promo_rank:
                    moves.append(Move(square, target, Move.PROMOTE_TO_QUEEN_FLAG))
                    moves.append(Move(square, target, Move.PROMOTE_TO_KNIGHT_FLAG))
                    moves.append(Move(square, target, Move.PROMOTE_TO_ROOK_FLAG))
                    moves.append(Move(square, target, Move.PROMOTE_TO_BISHOP_FLAG))
                else:
                    moves.append(Move(square, target))
                    
                    # Double push
                    if rank == start_rank:
                        target2 = square + direction * 16
                        if board.square[target2] == 0:
                            moves.append(Move(square, target2, Move.PAWN_TWO_UP_FLAG))
        
        # Captures
        for offset in [direction * 7, direction * 9]:
            target = square + offset
            if not (0 <= target < 64):
                continue
            
            target_file = target % 8
            if abs(file - target_file) != 1:
                continue
            
            target_piece = board.square[target]
            enemy_color = Piece.BLACK if board.white_to_move else Piece.WHITE
            
            if target_piece != 0 and Piece.piece_color(target_piece) == enemy_color:
                if rank + direction == promo_rank:
                    moves.append(Move(square, target, Move.PROMOTE_TO_QUEEN_FLAG))
                    moves.append(Move(square, target, Move.PROMOTE_TO_KNIGHT_FLAG))
                    moves.append(Move(square, target, Move.PROMOTE_TO_ROOK_FLAG))
                    moves.append(Move(square, target, Move.PROMOTE_TO_BISHOP_FLAG))
                else:
                    moves.append(Move(square, target))
            
            # En passant
            elif board.en_passant_file > 0:
                ep_file = board.en_passant_file - 1
                ep_rank = 5 if board.white_to_move else 2
                ep_square = ep_rank * 8 + ep_file
                
                if target == ep_square:
                    moves.append(Move(square, target, Move.EN_PASSANT_FLAG))
    
    def _gen_knight_moves(self, board, square, moves, captures_only):
        """Generate knight moves"""
        file = square % 8
        rank = square // 8
        enemy_color = Piece.BLACK if board.white_to_move else Piece.WHITE
        
        for offset in self.knight_offsets:
            target = square + offset
            if not (0 <= target < 64):
                continue
            
            target_file = target % 8
            target_rank = target // 8
            
            # Verify knight move is valid (not wrapped)
            if abs(file - target_file) > 2 or abs(rank - target_rank) > 2:
                continue
            
            target_piece = board.square[target]
            if target_piece == 0:
                if not captures_only:
                    moves.append(Move(square, target))
            elif Piece.piece_color(target_piece) == enemy_color:
                moves.append(Move(square, target))
    
    def _gen_sliding_moves(self, board, square, moves, directions, captures_only):
        """Generate sliding piece moves (rook, bishop, queen)"""
        enemy_color = Piece.BLACK if board.white_to_move else Piece.WHITE
        
        for dir_idx in directions:
            offset = self.direction_offsets[dir_idx]
            
            for distance in range(1, self.num_squares_to_edge[square][dir_idx] + 1):
                target = square + offset * distance
                
                if not (0 <= target < 64):
                    break
                
                # Check board wrapping
                square_file = square % 8
                target_file = target % 8
                if abs(square_file - target_file) > distance:
                    break
                
                target_piece = board.square[target]
                if target_piece == 0:
                    if not captures_only:
                        moves.append(Move(square, target))
                elif Piece.piece_color(target_piece) == enemy_color:
                    moves.append(Move(square, target))
                    break
                else:
                    break
    
    def _gen_king_moves(self, board, square, moves, captures_only):
        """Generate king moves"""
        enemy_color = Piece.BLACK if board.white_to_move else Piece.WHITE
        
        for offset in self.direction_offsets:
            target = square + offset
            if not (0 <= target < 64):
                continue
            
            if abs((square % 8) - (target % 8)) > 1:
                continue
            
            target_piece = board.square[target]
            if target_piece == 0:
                if not captures_only:
                    moves.append(Move(square, target))
            elif Piece.piece_color(target_piece) == enemy_color:
                moves.append(Move(square, target))
        
        # Castling
        if not captures_only and not self.is_in_check(board):
            self._gen_castling_moves(board, square, moves)
    
    def _gen_castling_moves(self, board, square, moves):
        """Generate castling moves"""
        if board.white_to_move:
            # White kingside
            if board.castling_rights & board.WHITE_KINGSIDE_MASK:
                if (board.square[5] == 0 and board.square[6] == 0 and
                    not self.is_square_attacked(board, 5, False) and
                    not self.is_square_attacked(board, 6, False)):
                    moves.append(Move(square, 6, Move.CASTLE_FLAG))
            
            # White queenside
            if board.castling_rights & board.WHITE_QUEENSIDE_MASK:
                if (board.square[1] == 0 and board.square[2] == 0 and board.square[3] == 0 and
                    not self.is_square_attacked(board, 2, False) and
                    not self.is_square_attacked(board, 3, False)):
                    moves.append(Move(square, 2, Move.CASTLE_FLAG))
        else:
            # Black kingside
            if board.castling_rights & board.BLACK_KINGSIDE_MASK:
                if (board.square[61] == 0 and board.square[62] == 0 and
                    not self.is_square_attacked(board, 61, True) and
                    not self.is_square_attacked(board, 62, True)):
                    moves.append(Move(square, 62, Move.CASTLE_FLAG))
            
            # Black queenside
            if board.castling_rights & board.BLACK_QUEENSIDE_MASK:
                if (board.square[57] == 0 and board.square[58] == 0 and board.square[59] == 0 and
                    not self.is_square_attacked(board, 58, True) and
                    not self.is_square_attacked(board, 59, True)):
                    moves.append(Move(square, 58, Move.CASTLE_FLAG))