import { useRef, useEffect, useMemo } from 'react';
import type { Word } from './types';

interface Props {
  words: Word[];
  currentTime: number;
  clipStart: number | null;
  clipEnd: number | null;
  isPlaying: boolean;
}

interface LineData {
  words: (Word & { index: number })[];
  start: number;
  end: number;
}

function groupWordsIntoLines(words: (Word & { index: number })[]): LineData[] {
  const lines: LineData[] = [];
  let cur: (Word & { index: number })[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 7) {
      lines.push({
        words: cur,
        start: cur[0].start,
        end: cur[cur.length - 1].end,
      });
      cur = [];
    }
  }
  if (cur.length) {
    lines.push({
      words: cur,
      start: cur[0].start,
      end: cur[cur.length - 1].end,
    });
  }
  return lines;
}

export default function LyricsDisplay({ words, currentTime, clipStart, clipEnd, isPlaying }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  const filteredWords = useMemo(() => {
    let filtered = words;
    if (clipStart !== null && clipEnd !== null) {
      filtered = words.filter((w) => w.start >= clipStart && w.end <= clipEnd);
    }
    return filtered.map((w) => ({ ...w, index: words.indexOf(w) }));
  }, [words, clipStart, clipEnd]);

  const lines = useMemo(() => groupWordsIntoLines(filteredWords), [filteredWords]);

  // Smooth auto-scroll to center the active line
  useEffect(() => {
    if (!boxRef.current || !isPlaying) return;

    const box = boxRef.current;
    const active = box.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;

    // Use requestAnimationFrame for smooth, jank-free scrolling
    let rafId: number;
    const scrollToCenter = () => {
      if (!box || !active) return;

      const boxRect = box.getBoundingClientRect();
      const elRect = active.getBoundingClientRect();

      // Calculate center of active line relative to the container
      const elCenter = elRect.top + elRect.height / 2;
      const boxCenter = boxRect.top + boxRect.height / 2;
      const offset = elCenter - boxCenter;

      // Only scroll if element is not already centered (within 5px tolerance)
      if (Math.abs(offset) > 5) {
        const currentScroll = box.scrollTop;
        const targetScroll = currentScroll + offset;

        // Smooth scroll using scrollTo
        box.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth',
        });
      }
    };

    // Small delay to let CSS transitions settle, then scroll
    rafId = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToCenter);
    });

    return () => cancelAnimationFrame(rafId);
  }, [currentTime, isPlaying]);

  if (!filteredWords.length) {
    return (
      <div
        className="w-full rounded-2xl p-7 mb-5 flex-1 min-h-[240px] flex items-center justify-center"
        style={{ background: 'var(--color-bg-card)' }}
      >
        <div className="text-[18px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
          No lyrics
        </div>
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className="w-full rounded-2xl p-7 pb-6 mb-5 min-h-full overflow-y-auto scroll-smooth"
      style={{ background: 'var(--color-bg-card)' }}
    >
      {lines.map((line, li) => {
        const isActive = currentTime >= line.start && currentTime <= line.end;
        const isPast = currentTime > line.end;

        return (
          <div
            key={li}
            data-active={isActive}
            className="text-center py-[5px] transition-all duration-[250ms]"
            style={{
              fontSize: isActive ? 22 : 18,
              fontWeight: isActive ? 700 : 500,
              lineHeight: 1.5,
              color: isPast
                ? 'rgba(224,224,224,0.35)'
                : isActive
                  ? 'var(--color-text)'
                  : 'var(--color-text-muted)',
            }}
          >
            {line.words.map((w) => {
              const isNow = currentTime >= w.start && currentTime <= w.end;
              const isDone = currentTime > w.end;

              return (
                <span key={w.index}>
                  <span
                    className="inline-block transition-all duration-[120ms] px-[1px] rounded-[3px]"
                    style={{
                      color: isNow
                        ? 'var(--color-pink)'
                        : isDone
                          ? 'var(--color-green)'
                          : undefined,
                      textShadow: isNow ? '0 0 16px rgba(255,20,147,0.3)' : undefined,
                      transform: isNow ? 'scale(1.08)' : undefined,
                    }}
                  >
                    {w.word}
                  </span>
                  {' '}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
