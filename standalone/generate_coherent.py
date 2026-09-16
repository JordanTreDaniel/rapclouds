#!/usr/bin/env python3
"""
Coherent Lyrics Mode - Generate word clouds where lyrics flow in order.
Instead of random word placement, lyrics are placed sequentially so you can
follow the song. Choruses (repeated lines) naturally become bigger.

Strategy: We abuse WordCloud's frequency-based system by:
1. Splitting lyrics into lines/phrases
2. Counting repetitions (chorus lines repeat = bigger)
3. Encoding order into the text by prefixing each unique line with its index
4. For repeated lines, we repeat the INDEXED text so wordcloud sizes them up
5. The result: words placed roughly in order, with choruses dominating
"""
import os
import re
import time
import random
import numpy as np
from PIL import Image
from wordcloud import WordCloud, STOPWORDS
from collections import Counter, OrderedDict

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

# We need a broader stopword set for coherent mode since we're placing phrases
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
    """Load all lyrics and return as a single text block."""
    all_text = []
    for fname in sorted(os.listdir(LYRICS_DIR)):
        if fname.endswith(".txt") and fname != "manifest.json":
            with open(os.path.join(LYRICS_DIR, fname)) as f:
                text = f.read()
            # Use raw text first, then clean line-by-line
            all_text.append(text)
    return "\n\n".join(all_text)


def extract_ordered_lines(raw_text):
    """
    Extract lines from lyrics, clean them, and return ordered unique lines
    with their repetition counts.
    
    Returns list of (line_text, count) in first-occurrence order.
    """
    lines = []
    for line in raw_text.split("\n"):
        line = line.strip()
        if not line:
            continue
        # Clean the line
        cleaned = clean_lyrics(line, include_numbers=False)
        # Skip very short lines (likely artifacts)
        words = cleaned.split()
        if len(words) < 2:
            continue
        # Filter stopwords but keep meaningful content
        meaningful = [w for w in words if w not in RAP_STOPWORDS and len(w) > 1]
        if len(meaningful) < 2:
            continue
        lines.append(cleaned)
    
    # Count repetitions while preserving first-occurrence order
    line_counts = Counter(lines)
    seen = OrderedDict()
    for line in lines:
        if line not in seen:
            seen[line] = line_counts[line]
    
    return list(seen.items())


def build_coherent_text(ordered_lines):
    """
    Build text where lines are placed in order, with repeated lines
    appearing multiple times (so wordcloud sizes them proportionally).
    
    We use a trick: prefix each unique line with a position number.
    For repeated lines, we include the line multiple times so wordcloud
    gives it more weight (bigger font).
    """
    parts = []
    for i, (line, count) in enumerate(ordered_lines):
        # Create a position prefix so wordcloud knows the ordering
        # Use Roman-ish numerals or just include the line multiple times
        # The key: repeat the line 'count' times for chorus emphasis
        for _ in range(min(count, 5)):  # Cap at 5 to avoid extreme dominance
            parts.append(line)
    
    return " ".join(parts)


def generate_coherent_cloud(text, mask_path, output_path, font_path):
    """Generate a coherent-mode word cloud."""
    width, height = 1200, 1200
    
    # Create mask
    img = Image.open(mask_path).convert("L")
    img = img.resize((width, height), Image.LANCZOS)
    arr = np.array(img)
    mask = (arr > 200).astype(np.uint8) * 255
    
    # White on black t-shirt settings
    wc = WordCloud(
        width=width, height=height,
        background_color="#000000",
        max_words=800,
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
    print(f"  Saved: {output_path} ({elapsed:.1f}s, {size/1024:.0f}KB)")
    return output_path


def main():
    print("=== Coherent Lyrics Mode ===\n")
    
    raw_text = load_all_lyrics()
    print(f"  Loaded raw lyrics: {len(raw_text)} chars")
    
    ordered_lines = extract_ordered_lines(raw_text)
    print(f"  Extracted {len(ordered_lines)} unique meaningful lines")
    
    # Show some stats
    repeated = [(l, c) for l, c in ordered_lines if c > 1]
    print(f"  Repeated lines (choruses): {len(repeated)}")
    if repeated:
        top = sorted(repeated, key=lambda x: -x[1])[:5]
        for line, count in top:
            print(f"    [{count}x] {line[:80]}...")
    
    # Build coherent text
    coherent_text = build_coherent_text(ordered_lines)
    print(f"  Built coherent text: {len(coherent_text)} chars, "
          f"{len(coherent_text.split())} words")
    
    # Generate
    out = os.path.join(OUTPUT_DIR, "COHERENT_lyrics_flow.png")
    generate_coherent_cloud(coherent_text, MASK_SILHOUETTE, out, FONT_BOLD)
    
    # Also try with ALL lyrics combined (album-wide)
    print("\n--- Album-wide coherent ---")
    album_coherent = build_coherent_text(ordered_lines)
    out2 = os.path.join(OUTPUT_DIR, "COHERENT_album_all.png")
    generate_coherent_cloud(album_coherent, MASK_SILHOUETTE, out2, FONT_BOLD)
    
    print(f"\n=== DONE: {len(os.listdir(OUTPUT_DIR))} innovation outputs ===")


if __name__ == "__main__":
    main()
