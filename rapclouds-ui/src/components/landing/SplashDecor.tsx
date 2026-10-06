import type { CSSProperties } from 'react';

type Variant = 'hero' | 'gallery' | 'karaoke' | 'signup';

interface BlobSpec {
  color: string;
  size: number;
  top: string;
  left: string;
  opacity: number;
  speed: number;
}

interface BarSpec {
  width: string;
  top: string;
  left: string;
  height: number;
  rev: boolean;
  soft: boolean;
  diag: boolean;
  speed: number;
}

interface DotSpec {
  size: number;
  top: string;
  left: string;
  color: string;
  speed: number;
}

interface Cluster {
  blobs: BlobSpec[];
  bars: BarSpec[];
  dots: DotSpec[];
}

const MAGENTA = '#E91E8C';
const PINK = '#FF4DA6';
const RED = '#F2385A';
const ORANGE = '#FF6B35';
const GOLD = '#FFC145';
const CYAN = '#3EE8E0';
const BLUE = '#3E6BFF';
const VIOLET = '#8B5CF6';

const clusters: Record<Variant, Cluster> = {
  hero: {
    blobs: [
      { color: MAGENTA, size: 620, top: '-14%', left: '-8%', opacity: 0.45, speed: 0.08 },
      { color: CYAN, size: 480, top: '4%', left: '58%', opacity: 0.4, speed: 0.11 },
      { color: GOLD, size: 420, top: '52%', left: '-6%', opacity: 0.35, speed: 0.1 },
      { color: VIOLET, size: 560, top: '40%', left: '62%', opacity: 0.42, speed: 0.09 },
      { color: ORANGE, size: 340, top: '72%', left: '30%', opacity: 0.35, speed: 0.12 },
    ],
    bars: [
      { width: '34vw', top: '18%', left: '-4%', height: 6, rev: false, soft: false, diag: true, speed: 0.42 },
      { width: '22vw', top: '30%', left: '64%', height: 4, rev: true, soft: false, diag: false, speed: 0.48 },
      { width: '40vw', top: '46%', left: '20%', height: 3, rev: false, soft: true, diag: true, speed: 0.36 },
      { width: '18vw', top: '60%', left: '72%', height: 5, rev: true, soft: false, diag: true, speed: 0.5 },
      { width: '26vw', top: '76%', left: '8%', height: 4, rev: false, soft: false, diag: false, speed: 0.4 },
      { width: '15vw', top: '88%', left: '50%', height: 6, rev: true, soft: false, diag: true, speed: 0.45 },
    ],
    dots: [
      { size: 8, top: '22%', left: '48%', color: CYAN, speed: 0.3 },
      { size: 5, top: '38%', left: '12%', color: GOLD, speed: 0.28 },
      { size: 6, top: '55%', left: '82%', color: PINK, speed: 0.32 },
      { size: 4, top: '70%', left: '40%', color: BLUE, speed: 0.3 },
      { size: 7, top: '84%', left: '68%', color: RED, speed: 0.34 },
    ],
  },
  gallery: {
    blobs: [
      { color: VIOLET, size: 480, top: '-10%', left: '60%', opacity: 0.38, speed: 0.09 },
      { color: MAGENTA, size: 420, top: '35%', left: '-10%', opacity: 0.35, speed: 0.08 },
      { color: CYAN, size: 380, top: '70%', left: '55%', opacity: 0.35, speed: 0.11 },
      { color: GOLD, size: 320, top: '85%', left: '5%', opacity: 0.3, speed: 0.1 },
    ],
    bars: [
      { width: '28vw', top: '12%', left: '55%', height: 5, rev: true, soft: false, diag: true, speed: 0.44 },
      { width: '20vw', top: '34%', left: '4%', height: 4, rev: false, soft: false, diag: true, speed: 0.5 },
      { width: '32vw', top: '58%', left: '48%', height: 3, rev: true, soft: true, diag: false, speed: 0.36 },
      { width: '16vw', top: '78%', left: '14%', height: 6, rev: false, soft: false, diag: true, speed: 0.46 },
    ],
    dots: [
      { size: 6, top: '20%', left: '30%', color: VIOLET, speed: 0.3 },
      { size: 4, top: '46%', left: '76%', color: CYAN, speed: 0.28 },
      { size: 7, top: '66%', left: '22%', color: MAGENTA, speed: 0.32 },
      { size: 5, top: '88%', left: '60%', color: GOLD, speed: 0.3 },
    ],
  },
  karaoke: {
    blobs: [
      { color: BLUE, size: 520, top: '-12%', left: '58%', opacity: 0.4, speed: 0.1 },
      { color: PINK, size: 440, top: '30%', left: '-12%', opacity: 0.38, speed: 0.08 },
      { color: CYAN, size: 400, top: '68%', left: '52%', opacity: 0.36, speed: 0.11 },
      { color: GOLD, size: 340, top: '82%', left: '2%', opacity: 0.32, speed: 0.09 },
    ],
    bars: [
      { width: '30vw', top: '16%', left: '60%', height: 5, rev: false, soft: false, diag: true, speed: 0.46 },
      { width: '18vw', top: '36%', left: '6%', height: 4, rev: true, soft: false, diag: false, speed: 0.4 },
      { width: '24vw', top: '56%', left: '66%', height: 6, rev: false, soft: false, diag: true, speed: 0.5 },
      { width: '34vw', top: '72%', left: '10%', height: 3, rev: true, soft: true, diag: true, speed: 0.35 },
      { width: '15vw', top: '90%', left: '44%', height: 4, rev: false, soft: false, diag: true, speed: 0.48 },
    ],
    dots: [
      { size: 7, top: '24%', left: '44%', color: BLUE, speed: 0.3 },
      { size: 5, top: '42%', left: '80%', color: PINK, speed: 0.32 },
      { size: 4, top: '62%', left: '18%', color: CYAN, speed: 0.28 },
      { size: 6, top: '86%', left: '70%', color: GOLD, speed: 0.3 },
    ],
  },
  signup: {
    blobs: [
      { color: MAGENTA, size: 460, top: '-10%', left: '-6%', opacity: 0.4, speed: 0.1 },
      { color: GOLD, size: 400, top: '20%', left: '60%', opacity: 0.36, speed: 0.08 },
      { color: CYAN, size: 420, top: '55%', left: '-8%', opacity: 0.38, speed: 0.09 },
      { color: VIOLET, size: 380, top: '70%', left: '58%', opacity: 0.35, speed: 0.11 },
    ],
    bars: [
      { width: '26vw', top: '14%', left: '58%', height: 4, rev: true, soft: false, diag: true, speed: 0.44 },
      { width: '20vw', top: '32%', left: '2%', height: 6, rev: false, soft: false, diag: true, speed: 0.5 },
      { width: '30vw', top: '54%', left: '52%', height: 3, rev: true, soft: true, diag: false, speed: 0.36 },
      { width: '17vw', top: '74%', left: '12%', height: 5, rev: false, soft: false, diag: true, speed: 0.48 },
    ],
    dots: [
      { size: 6, top: '18%', left: '36%', color: MAGENTA, speed: 0.3 },
      { size: 4, top: '40%', left: '78%', color: GOLD, speed: 0.28 },
      { size: 7, top: '60%', left: '26%', color: CYAN, speed: 0.32 },
      { size: 5, top: '82%', left: '66%', color: VIOLET, speed: 0.3 },
    ],
  },
};

export default function SplashDecor({ variant }: { variant: Variant }) {
  const cluster = clusters[variant];

  return (
    <div className="rc-decor" aria-hidden="true">
      <div className="rc-hue-drift">
        {cluster.blobs.map((blob, i) => (
          <div
            key={`blob-${i}`}
            className="rc-blob"
            data-speed={blob.speed}
            style={
              {
                width: blob.size,
                height: blob.size,
                top: blob.top,
                left: blob.left,
                opacity: blob.opacity,
                '--rc-color': blob.color,
              } as CSSProperties
            }
          />
        ))}
        {cluster.bars.map((bar, i) => (
          <div
            key={`bar-${i}`}
            className={`rc-bar${bar.rev ? ' rc-bar--rev' : ''}${bar.soft ? ' rc-bar--soft' : ''}${bar.diag ? ' rc-bar--diag' : ''}`}
            data-speed={bar.speed}
            style={{ width: bar.width, top: bar.top, left: bar.left, height: bar.height }}
          />
        ))}
        {cluster.dots.map((dot, i) => (
          <div
            key={`dot-${i}`}
            className="rc-dot"
            data-speed={dot.speed}
            style={{ width: dot.size, height: dot.size, top: dot.top, left: dot.left, background: dot.color }}
          />
        ))}
      </div>
    </div>
  );
}
