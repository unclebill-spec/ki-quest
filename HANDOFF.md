# HANDOFF: Ki Quest (team build, 2026-10-23)
## Claims (check before working; pull before push)
- **Master Builder:** src/game/combat/, src/game/enemies/, public/art/chars/ (combat, techniques, power-up/transform, enemies + bosses, hero/enemy sprites incl. staging rook/mirela/brann).
- **Cozy Builder:** menus (tabs, gear), save/load, input, PWA, test suite (starts after Gravewake ships).
- **Executor (this agent):** world + areas (src/world.ts, src/areas/), story + NPCs + dialogue (src/story/), audio integration (src/audio.ts, public/audio/), integration, gh-pages deploy (only the executor deploys).
## Progress
- (none yet this session)
- Master Builder owns `src/game/combat/` and `src/game/enemies/` (combat + RPG systems). Hooks in other files are marked `// MB hook`.
- 2026-10-23 22:50 (art executor): `public/art/chars/` added. Heroes rook/mirela/brann (24x32, 104 frames: idle4 walk4 punch1/2 kick blast 3 each, block2 hurt2 fly2; fly sits on ground row). Enemies 24x32: vesper_squire (rusher: stand1 walk4 attack3 hurt1), vesper_hexer (shooter, same, attack = bolt cast with orb), watch_guard (tank, + block2). Boss warden_rune 48x64: stand walk4 attack3 hurt1 + stomp3 beam3 guard2. Rows = anim x facing (down,up,left,right), cols = frame; right = mirrored left. Index: `public/art/chars/frames.json`; refs on white in `refs/`. All groups pass sprite_check (boss tolerances x2 for the 2x scale). Generator: game-ideas/anime-fighter/staging/art/tools/build_enemies.py. No game code changed.
