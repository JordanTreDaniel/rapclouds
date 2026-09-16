#!/usr/bin/env python3
"""
Color-Based Image Splitting Mode - Split a multi-color mask into separate
word clouds by color range. Each cloud captures one color range from the
original image, creating layered designs.

Unlike colorFromMask which samples exact pixel colors, this groups ALL
similar colors together into distinct layers.
"""
import os
import re
import time
import random
import numpy as np
from PIL import Image
from wordcloud import WordCloud, STOPWORDS

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
MASK_COLOR = os.path.join(MASKS_DIR, "jcole_color_mask.png")
MASK_ORIGINAL = os.path.join(MASKS_DIR, "jcole_color_original.png")

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

# Color ranges in HSV (H: 0-360, S: 0-100, V: 0-100)
# Note: OpenCV/PIL HSV uses H:0-180, S:0-255, V:0-255
# numpy/PIL ImageConvert uses H:0-360 normalized
COLOR_RANGES = {
    "blues": {
        "hue_range": (190, 260),
        "sat_min": 20,
        "val_min": 30,
        "colors": ["#58a6ff", "#79c0ff", "#a5d6ff", "#c9d1d9", "#4493f8"],
        "bg": "#0a0a1a",
        "label": "Blue Tones",
    },
    "reds": {
        "hue_range": [(0, 30), (330, 360)],
        "sat_min": 30,
        "val_min": 30,
        "colors": ["#ff0000", "#cc0000", "#ff3333", "#ff6666", "#990000"],
        "bg": "#0d0000",
        "label": "Red Tones",
    },
    "greens": {
        "hue_range": (60, 160),
        "sat_min": 15,
        "val_min": 25,
        "colors": ["#2ea043", "#3fb950", "#56d364", "#7ee787", "#1a7f37"],
        "bg": "#0a0d0a",
        "label": "Green Tones",
    },
    "skin_warm": {
        "hue_range": (10, 50),
        "sat_min": 30,
        "val_min": 40,
        "colors": ["#e8a87c", "#d4956b", "#c68642", "#8d5524", "#f0c8a0"],
        "bg": "#1a1008",
        "label": "Warm/Skin Tones",
    },
    "purples": {
        "hue_range": (260, 310),
        "sat_min": 20,
        "val_min": 25,
        "colors": ["#a855f7", "#9333ea", "#7c3aed", "#c084fc", "#6b21a8"],
        "bg": "#0d0a1a",
        "label": "Purple Tones",
    },
    "yellows": {
        "hue_range": (40, 70),
        "sat_min": 30,
        "val_min": 50,
        "colors": ["#fbbf24", "#f59e0b", "#eab308", "#fcd34d", "#b45309"],
        "bg": "#1a1508",
        "label": "Yellow Tones",
    },
}


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


def create_color_mask(mask_image_path, width, height, color_range):
    """
    Create a binary mask where only pixels matching the color range are drawable.
    
    Args:
        mask_image_path: path to the color source image
        width, height: output dimensions
        color_range: dict with hue_range, sat_min, val_min
    
    Returns:
        numpy array suitable for wordcloud mask (255=masked, 0=drawable)
    """
    img = Image.open(mask_image_path).convert("HSV")
    img = img.resize((width, height), Image.LANCZOS)
    arr = np.array(img)
    
    # PIL HSV: H is 0-255 (scaled from 0-360), S is 0-255, V is 0-255
    h = arr[:, :, 0].astype(float) * 360.0 / 255.0  # Normalize to 0-360
    s = arr[:, :, 1].astype(float) * 100.0 / 255.0   # Normalize to 0-100
    v = arr[:, :, 2].astype(float) * 100.0 / 255.0   # Normalize to 0-100
    
    # Create hue mask
    hue_ranges = color_range["hue_range"]
    if isinstance(hue_ranges[0], tuple):
        # Multiple hue ranges (e.g., reds wrapping around 0)
        hue_mask = np.zeros_like(h, dtype=bool)
        for h_min, h_max in hue_ranges:
            hue_mask |= (h >= h_min) & (h <= h_max)
    else:
        h_min, h_max = hue_ranges
        hue_mask = (h >= h_min) & (h <= h_max)
    
    # Apply saturation and value thresholds
    sat_mask = s >= color_range["sat_min"]
    val_mask = v >= color_range["val_min"]
    
    # Combined mask: True where pixels match the color range
    color_mask = hue_mask & sat_mask & val_mask
    
    # Convert to wordcloud format: 255 = masked (no words), 0 = drawable
    # So we INVERT: drawable areas = 0, masked areas = 255
    wc_mask = np.where(color_mask, 0, 255).astype(np.uint8)
    
    # Count drawable pixels
    drawable_pct = np.sum(color_mask) / color_mask.size * 100
    print(f"    Drawable area: {drawable_pct:.1f}% of image")
    
    return wc_mask


def generate_color_split_cloud(text, mask_path, output_path, font_path,
                               color_range, bg_color=None):
    """Generate a word cloud for one color range."""
    width, height = 1200, 1200
    
    # Create the color-specific mask
    mask_array = create_color_mask(mask_path, width, height, color_range)
    
    # Check if mask has any drawable area
    if np.sum(mask_array == 0) == 0:
        print(f"    No drawable pixels for this color range! Skipping.")
        return None
    
    # Use the color range's palette
    colors = color_range["colors"]
    bg = bg_color or color_range["bg"]
    
    wc = WordCloud(
        width=width, height=height,
        background_color=bg,
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
        mask=mask_array,
        color_func=lambda word, font_size, position, orientation, 
                       random_state=None, **kwargs: random.choice(colors),
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
                facecolor=bg)
    plt.close(fig)
    
    size = os.path.getsize(output_path)
    print(f"    {elapsed:.1f}s, {size/1024:.0f}KB")
    return output_path


def composite_layers(layer_paths, output_path):
    """
    Composite multiple transparent word cloud layers into one image.
    Later layers paint over earlier ones.
    """
    if not layer_paths:
        print("  No layers to composite!")
        return None
    
    # Load all layers
    layers = []
    for path in layer_paths:
        if path and os.path.exists(path):
            img = Image.open(path).convert("RGBA")
            layers.append(img)
    
    if not layers:
        return None
    
    # Create composite
    composite = Image.new("RGBA", layers[0].size, (0, 0, 0, 255))
    for layer in layers:
        composite = Image.alpha_composite(composite, layer)
    
    # Save as PNG
    composite.save(output_path, "PNG")
    size = os.path.getsize(output_path)
    print(f"  Composite saved: {output_path} ({size/1024:.0f}KB)")
    return output_path


def main():
    print("=== Color-Based Image Splitting Mode ===\n")
    
    text = load_all_lyrics()
    print(f"  Loaded {len(text.split())} words\n")
    
    # Use the original color image as source (the color_mask is just B&W)
    source_mask = MASK_ORIGINAL
    if not os.path.exists(source_mask):
        print(f"  Original color image not found: {source_mask}")
        source_mask = MASK_COLOR
        if not os.path.exists(source_mask):
            print(f"  Color mask not found: {source_mask}")
            print("  Falling back to silhouette mask")
            source_mask = MASK_SILHOUETTE
    
    print(f"  Source image: {source_mask}\n")
    
    # Generate a cloud for each color range
    generated_layers = []
    
    for name, color_range in COLOR_RANGES.items():
        print(f"--- {color_range['label']} ({name}) ---")
        out = os.path.join(OUTPUT_DIR, f"COLORSPLIT_{name}.png")
        result = generate_color_split_cloud(
            text, source_mask, out, FONT_BOLD, color_range
        )
        if result:
            generated_layers.append(result)
    
    # Try compositing layers (if PIL supports alpha_composite well)
    if len(generated_layers) > 1:
        print("\n--- Compositing layers ---")
        composite_path = os.path.join(OUTPUT_DIR, "COLORSPLIT_composite_all.png")
        # For compositing, we'd need transparent backgrounds
        # Let's create transparent versions first
        print("  (Layer compositing requires transparent backgrounds)")
        print("  Each layer is saved individually for manual compositing")
    
    print(f"\n=== DONE: Generated {len(generated_layers)} color-split clouds ===")
    print(f"  Output: {OUTPUT_DIR}/")
    
    # Print summary
    print("\n--- Summary ---")
    for name, color_range in COLOR_RANGES.items():
        path = os.path.join(OUTPUT_DIR, f"COLORSPLIT_{name}.png")
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  {color_range['label']}: {size/1024:.0f}KB")


if __name__ == "__main__":
    main()
