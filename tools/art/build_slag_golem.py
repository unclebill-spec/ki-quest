"""Kilnreach quarry boss sheet: Slagheart, a basalt slag golem with a molten core (Kindle Quest, Master Builder).
Same approach as staging/art/tools/build_enemies.py: drawn part-by-part on the 24x32 design grid with build_sprites.py
(Canvas, auto top-left shading, 1 px #120e1c ink outline, enclosed pockets -> ink, hard alpha), then nearest 2x to 48x64
(like warden_rune). Rows = anim x facing (down, up, left, right); right rows = left mirrored. Gloom-and-glow ember neon.
Usage: python3 tools/art/build_slag_golem.py  -> public/art/chars/slag_golem.png/.json"""
import json, os, sys
from PIL import Image
sys.path.insert(0, "/workspace/game-ideas/anime-fighter/staging/art/tools")
import build_sprites as B
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "..", "public", "art", "chars")
FW, FH, S = 24, 32, 2
B.P.update({"slag": ["#5e4c5a", "#3c2e40", "#261c2c"], "basalt": ["#7a6070", "#54404e", "#34283a"],
            "magma": ["#ffd060", "#ff7a2a", "#c83a1c"], "core": ["#fff0a0"], "eyeE": ["#ffef8a"]})
ANIMS = [("stand", 1), ("walk", 4), ("charge", 3), ("hurt", 1), ("slam", 3), ("rain", 3), ("summon", 2)]
FACINGS = ["down", "up", "left", "right"]

def E(c, cx, cy, rx, ry, m, p): c.ell(cx, cy, rx, ry, m, "base", p)
def R(c, x0, y0, x1, y1, m, p): c.rect(x0, y0, x1, y1, m, "base", p)
def L(c, a, b, m, p, w=2): c.line(a, b, w, m, "base", p)

def arms(a, i):
    """(arm end dy, arm spread dx, lean) per pose; arms hang from shoulders at y=13."""
    if a == "walk": return [0, -1, 0, 1][i], 0, 0
    if a == "charge": return [-2, 2, 1][i], [-1, 1, 0][i], [0, 2, 1][i]
    if a == "slam": return [-12, -6, 4][i], [0, 1, 1][i], [0, 0, 1][i]
    if a == "rain": return [-10, -12, -11][i], [1, 2, 1][i], 0
    if a == "summon": return [-3, -4][i], [3, 4][i], 0
    if a == "hurt": return -2, 2, 0
    return 0, 0, 0

def front(c, a, i, back):
    by = [0, 1, 0, 1][i] if a == "walk" else (1 if a == "slam" and i == 2 else 0)
    hu = 1 if a == "hurt" else 0
    ay, sp, lean = arms(a, i)
    # legs (planted)
    R(c, 6, 23, 10, 30, "slag", "legL"); R(c, 14, 23, 18, 30, "slag", "legR")
    R(c, 5, 29, 10, 30, "basalt", "footL"); R(c, 14, 29, 19, 30, "basalt", "footR")
    # torso + molten core
    E(c, 12, 17 + by + lean, 8, 7.5, "slag", "body")
    E(c, 12, 22 + by + lean, 6, 2.5, "basalt", "hips")
    if not back:
        E(c, 12, 17 + by + lean, 3, 3, "magma", "core"); c.put(12, 17 + by + lean, "core", "base", "core")
        L(c, (9, 12 + by + lean), (11, 15 + by + lean), "magma", "crack", 1); L(c, (15, 21 + by + lean), (17, 23 + by + lean), "magma", "crack", 1)
    else:
        for x in (8, 12, 16): R(c, x - 1, 12 + by, x, 13 + by, "basalt", "plate")
        L(c, (12, 14 + by), (12, 21 + by), "magma", "seam", 1)
    # shoulders + arms
    for s in (-1, 1):
        sx = 12 + s * 8
        E(c, sx, 12 + by + lean, 3, 3, "basalt", "sh" + str(s))
        ex, ey = sx + s * (1 + sp), 22 + by + ay + lean
        L(c, (sx, 13 + by + lean), (ex, ey), "slag", "arm" + str(s), 3)
        E(c, ex + 1, ey + 1, 2.5, 2.5, "basalt", "fist" + str(s))
        if a in ("rain", "summon") or (a == "slam" and i == 2): c.put(ex + 1, ey + 1, "magma", "base", "fist" + str(s))
    # head
    hy = 7 + by + hu + lean
    E(c, 12, hy, 4.5, 3.5, "basalt", "head")
    if not back:
        for ex in (10, 14): c.put(ex, hy, "eyeE" if not hu else "ink", "base", "eye")
        R(c, 11, hy + 2, 13, hy + 2, "magma" if a in ("charge", "slam", "rain") else "slag", "mouth")
    if a == "slam" and i == 2:
        L(c, (4, 30), (8, 28), "magma", "fistcrack", 1)

def side(c, a, i):
    by = [0, 1, 0, 1][i] if a == "walk" else 0
    hu = 1 if a == "hurt" else 0
    ay, sp, lean = arms(a, i)
    lx = -lean
    R(c, 9, 23, 13, 30, "slag", "legB"); R(c, 13, 23, 16, 30, "slag", "legF")
    R(c, 7, 29, 13, 30, "basalt", "footB"); R(c, 12, 29, 17, 30, "basalt", "footF")
    E(c, 12 + lx, 17 + by, 6.5, 7.5, "slag", "body"); E(c, 13, 22 + by, 5, 2.5, "basalt", "hips")
    E(c, 9 + lx, 17 + by, 2, 2.5, "magma", "core"); c.put(8 + lx, 17 + by, "core", "base", "core")
    E(c, 14 + lx, 11 + by, 3.5, 3, "basalt", "back")
    ex, ey = 7 + lx - sp, 22 + by + ay
    L(c, (11 + lx, 13 + by), (ex, ey), "slag", "arm", 3); E(c, ex, ey + 1, 2.5, 2.5, "basalt", "fist")
    if a in ("rain", "summon") or (a == "slam" and i == 2): c.put(ex, ey + 1, "magma", "base", "fist")
    hy = 7 + by + hu + lean
    E(c, 10 + lx, hy, 4, 3.5, "basalt", "head"); c.put(8 + lx, hy, "eyeE" if not hu else "ink", "base", "eye")
    R(c, 7 + lx, hy + 2, 9 + lx, hy + 2, "magma" if a in ("charge", "slam", "rain") else "slag", "mouth")
    if a == "slam" and i == 2: L(c, (3, 30), (6, 28), "magma", "fistcrack", 1)

def render(f, a, i):
    B.FW, B.FH = FW, FH; c = B.Canvas()
    side(c, a, i) if f in ("left", "right") else front(c, a, i, f == "up")
    cols = B.shade(c); ink = B.outline_and_fix(cols)
    px = dict(cols); px.update({xy: B.INK for xy in ink})
    if f == "right": px = {(FW - 1 - x, y): v for (x, y), v in px.items()}
    return px

def rgba(h): return tuple(int(h[j:j + 2], 16) for j in (1, 3, 5)) + (255,)

def build(name="slag_golem"):
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
    # 8x contact sheet for review
    big = sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (255, 255, 255, 255)); bg.alpha_composite(big)
    os.makedirs(os.path.join(HERE, "..", "..", "docs"), exist_ok=True); bg.convert("RGB").save(os.path.join(HERE, "..", "..", "docs", "slag_golem_8x.png"))

if __name__ == "__main__": build()
