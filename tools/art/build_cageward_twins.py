"""Stair boss sheets: THE CAGEWARD TWINS, Vey (red, chain-hook) and Nell (violet, cage-lantern) (Kindle Quest, Master Builder).
Same approach as build_count_aurel.py: drawn part-by-part on the 24x32 grid with staging build_sprites.py (auto shading,
1 px #120e1c ink outline, hard alpha), nearest 2x to 48x64. Rows = anim x facing (down, up, left, right); right = left mirrored.
Jailers in riveted iron hoods with a slit of red/violet light, long chain-hung coats; one shared body, swapped palette + weapon.
Usage: python3 tools/art/build_cageward_twins.py -> public/art/chars/cageward_vey|nell.png/.json + docs/cageward_twins_8x.png"""
import json, os, sys
from PIL import Image
sys.path.insert(0, "/workspace/game-ideas/anime-fighter/staging/art/tools")
import build_sprites as B
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "..", "public", "art", "chars")
FW, FH, S = 24, 32, 2
B.P.update({"iron": ["#7a7490", "#4e4862", "#2e2a3e"], "boot": ["#2a2a44", "#1a1a2e", "#141424"], "chain": ["#c8c4d8", "#8a86a0", "#56526a"],
            "coatV": ["#b03a3a", "#7a2228", "#4a141c"], "coatN": ["#7a4ab0", "#4e2c80", "#2e1a52"],
            "glowR": ["#ffb0a0"], "glowP": ["#e0a0ff"], "hotR": ["#ff5a3a", "#d0302a", "#8a1a1a"], "hotP": ["#c070ff", "#9040d8", "#5a2090"]})
ANIMS = [("stand", 1), ("walk", 4), ("slam", 3), ("dash", 3), ("orb", 2), ("cast", 2), ("rage", 2), ("hurt", 1)]
FACINGS = ["down", "up", "left", "right"]
TW = {"vey": dict(coat="coatV", glow="glowR", hot="hotR", wpn="hook"), "nell": dict(coat="coatN", glow="glowP", hot="hotP", wpn="lantern")}
def E(c, cx, cy, rx, ry, m, p): c.ell(cx, cy, rx, ry, m, "base", p)
def R(c, x0, y0, x1, y1, m, p): c.rect(x0, y0, x1, y1, m, "base", p)
def L(c, a, b, m, p, w=2): c.line(a, b, w, m, "base", p)
def pose(a, i):
    """(weapon-hand dx, dy, off-hand dy, bob)"""
    return {"walk": (0, [0, 1, 0, 1][i], 0, [0, 1, 0, 1][i]), "slam": ([0, 1, 2][i] if i < 3 else 0, [-10, -4, 5][i] if i < 3 else 0, 0, [0, 0, 1][i] if i < 3 else 0),
            "dash": ([-1, 3, 5][i] if i < 3 else 0, [-1, 1, 2][i] if i < 3 else 0, 2, 1), "orb": (0, [-3, -5][i % 2], -6, 0), "cast": (0, -9 - i % 2, -9 - i % 2, 0),
            "rage": (2 - (i % 2) * 4, -6, -6, i % 2), "hurt": (-1, 2, 2, 1)}.get(a, (0, 0, 0, 0))
def weapon(c, t, a, i, hx, hy, side):
    if t["wpn"] == "hook":
        end = (hx + (2 if not side else -6), hy + (7 if a not in ("slam", "rage") else -3 + [0, 5, 9][min(i, 2)]))
        L(c, (hx, hy), end, "chain", "chain", 1); R(c, end[0] - 1, end[1], end[0] + 1, end[1] + 1, t["hot"], "hook")
    else:
        ly = hy + 3; L(c, (hx, hy), (hx, ly), "chain", "chain", 1); R(c, hx - 2, ly, hx + 2, ly + 4, "iron", "cage"); c.put(hx, ly + 2, t["glow"], "base", "flame")
def front(c, t, a, i, back):
    sx, sy, oy, by = pose(a, i); hu = 1 if a == "hurt" else 0
    R(c, 9, 23, 11, 30, "boot", "legL"); R(c, 13, 23, 15, 30, "boot", "legR")
    R(c, 6, 11 + by, 18, 26 + by, t["coat"], "coat")
    R(c, 7, 13 + by, 17, 14 + by, "iron", "yoke")
    if not back:
        L(c, (8, 15 + by), (16, 22 + by), "chain", "chainX", 1)
        R(c, 10, 19 + by, 14, 20 + by, "iron", "belt"); c.put(12, 19 + by, t["hot"], "base", "lock")
    E(c, 6, 12 + by, 2.5, 2, "iron", "padL"); E(c, 18, 12 + by, 2.5, 2, "iron", "padR")
    hx, hy = min(20, 19 + sx), 19 + by + sy
    L(c, (17, 13 + by), (hx, hy), t["coat"], "armW", 2); c.put(hx, hy, "iron", "base", "fist")
    weapon(c, t, a, i, hx, hy, False)
    L(c, (7, 13 + by), (5, 20 + by + oy), t["coat"], "armO", 2); c.put(5, 20 + by + oy, "iron", "base", "fistO")
    if a in ("orb", "cast", "rage"): c.put(5, 19 + by + oy, t["glow"], "base", "orbO")
    hy2 = 7 + by + hu
    R(c, 8, hy2 - 4, 16, hy2 + 3, "iron", "hood"); R(c, 9, hy2 - 5, 15, hy2 - 5, "iron", "hoodTop")
    if not back:
        R(c, 9, hy2, 15, hy2, t["glow"] if not hu else "ink", "slit")
        for x in (9, 15): c.put(x, hy2 + 2, "chain", "base", "rivet")
    else: R(c, 11, hy2 - 3, 13, hy2 + 2, t["coat"], "seam")
def side(c, t, a, i):
    sx, sy, oy, by = pose(a, i); hu = 1 if a == "hurt" else 0
    lean = 1 if a in ("dash", "slam") and i > 0 else 0
    R(c, 10, 23, 12, 30, "boot", "legB"); R(c, 13 - lean * 2, 23, 15 - lean * 2, 30, "boot", "legF")
    R(c, 8 - lean, 11 + by, 16 - lean, 26 + by, t["coat"], "coat"); E(c, 12 - lean, 12 + by, 3, 2, "iron", "pad")
    R(c, 9 - lean, 19 + by, 15 - lean, 20 + by, "iron", "belt")
    hx, hy = 7 - sx - lean, 18 + by + sy
    L(c, (11 - lean, 13 + by), (hx, hy), t["coat"], "arm", 2); c.put(hx, hy, "iron", "base", "fist")
    weapon(c, t, a, i, hx, hy, True)
    if a in ("orb", "cast", "rage"): c.put(hx + 1, hy - 3, t["glow"], "base", "orb")
    hy2 = 7 + by + hu
    R(c, 8 - lean, hy2 - 4, 15 - lean, hy2 + 3, "iron", "hood"); R(c, 8 - lean, hy2, 10 - lean, hy2, t["glow"] if not hu else "ink", "slit")
def render(t, f, a, i):
    B.FW, B.FH = FW, FH; c = B.Canvas()
    side(c, t, a, i) if f in ("left", "right") else front(c, t, a, i, f == "up")
    cols = B.shade(c); ink = B.outline_and_fix(cols)
    px = dict(cols); px.update({xy: B.INK for xy in ink})
    if f == "right": px = {(FW - 1 - x, y): v for (x, y), v in px.items()}
    return px
def rgba(h): return tuple(int(h[j:j + 2], 16) for j in (1, 3, 5)) + (255,)
def build(key):
    name, t = f"cageward_{key}", TW[key]
    rows = [(a, n, f) for a, n in ANIMS for f in FACINGS]; cols = max(n for _, n in ANIMS); W, H = FW * S, FH * S
    sheet = Image.new("RGBA", (W * cols, H * len(rows))); frames = []
    for r, (a, n, f) in enumerate(rows):
        for i in range(n):
            for (x, y), h in render(t, f, a, i).items():
                if 0 <= x < FW and 0 <= y < FH:
                    for dy in range(S):
                        for dx in range(S): sheet.putpixel((i * W + x * S + dx, r * H + y * S + dy), rgba(h))
            frames.append({"name": f"{name}_{a}_{f}_{i}", "anim": a, "facing": f, "i": i, "x": i * W, "y": r * H, "w": W, "h": H})
    sheet.save(f"{OUT}/{name}.png")
    json.dump({"name": name, "role": "boss", "palette": "gloom-glow", "frame": [W, H], "pivot": [W // 2, H - 1], "facings": FACINGS,
               "anims": {a: {"count": n} for a, n in ANIMS},
               "layout": "row = anim x facing (anim order as listed, facings down,up,left,right), col = frame index; right = left mirrored",
               "frames": frames}, open(f"{OUT}/{name}.json", "w"), indent=1)
    return sheet
if __name__ == "__main__":
    a, b = build("vey"), build("nell")
    both = Image.new("RGBA", (a.width * 2 + 16, a.height)); both.alpha_composite(a, (0, 0)); both.alpha_composite(b, (a.width + 16, 0))
    big = both.resize((both.width * 4, both.height * 4), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (255, 255, 255, 255)); bg.alpha_composite(big)
    bg.convert("RGB").save(os.path.join(HERE, "..", "..", "docs", "cageward_twins_8x.png"))
