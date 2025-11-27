import React, { useState } from 'react';
import { Clock, Users, Cpu, Trophy, Play } from 'lucide-react';

// Main App Component
export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <QuickPairingGrid />
            <TournamentsList />
          </div>
          <Sidebar />
        </div>
      </main>
    </div>
  );
}

// Navbar Component
function Navbar() {
  return (
    <nav className="bg-black/30 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center space-x-2 text-white hover:text-purple-400 transition-colors">
            <div className="text-2xl font-bold">♔</div>
            <span className="text-xl font-bold">ChessHub</span>
          </a>
          
          <div className="flex items-center space-x-6">
            <a href="#" className="text-white/80 hover:text-white transition-colors">Play</a>
            <a href="#" className="text-white/80 hover:text-white transition-colors">Puzzles</a>
            <a href="#" className="text-white/80 hover:text-white transition-colors">Learn</a>
            <a href="#" className="text-white/80 hover:text-white transition-colors">Watch</a>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Quick Pairing Grid Component
function QuickPairingGrid() {
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

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Quick Pairing</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {timeControls.map((control, idx) => (
          <button
            key={idx}
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

      <div className="grid grid-cols-3 gap-4">
        <button className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
          <Play className="w-5 h-5" />
          <span className="font-semibold">Create Lobby</span>
        </button>
        
        <button className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
          <Users className="w-5 h-5" />
          <span className="font-semibold">Challenge Friend</span>
        </button>
        
        <button className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
          <Cpu className="w-5 h-5" />
          <span className="font-semibold">Play Computer</span>
        </button>
      </div>
    </div>
  );
}

// Tournaments List Component
function TournamentsList() {
  const tournaments = [
    { name: 'Hourly Rapid Arena', players: 409, timeControl: '10+0', status: '25 mins remaining', progress: 40 },
    { name: 'Hourly Blitz Arena', players: 289, timeControl: '5+0', status: '15 mins remaining', progress: 65 },
    { name: 'Hourly Bullet Arena', players: 156, timeControl: '1+0', status: 'Starting in 5 mins', progress: 0 },
    { name: 'Daily SuperBlitz', players: 75, timeControl: '3+2', status: 'Starting in 12 mins', progress: 0 },
    { name: 'Monthly Classical', players: 234, timeControl: '30+0', status: 'Starting in 2 hours', progress: 0 },
    { name: 'Weekly Rapid Swiss', players: 128, timeControl: '10+5', status: 'Starting tomorrow', progress: 0 },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
          Open Tournaments
        </h2>
        <a href="#" className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors">
          View All →
        </a>
      </div>

      <div className="space-y-3">
        {tournaments.map((tournament, idx) => (
          <div
            key={idx}
            className="group bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-white font-semibold text-lg group-hover:text-purple-300 transition-colors">
                  {tournament.name}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-white/60 mt-1">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {tournament.timeControl}
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {tournament.players} players
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-white/80 text-sm">{tournament.status}</span>
              </div>
            </div>
            
            {tournament.progress > 0 && (
              <div className="mt-3">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${tournament.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar() {
  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Players Online</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Playing Now</span>
            <span className="text-2xl font-bold text-green-400">42,358</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">Games in Progress</span>
            <span className="text-2xl font-bold text-blue-400">21,129</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl border border-purple-500/30 p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">Puzzle of the Day</h3>
        <p className="text-white/70 text-sm mb-4">Improve your tactics</p>
        
        <div className="aspect-square bg-gradient-to-br from-amber-900/40 to-amber-700/40 rounded-lg mb-4 flex items-center justify-center border-2 border-amber-600/30">
          <div className="text-6xl">♔</div>
        </div>
        
        <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg py-3 font-semibold transition-all duration-300 hover:scale-105 shadow-lg">
          Solve Puzzle
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Quick Links</h3>
        <div className="space-y-2">
          <a href="#" className="block text-white/70 hover:text-purple-400 transition-colors py-2">
            → Analysis Board
          </a>
          <a href="#" className="block text-white/70 hover:text-purple-400 transition-colors py-2">
            → Opening Explorer
          </a>
          <a href="#" className="block text-white/70 hover:text-purple-400 transition-colors py-2">
            → Learn Chess
          </a>
          <a href="#" className="block text-white/70 hover:text-purple-400 transition-colors py-2">
            → Watch Broadcasts
          </a>
        </div>
      </div>
    </div>
  );
}