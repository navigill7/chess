import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function RatingChangeDisplay({ playerColor, oldRating, newRating, playerName }) {
  const change = newRating - oldRating;
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  if (change === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.7)' }}>
        <Minus style={{ width: '16px', height: '16px' }} />
        <span style={{ fontWeight: '600' }}>{playerName}</span>
        <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>({oldRating})</span>
        <span style={{ color: '#fbbf24' }}>No change</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {isPositive && <TrendingUp style={{ width: '20px', height: '20px', color: '#4ade80' }} />}
      {isNegative && <TrendingDown style={{ width: '20px', height: '20px', color: '#f87171' }} />}
      
      <span style={{ fontWeight: '600', color: 'white' }}>{playerName}</span>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{oldRating}</span>
        <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>→</span>
        <span style={{ color: 'white', fontWeight: 'bold' }}>{newRating}</span>
      </div>
      
      <span style={{ 
        fontWeight: 'bold', 
        color: isPositive ? '#4ade80' : '#f87171' 
      }}>
        {isPositive ? '+' : ''}{change}
      </span>
    </div>
  );
}

export default RatingChangeDisplay;