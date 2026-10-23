# AGENTS.md: Ki Quest
- Owner: Bill Weathersbee. **Never publish, push or create a GitHub repo without Bill's approval.**
- Stack: TypeScript + Vite + plain canvas (no React). Internal resolution 384x216, 16:9 landscape.
- Original IP only: no Dragon Ball names, assets, characters or traced art. Hero: placeholder ~24x32, real top + belt waist + pants.
- Layout: `src/game.ts` sim (no drawing) · `src/draw.ts` render/HUD/menus · `src/input.ts` KB/pad/touch · `src/world.ts` area · `src/save.ts`.
- `src/vendor/` and `scripts/sw-plugin.mjs` are COPIES from Gravewake (`/workspace/gravewake/gh-repo`, 2026-10-23):
  light.ts, particles.ts, screen.ts verbatim (screen key renamed); install.ts with React hooks removed; sw plugin with cache prefix renamed.
  Edit the copies here; never edit the Gravewake or Hearthmoor folders. save.ts follows Gravewake's save pattern (versioned keys, guarded reads).
- Look: gloom-and-glow. World is multiplied by Gravewake's banded light layer; ki, lamps, eyes, shield are additive ("lighter") after it.
- Test: `npm run build && npm run smoke` (Playwright from /workspace/tools/game/node). Test hook: `window.__ki`.
- Keep disk small; delete temp files. Log changes in CHANGELOG.md; commit in chunks.
