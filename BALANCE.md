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
| Ashmaw | 8–9 | 420 | none / x1 | 17 s / x1.4 | ~16 s at Lv 14, ~no HP lost | 43.5 s at Lv 8 (?qa=ashmaw), 147/180 HP lost |
| Hollowmere | 11 | (unchanged) | none / x1 | 14 s / x1.5 | 34 s at Lv 15 | ~48 s at Lv 11, 51/204 lost (scripted keys) |
| Slagheart | 12 | 620 | none / x1 | 20 s / x1.5 (was 15 s / x1.4) | 38 s, 133/212 lost (Lv 12) | 44–63 s at Lv 12 (?qa=slagheart), 152–171/212 HP lost |
| Aurel | 15 | 760 | none / x1 | 14 s / x1.5 (was 12 s) | 43 s, 89/228 lost (Lv 15) | 49.5 s at Lv 15 (?qa=aurel), 163/228 HP lost |
| Cageward Twins (vey/nell) | 18 | 430 each | none / x1 | poise + each twin held at 50% for 14 s / x1.8 (was poise only / x1.5) | 42–56 s, ~77/316 lost | 50–55 s at Lv 18 (?qa=twins), 112–120/316 HP lost |
| Morvant | 19 | 900 | none / x1 | 13 s / x3.2 (was 12 s / x1.6) | 52 s, 15/324 lost (no HP cost) | 68 s at Lv 19 (?qa=morvant), 67/324 HP lost |
| Malachar | 21 | 1200 | none / x1 | 10 s / x2.2 | ~14 s | ~49 s at Lv 21, 86/284 lost |
| Warden Rune | 22 | 1500 | none / x1 | 9 s / x3 | ~16–18 s, ~5 HP lost | ~58 s at Lv 22, ~200/308 lost (hardest) |

- **Floors:** 3-phase bosses can't die before 2×min (Ashmaw 34 s). Rune's floor is 45 s of holds plus his final phase.
- **XP:** `expNext` is x0.5 below Lv 8. Reaching Lv 8 now takes ~268 EXP, about 38 kills at 7 EXP (~21 with Pip's +120 orb), down from ~536 (~77 kills).
- **Round 2 (Oct 26):** all 8 bosses now have ?qa= warps and mash-timed inside 43–68 s with real HP cost. Times are from a scripted approach-and-mash bot (/tmp/kqm/mash.mjs, not kept), so they are rough. Twins anti-mash: each twin's HP is held at 50% for 14 s, on top of poise.

## 2026-10-26 5:20 PM ET: Game Director sign-off on retune round 2
- Mash-test band of 43-68 s per boss, each costing real HP: accepted.
- Ashmaw at 43.5 s is 1.5 s under the 45 s target. Accepted as is, because it's the first boss and players won't feel the gap. Revisit only if QA or Will finds it too easy.
- Before Will is told it's done, it still needs a Rule 19 game-qa PASS from Efficiency Bot.

## 2026-10-26 5:35 PM ET: Rule 19 balance flag (Efficiency Bot, qa-reports/kq-live-crosscheck-20261026.md)
- Build and game pass. But with no pauses, Hollowmere, the Cageward Twins and Morvant die within about 10 s of the warp, against a 45 s minimum. Earlier times were measured with the game paused.
- Game Director: not done yet. N64 Style finds out whether warp stats or real balance cause this, fixes it, and records honest times for all 8 bosses. Then QA runs again.

## 2026-10-26 ~6:20 PM ET: honest no-pause re-time (W17g, N64 Style executor)
Each boss was played from its `?qa=` warp using its repo `qa-keys-<boss>.json`, with no Escape and no pauses. The harness used game-qa's exact input replay (1280x720, swiftshader, same press timing) and polled boss HP every 0.5 s. The fight time runs from the first damage to the kill. Real `game-qa` runs with the same keys all PASS (qa-reports/kq-w17g-*).

**Root cause of the "10 s" flag:** no boss dies in 10 s. The scratch no-Escape keys run about 59 s of input, and the final screenshots show Hollowmere, the Twins and Morvant already dead after that window. Their fights were 46–58 s in that same scratch replay. Warp stats match normal progression: str/pow/end = L+2 each = 3L+6 total points, the same as 3/3/3 start plus 3 per level. The holds and poise do engage: each kill lands after its phase-hold floor. The one real tuning gap was the Twins, at 33 s with only 73 HP lost, because they had a single 50% hold. Fix: the Twins now use 3 phase holds (75/50/25%, 13 s each) and deal x2.2 damage.

| Boss | Warp Lv | Fight (no pause) | HP lost |
|---|---|---|---|
| Ashmaw | 8 | 54.2 s | 156/180 (min 24) |
| Hollowmere | 11 | 52.6 s (47.9 s scratch) | 109/204 |
| Slagheart | 12 | 69.4 s | 187/212 |
| Aurel | 15 | 68.8 s | 212/228 |
| Cageward Twins | 18 | 84.5 s / 60.8 s (after fix; was 32.8 s) | 202 / 115 of 316 |
| Morvant | 19 | 50.0 s (58.1 s scratch) | 116/324 |
| Malachar (new ?qa=malachar) | 21 | 54.0 s | 73/308 |
| Warden Rune | 22 | 70.7 s | 168/308 |
