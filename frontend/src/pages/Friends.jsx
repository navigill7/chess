import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MessageCircle, Swords, Users, Clock } from 'lucide-react';
import api from '../services/api';

function Friends() {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  const fetchFriends = async () => {
    try {
      // TODO: Replace with actual API endpoint
      // const response = await api.get('/friends');
      
      // Mock data
      setFriends([
        {
          id: 1,
          username: 'GrandMaster99',
          rating: 1850,
          isOnline: true,
          lastSeen: new Date(),
          avatar: null,
        },
        {
          id: 2,
          username: 'ChessKing',
          rating: 1620,
          isOnline: true,
          lastSeen: new Date(),
          avatar: null,
        },
        {
          id: 3,
          username: 'PawnStorm',
          rating: 1450,
          isOnline: false,
          lastSeen: new Date(Date.now() - 3600000),
          avatar: null,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      // TODO: Replace with actual API endpoint
      // const response = await api.get('/friends/requests');
      
      // Mock data
      setFriendRequests([
        {
          id: 1,
          username: 'RookMaster',
          rating: 1550,
          sentAt: new Date(Date.now() - 7200000),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API endpoint
      // const response = await api.get('/users/search', { params: { q: query } });
      
      // Mock data
      setSearchResults([
        { id: 4, username: 'QueenGambit', rating: 1720, isFriend: false },
        { id: 5, username: 'KnightRider', rating: 1580, isFriend: false },
      ]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      // TODO: Replace with actual API endpoint
      // await api.post('/friends/request', { user_id: userId });
      console.log('Friend request sent to:', userId);
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      // TODO: Replace with actual API endpoint
      // await api.post('/friends/accept', { request_id: requestId });
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      fetchFriends();
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      // TODO: Replace with actual API endpoint
      // await api.post('/friends/reject', { request_id: requestId });
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  const getLastSeenText = (lastSeen) => {
    const diff = Date.now() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="container mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Friends</h1>
        <p className="text-white/60">Connect with chess players and challenge your friends</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'friends'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Friends ({friends.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'requests'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <UserPlus className="w-5 h-5" />
          <span>Requests ({friendRequests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'search'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Find Friends</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No friends yet</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mt-4 text-purple-400 hover:text-purple-300"
                >
                  Find friends to add
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                        {friend.username[0].toUpperCase()}
                      </div>
                      {friend.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{friend.username}</h3>
                      <div className="flex items-center space-x-2 text-sm text-white/60">
                        <span>{friend.rating} rating</span>
                        <span>•</span>
                        <span className={friend.isOnline ? 'text-green-400' : ''}>
                          {friend.isOnline ? 'Online' : getLastSeenText(friend.lastSeen)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                      <Swords className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-3">
            {friendRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No pending friend requests</p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold">
                      {request.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{request.username}</h3>
                      <div className="flex items-center space-x-2 text-sm text-white/60">
                        <span>{request.rating} rating</span>
                        <span>•</span>
                        <span>{getLastSeenText(request.sentAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-white/60">Searching...</div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">Enter a username to search</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">No users found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between bg-white/5 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-lg font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{user.username}</h3>
                        <p className="text-sm text-white/60">{user.rating} rating</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFriend(user.id)}
                      disabled={user.isFriend}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-white/10 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{user.isFriend ? 'Already Friends' : 'Add Friend'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Friends;