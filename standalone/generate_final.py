#!/usr/bin/env python3
"""
RapClouds Final Generation - Clean lyrics, optimized settings.
Focus on the best 5 designs for J. Cole The Fall-Off t-shirts.
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

LYRICS_DIR = "lyrics"
MASKS_DIR = "masks"
OUTPUT_DIR = "output_final"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Import the FIXED clean_lyrics from generate_cloud
from generate_cloud import clean_lyrics

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_NARROW = "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf"
MASK_SILHOUETTE = os.path.join(MASKS_DIR, "jcole_silhouette_toppng.png")
MASK_COLOR = os.path.join(MASKS_DIR, "jcole_color_mask.png")
MASK_FINAL = os.path.join(MASKS_DIR, "jcole_final_mask.png")

# Extended stop words
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
    # Single letters (not useful in word clouds)
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k",
    "l", "m", "n", "o", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z",
    "u",
])


def load_all_lyrics():
    """Load and combine all cleaned lyrics using the FIXED clean_lyrics."""
    all_text = []
    for fname in sorted(os.listdir(LYRICS_DIR)):
        if fname.endswith(".txt") and fname != "manifest.json":
            with open(os.path.join(LYRICS_DIR, fname)) as f:
                text = f.read()
            cleaned = clean_lyrics(text, include_numbers=False)
            if len(cleaned.split()) > 20:
                all_text.append(cleaned)
    combined = " ".join(all_text)
    words = combined.split()
    # Final safety: remove any remaining long tokens
    words = [w for w in words if len(w) <= 15]
    result = " ".join(words)
    print(f"  Clean lyrics: {len(words)} words across {len(all_text)} tracks")
    return result


def create_mask(mask_path, width, height, white_threshold=200, blackout_threshold=1):
    """Create wordcloud-compatible numpy mask from an image."""
    img = Image.open(mask_path).convert("L")
    img = img.resize((width, height), Image.LANCZOS)
    arr = np.array(img)
    mask = arr > white_threshold
    if blackout_threshold > 1:
        mask |= arr < blackout_threshold
    return mask.astype(np.uint8) * 255


def generate(name, text, settings, mask_path, font_path,
             custom_color_func=None, mask_color_path=None):
    """Generate one word cloud."""
    out = os.path.join(OUTPUT_DIR, f"{name}.png")
    
    # Build mask
    mask_array = None
    if mask_path and os.path.exists(mask_path):
        mask_array = create_mask(
            mask_path, settings["width"], settings["height"],
            white_threshold=settings.get("whiteThreshold", 200),
            blackout_threshold=settings.get("blackoutThreshold", 1)
        )
    
    # Background
    bg_color = settings.get("backgroundColor", "#000000")
    if settings.get("transparentBackground"):
        bg_color = None
    
    # Build WordCloud kwargs
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
    
    if custom_color_func:
        wc_kwargs["color_func"] = custom_color_func
    elif settings.get("useCustomColors") and settings.get("colors"):
        colors = settings["colors"]
        def pick_color(word, font_size, position, orientation, random_state=None, **kwargs):
            return random.choice(colors)
        wc_kwargs["color_func"] = pick_color
    
    t0 = time.time()
    wc = WordCloud(**wc_kwargs)
    wc.generate(text)
    
    # Apply color from mask (post-processing)
    if mask_color_path and os.path.exists(mask_color_path):
        try:
            mask_img = Image.open(mask_color_path).convert("RGB")
            mask_img = mask_img.resize((wc.width, wc.height), Image.LANCZOS)
            mask_arr = np.array(mask_img)
            
            def sample_mask_color(word, font_size, position, orientation,
                                  random_state=None, **kwargs):
                if position is None:
                    return "rgb(200, 200, 200)"
                x, y = int(position[1]), int(position[0])
                h, w = mask_arr.shape[:2]
                x = min(max(0, x), w - 1)
                y = min(max(0, y), h - 1)
                
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
                
                if r + g + b < 30:
                    return "rgb(180, 180, 180)"
                r = min(255, int(r * 1.15))
                g = min(255, int(g * 1.15))
                b = min(255, int(b * 1.15))
                return f"rgb({r}, {g}, {b})"
            
            wc.color_func = sample_mask_color
            wc.recolor()
        except Exception as e:
            print(f"    Color-from-mask failed: {e}")
    
    elapsed = time.time() - t0
    
    # Save with matplotlib
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
    print(f"  {name}: {elapsed:.1f}s, {size/1024:.0f}KB")
    return out


def main():
    print("=== RapClouds Final Generation ===\n")
    text = load_all_lyrics()
    
    # Common dense settings
    W, H = 1200, 1200
    
    # ============================================================
    # FINAL 1: Silhouette Dense BW - White on Black T-Shirt
    # Best balance of density + readability + shape visibility
    # ============================================================
    print("--- FINAL 1: Silhouette Dense BW ---")
    s1 = {
        "width": W, "height": H,
        "coloredBackground": True, "backgroundColor": "#000000",
        "transparentBackground": False,
        "useCustomColors": True,
        "colors": ["#FFFFFF", "#E8E8E8", "#D0D0D0", "#F0F0F0", "#C0C0C0"],
        "useRandomColors": False, "colorFromMask": False,
        "maskDesired": True,
        "preferHorizontal": 1.0, "relativeScaling": 0.0,
        "minFontSize": 4, "maxFontSize": 50,
        "margin": 1, "repeat": True,
        "collocations": False, "includeNumbers": False,
        "contour": False, "detectEdges": False,
        "blackoutThreshold": 1, "whiteThreshold": 200,
    }
    generate("FINAL1_silhouette_bw", text, s1, MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # FINAL 2: Collocations BW - Phrases for readability
    # ============================================================
    print("\n--- FINAL 2: Collocations BW ---")
    s2 = {
        **s1,
        "collocations": True,
        "minFontSize": 5, "maxFontSize": 42,
        "margin": 2,
    }
    generate("FINAL2_collocations_bw", text, s2, MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # FINAL 3: Color Portrait - Words colored like the face
    # ============================================================
    print("\n--- FINAL 3: Color Portrait ---")
    s3 = {
        **s1,
        "backgroundColor": "#111122",
        "colorFromMask": False,  # We'll apply in post
    }
    generate("FINAL3_color_portrait", text, s3, MASK_SILHOUETTE, FONT_BOLD,
             mask_color_path=MASK_COLOR)

    # ============================================================
    # FINAL 4: Cole World Blue - Branded style
    # ============================================================
    print("\n--- FINAL 4: Cole World Blue ---")
    s4 = {
        **s1,
        "backgroundColor": "#0a0a1a",
        "colors": ["#58a6ff", "#79c0ff", "#a5d6ff", "#c9d1d9", "#f0f6fc"],
        "colorFromMask": False,
    }
    generate("FINAL4_cole_world_blue", text, s4, MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # FINAL 5: Bold Red - Aggressive limited run
    # ============================================================
    print("\n--- FINAL 5: Bold Red ---")
    s5 = {
        **s1,
        "backgroundColor": "#0d0000",
        "colors": ["#ff0000", "#cc0000", "#ff3333", "#ff6666", "#990000"],
        "colorFromMask": False,
    }
    generate("FINAL5_bold_red", text, s5, MASK_SILHOUETTE, FONT_BOLD)

    # ============================================================
    # FINAL 6: Color from Silhouette (skin tones + hoodie)
    # ============================================================
    print("\n--- FINAL 6: Color from Silhouette ---")
    s6 = {
        **s1,
        "backgroundColor": "#0a0a1a",
        "colorFromMask": False,
    }
    generate("FINAL6_color_silhouette", text, s6, MASK_SILHOUETTE, FONT_BOLD,
             mask_color_path=MASK_SILHOUETTE)

    print(f"\n=== DONE: {len(os.listdir(OUTPUT_DIR))} final images in {OUTPUT_DIR}/ ===")


if __name__ == "__main__":
    main()
