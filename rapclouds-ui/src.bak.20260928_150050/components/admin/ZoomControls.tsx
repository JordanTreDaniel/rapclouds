interface ZoomControlsProps {
  ticksPerSecond: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTicksChange: (tps: number) => void;
}

const PRESETS = [
  { label: '0.01x', tps: 0.2 },
  { label: '0.1x', tps: 1 },
  { label: '1x', tps: 2 },
  { label: '5x', tps: 10 },
  { label: '50x', tps: 50 },
];

export default function ZoomControls({
  ticksPerSecond,
  onZoomIn,
  onZoomOut,
  onTicksChange,
}: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Zoom out */}
      <button
        onClick={onZoomOut}
        className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text hover:bg-bg-card-alt transition-colors"
        title="Zoom out"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="7" x2="11" y2="7" />
        </svg>
      </button>

      {/* Slider */}
      <input
        type="range"
        min={0.2}
        max={100}
        step={0.1}
        value={ticksPerSecond}
        onChange={(e) => onTicksChange(parseFloat(e.target.value))}
        className="w-24"
      />

      {/* Zoom in */}
      <button
        onClick={onZoomIn}
        className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text hover:bg-bg-card-alt transition-colors"
        title="Zoom in"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="7" x2="11" y2="7" />
          <line x1="7" y1="3" x2="7" y2="11" />
        </svg>
      </button>

      {/* Preset buttons */}
      <div className="flex gap-1 ml-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onTicksChange(preset.tps)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              Math.abs(ticksPerSecond - preset.tps) < 0.1
                ? 'bg-pink text-white'
                : 'text-text-muted hover:text-text hover:bg-bg-card-alt'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
