import { useGeneration } from '../../store/GenerationContext';

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-cyan">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
  </svg>
);

export default function Generation() {
  const { state, dispatch } = useGeneration();

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#1a1a1a' }}>
        <GearIcon />
        <span className="text-text font-semibold text-sm">Generation</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-text text-sm">Detail vs Speed</label>
            <span className="text-cyan text-sm font-semibold">{state.detailSpeed}</span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            value={state.detailSpeed}
            onChange={(e) => dispatch({ type: 'SET_DETAIL_SPEED', payload: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: '#333', accentColor: '#00E5FF' }}
          />
          <div className="flex justify-between text-[0.65rem] text-text-muted">
            <span>1</span>
            <span>3</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-text text-sm">Cloud Opacity</label>
            <span className="text-cyan text-sm font-semibold">{state.cloudOpacity}</span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={state.cloudOpacity}
            onChange={(e) => dispatch({ type: 'SET_OPACITY', payload: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: '#333', accentColor: '#00E5FF' }}
          />
          <div className="flex justify-between text-[0.65rem] text-text-muted">
            <span>0</span>
            <span>255</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-text text-sm">Watermark</label>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WATERMARK' })}
            className="relative w-10 h-5 rounded-full transition-colors duration-200"
            style={{ background: state.watermark ? '#00E5FF' : '#333' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{ left: state.watermark ? '22px' : '2px' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
