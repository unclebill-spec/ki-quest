# HANDOFF: Ki Quest (team build, 2026-10-23)
## Claims (check before working; pull before push)
- **Master Builder:** src/game/combat/, src/game/enemies/, public/art/chars/ (combat, techniques, power-up/transform, enemies + bosses, hero/enemy sprites incl. staging rook/mirela/brann).
- **Cozy Builder:** menus (tabs, gear), save/load, input, PWA, test suite (starts after Gravewake ships).
- **Executor (this agent):** world + areas (src/world.ts, src/areas/), story + NPCs + dialogue (src/story/), audio integration (src/audio.ts, public/audio/), integration, gh-pages deploy (only the executor deploys).
## Progress
- 2026-10-23 22:50 executor: chunk W1 done + deployed (0.2.0): audio, Area 1 layout + Wickhaven NPCs + intro, Area 2 Hushwater layout, updraft travel, sealed ward, Lens map. Tests: `npx vite build && node tests/world.mjs && node tests/smoke.mjs`.
  - Integration hooks for others: `game.bossActive = true` switches to boss music; `game.area.spawns` kinds are still brute/wisp placeholders (Master Builder: map 'g'/'w' in src/areas/maps.ts to real enemy kinds, add boss marker as needed). Ward level is Lv 4 for now (story says Lv 8; raise when Area 1 has enough foes + Warden Rune/Hollowmere).
  - Note: `npm run build` runs `tsc` over all of src, so uncommitted WIP in src/game/ breaks it; the executor builds with `npx vite build` + filtered tsc.
- Next (executor): Area 1 hidden spring + glow-orb collectibles (Lost Lanterns), Hushwater second NPC wave / quests, world-map flight screen, Area 1 boss arena layout (Wellspring Grotto) for Master Builder's Hollowmere.
- Master Builder owns `src/game/combat/` and `src/game/enemies/` (combat + RPG systems). Hooks in other files are marked `// MB hook`.
- 2026-10-23 22:50 (art executor): `public/art/chars/` added. Heroes rook/mirela/brann (24x32, 104 frames: idle4 walk4 punch1/2 kick blast 3 each, block2 hurt2 fly2; fly sits on ground row). Enemies 24x32: vesper_squire (rusher: stand1 walk4 attack3 hurt1), vesper_hexer (shooter, same, attack = bolt cast with orb), watch_guard (tank, + block2). Boss warden_rune 48x64: stand walk4 attack3 hurt1 + stomp3 beam3 guard2. Rows = anim x facing (down,up,left,right), cols = frame; right = mirrored left. Index: `public/art/chars/frames.json`; refs on white in `refs/`. All groups pass sprite_check (boss tolerances x2 for the 2x scale). Generator: game-ideas/anime-fighter/staging/art/tools/build_enemies.py. No game code changed.

- Executor W2 (done, live): Lost Lanterns — 6 `*` glow orbs in Lanternmoss (story flags orb_*/orbs/orbsDone), Pip gives +120 EXP, cyan dots on Lens map. Next: hidden spring, Hushwater quests, Wellspring Grotto arena layout.
- 2026-10-23 23:00 Master Builder: combat 0.3.0 on main (techniques, power meter/transform, rusher/shooter/tank, Warden Rune boss + arena, sprites). Test: `node tests/combat.mjs`. Hooks marked `// MB hook`. Boss arena is tile (38,17) in lanternmoss (`ARENA` in src/game/enemies/boss.ts) — move it when the Wellspring Grotto layout lands.
- 2026-10-23 23:00 Master Builder: combat 0.3.0 on main (techniques, power meter/transform, rusher/shooter/tank, Ashmaw boss + arena, sprites). Test: `node tests/combat.mjs`. Hooks marked `// MB hook`. Boss arena is tile (38,17) in lanternmoss (`ARENA` in src/game/enemies/boss.ts) — move it when the Wellspring Grotto layout lands.
- Executor W3 (done, live): hidden spring — `K` spring behind `V` false water (SW corner Lanternmoss); first visit +3 stat points (flag spring), always full heal; Joss hints it.
- Executor 22:40: integrated MB combat (add5a79) — world 17/17, smoke 19/19, combat 18/18, scans clean, deployed + live OK. world.mjs honors KI_PORT. Shots for Bill in docs/bill/. Tile art/renderer frozen for MB rework. Next: Hushwater quests, Wellspring Grotto arena (update ARENA in src/game/enemies/boss.ts if moved), flight screen.

## Ground textures (2026-10-23, Master Builder)
- Ground was flat 16x16 colour squares on a 2-tone checker with hard grid edges. Now `src/areas/groundgen.ts` (reusable generator) builds, per theme, 4 seeded variants of floor/moss/path/plaza/water with 3-step Bayer-dithered noise + detail pixels (tufts, pebbles, cracks, seam moss, spores), plus ragged edge/corner fringes by priority (moss > path > floor > plaza > water; dark rim on shores). Variant chosen by position hash. Nearest-neighbour only.
- `art.ts tile()` takes optional `tiles` (draw.ts passes `a.tiles`); without it the old flat path still runs. Walls, collision, maps unchanged.
- `node tests/ground.mjs before|after` (KI_PORT, default 4181) -> docs/ground_<tag>_*.png + fps @4x CPU throttle (56 fps after, 57 before).
- Executor W4: Hushwater quests (Ferry Bell for Fen, Quiet the Meadow x8 for Tallis, Lantern Oath with Mirela) + Orrin NPC; Wellspring Grotto rock ring around ARENA (38,17), entrances W and S, zone banner; ward now Lv 8.
- Executor W5: world-map flight screen (Mirrorfen Reaches, 3.2 s, route + locked spots) in src/areas/art.ts flightMap; story.flyFrom. Shots in docs/bill/ (ground, flight, hushwater-quests, grotto). Next: Grotto interior dressing, Mirela as companion hook, area 3 stub.
- 2026-10-23 22:55 Master Builder: combat SFX batch 2 wired. Combat code queues one-shots on `g.mb.sfx` and sets `g.mb.hover`; src/audio.ts drains the queue each frame and runs loops via `Audio.loop()` (only in mode "play"). Map: beam charging -> kiblast-charge-loop (loop, 0.5); beam reaches full -> kiblast-charge-full (0.7); bolt/beam/scatter release -> blast-fire (unchanged, stats.blasts); transform start -> transform-powerup (1.0, ducks music); transform revert -> flight-land (0.7); transformed hover start -> flight-takeoff (0.7), while hovering -> flight-loop (loop, 0.5), hover ends -> flight-land. Files in public/audio/. area2-theme.ogg untouched.
- 2026-10-23 23:20 Master Builder: Mirela companion (`src/game/combat/companion.ts`, state on `g.mb.ally`). Joins when story flag `oath` (Lantern Oath, src/story/index.ts) is set or the save has `mirela: true` (new optional SaveRecord field; old saves load without it). Follows ~20 px behind the hero, never rests in 1-tile gaps, teleports beside the hero when >170 px away, stuck 0.8 s or inside a wall. AI: melees nearest foe within 120 px (leash 100 px from hero), ki bolt every ~4-6 s, retreats under 30% HP, steps back from boss telegraphs. Damage 2.5+0.5*lvl melee / 4+0.7*lvl bolt (below hero). Takes foe shots, brute lunges, hazards; KO at 0 HP, revives 60% after 3 s with no foes near (and no boss fight) or full on a save pad. Drawn from public/art/chars/mirela sheet with a teal sash + HP pip bar. Hooks: game.ts updateAlly/record/load, ai.ts hazards, draw.ts allyDraw, save.ts field (all `// MB hook`). Test: `KI_PORT=4393 node tests/companion.mjs` (14 checks, writes docs/companion-fight.png).

## W6 (executor, 10:58 PM): Grotto decor, Kilnreach (area 3), Lv 8 balance
- Grotto: plaza floor inside the ring plus 16 glowing `C` crystal props (wall collision and a light each). docs/bill/grotto.png
- Kilnreach: ember theme (lava water, ember spires), Forge Square with Brann Okoro (k), Dace (q) and Tib (e), and 9 spawns. Reached by a second updraft stone `Y` in Hushwater (Def.to2), which only works once flags.oath is set. It replaces the ??? spot at (0.86, 0.72) on the flight map. Its objective line points to the quarry next. docs/bill/kilnreach.png
- Balance: expNext = 12*l^1.3 (about 534 EXP to Lv 8). Quest rewards now use g.gainExp, so they trigger level-ups. Brann gives +60.
- tests/world.mjs has 25 checks. Integrated Mirela companion (239188d); docs/bill/mirela.png is copied from companion-fight.png.
- Next: themed Kilnreach houses (they still use the mushroom roof), a quarry dungeon with a boss, Brann joining.

## W7 (executor, 11:10 PM): forge houses, Emberheart Quarry, Brann quest
- Kilnreach houses now draw as ember-theme stone smithies (slate roof, chimney, glowing forge door, orange light).
- New area `emberquarry` "Emberheart Quarry" (maps.ts EMBERQUARRY): lift `U` back to Kilnreach, save `S`, warm spring `K`, 10 spawns, lava pools, Heart-Ember orb `*` at (33,6).
- **Boss arena slot for Master Builder:** a round open chamber, zone "Quarry Heart", exported as `QUARRY_ARENA = { tx: 38, ty: 16, r: 7 }` from src/areas/maps.ts. No boss is wired there yet.
- Brann quest: talking to him the first time sets metBrann and brannQ (+60 EXP) and unseals the Kilnreach quarry lift `Y` (Quarry Road east). Picking up the orb sets flags.heart. Handing it in sets **flags.brann** (+150 EXP, +2 pts). Companion join is Master Builder's: hook on flags.brann the same way as Mirela/oath.
- tests/world.mjs is now 29/29. Screenshots: docs/bill/kilnreach.png, quarry.png, quarry-arena.png.

## W8 (executor, 11:20 PM): brighter quarry, post-boss beat, area 4 Drowned Vesper
- **For Master Builder:** when the quarry boss dies, set story flag **`quarryBossDown = true`** (`window.__ki.story.flags.quarryBossDown = true; story.save()`, or from game via the bound story). The story layer handles everything after that:
  - a one-time Brann scene in the quarry (flag quarryBeat, +120 EXP, first Malachar name-drop);
  - new Brann lines;
  - it wakes the drowned-sun slab `Y` at the arena's east edge (38+6,16), which flies you to area 4.
  - Keep the boss arena clear of (44,16).
- Quarry lighting: lava tiles now cast light (ember and tide themes), plus a soft fill light in emberquarry.
- Area 4 `drowned` "Drowned Vesper" (theme `tide`, maps.ts DROWNED): a sunken sun-city of canal blocks and bridges. Its centre is Tidewarden Court, with Neri Calloway (n), Old Calder (x) and a spring. Houses draw as stone domes and trees as coral pillars. 10 spawns. Fits staging world.md, where area 4 is a drowned city.
  - Quest: the sun-sigil orb on Sigil Quay sets flags.sigil. Showing it to Neri sets flags.sigilDone (+200 EXP, +2 pts) and gives the Sunwarden-guard reveal.
  - Flight map: the last ??? spot is now Drowned Vesper.
- tests/world.mjs is 33/33 and simulates the boss flag. Screenshots: docs/bill/quarry-after-boss.png, drowned.png, map-area4.png.
## W8 (Master Builder, Oct 23): Brann companion + Slagheart quarry boss
- Companions: src/game/combat/companion.ts — ROLES table (mirela/brann), `g.mb.allies` list, `updateAllies` (+ separate()), taunt (Enemy.taunt/tauntBy, read in enemies/ai.ts). Joins via story flag (`oath`, `brann`).
- Slagheart: src/game/enemies/slagheart.ts, own `g.mb.boss2` BossState; ARENA2 is derived from QUARRY_ARENA (move the arena there). Debug hook `globalThis.__kiMB = { startSlagheart, slagLog, ARENA2, MOVES2 }`.
- Sprite generator: tools/art/build_slag_golem.py (re-run, then check_sheets.py).
- Tests: tests/boss2.mjs (port 4394). Combat phase-moves check is seeded + state-driven (5/5 clean).

## W9 (World/Story) — Undertide, general arena slot, Sable hooks, per-area music
- New area `undertide` ("The Undertide", tide theme) via `Y` stone on Drowned Vesper's Sigil Quay (43,29), gated on `sigilDone`.
- **Master Builder:** `UNDERTIDE_ARENA = {tx:37,ty:17,r:6}` exported from src/areas/maps.ts; drowned Wellspring `K` at the centre, entry by the south bridge. Please spawn the tide general there and set `story.flags.tideBossDown = true` on defeat; that triggers the Sable beat (`sable3`, +150 EXP) and objective change.
- Sable flags: `sable1` (Vesper balcony after sigil), `sable2` (approach to Wellspring), `sable3` (after tideBossDown). Sable is a foe now; save her turn for later.
- Audio: `area.music` may be `"a|b|c"`; `Audio.HAVE` lists shipped tracks and the first one present plays. **Sound team:** wanted `area3-theme` (Kilnreach), `quarry-theme`, `area4-theme` (Vesper), `undertide-theme`. Drop the files in staging/sound; World adds them to public/audio + HAVE. area2-theme now shipped (Hushwater, Vesper fallback).
