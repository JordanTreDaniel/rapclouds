#!/usr/bin/env python3
"""
RapClouds v5 - Layer Stacking + Phrase Collocations

Extends v4 with:
  1. Phrase extraction BEFORE word cloud generation
  2. Each layer gets phrase-replaced text (sentences flow as units)
  3. Optional --phrases flag to enable phrase mode (default off)
  4. Optional --max-ngram flag (default 3, controls phrase length)
  5. When phrases enabled, max_font_size increases to 120
  6. Transparent background (RGBA) by default, --dark-bg for dark version
"""

import os
import sys
import time
import argparse
import numpy as np
from PIL import Image
from wordcloud import WordCloud, STOPWORDS
from collections import Counter

# ─── CLI ────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="RapClouds v5 – Layer Stacking + Phrases")
    p.add_argument("--lyrics-dir", default="lyrics", help="Directory of lyrics .txt files")
    p.add_argument("--mask", required=True, help="Path to color portrait image")
    p.add_argument("--output", default="output_innovations_v5", help="Output directory")
    p.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    p.add_argument("--width", type=int, default=1200, help="Target width (height derived from aspect ratio)")
    p.add_argument("--clusters", type=int, default=7, help="K-means color clusters")
    p.add_argument("--threshold", type=int, default=50, help="RGB distance threshold for masking")
    p.add_argument("--max-words", type=int, default=3000, help="Max words per layer (high density)")
    p.add_argument("--album", action="store_true", help="Combine all lyrics into one cloud")
    p.add_argument("--coverage-report", action="store_true", help="Print per-layer coverage stats")
    # v5 additions
    p.add_argument("--phrases", action="store_true", help="Enable phrase collocation mode")
    p.add_argument("--max-ngram", type=int, default=3, help="Max n-gram length for phrases (default 3)")
    p.add_argument("--dark-bg", action="store_true", help="Also generate dark-background composite")
    p.add_argument("--min-phrase-count", type=int, default=2, help="Min times a phrase must appear")
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

# ─── Phrase Extraction (from generate_phrases.py, reimplemented without nltk) ──

def extract_repeating_phrases(text, min_count=2, max_ngram=3):
    """
    Extract n-grams of length 2..max_ngram that appear >= min_count times.
    Returns dict: underscored_phrase -> original_phrase, sorted by length desc.
    """
    words = text.split()
    n_words = len(words)
    ngram_counts = Counter()

    for n in range(2, max_ngram + 1):
        for i in range(n_words - n + 1):
            ngram = tuple(words[i:i+n])
            # Skip if all stopwords
            if all(w in RAP_STOPWORDS for w in ngram):
                continue
            # Skip if majority are stopwords
            stopword_count = sum(1 for w in ngram if w in RAP_STOPWORDS)
            if stopword_count > len(ngram) // 2:
                continue
            ngram_counts[ngram] += 1

    # Filter to repeated phrases
    repeated = {ngram: count for ngram, count in ngram_counts.items()
                if count >= min_count}

    if not repeated:
        return {}

    # Sort by length desc, then frequency desc
    sorted_phrases = sorted(repeated.keys(), key=lambda x: (-len(x), -repeated[x]))

    phrase_map = {}
    for ngram in sorted_phrases:
        underscored = "_".join(ngram)
        phrase_map[underscored] = " ".join(ngram)

    # Show top phrases
    top = sorted(repeated.items(), key=lambda x: -x[1])[:15]
    for ngram, count in top:
        print(f"    [{count}x] {' '.join(ngram)}")

    return phrase_map


def replace_phrases_with_tokens(text, phrase_map):
    """
    Replace repeating phrases in text with underscored tokens.
    Longest phrases first to avoid partial replacements.
    """
    words = text.split()
    result = list(words)
    replacements_made = 0

    # Sort by phrase length (longest first)
    sorted_phrases = sorted(phrase_map.keys(), key=lambda x: -x.count("_") - 1)

    # Track which positions are already replaced
    replaced = set()

    for phrase_underscored in sorted_phrases:
        phrase_words = phrase_underscored.split("_")
        n = len(phrase_words)

        i = 0
        while i <= len(result) - n:
            if i not in replaced and all(
                i + j not in replaced and result[i + j] == phrase_words[j]
                for j in range(n)
            ):
                result[i:i+n] = [phrase_underscored]
                replacements_made += 1
                replaced.add(i)
                continue
            i += 1

    print(f"    Made {replacements_made} phrase replacements")
    return " ".join(result)


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


def create_cluster_mask(pixels, center, threshold, width, height):
    """Binary mask for pixels within RGB threshold of center.
    Returns array: 0=drawable, 255=masked (for wordcloud).
    """
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
    """Extract occupancy bitmap from a completed wordcloud RGBA image.
    Pixels where alpha > 0 are marked as occupied (255).
    """
    arr = np.array(wc_img_rgba)
    alpha = arr[:, :, 3]
    return (alpha > 0).astype(np.uint8) * 255


def merge_small_clusters(centers, labels, min_pct=3.0):
    """Merge clusters with < min_pct pixel coverage into nearest neighbor.
    Returns updated (labels, centers, keep_mask).
    """
    n = len(labels)
    counts = np.array([np.sum(labels == i) for i in range(len(centers))])
    pcts = 100.0 * counts / n

    small = np.where(pcts < min_pct)[0]
    if len(small) == 0:
        return labels, centers, np.ones(len(centers), dtype=bool)

    keep = np.ones(len(centers), dtype=bool)
    for s in small:
        dists_to_all = np.array([np.sum((centers[s] - centers[j]) ** 2) for j in range(len(centers))])
        for other_small in small:
            if other_small != s:
                dists_to_all[other_small] = np.inf
        dists_to_all[s] = np.inf
        nearest = np.argmin(dists_to_all)
        labels[labels == s] = nearest
        keep[s] = False

    return labels, centers, keep


# ─── Coverage report helper ─────────────────────────────────────────────────

def compute_coverage(expected_mask, actual_occupancy):
    """expected_mask: 255=masked (unfillable), 0=expected fill area.
    actual_occupancy: 255=filled, 0=empty.
    Returns (expected_pct, actual_pct, overlap_pct) of the drawable area.
    """
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
    raw_text = load_all_lyrics(args.lyrics_dir)
    words = raw_text.split()
    print(f"   Total words: {len(words)}")

    # ── 2. Phrase extraction (v5 addition) ──────────────────────────────
    phrase_map = {}
    if args.phrases:
        print("\n2. Extracting phrases...")
        phrase_map = extract_repeating_phrases(
            raw_text, min_count=args.min_phrase_count, max_ngram=args.max_ngram
        )
        print(f"   Found {len(phrase_map)} repeating phrases (n=2..{args.max_ngram})")
        # Generate phrase-replaced text once from the full corpus
        phrase_text = replace_phrases_with_tokens(raw_text, phrase_map)
        print(f"   Phrase-replaced tokens: {len(phrase_text.split())}")
        text_for_cloud = phrase_text
    else:
        text_for_cloud = raw_text

    # ── 3. Load portrait & compute aspect-ratio-preserving dimensions ───
    print("\n3. Loading portrait...")
    portrait = Image.open(args.mask).convert("RGB")
    orig_w, orig_h = portrait.size
    aspect = orig_h / orig_w  # >1 for portrait, <1 for landscape
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

    # ── 4. K-means clustering ───────────────────────────────────────────
    print(f"\n4. Running k-means (k={args.clusters})...")
    t0 = time.time()
    labels, centers = kmeans_numpy(pixels, k=args.clusters)
    print(f"   Done in {time.time() - t0:.1f}s")

    # Merge small clusters (<3% coverage)
    labels, centers, keep_mask = merge_small_clusters(centers, labels, min_pct=3.0)
    active_clusters = np.where(keep_mask)[0]
    print(f"   Active clusters after merging (<3% merged): {len(active_clusters)}")

    # Print cluster summary
    print("\n   Cluster summary:")
    for idx, i in enumerate(active_clusters):
        count = np.sum(labels == i)
        pct = 100.0 * count / total_pixels
        r, g, b = int(centers[i][0]), int(centers[i][1]), int(centers[i][2])
        print(f"   Cluster {idx+1}: {pct:5.1f}% | RGB=({r},{g},{b}) #{r:02x}{g:02x}{b:02x}")

    # ── Sort clusters by pixel count (largest first) ────────────────────
    cluster_sizes = [(i, np.sum(labels == i)) for i in active_clusters]
    cluster_sizes.sort(key=lambda x: -x[1])  # descending

    # ── 5. Generate word clouds per cluster with collision detection ─────
    os.makedirs(args.output, exist_ok=True)
    print(f"\n5. Generating word clouds ({len(cluster_sizes)} clusters)...")

    layer_images = []
    layer_info = []
    cumulative_occupancy = np.zeros((target_h, target_w), dtype=np.uint8)

    # v5: increase max font size when phrases are enabled
    max_font = 120 if args.phrases else 100

    for rank, (ci, px_count) in enumerate(cluster_sizes):
        pct = 100.0 * px_count / total_pixels
        center = centers[ci]
        r, g, b = int(center[0]), int(center[1]), int(center[2])

        print(f"\n   [{rank+1}/{len(cluster_sizes)}] Cluster {ci+1} ({pct:.1f}%, RGB=({r},{g},{b}))")

        # Create base mask for this cluster (255=masked)
        cluster_mask = create_cluster_mask(pixels, center, args.threshold, target_w, target_h)

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

        # Generate word cloud
        t1 = time.time()
        wc = WordCloud(
            width=target_w,
            height=target_h,
            mode="RGBA",
            background_color=None,    # transparent
            max_words=args.max_words,
            stopwords=RAP_STOPWORDS,
            min_font_size=3,
            max_font_size=max_font,
            margin=1,
            prefer_horizontal=1.0,
            relative_scaling=0.0,
            collocations=False,
            repeat=True,
            font_path=args.font,
            mask=collision_mask,
            color_func=color_func,
        )
        wc.generate(text_for_cloud)
        elapsed_wc = time.time() - t1
        placed = sum(1 for l in wc.layout_ if l[1] > 0 and l[2] is not None)
        print(f"   Generated in {elapsed_wc:.1f}s ({placed} words placed, {len(wc.words_)} vocab)")

        # Get RGBA image — rasterize occupancy BEFORE dark-pixel thresholding
        wc_img_raw = wc.to_image().convert("RGBA")
        layer_occ = rasterize_occupancy(wc_img_raw)
        cumulative_occupancy = np.maximum(cumulative_occupancy, layer_occ)

        # Make dark pixels transparent for the saved layer image
        wc_arr = np.array(wc_img_raw)
        brightness = wc_arr[:, :, 0].astype(int) + wc_arr[:, :, 1].astype(int) + wc_arr[:, :, 2].astype(int)
        wc_arr[brightness < 30, 3] = 0
        wc_img = Image.fromarray(wc_arr, "RGBA")

        # Coverage report
        if args.coverage_report:
            exp_pct, act_pct, overlap_pct = compute_coverage(cluster_mask, layer_occ)
            print(f"   Coverage: expected={exp_pct:.1f}% drawable, actual={act_pct:.1f}% filled, overlap={overlap_pct:.1f}%")

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

    # ── 6. Stack all layers ─────────────────────────────────────────────
    print(f"\n6. Stacking {len(layer_images)} layers...")
    if not layer_images:
        print("   ERROR: No layers generated!")
        return

    composite = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    for img in layer_images:
        composite = Image.alpha_composite(composite, img)

    # Save transparent composite (default output)
    composite_path = os.path.join(args.output, "LAYER_composite.png")
    composite.save(composite_path, "PNG")
    print(f"   Transparent composite: {composite_path} ({os.path.getsize(composite_path) / 1024:.0f}KB)")

    # Dark-background version only if --dark-bg flag
    if args.dark_bg:
        dark_bg = Image.new("RGB", (target_w, target_h), (0, 0, 0))
        dark_bg.paste(composite, (0, 0), composite)
        dark_path = os.path.join(args.output, "LAYER_composite_dark.png")
        dark_bg.save(dark_path, "PNG")
        print(f"   Dark-background version: {dark_path} ({os.path.getsize(dark_path) / 1024:.0f}KB)")

    # ── Summary ─────────────────────────────────────────────────────────
    mode_str = "v5+Phrases" if args.phrases else "v5"
    print("\n" + "=" * 60)
    print(f"  SUMMARY (RapClouds {mode_str})")
    print("=" * 60)
    print(f"  Dimensions: {target_w}x{target_h} (aspect preserved from {orig_w}x{orig_h})")
    if args.phrases:
        print(f"  Phrases: {len(phrase_map)} extracted (n=2..{args.max_ngram}, min_count={args.min_phrase_count})")
        print(f"  Max font size: {max_font} (phrase mode)")
    for info in layer_info:
        print(f"  Layer {info['rank']:02d}: {info['hex']} ({info['pixels_pct']:.1f}% pixels, {info['words_drawn']} words)")
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
