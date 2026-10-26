"""Undertide boss sheet: COUNT AUREL, a drowned tide general (Kindle Quest, Master Builder).
Same approach as build_slag_golem.py / staging build_enemies.py: drawn part-by-part on the 24x32 grid with build_sprites.py
(auto shading, 1 px #120e1c ink outline, hard alpha), nearest 2x to 48x64. Rows = anim x facing (down, up, left, right);
right = left mirrored. Gloom-and-glow teal / cyan / violet neon: barnacled admiral's coat, cold crown, glowing rapier.
Usage: python3 tools/art/build_count_aurel.py -> public/art/chars/count_aurel.png/.json + docs/count_aurel_8x.png"""
import json, os, sys
from PIL import Image
sys.path.insert(0, "/workspace/game-ideas/anime-fighter/staging/art/tools")
import build_sprites as B
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "..", "public", "art", "chars")
FW, FH, S = 24, 32, 2
B.P.update({"coat": ["#2c6a70", "#1c4652", "#122c3a"], "cape": ["#7a4ab0", "#4e2c80", "#2e1a52"],
            "skinD": ["#9ab8b4", "#6a8a8c", "#466466"], "crown": ["#8ffcff", "#3ee0e8", "#1a9aa8"],
            "blade": ["#e8ffff", "#7af4ff", "#3ab8d0"], "glowC": ["#b8fff8"], "glowV": ["#e0a0ff"], "boot": ["#2a2a44", "#1a1a2e", "#141424"]})
ANIMS = [("stand", 1), ("walk", 4), ("lunge", 3), ("sweep", 3), ("whirl", 2), ("summon", 2), ("ring", 2), ("hurt", 1)]
FACINGS = ["down", "up", "left", "right"]
def E(c, cx, cy, rx, ry, m, p): c.ell(cx, cy, rx, ry, m, "base", p)
def R(c, x0, y0, x1, y1, m, p): c.rect(x0, y0, x1, y1, m, "base", p)
def L(c, a, b, m, p, w=2): c.line(a, b, w, m, "base", p)

def pose(a, i):
    """(sword-hand dx, dy, off-hand dy, bob)"""
    if a == "walk": return 0, [0, 1, 0, 1][i], 0, [0, 1, 0, 1][i]
    if a == "lunge": return [-1, 3, 5][i], [-2, 2, 4][i], 0, [0, 1, 1][i]
    if a == "sweep": return [-6, 0, 6][i], [-4, 0, 2][i], 0, 0
    if a == "whirl": return [3, -3][i], [-1, -1][i], -6, 0
    if a == "summon": return 0, -2, -9 - i, 0
    if a == "ring": return 0, -10 - i, -10 - i, 0
    if a == "hurt": return -1, 2, 2, 1
    return 0, 0, 0, 0

def front(c, a, i, back):
    sx, sy, oy, by = pose(a, i); hu = 1 if a == "hurt" else 0
    R(c, 9, 23, 11, 30, "boot", "legL"); R(c, 13, 23, 15, 30, "boot", "legR")
    if back: R(c, 6, 11 + by, 18, 27, "cape", "capeB")
    R(c, 7, 12 + by, 17, 24 + by, "coat", "coat")
    R(c, 6, 22 + by, 18, 25 + by, "coat", "tails")
    if not back:
        L(c, (12, 13 + by), (12, 23 + by), "cape", "sash", 1)
        for y in (15, 18, 21): c.put(10, y + by, "crown", "base", "btn"); c.put(14, y + by, "crown", "base", "btn")
    E(c, 7, 12 + by, 2.5, 1.5, "crown", "epL"); E(c, 17, 12 + by, 2.5, 1.5, "crown", "epR")
    # sword arm (right side of sprite) + off-hand
    hx, hy = 19 + sx, 19 + by + sy
    L(c, (17, 13 + by), (hx, hy), "coat", "armS", 2)
    tip = (hx + (2 if a != "lunge" else 4), hy + (8 if a not in ("sweep", "ring") else -6))
    if a in ("sweep",): tip = (hx + [-8, 3, 10][i] // 2, hy - [8, 2, -4][i])
    L(c, (hx, hy), tip, "blade", "rapier", 1); c.put(hx, hy, "crown", "base", "guard")
    L(c, (7, 13 + by), (5, 20 + by + oy), "coat", "armO", 2); c.put(5, 20 + by + oy, "skinD", "base", "handO")
    if a in ("whirl", "summon", "ring"): c.put(5, 19 + by + oy, "glowV", "base", "orb")
    # head + cold crown
    hy2 = 8 + by + hu
    E(c, 12, hy2, 3.5, 3.5, "skinD", "head")
    if not back:
        for ex in (11, 13): c.put(ex, hy2, "glowC" if not hu else "ink", "base", "eye")
        R(c, 10, hy2 + 3, 14, hy2 + 3, "skinD", "beard")
    else: R(c, 9, hy2 - 1, 15, hy2 + 2, "cape", "hair")
    R(c, 9, hy2 - 5, 15, hy2 - 4, "crown", "crown")
    for x in (9, 12, 15): c.put(x, hy2 - 6, "crown", "base", "spike")

def side(c, a, i):
    sx, sy, oy, by = pose(a, i); hu = 1 if a == "hurt" else 0
    lean = 1 if a == "lunge" and i > 0 else 0
    R(c, 10, 23, 12, 30, "boot", "legB"); R(c, 13 - lean * 2, 23, 15 - lean * 2, 30, "boot", "legF")
    R(c, 14, 11 + by, 17, 27, "cape", "cape")
    R(c, 9 - lean, 12 + by, 15 - lean, 24 + by, "coat", "coat"); R(c, 9, 22 + by, 17, 25 + by, "coat", "tails")
    c.put(10 - lean, 15 + by, "crown", "base", "btn"); c.put(10 - lean, 18 + by, "crown", "base", "btn")
    hx, hy = 7 - sx - lean, 18 + by + sy
    L(c, (11 - lean, 13 + by), (hx, hy), "coat", "arm", 2)
    if a == "lunge": tip = (hx - 7 - i, hy - 1)
    elif a == "sweep": tip = (hx - 4, hy - [8, 0, -6][i])
    else: tip = (hx - 2, hy + 7)
    L(c, (hx, hy), tip, "blade", "rapier", 1); c.put(hx, hy, "crown", "base", "guard")
    if a in ("whirl", "summon", "ring"): c.put(hx + 1, hy - 3, "glowV", "base", "orb")
    hy2 = 8 + by + hu
    E(c, 11 - lean, hy2, 3.5, 3.5, "skinD", "head"); c.put(9 - lean, hy2, "glowC" if not hu else "ink", "base", "eye")
    R(c, 9 - lean, hy2 - 5, 14 - lean, hy2 - 4, "crown", "crown"); c.put(10 - lean, hy2 - 6, "crown", "base", "spk"); c.put(13 - lean, hy2 - 6, "crown", "base", "spk2")

def render(f, a, i):
    B.FW, B.FH = FW, FH; c = B.Canvas()
    side(c, a, i) if f in ("left", "right") else front(c, a, i, f == "up")
    cols = B.shade(c); ink = B.outline_and_fix(cols)
    px = dict(cols); px.update({xy: B.INK for xy in ink})
    if f == "right": px = {(FW - 1 - x, y): v for (x, y), v in px.items()}
    return px

def rgba(h): return tuple(int(h[j:j + 2], 16) for j in (1, 3, 5)) + (255,)

def build(name="count_aurel"):
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
    json.dump({"name": name, "role": "boss", "palette": "gloom-glow", "frame": [W, H], "pivot": [W // 2, H - 1], "facings": FACINGS,
               "anims": {a: {"count": n} for a, n in ANIMS},
               "layout": "row = anim x facing (anim order as listed, facings down,up,left,right), col = frame index; right = left mirrored",
               "frames": frames}, open(f"{OUT}/{name}.json", "w"), indent=1)
    big = sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (255, 255, 255, 255)); bg.alpha_composite(big)
    bg.convert("RGB").save(os.path.join(HERE, "..", "..", "docs", "count_aurel_8x.png"))

if __name__ == "__main__": build()
