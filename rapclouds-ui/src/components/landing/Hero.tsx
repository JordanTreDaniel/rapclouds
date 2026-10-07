import type { JSX } from 'react';
import SplashDecor from './SplashDecor';

export default function Hero(): JSX.Element {
  return (
    <>
      <SplashDecor variant="hero" />
      <div className="rc-content flex min-h-screen flex-col items-center justify-center gap-7 px-6 pt-28 pb-16 text-center">
        <img
          src="/brand/rapclouds-logo-lyric-lovers.png"
          alt="RapClouds"
          data-annot-target="hero:logo"
          className="h-auto w-[min(420px,70vw)]"
          loading="eager"
          fetchPriority="high"
        />
        <h1 className="max-w-4xl text-4xl font-black sm:text-5xl lg:text-6xl">
          Wear the <span className="rc-gradient-text-anim">lyrics</span> that shaped you
        </h1>
        <p className="max-w-2xl text-lg sm:text-xl">
          Every RapClouds piece is built from the words that moved you. Real lyrics. Your favorite artist. Your words, wearable.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <a href="#order" className="rc-btn rc-btn-primary rc-btn-primary-lg">
            Order Now
          </a>
          <a href="#gallery" className="rc-btn rc-btn-secondary">
            See the gallery
          </a>
        </div>
        <div className="mt-10 flex flex-col items-center gap-2">
          <svg
            aria-hidden="true"
            className="rc-bounce h-6 w-6 text-[color:var(--muted)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="text-[0.7rem] uppercase tracking-[0.35em] text-[color:var(--muted)]">
            Scroll
          </span>
        </div>
      </div>
    </>
  );
}
