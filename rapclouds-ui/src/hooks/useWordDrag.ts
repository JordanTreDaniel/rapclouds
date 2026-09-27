import { useCallback, useRef } from 'react';
import type { Word } from '../types';

export interface WordDragCallbacks {
  onWordMove: (index: number, newStart: number, newEnd: number) => void;
  onWordResize: (index: number, edge: 'left' | 'right', newTime: number) => void;
}

export interface WordDragHandlers {
  handleDragStart: (index: number, type: 'move' | 'left' | 'right', clientX: number) => void;
  handleDragMove: (clientX: number) => void;
  handleDragEnd: () => void;
  isDragging: boolean;
  dragIndex: number | null;
}

export function useWordDrag(
  callbacks: WordDragCallbacks,
  pxToTime: (px: number) => number,
  snapToTick: (time: number) => number,
  words: Word[],
  _containerRef?: React.RefObject<HTMLDivElement | null>,
): WordDragHandlers {
  const dragState = useRef<{
    index: number;
    type: 'move' | 'left' | 'right';
    startX: number;
    originalStart: number;
    originalEnd: number;
  } | null>(null);

  const isDragging = dragState.current !== null;
  const dragIndex = dragState.current?.index ?? null;

  const handleDragStart = useCallback((
    index: number,
    type: 'move' | 'left' | 'right',
    clientX: number,
  ) => {
    const word = words[index];
    dragState.current = {
      index,
      type,
      startX: clientX,
      originalStart: word.start,
      originalEnd: word.end,
    };
  }, [words]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!dragState.current) return;
    const state = dragState.current;
    const dx = clientX - state.startX;
    const deltaTime = pxToTime(dx);

    if (state.type === 'move') {
      const newStart = snapToTick(Math.max(0, state.originalStart + deltaTime));
      const duration = state.originalEnd - state.originalStart;
      const newEnd = newStart + duration;
      callbacks.onWordMove(state.index, newStart, newEnd);
    } else if (state.type === 'left') {
      const newStart = snapToTick(Math.max(0, state.originalStart + deltaTime));
      if (newStart < state.originalEnd - 0.01) {
        callbacks.onWordResize(state.index, 'left', newStart);
      }
    } else if (state.type === 'right') {
      const newEnd = snapToTick(Math.max(state.originalStart + 0.01, state.originalEnd + deltaTime));
      callbacks.onWordResize(state.index, 'right', newEnd);
    }
  }, [callbacks, pxToTime, snapToTick]);

  const handleDragEnd = useCallback(() => {
    dragState.current = null;
  }, []);

  return {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging,
    dragIndex,
  };
}
