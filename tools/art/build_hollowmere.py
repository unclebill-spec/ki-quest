"""Hushwater boss sheet: HOLLOWMERE, THE DRINKING COLOSSUS (Kindle Quest, Master Builder, W17). Original design.
64x64 frames (32x32 art grid, nearest 2x). A hunched marsh colossus of wet violet hide with a wide drinking maw, teal
glow pools on its back and shoulders, reeds hanging from its arms. Rows idle, walk, attack, hurt, sink x 4 facings.
JSON also carries the fog + ripple palette used by the fight VFX (hollowmere.ts). Usage: python3 tools/art/build_hollowmere.py
-> public/art/chars/hollowmere.{png,json} + docs/bill/hollowmere_8x.png"""
import mb_bigsheet as K
K.B.P.update({"hide": ["#7a5ab0", "#52388a", "#2e2058"], "hideD": ["#4a3478", "#30225a", "#1e163c"], "belly": ["#4a8a9a", "#2e6478", "#1c3e54"],
              "reed": ["#3a7a8a", "#245a6a", "#163a4a"], "tealG": ["#7affea"], "violG": ["#e0a0ff"], "maw": ["#0e0a1c"], "wet": ["#b8fff4"]})
ANIMS = [("idle", 2), ("walk", 4), ("attack", 3), ("hurt", 1), ("sink", 3)]
def pose(a, i):
    """(arm dy, arm spread, body bob, sink depth, maw open)"""
    if a == "idle": return 0, 0, [0, 1][i], 0, 0
    if a == "walk": return [0, 1, 0, 1][i], 0, [0, 1, 0, 1][i], 0, 0
    if a == "attack": return [-6, -3, 3][i], [0, 2, 3][i], 0, 0, [0, 1, 2][i]
    if a == "hurt": return 2, -1, 1, 0, 1
    if a == "sink": return [2, 3, 3][i], -1, 0, [3, 7, 11][i], 2
    return 0, 0, 0, 0, 0
def water(p, d):
    if d: p.E(16, 29, 13, 2.2, "belly", "ripple"); p.P(6, 29, "wet", "rip1"); p.P(25, 29, "wet", "rip2"); p.P(16, 28, "tealG", "rip3")
def front(p, a, i, back):
    ay, sp, by, d, mo = pose(a, i); y0 = by + d
    if not d:
        p.R(9, 25, 13, 30, "hideD", "legL"); p.R(18, 25, 22, 30, "hideD", "legR")
    p.E(16, 19 + y0, 11, 8, "hide", "body")
    if not back:
        p.E(16, 21 + y0, 6, 4.5, "belly", "belly")
        p.E(16, 15 + y0, 4, 1 + mo, "maw", "maw")
        for x in (12, 20): p.P(x, 11 + y0, "tealG", "eye")
    else:
        for (x, y) in ((11, 15), (20, 14), (16, 19), (13, 22), (19, 23)): p.P(x, y + y0, "tealG", "pool")
        p.L((16, 11 + y0), (16, 24 + y0), "hideD", "spine", 1)
    for s, x0 in ((-1, 6), (1, 25)):
        hx = x0 + s * sp; hy = 24 + y0 + ay
        p.L((x0, 14 + y0), (hx, hy), "hide", f"arm{s}", 3); p.E(hx + 1, hy + 1, 2, 2, "hideD", f"hand{s}")
        p.L((hx, hy + 2), (hx, min(hy + 5, 28)), "reed", f"reed{s}", 1)
        p.P(x0, 13 + y0, "violG" if a in ("attack", "sink") else "tealG", f"sh{s}")
    p.E(16, 10 + y0, 6, 3, "hide", "hump")
    water(p, d)
def side(p, a, i):
    ay, sp, by, d, mo = pose(a, i); y0 = by + d
    if not d:
        p.R(11, 25, 15, 30, "hideD", "legB"); p.R(17, 25, 21, 30, "hideD", "legF")
    p.E(16, 19 + y0, 10, 8, "hide", "body"); p.E(12, 22 + y0, 4, 4, "belly", "belly")
    p.E(18, 11 + y0, 6, 3, "hide", "hump")
    for (x, y) in ((20, 14), (23, 18), (18, 17)): p.P(x, y + y0, "tealG", "pool")
    p.E(8, 15 + y0, 4, 3, "hide", "head"); p.R(4, 15 + y0, 8, 15 + y0 + mo, "maw", "maw"); p.P(8, 13 + y0, "tealG", "eye")
    hx = 9 - sp; hy = 24 + y0 + ay
    p.L((14, 14 + y0), (hx, hy), "hide", "arm", 3); p.E(hx, hy + 1, 2, 2, "hideD", "hand"); p.L((hx, hy + 2), (hx, min(hy + 5, 28)), "reed", "reed", 1)
    water(p, d)
if __name__ == "__main__":
    K.build("hollowmere", 32, 32, ANIMS, front, side, "violet-teal-wet",
            {"fx_palette": {"fog": ["#2a2448", "#3e3a6a", "#5a5a8e"], "ripple": ["#7affea", "#3ac8c0", "#b070ff"], "wet_glow": ["#e0a0ff", "#7affea"]}})
