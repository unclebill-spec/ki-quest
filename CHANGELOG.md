# Changelog
## W17e round 2 — 2026-10-26 (executor)
- New `?qa=slagheart|aurel|twins|morvant` warps (isolated save, Lv 12/15/18/19 with matching gear) and qa-keys-*.json files for them. tests/qa-warps.mjs now runs 11 checks.
- Retune: Slagheart 20 s hold / x1.5, Aurel 14 s hold, Twins each held at 50% HP for 14 s / x1.8 (anti-mash), Morvant 13 s hold / x3.2. All 8 bosses take 43–68 s to mash and cost real HP (see BALANCE.md).
- Fix: autosave moved out of story.save() and into story beats, so begin() no longer overwrites a loaded save (artpack3 lunge tests pass again). The world test now accepts the "Lv n/8" hint.
## W17d v1 push — 2026-10-26 (executor)
- Boss retune for all 8 bosses: poise anti-mash, per-phase minimum time and boss damage x1.4–x3. HP is unchanged. Numbers and fight times are in BALANCE.md. Ashmaw: Lv 8 mash went from 16 s to ~45 s. Malachar: 14 s to ~49 s. Rune: 16 s to ~58 s and is the hardest.
- The grotto is gated on the oath, and the barrier can't trap the player when no boss is present. Banners no longer stack: minor text waits behind a fresh boss banner, and nothing draws over dialogue.
- Quest hints name the real next step: grotto, Kilnreach stone, "Lv X/8" training, quarry lift. Below Lv 8 the EXP curve is x0.5.
- Finale: Rune's defeat beat, an epilogue slideshow (Linnet only with lettersDone), Burning Bush credits plus a THE END card, and the title with Continue/New Game after the credits.
- Fixes: New Game button, autosave on save, the stub perks renamed (flavor only), the Kilnreach orb text, and ?qa=ending added. The ?qa=hollowmere warp is now realistic (Lv 11).
## W17c.1 QA warp fixes — 2026-10-26
- ?qa=ashmaw: Lv 14 + Tidebreaker/Slagplate/Kiln/Wellspring gear and pre-Grotto quest flags (metAma, metMirela, bell/reed done, oath); keys fight ~60 s to reach PHASE 2 and ENRAGED. ?qa=hollowmere also gets the Hushwater quest flags. qa-keys-hollowmere ends in Gear > Charm with the Stillwater Charm highlighted (it is granted on defeat, not a floor pickup). qa-warps asserts the quest line is not stuck.
## W17c QA warps — 2026-10-26
- `?qa=ashmaw|hollowmere|warden` (public/qa.js): isolated in-memory save next to each boss; real save slots untouched. No UI.
- qa-keys-ashmaw.json / qa-keys-hollowmere.json / qa-keys-warden.json for game-qa boss runs; tests/qa-warps.mjs (6).
## W17b release — 2026-10-26 (executor review + deploy)
- Hollowmere wake gate is `bellDone && corvinDown` (the Ferry Bell rings once returned to Fen), not `bell` (picked up).
- Story: Hollowmere intro/defeat, Orrin lead-in + bark, Neri bark; Ashmaw defeat lines on `ashmawBeat`; credits list Warden Rune as the final boss.
- Stillwater Charm gets its own violet/teal icon (gear-icons [64,64]).
## MB W17b — 2026-10-26 (bosses: Ashmaw, Hollowmere, Warden Rune; not deployed)
- Ashmaw (boss1 re-skin, same 420 HP): ember sheet `ashmaw`, renamed banners, ember light; sets `ashmawDown` (old saves synced silently). Gear key `rune` now reads "Drop: Ashmaw".
- Hollowmere, the Drinking Colossus (boss11, OPTIONAL): Hushwater west meadow (tile 17,22, r 80 px), wakes only on `bell && corvinDown` and stepping onto the ripple. 560 HP, phases 66/33% (lash, drink, fog, sink). Sets `hollowmereWake` / `hollowmereDown`, +4 pts.
- Stillwater Charm (c7): unique, source B (Hollowmere) only. Never in shops, loot rolls or debug-forced drops (loot.ts MB hook). Fog sight light (r 72) + 1.5 EP/s in hushwater/drowned/undertide only.
- Warden Rune, the Last Guardian (boss12, true final): husk arena after Malachar. Malachar's beat ends on `malacharFade`; 1500 HP, 6 phases (85/70/55/40/20%), glyph/slam/walls/beams/seal + round-robin echoes of 6 earlier bosses. `runeDown` -> Warden lines -> dawn -> Rook -> credits. +10 pts.
- menu.ts restore covers boss..boss12; lore entries for all three.
- Tests: new boss11.mjs (15) + boss12.mjs (13); boss6, malachar-story, fullrun, world, combat, loot updated for the new finale.
## W17 story prep — 2026-10-26 (not deployed)
- Will's answers: Ashmaw keeps the current grotto difficulty; Hollowmere is an OPTIONAL Hushwater side boss (gates nothing) whose unique drop is the Stillwater Charm.
- story: Ashmaw grotto lead-in (`ashmawSeen`) and defeat beat (`ashmawDown`, mirrored from `mb.boss.done`). The other W17 lines wait for Master Builder's fights (staging w17.md).
## W17 plan — 2026-10-26 (plan + cleanup, not deployed)
- docs/BOSS_PLAN_W17.md: Ashmaw = grotto boss (re-skin), Hollowmere = Hushwater boss (new), Warden Rune = true final boss after Malachar (Will's call, 2026-10-26).
- Canon names: /workspace/masters/kindle-quest/CANON.md.
- "Ki Quest" -> "Kindle Quest" in docs, comments and art-script headers (ids, URLs and file names unchanged).
## W16 — 2026-10-25 (Kindle Quest: mini-boss story wrap-up, LIVE)
- Sable Kestrel's crypt-stair beat after Ombrelle falls (`ombrelleBeat`, hushwater).
- Ombrelle's gear unlocks only on `ombrelleDown` (lead-in `ombrelleSeen` fallback removed from gear.ts BOSS).
- Marlo Quayle placed in Drowned Vesper (NPC `s`, tile 5,3 by the save pad); the Drowned shop opens at her. tests/minibosses-story.mjs 9/9.
- Screenshots: docs/bill/mini-{kettle,corvin,gilt,ombrelle}.png, docs/bill/pause-menu-phone.png.
- Deployed 2026-10-25 after MB's flake fixes (Corvin d6759a9, boss4 860d724); full serial suite 427/427 + ground + fullrun 57/57. Live title shot docs/bill/live-title-w16.png. Awaiting game-qa by another bot (rule 19).
## MB W17 — Mini-bosses
- Test fix: boss4 P3 flake — test-only `forceTwinMove` hook + HP floor; twins gameplay unchanged (ready for game-qa).
- Foreman Kettle mini-boss (Cinder Galleries): 3 phases, original sheet, sets kettleDown.
- Reedwraith Corvin mini-boss (Sunken Meadow): guards the Ferry Bell, echo decoys, 3 phases, sets corvinDown.
- Capmother Gilt mini-boss (Glowcap Ring): spores, brood, root cracks, sets capDone.
- Lady Ombrelle mini-boss (Lantern Graveyard): parasol, graves, requiem, sets ombrelleDown.
- tests/minis.mjs: Corvin echo-decoy check is deterministic (forceMiniMove test hook, HP hold until a decoy dies).

## 0.3.7 — 2026-10-24 (HD-2D Cozy Builder: menus, gear, save slots)
- Tabbed pause menu (Status/Gear/Lens/Map/Options/Save), keyboard + gamepad + touch; UI sounds.
- Gear: 3 slots, 12 items, compare with stat deltas.
- 3 save slots with preview (area, level, playtime), autosave kept, export/import code or file, v1→v2 migration (mirela/brann kept). tests/menus.mjs.
## 0.3.6 — 2026-10-24 (Master Builder: Malachar Vesh, the Last Dusk)
- Final boss Malachar in HUSK_ARENA (24,15 r8; src/game/enemies/malachar.ts): 1200 HP, 5 phases (80/60/40/20%): slash+cast fan → +prism beams → CROWN OF THORNS (rain, spirals, 7-bolt fans) → NIGHTFALL (darkening, nova, dusk flood with safe ring) → THE LAST LIGHT (8 prism beams, 6-arm spirals, gold/white sparkle storm). Phase banners, shockwave + 1.2 s shield per change, red/violet/cyan/green additive glow, 4 orbiting spring motes, 5-tick boss bar; companions dodge all telegraphs.
- Defeat: `malacharDown` set+saved, boss6 saved, +8 pts, full heal, "THE LAST DUSK ENDS" + Sunheart toast; story then runs the Wellsprings → Malachar Vesh → Rook ending (dawn + credits).
- 48x64 sheet (tools/art/build_malachar.py, check_sheets 32/32), docs/malachar_8x.png, docs/boss6-p5.png; tests/boss6.mjs (18 checks, 6/6 stable runs, fps 61 @4x).
## 0.3.5 — 2026-10-23 (Master Builder: Morvant, the Eclipse Golem)
- New boss Morvant in the top ring (STAIR_ARENA 32,5 r4); gated on cageDone; defeat sets/saves `morvantDown` + boss5.
- 4 phases (75/50/25%): slam+beam → +orbit spiral arms → TOTALITY (umbra darkening, nova rings with gaps, cross beams) → CORONA UNBOUND (eclipse hazard grid with a safe ring). Telegraphed moves, shield during phase shifts, violet/gold additive glow + sparkles.
- 48x64 sheet (tools/art/build_morvant.py, check_sheets 32/32); tests/boss5.mjs (17 checks).

## 0.3.4 — 2026-10-23 (Master Builder: Cageward Twins + Sable)
- Cageward Twins (Vey 430 HP, Nell 400 HP) + 3 shield pylons (60 HP) in the Stair Red Cage ring (ARENA4 stair tile 24,15 r88; src/game/enemies/twins.ts). P1: twins shielded while any pylon stands, alternating telegraphed chain/orb moves. P2 (pylons down, shockwave): shared kits, linked swap (trade places) and cross-dash. P3: first death enrages the survivor (x1.35 speed, spiral rage, 7-shot fan). Split boss bar with phase/shield/enrage readout; companions dodge their telegraphs and ignore shielded twins.
- Defeat: flag `cageDone` (story then sets `sableJoin`), +6 pts, full heal, "Cage Key", saved as `boss4` in kiquest-mb-v1.
- Sable joins as 4th companion on `sableJoin`: ranged/support caster (80 HP, holds ~70 px, ki bolts, ward-heals hero 10 / allies 8 every 8 s), violet sash. Sheets public/art/chars/sable.* (24x32, check_sheets 36/36), cageward_vey/nell.* (48x64, 32/32), docs/cageward_twins_8x.png.
- Tests: tests/boss4.mjs (16 incl. fps at 4x); companion.mjs 26 (Sable join, 4-way no-overlap, doorways, caster range, heals) and now seeds Math.random (Brann taunt-aim check was flaky on baseline too).
## 0.3.3 — 2026-10-23 (Master Builder: Count Aurel)
- Count Aurel, tide general of the Undertide (arena = UNDERTIDE_ARENA tile 37,17 r6; src/game/enemies/aurel.ts): 760 HP, 4 phases (75/50/25%) with shockwave rings on each change; telegraphed tide-wave sweep (double in P3), rapier lunge chain (3, then 4 thrusts), whirlpool zones (pull 26 px/s), summoned drowned soldiers (cap 4), P4 rising-water ring. Teal/violet boss bar with 4-phase ticks, cyan tide hazards, companions dodge his telegraphs.
- Spring keep-out: no hazard within 26 px of the central spring, Aurel clamped >= 38 px from it and steered away.
- Defeat: story flag `tideBossDown` (Sable's beat), +5 pts, full heal/meter, saved as `boss3` in kiquest-mb-v1.
- Sprite: tools/art/build_count_aurel.py → public/art/chars/count_aurel.png/.json (48x64, check_sheets 32/32), docs/count_aurel_8x.png.
- Tests: tests/boss3.mjs (15 checks incl. fps at 4x); world.mjs stands the fight down when it fakes tideBossDown.
## 0.3.2 — 2026-10-23 (Master Builder: Brann + Slagheart)
- Brann joins as second companion when the Heart-Ember is handed in (story flag `brann`). Companions are now a list (`g.mb.allies`; `g.mb.ally` = Mirela alias). Brann: tank/bruiser, 130 HP, slower, heavier melee (x1.45, knockback), 40% damage reduction, taunts foes within 64 px for 3 s (7 s cd), amber sash, sheet public/art/chars/brann.*. Allies rest on opposite sides, are pushed apart (14 px), never park/pushed into doorways. Save field `brann` (optional).
- Slagheart, Emberheart Quarry boss (arena = QUARRY_ARENA in src/areas/maps.ts; src/game/enemies/slagheart.ts): 620 HP, 3 phases with shockwave on each change; telegraphed charge, ember rain, molten crack (+ triple crack), phase-3 summon (minions capped at 4); boss bar; reward +4 pts, full heal, saved as `boss2` in kiquest-mb-v1 (merged with boss1).
- Sprite: tools/art/build_slag_golem.py → public/art/chars/slag_golem.png/.json (48x64, check_sheets 28/28), contact sheet docs/slag_golem_8x.png.
- Tests: tests/boss2.mjs (11), companion.mjs now 21 (Brann, no-overlap, taunt, doorways). combat 'boss phase-moves' made deterministic (seeded RNG + waits on state).
## 0.3.1 — 2026-10-23 (Master Builder: Mirela companion)
- Mirela joins after the Lantern Oath: follows, fights (modest melee + occasional ki bolt), retreats when low, dodges boss telegraphs, KO + revive after fights or at save pads; teal sash. Save field `mirela` (optional, back-compatible). Test: tests/companion.mjs.
## 0.3.0 — 2026-10-23 (Master Builder: combat + RPG systems)
- Techniques (src/game/combat/techniques.ts): Ki Bolt 6 EP, Lance Beam 16 EP (hold to charge, piercing), Scatter Burst 12 EP (5 shots). Cycle with Q / pad LB / touch; HUD icon top-left.
- Power meter + Awakening transform (powerup.ts): fills from hits dealt/taken and charging (hold block while standing still). T / L / pad Y / touch TF when full: 14 s of x1.5 melee, x1.4 ki, x1.25 speed, +15% guard, glow aura + sparks + palette shift, then reverts.
- Enemies (src/game/enemies/): Scrapjaw rusher (lunge tell), Glimmer Wisp shooter (charge tell, violet orb), Stoneward tank (front guard, slam ring tell; beam/crit/behind breaks guard). Hurt stun + knockback; kills drop EXP orbs that fly to the hero.
- Area boss Warden Rune in Lanternmoss Hollow (arena near tile 38,17): barrier trigger, 3 phases (dash/fan; +slam/ring; triple dash/spiral/triple slam), telegraphs, phase shockwave, boss bar. Reward: +3 points, full heal, full meter, saved (kiquest-mb-v1). `game.bossActive` drives boss music.
- Sprite sheets from public/art/chars (anim names read from JSON, right = mirrored left, fly lift); boss/warden fall back to grey-box. Particle caps unchanged (Gravewake pool).
- tests/combat.mjs (18 checks incl. 4x CPU-throttle fps) + docs/combat-*.png. Smoke: port via KI_PORT, EXP waits for orbs, de-flaked combo/wisp checks.

## 0.2.0 — 2026-10-23 (executor: world, story, audio)
- Audio: Hearthmoor Sound's CC0 area theme + 11 SFX in public/audio, Web Audio in src/audio.ts, driven by state diffs; N mutes; boss theme when `game.bossActive`.
- World: ASCII area maps (src/areas/maps.ts). Area 1 Lanternmoss Hollow (Wickhaven, Glowcap Woods, Old Watch, Witchlight Fen edge, sealed ward Lv 4, updraft stone). Area 2 Hushwater (landing, boardwalk town, Lantern Graveyard, Sunken Meadow).
- New tiles: water, path, boardwalk, ward; props: mushroom houses, cap trees, graves; zone banners.
- Story (src/story): intro captions, NPCs Elder Ama, Odile, Joss, Pip, Fen Marrow, Tallis Reed, Mirela; dialogue box; objectives; updraft-stone flight between areas; own save key kiquest.story.v1.
- Lens map: terrain, zone names, hearthstone, stones, people, foes.
- tests/world.mjs (14 checks) + docs/world-*.png.

## 0.1.1 — 2026-10-23
- Published to GitHub Pages: https://unclebill-spec.github.io/ki-quest/ (base `/ki-quest/`).
- Added tests/live.mjs live check and docs/live.png.

## 0.1.0 · 2026-10-23 · Stage 1 chunk 1 (grey-box)
- Scaffold (TS + Vite + canvas), PWA manifest, Install button, offline SW, fullscreen, landscape fit, rotate notice.
- Copied Gravewake light layer, particle pool, stick/pad helpers, installer, SW plugin.
- Input: keyboard (double-tap run), gamepad, touch stick + 4 buttons + pause/map icons; touch UI auto-hides; cursor auto-hides.
- Emberfall Hollow placeholder area with lamps, ridge, plaza and save pad (saves + heals; Continue on title; autosave on hide).
- Combat: 3-hit melee combo, random crits (yellow + big knockback) vs red normal hits; ki blast (8 EP, additive glow); block; energy shield (drains EP, eats shots).
- Foes: Scrapjaw brute (chase, "!" + lunge-line telegraph, lunge) and Glimmer Wisp (kites, charge-glow telegraph, orb shot); respawn after 25 s.
- EXP, level-up (+3 points), status menu to spend on STR/POW/END; HUD HP/EP/EXP bars, technique icon, transform-meter placeholder; map stub.
- Smoke test (19 checks), docs/stage1.png, stage1-status.png, stage1-map.png, stage1.gif.

## W13
- Fix: town NPCs no longer bounce faster when you walk toward them (idle bob uses clock time, not screen position).
- Test: tests/npc-bob.mjs.

## W14
- Renamed to **Kindle Quest** (Bill approved): page title, title-screen h1, webmanifest name/short_name/description, credits. Repo, `/ki-quest/` URL, save keys, `window.__ki` unchanged.
- Music: husk-theme loops in The Husk Sun; finale-theme loops through the dawn epilogue and credits.
- Pause menu with tabs (Status/Gear/Items/Shop/Lens/Map/Options/Save), 3 save slots, export/import codes, UI sounds.
- Gear v2: 5 slots (Head/Garb/Hands/Feet/Charm), 33 items from levels, shops, bosses and quests, plus a new SPD stat.
- Loot: coins and rare drops from foes, Glowcap Morsel / Kindleberry / Wellspring Tear, quick heal (H / RT / + button), revive prompt.
## W13b
- Test: boss3 drowned-soldier check counts peak alive soldiers during P3 (companions could kill them during the P4 loop; flaky ~1 in 4).

## W15
- World side for four mini-bosses (fights coming from Master Builder): Foreman Kettle (quarry), Reedwraith Corvin + Lady Ombrelle (Hushwater), Capmother Gilt (Lanternmoss). Lead-in scenes at each arena, Odile's "Capmother's Ring" quest, new NPC lines. Test: tests/minibosses-story.mjs.
## W15 — Hero voice barks
- 16 hero barks (attack/hurt/transform/victory for Rook, Mirela, Brann, Sable) with cooldowns, finisher-only attacks and music ducking on transform. New test barks.mjs.

## W16 — Art pack 3
- Hushwater now has its own foes: Reed Wraith, Witchlight Newt, Bog Sprout, Fen Warden, Mossback Snapper, Duskhound, Mossling and Hush Squire.
- New ki blast, flight and transform effects drawn over the existing glow.
- Heroes and Area 2 foes use hand-drawn right-facing frames instead of mirrored left ones.
