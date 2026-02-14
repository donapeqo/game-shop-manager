import { useState, useEffect, useCallback } from 'react';

interface TimerState {
  timeRemaining: number;
  isExpired: boolean;
  isWarning: boolean;
  formattedTime: string;
}

export function useTimer(endTime: string | Date, warningThreshold: number = 5 * 60 * 1000) {
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: 0,
    isExpired: false,
    isWarning: false,
    formattedTime: '00:00:00',
  });

  const formatTime = useCallback((ms: number): string => {
    if (ms <= 0) return '00:00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const end = new Date(endTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = end - now;

      setTimerState({
        timeRemaining: remaining,
        isExpired: remaining <= 0,
        isWarning: remaining > 0 && remaining <= warningThreshold,
        formattedTime: formatTime(remaining),
      });
    };

    // Initial update
    updateTimer();

    // Update every second
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [endTime, warningThreshold, formatTime]);

  return timerState;
}
