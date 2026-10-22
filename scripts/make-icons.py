"""Speed Meter icons: top-down car between lane lines on soft grey, blue accent."""
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
def icon(size, k):
    S = 512; im = Image.new('RGB', (S, S), (233, 234, 236)); d = ImageDraw.Draw(im)
    for y in range(S):
        v = int(244 - 26 * y / S); d.line([0, y, S, y], fill=(v, v, v + 2))
    c = S / 2; s = k
    for x in (c - 150 * s, c + 150 * s):
        for y0 in range(-40, S, 110): d.rounded_rectangle([x - 6 * s, y0, x + 6 * s, y0 + 60], radius=6, fill=(62, 106, 225))
    w, h = 110 * s, 230 * s
    d.rounded_rectangle([c - w, c - h, c + w, c + h], radius=int(90 * s), fill=(255, 255, 255), outline=(170, 172, 178), width=int(6 * s))
    d.rounded_rectangle([c - w * .72, c - h * .45, c + w * .72, c - h * .12], radius=int(30 * s), fill=(60, 64, 72))
    d.rounded_rectangle([c - w * .66, c + h * .42, c + w * .66, c + h * .62], radius=int(24 * s), fill=(60, 64, 72))
    return im.resize((size, size), Image.LANCZOS)
os.makedirs(OUT, exist_ok=True)
icon(192, .85).save(f'{OUT}/icon-192.png'); icon(512, .85).save(f'{OUT}/icon-512.png')
icon(512, .62).save(f'{OUT}/icon-maskable-512.png'); icon(180, .8).save(f'{OUT}/apple-touch-icon.png')
icon(32, .95).save(f'{OUT}/favicon-32.png'); print('ok')
