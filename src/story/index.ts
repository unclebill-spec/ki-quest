import { CREDITS_T } from "../areas/art";
/**
 * Story layer: intro, NPC talk, dialogue box, sealed wards, updraft-stone travel between areas, objective line.
 * Runs beside the sim: main.ts calls story.update() before game.step(); when it returns true the sim is paused.
 * State is its own save key (kiquest.story.v1) so it never collides with the game save (Cozy) or combat (Master Builder).
 */
import type { Game } from "../game";
import type { Input } from "../input";
import { buildArea, setWardOpen, zoneAt, TILE } from "../world";
import { INTRO, NPCS, Flags, LETTERS, LETTER_QUIPS, LINNET_LOCKET, MIRELA_REREAD } from "./script";
import { ambientBark, backfillVisited, CODEX, codexUnlocked } from "./ambient"; // W20
import { sfx } from "../menu";
import { hud as hudText } from "../textfit";
import { CH_INTERACT, K_RING, K_SPARK, C_GOLD, C_WHITE } from "../vendor/particles";
/** W18 fun pass: a ring of sparkles (interact channel, approved particle palette only). */
const burst = (g: Game, x: number, y: number, n: number, v: number) => { // W20: reduced flash = half as many, no rings, slower, gold only
  const low = g.flashLow; if (low) { n = Math.ceil(n / 2); v *= 0.6; }
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, ring = !low && !!(i & 1); g.parts.emit(CH_INTERACT, ring ? K_RING : K_SPARK, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.7 - 20, 0.55, low || i % 3 ? C_GOLD : C_WHITE); if (ring) hudText.fx.rings++; else hudText.fx.sparks++; } };

const KEY = "kiquest.story.v1";
const { compass, motes, bark } = hudText; // W19 (state lives in textfit.ts so draw.ts needs no story import)
type Box = { who: string; lines: string[]; i: number; t: number; then?: () => void };

const F0 = (f: Record<string, unknown>) => !!f.dawn;
export class Story {
  flags: Flags = {};
  lastKills = 0;
  box: Box | null = null;
  intro = -1; introT = 0;
  credits = 0;
  /** W20: random source for barks / the rare Mirela line (tests swap it). barkT = seconds until the next ambient bark. */
  rnd: () => number = Math.random; barkT = 12; codexT = 0; codexQ: string[] = []; compassNear = false;
  fly = 0; flyTo = ""; flyFrom = ""; near: string | null = null; zone = ""; zoneT = 0;
  constructor(public g: Game, public input: Input) {
    try { this.flags = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { this.flags = {}; }
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.flags)); } catch { /* full */ } } // W17d: autosave with flags so a crash can't leave flags ahead of level/gear
  get active() { return this.credits > 0 || !!this.box || this.intro >= 0 || this.fly > 0; }

  /** Called after game.start(). New game: reset story, show intro. Continue: restore area. */
  begin(cont: boolean) {
    if (!cont) { this.flags = { introSeen: this.flags.introSeen ?? false }; this.save(); } // stale kiquest-mb-v1 is cleared by the title New Game button (main.ts)
    const id = (this.flags.area as string) || "lanternmoss";
    if (id !== this.g.area.id) this.enter(id, !cont);
    if (!this.flags.introSeen) { this.intro = 0; this.introT = 0; }
  }
  enter(id: string, atStart = true) {
    const g = this.g, hp = g.hp, ep = g.ep, keep = { x: g.p.x, y: g.p.y };
    g.area = buildArea(id); g.reset(); g.hp = hp; g.ep = ep; bark.t = 0; this.near = null; // never point the Talk prompt at an NPC from the previous area
    if (!atStart) { g.p.x = keep.x; g.p.y = keep.y; }
    g.shots = []; g.banner = g.area.name; g.bannerT = 3;
    this.flags.area = id; this.flags["visited_" + id] = true; this.save();
    this.zone = "";
  }
  say(who: string, lines: string[], then?: () => void) { this.box = { who, lines, i: 0, t: 0, then }; }
  private ok() { const i = this.input; return i.pressed("melee") || i.pressed("confirm") || i.pressed("blast"); }

  /** Returns true when the story owns this frame (sim paused). */
  update(dt: number): boolean {
    const g = this.g, inp = this.input;
    if (this.intro >= 0) {
      inp.poll(); this.introT += dt;
      if (this.ok() || inp.pressed("pause")) {
        if (this.introT < 0.5 && !inp.pressed("pause")) return true;
        this.intro = inp.pressed("pause") ? INTRO.length : this.intro + 1; this.introT = 0;
        if (this.intro >= INTRO.length) { this.intro = -1; this.flags.introSeen = true; this.save(); g.banner = g.area.name; g.bannerT = 3; }
      }
      return true;
    }
    if (this.credits > 0) { inp.poll(); this.credits -= dt; if ((this.ok() || inp.pressed("pause")) && this.credits < CREDITS_T - 8) this.credits = 0; /* W17h: 8 s before skip so stray dialogue presses never eat the credits */ if (this.credits <= 0) { this.credits = 0; g.banner = "Dawn over " + g.area.name; g.bannerT = 3; g.autosave(); dispatchEvent(new Event("kq-credits-end")); } return true; }
    if (this.fly > 0) {
      this.fly -= dt; inp.poll();
      if (this.fly <= 0.6 && this.flyTo) { this.enter(this.flyTo); this.flyTo = ""; const st = g.stats as Record<string, number>; st.travels = (st.travels ?? 0) + 1; }
      return true;
    }
    if (this.box) {
      inp.poll(); const b = this.box; b.t += dt;
      const full = b.lines[b.i].length;
      if (this.ok()) {
        if (b.t * 60 < full) b.t = 999;
        else if (++b.i >= b.lines.length) { this.box = null; b.then?.(); } else b.t = 0;
      }
      return true;
    }
    if (g.mode !== "play") return false;
    // world checks (before the sim reads input this frame)
    setWardOpen(g.area.wards.some((w) => g.lvl >= w.lvl));
    this.near = null;
    { // W17f: hide-until-flag NPCs (NpcDef.show/at), e.g. Linnet appears beside the Lanternmoss spring on linnetWoke
      const defs = NPCS[g.area.id] ?? {};
      for (const id in defs) { const d = defs[id]; if (!d.show) continue; const on = d.show(this.flags), i = g.area.npcs.findIndex((n) => n.id === id);
        if (on && i < 0 && d.at) g.area.npcs.push({ id, x: d.at[0] * TILE + 8, y: d.at[1] * TILE + 8 }); else if (!on && i >= 0) g.area.npcs.splice(i, 1); }
    }
    for (const n of g.area.npcs) if (Math.hypot(n.x - g.p.x, n.y - g.p.y) < 22) this.near = n.id;
    const z = zoneAt(g.area, g.p.x, g.p.y);
    if (z !== this.zone) { if (this.zone) { g.banner = z; g.bannerT = 2.2; } this.zone = z; }
    for (const w of g.area.wards) {
      const wx = w.tx * TILE + 8, wy = w.ty * TILE + 8;
      if (g.lvl < w.lvl && Math.hypot(wx - g.p.x, wy - g.p.y) < 20 && !this.flags.wardToldT) {
        this.flags.wardSeen = true; this.flags.wardToldT = true;
        this.say("Sealed Ward", [`Glow too faint (Lv ${w.lvl}).`]); g.p.x -= 6; return true;
      }
      if (Math.hypot(wx - g.p.x, wy - g.p.y) > 40) this.flags.wardToldT = false;
    }
    for (const s of g.area.travel) if (Math.hypot(s.x - g.p.x, s.y - g.p.y) < 10 && !this.flags.stoneT) {
      this.flags.stoneT = true;
      if (s.to === "husk" && !this.flags.threshold) { this.say("Top-ring stone", ["This slab points straight up at the husk sun.", "Morvant still bars the way. NONE ASCEND."]); return true; }
      if (s.to === "stair" && !this.flags.malachar) { this.say("Undertide stone", ["A violet slab, colder than the sea. It points north, up.", "Whatever is up there hasn't been named yet. Find out who the guard was guarding."]); return true; }
      if (s.to === "undertide" && !this.flags.sigilDone) { this.say("Tide stair", ["A stair of wet rune-stone, going down under the canals. The seal is a sun with a missing ray.", "Neri would know how to open it."]); return true; }
      if (s.to === "drowned" && !this.flags.quarryBossDown) { this.say("Rune slab", ["A slab in the arena wall, carved with a drowned sun. It's dark.", "Whatever is drinking the Quarry Heart is still here. Deal with it first."]); return true; }
      if (s.to === "emberquarry" && !this.flags.brannQ) { this.say("Quarry lift", ["A rune-lift down into the quarry. It's locked with a smith's seal.", "Brann in Forge Square would have the key."]); return true; }
      if (s.to === "kilnreach" && !this.flags.oath) { this.say("Updraft stone", ["This slab is cold and points east, toward a red glow on the mountains.", "It won't wake for a stranger. Maybe after Mirela trusts you."]); return true; }
      this.say("Updraft stone", [`The rune slab hums. Ride the updraft to ${s.label}?`, "(Melee to fly. Step off to stay.)"], () => { this.fly = 3.2; this.flyTo = s.to; this.flyFrom = g.area.id; });
      return true;
    }
    const F = this.flags, B = (k: string, who: string, lines: string[], exp = 0) => { F[k] = true; this.save(); if (exp) g.gainExp(exp); if (g.mode === "play") g.autosave(); /* W17d: beat flags + hero state saved together (crash flag drift); not in save() so begin() cannot outdate a loaded save */ this.say(who, lines); return true; };
    // Mini-boss lead-ins (W15, world side only; fights are Master Builder's, see HANDOFF "Mini-boss specs"). One-shot, fires on entering the arena ring once its gate is open.
    const at = (a: string, tx: number, ty: number, r: number) => g.area.id === a && Math.hypot(g.p.x - (tx * 16 + 8), g.p.y - (ty * 16 + 8)) < (r + 1) * 16 && !this.box;
    // W17 Ashmaw lines (staging/story/w17.md). Lead-in fires just outside the grotto ring (ARENA r=104px); defeat lines play once (ashmawBeat) after boss.ts sets ashmawDown.
    if (F.oath && !g.mb.boss.done && !F.ashmawSeen && at("lanternmoss", 38, 17, 7)) return B("ashmawSeen", "Rook", ["(Warm air breathes out of the grotto. It smells like a hearth that went out years ago.)", "Mirela: Something down there is eating the spring's light. Stay close, lamplighter, and keep your lamp lit."]);
    if (F.ashmawDown && !F.ashmawBeat && at("lanternmoss", 38, 17, 9)) return B("ashmawBeat", "Mirela Vant", ["(Its embers cool to grey. The spring's blue light creeps back up the walls.)", "It wasn't evil. Someone left it starving in the dark and called it a guard."]);
    // W17 Hollowmere (optional boss11; fight in src/game/enemies/hollowmere.ts sets hollowmereWake / hollowmereDown). Lines: staging w17.md.
    if (F.hollowmereWake && !F.hollowmereIntro && !F.hollowmereDown && !this.box) return B("hollowmereIntro", "Hollowmere", ["(The marsh drains in a long, slow swallow. Something the size of a hill rises from the reeds, dripping violet light.)", "Ring... the bell... again. I was... so thirsty... and you... called me... to drink.", "Light. Water. Lamplighter. All of it... goes down... the same."]);
    if (F.hollowmereDown && !F.hollowmereBeat && !this.box) return B("hollowmereBeat", "Hollowmere", ["(It sinks, and the water it drank pours back into the marsh in a warm, glowing tide.)", "...Full. At last... full.", "Fen Marrow: The reeds are standing up straight. Haven't seen that since I was a boy. It wasn't the fog, it was the drinking."]);
    // W17f Linnet's Letters (staging/story/linnets_letters.md): the hidden spring K is at (2,32) in Lanternmoss
    if (F.oath && F.lettersRead && !F.linnetWoke && at("lanternmoss", 2, 32, 2)) return B("linnetWoke", "The spring", ["(The water brightens. A shape in a faded cloak sits up out of the glow, like someone woken from a nap.)", "Linnet Vant: \"Oh. Visitors. I must have dozed. Is it morning yet?\"", "Mirela: \"Grandmother. It's me. It's Mirela.\"", "Linnet Vant: \"...Little lamp? You're so tall. You've got my boots on. Those are my boots.\"", "Mirela: \"You left them by the door.\"", "Linnet Vant: \"So I did. I meant to come back for them.\""]);
    if (F.oath && !F.lettersRead && !F.linnetSeen && !F.dawn && at("lanternmoss", 2, 32, 2)) return B("linnetSeen", "Mirela Vant", ["(She stops at the water.) There's someone sleeping here. A wraith. Old. ...She feels familiar. I don't know why yet."]);
    if (F.capQ && !F.capDone && !F.capSeen && at("lanternmoss", 39, 27, 3)) return B("capSeen", "Glowcap Ring", ["(The big caps lean in. Spores drift up like slow snow.)", "Something under the moss is breathing. It sounds annoyed.", "Odile said the Capmother hasn't been nice in weeks."]);
    if (F.reedQ && !F.bell && !F.corvinDown && !F.corvinSeen && at("hushwater", 25, 25, 1)) return B("corvinSeen", "Reedwraith Corvin", ["(A tall shape in a boatman's coat stands in the reeds, violet lantern-eyes half shut.)", "Shh. The bell sleeps. If it rings, the fog parts... and then she'll see you. So will He."]);
    if (F.oath && g.mb.boss.done && !F.ombrelleDown && !F.ombrelleSeen && at("hushwater", 40, 7, 3)) return B("ombrelleSeen", "Mirela", ["(The graves hum. Cold blue light leaks up between the stones.)", "Something is under my graves. Drinking. The wraiths won't say her name.", "Little lamplighter. Little grave-girl... (the voice comes from below) ...come down to my dark?"]);
    if (F.ombrelleDown && !F.ombrelleBeat && g.area.id === "hushwater" && !this.box) return B("ombrelleBeat", "Sable Kestrel", ["(A girl in a black riding coat sits on the crypt stair, watching the graves go violet again.)", "She loved him. That's what he does with love: he drinks it.", "...Forget I said that."]);
    if (F.brannQ && !F.heart && !F.kettleDown && !F.kettleSeen && at("emberquarry", 26, 12, 3)) return B("kettleSeen", "Foreman Kettle", ["(A boiler-bellied stone golem in a canvas apron turns from the lava pool. Steam hisses from its rivets.)", "SHIFT'S NOT OVER. NOBODY TAKES THE EMBER. NOBODY CLOCKS OUT."]);
    // Act II close: the Archive (after Count Aurel falls) and Malachar's projection
    if (g.area.id === "drowned" && F.tideBossDown && !F.twist && !this.box) {
      F.twist = true; this.save(); g.gainExp(300);
      const red = () => { for (const l of g.area.lamps) { (l as { c0?: unknown }).c0 ??= l.c; l.c = [1, 0.12, 0.22]; } };
      const unred = () => { for (const l of g.area.lamps) { const o = l as unknown as { c0?: typeof l.c }; if (o.c0) l.c = o.c0; } };
      const s = (who: string, lines: string[], then?: () => void) => () => this.say(who, lines, then);
      this.say("The Archive", ["(Neri breaks the seal. Three records survive the sea.)", "I. The Sunwardens: a robed order who tended the sun with a crown of smith-forged light. Each served a lifetime, then passed the crown on.",
        "II. The last warden: young, kind, and in love with the night. Its quiet, its lanterns, the way people gathered close. He wrote: \"In the dark, they need me.\"",
        "III. He stopped feeding the sun his light and kept it for himself. The sun went out. Vesper's guard drowned the city to bury the records.", "The last line reads: \"Sunwarden Malachar Vesh, the Last Dusk.\""],
        s("Rook", ["He didn't lose the sun. He let it starve, because he liked being needed."], s("Mirela", ["The wraiths always said the dark had a keeper. I thought they meant death."],
        s("Brann", ["Then the Wellsprings aren't stolen. They're being stored. For what?"], s("Neri", ["For when the last light goes out. Then he's the only one left, and everyone has to kneel to be warm."],
        () => { red(); g.shake = 6; this.say("Malachar Vesh", ["(Every lamp in the Court turns red at once. A vast shadow in black-and-crimson plate rises over the fountain, a crown of red spikes floating above it.)",
          "So the sea gave up my name. Good. I'm tired of hiding it.", "I held the sun for forty years. Do you know what it's like to light a world that never once looks up and thanks you?",
          "In the dark, they look up. They gather close. They need. I gave them the night, and I'll give them one last light: me.", "Sable. Come home."],
          () => { unred(); F.malachar = true; this.save(); this.say("Neri", ["(The projection fades. A red light streaks north over the sea.)", "That was Sable. North is the Stair. No one comes back from the Stair.", "The Undertide stone points north. Its cold slab would wake for you now."]); }); }))))); return true;
    }
    // Finale: inside the husk sun
    if (g.area.id === "husk" && !F.huskIn && !this.box) return B("huskIn", "The Husk Sun", ["(Inside, the sun is a cathedral of cold ash. Five pedestals ring a heart that barely beats.)", "Malachar: \"You climbed all this way to watch it die with me? How kind.\"", "Malachar: \"Every Wellspring you walked past, I drank. Every lamp you lit, I let you light. Come, lamplighter. Be the last warm thing.\""], 300);
    // MB hook (W17, mechanical; N64 to review): Malachar's beat now ends on malacharFade; boss12 Warden Rune (src/game/enemies/wardenrune.ts)
    // wakes on malacharFade && !runeDown; dawn + credits follow runeDown. Lines: staging/story/w17.md.
    if (g.area.id === "husk" && F.malacharFade && !F.runeDown && !F.runeSeen && !this.box) return B("runeSeen", "Warden Rune", ["(The five pedestals crack. A guardian of stone and gold unfolds from the sun's heart, runes burning cyan along its arms.)", "SUN. RELIT. UNSANCTIONED. THE WELLSPRINGS ARE SEALED. THEY ARE TO STAY SEALED.", "I KEPT THIS WORLD DIM FOR THREE HUNDRED YEARS SO IT COULD NOT BURN. STAND ASIDE, LAMPLIGHTER."]);
    if (g.area.id === "husk" && F.runeDown && !F.dawn && !this.box) {
      // W17d ending (staging/story/ending_warden_rune.md, trimmed). Beats with `needs` play only if that flag is set,
      // so the ending never breaks when e.g. Linnet's Letters (lettersDone) isn't done/built.
      const END: { who: string; lines: string[]; needs?: string }[] = [
        { who: "Rook", lines: ["We will. Rest. You held the door for three hundred years."] },
        { who: "Warden Rune", lines: ["...Three hundred... and one.", "(A last gold rune settles on Rook's lamp like a spark. The Warden is only stone now, sitting, hands open.)"] },
        { who: "Mirela", lines: ["The dead aren't afraid of it anymore. Neither am I."] },
      ];
      const EPI: { who: string; lines: string[]; needs?: string }[] = [
        { who: "Elder Ama Quill", lines: ["(Wickhaven.) Put your pole down, boy. The sun's doing your rounds today.", "Pip: \"Can we still light them tonight? For fun?\""] },
        { who: "Mirela Vant", lines: ["(Hushwater.) The graves are quiet. Not empty. Quiet. They're watching the sky like everyone else."] },
        { who: "Linnet Vant", needs: "lettersDone", lines: ["(The hidden spring.) There you are, little lamp. You found the spring I couldn't.", "Mirela: \"Grandmother... you can go now. I'll keep the light.\"", "(Linnet smiles, becomes a drift of warm glow orbs, and rises into the morning.)"] },
        { who: "Brann Okoro", lines: ["(Kilnreach.) Forge fires are for bread now. First sunrise loaf. Everyone gets the heel."] },
        { who: "Neri Calloway", lines: ["(Drowned Vesper.) The tide's going out. Old Calder says there's a road under there. Says it goes home.", "Old Calder: \"Stubborn, like us Calders.\""] },
        { who: "Sable Kestrel", lines: ["(The Stair.) I keep waiting for the light to ask for something back.", "(She stays in the sun anyway, eyes shut.) ...It doesn't."] },
        { who: "The Husk Sun", needs: "malacharFade", lines: ["(A single warm glow orb drifts out of the sun and into the dawn.)"] },
        { who: "Rook", lines: ["(Wickhaven, evening. He lights one lamp anyway. Everyone gathers close.)", "By choice now."] },
      ];
      const chain = (bs: typeof END, done: () => void) => { const q = bs.filter((b) => !b.needs || F[b.needs]); const nx = (i: number): void => { if (i >= q.length) { done(); return; } this.say(q[i].who, q[i].lines, () => nx(i + 1)); }; nx(0); };
      this.say("Warden Rune", ["(Its runes go out one by one: cyan, then gold, then nothing. The ward walls fold down like a closing book.)", "...The world... is warm... and nothing... is burning.", "Then my watch... is over. Keep the lamps... lamplighter. Not all the time. Just... when it's dark."],
        () => chain(END, () => { F.dawn = true; this.save(); g.gainExp(1000); this.say("Rook", ["(The first grey-gold dawn in three hundred years.)", "Lamps still need lighting. Just not all the time."], () => chain(EPI, () => { if (F.lettersDone) { F.linnetRest = true; this.save(); } this.credits = CREDITS_T; })); })); return true;
    }
    if (g.area.id === "husk" && F.malacharDown && !F.malacharFade && !F.dawn && !this.box) {
      F.poured = true; this.save();
      this.say("The Wellsprings", ["(The heroes don't take the light. They give it back.)", "Rook pours the Lanternmoss spring. Mirela, the Hushwater dead's. Brann, the Quarry Heart.", "Neri's tide-light rises from the drowned Wellspring. And Sable pours back everything he drank from her."],
        () => this.say("Malachar Vesh", ["(Left with only his own small light, he looks up at the sun, relit.)", "...It's warm. I'd forgotten it was warm.", "But you've woken him. The one I was set to keep asleep. I was only ever the herald, lamplighter... the Warden was the wall.", "(He fades into a single warm glow orb. Under the pedestals, something vast and old turns over in its sleep.)"],
        () => { F.malacharFade = true; this.save(); })); return true;
    }
    // Act III open: the Sunwarden's Stair
    if (g.area.id === "stair" && !F.stairIn && !this.box) return B("stairIn", "The Sunwarden's Stair", ["(Broken stone rings float up and up toward a vast dark sphere: the husk of the sun.)", "The murals in the waystation carry a name now: \"Malachar Vesh, the last warden.\"", "Court soldiers everywhere... but they're not looking at you. They're hunting someone."], 200);
    if (F.cageDone && !F.sableJoin && g.area.id === "stair" && !this.box) { F.sableJoin = true; this.save(); g.gainExp(400);
      this.say("Sable Kestrel", ["(The red cage shatters. Sable sits up, pale and shaking.)", "He said I was his favourite. He says that to everyone he drinks.", "Teach me to fight for something, lamplighter. I only ever learned to fight for someone."],
        () => this.say("The party", ["Mirela: \"The dead trust you. Barely. So will I.\"", "Brann: \"You're too thin. I'll cook.\"", "Rook: \"Lamplighters light anyone's lamp. Even a vampire's.\""])); return true; }
    if (F.morvantDown && !F.threshold && g.area.id === "stair" && !this.box) { F.threshold = true; this.save(); g.gainExp(500);
      this.say("Morvant", ["ASCEND. LIGHT IT. ...PLEASE.", "(The eclipse golem kneels and becomes a bridge to the top ring. Up close, the husk sun flickers.)"],
        () => this.say("The party", ["Brann: \"It's not dead. It's starving.\"", "Mirela: \"There are wraiths in it. Old wardens. They're asleep.\"", "Sable: \"He'll be at its heart. He likes to be at the heart of things.\"", "Rook: \"Then we give back everything he drank. Every spring. All of it.\""])); return true; }
    // Sable Kestrel hooks (staging cast: Malachar's herald; foe now, turns late, 4th hero)
    if (g.area.id === "drowned" && F.sigilDone && !F.sable1 && !this.box) return B("sable1", "Sable Kestrel", ["(A girl in a black riding coat watches from a broken balcony.)", "So you can read old suns now. How nice for you, lamp-lighter.", "Go down the tide stair if you like. The Drinker's general is waiting, and so is the truth. You won't like either."]);
    if (g.area.id === "undertide" && !F.sable2 && !F.tideBossDown && g.p.x > 28 * 16 && g.p.y > 20 * 16 && !this.box) return B("sable2", "Sable Kestrel", ["(Sable Kestrel waits at the Wellspring's door. She doesn't block it.)", "He told me to stop you here. I'm going to watch instead. Don't make me regret it.", "Count Aurel keeps this door. He kept it while the city drowned.", "He remembers the sun better than any of you. Ask yourselves why."]);
    if (F.tideBossDown && !F.sable3 && g.area.id === "undertide" && !this.box) return B("sable3", "Sable Kestrel", ["Enough, teacher. You drowned a city. Isn't that enough for him?", "(Aurel's cold crown goes out like a candle.)", "Don't thank me. I didn't do it for you.", "(A red light streaks north over the dark sea.)"], 150);
    if (this.flags.quarryBossDown && !this.flags.quarryBeat && g.area.id === "emberquarry") { // post-quarry-boss beat (flag set by Master Builder's boss)
      this.flags.quarryBeat = true; this.save(); g.gainExp(120);
      this.say("Brann Okoro", ["...It's over. Feel that? The stone's warm again under my boots.", "That thing wore a sun on its chest, a dead one, like the carvings on that slab by the wall.", "Mirela says the wraiths whisper a name: Malachar. I've a feeling he's the one doing the drinking.", "The slab's glowing now. Wherever it goes, we go."]);
      return true;
    }
    const kills = g.stats.kills;
    if (g.area.id === "hushwater" && this.flags.reedQ && !this.flags.reedDone && kills > this.lastKills) {
      this.flags.reedN = Math.min(8, ((this.flags.reedN as number) || 0) + kills - this.lastKills); this.save();
      g.say(`Meadow quieted ${this.flags.reedN}/8`, 1.5);
    }
    this.lastKills = kills;
    if (g.area.id === "hushwater" && F.lettersQ && !F.lettersRead) LETTERS.forEach((l, i) => { // W17f letter pickups
      const k = `letter_${i + 1}`;
      const lx = l.x * 16 + 8, ly = l.y * 16 + 8, d = Math.hypot(lx - g.p.x, ly - g.p.y);
      if (!F[k] && d < 160 && (g.frame + i * 13) % 40 === 0) g.parts.emit(CH_INTERACT, K_SPARK, lx + ((g.frame >> 3) % 5) - 2, ly - 4, 0, -14, 0.6, C_GOLD); // W18 fun pass: a lost letter glints when you're close
      if (!F[k] && d < 14) {
        F[k] = true; F.lettersN = ((F.lettersN as number) || 1) + 1; this.save();
        burst(g, lx, ly - 4, (F.lettersN as number) >= 4 ? 12 : 8, (F.lettersN as number) >= 4 ? 70 : 45); sfx((F.lettersN as number) >= 4 ? "ui-save" : "ui-confirm"); // W18 fun pass
        g.say(`${l.t} (${F.lettersN}/4)${(F.lettersN as number) >= 4 ? " · bring them to Mirela" : ""} · ${LETTER_QUIPS[Math.min(2, (F.lettersN as number) - 2)]}`, 4.5); // W19: Mirela line, longer so it can be read
      }
    });
    { // W19 compass ping: points to the nearest uncollected letter while the hunt is on; gone at 4/4
      let best: { x: number; y: number; d: number } | null = null;
      if (g.area.id === "hushwater" && F.lettersQ && !F.lettersRead && ((F.lettersN as number) || 1) < 4) LETTERS.forEach((l, i) => {
        if (F[`letter_${i + 1}`]) return; const x = l.x * 16 + 8, y = l.y * 16 + 8, d = Math.hypot(x - g.p.x, y - g.p.y);
        if (!best || d < best.d) best = { x, y, d };
      });
      const b = best as { x: number; y: number; d: number } | null;
      compass.target = b && b.d > 40 ? { x: b.x, y: b.y, a: Math.atan2(b.y - g.p.y, b.x - g.p.x) } : null;
      const near = !!b && b.d <= 40; // W20: a small sparkle when you reach a letter (once per approach)
      if (near && !this.compassNear && b) { const k = g.flashLow ? 3 : 6; for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2; g.parts.emit(CH_INTERACT, K_SPARK, b.x + Math.cos(a) * 6, b.y - 4 + Math.sin(a) * 4, Math.cos(a) * 12, -10, 0.5, i & 1 ? C_WHITE : C_GOLD); } hudText.fx.compassSpark++; }
      this.compassNear = near;
    }
    if ((this.codexT -= 1 / 60) <= 0) { this.codexT = 0.5; this.codexCheck(); } // W20: visited_ backfill + codex unlocks, twice a second
    if (bark.t > 0) bark.t -= 1 / 60;
    if ((this.barkT -= 1 / 60) <= 0) { this.barkT = 14 + this.rnd() * 10; this.bark(); } // W20 ambient barks
    if (g.area.id === "lanternmoss") { const n = g.area.npcs.find((q) => q.id === "l"); // W19: soft glow motes drift up around Linnet (particles only, no sound)
      if (n && g.frame % 9 === 0) { const a = (g.frame * 0.37) % (Math.PI * 2); g.parts.emit(CH_INTERACT, K_SPARK, n.x + Math.cos(a) * 9, n.y - 10 + Math.sin(a) * 6, Math.cos(a) * 3, -9, 1.1, (g.frame / 9) & 1 ? C_WHITE : C_GOLD); motes.n++; } }
    for (const s of g.area.springs) if (Math.hypot(s.x - g.p.x, s.y - g.p.y) < 14) {
      if (!this.flags.spring) { this.flags.spring = true; g.pts += 3; this.save(); g.say("Hidden Wellspring found · +3 stat points", 3); }
      else if (g.hp < g.maxHp || g.ep < g.maxEp) g.say("The spring restores you", 1.2);
      g.hp = g.maxHp; g.ep = g.maxEp;
    }
    for (const o of g.area.orbs) {
      const k = `orb_${g.area.id}_${o.i}`;
      if (g.area.id === "hushwater" && this.flags.reedQ && !this.flags.corvinDown) continue; // MB hook: Corvin guards the Ferry Bell (minis.ts)
      if (!this.flags[k] && Math.hypot(o.x - g.p.x, o.y + 6 - g.p.y) < 14) {
        this.flags[k] = true;
        if (g.area.id === "stair") { if (!this.flags.crownShard) { this.flags.crownShard = true; g.gainExp(150); this.save(); g.say("Found a shard of the Sunwardens' crown · +150 EXP", 2.5); } continue; }
        if (g.area.id === "drowned") { this.flags.sigil = true; this.save(); g.say("Found a sun-sigil · show it to Neri", 2.5); continue; }
        if (g.area.id === "emberquarry") { this.flags.heart = true; this.save(); g.say("Found Brann's Heart-Ember · bring it to Brann", 2.5); continue; }
        if (g.area.id !== "lanternmoss" && g.area.id !== "hushwater") { g.gainExp(40); this.save(); g.say("Found a stray glow orb · +40 EXP", 2.5); continue; } // W17d: Kilnreach etc. no longer say "Ferry Bell"
        if (g.area.id !== "lanternmoss") { this.flags.bell = true; this.save(); g.say("Found the Ferry Bell · bring it to Fen Marrow", 2.5); continue; }
        this.flags.orbs = ((this.flags.orbs as number) || 0) + 1; this.save();
        const st = g.stats as Record<string, number>; st.talks = (st.talks ?? 0) + 1;
        g.say(`Pip's glow orb caught (${this.flags.orbs}/6)`, 2);
      }
    }
    if (!g.area.travel.some((s) => Math.hypot(s.x - g.p.x, s.y - g.p.y) < 18)) this.flags.stoneT = false;
    return false;
  }
  /** W20: migrate old saves (visited_<id> from progress), then unlock codex pages. "always" pages and a first run on an old save unlock quietly; later ones toast. */
  codexCheck() {
    const F = this.flags, g = this.g; let dirty = backfillVisited(F) > 0;
    const quiet = !F.codexInit; const fresh: string[] = [];
    for (const e of CODEX) { const k = `codex_${e.id}`; if (!F[k] && codexUnlocked(e, F)) { F[k] = true; dirty = true; if (!quiet && e.unlock !== "always") fresh.push(e.title); } }
    if (quiet) { F.codexInit = true; dirty = true; }
    this.codexQ.push(...fresh); // shown when nothing else is talking (never steps on a quest toast)
    if (this.codexQ.length && !this.box && g.toastT <= 0 && g.bannerT <= 0) { const q = this.codexQ; g.say(q.length > 1 ? `Codex: ${q[0]} +${q.length - 1} more` : `Codex: ${q[0]}`, 2.5); sfx("ui-confirm"); this.codexQ = []; }
    if (dirty) this.save();
  }
  /** W20: one ambient line over the nearest on-screen NPC (husk: speakerless, over the hero). Skipped during dialogue, toasts and banners. */
  bark(force = false) {
    const g = this.g, F = this.flags;
    if (!force && (this.box || g.mode !== "play" || g.toastT > 0 || g.bannerT > 0)) return false;
    const text = ambientBark(g.area.id, F, g.time, this.rnd); if (!text) return false;
    let npc = "", who = "";
    if (g.area.id !== "husk") {
      let best = 1e9;
      for (const n of g.area.npcs) { const d = Math.hypot(n.x - g.p.x, n.y - g.p.y); if (d < 150 && d < best && n.id !== "l") { best = d; npc = n.id; } }
      if (!npc) return false;
      who = NPCS[g.area.id]?.[npc]?.name ?? "";
    }
    bark.text = text; bark.who = who; bark.npc = npc; bark.t = 4.5;
    F.barksHeard = ((F.barksHeard as number) || 0) + 1; F.lastBark = text.slice(0, 80); this.save();
    return true;
  }
  /** After the sim stepped: talk if the melee press happened next to an NPC. */
  after() {
    const g = this.g;
    if (this.box || g.mode !== "play" || !this.near) return;
    if (!(this.input.pressed("melee") || this.input.pressed("confirm"))) return;
    const id = this.near, def = NPCS[g.area.id]?.[id];
    if (!def) return;
    g.swing.step = 0; g.swing.t = 0; g.swing.queued = false;
    const st = g.stats as Record<string, number>; st.talks = (st.talks ?? 0) + 1;
    let lines = def.lines(this.flags);
    if (id === "l" && this.flags.lettersDone && g.gear.c === "c2") { lines = LINNET_LOCKET; this.flags.locketGreet = ((this.flags.locketGreet as number) || 0) + 1; } // W20: she notices her Locket (text only)
    if (id === "m" && this.flags.lettersRead && this.rnd() < 0.2) { lines = [...lines, MIRELA_REREAD[Math.floor(this.rnd() * MIRELA_REREAD.length)]]; this.flags.rereadN = ((this.flags.rereadN as number) || 0) + 1; } // W20: rare re-read line, no EXP
    bark.t = 0;
    this.say(def.name, lines, () => {
      if (id === "a") this.flags.metAma = true;
      if (id === "o" && g.area.id === "lanternmoss" && this.flags.metAma && !this.flags.capQ) { this.flags.capQ = true; g.say("Quest: The Capmother's Ring", 2.5); }
      if (id === "m") this.flags.metMirela = true;
      if (id === "n") this.flags.metNeri = true;
      const F = this.flags;
      if (id === "f" && F.bell && !F.bellDone) { F.bellDone = true; g.gainExp(80); g.say("Ferry Bell returned · +80 EXP", 2.5); }
      if (id === "h") { if (!F.reedQ) F.reedQ = true; else if ((F.reedN as number) >= 8 && !F.reedDone) { F.reedDone = true; g.gainExp(100); g.pts += 2; g.say("Quiet the Meadow complete · +100 EXP, +2 pts", 2.5); } }
      if (id === "r" && g.area.id === "hushwater" && F.metMirela && !F.lettersQ) { F.lettersQ = true; F.lettersN = 1; g.say("Quest: Linnet's Letters (1/4)", 2.5); }
      if (id === "l" && F.linnetWoke && !F.lettersDone) { F.lettersDone = true; g.gainExp(250); g.say("Linnet's Letters complete · Linnet's Locket · +250 EXP", 3); burst(g, g.p.x, g.p.y - 10, 14, 80); sfx("ui-equip"); } // W18 fun pass: Locket sparkle + stinger
      if (id === "m" && (F.lettersN as number) >= 4 && !F.lettersRead) { F.lettersRead = true; g.gainExp(100); g.say("Mirela read Linnet's letters · +100 EXP", 2.5); sfx("ui-confirm"); }
      else if (id === "m" && F.bellDone && F.reedDone && !F.oath) { F.oath = true; g.gainExp(150); g.say("Lantern Oath · Mirela will join you · +150 EXP", 3); }
      if (id === "k" && !F.metBrann) { F.metBrann = true; F.brannQ = true; g.gainExp(60); g.say("Quest: Brann's Heart-Ember · +60 EXP", 2.5); }
      if (id === "n" && F.sigil && !F.sigilDone) { F.sigilDone = true; g.gainExp(200); g.pts += 2; g.say("Neri reads the sigil · +200 EXP, +2 pts", 3); }
      else if (id === "k" && F.heart && !F.brann) { F.brann = true; g.gainExp(150); g.pts += 2; g.say("Heart-Ember returned · Brann will join you · +150 EXP", 3); }
      if (id === "p" && (this.flags.orbs as number) >= 6 && !this.flags.orbsDone) { this.flags.orbsDone = true; g.gainExp(120); g.say("Lost Lanterns complete · +120 EXP", 2.5); }
      this.flags["talked_" + g.area.id + id] = true; this.save();
    });
  }
  objective(): string {
    const f = this.flags, g = this.g, o = this.objMain();
    // W17f Linnet's Letters: optional, shown after the main step (never replaces it)
    if (F0(f) || !f.lettersQ || f.lettersDone) return o;
    const n = (f.lettersN as number) || 1;
    const lq = !f.lettersRead ? (n >= 4 ? "Letters: bring all 4 to Mirela (Hushwater graveyard)" : g.area.id === "hushwater" ? `Letters ${n}/4: Sunken Meadow and the east boardwalk` : `Letters ${n}/4 in Hushwater`)
      : !f.oath ? "Letters: after the Lantern Oath, take them to the Lanternmoss spring"
      : f.linnetWoke ? "Letters: talk to Linnet at the hidden spring" : "Letters: take them to the hidden spring (Lanternmoss, far south-west)";
    return `${o} · ${lq}`;
  }
  objMain(): string {
    const f = this.flags, g = this.g;
    if (F0(f)) return "Dawn · free roam: days are gold, the glow nights still return";
    if (g.area.id === "husk") return f.malacharFade && !f.runeDown ? "Defeat Warden Rune, the last guardian" : f.malacharDown ? "Give the light back" : "Defeat Malachar Vesh at the sun's heart"; // MB hook (W17)
    if (g.area.id === "stair" && f.threshold) return "Ride the top-ring stone up into the husk sun";
    if (g.area.id === "stair") return f.morvantDown ? "Climb to the top ring" : f.sableJoin ? "Top ring: get past Morvant, the Eclipse Golem" : "Free Sable from the Red Cage (centre ring)";
    if (g.area.id === "drowned" && f.malachar) return "Malachar Vesh is named · the Undertide stone now points north to the Stair";
    if (g.area.id === "undertide" && f.malachar) return "Ride the Undertide stone (by the tide stair) north to the Sunwarden's Stair";
    if (g.area.id === "undertide" && f.tideBossDown && !f.twist) return "Return to Neri in Vesper: the Archive is open";
    if (g.area.id === "undertide") return f.tideBossDown ? "The drowned Wellspring breathes again · Sable is wavering" : "Reach the drowned Wellspring (east, over the south bridge)";
    if (g.area.id === "drowned") return f.sigilDone ? "Take the tide stair on Sigil Quay down to the drowned Wellspring" : f.sigil ? "Show the sun-sigil to Neri in Tidewarden Court" : f.metNeri ? "Find the sun-sigil on Sigil Quay (SE)" : "Find the tide-keeper in Tidewarden Court";
    if (g.area.id === "kilnreach" && f.quarryBossDown) return "The Quarry Heart is quiet · take the quarry lift to the drowned-sun slab";
    if (g.area.id === "kilnreach") return f.brann ? "Brann is with you · the Quarry Heart waits below" : f.heart ? "Bring the Heart-Ember to Brann" : f.metBrann ? "Take the quarry lift (Quarry Road east) · find the Heart-Ember" : "Find the quarry-smith in Forge Square";
    if (g.area.id === "emberquarry" && f.quarryBossDown) return "The Quarry Heart is quiet · the drowned-sun slab is awake";
    if (g.area.id === "emberquarry") return f.heart ? (f.brann ? "The Quarry Heart: something drinks the embers" : "Return the Heart-Ember to Brann") : "Find Brann's Heart-Ember in the seam";
    if (g.area.id === "hushwater") {
      if (!f.metMirela) return "Find the graveyard keeper on the hill";
      if (f.oath) return !g.mb.boss.done && !f.ashmawDown ? "Mirela is with you · clear the Wellspring Grotto in Lanternmoss" : "Mirela is with you · the east stone wakes for Kilnreach";
      const q: string[] = [];
      if (!f.bellDone) q.push(f.bell ? "Bring the bell to Fen" : "Find Fen's Ferry Bell");
      if (!f.reedDone) q.push(!f.reedQ ? "Talk to Tallis Reed" : `Quiet the Meadow ${(f.reedN as number) || 0}/8`);
      return q.length ? q.join(" · ") : "Tell Mirela the town is safe";
    }
    if (!f.metAma) return "Talk to Elder Ama in Wickhaven";
    // W17d: one clear next step per state (was "Pass the sealed ward" from Lv 4 while it was still shut, and after the oath)
    if (f.oath) return !g.mb.boss.done && !f.ashmawDown ? "Wellspring Grotto (east): something eats the spring's light · or ride to Hushwater's east stone" : "Ride the updraft to Hushwater · the east stone wakes for Kilnreach";
    if (f.metMirela) return "Ride the updraft back to Hushwater · help the marsh town";
    if (g.lvl < 8) return `Train in Glowcap Woods · Lv ${g.lvl}/8 opens the sealed ward`;
    return "Pass the sealed ward at the Old Watch · ride the updraft";
  }
}
