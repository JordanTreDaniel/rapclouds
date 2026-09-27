import { useGeneration } from '../../store/GenerationContext';

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-pink">
    <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
  </svg>
);

export default function Phrases() {
  const { state, dispatch } = useGeneration();

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid #FF1493' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: 'rgba(255,20,147,0.13)' }}
      >
        <SparkleIcon />
        <span className="text-text font-semibold text-sm">Phrases</span>
        <span
          className="text-pink"
          style={{ fontSize: '0.65rem', fontWeight: 400, marginLeft: 4 }}
        >
          v5
        </span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-text font-semibold text-sm">Phrase Mode</label>
          <button
            onClick={() => dispatch({ type: 'SET_PHRASE_MODE', payload: !state.phraseMode })}
            className="relative w-10 h-5 rounded-full transition-colors duration-200"
            style={{ background: state.phraseMode ? '#FF1493' : '#333' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{ left: state.phraseMode ? '22px' : '2px' }}
            />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-pink text-sm">Max N-gram</label>
            <span className="text-pink text-sm font-semibold">{state.maxNgram}</span>
          </div>
          <input
            type="range"
            min={2}
            max={6}
            value={state.maxNgram}
            onChange={(e) => dispatch({ type: 'SET_MAX_NGRAM', payload: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: '#333', accentColor: '#FF1493' }}
          />
          <div className="flex justify-between text-[0.65rem] text-text-muted">
            <span>2</span>
            <span>6</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-text text-sm">Collocations</label>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_COLLOCATIONS' })}
            className="relative w-10 h-5 rounded-full transition-colors duration-200"
            style={{ background: state.collocations ? '#FF1493' : '#333' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{ left: state.collocations ? '22px' : '2px' }}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm" style={{ color: '#888' }}>Coherent Phrases</label>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_COHERENT' })}
            className="relative w-10 h-5 rounded-full transition-colors duration-200"
            style={{ background: state.coherentPhrases ? '#FF1493' : '#333' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{ left: state.coherentPhrases ? '22px' : '2px' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
