# RapClouds Landing Page — Extraction & Analysis

**Source of truth:** `/home/jordanc/html-portfolio/semi/rapclouds/landing.html` (23,269 bytes, 780 lines, last modified 2026-09-16)
**Live URL:** `https://portfolio.jordanchristley.com/semi/rapclouds/landing.html` (serves 200 from the portfolio origin on :8814)

## Important: the URL Jordan gave doesn't exist

- `https://portfolio.jordanchristley.com/semi/rapclouds-landing/` → **404 on the origin server** (verified directly on `127.0.0.1:8814`, bypassing Cloudflare Access). No file or directory named `rapclouds-landing` exists anywhere in `/home/jordanc/html-portfolio/`, and `html-portfolio` is not a git repo so there's no deleted-file history. No rewrite rule in the cloudflared ingress (tunnel is remote-managed; ingress is hostname→localhost only).
- Public curl/web_extract of that URL returns the **Cloudflare Access login** ("Portfolio - Semi Tier") — the whole `/semi/*` tier sits behind Access, so the page can't be fetched anonymously. The real page was found on the VM filesystem (this machine hosts the portfolio server).
- **Conclusion:** Jordan's URL is a slight misremember; the actual page is `/semi/rapclouds/landing.html`. Copy saved to `research/semi-rapclouds-landing.html`.

## Karaoke section

**There is none.** No "karaoke" text anywhere in `html-portfolio/`. Karaoke lives in the separate deprecated `karaoke-mvp` project (superseded by the karaoke tab in the main rapclouds repo, per its README). Nothing to carry over from this page for karaoke copy.

## Page structure (section-by-section)

1. **Hero** (`.hero`, full-viewport) — badge, h1, sub, primary CTA (anchor → `#order`), bouncing scroll hint
2. **Showcase** (`.showcase`) — section header + **horizontal snap-scroll gallery** of 10 word-cloud cards (1 "featured" at 400px/9:16, rest 320px/3:4)
3. **How It Works** (`.how-it-works`) — 3 numbered step cards (grid, auto-fit minmax(260px,1fr))
4. **Features** (`.features`) — "Why RapClouds" 4-item grid with emoji icons
5. **Lead Form** (`.lead-form-section`, `id="order"`) — order/interest form with success state
6. **Footer** — one line + gallery link

No header/nav. No JS libraries. No scroll-reveal, no parallax, no IntersectionObserver.

## Design system

- **Theme:** dark only, single `:root` token block (no light mode, no media queries for color)
- **Fonts:** Google Fonts — **Playfair Display** (700/800) for headings, **Inter** (300–700) for body. (No JetBrains Mono on this page, unlike the wider portfolio design system.)
- **CSS custom properties:**
  - `--bg: #0a0a0a` · `--bg-card: #141414` · `--bg-elevated: #1a1a1a`
  - `--text: #e0e0e0` · `--text-bright: #ffffff` · `--muted: #888` · `--muted-light: #aaa`
  - `--pink: #FF1493` · `--cyan: #00E5FF` · `--green: #22c55e`
  - `--border: #222` · `--border-light: #333`
  - Plus gold `#FFD700` used only as a feature-icon tint (not a token)
- **Signature treatments:** pink→cyan `linear-gradient(135deg)` with `background-clip: text` on emphasized words ("lyrics", "unique", "RapClouds"); radial-gradient pink/cyan glow on hero background; 3px pink→cyan gradient bar on top of the form card
- **Buttons:** solid pink `#FF1493`, hover `#e0107a` + `translateY(-2px)` + pink glow shadow
- **Radii:** 6px labels, 10–12px cards/buttons/inputs, 16–20px large cards/form, 24px badge, 50% step numbers
- **Responsive:** one breakpoint, `max-width: 768px` (form rows collapse to 1 col, gallery cards shrink, steps stack)

## Animation techniques

- CSS only — no JS animation libs, no scroll listeners at all
- `html { scroll-behavior: smooth }` for the `#order` anchor
- `@keyframes bounce` on the hero scroll hint (infinite Y oscillation, 2s)
- Hover transitions: cards `translateY(-6px)` + border color (0.3s); buttons translateY + glow (0.2s)
- Gallery uses native `scroll-snap-type: x mandatory` + custom thin scrollbar styling
- The only JS on the page is the form submit handler (no animation logic)

## Signup/order form (verbatim details)

- Section id: `order`; form id: `orderForm`; posts via `handleSubmit(event)`
- **Fields:** Name (required); Email *or* Phone (validated: at least one required, `alert('Please provide an email or phone number so we can reach you.')`); Format select: `t-shirt` (default) / `poster` / `displate` / `sticker` / `other`; Notes textarea
- **Submit button text:** `Send My Idea →` → becomes `Sending...`
- **Payload:** `{ name, email, phone, format, notes, timestamp: ISO, source: 'rapclouds_landing' }`
- **Endpoint:** `POST https://rapclouds-api.jordanchristley.com/api/submit` (Content-Type: application/json)
  - That hostname → `localhost:8099` → `form_server.py` in the same directory, which handles `/api/submit` and persists to `submissions.json` (append with `received_at`). Server also has `/api/rate`, `/api/feedback`, `/api/name`.
- **Fallback:** every submission also saved to `localStorage` key `rapclouds_submissions`; on fetch failure it still shows the success state
- **Success copy:** heading `We got it!` — "We'll review your notes and reach out within 24 hours with a preview concept."

## Word-cloud image URLs (relative — all local to the semi/rapclouds dir)

| Card | Image file | Exists on disk |
|---|---|---|
| The Headliner (featured) | `v8_illustration_forest_dark.png` | yes |
| Where It Started | `v4_illustration_dark.png` | yes |
| Words Become Lines | `v5_illustration_dark.png` | yes |
| Full Album Depth | `v7_illustration_album_dark.png` | yes |
| Emerald Edition | `v8_illustration_emerald_dark.png` | yes |
| Bangers Font | `v7_illustration_bangers_dark.png` | yes |
| Jungle Palette | `v8_illustration_jungle_dark.png` | yes |
| One Song, Deep Dive | `v7_illustration_letout_dark.png` | yes |
| Different Silhouette | `v7_displate_album_dark.png` | yes |
| Bebas Neue | `v7_illustration_bebasneue_dark.png` | yes |

Footer also links `v4_gallery.html` (full gallery page). All 10 images + gallery + `form_server.py` copied to `research/rapclouds-landing-assets/`. (The `semi/rapclouds/` dir holds ~90 more word-cloud PNGs — transparent and dark variants, v4–v8 — available at the same path if the UI app needs a richer gallery.)

## Files saved

- `research/semi-rapclouds-landing.html` — full raw HTML of the landing page
- `research/rapclouds-landing-assets/` — the 10 referenced PNGs, `v4_gallery.html`, `form_server.py`
- `research/rapclouds-landing-analysis.md` — this file

## Notes for the React rebuild

- Copy is single-page, section-based, no routing — trivially maps to a Home route
- The form is the only interactive surface; wire it to the same `/api/submit` endpoint (or to the rapclouds server) and keep the "email or phone" validation rule
- Images are large dark-mode PNGs (290KB–1.7MB) referenced by relative path; the React app needs them under `public/` or imported assets
- "Handcrafted from real lyrics" badge uses a 🔥 emoji; feature icons are emoji (🎯🎨👕✨) — Jordan's wider portfolio design system says avoid emoji-heavy cards, so the rebuild may want to swap these
