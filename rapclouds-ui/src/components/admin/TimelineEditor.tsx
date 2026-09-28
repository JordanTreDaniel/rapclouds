import { useCallback, useEffect, useRef, useState } from 'react';
import { useTimeline } from '../../hooks/useTimeline';
import { useWordDrag } from '../../hooks/useWordDrag';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import WordBlock from './WordBlock';
import Playhead from './Playhead';
import PlaybackControls from './PlaybackControls';
import ZoomControls from './ZoomControls';
import type { Word } from '../../types';

interface Props {
  words: Word[];
  onTimingSave: (words: Word[]) => void;
}

export default function TimelineEditor({ words, onTimingSave }: Props) {
  const [localWords, setLocalWords] = useState<Word[]>(words);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);

  const {
    ticksPerSecond, pxPerSecond, pxToTime, snapToTick,
    setTicksPerSecond, zoomIn, zoomOut, isNearActive,
  } = useTimeline();

  const {
    audioRef, currentTime, duration, isPlaying,
    play, pause, seek,
  } = useAudioPlayback();

  // Auto-save with debounce
  const saveTiming = useCallback((updatedWords: Word[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsSaving(true);
      onTimingSave(updatedWords);
      setTimeout(() => setIsSaving(false), 500);
    }, 500);
  }, [onTimingSave]);

  // Word drag handlers
  const onWordMove = useCallback((index: number, newStart: number, newEnd: number) => {
    setLocalWords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], start: newStart, end: newEnd };
      saveTiming(updated);
      return updated;
    });
  }, [saveTiming]);

  const onWordResize = useCallback((index: number, edge: 'left' | 'right', newTime: number) => {
    setLocalWords((prev) => {
      const updated = [...prev];
      if (edge === 'left') {
        updated[index] = { ...updated[index], start: newTime };
      } else {
        updated[index] = { ...updated[index], end: newTime };
      }
      saveTiming(updated);
      return updated;
    });
  }, [saveTiming]);

  const {
    handleDragStart, handleDragMove, handleDragEnd,
  } = useWordDrag(
    { onWordMove, onWordResize },
    pxToTime,
    snapToTick,
    localWords,
  );

  // Mouse move/up handlers for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const handleMouseUp = () => handleDragEnd();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleDragMove, handleDragEnd]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (isPlaying) pause();
        else play();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, play, pause]);

  // Auto-scroll to keep playhead centered in viewport
  useEffect(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const viewportCenter = container.clientWidth / 2;
    const playheadPx = currentTime * pxPerSecond;
    const targetScroll = playheadPx - viewportCenter;

    container.scrollTo({
      left: targetScroll,
      behavior: 'auto',
    });
  }, [currentTime, pxPerSecond]);

  // Timeline click to seek
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const time = pxToTime(clickX);
    seek(Math.max(0, Math.min(duration, time)));
  }, [pxToTime, seek, duration]);

  // Sync words from parent when they change (e.g., after external save)
  useEffect(() => {
    setLocalWords(words);
  }, [words]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const totalTimelineWidth = duration * pxPerSecond;

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* Top controls bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-bg-card">
        <div className="flex items-center gap-4">
          {/* Playback controls */}
          <PlaybackControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlay={play}
            onPause={pause}
            onSeek={seek}
          />
        </div>

        <div className="flex items-center gap-4">
          {isSaving && (
            <span className="text-xs text-pink animate-pulse">Saving…</span>
          )}
          <span className="text-xs text-text-muted">{localWords.length} words</span>
          <ZoomControls
            ticksPerSecond={ticksPerSecond}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onTicksChange={setTicksPerSecond}
          />
        </div>
      </div>

      {/* Timeline area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-x-auto overflow-y-hidden"
        >
          {/* Time axis */}
          <div className="sticky top-0 z-10 h-8 bg-bg-card border-b border-border flex items-end">
            {Array.from({ length: Math.ceil(duration * ticksPerSecond) + 1 }, (_, i) => {
              const time = i / ticksPerSecond;
              const x = time * pxPerSecond;
              const isMajor = i % (ticksPerSecond >= 1 ? 2 : 1) === 0;
              return (
                <div
                  key={i}
                  className="absolute bottom-0 flex flex-col items-center"
                  style={{ left: `${x}px` }}
                >
                  <span className={`text-[10px] text-text-muted mb-1 ${isMajor ? 'opacity-100' : 'opacity-50'}`}>
                    {time.toFixed(1)}s
                  </span>
                  <div className={`w-px ${isMajor ? 'h-3 bg-border-light' : 'h-2 bg-border'}`} />
                </div>
              );
            })}
          </div>

          {/* Words container */}
          <div
            ref={wordsContainerRef}
            className="relative h-full cursor-crosshair"
            style={{ width: `${totalTimelineWidth + 100}px`, minWidth: '100%' }}
            onClick={handleTimelineClick}
          >
            {/* Grid lines */}
            {Array.from({ length: Math.ceil(duration * ticksPerSecond) + 1 }, (_, i) => {
              const x = (i / ticksPerSecond) * pxPerSecond;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-border/30"
                  style={{ left: `${x}px` }}
                />
              );
            })}

            {/* Playhead */}
            <Playhead currentTime={currentTime} pxPerSecond={pxPerSecond} />

            {/* Word blocks */}
            {localWords.map((word, index) => (
              <WordBlock
                key={`${index}-${word.word}`}
                word={word}
                index={index}
                isActive={currentTime >= word.start && currentTime <= word.end}
                isNearActive={isNearActive(word, currentTime)}
                pxPerSecond={pxPerSecond}
                onDragStart={handleDragStart}
                onSelect={() => setSelectedWord(selectedWord === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
