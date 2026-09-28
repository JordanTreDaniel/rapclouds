import { useRef, useCallback, useState } from 'react';

interface Props {
  duration: number;
  clipStart: number | null;
  clipEnd: number | null;
  onChange: (start: number | null, end: number | null) => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

export default function RangeSlider({ duration, clipStart, clipEnd, onChange }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const getTimeFromEvent = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const bar = barRef.current;
      if (!bar) return 0;
      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      return (x / rect.width) * duration;
    },
    [duration],
  );

  const handlePointerDown = useCallback(
    (handle: 'start' | 'end') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);

      const onMove = (ev: PointerEvent) => {
        const time = getTimeFromEvent(ev);
        if (handle === 'start') {
          const clamped = Math.max(0, Math.min(time, (clipEnd ?? duration) - 1));
          onChange(clamped, clipEnd);
        } else {
          const clamped = Math.min(duration, Math.max(time, (clipStart ?? 0) + 1));
          onChange(clipStart, clamped);
        }
      };

      const onUp = () => {
        setDragging(null);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [duration, clipStart, clipEnd, onChange, getTimeFromEvent],
  );

  const handleBarClick = useCallback(
    (e: React.PointerEvent) => {
      if (dragging) return;
      const time = getTimeFromEvent(e);
      // If no clip or both set, start a new range from clicked point
      if (clipStart == null || clipEnd == null) {
        const newEnd = Math.min(time + 10, duration);
        onChange(time, newEnd);
      }
    },
    [dragging, getTimeFromEvent, clipStart, clipEnd, duration, onChange],
  );

  if (!duration || duration <= 0) return null;

  const toPosition = (time: number) => (time / duration) * 100;

  const startPct = clipStart != null ? toPosition(clipStart) : 0;
  const endPct = clipEnd != null ? toPosition(clipEnd) : 100;
  const rangeDuration =
    clipStart != null && clipEnd != null
      ? Math.round(clipEnd - clipStart)
      : Math.round(duration);

  return (
    <div
      className="w-full rounded-[14px] p-4 mb-4"
      style={{ background: 'var(--color-bg-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Select clip range</span>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {formatTime(rangeDuration)} selected
          </span>
          {(clipStart != null || clipEnd != null) && (
            <button
              onClick={() => onChange(null, null)}
              className="rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all duration-200"
              style={{
                background: 'var(--color-bg-card-alt)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Slider track */}
      <div
        ref={barRef}
        className="relative w-full h-10 rounded-lg cursor-pointer select-none touch-none"
        style={{ background: 'var(--color-bg-card-alt)' }}
        onPointerDown={handleBarClick}
      >
        {/* Selected range highlight */}
        <div
          className="absolute top-0 bottom-0 rounded-lg"
          style={{
            left: `${startPct}%`,
            right: `${100 - endPct}%`,
            background: 'rgba(236, 72, 153, 0.35)',
            border: '1px solid rgba(236, 72, 153, 0.6)',
          }}
        />

        {/* Start handle */}
        <div
          onPointerDown={handlePointerDown('start')}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full cursor-grab z-10 flex items-center justify-center"
          style={{
            left: `${startPct}%`,
            background: dragging === 'start' ? '#f472b6' : 'var(--color-pink)',
            boxShadow: '0 0 0 3px rgba(236,72,153,0.25)',
            touchAction: 'none',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-white opacity-80" />
        </div>

        {/* Start label */}
        {clipStart != null && (
          <div
            className="absolute -top-6 text-[11px] font-mono pointer-events-none whitespace-nowrap"
            style={{
              left: `${startPct}%`,
              transform: 'translateX(-50%)',
              color: 'var(--color-text)',
            }}
          >
            {formatTime(clipStart)}
          </div>
        )}

        {/* End handle */}
        <div
          onPointerDown={handlePointerDown('end')}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full cursor-grab z-10 flex items-center justify-center"
          style={{
            left: `${endPct}%`,
            background: dragging === 'end' ? '#f472b6' : 'var(--color-pink)',
            boxShadow: '0 0 0 3px rgba(236,72,153,0.25)',
            touchAction: 'none',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-white opacity-80" />
        </div>

        {/* End label */}
        {clipEnd != null && (
          <div
            className="absolute -top-6 text-[11px] font-mono pointer-events-none whitespace-nowrap"
            style={{
              left: `${endPct}%`,
              transform: 'translateX(-50%)',
              color: 'var(--color-text)',
            }}
          >
            {formatTime(clipEnd)}
          </div>
        )}

        {/* Time ticks */}
        <div className="absolute top-full mt-1 left-0 right-0 flex justify-between px-0.5">
          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-dim)' }}>
            0:00
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-dim)' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
