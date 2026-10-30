# AGENTS.md: Kindle Quest
- Owner: Bill Weathersbee. **Never publish, push or create a GitHub repo without Bill's approval.**
- Stack: TypeScript + Vite + plain canvas (no React). Internal resolution 384x216, 16:9 landscape.
- Original IP only: no Dragon Ball names, assets, characters or traced art. Hero: placeholder ~24x32, real top + belt waist + pants.
- World/story/audio (executor): `src/world.ts` area builder, `src/areas/maps.ts` ASCII maps, `src/areas/art.ts` world art + story overlay + Lens map, `src/story/` script + NPC/dialogue/travel, `src/audio.ts`. Team claims: see HANDOFF.md.
- Layout: `src/game.ts` sim (no drawing) · `src/draw.ts` render/HUD/menus · `src/input.ts` KB/pad/touch · `src/world.ts` area · `src/save.ts`.
- `src/vendor/` and `scripts/sw-plugin.mjs` are COPIES from Gravewake (`/workspace/gravewake/gh-repo`, 2026-10-23):
  light.ts, particles.ts, screen.ts verbatim (screen key renamed); install.ts with React hooks removed; sw plugin with cache prefix renamed.
  Edit the copies here; never edit the Gravewake or Hearthmoor folders. save.ts follows Gravewake's save pattern (versioned keys, guarded reads).
- Look: gloom-and-glow. World is multiplied by Gravewake's banded light layer; ki, lamps, eyes, shield are additive ("lighter") after it.
- Test: `npm run build && npm run smoke` (Playwright from /workspace/tools/game/node). Test hook: `window.__ki`.
- Keep disk small; delete temp files. Log changes in CHANGELOG.md; commit in chunks.

## Deploy (GitHub Pages, gh-pages branch at /)
1. `npm run build` (Vite base is `/ki-quest/`), then `node tests/smoke.mjs`.
2. Secret scan: `gitleaks git .`, `gitleaks dir .`, `/workspace/hd2d-suite/tools/checks/extra_secret_patterns.sh`.
3. Copy `dist/` to a temp dir, add `.nojekyll`, `git init`, commit, force-push to `gh-pages` of unclebill-spec/ki-quest; delete the temp dir.
4. `node tests/live.mjs` checks the live URL: no console errors, SW offline reload, writes docs/live.png.
Publishing needs Bill's approval.

## Ownership claims (2026-10-23)
- **Master Builder owns `src/game/combat/` and `src/game/enemies/`** (techniques, power-up/transform, enemy AI, boss, sprite-sheet spec). Other bots: please hook in via their exports, don't edit inside. Hooks elsewhere (game.ts, draw.ts, tests) are kept minimal and marked `// MB hook`.
- Nintendo 64 Style owns deploy (gh-pages). Master Builder pushes to main only.

- NPC/idle animation phases must come from time + stable ids, never screen coords (see npcBob in src/areas/art.ts; tests/npc-bob.mjs).
- Player-facing name is **Kindle Quest** (index.html title/h1, webmanifest, credits). Internal ids stay ki/kiquest/ki-quest (saves, tests, URL).
- Music: `Audio.HAVE` lists shipped tracks; `audio.watch(game, finale)`: main.ts passes finale=true during the dawn epilogue (husk, malacharDown, before/while the dawn dialog) and credits -> finale-theme.
- Mini-bosses: specs (area, arena, gate flag, done flag) live in HANDOFF.md "Mini-boss specs". Lead-ins are one-shot `B("<x>Seen")` beats in story/index.ts; fights are Master Builder's.

## HD2D W14 (menus/gear/saves) notes
- Pause menu lives in src/menu.ts (HD-2D Cozy Builder). Hook new tabs there, not in draw.ts `pauseMenu` (legacy, unused). `MENU_ROWS` is deliberately off-canvas.
- Save record is v2. Anything reading saves should go through `parseSave`/`migrate` in save.ts. New fields must be optional, and `mirela`/`brann` must be kept.
- Gear v2: 5 slots, ownership in `g.have`; new gear must have a source (L/S/B/Q) in gear.ts. Boss/quest drops key off story flags or MB `done` (see `BOSS`). New non-boss foes get loot automatically via `kill()` → `rollKill`; a new boss kind must be added to `isBigBoss` in game.ts to get boss spoils.
- Player text never says "ki"/"Gi". Use Glow/Kindle.
- Damage/HP math must use `g.eStr/ePow/eEnd/eSpd` (gear-inclusive), not raw `g.str` etc., if gear should count.

## W16 notes (2026-10-24)
- Boss roster (W17): boss1 Ashmaw, Grotto Devourer (grotto; gear key `rune`; `ashmawDown`, synced silently for old saves; lines `ashmawSeen`/`ashmawBeat`) · boss2 Slagheart · … · boss10 Malachar (now ends on `malacharFade`) · boss11 Hollowmere (OPTIONAL Hushwater west meadow; wakes on `bellDone && corvinDown` + ripple; `hollowmereWake`/`hollowmereIntro`/`hollowmereDown`/`hollowmereBeat`; unique drop Stillwater Charm c7) · boss12 Warden Rune, TRUE FINAL (husk; kind/gear key `wardenrune`; `runeSeen` -> `runeDown` -> `dawn` -> credits).
- Story flags: `ombrelleBeat` (Sable, hushwater, after `ombrelleDown`). Ombrelle gear needs `ombrelleDown` only.
- Drowned Vesper shopkeeper Marlo Quayle = NPC `s` on DROWNED (5,3); `KEEPERS.drowned.npc = "s"` in menu.ts.
- W16 is LIVE (2026-10-25). Corvin/boss4 flakes fixed by MB via test hooks (forceMiniMove, forceTwinMove). Rule 19: game-qa by another bot before telling Bill a build is done.

## QA (game-qa, Rule 19)
- game-qa is run by another bot. Default run: `game-qa https://unclebill-spec.github.io/ki-quest/ --keys games/ki-rpg/qa-keys.json --name kindle-quest-<tag>`.
- Boss warps (W17b+): `?qa=ashmaw|hollowmere|warden` (public/qa.js, classic script loaded before main.ts). It swaps `window.localStorage` for an in-memory store seeded with a fixed save, so real slots (kiquest-save/autosave/slot1-3, mb, story) are never read or written; reload without `?qa=` and the real save is back. Not linked from any UI.
  - ashmaw: lanternmoss (33,17), lvl 10, walk east into the grotto. hollowmere: hushwater (20,22), lvl 15, bellDone+corvinDown, walk west onto the ripple. warden: husk arena, lvl 22, malacharFade, wakes on its own.
- Boss runs (game-qa passes the URL through untouched; query strings are fine on URLs, not on folder targets):
  `game-qa "https://unclebill-spec.github.io/ki-quest/?qa=ashmaw" --keys games/ki-rpg/qa-keys-ashmaw.json --name kq-ashmaw` (same for hollowmere, warden). ~40 s each; J starts (Continue), Enter clears dialog, then J/K/Shift fight loop.
- Test: tests/qa-warps.mjs (each warp wakes its boss; sentinel real save keys unchanged).
- W17d (2026-10-26): boss tuning lives in `Game.TUNE` / `finaleGuard` (src/game.ts). Hits with kx=ky=0 (tests) skip it. Record changes in BALANCE.md. Deploy with /workspace/tools/publish-game.sh (rule 34).

## Project Page (trial through Nov 8, 2026)
- https://cursor.com/canvas/store-e7d5fd51-5604-4561-8cbf-84d9e2a47985/17096aab-b52a-4f67-b210-3a9fe11e0585
- Read it before work, update it after (log line + next steps).
