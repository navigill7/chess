import { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

function useUserNotifications() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const wsRef = useRef(null);

  useEffect(() => {
    if (!user || !token) return;

    const connectWS = () => {
      const wsUrl = `${WS_BASE_URL}/ws/notifications/?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'challenge_accepted') {
          navigate(`/game/${data.game_id}`);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Notification WS error:', error);
      };

      wsRef.current.onclose = () => {
        // Reconnect after 3s
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, token, navigate]);

  return null;
}

export default useUserNotifications;