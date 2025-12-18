import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

function useWebSocket(url, options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const connect = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      const wsUrl = token
        ? `${WS_BASE_URL}${url}?token=${token}`
        : `${WS_BASE_URL}${url}`;

      wsRef.current = new WebSocket(wsUrl);

      // WebSocket OPEN
      wsRef.current.onopen = (event) => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onOpen?.(event);
      };

      // WebSocket MESSAGE
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (err) {
          console.error('❌ Failed to parse WebSocket message', err);
        }
      };

      // WebSocket ERROR
      wsRef.current.onerror = (event) => {
        console.error('❌ WebSocket error', event);
        setError('WebSocket connection error');
        onError?.(event);
      };

      // WebSocket CLOSE (IMPORTANT)
      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        onClose?.(event);

        //  Authentication failure → STOP reconnect
        if (event.code === 1008 || event.code === 4001) {
          console.error('❌ Authentication failed - stopping reconnection');
          setError('Session expired. Please login again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          reconnectAttemptsRef.current = maxReconnectAttempts;
          return;
        }

        // ✅ Clean manual disconnect → NO reconnect
        if (event.code === 1000) {
          console.log('ℹ️ Clean disconnect - no reconnection needed');
          return;
        }

        // 🔁 Reconnect with exponential backoff
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;

          const backoffDelay =
            reconnectInterval *
            Math.pow(1.5, reconnectAttemptsRef.current - 1);

          console.log(
            `⏳ Reconnecting in ${backoffDelay / 1000}s (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffDelay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          setError('Unable to connect. Please refresh the page.');
        }
      };
    } catch (err) {
      console.error('❌ Failed to create WebSocket connection', err);
      setError('Failed to connect');
    }
  }, [
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect,
    reconnectInterval,
    maxReconnectAttempts,
  ]);

  // Manual Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnected');
      wsRef.current = null;
    }
  }, []);

  const handleClose = useCallback((event) => {
    console.log('WebSocket closed', event.code, event.reason);
    setIsConnected(false);
    onClose?.(event);

    // Authentication failure codes - DON'T reconnect
    if (event.code === 1008 || event.code === 4001) {
      setConnectionError('Session expired. Please login again.');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      reconnectAttemptsRef.current = maxReconnectAttempts; // Stop reconnection
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    // Clean manual disconnect (code 1000) - NO reconnect
    if (event.code === 1000) {
      console.log('ℹ️ Clean disconnect - no reconnection needed');
      return;
    }

    // Server shutdown or network issues - RETRY with backoff
    if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current += 1;

      const backoffDelay =
        reconnectInterval *
        Math.pow(1.5, reconnectAttemptsRef.current - 1);

      console.log(
        `⏳ Reconnecting in ${backoffDelay / 1000}s (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, backoffDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      setError('Unable to connect. Please refresh the page.');
    }
  }, [onClose, reconnect, reconnectInterval, maxReconnectAttempts, connect]);


  // Send Message
  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message =
        typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
    } else {
      console.error('❌ WebSocket is not connected');
    }
  }, []);

  // Auto Connect / Cleanup
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error: wsError || connectionError,
    send,
    disconnect,
    reconnect: connect,
  };
}

export default useWebSocket;