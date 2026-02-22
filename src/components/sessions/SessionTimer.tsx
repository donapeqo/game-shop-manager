import { useEffect, useRef } from 'react';
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
  const hasPlayedWarningRef = useRef(false);
  const hasPlayedExpiredRef = useRef(false);

  useEffect(() => {
    hasPlayedWarningRef.current = false;
    hasPlayedExpiredRef.current = false;
  }, [session.id]);

  useEffect(() => {
    if (isWarning && !hasPlayedWarningRef.current) {
      playWarning();
      hasPlayedWarningRef.current = true;
      onWarning?.();
    }
  }, [isWarning, playWarning, onWarning]);

  useEffect(() => {
    if (isExpired && !hasPlayedExpiredRef.current) {
      playExpired();
      hasPlayedExpiredRef.current = true;
      onExpired?.();
    }
  }, [isExpired, playExpired, onExpired]);

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
