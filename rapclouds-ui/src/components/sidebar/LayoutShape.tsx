import { useGeneration } from '../../store/GenerationContext';

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  cyanLabel = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  cyanLabel?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className={`text-[0.78rem] font-medium ${cyanLabel ? 'text-cyan' : 'text-text'}`}>
          {label}
        </span>
        <span className="text-cyan text-[0.78rem] font-semibold tabular-nums">
          {unit === '%' ? `${value}%` : `${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer accent-cyan"
        style={{
          background: `linear-gradient(to right, #00E5FF 0%, #00E5FF ${((value - min) / (max - min)) * 100}%, #2a2a2a ${((value - min) / (max - min)) * 100}%, #2a2a2a 100%)`,
        }}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full group"
    >
      <span className="text-[0.78rem] text-text">{label}</span>
      <span
        className="relative flex-shrink-0 w-[40px] h-[22px] rounded-full transition-colors duration-200"
        style={{
          backgroundColor: checked ? '#FF1493' : '#2a2a2a',
        }}
      >
        <span
          className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full transition-all duration-200"
          style={{
            backgroundColor: checked ? '#ffffff' : '#888888',
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
          }}
        />
      </span>
    </button>
  );
}

export default function LayoutShape() {
  const { state, dispatch } = useGeneration();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cyan"
        >
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        <h3 className="text-[0.82rem] font-semibold text-text tracking-wide uppercase">
          Layout & Shape
        </h3>
      </div>

      <Slider
        label="Clusters"
        value={state.clusters}
        min={3}
        max={12}
        cyanLabel={true}
        onChange={(v) => dispatch({ type: 'SET_CLUSTERS', payload: v })}
      />

      <Slider
        label="Max Words"
        value={state.maxWords}
        min={500}
        max={5000}
        step={100}
        onChange={(v) => dispatch({ type: 'SET_MAX_WORDS', payload: v })}
      />

      <Slider
        label="Margin"
        value={state.margin}
        min={0}
        max={15}
        onChange={(v) => dispatch({ type: 'SET_MARGIN', payload: v })}
      />

      <Slider
        label="Horizontal Ratio"
        value={state.horizontalRatio}
        min={0}
        max={100}
        step={5}
        unit="%"
        onChange={(v) => dispatch({ type: 'SET_HORIZONTAL_RATIO', payload: v })}
      />

      <Slider
        label="Relative Scaling"
        value={state.relativeScaling}
        min={0}
        max={100}
        step={5}
        unit="%"
        onChange={(v) => dispatch({ type: 'SET_RELATIVE_SCALING', payload: v })}
      />

      <div className="border-t border-border my-1" />

      <Toggle
        label="Repeat Words to Fill"
        checked={state.repeatWords}
        onToggle={() => dispatch({ type: 'TOGGLE_REPEAT' })}
      />

      <Toggle
        label="Include Numbers"
        checked={state.includeNumbers}
        onToggle={() => dispatch({ type: 'TOGGLE_NUMBERS' })}
      />

      <Toggle
        label="Detect Edges"
        checked={state.detectEdges}
        onToggle={() => dispatch({ type: 'TOGGLE_EDGES' })}
      />
    </div>
  );
}
