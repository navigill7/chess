function Piece({ type, color, isDraggable }) {
  // Map full piece names to single-letter codes for image URLs
  const pieceTypeMap = {
    'king': 'k',
    'queen': 'q',
    'rook': 'r',
    'bishop': 'b',
    'knight': 'n',
    'pawn': 'p'
  };

  // Using chess.com style SVG pieces from CDN
  const pieceImages = {
    white: {
      king: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png",
      queen: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png",
      rook: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png",
      bishop: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png",
      knight: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png",
      pawn: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png",
    },
    black: {
      king: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png",
      queen: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png",
      rook: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png",
      bishop: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png",
      knight: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png",
      pawn: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png",
    },
  };

  const pieceUrl = pieceImages[color]?.[type];

  if (!pieceUrl) return null;

  return (
    <img
      src={pieceUrl}
      alt={`${color} ${type}`}
      className={`
        w-full h-full p-1 select-none pointer-events-none
        ${
          isDraggable
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-not-allowed"
        }
        transition-transform duration-100
        hover:scale-110
      `}
      draggable={false}
    />
  );
}

export default Piece;
