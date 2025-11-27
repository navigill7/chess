import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Clock, Users, CPU, Trophy, Play, Target, TrendingUp } from "lucide-react";

function Home() {
    const navigate = useNavigate();

    return (
        <div className="container" ></div>
    )
}

function QuickPairingGrid() {
    const navigate = useNavigate();
    const timeControls = [
        { time: '1+0', type: 'Bullet' },
        { time: '2+1', type: 'Bullet' },
        { time: '3+0', type: 'Blitz' },
        { time: '3+2', type: 'Blitz' },
        { time: '5+0', type: 'Blitz' },
        { time: '5+3', type: 'Blitz' },
        { time: '10+0', type: 'Rapid' },
        { time: '10+5', type: 'Rapid' },
        { time: '15+10', type: 'Rapid' },
    ];

const handleTimeControl = (control) => {
    // Navigate to matchmaking with selected time control
    navigate(`/matchmaking?time=${control.time}`);
  };

  const handleCreateLobby = () => {
    navigate('/lobby/create');
  };

  const handleChallengeFriend = () => {
    navigate('/friends?action=challenge');
  };

  const handlePlayComputer = () => {
    navigate('/game/computer');
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Quick Pairing</h2>
      
      {/* Time Controls Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {timeControls.map((control, idx) => (
          <button
            key={idx}
            onClick={() => handleTimeControl(control)}
            className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20"
          >
            <div className="relative z-10">
              <div className="text-3xl font-bold text-white mb-1">{control.time}</div>
              <div className="text-sm text-white/70 font-medium">{control.type}</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300" />
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-4">
        <button 
          onClick={handleCreateLobby}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <Play className="w-5 h-5" />
          <span className="font-semibold">Create Lobby</span>
        </button>
        
        <button 
          onClick={handleChallengeFriend}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <Users className="w-5 h-5" />
          <span className="font-semibold">Challenge Friend</span>
        </button>
        
        <button 
          onClick={handlePlayComputer}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <CPU className="w-5 h-5" />
          <span className="font-semibold">Play Computer</span>
        </button>
      </div>
    </div>
  );
}