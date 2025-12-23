import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, UserCheck, Clock, X, Swords, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

function FriendSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const navigate = useNavigate();

  // Load friends and requests on mount
  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    
    // Refresh friends list every 30 seconds
    const interval = setInterval(loadFriends, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadFriends = async () => {
    try {
      const response = await api.get('/auth/friends/');
      setFriends(response.friends || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await api.get('/auth/friends/requests/');
      setFriendRequests({
        received: response.received || [],
        sent: response.sent || [],
      });
    } catch (err) {
      console.error('Failed to load friend requests:', err);
    }
  };

  const handleSearch = useCallback(async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const response = await api.get(`/auth/users/search/?q=${encodeURIComponent(query)}`);
      setSearchResults(response.results || []);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const sendFriendRequest = async (username) => {
    try {
      await api.post('/auth/friends/request/', { username });
      
      setSearchResults(prev =>
        prev.map(user =>
          user.username === username
            ? { ...user, friendship_status: 'request_sent' }
            : user
        )
      );

      loadFriendRequests();
    } catch (err) {
      setError(err.message || 'Failed to send friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      await api.post('/auth/friends/accept/', { request_id: requestId });
      loadFriends();
      loadFriendRequests();
    } catch (err) {
      setError('Failed to accept friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      await api.post('/auth/friends/reject/', { request_id: requestId });
      loadFriendRequests();
    } catch (err) {
      setError('Failed to reject friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const removeFriend = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      await api.delete(`/auth/friends/${userId}/`);
      loadFriends();
    } catch (err) {
      setError('Failed to remove friend');
      setTimeout(() => setError(null), 3000);
    }
  };

  // NEW: Challenge friend
  const handleChallengeClick = (friend) => {
    setSelectedFriend(friend);
    setShowChallengeModal(true);
  };

  // NEW: Spectate friend's game
  const handleSpectateClick = (friend) => {
    if (friend.game_id) {
      navigate(`/game/${friend.game_id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-white">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for friends by username..."
          className="w-full bg-white/10 border border-white/20 rounded-lg pl-12 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <h3 className="text-white font-semibold mb-4">Search Results</h3>
          <div className="space-y-2">
            {searchResults.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onSendRequest={() => sendFriendRequest(user.username)}
                onRemoveFriend={() => removeFriend(user.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Friend Requests */}
      {friendRequests.received.length > 0 && (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center">
            Friend Requests
            <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
              {friendRequests.received.length}
            </span>
          </h3>
          <div className="space-y-2">
            {friendRequests.received.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                    {request.user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{request.user.username}</p>
                    <p className="text-white/60 text-sm">Rating: {request.user.rating}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptFriendRequest(request.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(request.id)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
        <h3 className="text-white font-semibold mb-4">
          Friends ({friends.length})
        </h3>
        {loading ? (
          <div className="text-center py-8 text-white/60">Loading friends...</div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            No friends yet. Search for users to add!
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                      {friend.username[0].toUpperCase()}
                    </div>
                    {friend.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{friend.username}</p>
                    <p className="text-white/60 text-sm">
                      Rating: {friend.rating}
                      {friend.in_game && ' • In Game'}
                    </p>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-2">
                  {friend.in_game ? (
                    <button
                      onClick={() => handleSpectateClick(friend)}
                      className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
                      title="Spectate game"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  ) : friend.is_online ? (
                    <button
                      onClick={() => handleChallengeClick(friend)}
                      className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                      title="Challenge to a game"
                    >
                      <Swords className="w-4 h-4" />
                    </button>
                  ) : null}
                  
                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Remove friend"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && selectedFriend && (
        <ChallengeModal
          friend={selectedFriend}
          onClose={() => {
            setShowChallengeModal(false);
            setSelectedFriend(null);
          }}
          onSuccess={() => {
            setShowChallengeModal(false);
            setSelectedFriend(null);
            // Optionally navigate to pending challenges page
          }}
        />
      )}
    </div>
  );
}

function UserCard({ user, onSendRequest, onRemoveFriend }) {
  const renderActionButton = () => {
    switch (user.friendship_status) {
      case 'friend':
        return (
          <button
            onClick={onRemoveFriend}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center space-x-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Friends</span>
          </button>
        );
      case 'request_sent':
        return (
          <div className="px-4 py-2 bg-white/10 text-white/60 rounded-lg flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Pending</span>
          </div>
        );
      case 'request_received':
        return (
          <div className="px-4 py-2 bg-purple-600/30 text-purple-300 rounded-lg">
            Sent you a request
          </div>
        );
      default:
        return (
          <button
            onClick={onSendRequest}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friend</span>
          </button>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
          {user.username[0].toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium">{user.username}</p>
          <p className="text-white/60 text-sm">Rating: {user.rating}</p>
        </div>
      </div>
      {renderActionButton()}
    </div>
  );
}

// NEW: Challenge Modal Component
function ChallengeModal({ friend, onClose, onSuccess }) {
  const [selectedTimeControl, setSelectedTimeControl] = useState('10+0');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const timeControls = [
    { value: '1+0', label: '1 min' },
    { value: '3+0', label: '3 min' },
    { value: '3+2', label: '3+2' },
    { value: '5+0', label: '5 min' },
    { value: '10+0', label: '10 min' },
    { value: '10+5', label: '10+5' },
    { value: '15+10', label: '15+10' },
    { value: '30+0', label: '30 min' },
  ];

  const handleSendChallenge = async () => {
    setSending(true);
    setError(null);

    try {
      await api.post('/game/challenges/send/', {
        friend_id: friend.id,
        time_control: selectedTimeControl,
      });

      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to send challenge');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-purple-500/50 shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <Swords className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Challenge {friend.username}
          </h2>
          <p className="text-white/60">
            Choose a time control for your game
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4 text-white text-sm">
            {error}
          </div>
        )}

        {/* Time Control Selection */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {timeControls.map((tc) => (
            <button
              key={tc.value}
              onClick={() => setSelectedTimeControl(tc.value)}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${selectedTimeControl === tc.value
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-white/80 hover:border-white/30'
                }
              `}
            >
              <div className="text-sm font-semibold">{tc.label}</div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 px-6 py-3 rounded-lg font-semibold bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSendChallenge}
            disabled={sending}
            className="flex-1 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FriendSearch;