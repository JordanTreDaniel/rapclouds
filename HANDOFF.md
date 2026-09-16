# RapClouds — Session Handoff (Sep 16, 2026)

## What Was Built

RapClouds v6: word cloud portraits from song lyrics shaped by color images. Phrases flow as multiline sentences across color layers with collision detection.

### Scripts (in order of recommendation)

| Script | Purpose | Status |
|--------|---------|--------|
| `generate_layers_v6.py` | ★ BEST — Layer stacking + multiline phrases + collision detection | Production |
| `generate_layers_v5.py` | Layer stacking + phrase collocations (no multiline wrap) | Working |
| `generate_layers_v4.py` | Layer stacking + collision detection (no phrases) | Working |
| `phrase_detector.py` | Standalone phrase extraction with table output | Working |
| `generate_cloud.py` | Single-cloud generator (presets, colorFromMask) | Legacy |
| `ui_mockup.html` | Static HTML/CSS mockup of web app interface | Deployed |

### Wordcloud Fork

**Location:** `wordcloud_fork_repo/` (separate git repo, cloned from amueller/word_cloud)
**Branch:** `multiline-phrases` (1 commit ahead of upstream)
**Installed at:** `/home/jordanc/.hermes/hermes-agent/venv/lib/python3.11/site-packages/wordcloud/wordcloud.py`
**Backup:** Same directory, `wordcloud.py.bak`

**3 changes (8 lines added, 3 removed):**
1. `textbbox`: Remove `anchor='lt'` when word contains `\n` (PIL multiline limitation)
2. Orientation: Skip `ROTATE_90` for multiline tokens
3. Rotation retry: Skip rotation attempt for multiline tokens

**To reinstall the fork:**
```bash
cd ~/workspace/rapclouds/wordcloud_fork_repo
pip install -e . --no-deps
```

**To apply changes to a fresh wordcloud install:**
```bash
# The 3 patches are in wordcloud_fork_repo/wordcloud/wordcloud.py
# on the multiline-phrases branch
cd wordcloud_fork_repo && git diff master..multiline-phrases
```

### High-Res Masks

| Image | File | Dimensions | Best For |
|-------|------|-----------|----------|
| Face Illustration | `masks/jcole_face_illustration.jpg` | 800×1422 | Layer stacking (best portrait) |
| Displate | `masks/jcole_displate.jpg` | 857×1200 | Layer stacking (dense) |
| Cartoon | `masks/jcole_cartoon_portrait.jpg` | 900×900 | Layer stacking (square) |

### Lyrics

24 J. Cole tracks from The Fall-Off in `lyrics/`. Key songs:
- `Life_Sentence.txt` — samples DMX "How's It Going Down" (the love song)
- `Bombs_in_the_Ville.txt` — "lets stop playin in the middle"
- `WHO_TF_IZ_U.txt` — "will we survive the let-out" (most repeated phrase)

## How to Run

```bash
cd ~/workspace/rapclouds/standalone

# V6: Best results — layers + multiline phrases
python3 generate_layers_v6.py --mask masks/jcole_face_illustration.jpg --album --width 800

# V6 with custom settings
python3 generate_layers_v6.py --mask masks/jcole_displate.jpg --album \
  --width 1200 --clusters 7 --threshold 40 --min-words 3 --min-count 3

# Phrase detector (standalone)
python3 phrase_detector.py --lyrics lyrics/Life_Sentence.txt --min-words 3 --top 20

# Album phrase detection
python3 phrase_detector.py --lyrics-dir lyrics/ --min-words 3 --min-count 3 --csv phrases.csv
```

## Architecture

### v6 Pipeline
1. Load lyrics → clean → extract phrases (min 3 words, 2+ repeats)
2. Wrap long phrases (>5 words) at midpoint with `\n`
3. Build frequency dict (phrases + individual words at reduced frequency)
4. Load portrait → k-means → merge small clusters → sort by size
5. For each cluster (largest first):
   - Create cluster mask (RGB distance threshold)
   - Merge with cumulative occupancy bitmap (collision detection)
   - `generate_from_frequencies(freq)` — preserves `\n` in tokens
   - Rasterize occupancy from raw RGBA (before dark thresholding)
6. Stack layers with `alpha_composite`
7. Generate dark-background preview

### Key Insight
`generate_from_frequencies()` preserves newlines in tokens, while `generate(text)` strips them via `process_text()` regex. This is why v6 uses the former.

### Collision Detection
After each layer generates, its word pixels are rasterized into a cumulative occupancy bitmap. The next layer's mask merges with this bitmap via `np.maximum(cluster_mask, cumulative_occupancy)`. This prevents inter-layer overlap.

### Coverage
- Single-layer coverage plateaus ~50% (canvas fills up)
- `min_font_size=3` is the biggest density lever (2x words vs min_font=4)
- `max_font_size=100` adds ~4% coverage over 50
- Multiline phrases reduce density slightly (longer tokens = fewer placed)

## Git History

```
2920e98 Add wordcloud_fork_repo to gitignore
802b44c RapClouds v6: layer stacking + multiline phrases + collision detection
7850f2f Fork wordcloud for multiline phrase support + standalone phrase detector
99b1678 Standalone phrase detector
33e73c6 Add UI mockup for RapClouds v5 web interface
43104d1 RapClouds v5: layer stacking + phrase collocations
8666e1f RapClouds v4: layer stacking with collision detection
f9c014d Generalize scripts with argparse CLI arguments
5f99b2a Final commit: all scripts, outputs, and skill v3.0
```

## Notion

- **RapClouds Dev Tasks DB:** `4c409291-df06-47a7-a0db-3a25e36051c9`
- **Tasks created:**
  - "Build RapClouds v5 Web App - Full Stack" (High priority)
  - "RapClouds Portfolio Page - Technical + Cultural Excellence" (Medium)
- **Pages updated with progress comments:**
  - "Re-Making RapClouds 2025"
  - "RapClouds"
  - "RapClouds Revamp 2023"

## Portfolio

All images deployed to: `https://portfolio.jordanchristley.com/semi/rapclouds/`
- `v4_gallery.html` — gallery with v4, v5, v6 results
- `ui_mockup.html` — web app interface mockup
- `v6_illustration.png`, `v6_displate.png`, `v6_cartoon.png` — v6 results
- `life_sentence_multiline.png` — single-song multiline test

## What's Next (from user)

1. **Phrase wrapping improvement:** Wrap phrases at natural word boundaries (spaces), not just midpoint
2. **Web app:** Turn UI mockup into real Next.js + FastAPI app
3. **More artists:** Test with non-J. Cole lyrics
4. **T-shirt printing:** Integration with Printful/Printify
5. **Portfolio page:** Story of RapClouds journey (2021 → 2026)

## Known Issues

- `wordcloud_fork/` directory in standalone/ shadows the installed package when running from that directory. Run from `/tmp` or another dir when testing.
- Phrase deduplication is O(n²) — slow on large corpora with many repeated phrases
- Multiline phrases reduce overall word count (longer tokens = fewer placed)
- The `anchor='lt'` removal for multiline may cause slight position offsets for multiline tokens (PIL renders from top-left without anchor specification)
