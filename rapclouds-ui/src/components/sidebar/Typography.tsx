import { useGeneration } from '../../store/GenerationContext';

const FONTS = [
  'Impact',
  'Bebas Neue',
  'Oswald Bold',
  'Montserrat Black',
  'Abril Fatface',
  'Anton',
];

export default function Typography() {
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
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
        <h3 className="text-[0.82rem] font-semibold text-text tracking-wide uppercase">
          Typography
        </h3>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[0.78rem] font-medium text-pink">Font</label>
        <div className="relative">
          <select
            value={state.font}
            onChange={(e) => dispatch({ type: 'SET_FONT', payload: e.target.value })}
            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-[0.82rem] text-text appearance-none outline-none transition-colors focus:border-cyan cursor-pointer pr-8"
          >
            {FONTS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[0.7rem]"
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid currentColor',
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[0.78rem] font-medium text-text">Width</span>
          <span className="text-cyan text-[0.78rem] font-semibold tabular-nums">
            {state.width}px
          </span>
        </div>
        <input
          type="range"
          min={800}
          max={2400}
          step={100}
          value={state.width}
          onChange={(e) => dispatch({ type: 'SET_WIDTH', payload: Number(e.target.value) })}
          className="w-full appearance-none rounded-full cursor-pointer"
          style={{
            height: '4px',
            background: `linear-gradient(to right, #2a2a2a 0%, #2a2a2a ${((state.width - 800) / 1600) * 100}%, #2a2a2a ${((state.width - 800) / 1600) * 100}%, #2a2a2a 100%)`,
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[0.78rem] font-medium text-text">Height</span>
          <span className="text-cyan text-[0.78rem] font-semibold tabular-nums">
            {state.height}px
          </span>
        </div>
        <input
          type="range"
          min={800}
          max={2400}
          step={100}
          value={state.height}
          onChange={(e) => dispatch({ type: 'SET_HEIGHT', payload: Number(e.target.value) })}
          className="w-full appearance-none rounded-full cursor-pointer"
          style={{
            height: '4px',
            background: `linear-gradient(to right, #2a2a2a 0%, #2a2a2a ${((state.height - 800) / 1600) * 100}%, #2a2a2a ${((state.height - 800) / 1600) * 100}%, #2a2a2a 100%)`,
          }}
        />
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00E5FF;
          border: 2px solid #0a0a0a;
          box-shadow: 0 0 8px #00E5FF, 0 0 2px #00E5FF;
          cursor: pointer;
          margin-top: -6px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00E5FF;
          border: 2px solid #0a0a0a;
          box-shadow: 0 0 8px #00E5FF, 0 0 2px #00E5FF;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
