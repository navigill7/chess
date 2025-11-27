import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router'

// Main App Component
export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
