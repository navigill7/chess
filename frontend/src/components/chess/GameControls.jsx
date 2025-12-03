import React, { useState } from 'react';
import { Flag, Handshake, RotateCcw, Settings } from 'lucide-react';

function GameControls({ isSpectator, onResign, onOfferDraw, onRequestTakeback, gameStatus }) {
  const [showConfirmResign, setShowConfirmResign] = useState(false);
  const [drawOffered, setDrawOffered] = useState(false);

  const handleResign = () => {
    if (showConfirmResign) {
      onResign();
      setShowConfirmResign(false);
    } else {
      setShowConfirmResign(true);
      setTimeout(() => setShowConfirmResign(false), 3000);
    }
  };

  const handleOfferDraw = () => {
    setDrawOffered(true);
    onOfferDraw();
    setTimeout(() => setDrawOffered(false), 3000);
  };

  if (isSpectator || gameStatus !== 'ongoing') {
    return null;
  }

  return (
    <div className="flex flex-col space-y-3">
      {/* Resign Button */}
      <button
        onClick={handleResign}
        className={`
          flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all
          ${showConfirmResign
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20'
          }
        `}
      >
        <Flag className="w-4 h-4" />
        <span>{showConfirmResign ? 'Confirm Resign?' : 'Resign'}</span>
      </button>

      {/* Offer Draw Button */}
      <button
        onClick={handleOfferDraw}
        disabled={drawOffered}
        className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Handshake className="w-4 h-4" />
        <span>{drawOffered ? 'Draw Offered' : 'Offer Draw'}</span>
      </button>

      {/* Request Takeback Button */}
      <button
        onClick={onRequestTakeback}
        className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition-all"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Request Takeback</span>
      </button>

      {/* Settings */}
      <button className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition-all">
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </button>
    </div>
  );
}

export default GameControls;