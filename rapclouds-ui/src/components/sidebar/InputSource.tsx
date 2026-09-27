import { useRef, useEffect } from 'react';
import { useGeneration } from '../../store/GenerationContext';

const MODE_OPTIONS = [
  { value: 'single' as const, label: 'Single Track' },
  { value: 'album' as const, label: 'Album' },
  { value: 'custom' as const, label: 'Custom Text' },
];

function formatTrackName(filename: string): string {
  return filename
    .replace('.txt', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function InputSource() {
  const { state, dispatch } = useGeneration();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/lyrics')
      .then((r) => r.json())
      .then((tracks: string[]) => {
        dispatch({ type: 'SET_AVAILABLE_TRACKS', payload: tracks });
      })
      .catch(() => {});
    fetch('/api/masks')
      .then((r) => r.json())
      .then((masks: string[]) => {
        dispatch({ type: 'SET_AVAILABLE_MASKS', payload: masks });
        if (masks.length > 0 && !state.selectedMask) {
          dispatch({ type: 'SET_SELECTED_MASK', payload: masks[0] });
        }
      })
      .catch(() => {});
  }, [dispatch]);

  const handleTrackSelect = async (filename: string) => {
    dispatch({ type: 'SET_SELECTED_TRACK', payload: filename });
    dispatch({ type: 'SET_INPUT_MODE', payload: 'single' });
    try {
      const res = await fetch(`/api/lyrics/${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (data.content) {
        dispatch({ type: 'SET_LYRICS_TEXT', payload: data.content });
      }
    } catch (e) {
      console.error('Failed to load lyrics:', e);
    }
  };

  const handleAlbumSelect = async () => {
    dispatch({ type: 'SET_INPUT_MODE', payload: 'album' });
    dispatch({ type: 'SET_SELECTED_TRACK', payload: null });
    try {
      const res = await fetch('/api/lyrics');
      const tracks: string[] = await res.json();
      const contents = await Promise.all(
        tracks.map(async (t) => {
          const r = await fetch(`/api/lyrics/${encodeURIComponent(t)}`);
          const d = await r.json();
          return d.content || '';
        })
      );
      dispatch({ type: 'SET_LYRICS_TEXT', payload: contents.join('\n\n') });
    } catch (e) {
      console.error('Failed to load album lyrics:', e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        dispatch({ type: 'SET_MASK_IMAGE', payload: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        dispatch({ type: 'SET_MASK_IMAGE', payload: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-3 bg-bg-card-alt cursor-pointer select-none">
        <h3 className="text-[0.95rem] font-bold text-[#f0f0f0] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          <span className="text-base opacity-60">🎤</span> Input Source
        </h3>
      </div>
      <div className="p-3.5 flex flex-col gap-3.5">
        <div className="flex bg-bg-input rounded-lg border border-border overflow-hidden">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                dispatch({ type: 'SET_INPUT_MODE', payload: opt.value });
                if (opt.value === 'album') handleAlbumSelect();
              }}
              className={`flex-1 py-2 px-1.5 text-center text-[0.75rem] font-semibold border-none cursor-pointer transition-all ${
                state.inputMode === opt.value
                  ? 'bg-pink text-white'
                  : 'bg-transparent text-text-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {state.inputMode === 'single' && state.availableTracks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.72rem] font-semibold uppercase tracking-widest text-pink">
              Select Track
            </label>
            <div className="relative">
              <select
                value={state.selectedTrack || ''}
                onChange={(e) => {
                  if (e.target.value) handleTrackSelect(e.target.value);
                }}
                className="w-full py-2 px-3 pr-8 border border-border rounded-lg bg-bg-input text-text text-[0.82rem] outline-none appearance-none cursor-pointer transition-colors focus:border-cyan"
              >
                <option value="">Choose a J. Cole track...</option>
                {state.availableTracks.map((track) => (
                  <option key={track} value={track}>
                    {formatTrackName(track)}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none text-[0.8rem]">▾</span>
            </div>
          </div>
        )}

        <div
          className="border-2 border-dashed border-border-light rounded-lg p-6 text-center cursor-pointer transition-all bg-bg-input hover:border-pink hover:bg-pink/10"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="text-3xl mb-1.5 opacity-50">📁</div>
          <div className="text-[0.8rem] text-text-muted">
            Drag & drop a mask image or <strong className="text-pink">browse</strong>
          </div>
          <div className="mt-1 text-[0.7rem] text-text-dim">
            PNG, JPG — portrait shape for the word cloud
          </div>
        </div>

        {state.availableMasks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.72rem] font-semibold uppercase tracking-widest text-text-muted">
              Mask Portrait
            </label>
            <div className="relative">
              <select
                value={state.selectedMask || ''}
                onChange={(e) => dispatch({ type: 'SET_SELECTED_MASK', payload: e.target.value || null })}
                className="w-full py-2 px-3 pr-8 border border-border rounded-lg bg-bg-input text-text text-[0.82rem] outline-none appearance-none cursor-pointer transition-colors focus:border-cyan"
              >
                {state.availableMasks.map((mask) => (
                  <option key={mask} value={mask}>
                    {mask.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none text-[0.8rem]">▾</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.72rem] font-semibold uppercase tracking-widest text-text-muted">
            Lyrics {state.selectedTrack && <span className="text-pink">({formatTrackName(state.selectedTrack)})</span>}
          </label>
          <textarea
            value={state.lyricsText}
            onChange={(e) =>
              dispatch({ type: 'SET_LYRICS_TEXT', payload: e.target.value })
            }
            placeholder="Select a track above, paste lyrics, or upload a .txt file..."
            className="w-full min-h-[80px] p-2.5 px-3 border border-border rounded-lg bg-bg-input text-text text-[0.82rem] leading-normal resize-y outline-none transition-colors focus:border-pink"
          />
          <div className="flex gap-1.5 mt-0.5">
            <button className="inline-flex items-center gap-1.5 py-[5px] px-2.5 bg-transparent border border-transparent rounded-lg text-text text-[0.72rem] font-medium cursor-pointer transition-all hover:bg-[#222]">
              📎 Upload .txt
            </button>
            <button className="inline-flex items-center gap-1.5 py-[5px] px-2.5 bg-transparent border border-transparent rounded-lg text-text text-[0.72rem] font-medium cursor-pointer transition-all hover:bg-[#222]">
              🔄 Fetch from Genius
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
