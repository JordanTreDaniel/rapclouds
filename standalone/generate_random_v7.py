#!/usr/bin/env python3
"""
RapClouds v7 — Random Combinatorial Generator

Generates random combinations of fonts, masks, and lyrics sources.
Each run produces unique combinations for variety.

Usage:
    python3 generate_random_v7.py --count 5
    python3 generate_random_v7.py --count 10 --seed 42
"""

import os
import sys
import json
import random
import argparse
import subprocess
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── Available options ──────────────────────────────────────────────────────

FONTS = {
    "dejavu":       os.path.join(SCRIPT_DIR, "fonts/DejaVuSans-Bold.ttf"),
    "anton":        os.path.join(SCRIPT_DIR, "fonts/anton.ttf"),
    "bebasneue":    os.path.join(SCRIPT_DIR, "fonts/bebasneue.ttf"),
    "oswald":       os.path.join(SCRIPT_DIR, "fonts/oswald.ttf"),
    "bangers":      os.path.join(SCRIPT_DIR, "fonts/bangers.ttf"),
    "archivoblack": os.path.join(SCRIPT_DIR, "fonts/archivoblack.ttf"),
}

MASKS = {
    "illustration": os.path.join(SCRIPT_DIR, "masks/jcole_face_illustration.jpg"),
    "displate":     os.path.join(SCRIPT_DIR, "masks/jcole_displate.jpg"),
    "cartoon":      os.path.join(SCRIPT_DIR, "masks/jcole_cartoon_portrait.jpg"),
}

LYRICS_SOURCES = {
    "album": None,  # all songs
}
# Add individual songs
lyrics_dir = os.path.join(SCRIPT_DIR, "lyrics")
for f in sorted(os.listdir(lyrics_dir)):
    if f.endswith(".txt") and f != "manifest.json":
        name = f.replace(".txt", "").replace("_", " ")
        LYRICS_SOURCES[name] = os.path.join(lyrics_dir, f)

PHRASE_COUNTS = [3, 4]
PHRASE_BOOSTS = [3.0, 4.0, 5.0]
WIDTHS = [1000, 1200]

def parse_args():
    p = argparse.ArgumentParser(description="RapClouds v7 — Random Combinatorial Generator")
    p.add_argument("--count", type=int, default=5, help="Number of random combinations to generate")
    p.add_argument("--seed", type=int, default=None, help="Random seed (None = random)")
    p.add_argument("--output", default="output_v7_random", help="Output directory")
    p.add_argument("--dry-run", action="store_true", help="Show combinations without generating")
    return p.parse_args()

def random_combination(rng):
    """Generate one random combination."""
    font_name = rng.choice(list(FONTS.keys()))
    mask_name = rng.choice(list(MASKS.keys()))
    lyrics_name = rng.choice(list(LYRICS_SOURCES.keys()))
    phrase_count = rng.choice(PHRASE_COUNTS)
    phrase_boost = rng.choice(PHRASE_BOOSTS)
    width = rng.choice(WIDTHS)
    
    return {
        "font_name": font_name,
        "font_path": FONTS[font_name],
        "mask_name": mask_name,
        "mask_path": MASKS[mask_name],
        "lyrics_name": lyrics_name,
        "lyrics_path": LYRICS_SOURCES[lyrics_name],
        "phrase_count": phrase_count,
        "phrase_boost": phrase_boost,
        "width": width,
        "label": f"{mask_name} × {lyrics_name} ({font_name}, {width}px)",
        "output_name": f"{mask_name}_{lyrics_name}_{font_name}_{width}px",
    }

def run_generation(combo, output_dir, dry_run=False):
    """Run generate_layers_v7.py with the given combination."""
    output_path = os.path.join(output_dir, combo["output_name"])
    
    cmd = [
        sys.executable, os.path.join(SCRIPT_DIR, "generate_layers_v7.py"),
        "--mask", combo["mask_path"],
        "--font", combo["font_path"],
        "--output", output_path,
        "--dark-bg",
        "--min-phrase-words", "4",
        "--phrase-boost", str(combo["phrase_boost"]),
        "--min-phrase-count", str(combo["phrase_count"]),
        "--width", str(combo["width"]),
    ]
    
    if combo["lyrics_path"] is None:
        cmd.extend(["--album"])
    else:
        cmd.extend(["--lyrics", combo["lyrics_path"]])
    
    if dry_run:
        print(f"  [DRY RUN] {' '.join(cmd)}")
        return None
    
    print(f"  Running: {' '.join(cmd[-6:])}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    return result.returncode == 0

def main():
    args = parse_args()
    rng = random.Random(args.seed)
    
    os.makedirs(args.output, exist_ok=True)
    
    print(f"Generating {args.count} random v7 combinations...")
    if args.seed is not None:
        print(f"Seed: {args.seed}")
    print()
    
    combinations = []
    manifest = {"generated_at": datetime.now().isoformat(), "combinations": []}
    
    for i in range(args.count):
        combo = random_combination(rng)
        combinations.append(combo)
        manifest["combinations"].append({
            "id": i + 1,
            **{k: v for k, v in combo.items() if k != "font_path" and k != "mask_path" and k != "lyrics_path"}
        })
        
        print(f"[{i+1}/{args.count}] {combo['label']}")
        print(f"    Font: {combo['font_name']}, Mask: {combo['mask_name']}, "
              f"Lyrics: {combo['lyrics_name']}, Boost: {combo['phrase_boost']}")
        
        success = run_generation(combo, args.output, args.dry_run)
        if not args.dry_run:
            status = "✓" if success else "✗"
            print(f"    {status} {'Done' if success else 'Failed'}")
        print()
    
    # Save manifest
    manifest_path = os.path.join(args.output, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest: {manifest_path}")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"  RANDOM COMBINATIONS — {args.count} versions")
    print(f"{'='*60}")
    for i, combo in enumerate(combinations, 1):
        print(f"  {i}. {combo['label']}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
