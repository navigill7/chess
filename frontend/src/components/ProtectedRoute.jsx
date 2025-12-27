import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Pages that don't require authentication (guests allowed)
  const guestAllowedPages = ['/', '/bot'];
  
  const isGuestAllowed = guestAllowedPages.some(page => 
    location.pathname === page || location.pathname.startsWith(page + '/')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Allow guests on specific pages
  if (isGuestAllowed) {
    return children;
  }

  // Require authentication for other pages
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;