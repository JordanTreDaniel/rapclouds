import type { JSX } from 'react';
import { Link } from 'react-router-dom';

export default function LandingFooter(): JSX.Element {
  return (
    <footer className="w-full" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="rc-content mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center">
        <Link to="/" className="rc-gradient-text text-lg font-black tracking-wide">
          RapClouds
        </Link>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Wear the lyrics that shaped you.
        </p>
        <nav className="mt-1 flex items-center gap-6" style={{ color: 'var(--muted)' }}>
          <Link to="/create" className="text-sm transition-colors hover:text-white">
            Create
          </Link>
          <Link to="/karaoke" className="text-sm transition-colors hover:text-white">
            Karaoke
          </Link>
          <Link to="/#order" className="text-sm transition-colors hover:text-white">
            Order
          </Link>
        </nav>
        <p className="mt-2 text-xs" style={{ color: 'var(--muted)', opacity: 0.75 }}>
          Built for lyric lovers. All artwork generated from user-provided lyrics.
        </p>
      </div>
    </footer>
  );
}
