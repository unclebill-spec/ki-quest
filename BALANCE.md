# BALANCE.md: Kindle Quest (owned by Game Director)
Design and balance decisions. Newest first. Builders record the tuning numbers under each decision.

## 2026-10-26: Malachar's role and the fight retune (Will approved)
- Malachar Vesh stays a full boss fight right before the final boss, Warden Rune. (Will: "yes", in the Efficiency Bot chat, 4:33 PM ET.)
- Malachar gets the same tougher retune as every other fight. Will's words: "make sure the tune on all the fights isnt to easy".
- Baseline from qa/kindle-quest-full-playthrough-2026-10-26.md: button-mashing beats Malachar in about 14 s and Warden Rune in about 16-18 s, and the player takes almost no damage. Ashmaw is too easy too.
- Lead: Nintendo 64 Style. Record the before and after numbers here.

### Builder numbers: W17d retune (executor, 2026-10-26 4:50 PM ET)
Boss HP is unchanged everywhere, and Warden Rune keeps his 6 thresholds and echo order. The tuning lives in `Game.TUNE` (src/game.ts):
- **Poise (every boss):** 7 or more hits within 2 s triggers a 1.6 s guard. During it, hits do 25% damage and a push-back shockwave fires (r 48, dmg 10).
- **Phase hold:** each phase lasts at least `min` seconds. Until then, HP can't drop past the next threshold.
- **`out`:** a damage multiplier on hits Rook takes while that boss is alive.
- Scripted hits with 0 knockback (tests and cutscenes) skip the tuning.

| Boss | Expected Lv | HP | Before: min / out | After: min / out | Before (mash) | After (mash, harness2/kqreplay) |
|---|---|---|---|---|---|---|
| Ashmaw | 8–9 | 420 | none / x1 | 17 s / x1.4 | ~16 s at Lv 14, ~no HP lost | ~43 s at Lv 8 (before the 17 s bump; 16 s hold), 110/180 HP lost |
| Hollowmere | 11 | (unchanged) | none / x1 | 14 s / x1.5 | 34 s at Lv 15 | ~48 s at Lv 11, 51/204 lost (scripted keys) |
| Slagheart | 12 | (unchanged) | none / x1 | 15 s / x1.4 | not timed | not timed (no warp) |
| Aurel | 15 | (unchanged) | none / x1 | 12 s / x1.5 | not timed | not timed |
| Cageward Twins (vey/nell) | 18 | (unchanged) | none / x1 | poise only / x1.5 | not timed | not timed |
| Morvant | 19 | (unchanged) | none / x1 | 12 s / x1.6 | not timed | not timed |
| Malachar | 21 | 1200 | none / x1 | 10 s / x2.2 | ~14 s | ~49 s at Lv 21, 86/284 lost |
| Warden Rune | 22 | 1500 | none / x1 | 9 s / x3 | ~16–18 s, ~5 HP lost | ~58 s at Lv 22, ~200/308 lost (hardest) |

- **Floors:** 3-phase bosses can't die before 2×min (Ashmaw 34 s). Rune's floor is 45 s of holds plus his final phase.
- **XP:** `expNext` is x0.5 below Lv 8. Reaching Lv 8 now takes ~268 EXP, about 38 kills at 7 EXP (~21 with Pip's +120 orb), down from ~536 (~77 kills).
- **Todo:** build warps for Slagheart, Aurel, the Twins and Morvant, and time them. The Twins have no phase hold, so check they aren't a mash win.
