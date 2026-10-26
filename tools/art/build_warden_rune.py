"""Final boss sheet: WARDEN RUNE, LAST GUARDIAN OF THE WELLSPRINGS (Kindle Quest, Master Builder, W17). Original design.
64x80 frames (32x40 art grid, nearest 2x). A tall guardian of slate stone banded in gold, a gold halo-crest, a sealed
face plate with one cyan eye-slit, cyan rune seams down arms and chest; heavy stone fists. Rows idle, cast, slam, hurt,
seal x 4 facings. (The old 48x64 grotto sheet that used this name is now Ashmaw: tools/art/src/grotto_boss_base.png.)
Usage: python3 tools/art/build_warden_rune.py -> public/art/chars/warden_rune.{png,json} + docs/bill/warden_rune_8x.png"""
import mb_bigsheet as K
K.B.P.update({"slate": ["#6a7090", "#464c6a", "#2a2e48"], "slateD": ["#3e4260", "#2a2c44", "#1a1c30"], "gold": ["#ffe68a", "#e0aa34", "#946a1a"],
              "cyan": ["#8afcff"], "cyanD": ["#2ad0ff"], "core": ["#0e1424"]})
ANIMS = [("idle", 2), ("cast", 3), ("slam", 3), ("hurt", 1), ("seal", 3)]
def pose(a, i):
    """(fist dy, fist spread, bob, glow)"""
    if a == "idle": return 0, 0, [0, 1][i], 0
    if a == "cast": return [-6, -10, -12][i], [1, 3, 4][i], 0, 1
    if a == "slam": return [-14, -6, 5][i], [0, 1, 2][i], [0, 0, 1][i], 0
    if a == "hurt": return 2, -1, 1, 0
    if a == "seal": return [-3, -4, -4][i], [-2, -3, -3][i], 0, 1
    return 0, 0, 0, 0
def front(p, a, i, back):
    fy, fs, by, gl = pose(a, i); hu = 1 if a == "hurt" else 0
    p.R(10, 31, 14, 38, "slateD", "legL"); p.R(18, 31, 22, 38, "slateD", "legR")
    p.R(9, 37, 14, 38, "gold", "footL"); p.R(18, 37, 23, 38, "gold", "footR")
    p.E(16, 22 + by, 9, 10, "slate", "torso"); p.R(9, 29 + by, 23, 31 + by, "gold", "belt")
    if not back:
        p.E(16, 20 + by, 3, 3, "gold", "ring"); p.E(16, 20 + by, 1.6, 1.6, "core", "disc")
        p.P(16, 20 + by, "cyan" if gl else "cyanD", "heart")
        for (x, y) in ((11, 16), (21, 16), (11, 24), (21, 24), (13, 27), (19, 27)): p.P(x, y + by, "cyan", "seam")
    else:
        p.L((16, 13 + by), (16, 29 + by), "cyanD", "spine", 1)
    for s, x0 in ((-1, 6), (1, 26)):
        hx, hy = x0 + s * fs, 27 + by + fy
        p.E(x0, 14 + by, 3.5, 3, "gold", f"pau{s}")
        p.L((x0, 16 + by), (hx, hy), "slate", f"arm{s}", 3)
        p.P(x0 + (1 if s < 0 else 0), 20 + by, "cyan", f"armrune{s}")
        p.E(hx + 1, hy + 1, 3, 3, "slateD", f"fist{s}"); p.R(hx - 1, hy - 2, hx + 3, hy - 2, "gold", f"band{s}")
        if gl or a == "slam": p.P(hx + 1, hy + 1, "cyan", f"glow{s}")
    hy2 = 9 + by + hu
    p.E(16, hy2, 4, 4, "slate", "head")
    if not back: p.R(13, hy2, 19, hy2, "core", "visor"); p.R(14, hy2, 18, hy2, "cyan" if not hu else "core", "eye")
    p.L((11, hy2 - 3), (9, hy2 - 7), "gold", "crestL", 1); p.L((21, hy2 - 3), (23, hy2 - 7), "gold", "crestR", 1); p.R(15, hy2 - 6, 17, hy2 - 4, "gold", "crest")
    if a == "seal": p.P(16, hy2 - 7, "cyan", "sealgem")
def side(p, a, i):
    fy, fs, by, gl = pose(a, i); hu = 1 if a == "hurt" else 0
    p.R(12, 31, 16, 38, "slateD", "legB"); p.R(16, 31, 20, 38, "slateD", "legF")
    p.R(11, 37, 16, 38, "gold", "footB"); p.R(15, 37, 21, 38, "gold", "footF")
    p.E(16, 22 + by, 7, 10, "slate", "torso"); p.R(10, 29 + by, 22, 31 + by, "gold", "belt")
    p.P(10, 20 + by, "cyan" if gl else "cyanD", "heart"); p.P(20, 18 + by, "cyan", "seam"); p.P(19, 25 + by, "cyan", "seam2")
    p.E(17, 14 + by, 3.5, 3, "gold", "pau")
    hx, hy = 11 - fs, 27 + by + fy
    p.L((16, 16 + by), (hx, hy), "slate", "arm", 3); p.E(hx, hy + 1, 3, 3, "slateD", "fist"); p.R(hx - 2, hy - 2, hx + 2, hy - 2, "gold", "band")
    if gl or a == "slam": p.P(hx, hy + 1, "cyan", "glow")
    hy2 = 9 + by + hu
    p.E(15, hy2, 4, 4, "slate", "head"); p.R(11, hy2, 14, hy2, "core", "visor"); p.R(11, hy2, 13, hy2, "cyan" if not hu else "core", "eye")
    p.L((17, hy2 - 3), (19, hy2 - 7), "gold", "crest", 1); p.R(14, hy2 - 6, 16, hy2 - 4, "gold", "crestT")
    if a == "seal": p.P(15, hy2 - 7, "cyan", "sealgem")
if __name__ == "__main__":
    K.build("warden_rune", 32, 40, ANIMS, front, side, "stone-gold-cyan", {"fx_palette": {"rune": ["#8afcff", "#2ad0ff", "#e8fcff"], "gold": ["#ffe68a", "#e0aa34"]}})
