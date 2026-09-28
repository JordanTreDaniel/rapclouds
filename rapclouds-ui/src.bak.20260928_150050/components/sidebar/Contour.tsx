import { useGeneration } from '../../store/GenerationContext';

export default function Contour() {
  const { state, dispatch } = useGeneration();

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-3 bg-bg-card-alt cursor-pointer select-none">
        <h3 className="font-display text-[0.95rem] font-bold text-[#f0f0f0] flex items-center gap-2">
          <span className="text-base opacity-60">□</span> Contour
        </h3>
      </div>
      <div className="p-3.5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[0.82rem] text-text-muted font-medium">Draw Contour</span>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_CONTOUR' })}
            className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer ${
              state.drawContour ? 'bg-pink' : 'bg-bg-input border border-border'
            }`}
          >
            <span
              className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-transform ${
                state.drawContour ? 'translate-x-[20px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.82rem] text-text-muted font-medium">Thickness</span>
            <span className="text-[0.75rem] text-text-muted">{state.contourThickness}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={state.contourThickness}
            onChange={(e) =>
              dispatch({ type: 'SET_CONTOUR_THICKNESS', payload: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-bg-input rounded-lg appearance-none cursor-pointer accent-pink"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[0.82rem] text-text-muted font-medium">Contour Color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={state.contourColor}
              onChange={(e) =>
                dispatch({ type: 'SET_CONTOUR_COLOR', payload: e.target.value.toUpperCase() })
              }
              className="w-[28px] h-[28px] rounded border border-border cursor-pointer p-0"
              style={{ backgroundColor: state.contourColor }}
            />
            <span className="text-[0.75rem] text-text-muted font-mono">
              {state.contourColor}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
