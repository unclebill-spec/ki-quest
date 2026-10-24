/**
 * Story layer: intro, NPC talk, dialogue box, sealed wards, updraft-stone travel between areas, objective line.
 * Runs beside the sim: main.ts calls story.update() before game.step(); when it returns true the sim is paused.
 * State is its own save key (kiquest.story.v1) so it never collides with the game save (Cozy) or combat (Master Builder).
 */
import type { Game } from "../game";
import type { Input } from "../input";
import { buildArea, setWardOpen, zoneAt, TILE } from "../world";
import { INTRO, NPCS, Flags } from "./script";

const KEY = "kiquest.story.v1";
type Box = { who: string; lines: string[]; i: number; t: number; then?: () => void };

export class Story {
  flags: Flags = {};
  lastKills = 0;
  box: Box | null = null;
  intro = -1; introT = 0;
  fly = 0; flyTo = ""; flyFrom = ""; near: string | null = null; zone = ""; zoneT = 0;
  constructor(public g: Game, public input: Input) {
    try { this.flags = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { this.flags = {}; }
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.flags)); } catch { /* full */ } }
  get active() { return !!this.box || this.intro >= 0 || this.fly > 0; }

  /** Called after game.start(). New game: reset story, show intro. Continue: restore area. */
  begin(cont: boolean) {
    if (!cont) { this.flags = { introSeen: this.flags.introSeen ?? false }; this.save(); }
    const id = (this.flags.area as string) || "lanternmoss";
    if (id !== this.g.area.id) this.enter(id, !cont);
    if (!this.flags.introSeen) { this.intro = 0; this.introT = 0; }
  }
  enter(id: string, atStart = true) {
    const g = this.g, hp = g.hp, ep = g.ep, keep = { x: g.p.x, y: g.p.y };
    g.area = buildArea(id); g.reset(); g.hp = hp; g.ep = ep;
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
      if (s.to === "undertide" && !this.flags.sigilDone) { this.say("Tide stair", ["A stair of wet rune-stone, going down under the canals. The seal is a sun with a missing ray.", "Neri would know how to open it."]); return true; }
      if (s.to === "drowned" && !this.flags.quarryBossDown) { this.say("Rune slab", ["A slab in the arena wall, carved with a drowned sun. It's dark.", "Whatever is drinking the Quarry Heart is still here. Deal with it first."]); return true; }
      if (s.to === "emberquarry" && !this.flags.brannQ) { this.say("Quarry lift", ["A rune-lift down into the quarry. It's locked with a smith's seal.", "Brann in Forge Square would have the key."]); return true; }
      if (s.to === "kilnreach" && !this.flags.oath) { this.say("Updraft stone", ["This slab is cold and points east, toward a red glow on the mountains.", "It won't wake for a stranger. Maybe after Mirela trusts you."]); return true; }
      this.say("Updraft stone", [`The rune slab hums. Ride the updraft to ${s.label}?`, "(Melee to fly. Step off to stay.)"], () => { this.fly = 3.2; this.flyTo = s.to; this.flyFrom = g.area.id; });
      return true;
    }
    const F = this.flags, B = (k: string, who: string, lines: string[], exp = 0) => { F[k] = true; this.save(); if (exp) g.gainExp(exp); this.say(who, lines); return true; };
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
    for (const s of g.area.springs) if (Math.hypot(s.x - g.p.x, s.y - g.p.y) < 14) {
      if (!this.flags.spring) { this.flags.spring = true; g.pts += 3; this.save(); g.say("Hidden Wellspring found · +3 stat points", 3); }
      else if (g.hp < g.maxHp || g.ep < g.maxEp) g.say("The spring restores you", 1.2);
      g.hp = g.maxHp; g.ep = g.maxEp;
    }
    for (const o of g.area.orbs) {
      const k = `orb_${g.area.id}_${o.i}`;
      if (!this.flags[k] && Math.hypot(o.x - g.p.x, o.y + 6 - g.p.y) < 14) {
        this.flags[k] = true;
        if (g.area.id === "drowned") { this.flags.sigil = true; this.save(); g.say("Found a sun-sigil · show it to Neri", 2.5); continue; }
        if (g.area.id === "emberquarry") { this.flags.heart = true; this.save(); g.say("Found Brann's Heart-Ember · bring it to Brann", 2.5); continue; }
        if (g.area.id !== "lanternmoss") { this.flags.bell = true; this.save(); g.say("Found the Ferry Bell · bring it to Fen Marrow", 2.5); continue; }
        this.flags.orbs = ((this.flags.orbs as number) || 0) + 1; this.save();
        const st = g.stats as Record<string, number>; st.talks = (st.talks ?? 0) + 1;
        g.say(`Pip's glow orb caught (${this.flags.orbs}/6)`, 2);
      }
    }
    if (!g.area.travel.some((s) => Math.hypot(s.x - g.p.x, s.y - g.p.y) < 18)) this.flags.stoneT = false;
    return false;
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
    this.say(def.name, def.lines(this.flags), () => {
      if (id === "a") this.flags.metAma = true;
      if (id === "m") this.flags.metMirela = true;
      if (id === "n") this.flags.metNeri = true;
      const F = this.flags;
      if (id === "f" && F.bell && !F.bellDone) { F.bellDone = true; g.gainExp(80); g.say("Ferry Bell returned · +80 EXP", 2.5); }
      if (id === "h") { if (!F.reedQ) F.reedQ = true; else if ((F.reedN as number) >= 8 && !F.reedDone) { F.reedDone = true; g.gainExp(100); g.pts += 2; g.say("Quiet the Meadow complete · +100 EXP, +2 pts", 2.5); } }
      if (id === "m" && F.bellDone && F.reedDone && !F.oath) { F.oath = true; g.gainExp(150); g.say("Lantern Oath · Mirela will join you · +150 EXP", 3); }
      if (id === "k" && !F.metBrann) { F.metBrann = true; F.brannQ = true; g.gainExp(60); g.say("Quest: Brann's Heart-Ember · +60 EXP", 2.5); }
      if (id === "n" && F.sigil && !F.sigilDone) { F.sigilDone = true; g.gainExp(200); g.pts += 2; g.say("Neri reads the sigil · +200 EXP, +2 pts", 3); }
      else if (id === "k" && F.heart && !F.brann) { F.brann = true; g.gainExp(150); g.pts += 2; g.say("Heart-Ember returned · Brann will join you · +150 EXP", 3); }
      if (id === "p" && (this.flags.orbs as number) >= 6 && !this.flags.orbsDone) { this.flags.orbsDone = true; g.gainExp(120); g.say("Lost Lanterns complete · +120 EXP", 2.5); }
      this.flags["talked_" + g.area.id + id] = true; this.save();
    });
  }
  objective(): string {
    const f = this.flags, g = this.g;
    if (g.area.id === "undertide") return f.tideBossDown ? "The drowned Wellspring breathes again · Sable is wavering" : "Reach the drowned Wellspring (east, over the south bridge)";
    if (g.area.id === "drowned") return f.sigilDone ? "Take the tide stair on Sigil Quay down to the drowned Wellspring" : f.sigil ? "Show the sun-sigil to Neri in Tidewarden Court" : f.metNeri ? "Find the sun-sigil on Sigil Quay (SE)" : "Find the tide-keeper in Tidewarden Court";
    if (g.area.id === "kilnreach") return f.brann ? "Brann is with you · the Quarry Heart waits below" : f.heart ? "Bring the Heart-Ember to Brann" : f.metBrann ? "Take the quarry lift (Quarry Road east) · find the Heart-Ember" : "Find the quarry-smith in Forge Square";
    if (g.area.id === "emberquarry" && f.quarryBossDown) return "The Quarry Heart is quiet · the drowned-sun slab is awake";
    if (g.area.id === "emberquarry") return f.heart ? (f.brann ? "The Quarry Heart: something drinks the embers" : "Return the Heart-Ember to Brann") : "Find Brann's Heart-Ember in the seam";
    if (g.area.id === "hushwater") {
      if (!f.metMirela) return "Find the graveyard keeper on the hill";
      if (f.oath) return "Mirela is with you · Grotto in Lanternmoss · east stone wakes";
      const q: string[] = [];
      if (!f.bellDone) q.push(f.bell ? "Bring the bell to Fen" : "Find Fen's Ferry Bell");
      if (!f.reedDone) q.push(!f.reedQ ? "Talk to Tallis Reed" : `Quiet the Meadow ${(f.reedN as number) || 0}/8`);
      return q.length ? q.join(" · ") : "Tell Mirela the town is safe";
    }
    if (!f.metAma) return "Talk to Elder Ama in Wickhaven";
    if (g.lvl < 4) return "Train in Glowcap Woods · reach Lv 8 (sealed ward)";
    return "Pass the sealed ward at the Old Watch · ride the updraft";
  }
}
