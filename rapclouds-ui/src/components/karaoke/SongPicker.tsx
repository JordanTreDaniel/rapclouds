import { useEffect, useState } from 'react';
import type { SongMeta } from './types';

interface Props {
  onSelect: (song: SongMeta) => void;
}

export default function SongPicker({ onSelect }: Props) {
  const [songs, setSongs] = useState<SongMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/songs')
      .then((r) => r.json())
      .then((data: SongMeta[]) => setSongs(data))
      .catch((e) => console.error('Failed to load songs', e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-[460px] rounded-2xl p-7" style={{ background: 'var(--color-bg-card)' }}>
      <h2 className="text-lg font-bold mb-3.5">Choose a Track</h2>
      <div className="flex flex-col gap-1.5">
        {loading && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Loading songs...
          </div>
        )}
        {!loading && songs.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No songs found
          </div>
        )}
        {songs.map((s, i) => {
          const name = s.name ?? 'Unknown';
          const dur = s.duration ?? 0;
          return (
            <button
              key={name}
              onClick={() => onSelect(s)}
              className="flex items-center gap-2.5 rounded-[10px] px-[18px] py-3.5 text-sm cursor-pointer transition-all duration-200 hover:border-pink hover:bg-pink/5"
              style={{
                background: 'var(--color-bg-card-alt)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontFamily: 'inherit',
              }}
            >
              <span className="font-extrabold text-xs" style={{ color: 'var(--color-pink)', width: 20 }}>
                {i + 1}
              </span>
              {name}
              <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {dur ? `${Math.round(dur)}s` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
