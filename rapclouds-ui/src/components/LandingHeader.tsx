import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={scrolled ? 'landing-header landing-header--scrolled' : 'landing-header'}>
      <Link to="/" className="landing-header__logo" aria-label="RapClouds home">
        <img
          src="/brand/rapclouds-logo-lyric-lovers.webp"
          alt="RapClouds"
          height={40}
          loading="eager"
          decoding="async"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback) return;
            img.dataset.fallback = '1';
            img.src = '/brand/rapclouds-logo-lyric-lovers.png';
          }}
        />
      </Link>
      <nav className="landing-header__nav">
        <Link to="/create" className="landing-header__link">Create</Link>
        <Link to="/karaoke" className="landing-header__link">Karaoke</Link>
        <Link to="/#order" className="rc-btn rc-btn-primary rc-btn-mini">Order Now</Link>
      </nav>
    </header>
  );
}
