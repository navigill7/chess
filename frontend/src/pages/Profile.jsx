import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Target, Clock, TrendingUp, Calendar, Award, Edit, Swords, UserPlus, UserMinus } from 'lucide-react';
import api from '../services/api';
import EditProfile from '../components/profile/EditProfile';
import MatchHistory from '../components/profile/MatchHistory';
import ProfileStats from '../components/profile/ProfileStats';

function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isFriend, setIsFriend] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    fetchProfile();
    fetchGames();
    if (!isOwnProfile) {
      checkFriendship();
    }
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/auth/users/${username}/`);
      setProfile(response.user);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await api.get(`/game/user-games/${username}/`);
      setGames(response.games || []);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
  };

  const checkFriendship = async () => {
    try {
      const response = await api.get('/auth/friends/');
      const friendsList = response.map(f => f.friend.username);
      setIsFriend(friendsList.includes(username));
    } catch (error) {
      console.error('Failed to check friendship:', error);
    }
  };

  const handleAddFriend = async () => {
    try {
      await api.post('/auth/friends/request/', { username });
      alert('Friend request sent!');
    } catch (error) {
      console.error('Failed to send friend request:', error);
      alert('Failed to send friend request');
    }
  };

  const handleRemoveFriend = async () => {
    if (!confirm('Remove this friend?')) return;
    
    try {
      await api.delete(`/auth/friends/${profile.id}/`);
      setIsFriend(false);
      alert('Friend removed');
    } catch (error) {
      console.error('Failed to remove friend:', error);
      alert('Failed to remove friend');
    }
  };

  const handleChallenge = () => {
    navigate(`/friends?action=challenge&user=${username}`);
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
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>

            {/* User Info */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{profile.username}</h1>
              <div className="flex items-center space-x-4 text-white/60 mb-4">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {new Date(profile.date_joined).toLocaleDateString()}
                </span>
                {profile.country && (
                  <>
                    <span>•</span>
                    <span>{profile.country}</span>
                  </>
                )}
                {profile.is_online && (
                  <>
                    <span>•</span>
                    <span className="text-green-400">● Online</span>
                  </>
                )}
              </div>

              {profile.bio && (
                <p className="text-white/70 mb-4 max-w-lg">{profile.bio}</p>
              )}

              {/* Stats Row */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{profile.rating || 800}</div>
                  <div className="text-white/60 text-sm">Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{profile.games_played || 0}</div>
                  <div className="text-white/60 text-sm">Games</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{profile.win_rate || 0}%</div>
                  <div className="text-white/60 text-sm">Win Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleChallenge}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg transition-colors"
                >
                  <Swords className="w-4 h-4" />
                  <span>Challenge</span>
                </button>
                {isFriend ? (
                  <button
                    onClick={handleRemoveFriend}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Remove Friend</span>
                  </button>
                ) : (
                  <button
                    onClick={handleAddFriend}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Friend</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mb-6">
        <ProfileStats user={profile} />
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        {['overview', 'games', 'stats'].map((tab) => (
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
      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'overview' && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <h3 className="text-white font-semibold mb-4">Recent Games</h3>
            <MatchHistory games={games.slice(0, 5)} username={profile.username} />
          </div>
        )}
        
        {activeTab === 'games' && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <h3 className="text-white font-semibold mb-4">All Games</h3>
            <MatchHistory games={games} username={profile.username} />
          </div>
        )}
        
        {activeTab === 'stats' && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <h3 className="text-white font-semibold mb-4">Detailed Statistics</h3>
            <div className="text-white/60">Statistics coming soon...</div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfile
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedUser) => {
            setProfile(updatedUser);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

export default Profile;