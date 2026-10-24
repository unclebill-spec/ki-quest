/**
 * Undertide boss: COUNT AUREL, drowned tide general of Vesper (sheet public/art/chars/count_aurel.*).
 * Arena = UNDERTIDE_ARENA in src/areas/maps.ts (ring of floor around the drowned Wellspring). He and every hazard he places
 * keep off the central spring (SPRING_R keep-out): his steering slides around it and place() drops any warning ring on it.
 * 4 phases by HP (75/50/25%), each change = shockwave (knockback + ring of tide splashes) + short shield. Moves telegraph first
 * (state "tele", e.move), all ground warnings are drawn cyan so companions/players read them:
 *   P1  lunge (rapier lunge chain x3, re-aims between thrusts) · sweep (tide-wave: rows of splashes rolling at the hero)
 *   P2  + whirl (whirlpool zones that pull and tick)
 *   P3  lunge4 · sweep2 (double wave) · whirl · summon (drowned soldiers, max 4 alive)
 *   P4  lunge4 · whirl · summon · ring (rising-water ring: concentric water rings close in, safe band beside the spring)
 * Reward: Tide Crown, +5 stat points, full HP/EP/power, saved kiquest-mb-v1 {boss3:true}, story flag tideBossDown. Owner: Master Builder.
 */
import type { Game } from "../../game";
import { Enemy, Hazard, makeEnemy } from "./types";
import { freeNear } from "./ai";
import { UNDERTIDE_ARENA } from "../../areas/maps";
import { writeBossDone } from "../combat/state";
import { hurtAlly } from "../combat/companion";
import { CH_COMBAT, K_RING, K_SPARK, C_WHITE, C_CYAN, C_VIOLET } from "../../vendor/particles";

export const ARENA3 = { area: "undertide", tx: UNDERTIDE_ARENA.tx, ty: UNDERTIDE_ARENA.ty, r: UNDERTIDE_ARENA.r * 16 };
export const SPRING_R = 26;
const PHASE_AT = [1, 0.75, 0.5, 0.25];
export const MOVES3 = [["lunge", "sweep"], ["lunge", "sweep", "whirl"], ["lunge4", "sweep2", "whirl", "summon"], ["lunge4", "whirl", "summon", "ring"]];
export const TELE3: Record<string, number> = { lunge: 0.7, lunge4: 0.6, sweep: 0.8, sweep2: 0.75, whirl: 0.8, summon: 1.0, ring: 1.1 };
export const aurelLog = { shocks: 0, summons: 0, moves: {} as Record<string, number>, hazards: 0, dropped: 0, minHazD: 1e9, minBossD: 1e9 };
let center = { x: 0, y: 0 };
let whirls: { x: number; y: number; t: number }[] = [];
export const arena3Center = () => center;
export const aurelOf = (g: Game) => g.enemies.find((e) => e.kind === "aurel" && !e.dead);
/** The drowned Wellspring (area spring nearest the arena centre, else the arena tile). */
export function springOf(g: Game) {
  const c = { x: ARENA3.tx * 16 + 8, y: ARENA3.ty * 16 + 8 };
  const s = (g.area.springs ?? []).slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
  return s && Math.hypot(s.x - c.x, s.y - c.y) < 48 ? { x: s.x, y: s.y } : c;
}
/** Push a warning ring unless it would touch the spring. */
function place(g: Game, h: Omit<Hazard, "foe" | "tide">) {
  const s = springOf(g), d = Math.hypot(h.x - s.x, h.y - s.y) - h.r;
  if (d < SPRING_R) { aurelLog.dropped++; return; }
  aurelLog.hazards++; aurelLog.minHazD = Math.min(aurelLog.minHazD, d);
  g.mb.hazards.push({ ...h, foe: true, tide: true });
}

export function startAurel(g: Game, x?: number, y?: number) {
  const b = g.mb.boss3, s = springOf(g); center = { x: s.x, y: s.y };
  if (x == null || y == null) ({ x, y } = { x: s.x, y: s.y - 60 });
  b.active = true; b.phase = 1; b.introT = 2.2; b.lockT = 1.4; whirls = [];
  const e = makeEnemy("aurel", x, y); e.state = "recover"; e.t = 1.6; g.enemies.push(e);
  for (const f of g.enemies) if (f !== e && !f.dead && Math.hypot(f.x - center.x, f.y - center.y) < ARENA3.r + 20) { f.dead = true; f.respawn = 30; }
  g.banner = "COUNT AUREL, TIDE GENERAL"; g.bannerT = 2.5; g.shake = 4;
  return e;
}

export function updateArena3(g: Game, dt: number) {
  const b = g.mb.boss3, p = g.p;
  b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt);
  if (g.area.id === ARENA3.area && !b.active && !b.done) {
    const s = springOf(g);
    if (Math.hypot(p.x - s.x, p.y - s.y) < ARENA3.r - 16) { const at = freeNear(g.area, ARENA3.tx, ARENA3.ty - 4); startAurel(g, at.x, at.y); }
  }
  if (!b.active) return;
  const dx = p.x - center.x, dy = p.y - center.y, d = Math.hypot(dx, dy);
  if (d > ARENA3.r) { p.x = center.x + (dx / d) * ARENA3.r; p.y = center.y + (dy / d) * ARENA3.r; p.kx = -dx * 2; p.ky = -dy * 2; }
  // whirlpools pull the hero in
  whirls = whirls.filter((w) => (w.t -= dt) > 0);
  for (const w of whirls) { const wx = w.x - p.x, wy = w.y - p.y, wd = Math.hypot(wx, wy); if (wd < 34 && wd > 2) { p.x += (wx / wd) * 26 * dt; p.y += (wy / wd) * 26 * dt; } }
  // never on the spring
  const e = aurelOf(g);
  if (e) { const s = springOf(g), ex = e.x - s.x, ey = e.y - s.y, ed = Math.hypot(ex, ey) || 1, min = SPRING_R + 12;
    if (ed < min) { e.x = s.x + (ex / ed) * min; e.y = s.y + (ey / ed) * min; }
    aurelLog.minBossD = Math.min(aurelLog.minBossD, Math.hypot(e.x - s.x, e.y - s.y)); }
}

function shockwave(g: Game, e: Enemy) {
  aurelLog.shocks++;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; place(g, { x: e.x + Math.cos(a) * 34, y: e.y + Math.sin(a) * 22, r: 14, t: 0.45, max: 0.45, dmg: 8 }); }
  for (let i = 0; i < 14; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 18, Math.cos(i * 0.45) * 150, Math.sin(i * 0.45) * 150, 0.55, C_CYAN, 0, 2);
  for (const o of [g.p, ...g.mb.allies.filter((a) => a.joined && !a.ko)]) { const d = Math.hypot(o.x - e.x, o.y - e.y) || 1; if (d < 90) { o.kx = ((o.x - e.x) / d) * 220; o.ky = ((o.y - e.y) / d) * 220; } }
  g.shake = 6;
}

function wave(g: Game, e: Enemy, ux: number, uy: number, T: number) {
  const nx = -uy, ny = ux;
  for (let k = 1; k <= 6; k++) for (let j = -2; j <= 2; j++) place(g, { x: e.x + ux * k * 20 + nx * j * 18, y: e.y + uy * k * 20 + ny * j * 18, r: 12, t: T + k * 0.12, max: T + k * 0.12, dmg: 10 });
}

function telegraph(g: Game, e: Enemy, ux: number, uy: number) {
  const b = g.mb.boss3, p = g.p, T = e.t;
  if (e.move === "sweep") wave(g, e, ux, uy, T);
  if (e.move === "sweep2") { wave(g, e, ux, uy, T); const a = Math.atan2(uy, ux) + 0.6; wave(g, e, Math.cos(a), Math.sin(a), T + 0.5); }
  if (e.move === "whirl") {
    const n = b.phase >= 4 ? 4 : 3;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = i === 0 ? 0 : 30 + Math.random() * 30, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.7;
      const s = springOf(g); if (Math.hypot(x - s.x, y - s.y) < SPRING_R + 20) continue;
      whirls.push({ x, y, t: T + 1.8 }); for (let k = 0; k < 3; k++) place(g, { x, y, r: 18, t: T + k * 0.6, max: T + k * 0.6, dmg: 6 }); }
  }
  if (e.move === "ring") {
    // rising water closes in from the arena edge; the band beside the spring (r ~ 30-48) stays dry
    for (const [rr, dt] of [[86, 0], [68, 0.45], [52, 0.9]] as [number, number][]) for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.28; place(g, { x: center.x + Math.cos(a) * rr, y: center.y + Math.sin(a) * rr * 0.8, r: 13, t: T + dt, max: T + dt, dmg: 11 }); }
  }
}

/** Slide velocity around the spring instead of onto it. */
function steer(g: Game, e: Enemy, vx: number, vy: number): [number, number] {
  const s = springOf(g), dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
  if (d < SPRING_R + 22) { const into = vx * nx + vy * ny; if (into < 0) { vx -= into * nx; vy -= into * ny; } }
  return [vx, vy];
}

export function updateAurel(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const b = g.mb.boss3, p = g.p;
  const r = e.hp / e.max, want = r <= PHASE_AT[3] ? 4 : r <= PHASE_AT[2] ? 3 : r <= PHASE_AT[1] ? 2 : 1;
  if (want > b.phase) {
    b.phase = want; b.lockT = 1.2; e.state = "recover"; e.t = 1.3; e.move = "";
    g.banner = ["", "", "AUREL DRAWS THE TIDE", "THE DROWNED MUSTER", "THE SEA RISES"][want]; g.bannerT = 1.8;
    shockwave(g, e);
    return [0, 0];
  }
  const spd = b.phase >= 3 ? 1.2 : 1;
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    if (e.t <= 0) {
      const list = MOVES3[b.phase - 1], minions = g.enemies.filter((f) => f.minion && !f.dead).length;
      do e.move = list[Math.floor(Math.random() * list.length)]; while (e.move === "summon" && minions >= 4);
      e.state = "tele"; e.t = TELE3[e.move] / spd; e.ax = ux; e.ay = uy; e.n = 0;
      aurelLog.moves[e.move] = (aurelLog.moves[e.move] ?? 0) + 1;
      telegraph(g, e, ux, uy);
      return [0, 0];
    }
    const k = dist > 60 ? 1 : dist < 36 ? -0.6 : 0;
    return steer(g, e, ux * 40 * k * spd, uy * 40 * k * spd);
  }
  if (e.state === "tele") {
    if (e.move.startsWith("lunge")) { e.ax += (ux - e.ax) * Math.min(1, dt * 3); e.ay += (uy - e.ay) * Math.min(1, dt * 3); }
    if (g.frame % 5 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x + (Math.random() - 0.5) * 24, e.y - 20, 0, -50, 0.35, C_CYAN);
    if (e.t <= 0) { e.state = "act"; e.t = e.move.startsWith("lunge") ? 0.2 : 0.25; if (e.move === "summon") summon(g, e); if (e.move === "ring" || e.move.startsWith("sweep")) g.shake = 3; }
    return [0, 0];
  }
  if (e.state === "act") {
    if (e.move.startsWith("lunge")) {
      const N = e.move === "lunge4" ? 4 : 3;
      if (Math.hypot(p.x - e.x, p.y - e.y) < 20) g.hurtHero(b.phase >= 3 ? 12 : 10, e.x, e.y);
      for (const a of g.mb.allies) if (a.joined && !a.ko && Math.hypot(a.x - e.x, a.y - e.y) < 20) hurtAlly(g, 8, e.x, e.y, a);
      if (g.frame % 2 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x, e.y - 12, -e.ax * 50, -e.ay * 50, 0.3, C_CYAN);
      if (e.t <= 0) {
        e.n++;
        if (e.n < N) { e.t = 0.2; const d = Math.hypot(p.x - e.x, p.y - e.y) || 1; e.ax = (p.x - e.x) / d; e.ay = (p.y - e.y) / d; return [0, 0]; }
        e.state = "recover"; e.t = 0.9 / spd; return [0, 0];
      }
      return steer(g, e, e.ax * 250 * spd, e.ay * 250 * spd);
    }
    if (e.t <= 0) { e.state = "recover"; e.t = 0.9 / spd; }
    return [0, 0];
  }
  if (e.t <= 0) { e.state = "chase"; e.t = 0.7 / spd; }
  return [0, 0];
}

function summon(g: Game, e: Enemy) {
  aurelLog.summons++;
  const room = Math.min(3, 4 - g.enemies.filter((f) => f.minion && !f.dead).length), s = springOf(g);
  for (let i = 0; i < room; i++) {
    let a = (i / 3) * 6.28 + g.time, x = e.x + Math.cos(a) * 34, y = e.y + Math.sin(a) * 24;
    if (Math.hypot(x - s.x, y - s.y) < SPRING_R + 10) { a += 3.14; x = e.x + Math.cos(a) * 34; y = e.y + Math.sin(a) * 24; }
    const m = makeEnemy("brute", x, y); m.minion = true; m.hp = m.max = 20; m.state = "chase"; g.enemies.push(m);
    g.parts.emit(CH_COMBAT, K_RING, x, y - 8, 0, 0, 0.4, C_VIOLET);
  }
  g.say("Drowned soldiers rise from the tide!", 1.5);
}

/** Reward: Tide Crown, +5 stat points, full HP/EP/power; saved boss3; story flag tideBossDown (Sable's scene). */
export function aurelKilled(g: Game, e: Enemy) {
  const b = g.mb.boss3; b.active = false; b.done = true; writeBossDone("boss3"); whirls = [];
  const st = (window as unknown as { __ki?: { story?: { flags: Record<string, unknown>; save(): void } } }).__ki?.story; if (st) { st.flags.tideBossDown = true; st.save(); }
  g.pts += 5; g.tf = 100; g.hp = g.maxHp; g.ep = g.maxEp; g.shake = 6;
  for (const m of g.enemies) if (m.minion) { m.dead = true; m.respawn = Infinity; }
  g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
  g.banner = "COUNT AUREL SINKS"; g.bannerT = 3;
  g.say("Tide Crown obtained! +5 stat points, power meter full", 4);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  for (let i = 0; i < 14; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 22, Math.cos(i / 2.2) * 150, Math.sin(i / 2.2) * 150, 0.7, C_WHITE, 0, 2);
}

const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), startAurel, aurelLog, ARENA3, MOVES3, springOf, SPRING_R };
