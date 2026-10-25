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
- **Story team:** the quarry boss is **Slagheart** in the live build (Master Builder's code). Please use Slagheart instead of "Ashmaw" in staging/story/area3.md. Grotto boss banners now read WARDEN RUNE. The tide general in the Undertide is Count Aurel (area4.md); live flag `tideBossDown` = story `aurelDown`. Sable's Hall lines from area4-5_beats.md are in sable2/sable3.

## W10 (World/Story): the Archive (Malachar unmasked), Area 5 Sunwarden's Stair, new music
- **Archive + Malachar:** returning to Drowned Vesper with `tideBossDown` set plays the Archive (3 records), the party's lines, and Malachar's red-lamp projection. Flags: `twist`, then `malachar`. `malachar` wakes a new `Y` stone in the Undertide (8,27) to the Stair.
- **Area 5 `stair`** (theme `violet`, floating rings over void `~`). It has the ruined waystation, a nearly dry spring, Captain Orlo Fenn (`o`) and a crown shard `*`.
- **Master Builder slots** (src/areas/maps.ts):
  - `STAIR_CAGE {24,15,r5}`: the Red Cage ring. Pylons `C` at (21,14), (27,14) and (24,18); the Cageward Twins and the eclipse golem go here. Set `story.flags.cageDone = true` when the cage breaks. That plays Sable's join beat and sets `sableJoin`, which should unlock Sable as the 4th companion (kit in cast.md).
  - `STAIR_ARENA {32,5,r4}`: Morvant, the Eclipse Golem. Set `morvantDown`; that plays the threshold beat (`threshold`) and sets up the finale.
  - Optional per-area `bossMusic` on the area def: quarry, Undertide and Stair use `boss2-theme`, and the grotto keeps `boss-theme`.
- **Music:** now shipped are kilnreach-theme, kilnreach-quarry, drowned-vesper and boss2-theme (credits copied from staging). **Sound team still wanted:** `undertide-theme`, `stair-theme`, and later a finale theme.
- **Deploy gate:** kq-deploy.sh now refuses to push main or gh-pages unless gitleaks (full git history + built dist, with the scan count confirmed) and extra_secret_patterns (repo + dist) all pass.

## W11 (World/Story) — Stair brightened, Husk Sun finale, dawn + credits, day/night
- Stair (violet theme) is lighter now. Rings have neon edges, and the dead husk sun hangs in the void SE of the rings (art.ts SUN).
- New area `husk` ("The Husk Sun") is reached by the `Y` stone on the Stair top ring and is gated on `threshold`. New theme `husk`.
- **Master Builder:** please put Malachar Vesh in `HUSK_ARENA={tx:24,ty:15,r:8}` (maps.ts) and set `story.flags.malacharDown=true` on his defeat. The story then runs the Wellspring pour, Malachar's end, the dawn and Rook's last line, then a credits roll (`story.credits`, skippable), and sets `dawn`.
- After `dawn`, every area runs a 4-min day/night cycle (`dayK` in art.ts).
- **Sound team:** please make `husk-theme` (area loop) and `finale-theme` (Malachar fight). Both fall back to existing tracks for now.

## W11b — dead sun bigger/closer (SUN 38,25 r104), stronger daylight. Still waiting on Master Builder: Aurel, Twins, Morvant, Malachar (no commits since 031b842).
## MB W10b (Master Builder): Count Aurel, Undertide boss
- Module src/game/enemies/aurel.ts; state `g.mb.boss3`; `isBigBoss(kind)` in types.ts covers boss/slag/aurel (hit radius, separation, hurt time). Triggers when the hero is within 80 px of the spring in UNDERTIDE_ARENA; spawns north of the spring.
- Spring rule: `place()` drops hazards overlapping the 26 px spring radius (`aurelLog.dropped`), steering + clamp keep his body off (`aurelLog.minBossD`). Hazards carry `tide: true` (drawn cyan/violet).
- Defeat sets `story.flags.tideBossDown` (gates Sable/Archive) and saves `boss3`. Test hooks merged into `globalThis.__kiMB`: startAurel, aurelLog, ARENA3, MOVES3, springOf, SPRING_R.
- Note: walking to the Undertide spring now starts the fight; tests that fake tideBossDown must stand boss3 down (see world.mjs).

## W11c — pulled Count Aurel (313f198). Added tests/aurel-story.mjs: real fight, Aurel killed through damage, sets tideBossDown, then the Archive and Malachar reveal plays (5/5). Next from MB: Twins (set cageDone), Sable (sableJoin), Morvant (morvantDown), Malachar (malacharDown).

## MB W11d (Master Builder): Cageward Twins + Sable
- Twins + 3 pylons in the Stair Red Cage (src/game/enemies/twins.ts, ARENA4 = stair 24,15 r88; pylons 21,14 / 27,14 / 24,18). Defeat sets `cageDone` + saves `boss4`; story is expected to set `sableJoin` (Sable companion in companion.ts ROLE table, caster/healer).
- Tests: KI_PORT=… node tests/boss4.mjs / companion.mjs. Ports 4392-4396 are held by the ki-rpg/ki-rpg-mb previews: use 4480+ or tests hit the wrong build.

## W11d: pulled the Twins and Sable (c1440df). tests/twins-story.mjs (port 4488) covers a real Twins kill, cageDone, the Sable join scene and Sable following: 5/5. Run all suites with KI_PORT>=4480. Story note: MB code comments call Sable "she"; story/credits copy should agree, so pick one. Next: Morvant (morvantDown), then Malachar (malacharDown in HUSK_ARENA).
## MB W11e (Master Builder): Morvant, the Eclipse Golem
- Code: src/game/enemies/morvant.ts (ARENA5, MOVES5, TELE5, morvantLog; `__kiMB.startMorvant`). Wiring in types/state/ai/game/companion/draw.
- Trigger: story.cageDone && !morvantDown, hero within r-16 of (32,5). Boss y clamped so he stays framed (ring is at map top edge; camera clamped at 0).
- Hazards with `safe` are dmg 0 markers (updateHazards skips them).
- Test: `KI_PORT=4487 node tests/boss5.mjs` → docs/boss5-p4.png. Phase loop retries damage until the phase flips and floors hp so allies cannot kill him mid-test (8/8 clean).

## MB W11f (Master Builder): Malachar Vesh, the Last Dusk
Final boss in src/game/enemies/malachar.ts (trigger: huskIn, !malacharDown, no story box, hero within r-24). 5 phases, telegraphs (TELE6), banners (BANNERS6), lockT shield on phase change. Kill → malacharDown + boss6 saved → existing story ending (src/story/index.ts ~119) plays the Wellsprings scene, dawn, credits. Debug: __kiMB.startMalachar/malacharLog (beams = last prism beam count). Test: KI_PORT=4491 node tests/boss6.mjs (18/18, 6 consecutive runs). Particles palette gained index 12 green (C_GREEN). All suites green on 4501-4511.

## W12 (World/Story): boss list complete, full-run release
- Pulled Morvant (f0fe80b) and Malachar (f51cb09). The HANDOFF merge checked out: no conflict markers, and every section is in order.
- `threshold` is set by the story from `morvantDown`, so no change was needed. tests/morvant-story.mjs covers a real kill, the ASCEND line, the stone opening and the Husk Sun (6/6).
- tests/malachar-story.mjs covers a real 5-phase kill, the Wellsprings, Malachar's last words, Rook, dawn and credits (8/8).
- tests/fullrun.mjs runs from a new game to the credits with all 5 bosses as REAL kills and no hand-set progress flags (57/57). Area hops are mostly real stone rides; the Kilnreach/Quarry hops still use story.enter.
- Use KI_PORT>=4480.
- Test gotcha: never return story.box from page.evaluate. Its `then` callback makes Playwright treat it as a promise and hang. Return `.who`/`.lines` instead.
- **MB:** boss3 "P3 drowned soldiers" failed once in 4 runs (minions:0, summons:1). It looks timing-flaky.
- **Sable pronoun:** staging/story says **she/her**. The story team's word wins. Live story copy already matches; MB comments match too.

## W13 (NPC bob fix, Bill 5:31 AM)
- src/areas/art.ts `npc()`: idle bob now `npcBob(id, t)` (g.time + per-id phase). It used to use **screen x**, so camera scroll sped up/jittered the bob while walking. Shared NPC code: don't feed screen coords into animation phases. Last bob is mirrored to `globalThis.__kiNpcBob[id]` (+`id@x`) for tests.
- tests/npc-bob.mjs: still vs walking flips/s must match (old code: 1.25 vs 24.25/s).
- Audio: kilnreach-theme, kilnreach-quarry, drowned-vesper, boss2-theme were already in public/audio, Audio.HAVE and world.ts (kilnreach, emberquarry, drowned/undertide/stair, boss2 for quarry+). Byte-identical to staging, <=1MB, 128k, loop=true, seams checked. No change.

## MB W13b: boss3 "P3 drowned soldiers" flake fixed
- Cause: the P3 loop stops as soon as the first summon fires (summons>0), then the P4 loop runs up to 9000 more frames with companions fighting; they kill the 20 HP soldiers, and `minions` was only counted after P4 → minions:0, summons:1 (~1 in 4 runs, depends on how many summons happened before exit). Not Aurel gameplay.
- Fix (tests/boss3.mjs only): `minions` = peak soldiers alive during phase 3 (still must be 1..4); `minionsEnd` reported for info. boss3 10/10 on ports 4521-4530.
## Mini-boss specs (W15, World side done; fights are Master Builder's)
World side shipped: arena spaces are open floor already (no map edits), lead-in one-shot beats in `src/story/index.ts` (fire on entering r+1 tiles once the gate is open; set `<x>Seen`), quest hook (Odile → `capQ`), and before/after NPC lines in `src/story/script.ts`. Test: `tests/minibosses-story.mjs`. Your part per boss: module `src/game/enemies/<name>.ts` (+FoeKind, `bossN`, `updateArenaN` in game.ts), wake inside the arena when the gate is true, set the done flag on death via `__ki.story.flags` + save (like Slagheart → `quarryBossDown`). Bark lines: staging/story/npc_lines.md "Bosses".
| Boss | Area | Arena (tile x,y) r | Gate (wake only if) | Sets on death | Slot | Notes |
|---|---|---|---|---|---|---|
| Foreman Kettle | emberquarry (Cinder Galleries, lava pool) | (26,12) r3 | `brannQ && !heart && !kettleDown` | `kettleDown` | boss7 | spawns `w`(26,10), `g`(22,14) inside: clear them. Optional: guard Heart-Ember orb pickup on `kettleDown`. Placeholder sheet: slag_golem palette-shift, different silhouette. Dace's lines read `brannQ`/`kettleDown`. |
| Reedwraith Corvin | hushwater (Sunken Meadow south tip, by Ferry Bell) | (25,26) r3 | `reedQ && !bell && !corvinDown` (with the orb guard below, `bell` stays false until he falls) | `corvinDown` | boss8 | Add orb guard: bell not pickable until `corvinDown` (only when the fight ships, or the bell quest soft-locks). Lead-in trigger is tighter, (25,25) within 2 tiles, so it never fires on the bell itself (25,29). Echo decoys = `minion`; exclude minion kills from `reedN`. Fen's line reads `corvinDown`. |
| Lady Ombrelle | hushwater (Lantern Graveyard island, option B) | (40,7) r3 | `oath && mb.boss.done && !ombrelleDown` | `ombrelleDown` | boss9 | Graves `G` are walls; ring is tight (open rows 5,7,8). Spawn `w`(42,8) inside: clear. Then a Sable beat `ombrelleBeat` (Story). Mirela's line reads `ombrelleDown`. |
| Capmother Gilt | lanternmoss (Glowcap ring, SE) | (39,27) r3 | `capQ && !capDone` | `capDone` (+boots/stat pts; gear.ts is Cozy's) | boss10 | `capQ` from talking to Odile after `metAma`. Spawn `w`(43,27) just outside the ring. Odile's lines read `capQ`/`capDone`. |
Slots: Story suggested build order Kettle → Corvin → Capmother → Ombrelle; boss numbers above are suggestions, renumber freely.

## HD2D W14: menus, gear, save slots (2026-10-24, HD-2D Cozy Builder)
- **Pause menu** (src/menu.ts; draw.ts calls `drawMenu`, game.ts `menu()` calls `menuStep`): tabs Status / Gear / Lens (bios of you, allies joined, bosses beaten) / Map / Options (sound, screen shake, controls) / Save.
  Keys: Esc/Start open+close · A/D, left/right, stick/d-pad or Q/LB (next), Shift/RB (prev) switch tabs · W/S/arrows rows · J/Enter/Space/pad A choose · K/pad B back. Touch: tap a tab; tap a row to select, tap again to choose; "Back" bottom right. No combat keys rebound.
  input.ts gained `tapX/tapY` (direction keys pressed+released inside one frame) so quick WASD taps register in menus.
- Legacy Status list: `MENU_ROWS` moved off-canvas (x -9999) so main.ts's old tap handler is dead; menu.ts binds its own canvas pointer listener. main.ts was not edited (N64 has edits pending in it).
- **Gear v2** (src/gear.ts, GEAR_SPEC v2/v2.1): 5 slots (Head h / Garb a / Hands w / Feet f / Charm c), 33 items, stats STR/POW/END + new **SPD** (move speed ×(1 + 0.04·SPD), small). Icons: public/icons/gear-icons.png (Art v2), text from Story gear_text.md. Sources (`earned()`/`g.syncGear()` every 0.5 s, toast "New gear: …"):
  L = level · S = shop in that area's town (`g.buy(id)`, price = lvl×15 coins) · B = boss downed flag (`BOSS` map: flag / alt flag / MB `done`) · Q = story flag. Owned list `g.have`; `g.equip` needs ownership.
  Names: a0 Traveler's Wrap, a6 Kindleheart Garb, h5 Tide Crown, c6 Sunheart (no "ki"/"Gi" in player text). a4 Slagplate from Slagheart; w6+c6 from Malachar; a6 from the epilogue chest (flag `dawn`).
  Perks: c2 slow HP regen (0.5/s) and c4 Glow regen (2 EP/s) and c6 +15% blast are live. **Stubs** (text only): f2, f3, f5, h3, c5 glow-sting, c6 self-burn.
  Mini-boss items: Kettle, Corvin and Capmother items come from the real fights (`kettleDown`/`corvinDown`/`capDone`). Ombrelle still falls back to her lead-in flag `ombrelleSeen`. **TODO MB:** drop that `alt` in gear.ts `BOSS` when her fight lands.
- **Story clash calls**: (4) w2 stays a Rune drop, though Story's text says Glowcap Woods. (6) c5 is Spore-only and its perk is renamed glow-sting (stub). (7) The name is Linnet's Locket; its flag `lettersDone` does not exist yet, so the item is unobtainable until Story adds the letters quest. (8) c4 = the Area 1 hidden Wellspring (flag `spring`). (11) A boss may drop two items. (12) SPD and the c2/c4 regen are implemented; the rest is stubbed (above).
- **Shops** (Shop tab, `shopRows`): open only within 56 px of the keeper. Joss `j` in Wickhaven (lanternmoss), Orrin `r` in hushwater, Dace `q` in kilnreach. Drowned Vesper's keeper is Marlo Quayle, but she is not placed yet, so that shop opens at the save pad. **TODO:** add NPC `s` in script.ts/map (check that `s` is free). Gear and consumables both sell there; Tears are not sold in Wickhaven. A buy sets `flags.shopOpen`.
- **Loot / Items** (src/loot.ts, hook `window.__kiLoot`):
  - Each non-boss kill gives 1–3 coins, one 3% gear roll (h1/a1/w1/f1/c1; a duplicate becomes +5 coins) and consumable rolls: Glowcap Morsel 10%, Kindleberry 2%, Wellspring Tear 1%.
  - Bosses give 50 coins + 1 Kindleberry + 1 Tear. The Twins' `nell` kill skips the roll, so the pair counts as one.
  - Drops lie on the ground for 30 s. Walking over one shows the toast "Found: <name>".
  - Morsel: 35% heal, max 9, 20 c. Kindleberry: full HP/EP + tf=100, max 3, 120 c. Tear: max 2, 300 c.
  - Quick heal: H, pad RT or the touch "+" button (with a count badge, added by JS so index.html is untouched). A tap uses a Morsel, or a Kindleberry if you have none. G, pad LT or a 0.5 s hold uses a Kindleberry. 1 s cooldown; blocked during 0.4 s hit-stun.
  - Revive: reaching 0 HP with a Tear enters mode `revive`, which freezes the world and shows the prompt "Use Wellspring Tear?". Yes = 50% HP + 2 s invulnerable. No = `g.faint()` (the old KO code, moved). Works with keys, pad and tapping the buttons.
  - The HUD shows counts + coins under the bars. The Items tab uses or inspects each item.
- **Save gear v2**: the record adds `gv:2, have, coins, items` (all optional). For an old save (no `gv`), gear ids are remapped by name (`OLD_IDS`, e.g. old w3 → w6 Brann's Fist), and h/f default to h0/f0. The save gets every L item for its level plus any B/Q whose flags are set. Counts and coins default to 0. `mirela`/`brann` are kept.
- **MB combat hooks (minimal)** in game.ts only: `rollKill` after `onFoeKill`, `stunT` in `hurtHero`, and the revive branch at 0 HP. No enemy files were edited.
- **Saves** (src/save.ts): record v2 = v1 + optional `play, areaId, gear, story, bosses`. `migrate()` validates and upgrades v1 → v2, keeping every field (incl. MB's `mirela`/`brann`). `parseSave` now goes through `migrate`. Slots: `kiquest-slot1..3-v1` hold a full snapshot (record + story flags + kiquest-mb-v1 boss map). Pad save/autosave keys unchanged. Export code = `KQSAVE1:` + base64 JSON (`importCode` also takes raw JSON/.kqsave files). The Import panel is DOM (#saveCode) and stops key propagation, so typing does not drive the game.
- Loading a slot calls `__ki.story` (flags + `enter(areaId)`) then `game.load`.
- **UI sounds**: public/audio/ui-*.ogg (staging/sound, CC0) are played through `__ki.audio.play` from menu.ts `sfx()`, with ui-move rate-limited. The pad save still plays `levelup` (audio.ts, untouched), so ui-save is used only for slot saves and imports. No volume entries were added to audio.ts VOL (N64's file), so they play at gain 1.
- PWA: sw-plugin already precaches all of public/, so nothing changed.
- Tests: `KI_PORT=4710 node tests/loot.mjs` (26 checks: sources, seeded drops, dupe→coins, shop, quick heal/cooldown/stun, H/G/hold keys, revive Yes/No, migration). `KI_PORT=4710 node tests/menus.mjs [--shots]` (43 checks; `--shots` writes docs/menus-*.png and docs/menus-phone-{portrait,landscape}-*.png; shop/items/hud-drops/revive shots come from a one-off script). Hook: `window.__kiMenu`. Ports 45xx are often held by MB's leaked preview servers, so use 47xx. Both tests kill their server process group. Ports 45xx are often held by MB's leaked preview servers, so use 47xx. Both tests kill their server process group.

## MB W15 — Hero voice barks
- src/game/combat/barks.ts: bark(g,hero,kind)/barkParty. Attack on finishers only (melee step 3; Sable's bolt; Rook every 3rd finisher), hurt 1.5 s cooldown per hero, transform = whole party + music duck -6 dB for clip length, victory on big-boss kill when no boss remains. One bark per hero at a time (busy for clip length). No RNG.
- Hooks marked `// MB hook` in game.ts, companion.ts, powerup.ts, ai.ts, audio.ts (BARK_VOL -3 dB attack/hurt). ui-*.ogg untouched (Cozy).
- Test: tests/barks.mjs (10 checks).

## MB W17 — Mini-bosses (data-driven, src/game/enemies/minis.ts)
- One engine, one `MiniSpec` per boss (area, arena tx/ty/r, gate(flags,g), slot, phaseAt, moves per phase, banners/says, reward, colours, spawns to clear). Move types: dash, ring, rain, crack, fan, nova, summon, blink, decoy. Telegraphs are hazards (companions dodge them like other boss hazards) plus drawMiniTele; glow via addLights/drawMiniGlow.
- Wakes only when gate true, no story box open, hero inside r*16 of the arena; leash r*16+32; KO aborts (respawns on re-entry). Death: slot done (writeBossDone), `__ki.story.flags[flag]=true` + story save, minions/hazards/foe shots cleared.
- Hooks (`// MB hook`): game.ts (update, bossActive, reset keeps done, KO abort), companion.ts (anyBossActive, isBoss), ai.ts (dispatch, kill, decoys don't count kills), draw.ts (sheet, anim, tele, glow, HUD bar), state.ts (slots).
- Sheets: `python3 tools/art/build_minis.py <name>` (procedural, original, 48x64, check_sheets 28/28). PixelLab not used.
- Test: `KI_PORT=4701 node tests/minis.mjs` (KI_MINI=<kind> for one). Each case: gate shut stays quiet, wake, telegraph+dodge, phase 3, real kill → flag+save+slot, stays down, no errors. Shots: docs/bill/mini-<kind>.png.
- Kettle (boss7): emberquarry (26,12) r3, hp 380; shovel dash → steam ring → slag rain → boiling cracks. Clears w(26,10), g(22,14). +2 stat pts.
- Corvin (boss8): hushwater (25,26) r3, hp 340; lantern fan + ferry blink → echo decoys (reed_wraith, 8 hp, `decoy`; their kills are subtracted from stats.kills so reedN never counts them; miniLog.decoyKills) → bell toll nova. Orb guard (story/index.ts `// MB hook`): hushwater bell not pickable while `reedQ && !corvinDown`. tests/world.mjs + fullrun.mjs set corvinDown (+boss8 done) before the bell step; the real fight is in tests/minis.mjs. Death line from npc_lines "Bosses" (spec `outro`).
- Capmother Gilt (boss10): lanternmoss (39,27) r3, hp 360; spore rain + cap ring → mossling brood + spore fan → root cracks. Sets `capDone` + 2 pts; the boots stay Cozy's (gear.ts / Odile's capDone line). w(43,27) is outside the ring, nothing cleared.
- Ombrelle (boss9): hushwater (40,7) r3 (graves are walls), hp 420; parasol fan + drift blink → grave cracks + requiem nova → candle rain + 3-way cracks. Gate needs `oath` and Area 1 boss done. Clears w(42,8). Phase-2 and death lines from npc_lines "Bosses". Sets `ombrelleDown` + 3 pts; the Sable `ombrelleBeat` that follows is Story's.
- tests/minis.mjs: 31 checks (4 bosses + Corvin bell/decoy checks + in-ring spawn clearing). fullrun 57/57 (rebuild dist first: ground.mjs leaves a different build in dist).
- Known: boss4 "P3 enraged survivor" failed once under the parallel suite load (15/16), then 3/3 alone on 4731-4733.

## MB W16 — Art pack 3 (Area 2 foes, FX strips, right rows)
- Sheets copied to public/art/chars: rook, mirela, brann (new explicit right rows; left/other frames pixel-identical) + 8 Area 2 foes (all with right rows). check_sheets: all pass. rook_town NOT copied: nothing in src draws a town sprite (the town hero uses rook.json), so it stays in staging.
- sprites.ts already used an explicit `<anim>_right_<i>` frame when present and mirrors left only as fallback (48x64 boss sheets have no right rows and keep mirroring). Added `__kiMB.drawLog[sheet]` = last frame key + flip, for tests.
- New FoeKinds (types.ts FOE_INFO): reed_wraith, witchlight_newt, bog_sprout, fen_warden, mossback_snapper, duskhound, mossling, hush_squire. `roleOf(kind)` maps them onto the brute/wisp/warden AI; `tuneOf(kind)` overrides speed/telegraph/reach/damage. brute/wisp/warden values are unchanged.
  - Reed Wraith: caster, `cast` anim on telegraph, 3-bolt fan. Witchlight Newt: quick skirmisher. Bog Sprout: rooted spitter.
  - Fen Warden: shield-block + slam (warden role, `block` anim). Mossback Snapper: heavy slow lunger. Duskhound: fast rusher. Mossling: basic melee.
  - Hush Squire: en-garde (`block` pose) then a long rapier lunge from ~60 px.
- Spawns: only on Hushwater's existing g/w markers (world.ts `// MB hook`): g → mossling, duskhound, hush_squire; w → reed_wraith, witchlight_newt, bog_sprout, fen_warden, mossback_snapper, reed_wraith. Other areas keep brute/wisp. (Ombrelle's arena (40,7) r3 covers the w at (42,8); the minis task clears it.)
- FX (src/game/combat/fx.ts, public/art/fx/*): kiblast_charge (beam charge, on the hand), kiblast_projectile (Ki Bolt shots), kiblast_impact (where a player shot ends), flight_takeoff_dust (hover start), flight_trail (transformed + moving), transform_burst (on transform, then frames 4-7 as an aura). Drawn in the overlay pass on top of the procedural glow; draw-side only, no RNG, no damage/timing change. `__kiMB.fxLog`.
- Test: tests/artpack3.mjs (14 checks, incl. hero facing right draws walk_right_N unmirrored). Screenshots: docs/artpack3_hero_right_{before,after,before_after}.png.
