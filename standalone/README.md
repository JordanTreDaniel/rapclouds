# RapClouds Standalone — J. Cole The Fall-Off

Generate word cloud t-shirt designs from J. Cole's "The Fall-Off" lyrics.

## Quick Start

```bash
# Fetch all lyrics + generate clouds with default style
python3 run.py

# With a face mask image for shaped clouds
python3 run.py --mask masks/jcole_face.png

# Try different presets
python3 run.py --preset bold_red
python3 run.py --preset cole_world
python3 run.py --preset transparent_face

# Generate album-wide combined cloud
python3 run.py --album

# Just fetch lyrics (no image generation)
python3 run.py --lyrics-only

# Just generate clouds (lyrics already fetched)
python3 run.py --clouds-only --preset bold_red
```

## Presets

| Preset | Description |
|--------|-------------|
| `concert_bw` | Black background, white text — classic concert tee look |
| `bold_red` | Dark red background, red gradient text |
| `cole_world` | Blue palette on dark background |
| `transparent_face` | Transparent background, random colors — for printing on any shirt |
| `minimalist` | White background, black text — clean/minimal |

## Mask Images

For shaped clouds (J. Cole's face silhouette):
1. Find a high-contrast black & white photo of J. Cole
2. The white/bright areas become the "no words" zones
3. The dark areas get filled with words
4. Place mask PNGs in the `masks/` folder

Good mask characteristics:
- High contrast (pure black & white works best)
- Simple silhouette (face outline, not cluttered)
- Transparent background preferred (PNG with alpha)

## Settings (from original RapClouds app)

All the original RapClouds settings are available in `generate_cloud.py`:
- `width` / `height` — Image dimensions
- `backgroundColor` — Hex color for background
- `transparentBackground` — No background (for overlays)
- `minFontSize` / `maxFontSize` — Word size range
- `margin` — Space between words
- `preferHorizontal` — 0.0 (all vertical) to 1.0 (all horizontal)
- `repeat` — Fill entire canvas by repeating words
- `collocations` — Keep word pairs together
- `colorFromMask` — Color words based on mask image

## Files

```
standalone/
├── run.py              # Main entry point
├── fetch_lyrics.py     # Genius lyrics scraper
├── generate_cloud.py   # Word cloud generator (settings + presets)
├── viewer.html         # HTML gallery to browse results
├── lyrics/             # Scraped lyrics (one .txt per track)
├── masks/              # Face silhouette images for shaped clouds
├── output/             # Generated PNG word clouds
└── fonts/              # Custom .ttf fonts (optional)
```

## Integration with RapClouds

This standalone tool uses the same settings model as the full RapClouds stack:
- Same color system (custom colors, random, mask-derived)
- Same mask processing (brightness thresholds, edge detection)
- Same layout parameters (font sizes, margins, scaling)
- Same preset architecture

The original full-stack app required MongoDB + Cloudiny + Python service + Genius API.
This version needs zero external services.
