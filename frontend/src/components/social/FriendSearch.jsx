import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, UserCheck, Clock, X } from 'lucide-react';
import api from '../services/api';

function FriendSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load friends and requests on mount
  useEffect(() => {
    loadFriends();
    loadFriendRequests();
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
      
      // Update search results
      setSearchResults(prev =>
        prev.map(user =>
          user.username === username
            ? { ...user, friendship_status: 'request_sent' }
            : user
        )
      );

      // Reload friend requests
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
    if (!confirm('Are you sure you want to remove this friend?')) {
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
                <button
                  onClick={() => removeFriend(friend.id)}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Remove friend"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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

export default FriendSearch;