"""Stair top-ring boss sheet: MORVANT, THE ECLIPSE GOLEM (Ki Quest, Master Builder). Original design.
Same pipeline as build_count_aurel.py: drawn part-by-part on the 24x32 grid with build_sprites.py (auto shading, 1 px ink
outline, hard alpha), nearest 2x to 48x64. Rows = anim x facing (down, up, left, right); right = left mirrored.
Look: hulking basalt-violet golem, a dead-sun eclipse disc set in its chest (black core, gold corona), gold crescent halo
horns, neon violet rune seams, heavy gold-banded fists. Usage: python3 tools/art/build_morvant.py
-> public/art/chars/morvant.png/.json + docs/morvant_8x.png"""
import json, os, sys
from PIL import Image
sys.path.insert(0, "/workspace/game-ideas/anime-fighter/staging/art/tools")
import build_sprites as B
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "..", "public", "art", "chars")
FW, FH, S = 24, 32, 2
B.P.update({"stone": ["#5a4a7a", "#3c2f58", "#251c3c"], "stoneD": ["#3a3050", "#282038", "#1a1428"],
            "gold": ["#ffe68a", "#f0b83a", "#a8741c"], "core": ["#1a0e24"], "rune": ["#e8a8ff"], "runeG": ["#fff0a0"]})
ANIMS = [("stand", 1), ("walk", 4), ("slam", 3), ("beam", 3), ("orbit", 2), ("nova", 2), ("eclipse", 2), ("hurt", 1)]
FACINGS = ["down", "up", "left", "right"]
def E(c, cx, cy, rx, ry, m, p): c.ell(cx, cy, rx, ry, m, "base", p)
def R(c, x0, y0, x1, y1, m, p): c.rect(x0, y0, x1, y1, m, "base", p)
def L(c, a, b, m, p, w=2): c.line(a, b, w, m, "base", p)

def pose(a, i):
    """(fist dy, fist dx-spread, bob)"""
    if a == "walk": return [0, 1, 0, 1][i], 0, [0, 1, 0, 1][i]
    if a == "slam": return [-9, -4, 4][i], [-1, 0, 1][i], [0, 0, 1][i]
    if a == "beam": return [-2, -1, -1][i], [1, 2, 2][i], 0
    if a == "orbit": return [-6, -7][i], [2, 3][i], 0
    if a == "nova": return [-10, -11][i], [3, 4][i], 0
    if a == "eclipse": return [-12, -12][i], [0, 1][i], 0
    if a == "hurt": return 2, -1, 1
    return 0, 0, 0

def front(c, a, i, back):
    fy, fs, by = pose(a, i); hu = 1 if a == "hurt" else 0
    R(c, 7, 24, 10, 30, "stoneD", "legL"); R(c, 14, 24, 17, 30, "stoneD", "legR")
    R(c, 6, 29, 10, 30, "gold", "footL"); R(c, 14, 29, 18, 30, "gold", "footR")
    E(c, 12, 18 + by, 7, 7, "stone", "torso")
    R(c, 8, 22 + by, 16, 25 + by, "stoneD", "waist")
    if not back:
        E(c, 12, 17 + by, 3.5, 3.5, "gold", "corona")
        E(c, 12, 17 + by, 2.2, 2.2, "core", "disc")
        if a in ("beam", "nova", "eclipse"): c.put(12, 17 + by, "runeG", "base", "flare")
        for (x, y) in ((8, 14), (16, 14), (7, 20), (17, 20)): c.put(x, y + by, "rune", "base", "seam")
    else:
        L(c, (12, 12 + by), (12, 23 + by), "rune", "spine", 1)
    E(c, 5, 12 + by, 3, 2.5, "stone", "pauL"); E(c, 19, 12 + by, 3, 2.5, "stone", "pauR")
    c.put(5, 11 + by, "gold", "base", "studL"); c.put(19, 11 + by, "gold", "base", "studR")
    for side, x0 in ((-1, 5), (1, 19)):
        hx, hy = x0 + side * fs, 22 + by + fy
        L(c, (x0, 13 + by), (hx, hy), "stone", f"arm{side}", 3)
        E(c, hx, hy, 2.5, 2.5, "stoneD", f"fist{side}")
        R(c, hx - 2, hy - 2, hx + 2, hy - 2, "gold", f"band{side}")
        if a in ("orbit", "nova", "eclipse"): c.put(hx, hy, "rune", "base", f"glow{side}")
    hy2 = 7 + by + hu
    E(c, 12, hy2, 3, 3, "stone", "head")
    if not back:
        R(c, 10, hy2, 14, hy2, "core", "visor")
        for ex in (11, 13): c.put(ex, hy2, "runeG" if not hu else "ink", "base", "eye")
    # gold crescent halo horns
    L(c, (9, hy2 - 2), (7, hy2 - 6), "gold", "hornL", 1); L(c, (15, hy2 - 2), (17, hy2 - 6), "gold", "hornR", 1)
    c.put(12, hy2 - 4, "gold", "base", "crest")

def side(c, a, i):
    fy, fs, by = pose(a, i); hu = 1 if a == "hurt" else 0
    lean = 1 if a in ("slam", "beam") and i > 0 else 0
    R(c, 9, 24, 12, 30, "stoneD", "legB"); R(c, 13 - lean, 24, 16 - lean, 30, "stoneD", "legF")
    R(c, 8, 29, 12, 30, "gold", "footB"); R(c, 12 - lean, 29, 16 - lean, 30, "gold", "footF")
    E(c, 12 - lean, 18 + by, 6, 7, "stone", "torso"); R(c, 9, 22 + by, 15, 25 + by, "stoneD", "waist")
    E(c, 8 - lean, 17 + by, 1.5, 2.5, "gold", "corona"); c.put(7 - lean, 17 + by, "core", "base", "disc")
    c.put(15, 15 + by, "rune", "base", "seam"); c.put(14, 21 + by, "rune", "base", "seam2")
    E(c, 13 - lean, 12 + by, 3, 2.5, "stone", "pau"); c.put(13 - lean, 11 + by, "gold", "base", "stud")
    hx, hy = 9 - fs - lean, 22 + by + fy
    if a == "beam": hx, hy = 5 - i, 17 + by
    L(c, (12 - lean, 13 + by), (hx, hy), "stone", "arm", 3)
    E(c, hx, hy, 2.5, 2.5, "stoneD", "fist"); R(c, hx - 2, hy - 2, hx + 2, hy - 2, "gold", "band")
    if a in ("orbit", "nova", "eclipse", "beam"): c.put(hx, hy, "rune", "base", "glow")
    hy2 = 7 + by + hu
    E(c, 11 - lean, hy2, 3, 3, "stone", "head"); R(c, 8 - lean, hy2, 10 - lean, hy2, "core", "visor")
    c.put(9 - lean, hy2, "runeG" if not hu else "ink", "base", "eye")
    L(c, (12 - lean, hy2 - 2), (14 - lean, hy2 - 6), "gold", "horn", 1); c.put(10 - lean, hy2 - 4, "gold", "base", "crest")

def render(f, a, i):
    B.FW, B.FH = FW, FH; c = B.Canvas()
    side(c, a, i) if f in ("left", "right") else front(c, a, i, f == "up")
    cols = B.shade(c); ink = B.outline_and_fix(cols)
    px = dict(cols); px.update({xy: B.INK for xy in ink})
    if f == "right": px = {(FW - 1 - x, y): v for (x, y), v in px.items()}
    return px

def rgba(h): return tuple(int(h[j:j + 2], 16) for j in (1, 3, 5)) + (255,)

def build(name="morvant"):
    rows = [(a, n, f) for a, n in ANIMS for f in FACINGS]; cols = max(n for _, n in ANIMS)
    W, H = FW * S, FH * S
    sheet = Image.new("RGBA", (W * cols, H * len(rows))); frames = []
    for r, (a, n, f) in enumerate(rows):
        for i in range(n):
            for (x, y), h in render(f, a, i).items():
                if 0 <= x < FW and 0 <= y < FH:
                    for dy in range(S):
                        for dx in range(S): sheet.putpixel((i * W + x * S + dx, r * H + y * S + dy), rgba(h))
            frames.append({"name": f"{name}_{a}_{f}_{i}", "anim": a, "facing": f, "i": i, "x": i * W, "y": r * H, "w": W, "h": H})
    sheet.save(f"{OUT}/{name}.png")
    json.dump({"name": name, "role": "boss", "palette": "eclipse-neon", "frame": [W, H], "pivot": [W // 2, H - 1], "facings": FACINGS,
               "anims": {a: {"count": n} for a, n in ANIMS},
               "layout": "row = anim x facing (anim order as listed, facings down,up,left,right), col = frame index; right = left mirrored",
               "frames": frames}, open(f"{OUT}/{name}.json", "w"), indent=1)
    big = sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (255, 255, 255, 255)); bg.alpha_composite(big)
    bg.convert("RGB").save(os.path.join(HERE, "..", "..", "docs", "morvant_8x.png"))

if __name__ == "__main__": build()
