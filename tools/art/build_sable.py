"""Sable Kestrel, 4th companion (Kindle Quest, Master Builder): 24x32 hero sheet from the staging build_sprites.py hero generator
(same body/anim set as Mirela and Brann: base body + outfit layers, auto shading, #120e1c outline, hard alpha, right = left mirrored).
Black riding coat with violet lining, ash-plum long hair, silver clasp. The violet sash is drawn in game (draw.ts) like the others.
Usage: python3 tools/art/build_sable.py -> public/art/chars/sable.png/.json"""
import os, shutil, sys, tempfile
sys.path.insert(0, "/workspace/game-ideas/anime-fighter/staging/art/tools")
import build_sprites as B
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "..", "public", "art", "chars")
B.P.update({"hairS": ["#8a6a9a", "#5a4270", "#38284a"], "coatS": ["#3a3448", "#26222e", "#16141e"], "lining": ["#c070ff", "#8a48c8", "#56288a"]})
B.HEX = {h for v in B.P.values() for h in v}
B.HEROES["sable"] = dict(skin="skin", hair="hairS", hairstyle="long", build=-1,
    layers={"top": ("coatS", "coat_long"), "under": ("lining", None), "bottom": ("lining", "trousers"),
            "boots": ("leather", None), "gloves": ("leather", None), "acc": ("silver", "keys"), "belt": ("lining", None)})
tmp = tempfile.mkdtemp(); B.OUT = tmp
B.build("sable")
for ext in ("png", "json"): shutil.copy(f"{tmp}/public/art/sprite/sable.{ext}", f"{OUT}/sable.{ext}")
shutil.rmtree(tmp)
