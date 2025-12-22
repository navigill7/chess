import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function useMatchmaking(onMatchFound) {
  const [isSearching, setIsSearching] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      return;
    }

    const wsUrl = `${WS_BASE_URL}/ws/matchmaking/?token=${token}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('✅ Matchmaking WebSocket connected');
      setError(null);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Matchmaking message:', data);

        switch (data.type) {
          case 'connected':
            console.log('✅ Connected to matchmaking');
            break;

          case 'queue_joined':
            setIsSearching(true);
            setQueueStatus({
              message: data.message,
              timeControl: data.time_control,
            });
            break;

          case 'match_found':
            setIsSearching(false);
            setQueueStatus(null);
            if (onMatchFound) {
              onMatchFound(data.game_id, data.color);
            }
            break;

          case 'queue_left':
            setIsSearching(false);
            setQueueStatus(null);
            break;

          case 'timeout':
            setIsSearching(false);
            setQueueStatus(null);
            setError(data.message);
            setTimeout(() => setError(null), 5000);
            break;

          case 'error':
            setIsSearching(false);
            setError(data.message);
            setTimeout(() => setError(null), 5000);
            break;

          default:
            console.warn('Unknown matchmaking message:', data.type);
        }
      } catch (err) {
        console.error('Failed to parse matchmaking message:', err);
      }
    };

    wsRef.current.onerror = (err) => {
      console.error('❌ Matchmaking WebSocket error:', err);
      setError('Connection error');
    };

    wsRef.current.onclose = () => {
      console.log('🔌 Matchmaking WebSocket closed');
      setIsSearching(false);
    };
  }, [onMatchFound]);

  const joinQueue = useCallback((timeControl = '10+0') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect();
      // Wait for connection then send
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            action: 'join_queue',
            time_control: timeControl,
          }));
        }
      }, 500);
    } else {
      wsRef.current.send(JSON.stringify({
        action: 'join_queue',
        time_control: timeControl,
      }));
    }
    console.log(`🔍 Joining matchmaking queue: ${timeControl}`);
  }, [connect]);

  const leaveQueue = useCallback((timeControl) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'leave_queue',
        time_control: timeControl,
      }));
      setIsSearching(false);
      setQueueStatus(null);
      console.log('🚪 Leaving matchmaking queue');
    }
  }, []);

  const getQueueStatus = useCallback((timeControl = '10+0') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'get_queue_status',
        time_control: timeControl,
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsSearching(false);
      setQueueStatus(null);
    }
  }, []);

  return {
    isSearching,
    queueStatus,
    error,
    joinQueue,
    leaveQueue,
    getQueueStatus,
    disconnect,
    connect,
  };
}

export default useMatchmaking;