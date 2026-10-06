import { Link } from 'react-router-dom';
import '../components/landing/landing.css';

export default function Welcome() {
  return (
    <div className="landing welcome-page">
      <div className="welcome-card">
        <img
          className="welcome-logo"
          src="/brand/rapclouds-logo-lyric-lovers.webp"
          alt="RapClouds"
          loading="eager"
          decoding="async"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback) return;
            img.dataset.fallback = '1';
            img.src = '/brand/rapclouds-logo-lyric-lovers.png';
          }}
        />
        <h1 className="welcome-title rc-gradient-text-static">You are early. Perfect.</h1>
        <p className="welcome-body">
          RapClouds launches soon. Your spot is saved — shirts, art, and karaoke are all in the works. Watch your inbox.
        </p>
        <Link to="/" className="welcome-link">Back to the gallery</Link>
        <p className="welcome-note">
          Want to try the generator while you wait? It is live at{' '}
          <Link to="/create">/create</Link>.
        </p>
      </div>
    </div>
  );
}
