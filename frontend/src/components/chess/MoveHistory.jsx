import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

function MoveHistory({ moves, currentMoveIndex, onMoveClick }) {
  const movesEndRef = useRef(null);
  const activeRef = useRef(null);
  const containerRef = useRef(null); // NEW: Container reference

  useEffect(() => {
    // FIXED: Only scroll the move history container, not the whole page
    if (currentMoveIndex === moves.length - 1) {
      // Scroll the container, not the page
      if (containerRef.current && movesEndRef.current) {
        const container = containerRef.current;
        const element = movesEndRef.current;
        
        // Calculate scroll position within container only
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        if (elementRect.bottom > containerRect.bottom || elementRect.top < containerRect.top) {
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest',  // KEY FIX: Use 'nearest' instead of 'end' or 'start'
            inline: 'nearest'
          });
        }
      }
    } else if (activeRef.current && containerRef.current) {
      // Only scroll if element is outside visible area
      const container = containerRef.current;
      const element = activeRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      if (elementRect.bottom > containerRect.bottom || elementRect.top < containerRect.top) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',  // KEY FIX
          inline: 'nearest'
        });
      }
    }
  }, [currentMoveIndex, moves.length]);

  const formatMove = (move) => {
    if (move.notation) return move.notation;
    return `${move.from}-${move.to}`;
  };

  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      whiteIndex: i,
      black: moves[i + 1],
      blackIndex: i + 1,
    });
  }

  const handleFirst = () => {
    if (moves.length > 0) {
      onMoveClick(0);
    }
  };

  const handlePrev = () => {
    if (currentMoveIndex > 0) {
      onMoveClick(currentMoveIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentMoveIndex < moves.length - 1) {
      onMoveClick(currentMoveIndex + 1);
    }
  };

  const handleLast = () => {
    if (moves.length > 0) {
      onMoveClick(moves.length - 1);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 flex flex-col h-full">
      <h3 className="text-white font-semibold mb-3">Move History</h3>
      
      {/* NEW: Add ref to container and prevent it from causing page scroll */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-1 mb-3 min-h-0"
        style={{ 
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain'  // KEY FIX: Prevent scroll from bubbling to parent
        }}
      >
        {movePairs.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-8">No moves yet</p>
        ) : (
          movePairs.map((pair, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[40px_1fr_1fr] gap-2 text-sm"
            >
              {/* Move Number */}
              <span className="text-white/40 font-semibold self-center">{pair.number}.</span>
              
              {/* White's Move */}
              <button
                ref={currentMoveIndex === pair.whiteIndex ? activeRef : null}
                onClick={() => onMoveClick(pair.whiteIndex)}
                className={`
                  text-left px-2 py-1 rounded transition-colors
                  ${currentMoveIndex === pair.whiteIndex
                    ? 'bg-purple-600/50 text-white font-semibold ring-2 ring-purple-400'
                    : 'text-white/80 hover:bg-white/10'
                  }
                `}
              >
                {formatMove(pair.white)}
              </button>
              
              {/* Black's Move */}
              {pair.black ? (
                <button
                  ref={currentMoveIndex === pair.blackIndex ? activeRef : null}
                  onClick={() => onMoveClick(pair.blackIndex)}
                  className={`
                    text-left px-2 py-1 rounded transition-colors
                    ${currentMoveIndex === pair.blackIndex
                      ? 'bg-purple-600/50 text-white font-semibold ring-2 ring-purple-400'
                      : 'text-white/80 hover:bg-white/10'
                    }
                  `}
                >
                  {formatMove(pair.black)}
                </button>
              ) : (
                <div />
              )}
            </div>
          ))
        )}
        <div ref={movesEndRef} />
      </div>

      {/* Navigation Buttons */}
      {moves.length > 0 && (
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/10">
          <button
            onClick={handleFirst}
            disabled={currentMoveIndex === 0}
            className="flex items-center justify-center p-2 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="First move"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrev}
            disabled={currentMoveIndex === 0}
            className="flex items-center justify-center p-2 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous move"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentMoveIndex === moves.length - 1}
            className="flex items-center justify-center p-2 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next move"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleLast}
            disabled={currentMoveIndex === moves.length - 1}
            className="flex items-center justify-center p-2 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Last move"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Current position indicator */}
      {moves.length > 0 && (
        <div className="text-center text-white/60 text-xs mt-2">
          Position: {currentMoveIndex + 1} / {moves.length}
        </div>
      )}
    </div>
  );
}

export default MoveHistory;