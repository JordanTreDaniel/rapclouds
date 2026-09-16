#!/usr/bin/env python3
"""
True Color Layer Stacking - Color Portrait Word Cloud

Splits a color portrait into color layers where each layer only has words
placed in pixels of that specific color range. Each layer has transparent
background and words colored with actual pixel colors from the original.

Then stacks all layers to create a composite that looks like the original
image but made of words.
"""

import os
import sys
import time
import numpy as np
from PIL import Image, ImageChops
from wordcloud import WordCloud, STOPWORDS
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Add parent dir for clean_lyrics import
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)
sys.path.insert(0, '.')
from generate_cloud import clean_lyrics

# ─── Paths ──────────────────────────────────────────────────────────────────
LYRICS_DIR = "lyrics"
MASKS_DIR = "masks"
OUTPUT_DIR = "output_innovations"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
COLOR_PORTRAIT = os.path.join(MASKS_DIR, "jcole_color_original.png")

# ─── Constants ──────────────────────────────────────────────────────────────
WIDTH, HEIGHT = 1200, 1200
K_CLUSTERS = 7
RGB_THRESHOLD = 50  # Euclidean distance in RGB space

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


def kmeans_numpy(pixels, k=7, max_iter=50, seed=42):
    """
    Simple k-means clustering in pure numpy.
    pixels: (N, 3) float array of RGB values
    Returns: (labels, centers)
    """
    rng = np.random.RandomState(seed)
    n = pixels.shape[0]

    # Initialize centers using k-means++ style
    centers = np.empty((k, 3))
    idx = rng.randint(n)
    centers[0] = pixels[idx]

    for c in range(1, k):
        dists = np.min([np.sum((pixels - centers[j]) ** 2, axis=1)
                        for j in range(c)], axis=0)
        probs = dists / dists.sum()
        idx = rng.choice(n, p=probs)
        centers[c] = pixels[idx]

    for iteration in range(max_iter):
        # Assign each pixel to nearest center
        dists = np.array([np.sum((pixels - centers[j]) ** 2, axis=1)
                          for j in range(k)])  # (k, N)
        labels = np.argmin(dists, axis=0)  # (N,)

        # Update centers
        new_centers = np.empty_like(centers)
        for j in range(k):
            members = pixels[labels == j]
            if len(members) > 0:
                new_centers[j] = members.mean(axis=0)
            else:
                new_centers[j] = centers[j]

        # Check convergence
        if np.allclose(centers, new_centers, atol=1e-4):
            print(f"    K-means converged at iteration {iteration + 1}")
            break
        centers = new_centers

    return labels, centers


def load_lyrics_text():
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


def create_cluster_mask(pixels, center, threshold=RGB_THRESHOLD, width=WIDTH, height=HEIGHT):
    """
    Create a binary mask for pixels within RGB threshold of center.
    Returns mask array for wordcloud (0=drawable, 255=masked).
    """
    dists = np.sqrt(np.sum((pixels - center) ** 2, axis=1))
    mask_flat = dists > threshold  # True where NOT in cluster (masked)

    # The pixels array is flattened from the resized image
    # We need to reshape to the image dimensions
    mask_img = mask_flat.reshape(HEIGHT, WIDTH).astype(np.uint8) * 255
    return mask_img


def make_color_func(original_img_arr, cluster_center):
    """
    Create a color function that samples actual pixel colors from the original image.
    Falls back to the cluster center color for out-of-bounds positions.
    """
    h, w = original_img_arr.shape[:2]

    def color_func(word, font_size, position, orientation, random_state=None, **kwargs):
        if position is None:
            r, g, b = int(cluster_center[0]), int(cluster_center[1]), int(cluster_center[2])
            return f"rgb({r},{g},{b})"

        # position is (y, x) in wordcloud
        y, x = int(position[0]), int(position[1])
        # Clamp to image bounds
        x = max(0, min(x, w - 1))
        y = max(0, min(y, h - 1))

        # Sample a small region around the word position
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


def main():
    print("=" * 60)
    print("  TRUE COLOR LAYER STACKING")
    print("=" * 60)

    # Load lyrics
    print("\n1. Loading lyrics...")
    text = load_lyrics_text()
    words = text.split()
    print(f"   Total words: {len(words)}")

    # Load color portrait
    print("\n2. Loading color portrait...")
    portrait = Image.open(COLOR_PORTRAIT).convert("RGB")
    portrait_resized = portrait.resize((WIDTH, HEIGHT), Image.LANCZOS)
    portrait_arr = np.array(portrait_resized)
    print(f"   Original size: {portrait.size}, Resized to: {WIDTH}x{HEIGHT}")

    # Flatten to pixel array for k-means
    pixels = portrait_arr.reshape(-1, 3).astype(np.float64)
    print(f"   Total pixels: {len(pixels)}")

    # Run k-means clustering
    print(f"\n3. Running k-means with k={K_CLUSTERS}...")
    t0 = time.time()
    labels, centers = kmeans_numpy(pixels, k=K_CLUSTERS)
    elapsed = time.time() - t0
    print(f"   Clustering took {elapsed:.1f}s")

    # Show cluster sizes and colors
    print("\n   Cluster summary:")
    for i in range(K_CLUSTERS):
        count = np.sum(labels == i)
        pct = 100.0 * count / len(labels)
        r, g, b = int(centers[i][0]), int(centers[i][1]), int(centers[i][2])
        print(f"   Cluster {i+1}: {pct:5.1f}% of pixels, RGB=({r},{g},{b}), hex=#{r:02x}{g:02x}{b:02x}")

    # Generate word cloud for each cluster
    print("\n4. Generating word clouds per cluster...")
    layer_images = []
    layer_info = []

    for i in range(K_CLUSTERS):
        cluster_pct = 100.0 * np.sum(labels == i) / len(labels)
        center = centers[i]
        r, g, b = int(center[0]), int(center[1]), int(center[2])

        print(f"\n   --- Cluster {i+1}/{K_CLUSTERS} ({cluster_pct:.1f}%, RGB=({r},{g},{b})) ---")

        # Create mask for this cluster
        mask = create_cluster_mask(pixels, center, threshold=RGB_THRESHOLD)

        # Count drawable pixels
        drawable = np.sum(mask == 0)
        if drawable < 100:
            print(f"   Skipping: only {drawable} drawable pixels")
            continue

        print(f"   Drawable pixels: {drawable} ({100.0 * drawable / (WIDTH * HEIGHT):.1f}%)")

        # Create color function for this cluster
        color_func = make_color_func(portrait_arr, center)

        # Generate word cloud
        t1 = time.time()
        wc = WordCloud(
            width=WIDTH,
            height=HEIGHT,
            background_color=None,  # TRANSPARENT
            max_words=800,
            stopwords=RAP_STOPWORDS,
            min_font_size=4,
            max_font_size=50,
            margin=1,
            prefer_horizontal=1.0,
            relative_scaling=0.0,
            collocations=False,
            repeat=True,
            font_path=FONT_BOLD,
            mask=mask,
            color_func=color_func,
        )
        wc.generate(text)
        elapsed_wc = time.time() - t1
        print(f"   Generated in {elapsed_wc:.1f}s")

        # Get the word cloud image (RGBA for transparency)
        wc_img = wc.to_image().convert("RGBA")

        # Make black/dark background pixels transparent
        wc_arr = np.array(wc_img)
        # Calculate brightness
        brightness = wc_arr[:,:,0].astype(int) + wc_arr[:,:,1].astype(int) + wc_arr[:,:,2].astype(int)
        # Set alpha to 0 for dark pixels (background)
        wc_arr[brightness < 30, 3] = 0
        wc_img = Image.fromarray(wc_arr, "RGBA")

        # Save individual layer
        layer_path = os.path.join(OUTPUT_DIR, f"LAYER_{i+1:02d}.png")
        wc_img.save(layer_path, "PNG")
        layer_images.append(wc_img)
        layer_info.append({
            "cluster": i + 1,
            "rgb": (r, g, b),
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "pixels_pct": cluster_pct,
            "words_drawn": len(wc.words_),
        })
        print(f"   Saved: {layer_path}")

    # Stack all layers
    print(f"\n5. Stacking {len(layer_images)} layers...")
    if not layer_images:
        print("   ERROR: No layers to stack!")
        return

    # Create composite by pasting each layer onto a transparent canvas
    composite = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    for img in layer_images:
        composite = Image.alpha_composite(composite, img)

    composite_path = os.path.join(OUTPUT_DIR, "LAYER_composite.png")
    composite.save(composite_path, "PNG")
    composite_size = os.path.getsize(composite_path)
    print(f"   Composite saved: {composite_path} ({composite_size / 1024:.0f}KB)")

    # Summary
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    for info in layer_info:
        print(f"  Layer {info['cluster']:02d}: {info['hex']} ({info['pixels_pct']:.1f}% pixels, {info['words_drawn']} words)")
    print(f"\n  Total layers: {len(layer_images)}")
    print(f"  Output: {OUTPUT_DIR}/LAYER_*.png + LAYER_composite.png")
    print("=" * 60)


if __name__ == "__main__":
    main()
