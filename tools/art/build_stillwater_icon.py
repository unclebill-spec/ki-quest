"""Stillwater Charm icon (gear c7): palette swap of the Witchlight Charm cell [80,48] into free cell [64,64]
of public/icons/gear-icons.png. Gradient map: dark = deep violet, mid = violet, light = teal. Re-run safe."""
from PIL import Image
P = "public/icons/gear-icons.png"
im = Image.open(P).convert("RGBA")
src = im.crop((80, 48, 96, 64)); out = Image.new("RGBA", (16, 16))
stops = [(0, (20, 30, 60)), (0.3, (90, 50, 170)), (0.5, (30, 150, 160)), (0.7, (90, 220, 210)), (1, (230, 255, 250))]
def grad(t):
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if t <= b:
            k = (t - a) / (b - a) if b > a else 0
            return tuple(round(ca[i] + (cb[i] - ca[i]) * k) for i in range(3))
    return stops[-1][1]
for y in range(16):
    for x in range(16):
        r, g, b, a = src.getpixel((x, y))
        out.putpixel((x, y), (*grad((0.3 * r + 0.59 * g + 0.11 * b) / 255), a) if a else (0, 0, 0, 0))
im.paste(out, (64, 64)); im.save(P)
