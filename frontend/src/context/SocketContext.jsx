import React, { createContext, useContext, useEffect, useState } from 'react';
import useWebSocket from '../hooks/useWebSocket';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }) {
  const [connections, setConnections] = useState({});

  const createConnection = (url, options = {}) => {
    const connection = useWebSocket(url, options);
    setConnections(prev => ({ ...prev, [url]: connection }));
    return connection;
  };

  const closeConnection = (url) => {
    if (connections[url]) {
      connections[url].disconnect();
      setConnections(prev => {
        const newConns = { ...prev };
        delete newConns[url];
        return newConns;
      });
    }
  };

  const value = {
    connections,
    createConnection,
    closeConnection,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export default SocketContext;