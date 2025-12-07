from .piece import Piece
from .move import Move

class MoveGenerator:
    """Generates pseudo-legal moves"""
    
    def __init__(self):
        self.direction_offsets = [8, -8, -1, 1, 7, -7, 9, -9]
        self.knight_offsets = [15, 17, -17, -15, 10, -6, 6, -10]
    
    def generate_moves(self, board):
        """Generate all moves"""
        moves = []
        color = Piece.WHITE if board.white_to_move else Piece.BLACK
        
        for square in range(64):
            piece = board.square[square]
            if piece == 0 or Piece.piece_color(piece) != color:
                continue
            
            piece_type = Piece.piece_type(piece)
            
            if piece_type == Piece.PAWN:
                self._gen_pawn_moves(board, square, moves)
            elif piece_type == Piece.KNIGHT:
                self._gen_knight_moves(board, square, moves)
            elif piece_type == Piece.BISHOP:
                self._gen_sliding_moves(board, square, moves, [4, 5, 6, 7])
            elif piece_type == Piece.ROOK:
                self._gen_sliding_moves(board, square, moves, [0, 1, 2, 3])
            elif piece_type == Piece.QUEEN:
                self._gen_sliding_moves(board, square, moves, range(8))
            elif piece_type == Piece.KING:
                self._gen_king_moves(board, square, moves)
        
        return moves
    
    def _gen_pawn_moves(self, board, square, moves):
        direction = 1 if board.white_to_move else -1
        start_rank = 1 if board.white_to_move else 6
        promo_rank = 7 if board.white_to_move else 0
        
        rank = square // 8
        file = square % 8
        
        target = square + direction * 8
        if 0 <= target < 64 and board.square[target] == 0:
            if rank + direction == promo_rank:
                moves.append(Move(square, target, Move.PROMOTE_TO_QUEEN_FLAG))
                moves.append(Move(square, target, Move.PROMOTE_TO_KNIGHT_FLAG))
            else:
                moves.append(Move(square, target))
                
                if rank == start_rank:
                    target2 = square + direction * 16
                    if board.square[target2] == 0:
                        moves.append(Move(square, target2, Move.PAWN_TWO_UP_FLAG))
        
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
                else:
                    moves.append(Move(square, target))
    
    def _gen_knight_moves(self, board, square, moves):
        file = square % 8
        rank = square // 8
        enemy_color = Piece.BLACK if board.white_to_move else Piece.WHITE
        
        for offset in self.knight_offsets:
            target = square + offset
            if not (0 <= target < 64):
                continue
            
            target_file = target % 8
            target_rank = target // 8
            
            if abs(file - target_file) > 2 or abs(rank - target_rank) > 2:
                continue
            
            target_piece = board.square[target]
            if target_piece == 0 or Piece.piece_color(target_piece) == enemy_color:
                moves.append(Move(square, target))
    
    def _gen_sliding_moves(self, board, square, moves, directions):
        enemy_color = Piece.BLACK if board.white_to_move else Piece.WHITE
        
        for dir_idx in directions:
            offset = self.direction_offsets[dir_idx]
            
            for distance in range(1, 8):
                target = square + offset * distance
                
                if not (0 <= target < 64):
                    break
                
                file_diff = abs((square % 8) - (target % 8))
                rank_diff = abs((square // 8) - (target // 8))
                if file_diff > distance or rank_diff > distance:
                    break
                
                target_piece = board.square[target]
                if target_piece == 0:
                    moves.append(Move(square, target))
                elif Piece.piece_color(target_piece) == enemy_color:
                    moves.append(Move(square, target))
                    break
                else:
                    break
    
    def _gen_king_moves(self, board, square, moves):
        enemy_color = Piece.BLACK if board.white_to_move else Piece.WHITE
        
        for offset in self.direction_offsets:
            target = square + offset
            if not (0 <= target < 64):
                continue
            
            if abs((square % 8) - (target % 8)) > 1:
                continue
            
            target_piece = board.square[target]
            if target_piece == 0 or Piece.piece_color(target_piece) == enemy_color:
                moves.append(Move(square, target))