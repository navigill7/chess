import React, { useState, useEffect, useRef } from "react";
import "../../styles/Board.css";

function ChessBoard({ gameState, onMove, isSpectator, playerColor, getValidMoves }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const boardRef = useRef(null);

  // FIX: Flip BOTH files AND ranks for black
  const files = playerColor === "black" 
    ? ["h", "g", "f", "e", "d", "c", "b", "a"]  // Black sees h→a (reversed)
    : ["a", "b", "c", "d", "e", "f", "g", "h"]; // White sees a→h (normal)
  
  const ranks = playerColor === "black" 
    ? [1, 2, 3, 4, 5, 6, 7, 8]  // Black sees 1→8 (from bottom to top)
    : [8, 7, 6, 5, 4, 3, 2, 1]; // White sees 8→1 (from top to bottom)

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
        onMove(selectedSquare, square);
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

  // Drag handlers
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

    const moves = getValidMoves ? getValidMoves(square) : [];
    setDraggedPiece({ square, piece });
    setValidMoves(moves);
    setSelectedSquare(square);

    // Create ghost image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrag = (e) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
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
      onMove(draggedPiece.square, toSquare);
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
    const typeCode = piece.type[0];
    return `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${colorCode}${typeCode}.png`;
  };

  return (
    <div className="chess-board-container" ref={boardRef}>
      <div className="chess-board-wrapper">
        <div className="chess-board">
          {ranks.map((rank, rankIdx) =>
            files.map((file, fileIdx) => {
              const isLight = (rankIdx + fileIdx) % 2 === 0;
              const piece = getPieceAtSquare(file, rank);
              const square = `${file}${rank}`;
              const isDragging = draggedPiece?.square === square;
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
                  `}
                  onClick={() => handleSquareClick(file, rank)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, file, rank)}
                >
                  {piece && !isDragging && (
                    <div
                      className="chess-piece"
                      draggable={!isSpectator && piece.color === playerColor && gameState.turn === playerColor}
                      onDragStart={(e) => handleDragStart(e, file, rank)}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                      style={{ 
                        cursor: (!isSpectator && piece.color === playerColor && gameState.turn === playerColor) 
                          ? 'grab' 
                          : 'default' 
                      }}
                    >
                      <img 
                        src={getPieceImage(piece)} 
                        alt={`${piece.color} ${piece.type}`}
                        draggable={false}
                        style={{ pointerEvents: 'none' }}
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

        {/* Dragging Piece Preview - follows cursor */}
        {draggedPiece && (
          <div
            style={{
              position: 'fixed',
              left: dragPosition.x - 40,
              top: dragPosition.y - 40,
              width: '80px',
              height: '80px',
              pointerEvents: 'none',
              zIndex: 1000,
              opacity: 0.8
            }}
          >
            <img
              src={getPieceImage(draggedPiece.piece)}
              alt={`${draggedPiece.piece.color} ${draggedPiece.piece.type}`}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}

        {gameState?.status && gameState.status !== "ongoing" && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20
          }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '0.75rem',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              minWidth: '400px'
            }}>
              <h2 style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '0.5rem'
              }}>
                {gameState.status === "checkmate" && "Checkmate!"}
                {gameState.status === "stalemate" && "Stalemate!"}
                {gameState.status === "draw" && "Draw!"}
                {gameState.status === "resignation" && "Game Over"}
                {gameState.status === "completed" && "Game Over"}
              </h2>
              <p style={{
                color: '#374151',
                fontSize: '1.125rem',
                marginBottom: '1.5rem'
              }}>
                {gameState.winner
                  ? `${gameState.winner === "white" ? "White" : "Black"} wins!`
                  : "Game ended in a draw"}
              </p>
              
              {/* Rating Changes */}
              {gameState.ratingChanges && (
                <div style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <p style={{
                    color: '#6366f1',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.75rem'
                  }}>
                    Rating Changes
                  </p>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    color: '#111827'
                  }}>
                    <RatingChangeDisplay
                      playerColor="white"
                      oldRating={gameState.ratingChanges.white.before}
                      newRating={gameState.ratingChanges.white.after}
                      playerName={gameState.ratingChanges.white.name}
                    />
                    <RatingChangeDisplay
                      playerColor="black"
                      oldRating={gameState.ratingChanges.black.before}
                      newRating={gameState.ratingChanges.black.after}
                      playerName={gameState.ratingChanges.black.name}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChessBoard;