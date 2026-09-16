#!/usr/bin/env python3
"""
RapClouds v7 — Layer Stacking + Frequency-Weighted Phrases

Combines v5's golden spacing/sizing with v6's multiline phrase wrapping.
Key improvements over v6:
  1. Smarter phrase dedup: detects shifted/overlapping windows
  2. Frequency-weighted sizing: most common phrases → largest text
  3. Phrases placed once each (no repeat), words fill remaining space
  4. Uses generate_from_frequencies for multiline \n support

Usage:
    python3 generate_layers_v7.py --mask masks/jcole_face_illustration.jpg --album
    python3 generate_layers_v7.py --mask masks/jcole_displate.jpg --lyrics lyrics/love_yourz.txt
"""

import os
import sys
import re
import time
import argparse
from collections import Counter

import numpy as np
from PIL import Image
from wordcloud import WordCloud, STOPWORDS

# ─── CLI ────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="RapClouds v7 — Frequency-Weighted Phrases")
    p.add_argument("--lyrics-dir", default="lyrics", help="Directory of lyrics .txt files")
    p.add_argument("--lyrics", default=None, help="Single lyrics .txt file (overrides --lyrics-dir)")
    p.add_argument("--mask", required=True, help="Path to color portrait image")
    p.add_argument("--output", default="output_v7", help="Output directory")
    p.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    p.add_argument("--width", type=int, default=1200, help="Target width (height from aspect ratio)")
    p.add_argument("--clusters", type=int, default=7, help="K-means color clusters")
    p.add_argument("--threshold", type=int, default=50, help="RGB distance threshold")
    p.add_argument("--max-words", type=int, default=3000, help="Max words per layer")
    p.add_argument("--album", action="store_true", help="Combine all lyrics into one cloud")
    p.add_argument("--coverage-report", action="store_true", help="Print per-layer coverage stats")
    p.add_argument("--dark-bg", action="store_true", help="Also generate dark-background composite")
    # Phrase settings
    p.add_argument("--min-phrase-count", type=int, default=3, help="Min times a phrase must appear")
    p.add_argument("--min-phrase-words", type=int, default=3, help="Min words per phrase")
    p.add_argument("--max-phrase-words", type=int, default=6, help="Max words per phrase")
    p.add_argument("--phrase-boost", type=float, default=4.0,
                    help="Multiplier for phrase frequency (higher = phrases dominate)")
    return p.parse_args()

# ─── Constants ──────────────────────────────────────────────────────────────

RAP_STOPWORDS = STOPWORDS.copy()
RAP_STOPWORDS.update([
    "im", "ive", "youre", "hes", "shes", "its", "were", "theyre",
    "ill", "youll", "hell", "shell", "itll", "well", "theyll",
    "id", "youd", "hed", "shed", "wed", "theyd",
    "cant", "dont", "wont", "isnt", "arent", "wasnt", "werent",
    "doesnt", "didnt", "hasnt", "hadnt", "shouldnt", "wouldnt", "couldnt",
    "thats", "whats", "heres", "theres", "whos", "hows",
    "gonna", "gotta", "wanna", "em", "bout", "cause", "cuz",
    "ya", "yo", "nah", "yeah", "ayy", "ay", "oh", "ooh",
    "like", "just", "got", "get", "go", "gon", "man",
    "one", "two", "three", "first", "new", "way", "back",
    "still", "even", "also", "right", "now", "ever",
])

# ─── Phrase Extraction (v7: smart dedup) ────────────────────────────────────

def extract_phrases_v7(text, min_words=3, max_words=6, min_count=3,
                       max_stopwords_ratio=0.5):
    """
    Extract repeating phrases with smart deduplication.
    
    Key improvement: detects shifted windows (overlapping n-grams from
    the same repeated line) and keeps only the best representative.
    
    Returns: list of (phrase, count, word_count) sorted by count desc.
    """
    words = text.split()
    n_words = len(words)
    
    # Count all n-grams
    ngram_counts = Counter()
    for n in range(min_words, min(max_words + 1, n_words + 1)):
        for i in range(n_words - n + 1):
            ngram = tuple(words[i:i + n])
            # Skip all-stopword phrases
            if all(w in RAP_STOPWORDS for w in ngram):
                continue
            # Skip phrases with too many stopwords
            stopword_count = sum(1 for w in ngram if w in RAP_STOPWORDS)
            if stopword_count > len(ngram) * max_stopwords_ratio:
                continue
            ngram_counts[ngram] += 1
    
    # Filter to repeated
    repeated = [(ngram, count) for ngram, count in ngram_counts.items()
                if count >= min_count]
    
    if not repeated:
        return []
    
    # Sort by count desc, then length desc
    repeated.sort(key=lambda x: (-x[1], -len(x[0])))
    
    # Smart dedup: detect shifted windows AND overlapping phrases
    # Two phrases are "shifted" if one is a rotation/shift of the other
    # (same words, different start position in a repeated sequence)
    deduped = []
    for ngram, count in repeated:
        phrase_str = " ".join(ngram)
        is_redundant = False
        
        # Check against all kept phrases
        i = 0
        while i < len(deduped):
            kept_ngram, kept_count = deduped[i]
            kept_str = " ".join(kept_ngram)
            
            # Check 1: substring — one phrase is entirely contained in the other
            if phrase_str in kept_str or kept_str in phrase_str:
                if count > kept_count or (count == kept_count and len(ngram) > len(kept_ngram)):
                    deduped.pop(i)
                    deduped.append((ngram, count))
                # Either way, this ngram is redundant
                is_redundant = True
                break
            
            # Check 2: same-length shifted window — same words in similar order
            if len(ngram) == len(kept_ngram):
                common = len(set(ngram) & set(kept_ngram))
                overlap_ratio = common / len(ngram)
                if overlap_ratio > 0.6:
                    if count > kept_count:
                        deduped.pop(i)
                        deduped.append((ngram, count))
                    elif count == kept_count:
                        # Same count, same length, high overlap — keep first found
                        pass
                    is_redundant = True
                    break
            
            # Check 3: subsequence — shorter phrase is a contiguous
            # subsequence of the longer phrase (shifted window, different lengths)
            shorter, longer = (ngram, kept_ngram) if len(ngram) <= len(kept_ngram) else (kept_ngram, ngram)
            for offset in range(len(longer) - len(shorter) + 1):
                if longer[offset:offset + len(shorter)] == shorter:
                    # The longer phrase contains the shorter — keep longer
                    if len(ngram) > len(kept_ngram):
                        deduped.pop(i)
                        deduped.append((ngram, count))
                    # If ngram is shorter, it's redundant (longer is already kept)
                    is_redundant = True
                    break
            if is_redundant:
                break
            
            i += 1
        
        if not is_redundant:
            deduped.append((ngram, count))
    
    # Final sort by count desc
    deduped.sort(key=lambda x: (-x[1], -len(x[0])))
    
    return [(" ".join(ngram), count, len(ngram)) for ngram, count in deduped]


def build_phrase_freq_dict(lyrics_text, phrases, phrase_boost=4.0,
                           min_font_len=1, repeat_phrases=False):
    """
    Build frequency dict with phrases weighted by count.
    
    Key v7 design: phrases dominate visually. Individual words that appear
    inside phrases are suppressed so the phrase block is always larger.
    
    - Each phrase appears ONCE, weighted by count * phrase_boost
    - Words inside phrases get weight = 1 (tiny filler, won't compete)
    - Other words get their raw count (but still smaller than phrases)
    
    Returns: Counter of token -> frequency
    """
    stopwords_lower = {w.lower() for w in RAP_STOPWORDS}
    freq = Counter()
    
    # Track which words appear in phrases
    phrase_words_set = set()
    phrase_word_importance = Counter()  # how many phrases contain this word
    
    # 1) Add phrases with boosted frequency
    for phrase, count, length in phrases:
        # Wrap long phrases for multiline rendering
        phrase_words = phrase.split()
        if len(phrase_words) > 5:
            mid = len(phrase_words) // 2
            token = " ".join(phrase_words[:mid]) + "\n" + " ".join(phrase_words[mid:])
        else:
            token = phrase
        
        # Weight = count * boost. This ensures phrases >> individual words.
        weight = count * phrase_boost
        freq[token] = weight
        
        # Track words in this phrase
        for w in phrase_words:
            phrase_words_set.add(w.lower())
            phrase_word_importance[w.lower()] += count
    
    # 2) Count individual words
    words = lyrics_text.split()
    word_counts = Counter()
    for w in words:
        wl = w.lower()
        if not w or len(w) < min_font_len or len(w) > 30:
            continue
        if wl in stopwords_lower:
            continue
        word_counts[wl] += 1
    
    # 3) Add individual words — heavily suppress words in phrases
    for wl, count in word_counts.items():
        if wl in phrase_words_set:
            # Word appears in phrases — suppress to filler level
            # The phrase itself will be much larger
            freq[wl] = 1
        else:
            # Normal word — keep raw count but cap so phrases always win
            freq[wl] = min(count, 50)  # cap at 50 so no word beats a phrase
    
    return freq


def wrap_phrases_for_multiline(phrases, wrap_threshold=5):
    """Wrap long phrases with \n for multiline rendering."""
    wrapped = {}
    for phrase, count, length in phrases:
        words = phrase.split()
        if len(words) > wrap_threshold:
            mid = len(words) // 2
            token = " ".join(words[:mid]) + "\n" + " ".join(words[mid:])
        else:
            token = phrase
        wrapped[token] = count
    return wrapped


# ─── Lyrics cleaning ────────────────────────────────────────────────────────

def clean_lyrics(lyrics, include_numbers=False):
    """Clean lyrics — inline version."""
    text = lyrics.lower()
    text = re.sub(r"\[.*?\]", "", text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"albumcovers?\\w*thumbjpg\\w*", "", text)
    text = re.sub(r"suggesteditson\\w+lyrics", "", text)
    text = re.sub(r"falloffjcole\\w+lyrics", "", text)
    text = re.sub(r"jcole\\w*lyrics\\w*", "", text)
    text = re.sub(r"jcolelyricssongs", "", text)
    text = re.sub(r"fayettevi\\w*", "", text)
    text = re.sub(r"algorithm\\s*moderated", "", text)
    text = re.sub(r"streaming\\s*service\\s*automated", "", text)
    text = re.sub(r"are these lyrics accurate.*", "", text)
    text = re.sub(r"written\\s*##.*", "", text)
    text = re.sub(r"keep exploring.*", "", text)
    text = re.sub(r"more j\\.?\\s*cole songs.*", "", text)
    text = re.sub(r"browse all.*", "", text)
    text = re.sub(r"next track.*", "", text)
    text = re.sub(r"on the fall-off.*", "", text)
    text = re.sub(r"all j\\.?\\s*cole songs.*", "", text)
    text = re.sub(r"\\blyrics\\b", "", text)
    if not include_numbers:
        text = re.sub(r"[^a-z\s]", "", text)
    else:
        text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_all_lyrics(lyrics_dir):
    """Load and combine all lyrics .txt files."""
    all_text = []
    for fname in sorted(os.listdir(lyrics_dir)):
        if fname.endswith(".txt") and fname != "manifest.json":
            with open(os.path.join(lyrics_dir, fname)) as f:
                text = f.read()
            cleaned = clean_lyrics(text, include_numbers=False)
            if len(cleaned.split()) > 20:
                all_text.append(cleaned)
    return " ".join(all_text)


# ─── Pure-numpy K-means ─────────────────────────────────────────────────────

def kmeans_numpy(pixels, k=7, max_iter=50, seed=42):
    """K-means++ in pure numpy (no sklearn/scipy)."""
    rng = np.random.RandomState(seed)
    n = pixels.shape[0]

    # K-means++ init
    centers = np.empty((k, 3))
    centers[0] = pixels[rng.randint(n)]
    for c in range(1, k):
        dists = np.min(
            np.array([np.sum((pixels - centers[j]) ** 2, axis=1) for j in range(c)]),
            axis=0,
        )
        probs = dists / dists.sum()
        centers[c] = pixels[rng.choice(n, p=probs)]

    for _ in range(max_iter):
        dists = np.array([np.sum((pixels - centers[j]) ** 2, axis=1) for j in range(k)])
        labels = np.argmin(dists, axis=0)
        new_centers = np.empty_like(centers)
        for j in range(k):
            members = pixels[labels == j]
            new_centers[j] = members.mean(axis=0) if len(members) > 0 else centers[j]
        if np.allclose(centers, new_centers, atol=1e-4):
            break
        centers = new_centers

    return labels, centers


# ─── Helpers ─────────────────────────────────────────────────────────────────

def create_cluster_mask(pixels, center, threshold, width, height):
    """Binary mask for pixels within RGB threshold of center."""
    dists = np.sqrt(np.sum((pixels - center) ** 2, axis=1))
    mask_flat = dists > threshold
    return mask_flat.reshape(height, width).astype(np.uint8) * 255


def make_color_func(original_img_arr, cluster_center):
    """Color function sampling actual pixel colors from original image."""
    h, w = original_img_arr.shape[:2]

    def color_func(word, font_size, position, orientation, random_state=None, **kwargs):
        if position is None:
            r, g, b = int(cluster_center[0]), int(cluster_center[1]), int(cluster_center[2])
            return f"rgb({r},{g},{b})"
        y, x = int(position[0]), int(position[1])
        x = max(0, min(x, w - 1))
        y = max(0, min(y, h - 1))
        half = max(1, font_size // 4)
        y1, y2 = max(0, y - half), min(h, y + half)
        x1, x2 = max(0, x - half), min(w, x + half)
        region = original_img_arr[y1:y2, x1:x2]
        if region.size == 0:
            r, g, b = original_img_arr[y, x]
        else:
            r = int(np.mean(region[:, :, 0]))
            g = int(np.mean(region[:, :, 1]))
            b = int(np.mean(region[:, :, 2]))
        return f"rgb({r},{g},{b})"

    return color_func


def rasterize_occupancy(wc_img_rgba):
    """Extract occupancy bitmap from a completed wordcloud RGBA image."""
    arr = np.array(wc_img_rgba)
    alpha = arr[:, :, 3]
    return (alpha > 0).astype(np.uint8) * 255


def merge_small_clusters(centers, labels, min_pct=3.0):
    """Merge clusters with < min_pct pixel coverage into nearest neighbor."""
    n = len(labels)
    counts = np.array([np.sum(labels == i) for i in range(len(centers))])
    pcts = 100.0 * counts / n

    small = np.where(pcts < min_pct)[0]
    if len(small) == 0:
        return labels, centers, np.ones(len(centers), dtype=bool)

    keep = np.ones(len(centers), dtype=bool)
    for s in small:
        dists_to_all = np.array([np.sum((centers[s] - centers[j]) ** 2)
                                  for j in range(len(centers))])
        for other_small in small:
            if other_small != s:
                dists_to_all[other_small] = np.inf
        dists_to_all[s] = np.inf
        nearest = np.argmin(dists_to_all)
        labels[labels == s] = nearest
        keep[s] = False

    return labels, centers, keep


def compute_coverage(expected_mask, actual_occupancy):
    """Compute coverage stats."""
    total = expected_mask.size
    expected_fill = (expected_mask == 0).astype(np.uint8)
    actual_fill = (actual_occupancy > 0).astype(np.uint8)

    exp_pct = 100.0 * expected_fill.sum() / total
    act_pct = 100.0 * actual_fill.sum() / total
    overlap = (expected_fill & actual_fill).sum()
    exp_fill_count = expected_fill.sum()
    overlap_pct = 100.0 * overlap / exp_fill_count if exp_fill_count > 0 else 0.0

    return exp_pct, act_pct, overlap_pct


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    # ── 1. Load lyrics ──────────────────────────────────────────────────
    print("1. Loading lyrics...")
    if args.lyrics:
        with open(args.lyrics) as f:
            raw = f.read()
        text = clean_lyrics(raw, include_numbers=False)
        print(f"   Single file: {args.lyrics} ({len(text.split())} words)")
    else:
        text = load_all_lyrics(args.lyrics_dir)
    words = text.split()
    print(f"   Total words: {len(words)}")

    # ── 2. Extract phrases (v7: smart dedup) ────────────────────────────
    print("\n2. Extracting phrases (v7 smart dedup)...")
    phrases = extract_phrases_v7(
        text,
        min_words=args.min_phrase_words,
        max_words=args.max_phrase_words,
        min_count=args.min_phrase_count,
    )
    print(f"   Found {len(phrases)} unique phrases")

    if phrases:
        print("\n   Top 15 phrases:")
        for i, (phrase, count, length) in enumerate(phrases[:15], 1):
            display = phrase.replace("\n", "↵")
            print(f"   {i:3d}. [{count:2d}x, {length}w] {display}")

    # ── 3. Build frequency dict (v7: frequency-weighted) ────────────────
    print("\n3. Building frequency dict...")
    freq_dict = build_phrase_freq_dict(
        text, phrases,
        phrase_boost=args.phrase_boost,
    )
    print(f"   Vocabulary size: {len(freq_dict)} tokens")
    print(f"\n   Top 15 tokens (by frequency):")
    for token, count in freq_dict.most_common(15):
        display = token.replace("\n", "↵")
        print(f"     {count:7.1f}  {display}")

    # ── 4. Load portrait & compute aspect-ratio preserving dimensions ───
    print("\n4. Loading portrait...")
    portrait = Image.open(args.mask).convert("RGB")
    orig_w, orig_h = portrait.size
    aspect = orig_h / orig_w
    target_w = args.width
    target_h = int(round(target_w * aspect))
    target_h = target_h + (target_h % 2)

    portrait_resized = portrait.resize((target_w, target_h), Image.LANCZOS)
    portrait_arr = np.array(portrait_resized)
    print(f"   Original: {orig_w}x{orig_h}")
    print(f"   Target (aspect-preserved): {target_w}x{target_h}")

    # Flatten for k-means
    pixels = portrait_arr.reshape(-1, 3).astype(np.float64)
    total_pixels = len(pixels)
    print(f"   Total pixels: {total_pixels}")

    # ── 5. K-means clustering ───────────────────────────────────────────
    print(f"\n5. Running k-means (k={args.clusters})...")
    t0 = time.time()
    labels, centers = kmeans_numpy(pixels, k=args.clusters)
    print(f"   Done in {time.time() - t0:.1f}s")

    # Merge small clusters (<3% coverage)
    labels, centers, keep_mask = merge_small_clusters(centers, labels, min_pct=3.0)
    active_clusters = np.where(keep_mask)[0]
    print(f"   Active clusters after merging: {len(active_clusters)}")

    # Print cluster summary
    print("\n   Cluster summary:")
    for idx, i in enumerate(active_clusters):
        count = np.sum(labels == i)
        pct = 100.0 * count / total_pixels
        r, g, b = int(centers[i][0]), int(centers[i][1]), int(centers[i][2])
        print(f"   Cluster {idx+1}: {pct:5.1f}% | RGB=({r},{g},{b}) #{r:02x}{g:02x}{b:02x}")

    # Sort clusters by pixel count (largest first)
    cluster_sizes = [(i, np.sum(labels == i)) for i in active_clusters]
    cluster_sizes.sort(key=lambda x: -x[1])

    # ── 6. Generate word clouds per cluster with collision detection ─────
    os.makedirs(args.output, exist_ok=True)
    print(f"\n6. Generating word clouds ({len(cluster_sizes)} clusters)...")

    layer_images = []
    layer_info = []
    cumulative_occupancy = np.zeros((target_h, target_w), dtype=np.uint8)

    for rank, (ci, px_count) in enumerate(cluster_sizes):
        pct = 100.0 * px_count / total_pixels
        center = centers[ci]
        r, g, b = int(center[0]), int(center[1]), int(center[2])

        print(f"\n   [{rank+1}/{len(cluster_sizes)}] Cluster {ci+1} "
              f"({pct:.1f}%, RGB=({r},{g},{b}))")

        # Create base mask for this cluster (255=masked)
        cluster_mask = create_cluster_mask(pixels, center, args.threshold,
                                           target_w, target_h)

        # Combine with cumulative occupancy to prevent layer overlap
        collision_mask = np.maximum(cluster_mask, cumulative_occupancy)

        # Count drawable pixels after collision masking
        drawable = np.sum(collision_mask == 0)
        if drawable < 100:
            print(f"   Skipping: only {drawable} drawable pixels after collision")
            continue

        drawable_pct = 100.0 * drawable / (target_w * target_h)
        print(f"   Drawable: {drawable} pixels ({drawable_pct:.1f}%)")

        # Color function
        color_func = make_color_func(portrait_arr, center)

        # Generate word cloud using v5 golden config + generate_from_frequencies
        t1 = time.time()
        wc = WordCloud(
            width=target_w,
            height=target_h,
            mode="RGBA",
            background_color=None,    # transparent (v5 golden)
            max_words=args.max_words,
            min_font_size=3,          # v5 golden: biggest lever
            max_font_size=100,        # v5 golden: better coverage
            margin=1,                 # v5 golden
            prefer_horizontal=1.0,    # v5 golden
            relative_scaling=0.0,     # v5 golden
            collocations=False,
            repeat=False,             # v7: NO repeat — phrases appear once
            font_path=args.font,
            mask=collision_mask,
            color_func=color_func,
        )
        # Use generate_from_frequencies for multiline \n support
        wc.generate_from_frequencies(freq_dict)
        elapsed_wc = time.time() - t1
        placed = sum(1 for l in wc.layout_ if l[1] > 0 and l[2] is not None)
        print(f"   Generated in {elapsed_wc:.1f}s "
              f"({placed} words placed, {len(wc.words_)} vocab)")

        # Get RGBA image — rasterize occupancy BEFORE dark-pixel thresholding
        wc_img_raw = wc.to_image().convert("RGBA")
        layer_occ = rasterize_occupancy(wc_img_raw)
        cumulative_occupancy = np.maximum(cumulative_occupancy, layer_occ)

        # Make dark pixels transparent for the saved layer image
        wc_arr = np.array(wc_img_raw)
        brightness = (wc_arr[:, :, 0].astype(int) +
                      wc_arr[:, :, 1].astype(int) +
                      wc_arr[:, :, 2].astype(int))
        wc_arr[brightness < 30, 3] = 0
        wc_img = Image.fromarray(wc_arr, "RGBA")

        # Coverage report
        if args.coverage_report:
            exp_pct, act_pct, overlap_pct = compute_coverage(cluster_mask, layer_occ)
            print(f"   Coverage: expected={exp_pct:.1f}% drawable, "
                  f"actual={act_pct:.1f}% filled, overlap={overlap_pct:.1f}%")

        # Save individual layer
        layer_path = os.path.join(args.output, f"LAYER_{rank+1:02d}.png")
        wc_img.save(layer_path, "PNG")
        layer_images.append(wc_img)
        layer_info.append({
            "rank": rank + 1,
            "cluster": ci + 1,
            "rgb": (r, g, b),
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "pixels_pct": pct,
            "words_drawn": placed,
        })
        print(f"   Saved: {layer_path}")

    # ── 7. Stack all layers ─────────────────────────────────────────────
    print(f"\n7. Stacking {len(layer_images)} layers...")
    if not layer_images:
        print("   ERROR: No layers generated!")
        return

    composite = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    for img in layer_images:
        composite = Image.alpha_composite(composite, img)

    composite_path = os.path.join(args.output, "LAYER_composite.png")
    composite.save(composite_path, "PNG")
    print(f"   Transparent composite: {composite_path} "
          f"({os.path.getsize(composite_path) / 1024:.0f}KB)")

    # ── 8. Dark-background preview ──────────────────────────────────────
    if args.dark_bg:
        dark_bg = Image.new("RGB", (target_w, target_h), (0, 0, 0))
        dark_bg.paste(composite, (0, 0), composite)
        dark_path = os.path.join(args.output, "LAYER_composite_dark.png")
        dark_bg.save(dark_path, "PNG")
        print(f"   Dark-background version: {dark_path}")

    # ── Summary ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  SUMMARY (RapClouds v7 — Frequency-Weighted Phrases)")
    print("=" * 60)
    print(f"  Dimensions: {target_w}x{target_h} (aspect preserved from {orig_w}x{orig_h})")
    print(f"  Phrases extracted: {len(phrases)}")
    print(f"  Phrase boost: {args.phrase_boost}x")
    print(f"  Vocabulary size: {len(freq_dict)}")
    for info in layer_info:
        print(f"  Layer {info['rank']:02d}: {info['hex']} "
              f"({info['pixels_pct']:.1f}% pixels, {info['words_drawn']} words)")
    print(f"\n  Total layers: {len(layer_images)}")
    print(f"  Max words/layer: {args.max_words}")
    print(f"  Background: transparent (RGBA)")
    print(f"  Output: {args.output}/")
    print("=" * 60)


if __name__ == "__main__":
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    os.chdir(SCRIPT_DIR)
    sys.path.insert(0, SCRIPT_DIR)
    from generate_cloud import clean_lyrics
    main()
