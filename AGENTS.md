# AGENTS.md: Ki Quest
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
