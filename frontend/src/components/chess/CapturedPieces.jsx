import React from 'react';

function CapturedPieces({ capturedPieces, color }) {
  const pieceValues = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
  };

  const pieceSymbols = {
    white: {
      pawn: '♙',
      knight: '♘',
      bishop: '♗',
      rook: '♖',
      queen: '♕',
    },
    black: {
      pawn: '♟',
      knight: '♞',
      bishop: '♝',
      rook: '♜',
      queen: '♛',
    },
  };

  // Calculate material advantage
  const calculateAdvantage = () => {
    let whiteValue = 0;
    let blackValue = 0;

    capturedPieces?.white?.forEach((piece) => {
      whiteValue += pieceValues[piece] || 0;
    });

    capturedPieces?.black?.forEach((piece) => {
      blackValue += pieceValues[piece] || 0;
    });

    return color === 'white' ? whiteValue - blackValue : blackValue - whiteValue;
  };

  const advantage = calculateAdvantage();
  const pieces = capturedPieces?.[color] || [];

  // Group pieces by type
  const groupedPieces = pieces.reduce((acc, piece) => {
    acc[piece] = (acc[piece] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex items-center space-x-2">
      {/* Captured Pieces */}
      <div className="flex flex-wrap gap-1">
        {Object.entries(groupedPieces).map(([type, count]) => (
          <div key={type} className="flex items-center">
            {Array.from({ length: count }).map((_, idx) => (
              <span
                key={idx}
                className={`text-2xl ${
                  color === 'white' ? 'text-white' : 'text-gray-900'
                } opacity-70`}
              >
                {pieceSymbols[color][type]}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Material Advantage */}
      {advantage > 0 && (
        <span className="text-white/80 text-sm font-semibold bg-white/10 px-2 py-1 rounded">
          +{advantage}
        </span>
      )}
    </div>
  );
}


export default CapturedPieces;