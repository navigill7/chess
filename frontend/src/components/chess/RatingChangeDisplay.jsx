import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function RatingChangeDisplay({ 
  playerColor, 
  oldRating, 
  newRating, 
  playerName 
}) {
  const change = newRating - oldRating;
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  if (change === 0) {
    return (
      <div className="flex items-center space-x-2 text-white/70">
        <Minus className="w-4 h-4" />
        <span className="font-semibold">{playerName}</span>
        <span className="text-white/50">({oldRating})</span>
        <span className="text-yellow-400">No change</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {isPositive && <TrendingUp className="w-5 h-5 text-green-400" />}
      {isNegative && <TrendingDown className="w-5 h-5 text-red-400" />}
      
      <span className="font-semibold text-white">{playerName}</span>
      
      <div className="flex items-center space-x-1">
        <span className="text-white/50">{oldRating}</span>
        <span className="text-white/30">→</span>
        <span className="text-white font-bold">{newRating}</span>
      </div>
      
      <span className={`font-bold ${
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}>
        {isPositive ? '+' : ''}{change}
      </span>
    </div>
  );
}

export default RatingChangeDisplay;