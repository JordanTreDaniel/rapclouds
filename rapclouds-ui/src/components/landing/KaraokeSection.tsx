import type { CSSProperties, JSX } from 'react';
import { Link } from 'react-router-dom';
import SplashDecor from './SplashDecor';

const FEATURES = [
  'Word-by-word grading',
  'Flow detection',
  'Letter grades from S to F',
  'Practice clips from the densest bars',
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <path d="M6 10.2l2.6 2.6L14 7.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 11a6 6 0 0012 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 17v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function KaraokeSection(): JSX.Element {
  return (
    <>
      <SplashDecor variant="karaoke" />
      <div className="rc-content mx-auto flex max-w-6xl flex-col items-center px-6 py-24 md:py-32">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <span
            data-reveal
            className="text-xs font-semibold uppercase tracking-[0.28em]"
            style={{ color: 'var(--muted)', transitionDelay: '0ms' }}
          >
            RapClouds Karaoke
          </span>
          <h2
            data-reveal
            className="mt-4 text-[clamp(2rem, 5vw, 3.25rem)] font-black"
            style={{ transitionDelay: '100ms' }}
          >
            Pick a song. Rap it. Get{' '}
            <span className="rc-gradient-text-static">graded</span>.
          </h2>
          <p
            data-reveal
            className="mt-5 text-base leading-relaxed md:text-lg"
            style={{ color: 'var(--text)', transitionDelay: '200ms' }}
          >
            Karaoke is live in the app. Choose a track, spit the verse, and RapCheck scores you
            word by word — accuracy, timing, the works. Think you know the words? Prove it.
          </p>
        </div>

        <ul className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <li
              key={feature}
              data-reveal
              className="flex items-center gap-3 text-left"
              style={{ color: 'var(--text)', transitionDelay: `${300 + i * 60}ms` }}
            >
              <span className="shrink-0" style={{ color: 'var(--rc-cyan)' }}>
                <CheckIcon />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div data-reveal style={{ transitionDelay: '560ms' }} className="mt-10">
          <Link to="/karaoke" className="rc-btn rc-btn-primary">
            Open Karaoke
          </Link>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <figure
            data-reveal
            data-speed={0.15}
            className="rc-card lg:col-span-7"
            style={{ padding: 12, transitionDelay: '0ms' }}
          >
            <div className="overflow-hidden rounded-[14px]" style={{ aspectRatio: '1200 / 541' }}>
              <img
                src="/landing/karaoke-main.webp"
                alt="RapClouds Karaoke setup screen for picking a track"
                width={1200}
                height={541}
                loading="lazy"
                decoding="async"
                className="rc-float h-full w-full object-cover"
                style={{ '--float-dur': '7s' } as CSSProperties}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallback) return;
                  img.dataset.fallback = '1';
                  img.src = '/landing/karaoke-main.png';
                }}
              />
            </div>
            <figcaption className="mt-3 px-2 text-sm" style={{ color: 'var(--muted)' }}>
              The setup. Pick your track and go.
            </figcaption>
          </figure>

          <figure
            data-reveal
            data-speed={0.25}
            className="rc-card relative lg:col-span-5 lg:mt-16"
            style={{ padding: 12, transitionDelay: '150ms' }}
          >
            <div className="overflow-hidden rounded-[14px]" style={{ aspectRatio: '1200 / 604' }}>
              <img
                src="/landing/karaoke-playing.webp"
                alt="RapClouds Karaoke run in progress with RapCheck word-by-word grading"
                width={1200}
                height={604}
                loading="lazy"
                decoding="async"
                className="rc-float h-full w-full object-cover"
                style={{ '--float-dur': '6.4s' } as CSSProperties}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallback) return;
                  img.dataset.fallback = '1';
                  img.src = '/landing/karaoke-playing.png';
                }}
              />
            </div>
            <figcaption className="mt-3 px-2 text-sm" style={{ color: 'var(--muted)' }}>
              The run. RapCheck is watching every word.
            </figcaption>
            <div
              className="rc-float absolute -top-3 -right-3 z-10 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
              style={
                {
                  '--float-dur': '6.4s',
                  background: 'rgba(13, 13, 18, 0.92)',
                  borderColor: 'var(--border-light)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                  color: 'var(--text-bright)',
                  backdropFilter: 'blur(8px)',
                } as CSSProperties
              }
            >
              <span style={{ color: 'var(--rc-cyan)' }}>
                <MicIcon />
              </span>
              RapCheck
            </div>
          </figure>
        </div>
      </div>
    </>
  );
}
