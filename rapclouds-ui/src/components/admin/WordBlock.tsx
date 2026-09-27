import type { Word } from '../../types';

interface WordBlockProps {
  word: Word;
  index: number;
  isActive: boolean;
  isNearActive: boolean;
  pxPerSecond: number;
  onDragStart: (index: number, type: 'move' | 'left' | 'right', clientX: number) => void;
  onSelect: () => void;
}

export default function WordBlock({
  word,
  index,
  isActive,
  isNearActive: isNear,
  pxPerSecond,
  onDragStart,
  onSelect,
}: WordBlockProps) {
  const duration = word.end - word.start;
  const width = Math.max(duration * pxPerSecond, 40);
  const left = word.start * pxPerSecond;

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    onDragStart(index, type, e.clientX);
  };

  return (
    <div
      className={`
        group absolute top-1/2 -translate-y-1/2 h-12 rounded-lg border cursor-grab select-none
        flex items-center justify-center transition-colors duration-150
        ${isActive
          ? 'bg-pink/20 border-pink shadow-[0_0_12px_rgba(255,20,147,0.4)] z-10'
          : isNear
            ? 'bg-pink/10 border-pink/30'
            : 'bg-bg-card border-border hover:border-border-light hover:bg-bg-card-alt'
        }
      `}
      style={{ left: `${left}px`, width: `${width}px` }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'left')}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-pink rounded-full" />
      </div>

      {/* Word text */}
      <span className={`text-sm font-medium truncate px-2 pointer-events-none ${isActive ? 'text-pink' : 'text-text'}`}>
        {word.word}
      </span>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'right')}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-pink rounded-full" />
      </div>
    </div>
  );
}
