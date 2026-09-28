import { useState, useCallback, useMemo } from 'react';
import type { Word } from '../types';

export interface TimelineState {
  /** Ticks per second (zoom level) */
  ticksPerSecond: number;
  /** Pixels per second derived from ticks */
  pxPerSecond: number;
  /** Minimum ticks per second */
  minTicksPerSecond: number;
  /** Maximum ticks per second */
  maxTicksPerSecond: number;
  /** Convert time (seconds) to pixel position */
  timeToPx: (time: number) => number;
  /** Convert pixel position to time (seconds) */
  pxToTime: (px: number) => number;
  /** Snap a time to the nearest tick grid */
  snapToTick: (time: number) => number;
  /** Get tick positions for a given duration */
  getTickPositions: (duration: number) => Array<{ time: number; x: number; isMajor: boolean }>;
  /** Set ticks per second */
  setTicksPerSecond: (tps: number) => void;
  /** Zoom in (increase ticks per second) */
  zoomIn: () => void;
  /** Zoom out (decrease ticks per second) */
  zoomOut: () => void;
  /** Check if a word is within the highlight buffer */
  isNearActive: (word: Word, currentTime: number) => boolean;
  /** Total width in pixels for a given duration */
  totalWidth: (duration: number) => number;
  /** Duration from a word */
  wordDuration: (word: Word) => number;
}

const DEFAULT_TICKS = 2; // 0.5s per tick
const MIN_TICKS = 0.2;  // 5s per tick
const MAX_TICKS = 100;  // 0.01s per tick
const PX_PER_TICK = 200; // pixels per tick unit

export function useTimeline(): TimelineState {
  const [ticksPerSecond, setTicksPerSecondRaw] = useState(DEFAULT_TICKS);

  const pxPerSecond = ticksPerSecond * PX_PER_TICK;

  const setTicksPerSecond = useCallback((tps: number) => {
    setTicksPerSecondRaw(Math.max(MIN_TICKS, Math.min(MAX_TICKS, tps)));
  }, []);

  const zoomIn = useCallback(() => {
    setTicksPerSecondRaw((prev) => Math.min(MAX_TICKS, prev * 1.5));
  }, []);

  const zoomOut = useCallback(() => {
    setTicksPerSecondRaw((prev) => Math.max(MIN_TICKS, prev / 1.5));
  }, []);

  const timeToPx = useCallback((time: number) => time * pxPerSecond, [pxPerSecond]);

  const pxToTime = useCallback((px: number) => px / pxPerSecond, [pxPerSecond]);

  const snapToTick = useCallback((time: number): number => {
    const tickDuration = 1 / ticksPerSecond;
    return Math.round(time / tickDuration) * tickDuration;
  }, [ticksPerSecond]);

  const getTickPositions = useCallback((dur: number) => {
    const ticks: Array<{ time: number; x: number; isMajor: boolean }> = [];
    const count = Math.ceil(dur * ticksPerSecond) + 1;
    for (let i = 0; i < count; i++) {
      const time = i / ticksPerSecond;
      const x = time * pxPerSecond;
      const isMajor = ticksPerSecond >= 1 ? i % 2 === 0 : true;
      ticks.push({ time, x, isMajor });
    }
    return ticks;
  }, [ticksPerSecond, pxPerSecond]);

  const isNearActive = useCallback((word: Word, currentTime: number): boolean => {
    const buffer = 2; // 2s buffer
    return currentTime >= word.start - buffer && currentTime <= word.end + buffer;
  }, []);

  const totalWidth = useCallback((duration: number) => duration * pxPerSecond, [pxPerSecond]);

  const wordDuration = useCallback((word: Word) => word.end - word.start, []);

  return useMemo(() => ({
    ticksPerSecond,
    pxPerSecond,
    minTicksPerSecond: MIN_TICKS,
    maxTicksPerSecond: MAX_TICKS,
    timeToPx,
    pxToTime,
    snapToTick,
    getTickPositions,
    setTicksPerSecond,
    zoomIn,
    zoomOut,
    isNearActive,
    totalWidth,
    wordDuration,
  }), [
    ticksPerSecond, pxPerSecond, timeToPx, pxToTime, snapToTick,
    getTickPositions, setTicksPerSecond, zoomIn, zoomOut,
    isNearActive, totalWidth, wordDuration,
  ]);
}
