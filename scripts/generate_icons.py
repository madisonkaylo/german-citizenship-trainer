#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/icons"
OUT.mkdir(parents=True, exist_ok=True)

for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    image = Image.new("RGB", (size, size), "#F5F1E8")
    draw = ImageDraw.Draw(image)
    pad = int(size * .12)
    draw.rounded_rectangle((pad, pad, size-pad, size-pad), radius=int(size*.2), fill="#174C3D")
    draw.ellipse((int(size*.24), int(size*.24), int(size*.76), int(size*.76)), outline="#B9D4C5", width=max(2, int(size*.014)))
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", int(size*.22))
    except OSError:
        font = ImageFont.load_default()
    draw.text((size/2, size/2), "DE", fill="#FFFDF8", font=font, anchor="mm")
    image.save(OUT / name, optimize=True)

