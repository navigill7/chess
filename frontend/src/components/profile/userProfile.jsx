import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Target, Clock, TrendingUp, Calendar, Award, Edit } from 'lucide-react';

function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/users/${username}`);
      const data = await response.json();
      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">User not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl">
      {/* Profile Header */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-5xl font-bold">
              {profile.username[0].toUpperCase()}
            </div>

            {/* User Info */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{profile.username}</h1>
              <div className="flex items-center space-x-4 text-white/60 mb-4">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>{profile.country || 'Unknown'}</span>
              </div>

              {/* Stats Row */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{profile.rating || 1200}</div>
                  <div className="text-white/60 text-sm">Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{profile.gamesPlayed || 0}</div>
                  <div className="text-white/60 text-sm">Games</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{profile.winRate || 0}%</div>
                  <div className="text-white/60 text-sm">Win Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            {isOwnProfile ? (
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Challenge
                </button>
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20">
                  Add Friend
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        {['overview', 'games', 'stats', 'achievements'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && <OverviewTab profile={profile} />}
          {activeTab === 'games' && <GamesTab profile={profile} />}
          {activeTab === 'stats' && <StatsTab profile={profile} />}
          {activeTab === 'achievements' && <AchievementsTab profile={profile} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rating Chart */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Rating Progress
            </h3>
            <div className="h-48 flex items-center justify-center text-white/40">
              Chart placeholder
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Recent Achievements
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    🏆
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Achievement {i}</p>
                    <p className="text-white/60 text-xs">Unlocked recently</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ profile }) {
  return (
    <div className="space-y-6">
      {/* Performance by Time Control */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
        <h3 className="text-white font-semibold mb-4">Performance by Time Control</h3>
        <div className="grid grid-cols-3 gap-4">
          {['Bullet', 'Blitz', 'Rapid'].map((type) => (
            <div key={type} className="bg-white/5 rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-white font-semibold">{type}</div>
              <div className="text-2xl font-bold text-white mt-2">1450</div>
              <div className="text-white/60 text-sm">50 games</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Games */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
        <h3 className="text-white font-semibold mb-4">Recent Games</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-white font-medium">vs Player{i}</span>
                  <span className="text-white/60 text-sm">Blitz • 5+0</span>
                </div>
                <span className="text-green-400 font-semibold">Won</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GamesTab({ profile }) {
  return <div className="text-white">Games history will appear here</div>;
}

function StatsTab({ profile }) {
  return <div className="text-white">Detailed stats will appear here</div>;
}

function AchievementsTab({ profile }) {
  return <div className="text-white">Achievements will appear here</div>;
}

export default Profile;