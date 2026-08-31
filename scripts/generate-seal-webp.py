#!/usr/bin/env python3
"""
Generate lossless WebP seal assets from source PNGs.

Usage:
    python3 scripts/generate-seal-webp.py

Reads:  public/images/seals/seal-{bronze,silver,gold}.png
Writes: public/images/seals/seal-{bronze,silver,gold}.webp  (3× Lanczos upsampled, lossless)

Replace the source PNGs with higher-resolution originals and re-run this script
to refresh the WebP assets used by ProofTierCard.
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

SEALS_DIR = Path(__file__).parent.parent / "public" / "images" / "seals"
TIERS = ["bronze", "silver", "gold"]
SCALE = 3  # 96×96 → 288×288; change to 4 if source becomes 128×128

for tier in TIERS:
    src = SEALS_DIR / f"seal-{tier}.png"
    dst = SEALS_DIR / f"seal-{tier}.webp"

    if not src.exists():
        print(f"SKIP  {src} (not found)")
        continue

    with Image.open(src) as img:
        orig_w, orig_h = img.size
        target = (orig_w * SCALE, orig_h * SCALE)
        upsampled = img.resize(target, Image.LANCZOS)
        upsampled.save(dst, format="WEBP", lossless=True, quality=100)
        size_kb = dst.stat().st_size / 1024
        print(f"OK    {tier}: {orig_w}×{orig_h} → {target[0]}×{target[1]}  {dst.name}  ({size_kb:.1f} KB)")

for tier in TIERS:
    src = SEALS_DIR / f"seal-{tier}-inactive.png"
    dst = SEALS_DIR / f"seal-{tier}-inactive.webp"

    if not src.exists():
        print(f"SKIP  {src} (not found)")
        continue

    with Image.open(src) as img:
        orig_w, orig_h = img.size
        # Inactive source files are typically high-res from design export.
        # Keep native resolution and transcode lossless only.
        img.save(dst, format="WEBP", lossless=True, quality=100)
        size_kb = dst.stat().st_size / 1024
        print(f"OK    {tier}-inactive: {orig_w}×{orig_h}  {dst.name}  ({size_kb:.1f} KB)")
