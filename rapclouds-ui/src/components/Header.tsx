import { Link, NavLink, useLocation } from 'react-router-dom';
import { ExportButtons } from './ExportButtons';

export default function Header() {
  const { pathname } = useLocation();
  const showWordCloudTools = pathname === '/create';

  return (
    <header
      className="flex items-center gap-4 bg-bg-card border-b border-border z-10"
      style={{ height: 64, padding: '0 24px' }}
    >
      <Link to="/" className="flex items-center gap-2.5" aria-label="RapClouds home">
        <div
          className="flex items-center justify-center font-bold text-bg"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #FF1493, #00E5FF)',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 18,
          }}
        >
          R
        </div>
        <span
          className="font-bold"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.5rem',
            background: 'linear-gradient(90deg, #FF1493, #00E5FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          RapClouds
        </span>
      </Link>

      <nav className="flex items-center gap-1 ml-6">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/create"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`
          }
        >
          Word Cloud
        </NavLink>
        <NavLink
          to="/karaoke"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`
          }
        >
          Karaoke
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`
          }
        >
          Admin
        </NavLink>
      </nav>

      {showWordCloudTools && (
        <>
          <div className="flex items-center gap-3 ml-auto max-sm:hidden">
            <div className="text-right">
              <div className="font-semibold text-[0.95rem] text-[#f0f0f0]">J. Cole</div>
              <div className="text-[0.75rem] text-text-muted italic">The Off-Season</div>
            </div>
            <img
              className="w-[42px] h-[42px] rounded-full object-cover border-2 border-border-light"
              src="https://upload.wikimedia.org/wikipedia/en/9/9b/J._Cole_-_The_Off-Season.png"
              alt="Album Art"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.background = 'linear-gradient(135deg, #FF1493, #00E5FF)';
                target.style.border = 'none';
              }}
            />
          </div>

          <div className="header-export ml-4 max-lg:hidden">
            <ExportButtons variant="header" />
          </div>
        </>
      )}
    </header>
  );
}
