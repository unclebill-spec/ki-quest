"""Shared writer for Master Builder's big boss sheets (W17): parts on a WxH art grid with build_sprites.py (auto shading,
1 px #120e1c ink outline, hard alpha), nearest 2x. Rows = anim x facing (down, up, left, right); right = left mirrored."""
import json, os, sys
from PIL import Image
sys.path.insert(0, "/workspace/game-ideas/anime-fighter/staging/art/tools")
import build_sprites as B
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", ".."); OUT = os.path.join(ROOT, "public", "art", "chars")
FACINGS = ["down", "up", "left", "right"]; S = 2
class Pen:
    def __init__(s, c): s.c = c
    def E(s, cx, cy, rx, ry, m, p): s.c.ell(cx, cy, rx, ry, m, "base", p)
    def R(s, x0, y0, x1, y1, m, p): s.c.rect(x0, y0, x1, y1, m, "base", p)
    def L(s, a, b, m, p, w=2): s.c.line(a, b, w, m, "base", p)
    def P(s, x, y, m, p): s.c.put(x, y, m, "base", p)
def rgba(h): return tuple(int(h[j:j + 2], 16) for j in (1, 3, 5)) + (255,)
def build(name, fw, fh, anims, front, side, palette, extra=None):
    def render(f, a, i):
        B.FW, B.FH = fw, fh; c = B.Canvas(); pen = Pen(c)
        side(pen, a, i) if f in ("left", "right") else front(pen, a, i, f == "up")
        cols = B.shade(c); ink = B.outline_and_fix(cols); px = dict(cols); px.update({xy: B.INK for xy in ink})
        if f == "right": px = {(fw - 1 - x, y): v for (x, y), v in px.items()}
        return px
    rows = [(a, n, f) for a, n in anims for f in FACINGS]; cols = max(n for _, n in anims); W, H = fw * S, fh * S
    sheet = Image.new("RGBA", (W * cols, H * len(rows))); frames = []
    for r, (a, n, f) in enumerate(rows):
        for i in range(n):
            for (x, y), h in render(f, a, i).items():
                if 0 <= x < fw and 0 <= y < fh:
                    for dy in range(S):
                        for dx in range(S): sheet.putpixel((i * W + x * S + dx, r * H + y * S + dy), rgba(h))
            frames.append({"name": f"{name}_{a}_{f}_{i}", "anim": a, "facing": f, "i": i, "x": i * W, "y": r * H, "w": W, "h": H})
    sheet.save(f"{OUT}/{name}.png")
    meta = {"name": name, "role": "boss", "palette": palette, "frame": [W, H], "pivot": [W // 2, H - 1], "facings": FACINGS,
            "anims": {a: {"count": n} for a, n in anims}, "layout": "row = anim x facing (anim order as listed, facings down,up,left,right), col = frame index; right = left mirrored"}
    meta.update(extra or {}); meta["frames"] = frames
    json.dump(meta, open(f"{OUT}/{name}.json", "w"), indent=1)
    big = sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (24, 20, 36, 255)); bg.alpha_composite(big)
    bg.convert("RGB").save(os.path.join(ROOT, "docs", "bill", f"{name}_8x.png"))
