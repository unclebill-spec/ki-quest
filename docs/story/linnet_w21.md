# Linnet: W20 line review + W21 ambient bark pool

Hearthmoor Story, 2026-10-30. For Nintendo 64 Style (ki-rpg owner). Source canon: linnets_letters.md, ending_warden_rune.md, cast.md.

## 1. Review of N64's W20 lines (branch w20, 6dae320, `src/story/script.ts`)

### LINNET_LOCKET: rewrite needed (2 small canon fixes)
- **"little lamp" is Linnet's name for Mirela only** (she called Mirela that at six; letters 2 and the wake scene). The Locket's wearer is the player, so Linnet should say "lamplighter" (what Mirela and the townsfolk call Rook).
- **Lockets don't tick** (that's a pocket watch). Changed to "sat".
- Gate: only while `linnetWoke && lettersDone && !endingSeen` (she fades in the epilogue).

```ts
export const LINNET_LOCKET = [
  "Oh! My locket. Turn round, let me see it on you. Silver suits you, lamplighter.",
  "It sat against my collarbone the whole way west. Keep it warm for me.",
];
```

### MIRELA_REREAD: approved as written
All three lines fit Mirela's voice and canon. The "little suns" detail is a nice echo of Linnet coming for a sunrise. No change.

## 2. W21: Linnet ambient bark pool (13 lines)

Plays at the Lanternmoss hidden spring when you walk near her: after `linnetWoke`, before `endingSeen`. Lines 1-8 any time; 9-11 need `lettersDone`; 12-13 only at night (`dayK <= 0.35`). Every line is 70 characters or less. Warm, a little wry; no new lore beyond canon.

```ts
/** W21: Linnet Vant's ambient barks at the hidden spring. */
export const LINNET_BARKS: { line: string; needs?: "lettersDone"; night?: true }[] = [
  { line: "Is it morning yet? No? I'll keep waiting. I'm good at it." },
  { line: "The water hums if you're quiet. Shh. There. Hear it?" },
  { line: "I walked all this way and then fell asleep. Typical." },
  { line: "The orbs visit me. Terrible gossips, the lot of them." },
  { line: "Mind the moss, dear. It's older than I am, and I'm old." },
  { line: "A spring that never goes dark. I told them I'd find it." },
  { line: "I meant to bring some home in a jar. Silly old woman." },
  { line: "My boots went home without me. Mirela wears them better." },
  { line: "Read my own letters back. My spelling's worse than I recalled.", needs: "lettersDone" },
  { line: "Look after my girl. She keeps the dead. Someone must keep her.", needs: "lettersDone" },
  { line: "Go on, lamplighter. Make me a sunrise. I'll be right here.", needs: "lettersDone" },
  { line: "The stars are out. They never did frighten me.", night: true },
  { line: "Night again. That's all right. Dawn always comes back.", night: true },
];
```

## Open questions
1. Should LINNET_LOCKET have a Mirela-only variant, if the party lets Mirela wear the Locket (for example "There it is, little lamp. Right where it belongs.")? Depends on whether gear is per character in the build.
