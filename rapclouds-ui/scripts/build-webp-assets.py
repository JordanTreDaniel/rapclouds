#!/usr/bin/env python3
"""Generate WebP variants + stage brand/karaoke assets. Mechanical, no code touch."""
import os
import shutil
from PIL import Image

ROOT = "/home/jordanc/workspace/rapclouds"
UI = os.path.join(ROOT, "rapclouds-ui", "public")

GALLERY_SRC = os.path.join(UI, "gallery")
GALLERY_OUT = os.path.join(UI, "gallery", "webp")
BRAND_DIR = os.path.join(UI, "brand")
LANDING_DIR = os.path.join(UI, "landing")

os.makedirs(GALLERY_OUT, exist_ok=True)
os.makedirs(BRAND_DIR, exist_ok=True)
os.makedirs(LANDING_DIR, exist_ok=True)

failures = []
manifest = []

def kb(path):
    return os.path.getsize(path) / 1024.0

def make_webp(src, dst, width, quality):
    """Never upscale: if source narrower than width, keep source width."""
    with Image.open(src) as im:
        w, h = im.size
        target_w = min(width, w)
        if target_w != w:
            ratio = target_w / w
            new_h = max(1, round(h * ratio))
            im = im.resize((target_w, new_h), Image.LANCZOS)
        # Convert to RGBA for transparency preservation, then save as WebP
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA")
        im.save(dst, "WEBP", quality=quality, method=6)
        return im.size

# ---- 1. Gallery: 900px + 400px ----
gallery_files = sorted(
    f for f in os.listdir(GALLERY_SRC)
    if f.lower().endswith((".png", ".jpg", ".jpeg"))
)
for fname in gallery_files:
    src = os.path.join(GALLERY_SRC, fname)
    base = os.path.splitext(fname)[0]
    for width in (900, 400):
        dst = os.path.join(GALLERY_OUT, f"{base}_{width}.webp")
        try:
            dims = make_webp(src, dst, width, 82)
            manifest.append((f"gallery/webp/{base}_{width}.webp", dims, kb(dst)))
        except Exception as e:
            failures.append(f"{fname} @ {width}px: {e}")

# ---- 2. Brand logo ----
brand_src = os.path.join(ROOT, "brand", "rapclouds-logo-lyric-lovers.png")
brand_png = os.path.join(BRAND_DIR, "rapclouds-logo-lyric-lovers.png")
brand_webp = os.path.join(BRAND_DIR, "rapclouds-logo-lyric-lovers.webp")
try:
    shutil.copy2(brand_src, brand_png)
    dims = make_webp(brand_src, brand_webp, 900, 88)
    manifest.append(("brand/rapclouds-logo-lyric-lovers.png", dims, kb(brand_png)))
    manifest.append(("brand/rapclouds-logo-lyric-lovers.webp", dims, kb(brand_webp)))
except Exception as e:
    failures.append(f"brand logo: {e}")

# ---- 3. Karaoke shots ----
karaoke_src_dir = os.path.join(ROOT, "research", "karaoke-shots")
for fname in ("karaoke-main.png", "karaoke-playing.png"):
    src = os.path.join(karaoke_src_dir, fname)
    dst_png = os.path.join(LANDING_DIR, fname)
    dst_webp = os.path.join(LANDING_DIR, os.path.splitext(fname)[0] + ".webp")
    try:
        shutil.copy2(src, dst_png)
        dims = make_webp(src, dst_webp, 1200, 85)
        manifest.append((f"landing/{fname}", dims, kb(dst_png)))
        manifest.append((f"landing/{os.path.splitext(fname)[0]}.webp", dims, kb(dst_webp)))
    except Exception as e:
        failures.append(f"karaoke {fname}: {e}")

# ---- 4. Totals ----
orig_total = sum(kb(os.path.join(GALLERY_SRC, f)) for f in gallery_files)
webp900_total = sum(
    kb(os.path.join(GALLERY_OUT, f))
    for f in os.listdir(GALLERY_OUT)
    if f.endswith("_900.webp")
)
webp400_total = sum(
    kb(os.path.join(GALLERY_OUT, f))
    for f in os.listdir(GALLERY_OUT)
    if f.endswith("_400.webp")
)

print("=== MANIFEST ===")
for name, dims, size in manifest:
    print(f"{name}\t{dims[0]}x{dims[1]}\t{size:.1f} KB")
print()
print("=== GALLERY TOTALS (public/gallery) ===")
print(f"Originals (PNG/JPG):     {orig_total/1024:.2f} MB ({len(gallery_files)} files)")
print(f"WebP 900px variants:     {webp900_total/1024:.2f} MB")
print(f"WebP 400px variants:     {webp400_total/1024:.2f} MB")
print(f"WebP both widths:        {(webp900_total+webp400_total)/1024:.2f} MB")
print(f"Reduction (orig vs 900): {100 - (webp900_total/orig_total)*100:.1f}%")
print(f"Reduction (orig vs 400): {100 - (webp400_total/orig_total)*100:.1f}%")
print()
print("=== FAILURES ===")
if failures:
    for f in failures:
        print(f"FAIL: {f}")
else:
    print("None")
print()
print(f"Manifest entries: {len(manifest)}")
