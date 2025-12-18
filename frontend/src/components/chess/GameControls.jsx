import React, { useState } from 'react';
import { Flag, Handshake, RotateCcw, Settings, AlertTriangle } from 'lucide-react';

function GameControls({ 
  isSpectator, 
  onResign, 
  onOfferDraw, 
  onRequestTakeback, 
  gameStatus,
  drawOffered = false,
  drawOfferReceived = false,
  onAcceptDraw,
  onDeclineDraw,
}) {
  const [showConfirmResign, setShowConfirmResign] = useState(false);
  const [drawOfferSent, setDrawOfferSent] = useState(drawOffered);

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
    setDrawOfferSent(true);
    onOfferDraw();
    setTimeout(() => setDrawOfferSent(false), 5000);
  };

  if (isSpectator || gameStatus !== 'ongoing') {
    return null;
  }

  return (
    <div className="flex flex-col space-y-3">
      {/* Draw Offer Received - Priority Display */}
      {drawOfferReceived && (
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-green-400" />
            <span className="text-white font-semibold">Draw Offer Received!</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onDeclineDraw}
              className="px-4 py-2 rounded-lg font-medium bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              Decline
            </button>
            <button
              onClick={onAcceptDraw}
              className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-all"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Resign Button with Confirmation */}
      <button
        onClick={handleResign}
        className={`
          flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all
          ${showConfirmResign
            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
            : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20'
          }
        `}
      >
        <Flag className="w-4 h-4" />
        <span>{showConfirmResign ? '⚠️ Confirm Resign?' : 'Resign'}</span>
      </button>

      {/* Offer Draw Button */}
      <button
        onClick={handleOfferDraw}
        disabled={drawOfferSent}
        className={`
          flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all border border-white/20
          ${drawOfferSent 
            ? 'bg-green-600/30 text-green-300 cursor-not-allowed'
            : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
          }
        `}
      >
        <Handshake className="w-4 h-4" />
        <span>{drawOfferSent ? '✓ Draw Offered' : 'Offer Draw'}</span>
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