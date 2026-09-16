#!/usr/bin/env python3
"""
Phrase N-Gram Optimizer

Tests different max n-gram lengths (3, 4, 5, 6, 8, 10, 12) to find the
optimal phrase length for word cloud generation. For each max_n value:
1. Extracts all n-grams from 2 to max_n words
2. Keeps only those appearing 2+ times
3. Longer n-grams take priority (no overlapping shorter matches)
4. Replaces with underscored tokens
5. Counts phrases found and generates word cloud
"""

import os
import re
import time
import random
import numpy as np
from PIL import Image
from wordcloud import WordCloud, STOPWORDS
from collections import Counter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from generate_cloud import clean_lyrics

LYRICS_DIR = "lyrics"
MASKS_DIR = "masks"
OUTPUT_DIR = "output_innovations"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MASK_SILHOUETTE = os.path.join(MASKS_DIR, "jcole_silhouette_toppng.png")

# Dense settings for all test clouds
WIDTH, HEIGHT = 1200, 1200

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
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k",
    "l", "m", "n", "o", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z",
    "u",
])


def load_all_lyrics():
    """Load and combine all lyrics."""
    all_text = []
    for fname in sorted(os.listdir(LYRICS_DIR)):
        if fname.endswith(".txt") and fname != "manifest.json":
            with open(os.path.join(LYRICS_DIR, fname)) as f:
                text = f.read()
            cleaned = clean_lyrics(text, include_numbers=False)
            if len(cleaned.split()) > 20:
                all_text.append(cleaned)
    return " ".join(all_text)


def extract_phrases_for_max_n(text, max_n, min_count=2, min_words=2):
    """
    Extract repeating n-grams from 2 to max_n words.
    Longer n-grams take priority over shorter ones.
    Returns: (phrase_map, phrase_counts_dict)
    """
    words = text.split()
    n_words = len(words)

    # Count all n-grams using sliding windows
    ngram_counts = Counter()

    for n in range(min_words, max_n + 1):
        for i in range(n_words - n + 1):
            ngram = words[i:i+n]
            # Quick filter: skip all-stopword ngrams
            non_stop = sum(1 for w in ngram if w not in RAP_STOPWORDS)
            if non_stop < 1:
                continue
            ngram_counts[tuple(ngram)] += 1

    # Filter to repeated phrases
    repeated = {ngram: count for ngram, count in ngram_counts.items()
                if count >= min_count}

    if not repeated:
        return {}, {}

    # Sort by length (longest first), then count
    sorted_phrases = sorted(repeated.keys(), key=lambda x: (-len(x), -repeated[x]))

    phrase_map = {}
    for ngram in sorted_phrases:
        underscored = "_".join(ngram)
        original = " ".join(ngram)
        phrase_map[underscored] = original

    return phrase_map, repeated


def replace_phrases_greedy(text, phrase_map):
    """
    Replace phrases in text with underscored tokens.
    Greedy: longest phrases first, no overlapping.
    """
    words = text.split()
    result = list(words)
    replacements_made = 0

    # Sort by phrase length (longest first)
    sorted_phrases = sorted(phrase_map.keys(), key=lambda x: -len(x.split("_")))

    # Track replaced positions
    replaced = set()

    for phrase_underscored in sorted_phrases:
        phrase_words = phrase_underscored.split("_")
        n = len(phrase_words)

        i = 0
        while i <= len(result) - n:
            # Check if this window matches and isn't already replaced
            if all(i + j not in replaced for j in range(n)):
                if all(result[i + j] == phrase_words[j] for j in range(n)):
                    # Replace the phrase
                    result[i:i+n] = [phrase_underscored]
                    replacements_made += 1
                    # Mark the new position as replaced
                    replaced.add(i)
                    continue
            i += 1

    return " ".join(result), replacements_made


def create_mask(mask_path, width, height):
    """Create wordcloud mask from image."""
    img = Image.open(mask_path).convert("L")
    img = img.resize((width, height), Image.LANCZOS)
    arr = np.array(img)
    mask = (arr > 200).astype(np.uint8) * 255
    return mask


def generate_test_cloud(text, mask, output_path, font_path, title="Test"):
    """Generate a word cloud with dense settings."""
    wc = WordCloud(
        width=WIDTH,
        height=HEIGHT,
        background_color="#000000",
        max_words=500,
        stopwords=RAP_STOPWORDS,
        min_font_size=4,
        max_font_size=50,
        margin=1,
        prefer_horizontal=1.0,
        relative_scaling=0.0,
        collocations=False,
        repeat=True,
        font_path=font_path,
        mask=mask,
        color_func=lambda word, font_size, position, orientation,
                       random_state=None, **kwargs: random.choice(
            ["#FFFFFF", "#E8E8E8", "#D0D0D0", "#F0F0F0", "#C0C0C0"]
        ),
    )

    t0 = time.time()
    wc.generate(text)
    elapsed = time.time() - t0

    # Save
    fig, ax = plt.subplots(1, 1, figsize=(10, 10))
    ax.imshow(wc, interpolation="bilinear")
    ax.axis("off")
    plt.tight_layout(pad=0)
    plt.savefig(output_path, dpi=150, bbox_inches="tight",
                facecolor="#000000")
    plt.close(fig)

    size = os.path.getsize(output_path)
    return elapsed, size, len(wc.words_)


def main():
    print("=" * 60)
    print("  PHRASE N-GRAM OPTIMIZER")
    print("=" * 60)

    # Load lyrics
    print("\n1. Loading lyrics...")
    text = load_all_lyrics()
    words = text.split()
    print(f"   Total words: {len(words)}")

    # Create mask
    print("\n2. Creating mask...")
    mask = create_mask(MASK_SILHOUETTE, WIDTH, HEIGHT)
    drawable_pixels = np.sum(mask == 0)
    print(f"   Drawable pixels: {drawable_pixels}")

    # Test different max_n values
    test_values = [3, 4, 5, 6, 8, 10, 12]
    results = []

    print("\n3. Testing different n-gram lengths...")
    for max_n in test_values:
        print(f"\n   --- max_n = {max_n} ---")

        # Extract phrases
        phrase_map, phrase_counts = extract_phrases_for_max_n(
            text, max_n, min_count=2, min_words=2
        )

        if not phrase_map:
            print(f"   No phrases found for max_n={max_n}")
            results.append({
                "max_n": max_n,
                "phrases": 0,
                "replacements": 0,
                "elapsed": 0,
                "size": 0,
                "words": 0,
                "top_phrases": [],
            })
            continue

        # Replace phrases
        phrase_text, replacements = replace_phrases_greedy(text, phrase_map)
        phrase_tokens = len(phrase_text.split())

        print(f"   Phrases found: {len(phrase_map)}")
        print(f"   Replacements made: {replacements}")
        print(f"   Tokens after replacement: {phrase_tokens} (from {len(words)})")

        # Show top phrases
        top = sorted(phrase_map.items(), key=lambda x: -phrase_counts.get(x[1], 0))[:5]
        for underscored, original in top:
            count = phrase_counts.get(original, 0)
            print(f"     [{count}x] {original}")

        # Generate word cloud
        output_path = os.path.join(OUTPUT_DIR, f"PHRASE_TEST_n{max_n}.png")
        elapsed, size, words_drawn = generate_test_cloud(
            phrase_text, mask, output_path, FONT_BOLD,
            title=f"Phrases (max_n={max_n})"
        )

        results.append({
            "max_n": max_n,
            "phrases": len(phrase_map),
            "replacements": replacements,
            "elapsed": elapsed,
            "size": size,
            "words": words_drawn,
            "top_phrases": list(phrase_map.items())[:5],
        })

        print(f"   Saved: {output_path}")
        print(f"   Generated in {elapsed:.1f}s, {size/1024:.0f}KB, {words_drawn} unique words")

    # Summary
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print(f"  {'max_n':>6} | {'Phrases':>8} | {'Replace':>8} | {'Words':>6} | {'Time':>6} | {'Size':>8}")
    print("  " + "-" * 60)
    for r in results:
        print(f"  {r['max_n']:>6} | {r['phrases']:>8} | {r['replacements']:>8} | {r['words']:>6} | {r['elapsed']:>5.1f}s | {r['size']/1024:>7.0f}KB")

    # Find optimal
    if results:
        # Best is most words drawn (densest cloud)
        best = max(results, key=lambda x: x["words"])
        print(f"\n  Best: max_n={best['max_n']} ({best['words']} unique words drawn)")

    print(f"\n  Output: {OUTPUT_DIR}/PHRASE_TEST_n*.png")
    print("=" * 60)


if __name__ == "__main__":
    main()
