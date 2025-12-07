from .piece import Piece

class Evaluation:
    PAWN_VALUE = 100
    KNIGHT_VALUE = 300
    BISHOP_VALUE = 320
    ROOK_VALUE = 500
    QUEEN_VALUE = 900
    
    @staticmethod
    def evaluate(board):
        score = 0
        
        for square in range(64):
            piece = board.square[square]
            if piece == 0:
                continue
            
            piece_type = Piece.piece_type(piece)
            piece_value = {
                Piece.PAWN: Evaluation.PAWN_VALUE,
                Piece.KNIGHT: Evaluation.KNIGHT_VALUE,
                Piece.BISHOP: Evaluation.BISHOP_VALUE,
                Piece.ROOK: Evaluation.ROOK_VALUE,
                Piece.QUEEN: Evaluation.QUEEN_VALUE,
                Piece.KING: 0
            }.get(piece_type, 0)
            
            if Piece.is_white(piece):
                score += piece_value
            else:
                score -= piece_value
        
        return score if board.white_to_move else -score