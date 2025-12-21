class ChessEngine:
    def __init__(self, fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'):
        self.board = {}
        self.turn = 'white'
        self.castling = {'K': True, 'Q': True, 'k': True, 'q': True}
        self.en_passant = None
        self.half_moves = 0
        self.full_moves = 1
        self.load_fen(fen)
    
    def load_fen(self, fen):
        parts = fen.split(' ')
        position = parts[0]
        
        self.board = {}
        ranks = position.split('/')
        
        for rank_idx, rank in enumerate(ranks):
            file_idx = 0
            for char in rank:
                if char.isdigit():
                    file_idx += int(char)
                else:
                    square = self.coord_to_square(file_idx, 7 - rank_idx)
                    self.board[square] = self.parse_piece(char)
                    file_idx += 1
        
        self.turn = 'white' if parts[1] == 'w' else 'black'
        
        castling_str = parts[2]
        self.castling = {
            'K': 'K' in castling_str,
            'Q': 'Q' in castling_str,
            'k': 'k' in castling_str,
            'q': 'q' in castling_str
        }
        
        self.en_passant = parts[3] if parts[3] != '-' else None
        self.half_moves = int(parts[4])
        self.full_moves = int(parts[5])
    
    def parse_piece(self, char):
        is_white = char.isupper()
        piece_map = {
            'p': 'pawn', 'n': 'knight', 'b': 'bishop',
            'r': 'rook', 'q': 'queen', 'k': 'king'
        }
        return {
            'type': piece_map[char.lower()],
            'color': 'white' if is_white else 'black'
        }
    
    def coord_to_square(self, file, rank):
        files = 'abcdefgh'
        return f"{files[file]}{rank + 1}"
    
    def square_to_coord(self, square):
        files = 'abcdefgh'
        return files.index(square[0]), int(square[1]) - 1
    
    def is_valid_move(self, from_sq, to_sq, promotion=None):
        piece = self.board.get(from_sq)
        if not piece or piece['color'] != self.turn:
            return False
        
        moves = self.get_piece_moves(from_sq)
        if to_sq not in moves:
            return False
        
        # Check if move leaves king in check
        test_board = self.copy()
        test_board.make_move_unsafe(from_sq, to_sq, promotion)
        king_sq = test_board.find_king(self.turn)
        
        if test_board.is_square_attacked(king_sq, self.turn):
            return False
        
        return True
    
    def make_move(self, from_sq, to_sq, promotion=None):
        piece = self.board[from_sq]
        captured = self.board.get(to_sq)
        
        # Make move
        result = self.make_move_unsafe(from_sq, to_sq, promotion)
        
        # Check game status
        opponent = 'black' if self.turn == 'white' else 'white'
        is_check = self.is_in_check(opponent)
        is_checkmate = self.is_checkmate(opponent)
        is_stalemate = self.is_stalemate(opponent)
        
        status = 'ongoing'
        winner = None
        
        if is_checkmate:
            status = 'checkmate'
            winner = self.turn
        elif is_stalemate:
            status = 'stalemate'
        
        # Switch turn
        self.turn = opponent
        
        return {
            'fen': self.to_fen(),
            'piece': piece['type'],
            'captured': captured['type'] if captured else None,
            'notation': self.to_algebraic(from_sq, to_sq, piece, captured, promotion),
            'is_check': is_check,
            'is_checkmate': is_checkmate,
            'status': status,
            'winner': winner
        }
    
    def make_move_unsafe(self, from_sq, to_sq, promotion=None):
        piece = self.board[from_sq]
        
        # Handle promotion
        if promotion and piece['type'] == 'pawn':
            piece['type'] = promotion
        
        # Handle castling
        if piece['type'] == 'king':
            from_file, from_rank = self.square_to_coord(from_sq)
            to_file, to_rank = self.square_to_coord(to_sq)
            
            if abs(to_file - from_file) == 2:
                # Kingside
                if to_file > from_file:
                    rook_from = self.coord_to_square(7, from_rank)
                    rook_to = self.coord_to_square(5, from_rank)
                # Queenside
                else:
                    rook_from = self.coord_to_square(0, from_rank)
                    rook_to = self.coord_to_square(3, from_rank)
                
                rook = self.board[rook_from]
                del self.board[rook_from]
                self.board[rook_to] = rook
            
            # Update castling rights
            if piece['color'] == 'white':
                self.castling['K'] = False
                self.castling['Q'] = False
            else:
                self.castling['k'] = False
                self.castling['q'] = False
        
        # Handle en passant
        if piece['type'] == 'pawn' and to_sq == self.en_passant:
            capture_rank = 4 if piece['color'] == 'white' else 3
            capture_sq = f"{to_sq[0]}{capture_rank + 1}"
            del self.board[capture_sq]
        
        # Update en passant
        self.en_passant = None
        if piece['type'] == 'pawn':
            from_file, from_rank = self.square_to_coord(from_sq)
            to_file, to_rank = self.square_to_coord(to_sq)
            
            if abs(to_rank - from_rank) == 2:
                ep_rank = from_rank + 1 if piece['color'] == 'white' else from_rank - 1
                self.en_passant = self.coord_to_square(from_file, ep_rank)
        
        # Update castling if rook moves
        if piece['type'] == 'rook':
            if from_sq == 'a1': self.castling['Q'] = False
            if from_sq == 'h1': self.castling['K'] = False
            if from_sq == 'a8': self.castling['q'] = False
            if from_sq == 'h8': self.castling['k'] = False
        
        # Make move
        captured = self.board.get(to_sq)
        self.board[to_sq] = piece
        del self.board[from_sq]
        
        return captured
    
    def get_piece_moves(self, square):
        piece = self.board.get(square)
        if not piece:
            return []
        
        move_funcs = {
            'pawn': self.get_pawn_moves,
            'knight': self.get_knight_moves,
            'bishop': self.get_bishop_moves,
            'rook': self.get_rook_moves,
            'queen': self.get_queen_moves,
            'king': self.get_king_moves
        }
        
        return move_funcs[piece['type']](square, piece['color'])
    
    def get_pawn_moves(self, square, color):
        moves = []
        file, rank = self.square_to_coord(square)
        direction = 1 if color == 'white' else -1
        start_rank = 1 if color == 'white' else 6
        
        # Forward
        forward = self.coord_to_square(file, rank + direction)
        if forward and forward not in self.board:
            moves.append(forward)
            
            # Double push
            if rank == start_rank:
                double = self.coord_to_square(file, rank + 2 * direction)
                if double and double not in self.board:
                    moves.append(double)
        
        # Captures
        for file_delta in [-1, 1]:
            new_file = file + file_delta
            if 0 <= new_file < 8:
                capture_sq = self.coord_to_square(new_file, rank + direction)
                target = self.board.get(capture_sq)
                
                if target and target['color'] != color:
                    moves.append(capture_sq)
                
                if capture_sq == self.en_passant:
                    moves.append(capture_sq)
        
        return moves
    
    def get_knight_moves(self, square, color):
        moves = []
        file, rank = self.square_to_coord(square)
        deltas = [(2,1), (2,-1), (-2,1), (-2,-1), (1,2), (1,-2), (-1,2), (-1,-2)]
        
        for df, dr in deltas:
            new_file, new_rank = file + df, rank + dr
            if 0 <= new_file < 8 and 0 <= new_rank < 8:
                target_sq = self.coord_to_square(new_file, new_rank)
                target = self.board.get(target_sq)
                if not target or target['color'] != color:
                    moves.append(target_sq)
        
        return moves
    
    def get_sliding_moves(self, square, color, directions):
        moves = []
        file, rank = self.square_to_coord(square)
        
        for df, dr in directions:
            new_file, new_rank = file + df, rank + dr
            
            while 0 <= new_file < 8 and 0 <= new_rank < 8:
                target_sq = self.coord_to_square(new_file, new_rank)
                target = self.board.get(target_sq)
                
                if not target:
                    moves.append(target_sq)
                else:
                    if target['color'] != color:
                        moves.append(target_sq)
                    break
                
                new_file += df
                new_rank += dr
        
        return moves
    
    def get_bishop_moves(self, square, color):
        return self.get_sliding_moves(square, color, [(1,1), (1,-1), (-1,1), (-1,-1)])
    
    def get_rook_moves(self, square, color):
        return self.get_sliding_moves(square, color, [(1,0), (-1,0), (0,1), (0,-1)])
    
    def get_queen_moves(self, square, color):
        return self.get_sliding_moves(square, color, [
            (1,1), (1,-1), (-1,1), (-1,-1),
            (1,0), (-1,0), (0,1), (0,-1)
        ])
    
    def get_king_moves(self, square, color):
        moves = []
        file, rank = self.square_to_coord(square)
        
        for df in [-1, 0, 1]:
            for dr in [-1, 0, 1]:
                if df == 0 and dr == 0:
                    continue
                
                new_file, new_rank = file + df, rank + dr
                if 0 <= new_file < 8 and 0 <= new_rank < 8:
                    target_sq = self.coord_to_square(new_file, new_rank)
                    target = self.board.get(target_sq)
                    if not target or target['color'] != color:
                        moves.append(target_sq)
        
        # Castling - with recursion protection
        if not self.is_square_attacked(square, color):
            start_rank = 0 if color == 'white' else 7
            
            # Kingside castling
            if (color == 'white' and self.castling['K']) or (color == 'black' and self.castling['k']):
                f1 = self.coord_to_square(5, start_rank)
                g1 = self.coord_to_square(6, start_rank)
                
                if (f1 not in self.board and g1 not in self.board and
                    not self.is_square_attacked(f1, color) and
                    not self.is_square_attacked(g1, color)):
                    moves.append(g1)
            
            # Queenside castling
            if (color == 'white' and self.castling['Q']) or (color == 'black' and self.castling['q']):
                d1 = self.coord_to_square(3, start_rank)
                c1 = self.coord_to_square(2, start_rank)
                b1 = self.coord_to_square(1, start_rank)
                
                if (d1 not in self.board and c1 not in self.board and b1 not in self.board and
                    not self.is_square_attacked(d1, color) and
                    not self.is_square_attacked(c1, color)):
                    moves.append(c1)
        
        return moves
    
    def get_king_moves_simple(self, square, color):
        """King moves WITHOUT castling check (prevents recursion in is_square_attacked)"""
        moves = []
        file, rank = self.square_to_coord(square)
        
        for df in [-1, 0, 1]:
            for dr in [-1, 0, 1]:
                if df == 0 and dr == 0:
                    continue
                
                new_file, new_rank = file + df, rank + dr
                if 0 <= new_file < 8 and 0 <= new_rank < 8:
                    target_sq = self.coord_to_square(new_file, new_rank)
                    target = self.board.get(target_sq)
                    if not target or target['color'] != color:
                        moves.append(target_sq)
        
        # NO CASTLING CHECK - this is for attack detection only
        return moves

    def is_square_attacked(self, square, defender_color):
        attacker_color = 'black' if defender_color == 'white' else 'white'
        
        for sq, piece in self.board.items():
            if piece['color'] == attacker_color:
                # CRITICAL FIX: Use simple king moves to prevent recursion
                if piece['type'] == 'king':
                    # For kings, use simple moves (no castling check)
                    moves = self.get_king_moves_simple(sq, piece['color'])
                else:
                    # For all other pieces, use normal move generation
                    moves = self.get_piece_moves(sq)
                
                if square in moves:
                    return True
        
        return False
    
    def find_king(self, color):
        for square, piece in self.board.items():
            if piece['type'] == 'king' and piece['color'] == color:
                return square
        return None
    
    def is_in_check(self, color):
        king_sq = self.find_king(color)
        return self.is_square_attacked(king_sq, color)
    
    def is_checkmate(self, color):
        if not self.is_in_check(color):
            return False
        
        for square, piece in self.board.items():
            if piece['color'] == color:
                moves = self.get_piece_moves(square)
                for move in moves:
                    if self.is_valid_move(square, move):
                        return False
        
        return True
    
    def is_stalemate(self, color):
        if self.is_in_check(color):
            return False
        
        for square, piece in self.board.items():
            if piece['color'] == color:
                moves = self.get_piece_moves(square)
                for move in moves:
                    if self.is_valid_move(square, move):
                        return False
        
        return True
    
    def to_fen(self):
        fen = ''
        
        for rank in range(7, -1, -1):
            empty = 0
            for file in range(8):
                square = self.coord_to_square(file, rank)
                piece = self.board.get(square)
                
                if piece:
                    if empty > 0:
                        fen += str(empty)
                        empty = 0
                    fen += self.piece_to_char(piece)
                else:
                    empty += 1
            
            if empty > 0:
                fen += str(empty)
            if rank > 0:
                fen += '/'
        
        fen += f" {'w' if self.turn == 'white' else 'b'}"
        
        castling = ''
        if self.castling['K']: castling += 'K'
        if self.castling['Q']: castling += 'Q'
        if self.castling['k']: castling += 'k'
        if self.castling['q']: castling += 'q'
        fen += f" {castling or '-'}"
        
        fen += f" {self.en_passant or '-'}"
        fen += f" {self.half_moves} {self.full_moves}"
        
        return fen
    
    def piece_to_char(self, piece):
        chars = {
            'pawn': 'p', 'knight': 'n', 'bishop': 'b',
            'rook': 'r', 'queen': 'q', 'king': 'k'
        }
        char = chars[piece['type']]
        return char.upper() if piece['color'] == 'white' else char
    
    def to_algebraic(self, from_sq, to_sq, piece, captured, promotion):
        # Simplified notation
        notation = ''
        
        if piece['type'] == 'king' and abs(ord(from_sq[0]) - ord(to_sq[0])) == 2:
            return 'O-O' if to_sq[0] > from_sq[0] else 'O-O-O'
        
        if piece['type'] != 'pawn':
            notation += piece['type'][0].upper()
        
        if captured:
            if piece['type'] == 'pawn':
                notation += from_sq[0]
            notation += 'x'
        
        notation += to_sq
        
        if promotion:
            notation += '=' + promotion[0].upper()
        
        return notation
    
    def copy(self):
        new_engine = ChessEngine()
        new_engine.board = {k: v.copy() for k, v in self.board.items()}
        new_engine.turn = self.turn
        new_engine.castling = self.castling.copy()
        new_engine.en_passant = self.en_passant
        new_engine.half_moves = self.half_moves
        new_engine.full_moves = self.full_moves
        return new_engine