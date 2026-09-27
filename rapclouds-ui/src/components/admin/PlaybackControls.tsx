interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

export default function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
}: PlaybackControlsProps) {
  const handlePlayPause = () => {
    if (isPlaying) onPause();
    else onPlay();
  };

  const handleSkipBack = () => {
    onSeek(Math.max(0, currentTime - 5));
  };

  const handleSkipForward = () => {
    onSeek(Math.min(duration, currentTime + 5));
  };

  return (
    <div className="flex items-center gap-3">
      {/* Skip back */}
      <button
        onClick={handleSkipBack}
        className="flex items-center justify-center w-8 h-8 rounded-full text-text-muted hover:text-text hover:bg-bg-card-alt transition-colors"
        title="Skip back 5s"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M11 3L6 8l5 5" />
          <path d="M14 3L9 8l5 5" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-pink text-white hover:opacity-90 transition-opacity"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <rect x="4" y="3" width="3" height="12" rx="1" />
            <rect x="11" y="3" width="3" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <polygon points="4,2 16,9 4,16" />
          </svg>
        )}
      </button>

      {/* Skip forward */}
      <button
        onClick={handleSkipForward}
        className="flex items-center justify-center w-8 h-8 rounded-full text-text-muted hover:text-text hover:bg-bg-card-alt transition-colors"
        title="Skip forward 5s"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 3l5 5-5 5" />
          <path d="M2 3l5 5-5 5" />
        </svg>
      </button>

      {/* Time display */}
      <span className="text-xs text-text-muted font-mono ml-2">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
