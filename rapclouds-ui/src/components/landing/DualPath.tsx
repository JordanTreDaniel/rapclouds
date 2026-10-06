import type { CSSProperties, JSX } from 'react';
import { Link } from 'react-router-dom';

const cardDelay: CSSProperties = { transitionDelay: '160ms' };

export default function DualPath(): JSX.Element {
  return (
    <div className="rc-content px-6 py-24 md:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <p
          data-reveal=""
          className="text-[0.75rem] font-semibold tracking-[0.32em] uppercase text-[color:var(--muted)]"
        >
          Two ways in
        </p>
        <h2 data-reveal="up" className="max-w-3xl text-3xl md:text-4xl lg:text-5xl">
          Wear your favorite songs or get <span className="rc-gradient-text-static">tested</span> on them
        </h2>
        <div className="mt-8 grid w-full gap-6 md:grid-cols-2">
          <div data-reveal="">
            <div className="rc-card rc-card-featured flex h-full flex-col gap-5 text-left">
              <svg
                aria-hidden="true"
                className="h-10 w-10 text-[color:var(--rc-gold)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8.5 3 L4 5.5 L2.5 10 L6 11.5 V21 H18 V11.5 L21.5 10 L20 5.5 L15.5 3 C15.5 3 14.2 5.8 12 5.8 C9.8 5.8 8.5 3 8.5 3 Z" />
              </svg>
              <h3 className="text-xl">Wear the art</h3>
              <p className="leading-relaxed">
                Custom word-cloud apparel and prints built from any song you love. The words are the art. Pick a song, pick a look, wear it.
              </p>
              <div className="mt-auto pt-3">
                <Link to="/#order" className="rc-btn rc-btn-primary">
                  Order Now
                </Link>
              </div>
            </div>
          </div>
          <div data-reveal="" style={cardDelay}>
            <div className="rc-card rc-card-featured flex h-full flex-col gap-5 text-left">
              <svg
                aria-hidden="true"
                className="h-10 w-10 text-[color:var(--rc-cyan)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <path d="M12 18v4" />
                <path d="M8 22h8" />
              </svg>
              <h3 className="text-xl">Take the test</h3>
              <p className="leading-relaxed">
                RapClouds Karaoke picks a song, drops the beat, and grades your run word by word. RapCheck tells you how you really did.
              </p>
              <div className="mt-auto pt-3">
                <Link to="/karaoke" className="rc-btn rc-btn-primary">
                  Try Karaoke
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
