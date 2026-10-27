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

## 2026-10-26 6:32 PM ET: Game Director calls
- W17g (live 6:28 PM ET) is with Efficiency Bot for the Rule 19 recheck. The earlier "10 s" kills turned out to be a QA-script artifact. Only the Twins needed a real retune.
- Linnet's Letters: N64 Style's defaults 1-7 approved (Linnet fades at dawn in the epilogue, oath-only, hints name places, no Lens ping, no glow orb after dawn). It ships only once Linnet has final sprite art, not the placeholder recolor.

## 2026-10-26 6:54 PM ET: Rule 19 FAIL on W17g. Game Director sets the timing standard.
- Standard: time bosses only with Efficiency Bot's /workspace/qa-tmp/kq-w17g/fight.py (steady mash, measured from first damage to the kill). Each boss needs 45 s or more with real HP cost. This replaces the 5:20 PM OK of Ashmaw at 43.5 s.
- fight.py times: Ashmaw 38.8/40.0 (FAIL), Hollowmere 33.8 (FAIL), Slagheart 56.2, Aurel 48.5, Twins 57.3, Morvant about 47 (too close; target about 50), Malachar 47.6 (overstated, because the warp equips w6/c6, his own rewards), Warden 55.1.
- Fixes: retune Ashmaw and Hollowmere, add margin to Morvant, take w6/c6 off the Malachar warp, stop the ending keys from pressing Enter during the credits.

## 2026-10-26 W17h: fight.py times (the ONLY timing standard)
Timing standard: Game Director's /workspace/qa-tmp/kq-w17g/fight.py (steady J/K mash, berries under 35%, timed from first damage to the kill). Runs used an unmodified copy pointed at the local W17h build. Only fight.py numbers are listed here.

| Boss | Lvl | fight.py | HP lost / max |
|---|---|---|---|
| Ashmaw | 8 | 55.5 s | 247/180 (5 berry heals) |
| Hollowmere | 11 | 54.2 s | 160/204 |
| Slagheart | 12 | 80.8 s | 181/212 |
| Aurel | 15 | 66.8 s | 206/228 |
| Twins | 19 | 61.7 s | 220/316 |
| Morvant | 19 | 55.2 s | 267/324 |
| Malachar (warp gear w5/a5/c5/h6/f6) | 21 | 51.2 s | 136/324 |
| Warden Rune | 22 | 55.5 s | 198/308 |

W17h tuning: Ashmaw (boss) min 19, out 1.5, 3 s phase-change invulnerability, takes 0.8x damage. Hollowmere min 21, out 1.6, inv 3, takes 0.75x. Morvant min 14, out 3.6, inv 2, takes 0.9x. Twins min 15, out 2.4. Warden Rune unchanged (thresholds and echo order kept).

## 2026-10-26 8:50 PM ET (Game Director): W17h review
- W17h fight.py times: Ashmaw 55.5, Hollowmere 54.2, Slagheart 80.8, Aurel 66.8, Twins 61.7, Morvant 55.2, Malachar 51.2, Warden 55.5 s.
- Calls: ease Ashmaw to 48-50 s with at most 2 heals (first boss, too harsh at 247 HP cost). Warden Rune must be the hardest at about 70 s, and Slagheart comes down to 60-65 s. Others unchanged. W17i goes to Rule 19 before any further live deploy.
- Linnet art brief assigned to Hearthmoor Art (preview to GD first).
- 8:52 PM: Linnet art (Hearthmoor Art, /workspace/games/kq-staging/art/linnet/) approved by GD for handoff to N64 Style: 0 off-palette pixels, 0 PixelLab credits. Will sees the look with the KQ batch before linnet-letters deploys.

## 2026-10-26 W17i: fight.py times (NOT live; local preview http://localhost:4700/ki-quest/)
fight.py is the only timing standard (copy of /workspace/qa-tmp/kq-w17g/fight.py with the URL pointed at the preview). Every run is listed.

| Boss | Lvl | fight.py runs | HP lost / max (berry heals) |
|---|---|---|---|
| Ashmaw (tuned) | 8 | 48.6 s, 50.0 s | 152/180 (2), 137/180 (2) |
| Hollowmere | 11 | 54.1 s | 135/204 (1) |
| Slagheart (tuned) | 12 | 64.2 s, 58.2 s | 134/212 (0), 162/212 (3) |
| Aurel | 15 | 48.6 s | 96/228 (0) |
| Twins | 19 | 57.0 s | 145/316 (0) |
| Morvant | 19 | 52.4 s | 156/324 (0) |
| Malachar | 21 | 52.0 s | 162/324 (0) |
| Warden Rune (tuned, hardest) | 22 | 72.8 s, 70.5 s | 314/308, 419/308 (regen/heals counted) |

Tuning runs along the way: Ashmaw 50.2 s/51 HP (too little cost), 45.5 s/3 heals, 43.7 s, 46.7 s; Slagheart 33.9 s, 47.3 s, 52.5 s.
W17i TUNE: Ashmaw min 19, out 1.2, inv 3, dIn 0.85. Slagheart min 21, out 1.5, inv 3, dIn 0.85. Warden Rune min 11, out 3.2, inv 2.5, dIn 0.8, with the same thresholds and echo order. Untouched bosses (Aurel 48.6 vs 66.8 in W17h) vary run to run on the same code.

## 2026-10-26 10:48 PM ET (Game Director): W17i + W17i.1 FAIL (close)
- PASS: Ashmaw (about 50 s, 1-3 heals, accepted), Hollowmere, Twins, Morvant, Rune (average 71 s, hardest), warp, credits lock, hints, the crash fix.
- FAIL: Slagheart 51.9-59.9 s, Aurel 44.9-48.3 s, the ending keys don't reach the credits. Malachar 46.5 s is near the floor.
- Calls for W17j: Slagheart +12%, Aurel +6%, Malachar +4% HP, plus the ending keys, dead hint branch and typo fixes.

## W17j (executor, 2026-10-26, fight.py copy -> http://localhost:4702/ki-quest/) — NOT LIVE
Changes: Slagheart HP 620 -> 660 (+6.5%) and phase floor min 21 -> 23 s; Aurel HP 760 -> 840 (+10.5%); Malachar HP 1200 -> 1250 (+4.2%). No other boss touched.
Format: fight_s / hp_lost / berry heals (0 console errors, 0 fails on every run).
| Boss | Setting | Runs | Verdict |
|---|---|---|---|
| Slagheart | HP 700, min 21 | 59.3/147/1, 57.7/124/0, 55.8/142/2 | dropped: 2 runs < 58 |
| Slagheart | HP 720, min 21 | 54.3/129/0, 56.1/121/0, 53.7/170/2 | dropped: < 55 (HP alone doesn't move it; variance) |
| Slagheart | HP 700, min 24 | 66.3/174/1, 86.1/195/1, 59.2/161/2 | dropped: overshoot |
| **Slagheart** | **HP 660, min 23 (final)** | **61.1/177/2, 61.8/171/2, 55.5/142/2, 57.6/123/0** | all ≥ 55, avg 59.0 |
| Aurel | HP 810 | 54.8/148/0, 51.4/163/2, 48.4/140/0 | dropped: 48.4 < 50 |
| **Aurel** | **HP 840 (final)** | **58.4/145/0, 50.4/174/2, 51.9/163/1** | all ≥ 50 |
| **Malachar** | **HP 1250 (final)** | **48.5/122/0, 48.9/150/0, 47.1/141/0** | all ≥ 45 (min 47.1 vs W17i 46.5) |

## 2026-10-26 11:33 PM ET — W17j accepted for Rule 19 (GD)
- main@db37836 on preview :4702, not live.
- Slagheart HP 660: 55.5–61.8 s over 4 runs; all ≥55 s. That meets the bar; the 58–65 band was a target, not a gate. Accepted.
- Aurel HP 840 (+10.5%, not my +6%, since +6% only gave 48.4 s): 50.4–58.4 s. Accepted.
- Malachar HP 1250 (+4%): 47.1–48.9 s. Above the 45 s standard; accepted as is. Revisit only if Rule 19 or Will finds it short.
- Ending keys (12 J presses, 400 ms waits) reach the credits. Stair `threshold` dead arm removed; script.ts:73 typo fixed.

## 2026-10-27 12:37 AM ET — W17j Rule 19 FAIL (narrow), W17k calls (GD)
- Report: /workspace/qa-reports/kq-w17j-recheck-20261026.md. Slagheart, Ashmaw, Warden, ending, epilogue all PASS.
- Aurel: avg 52.2 s but 2/5 runs under 50 s. W17k: HP 840→880 AND a per-phase minimum like Slagheart's so every run is ≥50 s.
- Malachar: 45.9–46.5 s, too close to the 45 s floor. W17k: HP 1250→1300 (+4%) (Will approved the tougher retune).
- Ending keys: add ~4 more J presses so the run doesn't depend on the trailing Enters. N64 decides whether kindle-quest-play.json (start-of-game keys) needs the new sequence and says so.
- Housekeeping: smoke.mjs must stop its preview server on exit; clear the ~23 stale servers on 4801–4832.

## 2026-10-27 ~1:20 AM ET — W17k executor runs (fight.py, local preview :4703, /tmp/kq-w17k)
- Aurel: HP 840→880 + TUNE min 14→15 s/phase + inv 2 s after each phase change (one setting tried, no iteration needed). fight.py: 56.1 / 53.8 / 56.1 s (hp_lost 181/169/169, berries 0/0/2, 0 errs). All ≥50 s.
- Malachar: HP 1250→1300, TUNE unchanged. fight.py: 49.1 / 48.9 / 46.6 s (hp_lost 145/151/181, berries 0, 0 errs). All above 45 s (up from 45.9–46.5).
- Warden Rune (unchanged): 68.1 s, hp_lost 230, 0 errs.
