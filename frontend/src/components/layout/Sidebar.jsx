import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Eye, Users, User, Target, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Trophy, label: 'Tournaments', path: '/lobby' },
    { icon: Eye, label: 'Spectate', path: '/spectate' },
    { icon: Users, label: 'Friends', path: '/friends' },
    { icon: User, label: 'Profile', path: '/profile/me' },
    { icon: Target, label: 'Puzzles', path: '/puzzles' },
    { icon: BookOpen, label: 'Learn', path: '/learn' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-black/20 backdrop-blur-md border-r border-white/10 min-h-[calc(100vh-4rem)] transition-all duration-300 relative`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-1 shadow-lg transition-colors z-10"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Online Friends Section */}
      {!isCollapsed && (
        <div className="px-4 py-6 border-t border-white/10">
          <h3 className="text-white/60 text-xs font-semibold uppercase mb-3">Online Friends</h3>
          <div className="space-y-2">
            {/* Mock friends - replace with real data */}
            {['GrandMaster99', 'ChessKing', 'PawnStorm'].map((friend, idx) => (
              <div key={idx} className="flex items-center space-x-2 px-2 py-2 rounded hover:bg-white/5 transition-colors cursor-pointer">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {friend[0]}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-slate-900"></div>
                </div>
                <span className="text-white/80 text-sm">{friend}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Section */}
      {!isCollapsed && (
        <div className="px-4 py-6 border-t border-white/10">
          <h3 className="text-white/60 text-xs font-semibold uppercase mb-3">Your Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-white/70">
              <span>Rating</span>
              <span className="font-bold text-yellow-400">1450</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Games</span>
              <span className="font-bold text-white">247</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Win Rate</span>
              <span className="font-bold text-green-400">58%</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;