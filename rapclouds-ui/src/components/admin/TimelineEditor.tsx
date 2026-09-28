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
  audioUrl: string | null;
}

export default function TimelineEditor({ words, onTimingSave, audioUrl }: Props) {
  const [localWords, setLocalWords] = useState<Word[]>(words);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);

  const [showPlayhead, setShowPlayhead] = useState(false);

  const {
    ticksPerSecond, pxPerSecond, pxToTime, snapToTick,
    setTicksPerSecond, zoomIn, zoomOut, isNearActive,
    getTickPositions,
  } = useTimeline();

  const {
    audioRef, currentTime, duration, isPlaying,
    play, pause, seek, loadSrc,
    playbackRate, setPlaybackRate,
  } = useAudioPlayback();

  // Load audio source when URL changes
  useEffect(() => {
    if (audioUrl) loadSrc(audioUrl);
  }, [audioUrl, loadSrc]);

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

  // Performance monitoring
  useEffect(() => {
    if (!isPlaying) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const measure = () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        const fps = (frameCount / elapsed) * 1000;
        console.log(`[Timeline Perf] FPS: ${fps.toFixed(1)}, Frame time: ${(elapsed / frameCount).toFixed(1)}ms`);
        frameCount = 0;
        lastTime = now;
      }

      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const totalTimelineWidth = duration * pxPerSecond;

  return (
    <div className="flex flex-col h-full bg-bg" data-testid="timeline-editor">
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
            playbackRate={playbackRate}
            onRateChange={setPlaybackRate}
          />
        </div>

        <div className="flex items-center gap-4">
          {isSaving && (
            <span className="text-xs text-pink animate-pulse">Saving…</span>
          )}
          <span className="text-xs text-text-muted">{localWords.length} words</span>
          <button
            onClick={() => setShowPlayhead(!showPlayhead)}
            className={`text-xs px-2 py-1 rounded ${showPlayhead ? 'bg-pink text-white' : 'bg-bg-secondary text-text-muted'}`}
            title={showPlayhead ? 'Hide playhead' : 'Show playhead'}
          >
            {showPlayhead ? '◆' : '◇'} Playhead
          </button>
          <ZoomControls
            ticksPerSecond={ticksPerSecond}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onTicksChange={setTicksPerSecond}
          />
        </div>
      </div>

      {/* Timeline area */}
      <div className="flex-1 min-h-0 overflow-hidden relative" id="timeline-area">
        <div
          ref={scrollRef}
          id="timeline-scroll-ref"
          data-testid="timeline-scroll"
          className="h-full overflow-x-auto overflow-y-hidden"
        >
          {/* Time axis */}
          <div className="sticky top-0 z-10 h-8 bg-bg-card border-b border-border flex items-end">
            {getTickPositions(duration).map((tick) => (
              <div
                key={tick.time}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${tick.x}px` }}
              >
                <span className={`text-sm font-medium text-text ${tick.isMajor ? 'opacity-100' : 'opacity-40'}`}>
                  {tick.time.toFixed(1)}s
                </span>
                <div className={`w-px ${tick.isMajor ? 'h-4 bg-border-light' : 'h-2 bg-border'}`} />
              </div>
            ))}
          </div>

          {/* Words container */}
          <div
            ref={wordsContainerRef}
            className="relative h-full cursor-crosshair"
            style={{ width: `${totalTimelineWidth + 100}px`, minWidth: '100%' }}
            onClick={handleTimelineClick}
          >
            {/* Grid lines */}
            {getTickPositions(duration).map((tick) => (
              <div
                key={tick.time}
                className="absolute top-0 bottom-0 w-px bg-border/30"
                style={{ left: `${tick.x}px` }}
              />
            ))}

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

        {/* Fixed playhead — centered in viewport, content scrolls underneath */}
        {showPlayhead && (
          <div className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left: '50%' }}>
            <Playhead />
          </div>
        )}
      </div>
    </div>
  );
}
