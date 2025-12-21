class MoveValidator {
  constructor(board) {
    this.board = board;
  }

  isValidMove(from, to, promotion = null) {
    const piece = this.board.getPiece(from);
    if (!piece || piece.color !== this.board.turn) {
      return false;
    }

    const moves = this.getPieceMoves(from);
    if (!moves.includes(to)) {
      return false;
    }

    // Check if move leaves king in check
    const testBoard = this.board.clone();
    this.makeMove(testBoard, from, to, promotion);
    
    const kingSquare = this.findKing(testBoard, this.board.turn);
    if (this.isSquareAttacked(testBoard, kingSquare, this.board.turn)) {
      return false;
    }

    return true;
  }

  getPieceMoves(square) {
    const piece = this.board.getPiece(square);
    if (!piece) return [];

    const moveFunctions = {
      'pawn': this.getPawnMoves.bind(this),
      'knight': this.getKnightMoves.bind(this),
      'bishop': this.getBishopMoves.bind(this),
      'rook': this.getRookMoves.bind(this),
      'queen': this.getQueenMoves.bind(this),
      'king': this.getKingMoves.bind(this)
    };

    return moveFunctions[piece.type](square, piece.color);
  }

  getPawnMoves(square, color) {
    const moves = [];
    const coord = this.board.squareToCoordinate(square);
    const direction = color === 'white' ? 1 : -1;
    const startRank = color === 'white' ? 1 : 6;

    // Forward move
    const forwardFile = coord.file;
    const forwardRank = coord.rank + direction;
    if (forwardRank >= 0 && forwardRank <= 7) {
      const forwardSquare = this.board.coordToSquare(forwardFile, forwardRank);
      if (!this.board.getPiece(forwardSquare)) {
        moves.push(forwardSquare);

        // Double push from starting position
        if (coord.rank === startRank) {
          const doubleRank = coord.rank + (2 * direction);
          const doubleSquare = this.board.coordToSquare(forwardFile, doubleRank);
          if (!this.board.getPiece(doubleSquare)) {
            moves.push(doubleSquare);
          }
        }
      }
    }

    // Captures
    for (const fileDelta of [-1, 1]) {
      const captureFile = coord.file + fileDelta;
      const captureRank = coord.rank + direction;
      
      if (captureFile >= 0 && captureFile <= 7 && captureRank >= 0 && captureRank <= 7) {
        const captureSquare = this.board.coordToSquare(captureFile, captureRank);
        const targetPiece = this.board.getPiece(captureSquare);
        
        if (targetPiece && targetPiece.color !== color) {
          moves.push(captureSquare);
        }
        
        // En passant
        if (captureSquare === this.board.enPassant) {
          moves.push(captureSquare);
        }
      }
    }

    return moves;
  }

  getKnightMoves(square, color) {
    const moves = [];
    const coord = this.board.squareToCoordinate(square);
    const deltas = [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]];

    for (const [df, dr] of deltas) {
      const newFile = coord.file + df;
      const newRank = coord.rank + dr;
      
      if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
        const targetSquare = this.board.coordToSquare(newFile, newRank);
        const targetPiece = this.board.getPiece(targetSquare);
        
        if (!targetPiece || targetPiece.color !== color) {
          moves.push(targetSquare);
        }
      }
    }

    return moves;
  }

  getSlidingMoves(square, color, directions) {
    const moves = [];
    const coord = this.board.squareToCoordinate(square);

    for (const [df, dr] of directions) {
      let newFile = coord.file + df;
      let newRank = coord.rank + dr;

      while (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
        const targetSquare = this.board.coordToSquare(newFile, newRank);
        const targetPiece = this.board.getPiece(targetSquare);

        if (!targetPiece) {
          moves.push(targetSquare);
        } else {
          if (targetPiece.color !== color) {
            moves.push(targetSquare);
          }
          break;
        }

        newFile += df;
        newRank += dr;
      }
    }

    return moves;
  }

  getBishopMoves(square, color) {
    return this.getSlidingMoves(square, color, [[1,1], [1,-1], [-1,1], [-1,-1]]);
  }

  getRookMoves(square, color) {
    return this.getSlidingMoves(square, color, [[1,0], [-1,0], [0,1], [0,-1]]);
  }

  getQueenMoves(square, color) {
    return this.getSlidingMoves(square, color, [
      [1,1], [1,-1], [-1,1], [-1,-1],
      [1,0], [-1,0], [0,1], [0,-1]
    ]);
  }

  getKingMoves(square, color) {
    const moves = [];
    const coord = this.board.squareToCoordinate(square);

    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;

        const newFile = coord.file + df;
        const newRank = coord.rank + dr;

        if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
          const targetSquare = this.board.coordToSquare(newFile, newRank);
          const targetPiece = this.board.getPiece(targetSquare);

          if (!targetPiece || targetPiece.color !== color) {
            moves.push(targetSquare);
          }
        }
      }
    }

    // Castling - with recursion protection
    const kingSquare = square;
    const isKingAttacked = this.isSquareAttacked(this.board, kingSquare, color);
    
    if (!isKingAttacked) {
      const startRank = color === 'white' ? 0 : 7;

      // Kingside castling
      if ((color === 'white' && this.board.castling.K) || 
          (color === 'black' && this.board.castling.k)) {
        const f = this.board.coordToSquare(5, startRank);
        const g = this.board.coordToSquare(6, startRank);
        
        if (!this.board.getPiece(f) && !this.board.getPiece(g) &&
            !this.isSquareAttacked(this.board, f, color) &&
            !this.isSquareAttacked(this.board, g, color)) {
          moves.push(g);
        }
      }

      // Queenside castling
      if ((color === 'white' && this.board.castling.Q) || 
          (color === 'black' && this.board.castling.q)) {
        const d = this.board.coordToSquare(3, startRank);
        const c = this.board.coordToSquare(2, startRank);
        const b = this.board.coordToSquare(1, startRank);
        
        if (!this.board.getPiece(d) && !this.board.getPiece(c) && !this.board.getPiece(b) &&
            !this.isSquareAttacked(this.board, d, color) &&
            !this.isSquareAttacked(this.board, c, color)) {
          moves.push(c);
        }
      }
    }

    return moves;
  }

  getKingMovesSimple(square, color) {
    // King moves WITHOUT castling check (prevents recursion in isSquareAttacked)
    const moves = [];
    const coord = this.board.squareToCoordinate(square);

    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;

        const newFile = coord.file + df;
        const newRank = coord.rank + dr;

        if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
          const targetSquare = this.board.coordToSquare(newFile, newRank);
          const targetPiece = this.board.getPiece(targetSquare);

          if (!targetPiece || targetPiece.color !== color) {
            moves.push(targetSquare);
          }
        }
      }
    }

    // NO CASTLING CHECK - this is for attack detection only
    return moves;
  }

  isSquareAttacked(board, square, defenderColor) {
    const attackerColor = defenderColor === 'white' ? 'black' : 'white';

    for (const [sq, piece] of Object.entries(board.board)) {
      if (piece.color === attackerColor) {
        // CRITICAL FIX: Use simple king moves to prevent recursion
        let moves;
        if (piece.type === 'king') {
          // For kings, use simple moves (no castling check)
          const coord = board.squareToCoordinate(sq);
          moves = this.getKingMovesSimple(sq, piece.color);
        } else {
          // For all other pieces, use normal move generation
          moves = this.getPieceMoves(sq);
        }
        
        if (moves.includes(square)) {
          return true;
        }
      }
    }

    return false;
  }

  findKing(board, color) {
    for (const [square, piece] of Object.entries(board.board)) {
      if (piece.type === 'king' && piece.color === color) {
        return square;
      }
    }
    return null;
  }

  makeMove(board, from, to, promotion) {
    const piece = board.getPiece(from);
    
    if (promotion && piece.type === 'pawn') {
      piece.type = promotion;
    }

    board.board[to] = piece;
    delete board.board[from];
    
    board.turn = board.turn === 'white' ? 'black' : 'white';
  }

  getGameStatus() {
    const inCheck = this.isInCheck(this.board.turn);
    const hasLegalMoves = this.hasLegalMoves(this.board.turn);

    if (inCheck && !hasLegalMoves) {
      return {
        status: 'checkmate',
        check: this.board.turn,
        winner: this.board.turn === 'white' ? 'black' : 'white'
      };
    }

    if (!inCheck && !hasLegalMoves) {
      return {
        status: 'stalemate',
        check: null,
        winner: null
      };
    }

    return {
      status: 'ongoing',
      check: inCheck ? this.board.turn : null,
      winner: null
    };
  }

  isInCheck(color) {
    const kingSquare = this.findKing(this.board, color);
    return this.isSquareAttacked(this.board, kingSquare, color);
  }

  hasLegalMoves(color) {
    for (const [square, piece] of Object.entries(this.board.board)) {
      if (piece.color === color) {
        const moves = this.getPieceMoves(square);
        for (const move of moves) {
          if (this.isValidMove(square, move)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

export default MoveValidator;