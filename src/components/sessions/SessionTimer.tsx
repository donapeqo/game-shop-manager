import { useEffect, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useAudio } from '@/hooks/useAudio';
import type { Session } from '@/types';

interface SessionTimerProps {
  session: Session;
  onWarning?: () => void;
  onExpired?: () => void;
}

export function SessionTimer({ session, onWarning, onExpired }: SessionTimerProps) {
  const { isExpired, isWarning, formattedTime } = useTimer(session.end_time, 5 * 60 * 1000);
  const { playWarning, playExpired } = useAudio();
  const [hasPlayedWarning, setHasPlayedWarning] = useState(false);
  const [hasPlayedExpired, setHasPlayedExpired] = useState(false);

  useEffect(() => {
    if (isWarning && !hasPlayedWarning) {
      playWarning();
      setHasPlayedWarning(true);
      onWarning?.();
    }
  }, [isWarning, hasPlayedWarning, playWarning, onWarning]);

  useEffect(() => {
    if (isExpired && !hasPlayedExpired) {
      playExpired();
      setHasPlayedExpired(true);
      onExpired?.();
    }
  }, [isExpired, hasPlayedExpired, playExpired, onExpired]);

  const getTimerColor = () => {
    if (isExpired) return 'text-red-500';
    if (isWarning) return 'text-amber-400';
    return 'text-cyan-400';
  };

  return (
    <div className={`font-mono text-lg font-bold ${getTimerColor()}`}>
      {formattedTime}
    </div>
  );
}
