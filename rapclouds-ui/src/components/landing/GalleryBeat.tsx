import type { CSSProperties, JSX } from 'react';
import type { Beat } from './beats';

const squareImages = new Set([
  'cartoon_Two_Six_archivoblack_1200px_dark',
  'v7_cartoon_lyourz_dark',
]);

const assetVersion = '2';

export default function GalleryBeat({ beat }: { beat: Beat }): JSX.Element {
  const imageLeft = beat.side === 'left';
  const square = squareImages.has(beat.image);
  const src = `/gallery/webp/${beat.image}_900.webp?v=${assetVersion}`;
  const srcSet = [
    `/gallery/webp/${beat.image}_400.webp?v=${assetVersion} 400w`,
    `/gallery/webp/${beat.image}_900.webp?v=${assetVersion} 900w`,
    `/gallery/${beat.image}.png?v=${assetVersion} 1200w`,
  ].join(', ');

  const bleedStyle: CSSProperties = imageLeft
    ? { marginLeft: `${beat.bleed}%` }
    : { marginRight: `${beat.bleed}%` };

  return (
    <div
      data-beat={beat.id}
      data-reveal="fall"
      className="grid grid-cols-1 items-center gap-10 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16 md:py-24"
      style={{ overflowX: 'clip', transitionDelay: `${beat.delay}ms` }}
    >
      <div className={imageLeft ? 'md:order-1' : 'md:order-2'} style={bleedStyle}>
        <div data-speed={beat.speed} className="will-change-transform">
          <img
            className="rc-float h-auto w-full max-w-[900px]"
            src={src}
            srcSet={srcSet}
            sizes="(max-width: 768px) 92vw, 52vw"
            alt={`Word cloud art built from J. Cole lyrics — ${beat.headline}`}
            loading="lazy"
            decoding="async"
            width={900}
            height={square ? 900 : 1600}
            style={{ animationDuration: `${beat.float}s` }}
          />
        </div>
      </div>
      <div className={`${imageLeft ? 'md:order-2' : 'md:order-1'} flex justify-center px-6 md:px-10`}>
        <div
          data-reveal="up"
          className="flex max-w-[46ch] flex-col items-center text-center"
          style={{ transitionDelay: `${beat.delay + 120}ms` }}
        >
          <p className="mb-3 text-xs font-semibold tracking-[0.28em] text-[var(--muted)] uppercase">
            {String(beat.id).padStart(2, '0')} / 08
          </p>
          <h3 className="rc-gradient-text-static mb-4 text-3xl md:text-4xl lg:text-5xl">
            {beat.headline}
          </h3>
          <p className="text-base text-[var(--muted)] md:text-lg">{beat.body}</p>
        </div>
      </div>
    </div>
  );
}
