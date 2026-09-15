#!/usr/bin/env python3
"""
RapClouds Standalone - Main Orchestrator
One command to fetch lyrics and generate all word clouds.

Usage:
    python3 run.py                    # Fetch lyrics + generate all clouds
    python3 run.py --lyrics-only      # Just fetch lyrics
    python3 run.py --clouds-only      # Just generate clouds (lyrics must exist)
    python3 run.py --preset bold_red  # Use a style preset
    python3 run.py --album            # Also generate album-combined cloud
    python3 run.py --mask path/to/face.png  # Use a mask image
"""

import os
import sys
import argparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

from fetch_lyrics import fetch_all_lyrics
from generate_cloud import batch_generate, PRESETS, DEFAULT_SETTINGS


def main():
    parser = argparse.ArgumentParser(
        description="RapClouds: J. Cole The Fall-Off Word Cloud Generator"
    )
    parser.add_argument("--lyrics-only", action="store_true", help="Only fetch lyrics")
    parser.add_argument("--clouds-only", action="store_true", help="Only generate clouds")
    parser.add_argument("--preset", choices=list(PRESETS.keys()), default="concert_bw",
                        help="Style preset (default: concert_bw)")
    parser.add_argument("--mask", help="Path to mask image for shaped clouds")
    parser.add_argument("--album", action="store_true", help="Also generate album-wide cloud")
    parser.add_argument("--font", help="Path to .ttf font file")
    parser.add_argument("--width", type=int, default=1000)
    parser.add_argument("--height", type=int, default=1000)
    parser.add_argument("--bg-color", default="#000000")
    parser.add_argument("--transparent", action="store_true")

    args = parser.parse_args()

    print("╔══════════════════════════════════════════════════╗")
    print("║   🎤 RapClouds - J. Cole The Fall-Off Edition   ║")
    print("╚══════════════════════════════════════════════════╝\n")

    lyrics_dir = os.path.join(SCRIPT_DIR, "lyrics")
    output_dir = os.path.join(SCRIPT_DIR, "output")

    # Step 1: Fetch lyrics
    if not args.clouds_only:
        print("📝 STEP 1: Fetching lyrics from Genius...\n")
        results = fetch_all_lyrics(lyrics_dir)
        fetched = sum(1 for r in results.values() if r["file"])
        if fetched == 0:
            print("\n❌ No lyrics fetched. Check your internet connection.")
            sys.exit(1)
        print()
    else:
        # Check lyrics exist
        if not os.path.exists(lyrics_dir) or not any(
            f.endswith(".txt") for f in os.listdir(lyrics_dir)
        ):
            print("❌ No lyrics found. Run without --clouds-only first.")
            sys.exit(1)
        txt_count = len([f for f in os.listdir(lyrics_dir) if f.endswith(".txt")])
        print(f"📝 Found {txt_count} lyrics files (skipping fetch)\n")

    if args.lyrics_only:
        print("✅ Lyrics fetch complete!")
        return

    # Step 2: Generate word clouds
    print("🎨 STEP 2: Generating word clouds...\n")

    settings = PRESETS[args.preset].copy()
    settings["width"] = args.width
    settings["height"] = args.height
    settings["backgroundColor"] = args.bg_color
    if args.transparent:
        settings["transparentBackground"] = True
        settings["coloredBackground"] = False

    print(f"  📐 Preset: {args.preset}")
    print(f"  📏 Size: {args.width}x{args.height}")
    print(f"  🎨 Background: {'transparent' if args.transparent else args.bg_color}")

    mask_path = args.mask
    if mask_path:
        print(f"  🖼️  Mask: {mask_path}")
    else:
        print("  ℹ️  No mask - generating rectangular clouds")
        print("  💡 Tip: Add --mask path/to/jcole_face.png for shaped clouds")

    generated = batch_generate(
        lyrics_dir=lyrics_dir,
        mask_path=mask_path,
        output_dir=output_dir,
        settings=settings,
        font_path=args.font,
        album_mode=False,
    )

    # Step 3: Album cloud (optional)
    if args.album:
        print("\n📀 STEP 3: Generating album-wide word cloud...")
        batch_generate(
            lyrics_dir=lyrics_dir,
            mask_path=mask_path,
            output_dir=output_dir,
            settings=settings,
            font_path=args.font,
            album_mode=True,
        )

    print(f"\n{'='*50}")
    print(f"🎉 DONE! {len(generated)} word clouds saved to:")
    print(f"   📁 {output_dir}/")
    print(f"\n💡 To view the HTML gallery:")
    print(f"   open viewer.html")


if __name__ == "__main__":
    main()
