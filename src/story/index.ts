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
  box: Box | null = null;
  intro = -1; introT = 0;
  fly = 0; flyTo = ""; near: string | null = null; zone = ""; zoneT = 0;
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
      if (this.fly <= 0.9 && this.flyTo) { this.enter(this.flyTo); this.flyTo = ""; const st = g.stats as Record<string, number>; st.travels = (st.travels ?? 0) + 1; }
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
      this.say("Updraft stone", [`The rune slab hums. Ride the updraft to ${s.label}?`, "(Melee to fly. Step off to stay.)"], () => { this.fly = 1.8; this.flyTo = s.to; });
      return true;
    }
    for (const s of g.area.springs) if (Math.hypot(s.x - g.p.x, s.y - g.p.y) < 14) {
      if (!this.flags.spring) { this.flags.spring = true; g.pts += 3; this.save(); g.say("Hidden Wellspring found · +3 stat points", 3); }
      else if (g.hp < g.maxHp || g.ep < g.maxEp) g.say("The spring restores you", 1.2);
      g.hp = g.maxHp; g.ep = g.maxEp;
    }
    for (const o of g.area.orbs) {
      const k = `orb_${g.area.id}_${o.i}`;
      if (!this.flags[k] && Math.hypot(o.x - g.p.x, o.y + 6 - g.p.y) < 14) {
        this.flags[k] = true; this.flags.orbs = ((this.flags.orbs as number) || 0) + 1; this.save();
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
      if (id === "p" && (this.flags.orbs as number) >= 6 && !this.flags.orbsDone) { this.flags.orbsDone = true; g.exp += 120; g.say("Lost Lanterns complete · +120 EXP", 2.5); }
      this.flags["talked_" + g.area.id + id] = true; this.save();
    });
  }
  objective(): string {
    const f = this.flags, g = this.g;
    if (g.area.id === "hushwater") return f.metMirela ? "Explore Hushwater · Sunken Meadow to the south" : "Find the graveyard keeper on the hill";
    if (!f.metAma) return "Talk to Elder Ama in Wickhaven";
    if (g.lvl < 4) return "Train in Glowcap Woods · reach Lv 4 (sealed ward)";
    return "Pass the sealed ward at the Old Watch · ride the updraft";
  }
}
