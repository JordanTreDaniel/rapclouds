import { useGeneration } from '../store/GenerationContext';

const placeholderWords = [
  { word: 'dreams', size: '2.8rem', color: '#FF1493', weight: 700, opacity: 0.85 },
  { word: 'future', size: '2rem', color: '#00E5FF', weight: 600, opacity: 0.85 },
  { word: 'hustle', size: '1.6rem', color: '#FFD700', weight: 600, opacity: 0.85 },
  { word: 'grinding', size: '2.2rem', color: '#00E5FF', weight: 600, opacity: 0.9 },
  { word: 'kings', size: '2.8rem', color: '#FF1493', weight: 700, opacity: 0.85 },
  { word: 'vibes', size: '1.8rem', color: '#FFD700', weight: 500, opacity: 0.8 },
  { word: 'motivation', size: '2.5rem', color: '#00E676', weight: 700, opacity: 0.85 },
  { word: 'legacy', size: '1.6rem', color: '#FFD700', weight: 600, opacity: 0.85 },
  { word: 'freedom', size: '2rem', color: '#00E5FF', weight: 600, opacity: 0.85 },
  { word: 'purpose', size: '2.2rem', color: '#00E5FF', weight: 500, opacity: 0.9 },
];

export default function CloudDisplay() {
  const { state } = useGeneration();

  return (
    <div
      className="rounded-xl border border-border bg-bg-card flex items-center justify-center overflow-hidden relative"
      style={{ maxWidth: 900, aspectRatio: 1, width: '100%' }}
    >
      {state.generatedImageUrl ? (
        <img
          src={state.generatedImageUrl}
          alt="Generated word cloud"
          className="w-full h-full object-contain"
        />
      ) : (
        <div
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at 30% 40%, #ff149310 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, #00e5ff10 0%, transparent 50%)',
          }}
        >
          <div
            className="relative z-[1] text-center leading-[1.1] p-10 flex flex-wrap justify-center items-center"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {placeholderWords.map((item, i) => (
              <span
                key={i}
                className="inline-block mx-1"
                style={{
                  fontSize: item.size,
                  color: item.color,
                  fontWeight: item.weight,
                  opacity: item.opacity,
                }}
              >
                {item.word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex gap-2">
        <span
          className="px-2.5 py-1 rounded text-[0.7rem] font-semibold uppercase tracking-wider"
          style={{
            background: 'rgba(255, 20, 147, 0.08)',
            color: '#FF1493',
            border: '1px solid rgba(255, 20, 147, 0.13)',
          }}
        >
          v7
        </span>
        <span
          className="px-2.5 py-1 rounded text-[0.7rem] font-semibold uppercase tracking-wider"
          style={{
            background: 'rgba(0, 229, 255, 0.09)',
            color: '#00E5FF',
            border: '1px solid rgba(0, 229, 255, 0.13)',
          }}
        >
          {state.width}x{state.height}
        </span>
        <span
          className="px-2.5 py-1 rounded text-[0.7rem] font-semibold uppercase tracking-wider"
          style={{
            background: 'rgba(255, 215, 0, 0.09)',
            color: '#FFD700',
            border: '1px solid rgba(255, 215, 0, 0.13)',
          }}
        >
          {state.clusters} clusters
        </span>
      </div>

      {state.isGenerating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="w-10 h-10 border-3 border-pink border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-text text-sm font-medium tracking-wide">
            Generating...
          </span>
        </div>
      )}
    </div>
  );
}
