
import { useCallback } from 'react';

const createSound = (frequency: number, type: OscillatorType, duration: number, volume: number) => {
  if (typeof window === 'undefined' || !window.AudioContext) return () => {};
  
  let audioContext: AudioContext | null = null;
  try {
     audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch (e) {
    console.error("Web Audio API is not supported in this browser.");
    return () => {};
  }


  return () => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };
};

const playCorrectSound = createSound(523.25, 'sine', 0.2, 0.1); // C5
const playIncorrectSound = createSound(261.63, 'sawtooth', 0.3, 0.08); // C4
const playSuccessSound = createSound(783.99, 'triangle', 0.4, 0.15); // G5

export const useSound = () => {
  const playCorrect = useCallback(() => playCorrectSound(), []);
  const playIncorrect = useCallback(() => playIncorrectSound(), []);
  const playSuccess = useCallback(() => playSuccessSound(), []);
  
  return { playCorrect, playIncorrect, playSuccess };
};
