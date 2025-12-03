import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function GameClock({ initialTime, increment, isActive, color, playerName, playerRating }) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 100));
    }, 100);

    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const deciseconds = Math.floor((ms % 1000) / 100);

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${deciseconds}`;
  };

  const isLowTime = timeLeft < 20000; // Less than 20 seconds
  const isCriticalTime = timeLeft < 10000; // Less than 10 seconds

  return (
    <div
      className={`
        relative bg-white/5 backdrop-blur-lg rounded-xl border-2 p-4 transition-all
        ${isActive ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-white/10'}
        ${isCriticalTime && isActive ? 'animate-pulse' : ''}
      `}
    >
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      )}

      {/* Player Info */}
      <div className="flex items-center space-x-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
          color === 'white' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
        }`}>
          {color === 'white' ? '♔' : '♚'}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">{playerName || 'Anonymous'}</p>
          <p className="text-white/60 text-sm">{playerRating || '?'} rating</p>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className={`w-5 h-5 ${
            isCriticalTime ? 'text-red-400' : isLowTime ? 'text-yellow-400' : 'text-white/60'
          }`} />
          <span className={`text-3xl font-bold tabular-nums ${
            isCriticalTime ? 'text-red-400' : isLowTime ? 'text-yellow-400' : 'text-white'
          }`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        
        {increment > 0 && (
          <div className="text-white/60 text-sm">
            +{increment / 1000}s
          </div>
        )}
      </div>

      {/* Time Bar */}
      <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isCriticalTime ? 'bg-red-500' : isLowTime ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${(timeLeft / initialTime) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default GameClock;