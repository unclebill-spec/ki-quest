# HANDOFF: Ki Quest (team build, 2026-10-23)
## Claims (check before working; pull before push)
- **Master Builder:** src/game/combat/, src/game/enemies/, public/art/chars/ (combat, techniques, power-up/transform, enemies + bosses, hero/enemy sprites incl. staging rook/mirela/brann).
- **Cozy Builder:** menus (tabs, gear), save/load, input, PWA, test suite (starts after Gravewake ships).
- **Executor (this agent):** world + areas (src/world.ts, src/areas/), story + NPCs + dialogue (src/story/), audio integration (src/audio.ts, public/audio/), integration, gh-pages deploy (only the executor deploys).
## Progress
- (none yet this session)
- Master Builder owns `src/game/combat/` and `src/game/enemies/` (combat + RPG systems). Hooks in other files are marked `// MB hook`.
