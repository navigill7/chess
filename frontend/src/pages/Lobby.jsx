import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, Users, Search, Plus, Filter } from 'lucide-react';
import api from '../services/api';

function Lobby() {
  const [tournaments, setTournaments] = useState([]);
  const [filter, setFilter] = useState('all'); // all, ongoing, upcoming
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, [filter]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API endpoint when available
      // const response = await api.get('/tournaments', { params: { status: filter } });
      
      // Mock data for now
      setTournaments([
        {
          id: 1,
          name: 'Hourly Rapid Arena',
          status: 'ongoing',
          players: 409,
          maxPlayers: 500,
          timeControl: '10+0',
          startTime: new Date(Date.now() - 25 * 60000),
          duration: 60,
          prize: '100 coins',
          entryFee: 'Free',
        },
        {
          id: 2,
          name: 'Hourly Blitz Arena',
          status: 'ongoing',
          players: 289,
          maxPlayers: 400,
          timeControl: '5+0',
          startTime: new Date(Date.now() - 15 * 60000),
          duration: 60,
          prize: '75 coins',
          entryFee: 'Free',
        },
        {
          id: 3,
          name: 'Hourly Bullet Arena',
          status: 'upcoming',
          players: 56,
          maxPlayers: 300,
          timeControl: '1+0',
          startTime: new Date(Date.now() + 5 * 60000),
          duration: 45,
          prize: '50 coins',
          entryFee: 'Free',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTimeRemaining = (startTime, duration) => {
    const now = new Date();
    const end = new Date(startTime.getTime() + duration * 60000);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} mins remaining`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m remaining`;
  };

  const getTimeUntilStart = (startTime) => {
    const now = new Date();
    const diff = startTime - now;
    
    if (diff <= 0) return 'Starting now';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `Starting in ${minutes} mins`;
    
    const hours = Math.floor(minutes / 60);
    return `Starting in ${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="container mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Tournaments</h1>
        <p className="text-white/60">Compete with players worldwide and climb the leaderboard</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Search tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2 bg-white/10 border border-white/20 rounded-lg p-1">
          {['all', 'ongoing', 'upcoming'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Create Tournament */}
        <button
          onClick={() => navigate('/lobby/create')}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg px-6 py-3 font-semibold transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Create Tournament</span>
        </button>
      </div>

      {/* Tournament List */}
      {loading ? (
        <div className="text-center text-white py-12">Loading tournaments...</div>
      ) : filteredTournaments.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-12 text-center">
          <Trophy className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <p className="text-white/60 text-lg">No tournaments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTournaments.map((tournament) => (
            <div
              key={tournament.id}
              onClick={() => navigate(`/lobby/${tournament.id}`)}
              className="group bg-white/5 hover:bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 hover:border-purple-500/50 p-6 transition-all cursor-pointer hover:scale-[1.02]"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors mb-1">
                    {tournament.name}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {tournament.timeControl}
                    </span>
                    <span>•</span>
                    <span>{tournament.duration} min</span>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    tournament.status === 'ongoing'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {tournament.status === 'ongoing' ? 'Live' : 'Upcoming'}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-center text-white mb-1">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="font-bold">{tournament.players}</span>
                  </div>
                  <div className="text-white/60 text-xs">Players</div>
                </div>
                <div className="text-center bg-white/5 rounded-lg p-3">
                  <div className="text-yellow-400 font-bold mb-1">{tournament.prize}</div>
                  <div className="text-white/60 text-xs">Prize</div>
                </div>
                <div className="text-center bg-white/5 rounded-lg p-3">
                  <div className="text-green-400 font-bold mb-1">{tournament.entryFee}</div>
                  <div className="text-white/60 text-xs">Entry</div>
                </div>
              </div>

              {/* Progress/Status */}
              <div className="mb-4">
                {tournament.status === 'ongoing' ? (
                  <>
                    <div className="flex justify-between text-sm text-white/60 mb-2">
                      <span>{getTimeRemaining(tournament.startTime, tournament.duration)}</span>
                      <span>{Math.round((tournament.players / tournament.maxPlayers) * 100)}% full</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all"
                        style={{ width: `${(tournament.players / tournament.maxPlayers) * 100}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-white/80 text-sm py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    {getTimeUntilStart(tournament.startTime)}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  tournament.status === 'ongoing'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle join/register
                }}
              >
                {tournament.status === 'ongoing' ? 'Join Now' : 'Register'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Lobby;