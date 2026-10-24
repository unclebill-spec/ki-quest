# Changelog
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
