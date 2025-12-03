
function Square({isLight, isSelected, isHighlighted, isLastMove, isCheck, onClick, children}) {
    const getSquareColor = () => {
    if (isCheck) {
      return 'bg-red-500';
    }
    if (isSelected) {
      return isLight ? 'bg-yellow-400' : 'bg-yellow-600';
    }
    if (isLastMove) {
      return isLight ? 'bg-yellow-300/60' : 'bg-yellow-500/60';
    }
    // Professional board colors - similar to chess.com/lichess
    return isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]';
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative w-full h-full flex items-center justify-center cursor-pointer
        transition-all duration-150
        ${getSquareColor()}
        hover:brightness-95
      `}
    >
      {/* Highlight for valid moves */}
      {isHighlighted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {children ? (
            // Capture indicator (ring around piece)
            <div className="absolute inset-1 rounded-full border-4 border-green-500/70" />
          ) : (
            // Move indicator (dot in center)
            <div className="w-[30%] h-[30%] bg-black/30 rounded-full" />
          )}
        </div>
      )}

      {/* Piece */}
      <div className="w-full h-full flex items-center justify-center p-1">
        {children}
      </div>
    </div>
  );
}

export default Square;