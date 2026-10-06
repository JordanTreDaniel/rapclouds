# RapClouds Landing Page — Build Spec

Authoritative spec for the rapclouds landing page rebuild. Spec only — do not build from this document without Jordan's go-ahead.

| | |
|---|---|
| Workspace | `/home/jordanc/workspace/rapclouds` |
| UI app | `rapclouds-ui/` (Vite + React 19 + TS strict + Tailwind) |
| Backend | `rapclouds-ui/server/main.py` (FastAPI; serves `dist/` via SPA catch-all; `public/` baked into `dist/` at build) |
| Branch | `feat/landing-page` |
| Brand source | `brand/rapclouds-logo-lyric-lovers.png`, `brand/rapclouds-alphabet-rainbow.png` |
| Prior analysis | `research/rapclouds-landing-analysis.md` |

## 1. Product goals (non-negotiable)

| # | Goal |
|---|---|
| 1 | Landing page is the new HOME of the UI at `rapclouds.jordanchristley.com`. `/` = Landing. Word cloud generator moves to `/create`. `/karaoke` and `/admin` stay. |
| 2 | The landing page must AMAZE: colorful splash/brush strokes spilling out of darkness; rainbow-adjacent palette (NOT literal ROYGBIV — the chrome-multicolor look of the brand logo: magenta/pink, orange, gold, cyan, blue, violet on near-black). |
| 3 | Word-cloud images are the star: left/right/center as the user scrolls, partially off-screen, falling in + zooming, parallax at different scroll speeds. |
| 4 | Copy/CTA strategy: page speaks as if the product ALREADY exists ("Order Now", "Wear your favorite songs"). The Order Now button leads to a signup form (email + intent: shirt/art vs karaoke). After submit, user lands on `/welcome` — honest "you are early, launching soon" energy. |
| 5 | Karaoke is suggested UP FRONT with the art ("Wear your favorite songs or get tested on them") — a two-path value card early in the page — then gets its own full section mid/bottom with karaoke screenshots ("Pick a song. Rap it. Get graded." RapCheck). |
| 6 | Email capture is simple and agent-accessible: FastAPI `POST /api/signup` writes one JSON file per signup to `/opt/rapclouds/data/signups/` on the VM (filename: `<iso-ts>_<intent>_<email-slug>.json`) PLUS appends to `/opt/rapclouds/data/signups/signups.jsonl` for easy bulk reads. No database. Validate email, dedupe repeated emails gracefully (still return success). |

Hard constraints: no emoji anywhere (copy or code — use CSS/SVG accents), no new npm dependencies (vanilla JS parallax + IntersectionObserver — no GSAP/framer-motion), TypeScript strict, no code comments in new source, hero image loads eagerly / everything else `loading="lazy"`, total landing WebP payload target < 2MB.

## 2. Route + nav changes

### 2.1 Routes (`rapclouds-ui/src/App.tsx`)

| Path | Component | Header? | Notes |
|---|---|---|---|
| `/` | `Landing` (new) | `LandingHeader` (new) | Marketing page; full-viewport hero, no 64px app-shell header |
| `/create` | `WordCloud` (existing) | `Header` (existing) | Word cloud generator |
| `/karaoke` | `Karaoke` (existing) | `Header` | Unchanged |
| `/admin` | `Admin` (existing) | `Header` | Unchanged |
| `/welcome` | `Welcome` (new) | none | Coming-soon confirmation page |

Implementation notes:

- `App.tsx` restructures: the current `.app-shell` grid (64px header + content, `overflow: hidden`) currently wraps ALL routes. It must NOT wrap Landing/Welcome — the landing page is a normal scrolling document (the `overflow: hidden` would kill scroll animations). Route-conditional shell: render `Landing`/`Welcome` outside `.app-shell`; keep `.app-shell` + `Header` for `/create`, `/karaoke`, `/admin` via nested layout routes or conditional wrapper.
- `GenerationProvider` still wraps everything (karaoke/word-cloud need it; landing does not touch it but keeping the provider global avoids prop drilling changes).
- WordCloud page component file stays `src/pages/WordCloud.tsx`; only the route path changes to `/create`.

### 2.2 `src/components/LandingHeader.tsx`

| Element | Spec |
|---|---|
| Bar | Fixed, full width, transparent at top of `/`; on scroll > 40px, background `rgba(8,8,10,0.85)` + `backdrop-filter: blur(12px)` + 1px bottom border `rgba(255,255,255,0.08)`. Height 64px (matches app header). |
| Logo | `public/brand/rapclouds-logo-lyric-lovers.png`, height ~40px, object-fit contain, links to `/`. Alt: `RapClouds` |
| Nav links | `Create` (to `/create`), `Karaoke` (to `/karaoke`), `Order Now` (to `/#order`). Max-width 768px hide the text links, show only logo + Order Now. |
| Order Now button | Small variant of the primary rainbow button (height 36px, font-size 0.85rem). |
| App `Header.tsx` changes | "Word Cloud" NavLink label stays "Word Cloud" but `to="/create"`. Everything else unchanged. |

### 2.3 `index.html`

| Field | Value |
|---|---|
| `<title>` | `RapClouds — Wear the lyrics that shaped you` |
| Meta description | `Custom word-cloud art and apparel built from the lyrics that shaped you. Wear your favorite songs — or get tested on them with RapClouds Karaoke.` |
| OG title | `RapClouds — Wear the lyrics that shaped you` |
| OG description | Same as meta description |
| OG image | `/brand/rapclouds-logo-lyric-lovers.png` |
| OG type | `website` |
| OG url | `https://rapclouds.jordanchristley.com/` |
| Twitter card | `summary_large_image` |
| Favicon | keep `/favicon.svg`; swap to a rainbow "R" variant if time allows (non-blocking) |
| Google Fonts | Add **Montserrat** `wght@400;500;700;900` to the existing link. Keep existing families for app routes (Playfair Display, Inter, Bebas Neue) — the app screens still use them; Landing uses Montserrat only. Preconnects already present. |
| Body default | Montserrat 400 as fallback font-family for landing pages; app pages keep their Tailwind/Inter defaults (no global body font override that could affect app routes). |

## 3. Design tokens

Define in a landing-scoped CSS block (e.g. `src/components/landing/landing.css` imported by `Landing.tsx`, or a `<style>` block in `Landing.tsx` following the existing App.tsx pattern — prefer a real CSS file since landing CSS is large). All hexes grounded against `brand/rapclouds-logo-lyric-lovers.png` + `brand/rapclouds-alphabet-rainbow.png` (chrome-multicolor brush script lettering on pure black).

### 3.1 Core tokens (`:root` scoped under a `.landing` class)

| Token | Hex / value | Role |
|---|---|---|
| `--bg` | `#050507` | Page background (near-black, slight blue lift vs pure black) |
| `--bg-card` | `#0d0d12` | Card surfaces |
| `--bg-elevated` | `#14141c` | Hovered/raised surfaces |
| `--text` | `#e6e6ec` | Body text |
| `--text-bright` | `#ffffff` | Headings |
| `--muted` | `#8b8b99` | Secondary text |
| `--border` | `rgba(255,255,255,0.08)` | Default border |
| `--border-light` | `rgba(255,255,255,0.16)` | Hover border |

### 3.2 Chrome-rainbow palette (from brand imagery)

| Token | Hex | Notes |
|---|---|---|
| `--rc-magenta` | `#E91E8C` | Dominant hot pink/magenta in logo strokes |
| `--rc-pink` | `#FF4DA6` | Lighter pink highlight |
| `--rc-red` | `#F2385A` | Red-orange stroke tone |
| `--rc-orange` | `#FF6B35` | Orange stroke |
| `--rc-gold` | `#FFC145` | Gold/amber |
| `--rc-cyan` | `#3EE8E0` | Teal/cyan stroke (very prominent in alphabet) |
| `--rc-blue` | `#3E6BFF` | Royal blue |
| `--rc-violet` | `#8B5CF6` | Violet/purple stroke |

### 3.3 Gradient tokens

| Token | Value | Use |
|---|---|---|
| `--grad-chrome` | `linear-gradient(100deg, #E91E8C 0%, #F2385A 16%, #FF6B35 32%, #FFC145 48%, #3EE8E0 66%, #3E6BFF 84%, #8B5CF6 100%)` | Primary chrome ramp — headings, bars, logo accents |
| `--grad-chrome-rev` | reverse of above | Alternate bars so two accents don't match |
| `--grad-chrome-slow` | same stops, `background-size: 300% 100%` | Animated gradient text (see 3.6) |
| `--grad-btn` | `linear-gradient(100deg, #E91E8C, #FF6B35 35%, #3EE8E0 75%, #3E6BFF)` | Primary "Order Now" button |
| `--grad-btn-hover` | `linear-gradient(100deg, #FF4DA6, #FF8A5C 35%, #6FF2EA 75%, #6B8CFF)` | Button hover |

### 3.4 Utilities

| Class | Spec |
|---|---|
| `.rc-gradient-text` | `background-image: var(--grad-chrome)`; `background-size: 100% 100%`; `-webkit-background-clip: text`; `background-clip: text`; `-webkit-text-fill-color: transparent`; `color: transparent` |
| `.rc-gradient-text-anim` | As above but `background-size: 300% 100%`; `animation: rc-hue-slide 8s linear infinite` (keyframe: `background-position: 0% 0% → 300% 0%`). Slow chrome shimmer on emphasized hero words only — not every heading. |
| `.rc-gradient-text-static` | No animation; for most headings — keeps paint cost low |

### 3.5 Splash / brush-stroke treatments (CSS-only, no images)

| Element | Spec |
|---|---|
| Blob (`.rc-blob`) | Absolutely positioned `div` (decorative, `aria-hidden="true"`), `border-radius: 50%`, `background: radial-gradient(circle, <color> 0%, transparent 70%)`, `filter: blur(80px)`, `opacity: 0.35–0.5`, sized 300–700px, `pointer-events: none`, `z-index: 0`. 3–6 blobs per hero/section background, each a different palette color (magenta, cyan, gold, violet). |
| Skewed bar (`.rc-bar`) | Absolutely positioned, height 3–6px, `background: var(--grad-chrome)`, `transform: skewX(-24deg)` (or rotate ~-8deg for diagonal spill), `filter: blur(0.5px)`, `opacity: 0.7`, widths 15–40vw. 4–8 bars per page section, staggered rotations (-2deg to -12deg) so they read as brush spatter, not a rule line. Some `filter: blur(6px)` for depth-of-field. |
| Dot accents (`.rc-dot`) | 4–10px circles, gradient-filled or solid palette colors, scattered near blobs — sparse, max 8 per viewport-height. |
| Hue-drift (`.rc-hue-drift`) | Decorative wrapper: `animation: rc-drift 18s ease-in-out infinite alternate` moving `transform: translate3d(±20px, ±12px, 0) rotate(±3deg)`. Slow ambient motion on blob/bar clusters. Disabled under reduced motion. |
| Layering rule | All decorative layers `position: absolute`, `z-index: 0`, `pointer-events: none`; section content `position: relative; z-index: 1`. Page body background stays `--bg`; decorations never sit under text at opacity > 0.5. |

### 3.6 Buttons

| Variant | Spec |
|---|---|
| `.rc-btn-primary` (Order Now) | `background-image: var(--grad-btn)` (animated `background-size: 200% 100%`, `rc-hue-slide 6s linear infinite` for a living chrome look — subtle, optional), `color: #fff`, `font-weight: 700`, `border-radius: 999px`, `padding: 0.95em 2.2em`, `font-size: 1rem`, `letter-spacing: 0.02em`, `box-shadow: 0 8px 30px rgba(233,30,140,0.35)`. Hover: `var(--grad-btn-hover)`, `transform: translateY(-2px)`, glow `0 12px 40px rgba(62,232,224,0.3)`. Active: `translateY(0)`. Transition 0.2s ease-out. |
| `.rc-btn-secondary` | Transparent bg, 1.5px border `rgba(255,255,255,0.25)`, text `--text-bright`, same radius/padding. Hover: border + text take chrome gradient text treatment, bg `rgba(255,255,255,0.05)`. |
| `.rc-btn-primary-lg` | Primary at `font-size: 1.15rem`, `padding: 1.1em 2.6em` — hero CTA. |

### 3.7 Cards

| Token | Spec |
|---|---|
| `.rc-card` | `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: 20px`, `padding: 32px`. Hover: `border-color: var(--border-light)`, `transform: translateY(-4px)`, transition 0.3s. |
| Gradient top edge | 3px `var(--grad-chrome)` bar via `::before` on featured cards (dual-path card, karaoke card). |

## 4. Animation choreography

### 4.1 Shared mechanics

| System | Spec |
|---|---|
| Reveal (`useReveal`) | IntersectionObserver, `threshold: 0.15`, `rootMargin: '0px 0px -10% 0px'`. On intersect: add class `.rc-revealed`; unobserve after firing. Initial state: `opacity: 0; transform: translateY(80px) scale(0.92)`. Revealed state: `opacity: 1; transform: none`. Transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)` (ease-out, ~0.8s). Per-beat `transition-delay` 0 / 120 / 240ms via inline style for staggered pairs. |
| Fall-in + zoom | Same mechanism as reveal, but image beats use larger initial translateY (60–100px per beat) and initial `scale(0.92)` — reads as "falling in + zooming". |
| Parallax (`useParallax`) | Elements carry `data-speed="0.1"`–`0.35` (decorative blobs lower, gallery images mid, foreground bars higher). One `scroll` listener (passive) on `window`, rAF-throttled: for each registered element, compute `(window.scrollY - element.dataset.origin) * speed` and apply `transform: translate3d(0, Ypx, 0)`. `origin` captured on mount via `getBoundingClientRect().top + window.scrollY`. Only transforms touched in the scroll handler (no layout reads in hot path — batch reads first, then writes). |
| Idle float | Gallery images additionally get `animation: rc-float 7s ease-in-out infinite alternate` — `translate3d(0, -10px, 0)` at rest. Parallax writes the outer wrapper's transform; float runs on the inner `<img>` element so the two never fight over one transform. 7s (within 6–8s target); alternate beats get 7.8s / 6.4s durations so they de-sync. |
| Reduced motion | `@media (prefers-reduced-motion: reduce)`: all reveal initial states become visible immediately (no transition), parallax hook early-returns (no scroll handler), `rc-float` / `rc-hue-drift` / gradient-slide animations set to `none`. |

### 4.2 Beat-by-beat choreography (gallery story beats)

Image placement per beat: `side` = which side the image sits on; `offset%` = how far it bleeds off that viewport edge. Text sits opposite the image, centered in the remaining column.

| Beat | Image (all `public/gallery/webp/<name>.webp`) | Side | Off-screen bleed | Reveal | Parallax `data-speed` | Float | Text block |
|---|---|---|---|---|---|---|---|
| 1 | `v8_illustration_forest_dark.webp` | Left | -8% left | translateY(90px) scale(0.92), delay 0 | 0.22 | 7s | Headline right |
| 2 | `v7_illustration_letout_dark.webp` | Right | -10% right | delay 0 | 0.28 | 7.8s | Left |
| 3 | `v7_illustration_album_dark.webp` | Left | -6% left | delay 0 | 0.18 | 6.4s | Right |
| 4 | `v8_illustration_jungle_dark.webp` | Right | -12% right | delay 0 | 0.32 | 7.4s | Left |
| 5 | `v7_illustration_bangers_dark.webp` | Left | -8% left | delay 0 | 0.25 | 7s | Right |
| 6 | `illustration_Life_Sentence_archivoblack_1200px_dark.webp` | Right | -9% right | delay 0 | 0.20 | 8s | Left |
| 7 | `cartoon_Two_Six_archivoblack_1200px_dark.webp` | Left | -10% left | delay 0 | 0.30 | 7.6s | Right |
| 8 | `v7_cartoon_lyourz_dark.webp` | Right | -7% right | delay 0 | 0.24 | 6.8s | Left |

Accent bars + blobs around each beat carry `data-speed` 0.35–0.5 (foreground) or 0.08–0.12 (background) to build depth. All gallery images `loading="lazy"` + `decoding="async"` + width/height attrs (or aspect-ratio box) to prevent CLS.

### 4.3 Per-section animation summary

| Section | Animation |
|---|---|
| Hero | Eager hero image + logo; blobs/bars `rc-hue-drift`; headline words with `.rc-gradient-text-anim`; scroll-hint chevron `bounce` 2s infinite (CSS); no parallax on hero image (it must paint instantly) |
| DualPath | Both cards reveal staggered 0 / 160ms; gradient top edge static |
| Gallery beats | Table 4.2 |
| Karaoke | Screenshots reveal with zoom; karaoke-main parallax 0.15; playing shot 0.25; RapCheck badge `rc-float` |
| Signup | Form card reveals translateY(60px); blobs behind drift |
| Footer | Minimal; no parallax |

## 5. Section-by-section copy (exact)

All copy final as written. No emoji. Emphasis words use `.rc-gradient-text` unless noted.

### 5.1 Hero (full viewport, id: `top`)

| Element | Copy |
|---|---|
| Logo image | `brand/rapclouds-logo-lyric-lovers.png` (displayed ~min(420px, 70vw) wide, centered, eager load, fetchpriority high) |
| H1 | Wear the lyrics that shaped you |
| Sub | Every RapClouds piece is built from the words that moved you. Real lyrics. Your favorite artist. Your words, wearable. |
| Primary CTA | Order Now → `/#order` |
| Secondary CTA | See the gallery → `#gallery` |
| Scroll hint | small chevron SVG + no text (or `Scroll` in 0.7rem muted letter-spaced caps) |

### 5.2 Dual-path value card (immediately after hero, id: `paths`)

Section eyebrow: `Two ways in`

Heading: `Wear your favorite songs or get tested on them`

| Card | Icon (inline SVG) | Title | Body | CTA |
|---|---|---|---|---|
| Path 1 | Brush/t-shirt outline | Wear the art | Custom word-cloud apparel and prints built from any song you love. The words are the art. Pick a song, pick a look, wear it. | Order Now → `/#order` |
| Path 2 | Microphone outline | Take the test | RapClouds Karaoke picks a song, drops the beat, and grades your run word by word. RapCheck tells you how you really did. | Try Karaoke → `/karaoke` |

### 5.3 Gallery story beats (id: `gallery`)

Section intro (above beat 1):

| Element | Copy |
|---|---|
| Eyebrow | The gallery |
| H2 | Every cloud tells a song |
| Sub | Hundreds of lyrics, one silhouette. This is what happens when we turn an album into art. |

Per-beat copy (headline + body), in scroll order:

| Beat | Headline | Body |
|---|---|---|
| 1 | The Headliner | A whole album pressed into one silhouette. Every bar, every hook, every ad-lib in a single image. |
| 2 | One song, deep dive | Give us a single track and we will give you back every phrase that matters in it. |
| 3 | Full album depth | Deep cuts, hooks, and the lines you whisper in the car. Nothing left out. |
| 4 | Jungle palette | Color pulled straight from the artwork. The mood of the record, in every stroke. |
| 5 | Bangers only | Loud fonts for loud records. The chorus never looked this good. |
| 6 | Life Sentence | The words that got you through. Now they hang on your wall. |
| 7 | Two Six | Cartoon energy, real lyrics. Built for the ones who never left the block. |
| 8 | Your turn | Any song. Any artist. If it moved you, we can build it. |

### 5.4 Karaoke section (id: `karaoke`)

| Element | Copy |
|---|---|
| Eyebrow | RapClouds Karaoke |
| H2 | Pick a song. Rap it. Get graded. |
| Body | Karaoke is live in the app. Choose a track, spit the verse, and RapCheck scores you word by word — accuracy, timing, the works. Think you know the words? Prove it. |
| Feature bullets | Word-by-word grading · Flow detection · Letter grades from S to F · Practice clips from the densest bars |
| Screenshot 1 | `public/landing/karaoke-main.png` — caption: `The setup. Pick your track and go.` |
| Screenshot 2 | `public/landing/karaoke-playing.png` — caption: `The run. RapCheck is watching every word.` |
| CTA | Open Karaoke → `/karaoke` |

### 5.5 Signup / Order section (id: `order`)

| Element | Copy |
|---|---|
| Eyebrow | Ordering |
| H2 | Order your first piece |
| Body | RapClouds is opening up. Drop your email and tell us what you are here for — apparel and art, or the karaoke. We will reach out the moment orders go live. |
| Field: email | Label `Email`, placeholder `you@example.com`, required |
| Field: intent | Label `I am here for`, two radio pills: `Shirts and art` (default) and `Karaoke` |
| Submit button | `Order Now` (primary rainbow button; shows `Sending...` while in flight) |
| Microcopy under form | Early access only. No spam, just the drop. |
| Error copy (inline, not alert) | `That email does not look right. Try again?` (invalid) / `Something went wrong. Try again in a second.` (network) |
| Success state | Heading `You are on the list.` Body: `Check your inbox for the confirmation. Orders open soon — you will hear from us first.` (then auto-navigate to `/welcome` after ~800ms, or immediate if the user prefers — spec: navigate immediately on 2xx.) |

### 5.6 `/welcome` page (standalone, no landing header)

| Element | Copy |
|---|---|
| Logo | brand logo, centered, ~280px |
| H1 | You are early. Perfect. |
| Body | RapClouds launches soon. Your spot is saved — shirts, art, and karaoke are all in the works. Watch your inbox. |
| Secondary link | Back to the gallery → `/` |
| Note line | Want to try the generator while you wait? It is live at /create. (as a subtle text link to `/create`) |

### 5.7 Footer (`LandingFooter`)

| Element | Copy |
|---|---|
| Wordmark | RapClouds (gradient text, small) |
| Tagline | Wear the lyrics that shaped you. |
| Links | Create · Karaoke · Order |
| Legal line | Built for lyric lovers. All artwork generated from user-provided lyrics. |

## 6. Asset plan

| Asset | Path | Loading | Notes |
|---|---|---|---|
| Brand logo | `public/brand/rapclouds-logo-lyric-lovers.png` | eager (header + hero) | Copy from `brand/` into `rapclouds-ui/public/brand/` (check — may already exist in public; `public/` currently has favicon.svg, gallery/, icons.svg, so brand/ must be copied) |
| Alphabet (optional accent) | `public/brand/rapclouds-alphabet-rainbow.png` | lazy | Only if used as a decorative strip (e.g. cropped single letters behind karaoke heading). Otherwise skip — keeps payload down |
| Karaoke main | `public/landing/karaoke-main.png` | lazy | Copy from `research/karaoke-shots/karaoke-main.png` |
| Karaoke playing | `public/landing/karaoke-playing.png` | lazy | Copy from `research/karaoke-shots/karaoke-playing.png` |
| Gallery WebP (8 beats) | `public/gallery/webp/<same-filename>.webp` | lazy | Generated in parallel by another agent: same filenames as the PNGs in `public/gallery/`, `.webp` extension, 900px and 400px width variants. Landing uses the 900px variant via `<picture>`/srcset. |

### 6.1 Curated image set (8 beats, per §4.2)

| # | Base filename (PNG in `public/gallery/`) |
|---|---|
| 1 | `v8_illustration_forest_dark.png` |
| 2 | `v7_illustration_letout_dark.png` |
| 3 | `v7_illustration_album_dark.png` |
| 4 | `v8_illustration_jungle_dark.png` |
| 5 | `v7_illustration_bangers_dark.png` |
| 6 | `illustration_Life_Sentence_archivoblack_1200px_dark.png` |
| 7 | `cartoon_Two_Six_archivoblack_1200px_dark.png` |
| 8 | `v7_cartoon_lyourz_dark.png` |

Fallback: if a WebP variant is missing at build time, `srcset` falls back to the PNG already in `public/gallery/`. Do NOT block deploy on WebP generation — the PNGs are always available.

### 6.2 srcset pattern (per gallery image)

```html
<img
  src="/gallery/webp/<name>.webp"
  srcset="/gallery/webp/<name>_400.webp 400w, /gallery/webp/<name>.webp 900w"
  sizes="(max-width: 768px) 90vw, 45vw"
  loading="lazy"
  decoding="async"
  width="900"
  height="1200"
  alt="Word cloud art from J. Cole lyrics"
/>
```

Exact webp filenames must match whatever the parallel agent emits (confirm `public/gallery/webp/` listing before wiring srcset; if the naming differs, adapt — the PNG fallback pattern above is the safety net).

### 6.3 Payload budget

| Item | Budget |
|---|---|
| 8 gallery WebP @900px | ~1.2MB total (target ≤150KB each) |
| Karaoke PNGs ×2 | ~600KB total (convert to WebP later if over budget — non-blocking) |
| Brand logo | ~200KB (one copy, browser-cached across header/hero) |
| Total first-scroll-relevant | < 2MB; only hero-relevant assets eager |

## 7. Component / file plan

| File | Contents |
|---|---|
| `src/pages/Landing.tsx` | Page composition: LandingHeader, Hero, DualPath, GalleryBeats (loop over beat data), KaraokeSection, SignupSection, LandingFooter. Owns landing CSS import. |
| `src/pages/Welcome.tsx` | Standalone coming-soon page (§5.6). |
| `src/components/LandingHeader.tsx` | §2.2 |
| `src/components/landing/Hero.tsx` | §5.1 + hero splash blobs/bars |
| `src/components/landing/DualPath.tsx` | §5.2 two-path cards |
| `src/components/landing/GalleryBeat.tsx` | One beat: image + text; props: image, side, bleed%, speed, float duration, headline, body, reveal delay. |
| `src/components/landing/KaraokeSection.tsx` | §5.4 |
| `src/components/landing/SignupSection.tsx` | §5.5 + form state machine (idle/loading/success/error) + POST /api/signup |
| `src/components/landing/LandingFooter.tsx` | §5.7 |
| `src/components/landing/SplashDecor.tsx` | Reusable blob/bar/dot cluster; props: palette set, seed/variant, speeds |
| `src/components/landing/landing.css` | All tokens + utilities (§3) + keyframes + reduced-motion overrides |
| `src/hooks/useReveal.ts` | IntersectionObserver reveal (§4.1). Returns a ref callback or `useEffect` observing `[data-reveal]` within a root ref. |
| `src/hooks/useParallax.ts` | rAF-throttled scroll parallax over `[data-speed]` elements within a root ref (§4.1). |
| `src/components/landing/beats.ts` | Data module: the 8-beat array (image, side, bleed, speed, float, headline, body, delay). Keeps GalleryBeat dumb. |
| `App.tsx` | Route restructure (§2.1) |
| `Header.tsx` | Word Cloud link → `/create` |
| `index.html` | §2.3 |
| `server/main.py` | Add `POST /api/signup` + `/api/signup` Pydantic model (§8) |

## 8. Backend contract — `POST /api/signup`

### 8.1 Request

`Content-Type: application/json`

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | yes | Trimmed, lowercased server-side. Validated with a pragmatic regex (one `@`, dot in domain, no spaces, ≤254 chars). Invalid → 422. |
| `intent` | string | yes | Must be one of `shirt-art`, `karaoke`. Else → 422. |

Example:

```json
{ "email": "fan@example.com", "intent": "shirt-art" }
```

### 8.2 Response

Success (200) — always 200 for valid payloads, even if the email is a duplicate:

```json
{ "ok": true, "duplicate": false }
```

Duplicate email (found in `signups.jsonl`, case-insensitive): still 200, `"duplicate": true`, no new file written.

Validation failure (422): FastAPI/Pydantic default shape (`detail` array), or a minimal `{"ok": false, "error": "invalid email"}` — pick one and keep frontend error mapping consistent (frontend treats any non-2xx as the inline error state).

### 8.3 File write logic (`server/main.py`)

| Step | Detail |
|---|---|
| Data dir | `SIGNUPS_DIR = os.environ.get("RAPCLOUDS_SIGNUPS_DIR", "/opt/rapclouds/data/signups")` — env-overridable so local dev can point at a temp dir (default local: same path may not exist; `os.makedirs(SIGNUPS_DIR, exist_ok=True)` on startup + on write) |
| Timestamp | `ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")` |
| Slug | `slug = re.sub(r"[^a-z0-9]+", "-", email.lower()).strip("-")` truncated to 64 chars |
| Filename | `f"{ts}_{intent}_{slug}.json"` |
| Record body | `{"email": ..., "intent": ..., "received_at": iso-ts, "source": "rapclouds_landing", "user_agent": <header or null>}` |
| Write file | `asyncio.to_thread(json.dump, ...)` or run sync write in executor — must not block the event loop; open with `encoding="utf-8"` |
| Append JSONL | Same record (plus `"file": <filename>`) appended as one line to `SIGNUPS_DIR/signups.jsonl`, flush after write |
| Dedupe check | Before writing, read `signups.jsonl` (if present), build a set of lowercased emails. O(n) per request is fine at this scale. If email in set → return `duplicate: true`, skip both writes |
| Concurrency | Append-only writes with a module-level `asyncio.Lock` around read+append+write to avoid interleaved lines |
| Errors | Write failures log + still return 200 with `ok: true`? NO — return 500; frontend shows the inline network error. Data loss must be visible. (Exception: dedupe logic errors → treat as not duplicate and write anyway.) |
| SPA catch-all note | The catch-all `@app.get("/{full_path:path}")` is registered LAST in main.py. The new `@app.post("/api/signup")` must be defined with the other `/api/*` routes, BEFORE the catch-all section. (POST to the catch-all path would otherwise fall through oddly; GET catch-all would also serve index.html for `/api/signup` GET — there is no GET route, so it would return the SPA HTML; acceptable, but register the POST route in the API section for clarity.) |

### 8.4 Where data lives on the VM

| Item | Path |
|---|---|
| Per-signup files | `/opt/rapclouds/data/signups/<ts>_<intent>_<slug>.json` |
| Bulk-readable log | `/opt/rapclouds/data/signups/signups.jsonl` (one JSON object per line) |
| Agent read pattern | `ssh -i ~/.ssh/google_compute_engine jordanc@34.24.37.16 'cat /opt/rapclouds/data/signups/signups.jsonl'` or `ls` the directory for individual files |

## 9. Deploy + verification

### 9.1 Branch + build

| Step | Command / action |
|---|---|
| 1. Branch | `git checkout -b feat/landing-page` in `/home/jordanc/workspace/rapclouds` (or rapclouds-ui repo if it is its own git repo — check `git -C rapclouds-ui rev-parse --show-toplevel` first) |
| 2. Local build | `cd rapclouds-ui && npx vite build` — may hang in sandbox. If it does: build on the VM instead (step 4b) |
| 3. WebP assets | Confirm `public/gallery/webp/` exists (parallel agent). If not, proceed with PNG fallbacks |
| 4a. VM build (fallback) | `ssh -i ~/.ssh/google_compute_engine jordanc@34.24.37.16` → `cd /opt/rapclouds/rapclouds-ui && npm ci && npm run build` (after rsync of src) |
| 4b. rsync src | `rsync -av --delete rapclouds-ui/src/ rapclouds-ui/public/ rapclouds-ui/index.html rapclouds-ui/package.json rapclouds-ui/package-lock.json rapclouds-ui/vite.config.ts rapclouds-ui/tsconfig*.json rapclouds-ui/server/main.py jordanc@34.24.37.16:/opt/rapclouds/rapclouds-ui/` — careful with `--delete` on server/ (do NOT delete .env or server-side data on the VM; exclude `server/.env`, `node_modules`, `dist`) |
| 4c. rsync dist | `rsync -av rapclouds-ui/dist/ jordanc@34.24.37.16:/opt/rapclouds/rapclouds-ui/dist/` (if built locally) |
| 5. Signup dir on VM | `ssh ... 'sudo mkdir -p /opt/rapclouds/data/signups && sudo chown jordanc:jordanc /opt/rapclouds/data/signups'` |
| 6. Restart | `ssh ... 'sudo systemctl restart rapclouds'` |

### 9.2 Verification checklist

| # | Check | Pass criteria |
|---|---|---|
| 1 | `curl -s -o /dev/null -w "%{http_code}" https://rapclouds.jordanchristley.com/` | `200` |
| 2 | `curl -s https://rapclouds.jordanchristley.com/ | head -c 2000` | Contains the landing `<title>` `RapClouds — Wear the lyrics that shaped you` |
| 3 | `curl -s -o /dev/null -w "%{http_code}" https://rapclouds.jordanchristley.com/create` | `200` (SPA catch-all serves index.html) |
| 4 | `curl -s -o /dev/null -w "%{http_code}" https://rapclouds.jordanchristley.com/welcome` | `200` |
| 5 | `curl -s -o /dev/null -w "%{http_code}" https://rapclouds.jordanchristley.com/karaoke` | `200` |
| 6 | Signup POST | `curl -s -X POST https://rapclouds.jordanchristley.com/api/signup -H 'Content-Type: application/json' -d '{"email":"deploy-test@example.com","intent":"shirt-art"}'` → `{"ok":true,"duplicate":false}` |
| 7 | Duplicate POST (same body again) | `{"ok":true,"duplicate":true}` |
| 8 | Invalid email POST | non-2xx |
| 9 | File on VM | `ssh ... 'ls /opt/rapclouds/data/signups/ && tail -2 /opt/rapclouds/data/signups/signups.jsonl'` → new JSON file + jsonl line matching the test email |
| 10 | Browser check | Load `/` — hero paints, no console errors, scroll reveals fire, `/create` generator still works, karaoke page loads |
| 11 | Reduced motion | DevTools emulation — page fully visible, no parallax jumpiness |

## 10. Constraints recap

| Constraint | Enforcement |
|---|---|
| No emoji | Code review pass over copy + JSX |
| No code comments | New files only; do not "fix" existing comments elsewhere |
| No new npm deps | Parallax + IO are vanilla TS hooks |
| TS strict | `npx tsc --noEmit` clean before build |
| Hero eager, rest lazy | Only hero `<img>` gets `loading="eager"`/`fetchpriority="high"`; all below-fold images `loading="lazy"` |
| Landing WebP payload < 2MB | Budget table §6.3; measure with `du -ch public/gallery/webp/*.webp` for the 8 used |
| No emojis in CSS either | Icons are inline SVG strokes, `currentColor` |

## 11. Open questions / risks (flagged for Jordan)

| # | Item | Risk / question |
|---|---|---|
| 1 | WebP filenames | Parallel agent emits 900px + 400px variants but exact naming (`<name>.webp` vs `<name>_900.webp`) is unconfirmed. Spec assumes `<name>.webp` = 900px and `<name>_400.webp` = 400px. Verify against `public/gallery/webp/` before wiring srcset; PNG fallback covers gaps. |
| 2 | Honest "Order Now" | Copy speaks as if product exists while `/welcome` admits it is launching soon. Jordan explicitly wants this tension — flagging once so the welcome copy carries the honesty weight. |
| 3 | App header on `/create` | WordCloud page keeps the current app Header (with J. Cole Off-Season art + export buttons). LandingHeader is marketing-only. Confirm the visual jump between landing (dark marketing) and `/create` (app chrome) is acceptable — likely yes, but worth one look in the browser. |
| 4 | Signup data dir permissions | `/opt/rapclouds/data/signups/` must be writable by the service user running `rapclouds` systemd unit. If the unit runs as root, fine; if not, chown step §9.1.5 covers it. |
| 5 | Dedupe read cost | `signups.jsonl` read on every request is fine to a few thousand signups. If it grows huge, move to a per-email index file later — out of scope now. |
| 6 | Logo watermarks | The brand PNGs from Canva show faint "Canva" watermarks. If Jordan has a clean export, swap the file at `public/brand/` — spec does not alter brand assets. |
| 7 | OG image size | Logo PNG may be large for OG scrapers (most cap ~5MB, fine) — non-blocking. |
| 8 | Local build hang | Known: `npx vite build` can hang in sandbox. VM build path is the fallback (§9.1.4a); ensure node_modules on VM matches lockfile (`npm ci`). |
