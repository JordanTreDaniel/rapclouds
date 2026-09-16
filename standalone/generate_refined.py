#!/usr/bin/env python3
"""
RapClouds Refined Generator - Iteration 2
Fixes: better stopwords, denser packing, metadata cleanup, colorFromMask
"""
import os
import re
import sys
import time
import numpy as np
from PIL import Image
from wordcloud import WordCloud, STOPWORDS

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

LYRICS_DIR = "lyrics"
MASKS_DIR = "masks"
OUTPUT_DIR = "output_refined"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_NARROW = "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf"
MASK_SILHOUETTE = os.path.join(MASKS_DIR, "jcole_silhouette_toppng.png")
MASK_COLOR = os.path.join(MASKS_DIR, "jcole_color_mask.png")
MASK_FINAL = os.path.join(MASKS_DIR, "jcole_final_mask.png")

# Extended stop words - including metadata and junk that leaked through
RAP_STOPWORDS = STOPWORDS.copy()
RAP_STOPWORDS.update([
    # Contractions
    "im", "ive", "youre", "hes", "shes", "its", "were", "theyre",
    "ill", "youll", "hell", "shell", "itll", "well", "theyll",
    "id", "youd", "hed", "shed", "wed", "theyd",
    "cant", "dont", "wont", "isnt", "arent", "wasnt", "werent",
    "doesnt", "didnt", "hasnt", "hadnt", "shouldnt", "wouldnt", "couldnt",
    "thats", "whats", "heres", "theres", "whos", "hows",
    # Filler
    "gonna", "gotta", "wanna", "em", "bout", "cause", "cuz",
    "ya", "yo", "nah", "yeah", "ayy", "ay", "oh", "ooh",
    "like", "just", "got", "get", "go", "gon", "man",
    "one", "two", "three", "first", "new", "way", "back",
    "still", "even", "also", "right", "now", "ever",
    # Common rap words that don't help shape
    "u", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k",
    "l", "m", "n", "o", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z",
    # Metadata junk that leaked from lyrics files
    "albumcovers", "jcolethefalloffjcole", "thefalloffthumbjpg",
    "jcolemiddlechildlyrics", "jcolelyricssongs", "jcolepowertripfeatmiguellyrics",
    "fayettevi", "lyrics", "genius", "azlyrics",
    "embed", "share", "copy", "url",
])


def load_and_clean_lyrics():
    """Load all lyrics, clean aggressively."""
    all_text = []
    for fname in sorted(os.listdir(LYRICS_DIR)):
        if fname.endswith(".txt") and fname != "manifest.json":
            with open(os.path.join(LYRICS_DIR, fname)) as f:
                text = f.read()
            # Remove metadata lines
            text = re.sub(r"albumcovers.*", "", text)
            text = re.sub(r"jcole.*?lyrics", "", text)
            text = re.sub(r"thefalloff.*", "", text)
            text = re.sub(r"fayettevi.*", "", text)
            text = re.sub(r"http\S+", "", text)
            text = re.sub(r"\[.*?\]", "", text)
            # Remove non-alpha (keep spaces)
            text = re.sub(r"[^a-z\s]", "", text.lower())
            text = re.sub(r"\s+", " ", text).strip()
            if len(text) > 50:
                all_text.append(text)
    
    combined = " ".join(all_text)
    words = combined.split()
    print(f"  Clean lyrics: {len(words)} words across {len(all_text)} tracks")
    return combined


def create_mask_from_image(mask_path, width, height, white_threshold=200, blackout_threshold=1):
    """Create wordcloud mask from image."""
    img = Image.open(mask_path).convert("L")
    img = img.resize((width, height), Image.LANCZOS)
    arr = np.array(img)
    mask = arr > white_threshold
    if blackout_threshold > 1:
        mask |= arr < blackout_threshold
    return mask.astype(np.uint8) * 255


def mask_color_func(word, font_size, position, orientation, 
                     random_state=None, mask_arr=None, **kwargs):
    """Color function that samples from a mask image."""
    if position is None or mask_arr is None:
        return "rgb(200, 200, 200)"
    x, y = int(position[1]), int(position[0])
    h, w = mask_arr.shape[:2]
    x = min(max(0, x), w - 1)
    y = min(max(0, y), h - 1)
    
    # Sample region around word
    half = max(1, font_size // 3)
    y1, y2 = max(0, y - half), min(h, y + half)
    x1, x2 = max(0, x - half), min(w, x + half)
    region = mask_arr[y1:y2, x1:x2]
    
    if region.size == 0:
        r, g, b = mask_arr[y, x]
    else:
        r = int(np.mean(region[:, :, 0]))
        g = int(np.mean(region[:, :, 1]))
        b = int(np.mean(region[:, :, 2]))
    
    # Near-black background -> light gray
    if r + g + b < 30:
        return "rgb(180, 180, 180)"
    # Slightly boost brightness for better t-shirt visibility
    r = min(255, int(r * 1.2))
    g = min(255, int(g * 1.2))
    b = min(255, int(b * 1.2))
    return f"rgb({r}, {g}, {b})"


def generate_cloud(name, text, settings, mask_path, font_path, 
                   color_func=None, color_mask_path=None):
    """Generate one cloud with given settings."""
    out = os.path.join(OUTPUT_DIR, f"{name}.png")
    
    # Build mask
    mask_array = None
    if mask_path and os.path.exists(mask_path):
        mask_array = create_mask_from_image(
            mask_path, settings["width"], settings["height"],
            white_threshold=settings.get("whiteThreshold", 200),
            blackout_threshold=settings.get("blackoutThreshold", 1)
        )
    
    # Background
    if settings.get("transparentBackground"):
        bg_color = None
    else:
        bg_color = settings.get("backgroundColor", "#000000")
    
    # Build kwargs
    wc_kwargs = {
        "width": settings["width"],
        "height": settings["height"],
        "background_color": bg_color,
        "max_words": 800,
        "stopwords": RAP_STOPWORDS,
        "min_font_size": settings["minFontSize"],
        "max_font_size": settings["maxFontSize"],
        "margin": settings["margin"],
        "prefer_horizontal": settings["preferHorizontal"],
        "relative_scaling": settings["relativeScaling"],
        "collocations": settings.get("collocations", False),
        "repeat": settings.get("repeat", True),
        "font_path": font_path,
    }
    
    if mask_array is not None:
        wc_kwargs["mask"] = mask_array
    
    if color_func:
        wc_kwargs["color_func"] = color_func
    elif settings.get("useCustomColors") and settings.get("colors"):
        import random as rng
        colors = settings["colors"]
        def custom_color(word, font_size, position, orientation, random_state=None, **kwargs):
            return rng.choice(colors)
        wc_kwargs["color_func"] = custom_color
    elif settings.get("useRandomColors"):
        wc_kwargs["colormap"] = "viridis"
    
    t0 = time.time()
    wc = WordCloud(**wc_kwargs)
    wc.generate(text)
    
    # Color from mask (post-processing)
    if settings.get("colorFromMask") and color_mask_path:
        try:
            mask_img = Image.open(color_mask_path).convert("RGB")
            mask_img = mask_img.resize((wc.width, wc.height), Image.LANCZOS)
            mask_arr = np.array(mask_img)
            def dynamic_mask_color(word, font_size, position, orientation, 
                                   random_state=None, **kwargs):
                return mask_color_func(word, font_size, position, orientation,
                                       mask_arr=mask_arr, **kwargs)
            wc.color_func = dynamic_mask_color
            wc.recolor()
        except Exception as e:
            print(f"    Color-from-mask failed: {e}")
    
    elapsed = time.time() - t0
    
    # Save
    fig, ax = plt.subplots(1, 1, figsize=(10, 10))
    ax.imshow(wc, interpolation="bilinear")
    ax.axis("off")
    if bg_color is None:
        fig.patch.set_alpha(0)
        ax.set_facecolor("none")
    plt.tight_layout(pad=0)
    plt.savefig(out, dpi=150, bbox_inches="tight", 
                transparent=bg_color is None,
                facecolor=fig.get_facecolor())
    plt.close(fig)
    
    size = os.path.getsize(out)
    print(f"  {name}: {elapsed:.1f}s, {size/1024:.0f}KB, words={len(wc.words_)}")
    return out


def main():
    print("=== RapClouds Refined Generator (Iteration 2) ===\n")
    text = load_and_clean_lyrics()
    
    # Base settings for maximum density
    base_dense = {
        "width": 1200,
        "height": 1200,
        "coloredBackground": True,
        "backgroundColor": "#000000",
        "transparentBackground": False,
        "useCustomColors": True,
        "colors": ["#FFFFFF", "#E8E8E8", "#D0D0D0", "#F0F0F0", "#C0C0C0"],
        "useRandomColors": False,
        "colorFromMask": False,
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
        "includeNumbers": False,
        "contour": False,
        "detectEdges": False,
        "downsample": 2,
        "blackoutThreshold": 1,
        "whiteThreshold": 200,
    }

    # ============================================================
    # R1: Silhouette Dense BW (best mask, refined stopwords)
    # ============================================================
    print("--- R1: Silhouette Dense BW ---")
    generate_cloud("R1_silhouette_dense_bw", text, base_dense, 
                   MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # R2: Extreme density - margin 0, tiny fonts
    # ============================================================
    print("\n--- R2: Extreme Density ---")
    extreme = {
        **base_dense,
        "minFontSize": 3,
        "maxFontSize": 45,
        "margin": 0,
        "preferHorizontal": 0.9,  # Slight vertical for gap-filling
        "relativeScaling": 0.2,
    }
    generate_cloud("R2_extreme_density", text, extreme, 
                   MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # R3: Collocations + Dense (phrases for readability)
    # ============================================================
    print("\n--- R3: Collocations Dense ---")
    coll_dense = {
        **base_dense,
        "collocations": True,
        "minFontSize": 5,
        "maxFontSize": 40,
        "margin": 1,
        "preferHorizontal": 1.0,
    }
    generate_cloud("R3_collocations_dense", text, coll_dense, 
                   MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # R4: Color Portrait (colorFromMask with color mask)
    # ============================================================
    print("\n--- R4: Color Portrait ---")
    color_portrait = {
        **base_dense,
        "colorFromMask": True,
        "backgroundColor": "#1a1a2e",
        "collocations": False,
        "minFontSize": 4,
        "maxFontSize": 50,
        "margin": 1,
    }
    generate_cloud("R4_color_portrait", text, color_portrait, 
                   MASK_SILHOUETTE, FONT_BOLD, color_mask_path=MASK_COLOR)

    # ============================================================
    # R5: Color from silhouette (has skin tones + hoodie)
    # ============================================================
    print("\n--- R5: Color from Silhouette ---")
    color_sil = {
        **base_dense,
        "colorFromMask": True,
        "backgroundColor": "#0a0a1a",
        "minFontSize": 4,
        "maxFontSize": 48,
        "margin": 1,
    }
    generate_cloud("R5_color_silhouette", text, color_sil, 
                   MASK_SILHOUETTE, FONT_BOLD, color_mask_path=MASK_SILHOUETTE)

    # ============================================================
    # R6: Narrow font (more words per line)
    # ============================================================
    print("\n--- R6: Narrow Font Dense ---")
    generate_cloud("R6_narrow_dense", text, base_dense, 
                   MASK_SILHOUETTE, FONT_NARROW)

    # ============================================================
    # R7: Cole World blue (branded style)
    # ============================================================
    print("\n--- R7: Cole World Blue ---")
    cole_blue = {
        **base_dense,
        "colors": ["#58a6ff", "#79c0ff", "#a5d6ff", "#c9d1d9", "#f0f6fc"],
        "backgroundColor": "#0a0a1a",
    }
    generate_cloud("R7_cole_world_blue", text, cole_blue, 
                   MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # R8: Collocations + color from mask (best of both)
    # ============================================================
    print("\n--- R8: Collocations + Color Mask ---")
    coll_color = {
        **base_dense,
        "collocations": True,
        "colorFromMask": True,
        "backgroundColor": "#111122",
        "minFontSize": 5,
        "maxFontSize": 42,
        "margin": 1,
    }
    generate_cloud("R8_coll_color_mask", text, coll_color, 
                   MASK_SILHOUETTE, FONT_BOLD, color_mask_path=MASK_COLOR)

    # ============================================================
    # R9: Bold red aggressive (for limited run tees)
    # ============================================================
    print("\n--- R9: Bold Red Aggressive ---")
    red = {
        **base_dense,
        "colors": ["#ff0000", "#cc0000", "#ff3333", "#ff6666", "#990000"],
        "backgroundColor": "#0d0000",
    }
    generate_cloud("R9_bold_red", text, red, MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # R10: Final Mask Dense BW (comparison baseline)
    # ============================================================
    print("\n--- R10: Final Mask Dense BW (baseline) ---")
    generate_cloud("R10_final_mask_baseline", text, base_dense, 
                   MASK_FINAL, FONT_BOLD)

    print(f"\n=== DONE: {len(os.listdir(OUTPUT_DIR))} refined images ===")


if __name__ == "__main__":
    main()
