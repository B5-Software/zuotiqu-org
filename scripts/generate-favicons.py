#!/usr/bin/env python3
"""Generate favicon assets from the existing 做题区 SVG, without altering its artwork."""
from pathlib import Path
from io import BytesIO

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "favicon.svg"

def render(size: int) -> Image.Image:
    data = cairosvg.svg2png(url=str(SOURCE), output_width=size, output_height=size)
    image = Image.open(BytesIO(data)).convert("RGBA")
    if image.size != (size, size):
        raise ValueError("Favicon source is not square")
    return image

def main() -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    output = ROOT / "public"
    render(256).save(output / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    for name, size in (
        ("apple-touch-icon.png", 180),
        ("android-chrome-192x192.png", 192),
        ("android-chrome-512x512.png", 512),
    ):
        render(size).save(output / name, format="PNG", optimize=True)
    print("Generated favicon.ico and 180/192/512px PNGs from", SOURCE)

if __name__ == "__main__":
    main()
