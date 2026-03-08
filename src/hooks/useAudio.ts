import { useEffect, useRef, useCallback } from 'react';

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize audio context on first user interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        const AudioContextCtor =
          window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;

        if (!AudioContextCtor) return;
        audioContextRef.current = new AudioContextCtor();
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  const playBeep = useCallback((frequency: number = 800, duration: number = 200, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
  }, []);

  const playWarning = useCallback(() => {
    // Play two beeps for warning
    playBeep(600, 150, 'sine');
    setTimeout(() => playBeep(600, 150, 'sine'), 200);
  }, [playBeep]);

  const playExpired = useCallback(() => {
    // Play three beeps for expired
    playBeep(400, 200, 'square');
    setTimeout(() => playBeep(400, 200, 'square'), 250);
    setTimeout(() => playBeep(400, 400, 'square'), 500);
  }, [playBeep]);

  return { playBeep, playWarning, playExpired };
}
