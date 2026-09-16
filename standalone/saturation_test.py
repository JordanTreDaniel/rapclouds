#!/usr/bin/env python3
"""
RapClouds v4 - max_words Saturation Test

Tests different max_words values on a single layer (largest cluster only)
to find the point where increasing max_words stops improving coverage.

Measures:
  - Words actually placed (len(wc.words_))
  - Coverage % (drawable pixels filled)
  - Generation time
"""

import os
import sys
import time
import numpy as np
from PIL import Image
from wordcloud import WordCloud, STOPWORDS

# ─── Import from sibling modules ────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from generate_cloud import clean_lyrics

# Import from generate_layers_v4 — but load_all_lyrics uses clean_lyrics
# which is only imported inside __main__, so we patch it into the module namespace
import generate_layers_v4 as _v4
_v4.clean_lyrics = clean_lyrics  # patch so load_all_lyrics can find it

from generate_layers_v4 import (
    kmeans_numpy,
    create_cluster_mask,
    make_color_func,
    merge_small_clusters,
    load_all_lyrics,
    compute_coverage,
    RAP_STOPWORDS,
)

# ─── Config ─────────────────────────────────────────────────────────────────
LYRICS_DIR = "lyrics"
MASK_PATH = "masks/jcole_displate.jpg"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TARGET_WIDTH = 1200
CLUSTERS = 7
THRESHOLD = 50

MAX_WORDS_LIST = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000]
MAX_FONT_SIZE_TESTS = [
    {"max_words": 5000, "max_font_size": 80},
    {"max_words": 5000, "max_font_size": 100},
]

# ─── Base WC settings (matching v4) ─────────────────────────────────────────
BASE_WC_SETTINGS = {
    "prefer_horizontal": 1.0,
    "relative_scaling": 0.0,
    "margin": 1,
    "repeat": True,
    "min_font_size": 4,
    "collocations": False,
}


def prepare_data():
    """Load lyrics and prepare mask/cluster data once."""
    print("Loading lyrics...")
    text = load_all_lyrics(LYRICS_DIR)
    words = text.split()
    print(f"  Total words in corpus: {len(words)}")

    print("Loading portrait mask...")
    portrait = Image.open(MASK_PATH).convert("RGB")
    orig_w, orig_h = portrait.size
    aspect = orig_h / orig_w
    target_h = int(round(TARGET_WIDTH * aspect))
    target_h = target_h + (target_h % 2)
    print(f"  Original: {orig_w}x{orig_h} -> Target: {TARGET_WIDTH}x{target_h}")

    portrait_resized = portrait.resize((TARGET_WIDTH, target_h), Image.LANCZOS)
    portrait_arr = np.array(portrait_resized)
    pixels = portrait_arr.reshape(-1, 3).astype(np.float64)
    total_pixels = len(pixels)

    print(f"Running k-means (k={CLUSTERS})...")
    t0 = time.time()
    labels, centers = kmeans_numpy(pixels, k=CLUSTERS)
    print(f"  Done in {time.time() - t0:.1f}s")

    labels, centers, keep_mask = merge_small_clusters(centers, labels, min_pct=3.0)
    active_clusters = np.where(keep_mask)[0]
    print(f"  Active clusters after merging: {len(active_clusters)}")

    # Find largest cluster
    cluster_sizes = [(i, np.sum(labels == i)) for i in active_clusters]
    cluster_sizes.sort(key=lambda x: -x[1])
    largest_ci, largest_px = cluster_sizes[0]
    pct = 100.0 * largest_px / total_pixels
    center = centers[largest_ci]
    r, g, b = int(center[0]), int(center[1]), int(center[2])
    print(f"\nLargest cluster: {pct:.1f}% | RGB=({r},{g},{b}) #{r:02x}{g:02x}{b:02x}")

    # Create the cluster mask (drawable = 0, masked = 255)
    cluster_mask = create_cluster_mask(pixels, center, THRESHOLD, TARGET_WIDTH, target_h)
    drawable_count = int(np.sum(cluster_mask == 0))
    drawable_pct = 100.0 * drawable_count / (TARGET_WIDTH * target_h)
    print(f"  Drawable area: {drawable_count} pixels ({drawable_pct:.1f}%)")

    # Color function
    color_func = make_color_func(portrait_arr, center)

    return {
        "text": text,
        "target_h": target_h,
        "cluster_mask": cluster_mask,
        "drawable_count": drawable_count,
        "drawable_pct": drawable_pct,
        "color_func": color_func,
    }


def run_single_test(data, max_words, max_font_size=50):
    """Run a single wordcloud generation and return metrics."""
    wc = WordCloud(
        width=TARGET_WIDTH,
        height=data["target_h"],
        background_color=None,  # transparent
        max_words=max_words,
        stopwords=RAP_STOPWORDS,
        min_font_size=BASE_WC_SETTINGS["min_font_size"],
        max_font_size=max_font_size,
        margin=BASE_WC_SETTINGS["margin"],
        prefer_horizontal=BASE_WC_SETTINGS["prefer_horizontal"],
        relative_scaling=BASE_WC_SETTINGS["relative_scaling"],
        collocations=BASE_WC_SETTINGS["collocations"],
        repeat=BASE_WC_SETTINGS["repeat"],
        font_path=FONT_PATH,
        mask=data["cluster_mask"],
        color_func=data["color_func"],
    )

    t0 = time.time()
    wc.generate(data["text"])
    elapsed = time.time() - t0

    words_placed = len(wc.words_)

    # Compute coverage using the occupancy bitmap
    wc_img = wc.to_image().convert("RGBA")
    wc_arr = np.array(wc_img)
    brightness = wc_arr[:, :, 0].astype(int) + wc_arr[:, :, 1].astype(int) + wc_arr[:, :, 2].astype(int)
    wc_arr[brightness < 30, 3] = 0  # dark pixels transparent
    actual_occ = (np.array(Image.fromarray(wc_arr, "RGBA"))[:, :, 3] > 0).astype(np.uint8) * 255

    _, _, overlap_pct = compute_coverage(data["cluster_mask"], actual_occ)

    return {
        "max_words": max_words,
        "max_font_size": max_font_size,
        "words_placed": words_placed,
        "coverage_pct": overlap_pct,
        "time_s": elapsed,
    }


def main():
    print("=" * 72)
    print("  RapClouds v4 - max_words Saturation Test")
    print("=" * 72)
    print()

    data = prepare_data()

    results = []

    # ── Phase 1: Vary max_words with fixed max_font_size=50 ─────────────
    print("\n" + "─" * 72)
    print("Phase 1: Varying max_words (max_font_size=50)")
    print("─" * 72)

    for mw in MAX_WORDS_LIST:
        print(f"\n  Testing max_words={mw}...", end=" ", flush=True)
        r = run_single_test(data, mw, max_font_size=50)
        results.append(r)
        print(
            f"placed={r['words_placed']:>5}  "
            f"coverage={r['coverage_pct']:5.1f}%  "
            f"time={r['time_s']:.1f}s"
        )

    # ── Phase 2: Test larger max_font_size at max_words=5000 ────────────
    print("\n" + "─" * 72)
    print("Phase 2: Larger max_font_size at max_words=5000")
    print("─" * 72)

    for test in MAX_FONT_SIZE_TESTS:
        mw = test["max_words"]
        mfs = test["max_font_size"]
        print(f"\n  Testing max_words={mw}, max_font_size={mfs}...", end=" ", flush=True)
        r = run_single_test(data, mw, max_font_size=mfs)
        results.append(r)
        print(
            f"placed={r['words_placed']:>5}  "
            f"coverage={r['coverage_pct']:5.1f}%  "
            f"time={r['time_s']:.1f}s"
        )

    # ── Print summary table ─────────────────────────────────────────────
    print("\n\n" + "=" * 72)
    print("  RESULTS TABLE")
    print("=" * 72)
    print(
        f"{'max_words':>10}  {'max_font':>8}  {'placed':>7}  "
        f"{'coverage':>9}  {'time':>7}"
    )
    print("-" * 72)

    for r in results:
        mfs = r["max_font_size"]
        label = str(mfs) if mfs != 50 else "50 (default)"
        print(
            f"{r['max_words']:>10}  {label:>8}  {r['words_placed']:>7}  "
            f"{r['coverage_pct']:>8.1f}%  {r['time_s']:>6.1f}s"
        )

    print("-" * 72)

    # ── Analysis ────────────────────────────────────────────────────────
    print("\n" + "─" * 72)
    print("Analysis:")
    print("─" * 72)

    # Check if words placed plateaus
    placed = [r["words_placed"] for r in results[:len(MAX_WORDS_LIST)]]
    covs = [r["coverage_pct"] for r in results[:len(MAX_WORDS_LIST)]]

    # Find saturation point: where words_placed stops increasing significantly
    for i in range(1, len(placed)):
        if placed[i] - placed[i - 1] < 5:  # <5 words difference
            print(
                f"  ⚡ Saturation detected near max_words={MAX_WORDS_LIST[i]} "
                f"({placed[i]} words, {covs[i]:.1f}% coverage)"
            )
            break
    else:
        print("  ⚠️  No clear saturation point found — words placed still increasing.")

    # Check if larger fonts help
    font_tests = [r for r in results if r["max_font_size"] != 50]
    if font_tests:
        print()
        for ft in font_tests:
            print(
                f"  max_font_size={ft['max_font_size']}: "
                f"{ft['words_placed']} words, {ft['coverage_pct']:.1f}% coverage, "
                f"{ft['time_s']:.1f}s"
            )

    print()
    print("=" * 72)


if __name__ == "__main__":
    main()
