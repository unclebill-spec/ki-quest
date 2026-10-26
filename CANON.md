# Kindle Quest: CANON (official story + name list)
> Status: placed in ki-rpg by Nintendo 64 Style, 2026-10-26 (W17d), from Hearthmoor Story's staging draft, diffed against masters/kindle-quest/CANON.md and the build.
> Source order: NAMES.md (Kindle Quest section) wins on names and decisions; the live build (`games/ki-rpg/src`) wins on what exists; staging docs fill in the rest.
> Player-facing title: **Kindle Quest**. Internal ids `ki-rpg`, `kiquest`, `anime-fighter` are folder names, not titles.

## Premise
Three hundred years ago the sun went out. The world lives in gloom, lit by lamps and by the **Wellsprings**, pools of living **Glow**. Rook Calder, a lamplighter's apprentice, takes up the **Lens** (it reads power in **lumens**, "lm") and travels from spring to spring. He learns that the last Sunwarden, **Malachar Vesh, the Last Dusk**, let the sun starve because he liked being needed in the dark. The heroes relight the sun by giving the Wellsprings' light back. Doing that wakes **Warden Rune**, the stone-and-gold guardian that kept the world dim "so it could not burn." Rune is the final fight. After it the first grey-gold dawn comes. "Lamps still need lighting. Just not all the time."

## World and look
Gloom-and-glow: dark world, additive light. Rook's neon-blue cold fire, Mirela's violet neon, and red neon for Brann's ember and Sable's blood-light. Real clothes for everyone; only bosses wear plate. Original IP, with no Dragon Ball terms. Nothing slimy or gross: defeats end in cooling embers, fading runes and glow orbs.

## Areas in order (build ids)
1. **Lanternmoss Hollow** (`lanternmoss`): Wickhaven, Glowcap Woods, Witchlight Fen, The Old Watch, **Wellspring Grotto**, Updraft Cliff.
2. **Hushwater** (`hushwater`): marsh town, Lantern Graveyard, Sunken Meadow, Ferry Bell.
3. **Kilnreach** (`kilnreach`) → **Emberheart Quarry** (`emberquarry`, Quarry Heart).
4. **Drowned Vesper** (`drowned`, Tidewarden Court, the Archive) → **The Undertide** (`undertide`).
5. **The Sunwarden's Stair** (`stair`, Red Cage).
6. **The Husk Sun** (`husk`): finale.

## The hero and companions
- **Rook Calder** (17): lamplighter's apprentice from Wickhaven. Neon-blue cold fire. Kindle forms Bluewick and Pale Comet. Descends quietly from Old Calder of Vesper.
- **Mirela Vant** (19): Hushwater grave-keeper who speaks with wraiths. Violet neon. Joins on the **Lantern Oath** (`oath`).
- **Brann Okoro** (24): Kilnreach quarry-smith with a golem ember-core heart. Red-neon ember and stone. Joins at Kilnreach.
- **Sable Kestrel** (19): Malachar's herald and the rival. Turns and joins after the Cageward Twins (`sableJoin`). Red neon blood-light; black riding coat, no plate.

## Key NPCs (built)
Elder Ama Quill, Odile Brask, Pip Arden, Tib, Joss Tumble (Lanternmoss) · Fen Marrow, Orrin Cask, Tallis Reed, Dace Holloway (Hushwater) · Captain Orlo Fenn (Kilnreach/quarry) · **Neri Calloway** (Drowned Vesper; breaks the Archive seal) · Old Calder (wraith, Court steps) · Marlo Quayle (Vesper shopkeeper). Proposed: **Linnet Vant**, Mirela's grandmother and the Sleeping Wraith by the hidden spring (her "Linnet's Letters" quest has no `lettersDone` in the build yet; Linnet's Locket gear exists).

## Terms
**Glow** (power/energy; the player never sees "ki"), **lumens / lm** (Lens readings), **the Lens** (scanner + bios + Lens map), **Kindle gauge** / **Kindle forms** (power-up transforms), **Wellsprings**, **updraft stones** (travel), **lantern posts** (hero swap/save), **Lantern Oath**, **Sunwardens**.

## Bosses (in play order)
| # | Boss | Area | Role |
|---|---|---|---|
| 1 | **Ashmaw, Grotto Devourer** (gear key `rune`, slot boss1) | Lanternmoss, Wellspring Grotto | A starving ember-beast left in the dark as a "guard"; it eats the spring's light. |
| – | Capmother Gilt (mini) | Lanternmoss, Glowcap ring | Ama/Odile's quest; the cranky mother of the caps. |
| – | Reedwraith Corvin (mini) | Hushwater, Ferry Bell | Keeps the bell asleep so the fog stays. |
| – | Lady Ombrelle (mini) | Hushwater, Lantern Graveyard | Drinks the graves' light; loved Malachar. |
| – | Foreman Kettle (mini) | Emberheart Quarry, Cinder Galleries | A boiler golem that won't clock out. |
| 2 | **Slagheart** (`slag`) | Emberheart Quarry, Quarry Heart | The quarry's molten heart-golem. |
| 3 | **Count Aurel, Tide General** (`aurel`) | The Undertide | Vesper's drowned general guarding the sunken Wellspring. |
| 4 | **The Cageward Twins** (Vey and Nell, `twins`, boss4) | Sunwarden's Stair, Red Cage | Hold Sable prisoner; beating them frees her. |
| 5 | **Morvant, the Eclipse Golem** | Stair summit | Gatekeeper to the Husk Sun. |
| 6 | **Malachar Vesh, the Last Dusk** | The Husk Sun | Role UNDECIDED (see below). In the build he is a full 5-phase fight, then fades into a warm glow orb. |
| opt | **Hollowmere, the Drinking Colossus** (boss11) | Hushwater west meadow | OPTIONAL. The thing that drank the marsh; wakes after the bell rings and Corvin falls. Gates nothing; drops Stillwater Charm. |
| FINAL | **Warden Rune, Last Guardian of the Wellsprings** (boss12, `wardenrune`) | The Husk Sun | TRUE FINAL BOSS. The ancient wall that sealed the Wellsprings and kept the world dim so it could not burn. |

### Malachar: what the build does now (not a decision)
`malachar.ts` is a 5-phase boss in HUSK_ARENA. On his defeat (`malacharDown`) the heroes pour the Wellsprings back, and he says "I was only ever the herald... the Warden was the wall" and fades (`malacharFade`). That wakes Warden Rune. Credits list him under "and", not as final boss.

## The finale (build + this pack)
Husk entry (`huskIn`) → Malachar fight → Wellsprings poured back (`poured`) → Malachar fades (`malacharFade`) → Warden Rune wakes (`runeSeen`) → fight → Rune's last lines (`runeDown`) → dawn + Rook (`dawn`) → credits. Expanded epilogue and credits: `ending_warden_rune.md` (built W17d, trimmed; the Linnet scene and the Husk-orb scene are skipped until Linnet's Letters is built and Malachar's role is decided).

## Name list
| Name | Type | Where | Status |
|---|---|---|---|
| Kindle Quest | title | index.html, menu.ts, credits | BUILT |
| Rook Calder | hero | start | BUILT |
| Mirela Vant | companion | Hushwater | BUILT |
| Brann Okoro | companion | Kilnreach | BUILT |
| Sable Kestrel | rival → companion | Stair | BUILT |
| Malachar Vesh, the Last Dusk | boss (role open) | Husk Sun | BUILT |
| Warden Rune | FINAL boss | Husk Sun | BUILT (boss12) |
| Ashmaw, Grotto Devourer | boss | Wellspring Grotto | BUILT |
| Hollowmere, the Drinking Colossus | optional boss | Hushwater | BUILT |
| Slagheart | boss | Quarry Heart | BUILT |
| Count Aurel | boss | Undertide | BUILT |
| The Cageward Twins | boss | Red Cage | BUILT |
| Morvant, the Eclipse Golem | boss | Stair | BUILT |
| Capmother Gilt / Reedwraith Corvin / Lady Ombrelle / Foreman Kettle | mini-bosses | see table | BUILT |
| Neri Calloway, Old Calder, Marlo Quayle | NPCs | Drowned Vesper | BUILT |
| Elder Ama Quill, Odile Brask, Pip Arden, Tib, Joss Tumble | NPCs | Lanternmoss | BUILT |
| Fen Marrow, Orrin Cask, Tallis Reed, Dace Holloway | NPCs | Hushwater | BUILT |
| Captain Orlo Fenn | NPC | Kilnreach | BUILT |
| Linnet Vant (Sleeping Wraith) | NPC | Lanternmoss hidden spring | PROPOSED (quest not built; Linnet's Locket gear BUILT) |
| Linnet's Letters | quest | Hushwater → Lanternmoss | PROPOSED |
| Stillwater Charm, Linnet's Locket | gear | gear.ts | BUILT |
| Lanternmoss Hollow, Hushwater, Kilnreach, Emberheart Quarry, Drowned Vesper, The Undertide, The Sunwarden's Stair, The Husk Sun | areas | world.ts | BUILT |
| Glow, lumens, the Lens, Kindle gauge/forms, Wellsprings | terms | UI/story | BUILT |

## Conflicts
1. **Grotto boss name.** NAMES.md says the grotto boss is Warden Rune (banners WARDEN RUNE) and also that Warden Rune is FINAL. The build (W17) reskinned the grotto boss as **Ashmaw** (`ASHMAW, GROTTO DEVOURER`; gear key still `rune`) and moved Warden Rune to boss12 in the Husk. **Followed:** the build plus Will's Oct 26 decision (Rune = final, Ashmaw = new boss). The NAMES.md grotto line is stale and should be updated by its owner.
2. **Ashmaw vs Slagheart.** Old area3.md used "Ashmaw" for the quarry boss. **Followed** NAMES.md/build: the quarry boss is Slagheart, and Ashmaw is the grotto boss.
3. **Finale boss.** area6.md, malachar.ts comments, HANDOFF W10/W12 and `audio.watch` comments call Malachar the final boss. **Superseded** by Warden Rune (NAMES.md, Will Oct 26; build boss12). Older docs were not rewritten.
4. **Linnet's reward name.** area2.md says "Linnet's Lantern", but the build has **Linnet's Locket**. **Followed** the build.
5. **"Ki Quest" strings** remain in HANDOFF/README/game.ts/frames.json and in slots.md/area2.md. **Followed** NAMES.md: Kindle Quest.
6. **Brann's join point.** cast.md says he joins in Area 2 and is playable from Area 3; the build joins him in Kilnreach. **Followed** the build.
7. **Credits roles.** The build credits "the World/Story team" etc. and "Hearthmoor Sound (ACE-Step 1.5, sfxr)", with no Will/studio line. The brief asks for Will/studio. See the ending file; the existing lines are kept and only additions are proposed.
8. **Sable's pronoun.** HANDOFF W11d flagged it; cast.md and the build lines both use "she". **Followed:** she.

## Open questions
1. **Malachar's role (UNDECIDED, Will).** Options: (a) keep him as a full penultimate boss that fades and wakes Rune (current build); (b) make him a non-fight scene, so the Husk goes straight to Rune; (c) turn him into a short "herald" phase-0 of the Rune fight; (d) a redemption arc where he helps against Rune; (e) move him earlier (e.g. Stair) as Act III's climax.
2. Should NAMES.md's "Grotto boss: Warden Rune" line be changed to Ashmaw? (Owner: NAMES.md keeper.)
3. ~~Rename gear key `rune`?~~ **Decided (Will, Oct 26): no.** `rune` stays as Ashmaw's key (saves use it); a code comment in src/gear.ts says so. `wardenrune` = Warden Rune.
4. Will Linnet's Letters be built (`lettersN`/`lettersDone`)? The ending's Linnet scene depends on it.
5. Credits line for Will/studio: what is the studio's exact name? Until he says, "Will" is used.
6. Where does Hollowmere sit in the canon order if it's ever made mandatory?

## Internal ids (do not rename)
Repo `ki-rpg`, `kiquest` files/save keys, URL base `/ki-quest/`, `window.__ki`, gear BOSS keys `rune` (= Ashmaw, grotto) / `wardenrune` (= Warden Rune) / `slag` / `aurel` / `twins` / `morvant` / `malachar`, mb keys `boss`..`boss12` (boss11 Hollowmere, boss12 Warden Rune), `warden` = Stoneward foe role (not a boss).
