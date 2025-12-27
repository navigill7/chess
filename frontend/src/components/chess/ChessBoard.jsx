import React, { useState, useEffect, useRef } from "react";
import "../../styles/Board.css";
import RatingChangeDisplay from "./RatingChangeDisplay";

function ChessBoard({ gameState, onMove, isSpectator, playerColor, getValidMoves }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [animatingMove, setAnimatingMove] = useState(null);
  const [pieceSet, setPieceSet] = useState('cburnett'); // Can be: cburnett, alpha, etc
  const [boardTheme, setBoardTheme] = useState('brown'); // Can be: brown, blue, green, etc
  const boardRef = useRef(null);

  // FIX: Flip BOTH files AND ranks for black
  const files = playerColor === "black" 
    ? ["h", "g", "f", "e", "d", "c", "b", "a"]
    : ["a", "b", "c", "d", "e", "f", "g", "h"];
  
  const ranks = playerColor === "black" 
    ? [1, 2, 3, 4, 5, 6, 7, 8]
    : [8, 7, 6, 5, 4, 3, 2, 1];

  // Prevent page scroll during drag
  useEffect(() => {
    const preventScroll = (e) => {
      if (draggedPiece) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('wheel', preventScroll);
    };
  }, [draggedPiece]);

  useEffect(() => {
    if (gameState?.lastMove) {
      setLastMove(gameState.lastMove);
    }
  }, [gameState]);

  const handleSquareClick = (file, rank) => {
    if (isSpectator || gameState?.status !== 'ongoing') return;

    const square = `${file}${rank}`;
    const piece = gameState?.board?.[square];

    if (selectedSquare) {
      if (validMoves.includes(square)) {
        animateMove(selectedSquare, square);
        setTimeout(() => onMove(selectedSquare, square), 50); // Small delay for animation
        setSelectedSquare(null);
        setValidMoves([]);
      } else if (piece && piece.color === playerColor) {
        setSelectedSquare(square);
        const moves = getValidMoves ? getValidMoves(square) : [];
        setValidMoves(moves);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else {
      if (piece && piece.color === playerColor && gameState.turn === playerColor) {
        setSelectedSquare(square);
        const moves = getValidMoves ? getValidMoves(square) : [];
        setValidMoves(moves);
      }
    }
  };

  const animateMove = (from, to) => {
    setAnimatingMove({ from, to, timestamp: Date.now() });
    setTimeout(() => setAnimatingMove(null), 300);
  };

  // Improved drag handlers
  const handleDragStart = (e, file, rank) => {
    if (isSpectator || gameState?.status !== 'ongoing') {
      e.preventDefault();
      return;
    }

    const square = `${file}${rank}`;
    const piece = gameState?.board?.[square];

    if (!piece || piece.color !== playerColor || gameState.turn !== playerColor) {
      e.preventDefault();
      return;
    }

    // Get board rect and calculate piece offset
    const boardRect = boardRef.current?.getBoundingClientRect();
    const squareSize = boardRect ? boardRect.width / 8 : 80;
    
    const moves = getValidMoves ? getValidMoves(square) : [];
    setDraggedPiece({ 
      square, 
      piece,
      squareSize
    });
    setValidMoves(moves);
    setSelectedSquare(square);

    // Hide default drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrag = (e) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    if (!draggedPiece) return;
    
    const squareSize = draggedPiece.squareSize || 80;
    setDragPosition({ 
      x: e.clientX - squareSize / 2, 
      y: e.clientY - squareSize / 2
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, file, rank) => {
    e.preventDefault();
    if (!draggedPiece) return;

    const toSquare = `${file}${rank}`;
    if (validMoves.includes(toSquare)) {
      animateMove(draggedPiece.square, toSquare);
      setTimeout(() => onMove(draggedPiece.square, toSquare), 50);
    }

    setDraggedPiece(null);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const getPieceAtSquare = (file, rank) => {
    const square = `${file}${rank}`;
    return gameState?.board?.[square] || null;
  };

  const isSquareHighlighted = (file, rank) => {
    const square = `${file}${rank}`;
    return validMoves.includes(square);
  };

  const isSquareSelected = (file, rank) => {
    const square = `${file}${rank}`;
    return selectedSquare === square;
  };

  const isSquareLastMove = (file, rank) => {
    const square = `${file}${rank}`;
    return lastMove?.from === square || lastMove?.to === square;
  };

  const isSquareInCheck = (file, rank) => {
    const square = `${file}${rank}`;
    const piece = getPieceAtSquare(file, rank);
    return piece?.type === "king" && gameState?.check === piece.color;
  };

  const getPieceImage = (piece) => {
    const colorCode = piece.color === 'white' ? 'w' : 'b';
    const typeMap = {
      'pawn': 'P', 'knight': 'N', 'bishop': 'B',
      'rook': 'R', 'queen': 'Q', 'king': 'K'
    };
    const typeCode = typeMap[piece.type];
    return `/assets/pieces/${pieceSet}/${colorCode}${typeCode}.svg`;
  };

  return (
    <div className="chess-board-container" ref={boardRef}>
      <div className="chess-board-wrapper">
        <div 
          className="chess-board" 
          style={{
            backgroundImage: `url(/assets/board/${boardTheme}.svg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {ranks.map((rank, rankIdx) =>
            files.map((file, fileIdx) => {
              const isLight = (rankIdx + fileIdx) % 2 === 0;
              const piece = getPieceAtSquare(file, rank);
              const square = `${file}${rank}`;
              const isDragging = draggedPiece?.square === square;
              const isAnimating = animatingMove?.from === square || animatingMove?.to === square;
              const hasPieceOnValidMove = isSquareHighlighted(file, rank) && piece;

              return (
                <div
                  key={square}
                  className={`
                    chess-square
                    ${isLight ? 'light' : 'dark'}
                    ${isSquareSelected(file, rank) ? 'selected' : ''}
                    ${hasPieceOnValidMove ? 'valid-capture' : ''}
                    ${isSquareHighlighted(file, rank) && !piece ? 'valid-move' : ''}
                    ${isSquareLastMove(file, rank) ? 'last-move' : ''}
                    ${isSquareInCheck(file, rank) ? 'in-check' : ''}
                    ${isSpectator ? 'disabled' : ''}
                    ${isAnimating ? 'animating' : ''}
                  `}
                  onClick={() => handleSquareClick(file, rank)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, file, rank)}
                >
                  {piece && !isDragging && (
                    <div
                      className={`chess-piece ${isAnimating ? 'piece-moving' : ''}`}
                      draggable={!isSpectator && piece.color === playerColor && gameState.turn === playerColor}
                      onDragStart={(e) => handleDragStart(e, file, rank)}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                    >
                      <img 
                        src={getPieceImage(piece)} 
                        alt={`${piece.color} ${piece.type}`}
                        draggable={false}
                      />
                    </div>
                  )}

                  {/* Coordinate labels */}
                  {fileIdx === 0 && <span className="rank-label">{rank}</span>}
                  {rankIdx === ranks.length - 1 && <span className="file-label">{file}</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Dragging Piece Preview */}
        {draggedPiece && dragPosition.x !== 0 && (
          <div
            className="dragging-piece"
            style={{
              position: 'fixed',
              left: `${dragPosition.x}px`,
              top: `${dragPosition.y}px`,
              width: `${draggedPiece.squareSize}px`,
              height: `${draggedPiece.squareSize}px`,
              pointerEvents: 'none',
              zIndex: 1000,
              opacity: 0.8,
              transform: 'translate(0, 0)',
              transition: 'none'
            }}
          >
            <img
              src={getPieceImage(draggedPiece.piece)}
              alt={`${draggedPiece.piece.color} ${draggedPiece.piece.type}`}
              style={{ 
                width: '100%', 
                height: '100%',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }}
            />
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState?.status && gameState.status !== "ongoing" && (
          <div className="game-over-overlay">
            <div className="game-over-card">
              <h2 className="game-over-title">
                {gameState.status === "checkmate" && "Checkmate!"}
                {gameState.status === "stalemate" && "Stalemate!"}
                {gameState.status === "draw" && "Draw!"}
                {gameState.status === "resignation" && "Game Over"}
                {gameState.status === "completed" && "Game Over"}
              </h2>
              <p className="game-over-result">
                {gameState.winner
                  ? `${gameState.winner === "white" ? "White" : "Black"} wins!`
                  : "Game ended in a draw"}
              </p>
              
              {gameState.ratingChanges && <RatingChangeDisplay/>}
            </div>
          </div>
        )}
      </div>

      {/* Theme Selector (optional - can be moved to settings) */}
      <div className="board-settings" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <select 
          value={pieceSet} 
          onChange={(e) => setPieceSet(e.target.value)}
          className="theme-select"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            fontSize: '0.875rem'
          }}
        >
          <option value="cburnett">Classic</option>
          <option value="alpha">Alpha</option>
        </select>
      </div>
    </div>
  );
}

export default ChessBoard;