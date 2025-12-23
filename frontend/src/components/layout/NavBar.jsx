import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, User, LogOut, Settings, X, Check, Swords, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [friendRequests, challenges] = await Promise.all([
        api.get('/auth/friends/requests/'),
        api.get('/game/challenges/pending/')
      ]);

      const allNotifications = [
        ...(friendRequests.received || []).map(req => ({
          id: `friend_${req.id}`,
          type: 'friend_request',
          data: req,
          message: `${req.user.username} sent you a friend request`,
          timestamp: new Date(req.created_at)
        })),
        ...(challenges.received || []).map(ch => ({
          id: `challenge_${ch.id}`,
          type: 'game_challenge',
          data: ch,
          message: `${ch.challenger.username} challenged you to a ${ch.time_control} game`,
          timestamp: new Date(ch.created_at)
        }))
      ];

      allNotifications.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleAcceptFriendRequest = async (requestId) => {
    try {
      await api.post('/auth/friends/accept/', { request_id: requestId });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleRejectFriendRequest = async (requestId) => {
    try {
      await api.post('/auth/friends/reject/', { request_id: requestId });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  const handleAcceptChallenge = async (challengeId) => {
    try {
      const response = await api.post(`/game/challenges/accept/${challengeId}/`);
      setShowNotifications(false);
      navigate(`/game/${response.game_id}`);
    } catch (error) {
      console.error('Failed to accept challenge:', error);
    }
  };

  const handleRejectChallenge = async (challengeId) => {
    try {
      await api.post(`/game/challenges/reject/${challengeId}/`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to reject challenge:', error);
    }
  };

  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 text-white hover:text-purple-400 transition-colors">
            <div className="text-2xl font-bold">♔</div>
            <span className="text-xl font-bold">ChessHub</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-white/80 hover:text-white transition-colors font-medium">
              Play
            </Link>
            <Link to="/lobby" className="text-white/80 hover:text-white transition-colors font-medium">
              Tournaments
            </Link>
            <Link to="/spectate" className="text-white/80 hover:text-white transition-colors font-medium">
              Watch
            </Link>
            <Link to="/friends" className="text-white/80 hover:text-white transition-colors font-medium">
              Friends
            </Link>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                type="text"
                placeholder="Search players, games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Right Side - User Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-white font-semibold">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-white/60 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-white/60">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div key={notification.id} className="p-4 border-b border-white/10 hover:bg-white/5">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {notification.type === 'friend_request' ? (
                                <UserPlus className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Swords className="w-5 h-5 text-green-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm mb-1">{notification.message}</p>
                              <p className="text-white/40 text-xs">{getTimeAgo(notification.timestamp)}</p>

                              {notification.type === 'friend_request' && (
                                <div className="flex space-x-2 mt-3">
                                  <button
                                    onClick={() => handleAcceptFriendRequest(notification.data.id)}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Accept</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectFriendRequest(notification.data.id)}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Decline</span>
                                  </button>
                                </div>
                              )}

                              {notification.type === 'game_challenge' && (
                                <div className="flex space-x-2 mt-3">
                                  <button
                                    onClick={() => handleAcceptChallenge(notification.data.id)}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Accept</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectChallenge(notification.data.id)}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Decline</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {user?.username?.[0]?.toUpperCase() || 'G'}
                  </div>
                )}
                <span className="text-white font-medium hidden md:block">{user?.username || 'Guest'}</span>
              </button>

              {showUserMenu && user && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                  <Link
                    to={`/profile/${user.username}`}
                    className="flex items-center space-x-2 px-4 py-3 hover:bg-white/10 transition-colors text-white"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center space-x-2 px-4 py-3 hover:bg-white/10 transition-colors text-white"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-white/10 transition-colors text-red-400 border-t border-white/10"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;