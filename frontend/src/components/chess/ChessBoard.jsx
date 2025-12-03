import React, { useState, useEffect } from "react";
import Square from "./Square";
import Piece from "./Piece";

function ChessBoard({
  gameState,
  onMove,
  isSpectator,
  playerColor,
  getValidMoves,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks =
    playerColor === "black"
      ? [1, 2, 3, 4, 5, 6, 7, 8]
      : [8, 7, 6, 5, 4, 3, 2, 1];

  useEffect(() => {
    if (gameState?.lastMove) {
      setLastMove(gameState.lastMove);
    }
  }, [gameState]);

  const handleSquareClick = (file, rank) => {
    if (isSpectator) return;

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
      if (
        piece &&
        piece.color === playerColor &&
        gameState.turn === playerColor
      ) {
        setSelectedSquare(square);
        const moves = getValidMoves ? getValidMoves(square) : [];
        setValidMoves(moves);
      }
    }
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

  return (
    <div className="relative w-full max-w-[600px] mx-auto">
      {/* Professional board with coordinates */}
      <div className="relative bg-[#312e2b] rounded-lg shadow-2xl p-2">
        {/* Rank labels (left side) */}
        <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-around text-[#b58863] font-bold text-sm">
          {ranks.map((rank) => (
            <div key={rank} className="h-[12.5%] flex items-center">
              {rank}
            </div>
          ))}
        </div>

        {/* File labels (bottom) */}
        <div className="absolute bottom-1 left-8 right-8 flex justify-around text-[#b58863] font-bold text-sm">
          {files.map((file) => (
            <div key={file} className="w-[12.5%] text-center">
              {file}
            </div>
          ))}
        </div>

        {/* Chess Board */}
        <div className="grid grid-cols-8 gap-0 ml-6 mr-2 mb-6 mt-2 aspect-square border-2 border-[#1a1714]">
          {ranks.map((rank) =>
            files.map((file, fileIndex) => {
              const isLight = (ranks.indexOf(rank) + fileIndex) % 2 === 0;
              const piece = getPieceAtSquare(file, rank);

              return (
                <Square
                  key={`${file}${rank}`}
                  isLight={isLight}
                  isSelected={isSquareSelected(file, rank)}
                  isHighlighted={isSquareHighlighted(file, rank)}
                  isLastMove={isSquareLastMove(file, rank)}
                  isCheck={isSquareInCheck(file, rank)}
                  onClick={() => handleSquareClick(file, rank)}
                >
                  {piece && (
                    <Piece
                      type={piece.type}
                      color={piece.color}
                      isDraggable={
                        !isSpectator &&
                        piece.color === playerColor &&
                        gameState.turn === playerColor
                      }
                    />
                  )}
                </Square>
              );
            })
          )}
        </div>
      </div>

      {/* Game Status Overlay */}
      {gameState?.status && gameState.status !== "ongoing" && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
          <div className="bg-white/95 rounded-xl p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {gameState.status === "checkmate" && "Checkmate!"}
              {gameState.status === "stalemate" && "Stalemate!"}
              {gameState.status === "draw" && "Draw!"}
              {gameState.status === "resignation" && "Game Over"}
            </h2>
            <p className="text-gray-700 text-lg">
              {gameState.winner
                ? `${gameState.winner === "white" ? "White" : "Black"} wins!`
                : "Game ended in a draw"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChessBoard;