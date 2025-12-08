import { useState, useEffect, useRef } from 'react';

function useTimer(initialTime, isActive, onTimeExpired) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const intervalRef = useRef(null);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (timeLeft <= 0 && onTimeExpired) {
        onTimeExpired();
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = Math.max(0, prev - 100);
        if (newTime === 0 && onTimeExpired) {
          onTimeExpired();
        }
        return newTime;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft, onTimeExpired]);

  const reset = (newTime) => {
    setTimeLeft(newTime || initialTime);
  };

  const addTime = (milliseconds) => {
    setTimeLeft((prev) => prev + milliseconds);
  };

  return { timeLeft, reset, addTime };
}

export default useTimer;