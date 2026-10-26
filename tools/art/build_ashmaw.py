"""Grotto boss sheet: ASHMAW, GROTTO DEVOURER (Kindle Quest, Master Builder). Original art.
Exact palette recolour of the old grotto-boss sheet (tools/art/src/grotto_boss_base.png, 48x64 frames, same frame map):
stone/moss -> ash greys and charcoal, blue rune glow -> ember orange. Ink #120e1c and hard alpha kept, so check_sheets
results match the base. Usage: python3 tools/art/build_ashmaw.py -> public/art/chars/ashmaw.{png,json} + docs/bill/ashmaw_8x.png"""
import json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..")
MAP = {"3a3a48": "3c3a42", "9a9aaa": "aaa6ac", "6e6e7e": "726e76",   # stone -> ash
       "2e4426": "2a2630", "4a6a3a": "4a4450", "6a8a4a": "645c68",   # moss -> charcoal / soot
       "1c62d8": "c8461a", "2ab4ff": "ff8a2a", "a6ecff": "ffd27a",   # rune glow -> ember
       "120e1c": "120e1c"}
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
M = {rgb(k): rgb(v) for k, v in MAP.items()}
im = Image.open(os.path.join(HERE, "src", "grotto_boss_base.png")).convert("RGBA"); px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a: px[x, y] = M[(r, g, b)] + (255,)
out = os.path.join(ROOT, "public", "art", "chars"); im.save(f"{out}/ashmaw.png")
j = json.load(open(os.path.join(HERE, "src", "grotto_boss_base.json")))
j["name"] = "ashmaw"; j["palette"] = "ash-ember"
for f in j["frames"]: f["name"] = f["name"].replace("warden_rune", "ashmaw")
json.dump(j, open(f"{out}/ashmaw.json", "w"), indent=1)
big = im.resize((im.width * 4, im.height * 4), Image.NEAREST); bg = Image.new("RGBA", big.size, (24, 20, 36, 255)); bg.alpha_composite(big)
bg.convert("RGB").save(os.path.join(ROOT, "docs", "bill", "ashmaw_8x.png"))
