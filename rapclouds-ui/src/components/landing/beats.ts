export interface Beat {
  id: number;
  image: string;
  side: 'left' | 'right';
  bleed: number;
  speed: number;
  float: number;
  headline: string;
  body: string;
  delay: number;
}

export const beats: Beat[] = [
  {
    id: 1,
    image: 'v8_illustration_forest_dark',
    side: 'left',
    bleed: -8,
    speed: 0.22,
    float: 7,
    headline: 'The Headliner',
    body: 'A whole album pressed into one silhouette. Every bar, every hook, every ad-lib in a single image.',
    delay: 0,
  },
  {
    id: 2,
    image: 'v7_illustration_letout_dark',
    side: 'right',
    bleed: -10,
    speed: 0.28,
    float: 7.8,
    headline: 'One song, deep dive',
    body: 'Give us a single track and we will give you back every phrase that matters in it.',
    delay: 120,
  },
  {
    id: 3,
    image: 'v7_illustration_album_dark',
    side: 'left',
    bleed: -6,
    speed: 0.18,
    float: 6.4,
    headline: 'Full album depth',
    body: 'Deep cuts, hooks, and the lines you whisper in the car. Nothing left out.',
    delay: 240,
  },
  {
    id: 4,
    image: 'v8_illustration_jungle_dark',
    side: 'right',
    bleed: -12,
    speed: 0.32,
    float: 7.4,
    headline: 'Jungle palette',
    body: 'Color pulled straight from the artwork. The mood of the record, in every stroke.',
    delay: 0,
  },
  {
    id: 5,
    image: 'v7_illustration_bangers_dark',
    side: 'left',
    bleed: -8,
    speed: 0.25,
    float: 7,
    headline: 'Bangers only',
    body: 'Loud fonts for loud records. The chorus never looked this good.',
    delay: 120,
  },
  {
    id: 6,
    image: 'illustration_Life_Sentence_archivoblack_1200px_dark',
    side: 'right',
    bleed: -9,
    speed: 0.2,
    float: 8,
    headline: 'Life Sentence',
    body: 'The words that got you through. Now they hang on your wall.',
    delay: 240,
  },
  {
    id: 7,
    image: 'cartoon_Two_Six_archivoblack_1200px_dark',
    side: 'left',
    bleed: -10,
    speed: 0.3,
    float: 7.6,
    headline: 'Two Six',
    body: 'Cartoon energy, real lyrics. Built for the ones who never left the block.',
    delay: 0,
  },
  {
    id: 8,
    image: 'v7_cartoon_lyourz_dark',
    side: 'right',
    bleed: -7,
    speed: 0.24,
    float: 6.8,
    headline: 'Your turn',
    body: 'Any song. Any artist. If it moved you, we can build it.',
    delay: 120,
  },
];
