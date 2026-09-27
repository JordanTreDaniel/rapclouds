import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioPlayback {
  /** Ref to attach to a <audio> element */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Current playback time in seconds, updated via RAF */
  currentTime: number;
  /** Duration of loaded audio in seconds */
  duration: number;
  /** Whether the audio is currently playing */
  isPlaying: boolean;
  /** Whether the audio is muted */
  isMuted: boolean;
  /** Start or resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Seek to a specific time in seconds */
  seek: (time: number) => void;
  /** Load a new audio source URL and reset currentTime to 0 */
  loadSrc: (src: string) => void;
  /** Set muted state */
  setMuted: (muted: boolean) => void;
  /** Reset currentTime to 0 without pausing */
  resetTime: () => void;
  /** Pause and reset to 0 */
  stop: () => void;
}

export function useAudioPlayback(): AudioPlayback {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // RAF loop to track currentTime
  const animate = useCallback(() => {
    function tick() {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const cancelRaf = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play();
    setIsPlaying(true);
    animate();
  }, [animate]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    cancelRaf();
  }, [cancelRaf]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const loadSrc = useCallback((src: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = src;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    cancelRaf();
  }, [cancelRaf]);

  const setMuted = useCallback((muted: boolean) => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
    setIsMuted(muted);
  }, []);

  const resetTime = useCallback(() => {
    setCurrentTime(0);
    const audio = audioRef.current;
    if (audio) audio.currentTime = 0;
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.ontimeupdate = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    cancelRaf();
  }, [cancelRaf]);

  // Update duration when loadedmetadata fires
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    audio.addEventListener('loadedmetadata', onLoaded);
    return () => audio.removeEventListener('loadedmetadata', onLoaded);
  }, []);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => cancelRaf();
  }, [cancelRaf]);

  return {
    audioRef,
    currentTime,
    duration,
    isPlaying,
    isMuted,
    play,
    pause,
    seek,
    loadSrc,
    setMuted,
    resetTime,
    stop,
  };
}
