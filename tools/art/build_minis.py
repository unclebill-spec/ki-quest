"""Mini-boss sheets (Kindle Quest, Master Builder). Original designs, same pipeline as build_morvant.py: drawn part-by-part on
the 24x32 grid with build_sprites.py (auto shading, 1 px ink outline, hard alpha), nearest 2x to 48x64 (shared boss grid,
pivot = feet). Rows = anim x facing (down, up, left, right); right = left mirrored. Anims shared by every mini:
stand 1, walk 4, dash 3, cast 3, slam 3, summon 2, hurt 1 (src/game/enemies/minis.ts maps moves onto these).
Usage: python3 tools/art/build_minis.py kettle [corvin gilt ombrelle]
-> public/art/chars/<name>.png/.json + docs/<name>_8x.png, then run check_sheets.py on the JSON."""
import os, sys, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_morvant as M
B = M.B
M.ANIMS[:] = [("stand", 1), ("walk", 4), ("dash", 3), ("cast", 3), ("slam", 3), ("summon", 2), ("hurt", 1)]
E, R, L = M.E, M.R, M.L
CAST = ("cast", "summon")

def pose(a, i):
    """(hand dy, hand spread, bob, lean)"""
    if a == "walk": return [0, 1, 0, 1][i], 0, [0, 1, 0, 1][i], 0
    if a == "dash": return [-2, 0, 1][i], [0, 1, 2][i], 0, [0, 1, 2][i]
    if a == "cast": return [-5, -7, -8][i], [1, 2, 3][i], 0, 0
    if a == "slam": return [-10, -6, 3][i], [-1, 0, 2][i], [0, 0, 1][i], 0
    if a == "summon": return [-11, -12][i], [2, 3][i], 0, 0
    if a == "hurt": return 2, -1, 1, 0
    return 0, 0, 0, 0

# ---------------- FOREMAN KETTLE: boiler-bellied stone golem, canvas apron, rivets, steam gauge, coal shovel -------------
def kettle_pal():
    B.P.update({"stone": ["#8a7a6a", "#62564a", "#3e3630", "#3e3630", "#3e3630"], "cop": ["#f0a060", "#c06a30", "#7a3a18", "#7a3a18", "#7a3a18"], "apron": ["#d8c49a", "#a8925e", "#6e5e3a", "#6e5e3a", "#6e5e3a"],
                "fire": ["#ffe070", "#ffe070", "#ffe070"], "fireR": ["#ff6a2a", "#ff6a2a", "#ff6a2a"], "steam": ["#bff8ff", "#bff8ff", "#bff8ff"], "gauge": ["#7ff0ff", "#7ff0ff", "#7ff0ff"], "iron": ["#5a5e66", "#3a3e46", "#24262c", "#24262c", "#24262c"]})

def kettle_front(c, a, i, back):
    fy, fs, by, ln = pose(a, i); hu = 1 if a == "hurt" else 0
    R(c, 7, 25, 10, 30, "stone", "legL"); R(c, 14, 25, 17, 30, "stone", "legR")
    R(c, 6, 29, 10, 30, "iron", "bootL"); R(c, 14, 29, 18, 30, "iron", "bootR")
    E(c, 12, 18 + by, 8, 7, "cop", "boiler")                                  # round copper boiler belly
    if not back:
        R(c, 8, 19 + by, 16, 26 + by, "apron", "apron")                       # canvas apron
        R(c, 10, 21 + by, 14, 23 + by, "iron", "grate"); c.put(11, 22 + by, "fireR" if a not in CAST + ("slam",) else "fire", "base", "coal"); c.put(13, 22 + by, "fire", "base", "coal2")
        E(c, 12, 15 + by, 1.6, 1.6, "iron", "gaugeRim"); c.put(12, 15 + by, "gauge", "base", "gauge")
        for x in (6, 18): c.put(x, 17 + by, "iron", "base", "rivet")
    else:
        L(c, (8, 14 + by), (16, 14 + by), "iron", "strap", 1); c.put(12, 18 + by, "iron", "base", "valve")
    # smokestack on the left shoulder, steam puff when working
    R(c, 6, 7 + by, 8, 11 + by, "iron", "stack")
    if a in CAST + ("slam", "dash"): c.put(7, 5 + by - (i % 2), "steam", "base", "puff"); c.put(6, 4 + by, "steam", "base", "puff2")
    E(c, 5, 12 + by, 2.5, 2.5, "stone", "pauL"); E(c, 19, 12 + by, 2.5, 2.5, "stone", "pauR")
    for s, x0 in ((-1, 5), (1, 19)):
        hx, hy = x0 + s * fs, 21 + by + fy
        L(c, (x0, 13 + by), (hx, hy), "stone", f"arm{s}", 3); E(c, hx, hy, 2, 2, "iron", f"mitt{s}")
        if a in CAST: c.put(hx, hy, "gauge", "base", f"glow{s}")
    if a in ("slam", "dash"):  # coal shovel in the right mitt
        hx, hy = 19 + fs, 21 + by + fy; L(c, (hx, hy), (hx, hy - 7), "apron", "haft", 1); R(c, hx - 1, hy - 10, hx + 1, hy - 8, "iron", "blade")
    hy2 = 8 + by + hu
    E(c, 12, hy2, 3, 2.5, "stone", "head"); R(c, 9, hy2 - 3, 15, hy2 - 2, "iron", "cap")
    if not back:
        R(c, 10, hy2, 14, hy2, "iron", "brow")
        for ex in (11, 13): c.put(ex, hy2, "fire" if not hu else "ink", "base", "eye")

def kettle_side(c, a, i):
    fy, fs, by, ln = pose(a, i); hu = 1 if a == "hurt" else 0
    R(c, 9, 25, 12, 30, "stone", "legB"); R(c, 13 - ln, 25, 16 - ln, 30, "stone", "legF")
    R(c, 8, 29, 12, 30, "iron", "bootB"); R(c, 12 - ln, 29, 16 - ln, 30, "iron", "bootF")
    E(c, 12 - ln, 18 + by, 7, 7, "cop", "boiler"); R(c, 6 - ln, 19 + by, 10 - ln, 26 + by, "apron", "apron")
    c.put(7 - ln, 15 + by, "gauge", "base", "gauge"); c.put(17 - ln, 17 + by, "iron", "base", "rivet")
    R(c, 14 - ln, 7 + by, 16 - ln, 11 + by, "iron", "stack")
    if a in CAST + ("slam", "dash"): c.put(15 - ln, 5 + by - (i % 2), "steam", "base", "puff")
    E(c, 13 - ln, 12 + by, 2.5, 2.5, "stone", "pau")
    hx, hy = 8 - fs - ln, 21 + by + fy
    L(c, (12 - ln, 13 + by), (hx, hy), "stone", "arm", 3); E(c, hx, hy, 2, 2, "iron", "mitt")
    if a in CAST: c.put(hx, hy, "gauge", "base", "glow")
    if a in ("slam", "dash"): L(c, (hx, hy), (hx - 5, hy - 4), "apron", "haft", 1); R(c, hx - 8, hy - 6, hx - 6, hy - 4, "iron", "blade")
    hy2 = 8 + by + hu
    E(c, 11 - ln, hy2, 3, 2.5, "stone", "head"); R(c, 8 - ln, hy2 - 3, 13 - ln, hy2 - 2, "iron", "cap")
    c.put(9 - ln, hy2, "fire" if not hu else "ink", "base", "eye")


# ---------------- REEDWRAITH CORVIN: tall boatman wraith, long reed-green coat, wide hat, violet lantern-eyes, ferry pole + lantern
def corvin_pal():
    B.P.update({"coat": ["#4a6a5a", "#2e463c", "#1a2a24", "#1a2a24", "#1a2a24"], "hat": ["#3a3448", "#262032", "#16121e", "#16121e", "#16121e"], "reed": ["#b8c870", "#8a9a48", "#566228", "#566228", "#566228"],
                "pole": ["#9a7a52", "#6a5034", "#40301e", "#40301e", "#40301e"], "lamp": ["#e8b0ff", "#e8b0ff", "#e8b0ff"], "lampC": ["#a060ff", "#a060ff", "#a060ff"], "face": ["#c8d0e0", "#98a0b8", "#687088", "#687088", "#687088"], "eye": ["#d070ff", "#d070ff", "#d070ff"]})

def corvin_front(c, a, i, back):
    fy, fs, by, ln = pose(a, i); hu = 1 if a == "hurt" else 0
    for y in range(13 + by, 31): w = 4 + (y - 13 - by) // 4; R(c, 12 - w, y, 12 + w, y, "coat", f"coat{y}")   # long coat, frayed hem
    for x in (8, 11, 14, 16): c.put(x, 30, "reed", "base", f"hem{x}")
    if not back:
        L(c, (12, 14 + by), (12, 29), "hat", "seam", 1); R(c, 9, 20 + by, 15, 20 + by, "reed", "sash")
    E(c, 7, 13 + by, 2, 2, "coat", "shL"); E(c, 17, 13 + by, 2, 2, "coat", "shR")
    hx, hy = 18 + fs, 21 + by + fy                         # pole hand
    L(c, (17, 14 + by), (hx, hy), "coat", "armR", 2); E(c, hx, hy, 1.2, 1.2, "face", "handR")
    L(c, (hx, hy + 7), (hx, hy - 12), "pole", "pole", 1)
    E(c, hx, hy - 13, 1.5, 1.5, "lampC" if a not in CAST else "lamp", "lantern")
    hx2, hy2 = 6 - fs, 21 + by + (fy if a in CAST else 0)
    L(c, (7, 14 + by), (hx2, hy2), "coat", "armL", 2); E(c, hx2, hy2, 1.2, 1.2, "face", "handL")
    if a in CAST: c.put(hx2, hy2, "lamp", "base", "glowL")
    h = 8 + by + hu
    E(c, 12, h, 2.5, 3, "hat" if back else "face", "head")
    R(c, 7, h - 3, 17, h - 3, "hat", "brim"); R(c, 9, h - 6, 15, h - 4, "hat", "crown"); c.put(12, h - 5, "reed", "base", "band")
    if not back:
        R(c, 10, h - 1, 14, h - 1, "hat", "shade")
        for ex in (11, 13): c.put(ex, h, "eye" if not hu else "ink", "base", "eye")

def corvin_side(c, a, i):
    fy, fs, by, ln = pose(a, i); hu = 1 if a == "hurt" else 0
    for y in range(13 + by, 31): w = 3 + (y - 13 - by) // 5; R(c, 12 - w - ln, y, 12 + w + 1, y, "coat", f"coat{y}")
    c.put(9, 30, "reed", "base", "hem"); c.put(14, 30, "reed", "base", "hem2")
    E(c, 12 - ln, 13 + by, 2, 2, "coat", "sh")
    hx, hy = 7 - fs - ln, 21 + by + fy
    L(c, (12 - ln, 14 + by), (hx, hy), "coat", "arm", 2); E(c, hx, hy, 1.2, 1.2, "face", "hand")
    if a == "dash": L(c, (hx + 3, hy + 2), (hx - 7, hy - 3), "pole", "pole", 1); E(c, hx - 8, hy - 4, 1.5, 1.5, "lamp", "lantern")
    else: L(c, (hx, hy + 7), (hx, hy - 12), "pole", "pole", 1); E(c, hx, hy - 13, 1.5, 1.5, "lamp" if a in CAST else "lampC", "lantern")
    h = 8 + by + hu
    E(c, 11 - ln, h, 2.5, 3, "face", "head"); R(c, 6 - ln, h - 3, 16 - ln, h - 3, "hat", "brim"); R(c, 9 - ln, h - 6, 14 - ln, h - 4, "hat", "crown")
    c.put(12 - ln, h - 5, "reed", "base", "band"); c.put(9 - ln, h, "eye" if not hu else "ink", "base", "eye")

# ---------------- CAPMOTHER GILT: matron mushroom, huge gilded cap with glowing spots, gilled skirt, root-arms, a root in her heart
def gilt_pal():
    B.P.update({"cap": ["#ffd070", "#e09a30", "#9a5a18", "#9a5a18", "#9a5a18"], "spot": ["#fff6c0", "#fff6c0", "#fff6c0"], "gill": ["#e8d8b0", "#b8a07a", "#806a4a", "#806a4a", "#806a4a"], "stalk": ["#f0e4c8", "#c8b890", "#8a7a5a", "#8a7a5a", "#8a7a5a"],
                "root": ["#8a5a3a", "#5e3a24", "#3a2214", "#3a2214", "#3a2214"], "glow": ["#9affc0", "#9affc0", "#9affc0"], "heart": ["#ff6a8a", "#ff6a8a", "#ff6a8a"], "eye": ["#3a2214", "#3a2214", "#3a2214"]})

def gilt_front(c, a, i, back):
    fy, fs, by, ln = pose(a, i); hu = 1 if a == "hurt" else 0
    for y in range(20 + by, 31): w = 5 + (y - 20 - by) // 2; R(c, 12 - w, y, 12 + w, y, "gill", f"skirt{y}")     # gilled skirt
    for x in (6, 9, 12, 15, 18): c.put(x, 30, "root", "base", f"foot{x}")
    E(c, 12, 17 + by, 4, 5, "stalk", "body")
    if not back: c.put(12, 17 + by, "heart", "base", "heart"); L(c, (12, 17 + by), (10, 20 + by), "root", "rootH", 1)
    for s, x0 in ((-1, 8), (1, 16)):
        hx, hy = x0 + s * (fs + 2), 21 + by + fy
        L(c, (x0, 15 + by), (hx, hy), "root", f"arm{s}", 2); c.put(hx + s, hy + 1, "root", "base", f"twig{s}")
        if a in CAST: c.put(hx, hy, "glow", "base", f"glow{s}")
    h = 9 + by + hu; top = h - 7 - (1 if a in ("summon", "slam") and i == 0 else 0)
    E(c, 12, h + 1, 3, 2.5, "stalk", "face")
    if not back:
        for ex in (11, 13): c.put(ex, h + 1, "eye" if not hu else "ink", "base", "eye")
    E(c, 12, top + 4, 10, 4.5, "cap", "cap"); R(c, 3, top + 6, 21, top + 7, "gill", "rim")
    for (x, y) in ((7, 2), (12, 1), (17, 2), (9, 4), (15, 4)): c.put(x, top + y, "spot" if a not in CAST else "glow", "base", f"spot{x}")

def gilt_side(c, a, i):
    fy, fs, by, ln = pose(a, i); hu = 1 if a == "hurt" else 0
    for y in range(20 + by, 31): w = 4 + (y - 20 - by) // 2; R(c, 12 - w - ln, y, 12 + w - ln, y, "gill", f"skirt{y}")
    for x in (7, 11, 15): c.put(x - ln, 30, "root", "base", f"foot{x}")
    E(c, 12 - ln, 17 + by, 3.5, 5, "stalk", "body"); c.put(10 - ln, 17 + by, "heart", "base", "heart")
    hx, hy = 7 - fs - ln, 21 + by + fy
    L(c, (11 - ln, 15 + by), (hx, hy), "root", "arm", 2); c.put(hx - 1, hy + 1, "root", "base", "twig")
    if a in CAST: c.put(hx, hy, "glow", "base", "glow")
    h = 9 + by + hu; top = h - 7 - (1 if a in ("summon", "slam") and i == 0 else 0)
    E(c, 11 - ln, h + 1, 2.5, 2.5, "stalk", "face"); c.put(9 - ln, h + 1, "eye" if not hu else "ink", "base", "eye")
    E(c, 12 - ln, top + 4, 9, 4.5, "cap", "cap"); R(c, 4 - ln, top + 6, 20 - ln, top + 7, "gill", "rim")
    for (x, y) in ((7, 2), (12, 1), (16, 3)): c.put(x - ln, top + y, "spot" if a not in CAST else "glow", "base", f"spot{x}")

# ---------------- LADY OMBRELLE: grave-cold noblewoman, pale blue gown, black lace parasol, veil, cold-blue candle glow
def ombrelle_pal():
    B.P.update({"gown": ["#9ab8e0", "#6a88b8", "#3e5a88", "#3e5a88", "#3e5a88"], "lace": ["#3a3448", "#24202e", "#14121a", "#14121a", "#14121a"], "skin": ["#e8ecf8", "#b8c0d8", "#8890b0", "#8890b0", "#8890b0"],
                "veil": ["#c8d8ff", "#98a8d8", "#98a8d8", "#98a8d8"], "cold": ["#7fe8ff", "#7fe8ff", "#7fe8ff"], "candle": ["#d0f8ff", "#d0f8ff", "#d0f8ff"], "eye": ["#7fe8ff", "#7fe8ff", "#7fe8ff"], "rose": ["#c04a8a", "#c04a8a", "#c04a8a"]})

def ombrelle_front(c, a, i, back):
    fy, fs, by, ln = pose(a, i); hu = 1 if a == "hurt" else 0
    for y in range(18 + by, 31): w = 3 + (y - 18 - by) * 2 // 3; R(c, 12 - w, y, 12 + w, y, "gown", f"gown{y}")
    for x in range(5, 20, 3): c.put(x, 30, "lace", "base", f"hem{x}")
    E(c, 12, 15 + by, 3, 4, "gown", "bodice")
    if not back: c.put(12, 14 + by, "rose", "base", "rose"); L(c, (12, 18 + by), (12, 29), "veil", "seam", 1)
    # parasol hand (right): open parasol over her head, swung forward on attacks
    hx, hy = 17 + fs, 18 + by + fy
    L(c, (14, 13 + by), (hx, hy), "gown", "armR", 1); c.put(hx, hy, "skin", "base", "handR")
    if a in ("dash", "slam"):
        L(c, (hx, hy), (hx + 3, hy - 6), "lace", "shaft", 1); E(c, hx + 4, hy - 8, 3, 2, "lace", "canopy")
    else:
        L(c, (hx, hy), (hx - 1, hy - 14), "lace", "shaft", 1); E(c, 11, 2 + by, 8, 2.5, "lace", "canopy"); c.put(11, 0 + by, "lace", "base", "tip")
        for x in (4, 18): c.put(x, 3 + by, "veil", "base", f"tassel{x}")
    hx2, hy2 = 7 - fs, 19 + by + (fy if a in CAST else 0)
    L(c, (10, 13 + by), (hx2, hy2), "gown", "armL", 1); c.put(hx2, hy2, "candle" if a in CAST else "skin", "base", "handL")
    h = 9 + by + hu
    E(c, 12, h, 2.5, 3, "veil" if back else "skin", "head"); R(c, 9, h - 3, 15, h - 2, "lace", "hat")
    if not back:
        R(c, 10, h - 1, 14, h - 1, "veil", "veil")
        for ex in (11, 13): c.put(ex, h, "eye" if not hu else "ink", "base", "eye")

def ombrelle_side(c, a, i):
    fy, fs, by, ln = pose(a, i); hu = 1 if a == "hurt" else 0
    for y in range(18 + by, 31): w = 3 + (y - 18 - by) // 2; R(c, 12 - w - ln, y, 12 + w, y, "gown", f"gown{y}")
    for x in range(7, 18, 3): c.put(x, 30, "lace", "base", f"hem{x}")
    E(c, 12 - ln, 15 + by, 2.5, 4, "gown", "bodice"); c.put(10 - ln, 14 + by, "rose", "base", "rose")
    hx, hy = 8 - fs - ln, 18 + by + fy
    L(c, (11 - ln, 13 + by), (hx, hy), "gown", "arm", 1); c.put(hx, hy, "candle" if a in CAST else "skin", "base", "hand")
    if a in ("dash", "slam"): L(c, (hx, hy), (hx - 5, hy - 3), "lace", "shaft", 1); E(c, hx - 7, hy - 4, 2, 3, "lace", "canopy")
    else: L(c, (hx, hy), (hx + 1, hy - 14), "lace", "shaft", 1); E(c, 12, 2 + by, 7, 2.5, "lace", "canopy")
    h = 9 + by + hu
    E(c, 11 - ln, h, 2.5, 3, "skin", "head"); R(c, 8 - ln, h - 3, 14 - ln, h - 2, "lace", "hat"); R(c, 8 - ln, h - 1, 10 - ln, h - 1, "veil", "veil")
    c.put(9 - ln, h, "eye" if not hu else "ink", "base", "eye")

BOSSES = {"kettle": (kettle_pal, kettle_front, kettle_side, "ember-steam"), "corvin": (corvin_pal, corvin_front, corvin_side, "fen-violet"),
          "gilt": (gilt_pal, gilt_front, gilt_side, "glowcap-gold"), "ombrelle": (ombrelle_pal, ombrelle_front, ombrelle_side, "grave-cold")}

def run(name):
    pal, fr, sd, palname = BOSSES[name]; pal(); M.front, M.side = fr, sd
    M.build(name)
    root = os.path.join(M.HERE, "..", ".."); os.replace(os.path.join(root, "docs", "morvant_8x.png"), os.path.join(root, "docs", f"{name}_8x.png"))
    subprocess.run(["git", "checkout", "--", "docs/morvant_8x.png"], cwd=root)
    js = os.path.join(M.OUT, f"{name}.json"); d = json.load(open(js)); d["palette"] = palname; json.dump(d, open(js, "w"), indent=1)

if __name__ == "__main__":
    for n in sys.argv[1:] or list(BOSSES): run(n)
