#!/usr/bin/env python3
"""
split_quadrants.py — Split an image into N quadrants for tiling onto paper.

ZERO quality loss: pure crop, no resize, no recompression.
Each quadrant is the exact pixel data from the original.

Usage:
    python3 split_quadrants.py INPUT_IMAGE [options]

Options:
    --output-dir DIR    Output directory (default: ./quadrants_<basename>)
    --rows R            Number of rows (default: 2)
    --cols C            Number of cols (default: 2)
    --dpi N             DPI metadata for print software (default: 300)

Quadrant naming (2x2):
    Q1_Q2    (top-left  top-right)
    Q3_Q4    (bot-left  bot-right)
"""

import argparse
import os
import sys
from PIL import Image


def split_image(img, rows=2, cols=2):
    """Split image into rows*cols quadrants via pure crop."""
    w, h = img.size
    cell_w = w / cols
    cell_h = h / rows
    quadrants = []

    for r in range(rows):
        for c in range(cols):
            box = (
                int(c * cell_w),
                int(r * cell_h),
                int((c + 1) * cell_w),
                int((r + 1) * cell_h),
            )
            quadrant = img.crop(box)  # Pure crop — zero quality loss
            q_num = r * cols + c + 1
            quadrants.append((q_num, quadrant))
    return quadrants, (int(cell_w), int(cell_h))


def main():
    parser = argparse.ArgumentParser(description="Split image into quadrants for tiling")
    parser.add_argument("input", help="Input image path")
    parser.add_argument("--output-dir", "-o", help="Output directory")
    parser.add_argument("--dpi", type=int, default=300, help="DPI metadata")
    parser.add_argument("--rows", type=int, default=2, help="Number of rows")
    parser.add_argument("--cols", type=int, default=2, help="Number of cols")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: {args.input} not found")
        sys.exit(1)

    img = Image.open(args.input)
    orig_w, orig_h = img.size
    print(f"Input: {args.input}")
    print(f"Size: {orig_w}×{orig_h} ({img.mode})")
    print(f"Split: {args.rows} rows × {args.cols} cols = {args.rows * args.cols} quadrants")

    if args.output_dir:
        out_dir = args.output_dir
    else:
        base = os.path.splitext(os.path.basename(args.input))[0]
        out_dir = os.path.join(os.path.dirname(args.input) or ".", f"quadrants_{base}")

    os.makedirs(out_dir, exist_ok=True)

    quadrants, (cw, ch) = split_image(img, args.rows, args.cols)
    print(f"Each quadrant: {cw}×{ch} pixels")

    for q_num, q_img in quadrants:
        fname = f"Q{q_num}_{q_img.size[0]}x{q_img.size[1]}.png"
        out_path = os.path.join(out_dir, fname)
        q_img.save(out_path, "PNG", dpi=(args.dpi, args.dpi))
        print(f"  Q{q_num}: {out_path}")

    print(f"\nDone! Quadrants saved to {out_dir}/")


if __name__ == "__main__":
    main()
