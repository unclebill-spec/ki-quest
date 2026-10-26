# Boss plan W17 (Ashmaw, Hollowmere, Warden Rune as the final boss)
Will's decision (2026-10-26 8:19 AM ET): "Ashmaw and hollowmere get turned into bosses... Wardenrune is the final boss." Slagheart stays the quarry boss. Will left placement to us. This doc is a plan only; no boss code yet.

## Current roster (code survey)
| Order | Area id (name) | Main boss | Code | Flags |
|---|---|---|---|---|
| 1 | lanternmoss (Lanternmoss Hollow, Wellspring Grotto) | Warden Rune ("WARDEN RUNE, GROTTO GUARDIAN") | enemies/boss.ts, kind `boss`, `ARENA` (38,17) | `mb.boss.done` |
| 2 | hushwater (Hushwater) | **none** (minis only: Corvin, Ombrelle) | - | - |
| 3 | kilnreach / emberquarry (Emberheart Quarry) | Slagheart | slagheart.ts, ARENA2 (38,16 r7) | `quarryBossDown`, boss2 |
| 4 | drowned / undertide (The Undertide) | Count Aurel | aurel.ts, ARENA3 | `tideBossDown`, boss3 |
| 5 | stair (The Sunwarden's Stair) | Cageward Twins, Morvant | twins.ts / morvant.ts | `cageDone` / `morvantDown` |
| 6 | husk (The Husk Sun) | Malachar Vesh | malachar.ts, ARENA6 (24,15 r8) | `malacharDown` -> fade -> `dawn` -> credits |

## Placement
- **Ashmaw = the grotto boss** (rename and recolour of the current `boss` fight). This keeps the first boss working: same arena, AI, `mb.boss` and save keys. Only the display name, banner, sheet palette and lines change. The internal key `rune` in gear.ts BOSS is renamed to `ashmaw`; no save migration is needed because gear unlocks use `mb: "boss"`, which is unchanged.
- **Hollowmere = Hushwater's main boss.** Hushwater is the only area with no main boss. Story staging already describes Hollowmere as "the Drinking Colossus" (area1.md), which suits a fog marsh full of drowned reeds. It sits between the grotto and the quarry, so the difficulty curve fills the gap.
- **Warden Rune = the true final boss**, in the husk after Malachar's fade and before `dawn`/credits. Malachar is the herald; the Warden is the ancient guardian of the Wellsprings, now unbound. It reuses the finale-theme flow (main.ts already selects finale-theme while `husk && malacharDown && !dawn`). The husk arena HUSK_ARENA (24,15 r8) is reused.
  - Why the default direction still fits: the "Warden" name already reads as a guardian. Moving it last frees the grotto for Ashmaw without touching level 1 balance.

## Per-boss spec
### Ashmaw (grotto, boss1, re-skin)
- Arena/flags: unchanged `ARENA` lanternmoss (38,17); wake on entering the ring; done = `mb.boss.done`. Add a story flag `ashmawDown` mirrored on defeat (for lines and gear).
- Attacks: keep the current set. Re-theme the VFX as ash/ember: ember spit (the existing projectile, recoloured orange), ash cloud slam (the existing AoE, with a grey smoke ring).
- Art: recolour palette of the current grotto boss sheet, as `tools/art/build_ashmaw.py` (same pipeline as build_slag_golem.py), at public/art/chars/ashmaw.{png,json}.
- Story: banner "ASHMAW, GROTTO DEVOURER"; a 2-line lead-in at the grotto mouth (Rook and Mirela); 2 defeat lines; 1 Elder Ama bark after.
- Tests: update combat.mjs/world.mjs banner strings; add the `ashmawDown` assertion.
### Hollowmere (hushwater, new `boss11` slot)
- Arena: hushwater open water/reed field near (30,20), to be confirmed against the map, r6, `HUSH_ARENA` in maps.ts. Wake: after `bell` (the Ferry Bell) and `corvinDown`; done = `hollowmereDown`.
- Attacks (3 phases): drink (pulls light: EP drain field with a safe ring), reed lash (line telegraph), fog surge (darkening plus 3 lantern safe spots); phase 3 sinks and resurfaces at random marked ripples.
- Art: a 64x64 colossus sheet, `tools/art/build_hollowmere.py` (idle/walk/attack/hurt/sink rows, 4 facings like malachar); wet violet and teal glow.
- Story: a lead-in from Fen Marrow or Orrin Cask once the bell is rung; a 3-line boss intro; defeat lines; barks from Orrin and Neri.
- Gear: one B-source drop (e.g. a charm); Story picks the name.
- Tests: tests/boss7h.mjs (wake gate, phases, defeat flag, no page errors) and a minibosses-story-style lead-in check.
### Warden Rune (husk, true final, `boss12`)
- Arena: HUSK_ARENA after Malachar's fade line. Wake: `malacharDown && !runeDown`, triggered from the fade beat (index.ts:126) instead of going straight to `dawn`. Done = `runeDown`, then the existing Rook dawn plus credits.
- Attacks: rune circles (placed glyphs that detonate), ward walls (sweeping barriers with gaps), wellspring beams (4 rotating), and a final "seal" phase that summons the 6 earlier boss echoes as single attacks.
- Art: a new 64x80 sheet, `tools/art/build_warden_rune.py`: stone and gold, cyan rune glow, using the existing grotto-boss silhouette ideas.
- Story: Malachar's fade line hands off to the Warden ("the guardian wakes"); a 3-line intro; defeat lines; then the dawn beat. Update the credits.
- Tests: tests/boss12.mjs; update malachar-story.mjs and fullrun.mjs (the ending now requires `runeDown`).

## Build chunks (each ≤45 min)
1. Art: build_ashmaw.py recolour sheet + check_sheets.
2. Art: build_hollowmere.py sheet.
3. Art: build_warden_rune.py sheet.
4. Gameplay: Ashmaw rename (banner, BOSS key, sheet swap, `ashmawDown`).
5. Gameplay: Hollowmere arena + AI (boss11).
6. Gameplay: Warden Rune final fight (boss12) + the finale hand-off.
7. Story hookup: lead-ins, defeat lines, barks, credits, gear drops.
8. Tests/docs: boss11/boss12 tests, update story/fullrun tests, full serial suite, CHANGELOG/HANDOFF/CANON, deploy.

## Open questions for Will (answered 2026-10-26)
1. Ashmaw difficulty: **keep the current difficulty** (Will).
2. Hollowmere: **OPTIONAL** side boss in Hushwater; it does not gate the quarry or anything else. It drops a unique reward, the **Stillwater Charm**, available only from Hollowmere (Will).
3. Does Ashmaw gate the Kilnreach stone? No change: the stone keeps its current `oath` gate (pending Will).
