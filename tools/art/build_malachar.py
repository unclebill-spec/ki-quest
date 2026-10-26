"""Finale boss sheet: MALACHAR VESH, THE LAST DUSK (Kindle Quest, Master Builder). Original design.
Same pipeline as build_morvant.py: drawn part-by-part on the 24x32 grid with build_sprites.py (auto shading, 1 px ink
outline, hard alpha), nearest 2x to 48x64. Rows = anim x facing (down, up, left, right); right = left mirrored.
Look: the fallen Sunwarden in black-and-crimson plate, a floating crown of red spikes, a tattered dusk cape, and the four
stolen Wellsprings set in his breastplate as gems (red, violet, cyan, green) around a dim warden sigil. 48x64 keeps him
on the shared boss grid (renderer pivot = feet); his size reads from the crown + additive glow, not a bigger frame.
Usage: python3 tools/art/build_malachar.py -> public/art/chars/malachar.png/.json + docs/malachar_8x.png"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_morvant as M
B = M.B
B.P.update({"plate": ["#4a3a4e", "#2c2032", "#18101c"], "crim": ["#ff5a6a", "#c0203a", "#6a0c1c"],
            "cape": ["#5a1428", "#3a0c1a", "#20060e"], "skin": ["#e8d8e0", "#b8a0b0", "#806878"],
            "gR": ["#ff4a5a"], "gV": ["#d070ff"], "gC": ["#7ff0ff"], "gG": ["#7aff9a"], "core": ["#100810"], "eye": ["#ff3040"]})
M.ANIMS[:] = [("stand", 1), ("walk", 4), ("slash", 3), ("cast", 3), ("rain", 2), ("prism", 2), ("dusk", 2), ("hurt", 1)]
E, R, L = M.E, M.R, M.L

def pose(a, i):
    """(hand dy, hand spread, bob, cape flare)"""
    if a == "walk": return [0, 1, 0, 1][i], 0, [0, 1, 0, 1][i], [0, 1, 0, 1][i]
    if a == "slash": return [-8, -2, 3][i], [-1, 2, 4][i], 0, [0, 1, 2][i]
    if a == "cast": return [-4, -6, -6][i], [1, 2, 3][i], 0, 1
    if a == "rain": return [-13, -14][i], [1, 2][i], 0, 1
    if a == "prism": return [-7, -8][i], [4, 5][i], 0, 2
    if a == "dusk": return [-12, -13][i], [3, 4][i], -1, 2
    if a == "hurt": return 2, -1, 1, 0
    return 0, 0, 0, 0

def crown(c, hx, hy):
    for k, dx in enumerate((-4, -2, 0, 2, 4)):
        top = hy - 8 - (3 if dx == 0 else 1 if abs(dx) == 2 else 0)
        L(c, (hx + dx, hy - 4), (hx + dx, top), "crim", f"spike{k}", 1)
    c.put(hx, hy - 7, "gR", "base", "crownGem")

def front(c, a, i, back):
    fy, fs, by, fl = pose(a, i); hu = 1 if a == "hurt" else 0
    # cape behind, flaring with the pose
    for y in range(12 + by, 31): w = 5 + (y - 12 - by) // 3 + fl; R(c, 12 - w, y, 12 + w, y, "cape", f"cape{y}")
    R(c, 8, 24, 11, 30, "plate", "legL"); R(c, 13, 24, 16, 30, "plate", "legR")
    R(c, 7, 29, 11, 30, "crim", "bootL"); R(c, 13, 29, 17, 30, "crim", "bootR")
    E(c, 12, 18 + by, 6, 7, "plate", "torso"); R(c, 8, 23 + by, 16, 25 + by, "crim", "belt")
    if not back:
        E(c, 12, 17 + by, 2, 2, "core", "sigil")
        for (x, y), m in zip(((9, 15), (15, 15), (9, 19), (15, 19)), ("gR", "gV", "gC", "gG")): c.put(x, y + by, m, "base", f"gemb{m}")
        for (x, y), m in zip(((10, 15), (14, 15), (10, 19), (14, 19)), ("gR", "gV", "gC", "gG")): c.put(x, y + by, m, "base", f"gem{m}")
        L(c, (12, 13 + by), (12, 22 + by), "crim", "seam", 1)
    E(c, 6, 12 + by, 2.5, 2.5, "crim", "pauL"); E(c, 18, 12 + by, 2.5, 2.5, "crim", "pauR")
    for s, x0 in ((-1, 6), (1, 18)):
        hx, hy = x0 + s * fs, 21 + by + fy
        L(c, (x0, 13 + by), (hx, hy), "plate", f"arm{s}", 2)
        E(c, hx, hy, 1.5, 1.5, "crim", f"gaunt{s}")
        if a in ("cast", "rain", "prism", "dusk"): c.put(hx, hy, "gV" if s < 0 else "gC", "base", f"glow{s}")
    if a == "slash":  # crimson blade sweeping across
        hx = 18 + fs; L(c, (hx, 21 + by + fy), (hx + [0, -4, -9][i], 21 + by + fy - [8, 4, 0][i]), "crim", "blade", 1)
    hy2 = 7 + by + hu
    E(c, 12, hy2, 3, 3, "plate" if back else "skin", "head")
    if not back:
        R(c, 9, hy2 - 3, 15, hy2 - 3, "plate", "hood")
        for ex in (11, 13): c.put(ex, hy2, "eye" if not hu else "ink", "base", "eye")
    crown(c, 12, hy2 - 1 - (1 if a in ("rain", "dusk") else 0))

def side(c, a, i):
    fy, fs, by, fl = pose(a, i); hu = 1 if a == "hurt" else 0
    R(c, 12, 12 + by, 17 + fl, 30, "cape", "cape")
    R(c, 9, 24, 12, 30, "plate", "legB"); R(c, 12, 24, 15, 30, "plate", "legF")
    R(c, 8, 29, 12, 30, "crim", "bootB"); R(c, 11, 29, 15, 30, "crim", "bootF")
    E(c, 12, 18 + by, 5, 7, "plate", "torso"); R(c, 8, 23 + by, 15, 25 + by, "crim", "belt")
    c.put(8, 16 + by, "gR", "base", "gem1"); c.put(8, 19 + by, "gC", "base", "gem2")
    E(c, 13, 12 + by, 2.5, 2.5, "crim", "pau")
    hx, hy = 8 - fs, 21 + by + fy
    L(c, (12, 13 + by), (hx, hy), "plate", "arm", 2); E(c, hx, hy, 1.5, 1.5, "crim", "gaunt")
    if a in ("cast", "rain", "prism", "dusk"): c.put(hx, hy, "gV", "base", "glow")
    if a == "slash": L(c, (hx, hy), (hx - [2, 5, 7][i], hy - [8, 5, 1][i]), "crim", "blade", 1)
    hy2 = 7 + by + hu
    E(c, 11, hy2, 3, 3, "skin", "head"); R(c, 9, hy2 - 3, 14, hy2 - 2, "plate", "hood")
    c.put(9, hy2, "eye" if not hu else "ink", "base", "eye")
    crown(c, 11, hy2 - 1 - (1 if a in ("rain", "dusk") else 0))

M.front, M.side = front, side
if __name__ == "__main__":
    M.build("malachar")
    os.replace(os.path.join(M.HERE, "..", "..", "docs", "morvant_8x.png"), os.path.join(M.HERE, "..", "..", "docs", "malachar_8x.png"))
    import subprocess; subprocess.run(["git", "checkout", "--", "docs/morvant_8x.png"], cwd=os.path.join(M.HERE, "..", ".."))
