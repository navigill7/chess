import React from 'react';
import { Clock, Trophy } from 'lucide-react';

function MatchHistory({ games, username }) {
  if (!games || games.length === 0) {
    return (
      <div className="text-center py-8 text-white/60">
        No games played yet
      </div>
    );
  }

  const getResult = (game) => {
    if (game.result === '1/2-1/2') return 'Draw';
    const isWhite = game.white_player === username;
    const won = (game.result === '1-0' && isWhite) || (game.result === '0-1' && !isWhite);
    return won ? 'Won' : 'Lost';
  };

  const getResultColor = (result) => {
    if (result === 'Won') return 'text-green-400';
    if (result === 'Lost') return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="space-y-3">
      {games.map((game) => {
        const result = getResult(game);
        const opponent = game.white_player === username ? game.black_player : game.white_player;

        return (
          <div
            key={game.game_id}
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {opponent[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold">vs {opponent}</p>
                  <p className="text-white/60 text-sm">{game.time_control}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${getResultColor(result)}`}>{result}</p>
                <p className="text-white/60 text-sm">{game.move_count} moves</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-white/60">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(game.created_at).toLocaleDateString()}
              </span>
              {game.termination && (
                <span>{game.termination}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MatchHistory;