import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router'

// Main App Component
export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.GOOGLE_OAUTH_CLIENT_ID}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}