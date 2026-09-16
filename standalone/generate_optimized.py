#!/usr/bin/env python3
"""
RapClouds Optimized Generator - Test multiple setting combinations
for J. Cole The Fall-Off concert t-shirt word clouds.
"""
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

from generate_cloud import (
    generate_wordcloud, batch_generate, DEFAULT_SETTINGS, RAP_STOPWORDS
)
from PIL import Image
import numpy as np

# Combine ALL lyrics for the album-wide cloud (most data = best density)
LYRICS_DIR = "lyrics"
MASKS_DIR = "masks"
OUTPUT_DIR = "output_optimized"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_NARROW = "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf"
MASK_FINAL = os.path.join(MASKS_DIR, "jcole_final_mask.png")
MASK_COLOR = os.path.join(MASKS_DIR, "jcole_color_mask.png")
MASK_SILHOUETTE = os.path.join(MASKS_DIR, "jcole_silhouette_toppng.png")


def load_all_lyrics():
    """Combine all track lyrics into one massive text block."""
    all_text = []
    for fname in sorted(os.listdir(LYRICS_DIR)):
        if fname.endswith(".txt") and fname != "manifest.json":
            with open(os.path.join(LYRICS_DIR, fname)) as f:
                all_text.append(f.read())
    combined = "\n\n".join(all_text)
    word_count = len(combined.split())
    print(f"  Combined lyrics: {word_count} words across {len(all_text)} tracks")
    return combined


def generate_test(name, lyrics, settings, mask_path, font_path):
    """Generate one test cloud and return timing."""
    out = os.path.join(OUTPUT_DIR, f"{name}.png")
    t0 = time.time()
    result = generate_wordcloud(
        lyrics, settings, mask_path, out, font_path
    )
    elapsed = time.time() - t0
    size = os.path.getsize(out) if result else 0
    print(f"  {name}: {elapsed:.1f}s, {size/1024:.0f}KB")
    return out


def main():
    print("=== RapClouds Optimized Generator ===\n")
    lyrics = load_all_lyrics()

    # ============================================================
    # TEST 1: Dense BW - Maximum density for t-shirt (white on black)
    # All horizontal, tiny margin, repeat, small font range
    # ============================================================
    print("\n--- TEST 1: Dense BW (white on black) ---")
    settings_dense_bw = {
        **DEFAULT_SETTINGS,
        "width": 1200,
        "height": 1200,
        "coloredBackground": True,
        "backgroundColor": "#000000",
        "transparentBackground": False,
        "useCustomColors": True,
        "colors": ["#FFFFFF", "#E0E0E0", "#CCCCCC", "#B0B0B0", "#F5F5F5"],
        "useRandomColors": False,
        "colorFromMask": False,
        "maskDesired": True,
        "maskAsBackground": False,
        "maskAsWords": False,
        "preferHorizontal": 1.0,       # ALL horizontal = max density
        "relativeScaling": 0.0,         # Rank-based = more uniform sizes
        "minFontSize": 4,               # Tiny min = fills gaps
        "maxFontSize": 50,              # Moderate max = doesn't dominate
        "margin": 1,                    # Minimal margin = packed
        "repeat": True,                 # Repeat to fill ALL space
        "collocations": False,          # Single words for density
        "includeNumbers": True,
        "contour": False,
        "detectEdges": False,
        "downsample": 2,
        "blackoutThreshold": 1,
        "whiteThreshold": 200,
    }
    generate_test("01_dense_bw", lyrics, settings_dense_bw, MASK_FINAL, FONT_BOLD)

    # ============================================================
    # TEST 2: Collocations BW - Phrases instead of single words
    # ============================================================
    print("\n--- TEST 2: Collocations BW (phrases) ---")
    settings_coll = {
        **settings_dense_bw,
        "collocations": True,           # Keep word pairs together
        "minFontSize": 6,               # Slightly larger min for phrases
        "maxFontSize": 45,              # Slightly smaller max for balance
        "margin": 2,                    # More margin for phrase readability
    }
    generate_test("02_collocations_bw", lyrics, settings_coll, MASK_FINAL, FONT_BOLD)

    # ============================================================
    # TEST 3: Maximum repeat - Fill every pixel
    # ============================================================
    print("\n--- TEST 3: Maximum Fill ---")
    settings_maxfill = {
        **settings_dense_bw,
        "minFontSize": 3,               # Even smaller min
        "maxFontSize": 40,              # Smaller max = more uniform = denser
        "margin": 0,                    # ZERO margin
        "preferHorizontal": 0.85,       # Slight vertical = fills odd gaps
        "relativeScaling": 0.3,         # Less extreme size diff
    }
    generate_test("03_maxfill", lyrics, settings_maxfill, MASK_FINAL, FONT_BOLD)

    # ============================================================
    # TEST 4: Color Portrait (colorFromMask) - Words colored like face
    # ============================================================
    print("\n--- TEST 4: Color Portrait (colorFromMask) ---")
    settings_color_portrait = {
        **DEFAULT_SETTINGS,
        "width": 1200,
        "height": 1200,
        "coloredBackground": True,
        "backgroundColor": "#1a1a2e",   # Dark blue-gray
        "transparentBackground": False,
        "useCustomColors": False,
        "useRandomColors": False,
        "colorFromMask": True,          # KEY: sample colors from mask
        "maskDesired": True,
        "maskAsBackground": False,
        "maskAsWords": False,
        "preferHorizontal": 1.0,
        "relativeScaling": 0.0,
        "minFontSize": 4,
        "maxFontSize": 50,
        "margin": 1,
        "repeat": True,
        "collocations": False,
        "includeNumbers": True,
        "contour": False,
        "detectEdges": False,
        "downsample": 2,
        "blackoutThreshold": 1,
        "whiteThreshold": 200,
    }
    generate_test("04_color_portrait", lyrics, settings_color_portrait, MASK_COLOR, FONT_BOLD)

    # ============================================================
    # TEST 5: Cole World (blue tones on dark bg)
    # ============================================================
    print("\n--- TEST 5: Cole World (blue palette) ---")
    settings_cole = {
        **settings_dense_bw,
        "backgroundColor": "#0a0a1a",
        "useCustomColors": True,
        "colors": ["#58a6ff", "#79c0ff", "#a5d6ff", "#c9d1d9", "#f0f6fc"],
        "useRandomColors": False,
        "colorFromMask": False,
        "minFontSize": 4,
        "maxFontSize": 50,
        "margin": 1,
    }
    generate_test("05_cole_world", lyrics, settings_cole, MASK_FINAL, FONT_BOLD)

    # ============================================================
    # TEST 6: Silhouette mask (better detail) with dense BW
    # ============================================================
    print("\n--- TEST 6: Silhouette Mask Dense BW ---")
    generate_test("06_silhouette_dense", lyrics, settings_dense_bw, MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # TEST 7: Bold Red - Aggressive concert tee style
    # ============================================================
    print("\n--- TEST 7: Bold Red (aggressive) ---")
    settings_red = {
        **settings_dense_bw,
        "backgroundColor": "#1a0000",
        "useCustomColors": True,
        "colors": ["#ff0000", "#cc0000", "#ff3333", "#ff6666", "#ff9999"],
        "useRandomColors": False,
        "colorFromMask": False,
    }
    generate_test("07_bold_red", lyrics, settings_red, MASK_FINAL, FONT_BOLD)

    # ============================================================
    # TEST 8: Narrow font - More words fit per line
    # ============================================================
    print("\n--- TEST 8: Narrow Font Dense ---")
    settings_narrow = {
        **settings_dense_bw,
        "minFontSize": 4,
        "maxFontSize": 55,
        "margin": 1,
        "preferHorizontal": 1.0,
        "relativeScaling": 0.0,
    }
    generate_test("08_narrow_font", lyrics, settings_narrow, MASK_FINAL, FONT_NARROW)

    # ============================================================
    # TEST 9: Edge-aware + contour for face outline
    # ============================================================
    print("\n--- TEST 9: Edge + Contour ---")
    settings_edge = {
        **settings_dense_bw,
        "detectEdges": True,
        "contour": True,
        "contourColor": "#333333",
        "contourWidth": 2,
        "collocations": True,
        "minFontSize": 6,
        "maxFontSize": 45,
        "margin": 2,
    }
    generate_test("09_edge_contour", lyrics, settings_edge, MASK_FINAL, FONT_BOLD)

    # ============================================================
    # TEST 10: Color from SILHOUETTE (has skin tones!)
    # ============================================================
    print("\n--- TEST 10: Color from Silhouette (skin tones) ---")
    settings_color_sil = {
        **settings_color_portrait,
        "collocations": True,
        "minFontSize": 4,
        "maxFontSize": 45,
        "margin": 1,
    }
    generate_test("10_color_silhouette", lyrics, settings_color_sil, MASK_SILHOUETTE, FONT_BOLD)

    print(f"\n=== DONE: {len(os.listdir(OUTPUT_DIR))} test images in {OUTPUT_DIR}/ ===")


if __name__ == "__main__":
    main()
