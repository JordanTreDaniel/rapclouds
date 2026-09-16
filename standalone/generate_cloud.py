#!/usr/bin/env python3
"""
RapClouds Standalone Generator
Generates word cloud images from song lyrics, shaped by mask images.
Replicates the settings model from the full RapClouds application.
"""

import os
import re
import json
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from wordcloud import WordCloud, STOPWORDS
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt


# ─── Default Settings (from RapClouds RapCloudSettingsSchema) ───────────────
DEFAULT_SETTINGS = {
    "width": 1000,
    "height": 1000,
    "backgroundColor": "#000000",
    "coloredBackground": True,
    "transparentBackground": False,
    "maskDesired": True,
    "maskAsBackground": False,
    "maskAsWords": False,
    "colorFromMask": False,
    "useCustomColors": False,
    "useRandomColors": False,
    "colors": [],
    "contour": False,
    "contourColor": "#000000",
    "contourWidth": 3,
    "detectEdges": False,
    "minFontSize": 4,
    "maxFontSize": 60,
    "fontDesired": False,
    "currentFontName": None,
    "currentFontVariantIdx": 0,
    "margin": 2,
    "preferHorizontal": 0.7,
    "relativeScaling": 0.5,
    "repeat": True,
    "collocations": False,
    "includeNumbers": True,
    "fadeCloud": False,
    "cloudOpacity": 255,
    "downsample": 2,
    "blackoutThreshold": 1,
    "whiteThreshold": 200,
    "addWatermark": False,
}

# Extended stop words (common rap filler + standard)
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
    "like", "just", "got", "get", "go", "gon", "man", "shit",
    "fuck", "bitch", "nigga", "niggas", "huh", "uh", "ah",
    "one", "two", "three", "first", "new", "way", "back",
    "still", "even", "also", "right", "now", "ever",
    # Scraped metadata artifacts that survive cleaning
    "fayettevi", "jcolelyricssongs", "jcolemiddlechildlyrics",
    "jcolepowertripllyrics", "jcolepowertripfeatmiguellyrics",
    "albumcovers", "thumbjpg", "lyrics", "suggesteditsong",
    "fayettevi",  # Spelled-out "Fayetteville" in lyrics
])


def load_lyrics(filepath):
    """Load lyrics from a text file."""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def load_lyrics_from_string(lyrics_text):
    """Accept raw lyrics string."""
    return lyrics_text


def clean_lyrics(lyrics, include_numbers=True):
    """Clean lyrics for word cloud generation.
    
    IMPORTANT: Remove metadata/artifacts BEFORE stripping non-alpha chars,
    otherwise things like 'albumcovers26jcolethefalloff' become single tokens.
    """
    text = lyrics.lower()
    # Remove annotations, stage directions
    text = re.sub(r"\[.*?\]", "", text)
    # Remove URLs
    text = re.sub(r"http\S+", "", text)
    # Remove scraped metadata (BEFORE stripping non-alpha)
    text = re.sub(r"albumcovers?\w*thumbjpg\w*", "", text)
    text = re.sub(r"suggesteditsong\w+lyrics", "", text)
    text = re.sub(r"falloffjcole\w+lyrics", "", text)
    text = re.sub(r"jcole\w*lyrics\w*", "", text)
    text = re.sub(r"jcolelyricssongs", "", text)
    text = re.sub(r"fayettevi\w*", "", text)
    text = re.sub(r"algorithm\s*moderated", "", text)
    text = re.sub(r"streaming\s*service\s*automated", "", text)
    text = re.sub(r"shark\s*infested", "", text)
    # Remove web page metadata appended to lyrics
    text = re.sub(r"are these lyrics accurate.*", "", text)
    text = re.sub(r"written\s*##.*", "", text)
    text = re.sub(r"keep exploring.*", "", text)
    text = re.sub(r"more j\.? cole songs.*", "", text)
    text = re.sub(r"browse all.*", "", text)
    text = re.sub(r"next track.*", "", text)
    text = re.sub(r"on the fall-off.*", "", text)
    text = re.sub(r"all j\.? cole songs.*", "", text)
    text = re.sub(r"looks right.*", "", text)
    text = re.sub(r"needs a fix.*", "", text)
    # Generic: remove lines that are clearly metadata (short, contain 'lyrics' alone)
    text = re.sub(r"\blyrics\b", "", text)
    # Remove non-alpha chars (keep spaces)
    if not include_numbers:
        text = re.sub(r"[^a-z\s]", "", text)
    else:
        text = re.sub(r"[^a-z0-9\s]", "", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Filter out any remaining long tokens (>15 chars = metadata artifact)
    words = text.split()
    words = [w for w in words if len(w) <= 15]
    return " ".join(words)


def create_mask_from_image(mask_path, width, height, white_threshold=200, blackout_threshold=1):
    """
    Create a numpy mask array from an image.
    White/bright areas become masked (no words drawn there).
    Dark areas become drawable.
    """
    img = Image.open(mask_path).convert("L")  # Grayscale
    img = img.resize((width, height), Image.LANCZOS)

    arr = np.array(img)

    # Create mask: True where words should NOT be drawn (bright areas)
    mask = arr > white_threshold

    # Also mask out very dark areas if needed
    if blackout_threshold > 1:
        mask |= arr < blackout_threshold

    return mask.astype(np.uint8) * 255  # wordcloud expects 255=masked


def generate_wordcloud(
    lyrics_text,
    settings=None,
    mask_path=None,
    output_path="rapcloud.png",
    font_path=None,
):
    """
    Generate a word cloud image from lyrics text.

    Args:
        lyrics_text: Raw lyrics string
        settings: Dict of cloud settings (uses defaults if None)
        mask_path: Path to mask image (J. Cole face silhouette)
        output_path: Where to save the PNG
        font_path: Path to a .ttf font file
    """
    settings = {**DEFAULT_SETTINGS, **(settings or {})}

    # Clean the lyrics
    text = clean_lyrics(lyrics_text, include_numbers=settings["includeNumbers"])

    if not text.strip():
        print("⚠️  No words to generate cloud from!")
        return None

    # Create mask if provided
    mask_array = None
    if mask_path and os.path.exists(mask_path):
        mask_array = create_mask_from_image(
            mask_path,
            settings["width"],
            settings["height"],
            white_threshold=settings["whiteThreshold"],
            blackout_threshold=settings["blackoutThreshold"],
        )

    # Determine background color
    if settings["transparentBackground"]:
        background_color = None
    elif settings["coloredBackground"]:
        background_color = settings["backgroundColor"]
    else:
        background_color = "white"

    # Build word cloud kwargs
    wc_kwargs = {
        "width": settings["width"],
        "height": settings["height"],
        "background_color": background_color,
        "max_words": 500,
        "stopwords": RAP_STOPWORDS,
        "min_font_size": settings["minFontSize"],
        "max_font_size": settings["maxFontSize"],
        "margin": settings["margin"],
        "prefer_horizontal": settings["preferHorizontal"],
        "relative_scaling": settings["relativeScaling"],
        "collocations": settings["collocations"],
        "repeat": settings["repeat"],
    }

    if mask_array is not None:
        wc_kwargs["mask"] = mask_array

    if font_path and os.path.exists(font_path):
        wc_kwargs["font_path"] = font_path

    # Color function
    if settings["useCustomColors"] and settings["colors"]:
        colors = settings["colors"]
        def color_func(word, font_size, position, orientation, random_state=None, **kwargs):
            import random
            return random.choice(colors)
        wc_kwargs["color_func"] = color_func
    elif settings["useRandomColors"]:
        wc_kwargs["colormap"] = "viridis"
    else:
        wc_kwargs["colormap"] = None  # Will use default or mask colors

    # Generate the cloud
    wc = WordCloud(**wc_kwargs)
    wc.generate(text)

    # Post-processing: color from mask
    if settings["colorFromMask"] and mask_path and os.path.exists(mask_path):
        _recolor_from_mask(wc, mask_path, settings)

    # Save
    fig, ax = plt.subplots(1, 1, figsize=(10, 10))
    ax.imshow(wc, interpolation="bilinear")
    ax.axis("off")

    if background_color is None:
        fig.patch.set_alpha(0)
        ax.set_facecolor("none")

    plt.tight_layout(pad=0)
    plt.savefig(output_path, dpi=150, bbox_inches="tight", transparent=background_color is None)
    plt.close(fig)

    print(f"  💾 Saved: {output_path}")
    return output_path


def _recolor_from_mask(wc, mask_path, settings):
    """Recolor words based on the mask image colors.
    
    For each word, sample the average color from the region of the mask
    that the word occupies. This makes the word cloud look like the
    original image when viewed from a distance.
    """
    try:
        mask_img = Image.open(mask_path).convert("RGB")
        mask_img = mask_img.resize((wc.width, wc.height), Image.LANCZOS)
        mask_arr = np.array(mask_img)

        # Build a new color_func that samples from the mask
        def mask_color_func(word, font_size, position, orientation,
                           random_state=None, **kwargs):
            if position is None:
                return "rgb(128, 128, 128)"
            x, y = int(position[1]), int(position[0])
            # Clamp to image bounds
            x = min(max(0, x), wc.width - 1)
            y = min(max(0, y), wc.height - 1)
            # Sample a small region around the word position for average color
            half = max(1, font_size // 3)
            y1 = max(0, y - half)
            y2 = min(wc.height, y + half)
            x1 = max(0, x - half)
            x2 = min(wc.width, x + half)
            region = mask_arr[y1:y2, x1:x2]
            if region.size == 0:
                r, g, b = mask_arr[y, x]
            else:
                r = int(np.mean(region[:, :, 0]))
                g = int(np.mean(region[:, :, 1]))
                b = int(np.mean(region[:, :, 2]))
            # Skip near-black (background) - return a light color instead
            if r + g + b < 30:
                return "rgb(200, 200, 200)"
            return f"rgb({r}, {g}, {b})"

        wc.color_func = mask_color_func
        # Re-color using the new color_func
        wc.recolor()

    except Exception as e:
        print(f"  ⚠️  Color-from-mask failed: {e}")


def generate_cloud_from_file(
    lyrics_path,
    mask_path=None,
    output_path="rapcloud.png",
    settings=None,
    font_path=None,
):
    """Convenience: generate from a lyrics file."""
    lyrics = load_lyrics(lyrics_path)
    return generate_wordcloud(lyrics, settings, mask_path, output_path, font_path)


def batch_generate(
    lyrics_dir="lyrics",
    mask_path=None,
    output_dir="output",
    settings=None,
    font_path=None,
    album_mode=False,
):
    """
    Generate word clouds for all lyrics files in a directory.

    If album_mode=True, combines all lyrics into one cloud.
    """
    os.makedirs(output_dir, exist_ok=True)
    settings = settings or DEFAULT_SETTINGS

    if album_mode:
        print("\n📀 Generating ALBUM word cloud (all tracks combined)...")
        all_lyrics = []
        for fname in sorted(os.listdir(lyrics_dir)):
            if fname.endswith(".txt") and fname != "manifest.json":
                filepath = os.path.join(lyrics_dir, fname)
                all_lyrics.append(load_lyrics(filepath))

        combined = "\n\n".join(all_lyrics)
        output_path = os.path.join(output_dir, "album_all_tracks.png")
        generate_wordcloud(combined, settings, mask_path, output_path, font_path)
        return [output_path]

    # Individual track clouds
    generated = []
    txt_files = sorted([f for f in os.listdir(lyrics_dir) if f.endswith(".txt")])

    print(f"\n🎵 Generating {len(txt_files)} individual word clouds...\n")

    for fname in txt_files:
        track_name = fname.replace(".txt", "").replace("_", " ")
        print(f"🎤 {track_name}")

        filepath = os.path.join(lyrics_dir, fname)
        safe_out = fname.replace(".txt", ".png")
        output_path = os.path.join(output_dir, safe_out)

        result = generate_cloud_from_file(
            filepath, mask_path, output_path, settings, font_path
        )
        if result:
            generated.append(result)

    print(f"\n✅ Generated {len(generated)} word clouds in {output_dir}/")
    return generated


# ─── Preset Styles ──────────────────────────────────────────────────────────

PRESETS = {
    "concert_bw": {
        **DEFAULT_SETTINGS,
        "coloredBackground": True,
        "backgroundColor": "#000000",
        "useCustomColors": False,
        "useRandomColors": False,
        "transparentBackground": False,
        "maskDesired": True,
        "preferHorizontal": 0.7,
        "margin": 2,
        "minFontSize": 4,
        "maxFontSize": 80,
        "repeat": True,
        "collocations": False,
    },
    "transparent_face": {
        **DEFAULT_SETTINGS,
        "transparentBackground": True,
        "coloredBackground": False,
        "useCustomColors": False,
        "useRandomColors": True,
        "maskDesired": True,
        "preferHorizontal": 0.6,
        "margin": 1,
        "minFontSize": 3,
        "maxFontSize": 70,
        "repeat": True,
    },
    "bold_red": {
        **DEFAULT_SETTINGS,
        "coloredBackground": True,
        "backgroundColor": "#1a0000",
        "useCustomColors": True,
        "colors": ["#ff0000", "#cc0000", "#ff3333", "#990000", "#ff6666"],
        "transparentBackground": False,
        "maskDesired": True,
        "preferHorizontal": 0.8,
        "margin": 2,
        "minFontSize": 5,
        "maxFontSize": 90,
        "repeat": True,
    },
    "minimalist": {
        **DEFAULT_SETTINGS,
        "coloredBackground": True,
        "backgroundColor": "#ffffff",
        "useCustomColors": True,
        "colors": ["#000000", "#333333", "#666666"],
        "transparentBackground": False,
        "maskDesired": False,
        "preferHorizontal": 1.0,
        "margin": 5,
        "minFontSize": 8,
        "maxFontSize": 100,
        "repeat": False,
    },
    "cole_world": {
        **DEFAULT_SETTINGS,
        "coloredBackground": True,
        "backgroundColor": "#0d1117",
        "useCustomColors": True,
        "colors": ["#58a6ff", "#79c0ff", "#a5d6ff", "#c9d1d9", "#f0f6fc"],
        "transparentBackground": False,
        "maskDesired": True,
        "preferHorizontal": 0.65,
        "margin": 2,
        "minFontSize": 4,
        "maxFontSize": 72,
        "repeat": True,
    },
}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="RapClouds Word Cloud Generator")
    parser.add_argument("--lyrics", help="Path to a single lyrics .txt file")
    parser.add_argument("--lyrics-dir", default="lyrics", help="Directory of lyrics files")
    parser.add_argument("--mask", help="Path to mask image (PNG/JPG)")
    parser.add_argument("--output", default="output", help="Output directory")
    parser.add_argument("--preset", choices=list(PRESETS.keys()), help="Use a preset style")
    parser.add_argument("--album", action="store_true", help="Generate one cloud from all tracks")
    parser.add_argument("--font", help="Path to .ttf font file")
    parser.add_argument("--width", type=int, default=1000, help="Cloud width")
    parser.add_argument("--height", type=int, default=1000, help="Cloud height")
    parser.add_argument("--bg-color", default="#000000", help="Background color hex")
    parser.add_argument("--transparent", action="store_true", help="Transparent background")

    args = parser.parse_args()

    # Start with preset or defaults
    settings = PRESETS.get(args.preset, DEFAULT_SETTINGS).copy()

    # Override with CLI args
    settings["width"] = args.width
    settings["height"] = args.height
    settings["backgroundColor"] = args.bg_color
    if args.transparent:
        settings["transparentBackground"] = True
        settings["coloredBackground"] = False

    if args.lyrics:
        # Single file mode
        print(f"🎤 Generating cloud for: {args.lyrics}")
        output_path = os.path.join(args.output, os.path.basename(args.lyrics).replace(".txt", ".png"))
        os.makedirs(args.output, exist_ok=True)
        generate_cloud_from_file(args.lyrics, args.mask, output_path, settings, args.font)
    else:
        # Batch mode
        batch_generate(
            lyrics_dir=args.lyrics_dir,
            mask_path=args.mask,
            output_dir=args.output,
            settings=settings,
            font_path=args.font,
            album_mode=args.album,
        )
