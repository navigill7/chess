class Move:
    """Compact 16-bit move representation"""
    NO_FLAG = 0
    EN_PASSANT_FLAG = 1
    CASTLE_FLAG = 2
    PAWN_TWO_UP_FLAG = 3
    PROMOTE_TO_QUEEN_FLAG = 4
    PROMOTE_TO_KNIGHT_FLAG = 5
    PROMOTE_TO_ROOK_FLAG = 6
    PROMOTE_TO_BISHOP_FLAG = 7
    
    def __init__(self, start_square, target_square, flag=0):
        self.start_square = start_square
        self.target_square = target_square
        self.flag = flag
        self.value = start_square | (target_square << 6) | (flag << 12)
    
    @property
    def is_promotion(self):
        return self.flag >= Move.PROMOTE_TO_QUEEN_FLAG
    
    @property
    def is_null(self):
        return self.value == 0
    
    def to_uci(self):
        """Convert to UCI notation"""
        files = 'abcdefgh'
        ranks = '12345678'
        
        start_file = files[self.start_square % 8]
        start_rank = ranks[self.start_square // 8]
        target_file = files[self.target_square % 8]
        target_rank = ranks[self.target_square // 8]
        
        move_str = f"{start_file}{start_rank}{target_file}{target_rank}"
        
        if self.is_promotion:
            promotion_map = {
                Move.PROMOTE_TO_QUEEN_FLAG: 'q',
                Move.PROMOTE_TO_KNIGHT_FLAG: 'n',
                Move.PROMOTE_TO_ROOK_FLAG: 'r',
                Move.PROMOTE_TO_BISHOP_FLAG: 'b'
            }
            move_str += promotion_map.get(self.flag, 'q')
        
        return move_str
    
    @staticmethod
    def from_uci(uci_str):
        """Parse UCI notation into Move"""
        start_square = (ord(uci_str[0]) - ord('a')) + (int(uci_str[1]) - 1) * 8
        target_square = (ord(uci_str[2]) - ord('a')) + (int(uci_str[3]) - 1) * 8
        
        flag = Move.NO_FLAG
        if len(uci_str) > 4:
            promotion_map = {
                'q': Move.PROMOTE_TO_QUEEN_FLAG,
                'n': Move.PROMOTE_TO_KNIGHT_FLAG,
                'r': Move.PROMOTE_TO_ROOK_FLAG,
                'b': Move.PROMOTE_TO_BISHOP_FLAG
            }
            flag = promotion_map.get(uci_str[4].lower(), Move.PROMOTE_TO_QUEEN_FLAG)
        
        return Move(start_square, target_square, flag)