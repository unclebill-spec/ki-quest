/**
 * Area 1 boss: Warden Rune. Arena trigger east of the ridge; 3 phases by HP.
 * P1 dash + fan volley · P2 adds ground slams + bullet ring · P3 (enraged) triple dash + spiral + slam cluster.
 * Every move has a telegraph (state "tele", e.move names it). Owner: Master Builder.
 */
import type { Game } from "../../game";
import { Enemy, makeEnemy } from "./types";
import { freeNear, shoot } from "./ai";
import { writeBossDone } from "../combat/state";
import { CH_COMBAT, K_RING, K_SPARK, C_GOLD, C_RED, C_VIOLET } from "../../vendor/particles";

export const ARENA = { area: "lanternmoss", tx: 38, ty: 17, r: 104 };
export function arenaCenter(g: Game) { return freeNear(g.area, ARENA.tx, ARENA.ty); }
const PHASE_AT = [1, 0.66, 0.33];
const MOVES = [["dash", "fan"], ["dash", "slam", "ring", "fan"], ["dash3", "spiral", "slam3", "ring"]];
const TELE: Record<string, number> = { dash: 0.7, dash3: 0.55, fan: 0.55, slam: 0.9, slam3: 0.8, ring: 0.8, spiral: 0.7 };

/** Arena trigger + lock. Called each play frame. */
export function updateArena(g: Game, dt: number) {
  if (g.area.id !== ARENA.area) return;
  const b = g.mb.boss, p = g.p, c = arenaCenter(g);
  b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt);
  if (!b.active && !b.done && Math.hypot(p.x - c.x, p.y - c.y) < ARENA.r - 30) {
    b.active = true; b.phase = 1; b.introT = 2.2; b.lockT = 1.4;
    const e = makeEnemy("boss", c.x, c.y - 40); e.state = "recover"; e.t = 1.6; g.enemies.push(e);
    // clear small fry inside the arena so it's a duel
    for (const f of g.enemies) if (f !== e && !f.dead && Math.hypot(f.x - c.x, f.y - c.y) < ARENA.r + 20) { f.x = f.hx = c.x + (f.x < c.x ? -1 : 1) * (ARENA.r + 60); f.hy = f.y; }
    g.banner = "WARDEN RUNE, GROTTO GUARDIAN"; g.bannerT = 2.5; g.shake = 4;
  }
  if (b.active) {
    // barrier: keep the hero inside the arena
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
    if (d > ARENA.r) { p.x = c.x + (dx / d) * ARENA.r; p.y = c.y + (dy / d) * ARENA.r; p.kx = -dx * 2; p.ky = -dy * 2; }
  }
}

export function bossOf(g: Game) { return g.enemies.find((e) => e.kind === "boss" && !e.dead); }

export function updateBoss(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const b = g.mb.boss, p = g.p;
  const want = e.hp / e.max <= PHASE_AT[2] ? 3 : e.hp / e.max <= PHASE_AT[1] ? 2 : 1;
  if (want > b.phase) {
    b.phase = want; b.lockT = 1.2; e.state = "recover"; e.t = 1.3; e.move = "";
    g.banner = want === 3 ? "WARDEN RUNE IS ENRAGED" : "WARDEN RUNE: PHASE 2"; g.bannerT = 1.8; g.shake = 5;
    g.mb.hazards.push({ x: e.x, y: e.y, r: 46, t: 0.6, max: 0.6, dmg: 8, foe: true });
    for (let i = 0; i < 10; i++) g.parts.emit(CH_COMBAT, K_SPARK, e.x, e.y - 20, Math.cos(i * 0.63) * 120, Math.sin(i * 0.63) * 120, 0.5, C_RED, 0, 2);
    return [0, 0];
  }
  const spd = b.phase === 3 ? 1.35 : 1;
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    if (e.t <= 0) {
      const list = MOVES[b.phase - 1]; e.move = list[Math.floor(Math.random() * list.length)];
      e.state = "tele"; e.t = TELE[e.move] / spd; e.ax = ux; e.ay = uy; e.n = 0;
      if (e.move === "slam") g.mb.hazards.push({ x: p.x, y: p.y, r: 30, t: e.t + 0.15, max: e.t + 0.15, dmg: 14, foe: true });
      if (e.move === "slam3") for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28 + g.time; g.mb.hazards.push({ x: p.x + Math.cos(a) * 22 * (i ? 1 : 0), y: p.y + Math.sin(a) * 14 * (i ? 1 : 0), r: 26, t: e.t + 0.15 + i * 0.25, max: e.t + 0.15 + i * 0.25, dmg: 12, foe: true }); }
      return [0, 0];
    }
    const k = dist > 70 ? 1 : dist < 45 ? -0.6 : 0;
    return [ux * 30 * k * spd - uy * 14, uy * 30 * k * spd + ux * 14];
  }
  if (e.state === "tele") {
    if (e.move.startsWith("dash")) { e.ax += (ux - e.ax) * Math.min(1, dt * 4); e.ay += (uy - e.ay) * Math.min(1, dt * 4); }
    if (g.frame % 6 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x + (Math.random() - 0.5) * 30, e.y - 10, 0, -50, 0.3, b.phase === 3 ? C_RED : C_VIOLET);
    if (e.t <= 0) { e.state = "act"; e.t = e.move.startsWith("dash") ? 0.45 : e.move === "spiral" ? 1.6 : 0.1; }
    return [0, 0];
  }
  if (e.state === "act") {
    const sx = e.x, sy = e.y - 22;
    switch (e.move) {
      case "dash": case "dash3":
        if (Math.hypot(p.x - e.x, p.y - e.y) < 22) g.hurtHero(b.phase === 3 ? 14 : 11, e.x, e.y);
        if (g.frame % 2 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x, e.y - 10, -e.ax * 40, -e.ay * 40, 0.25, C_GOLD);
        if (e.t <= 0 && e.move === "dash3" && ++e.n < 3) { e.state = "tele"; e.t = 0.32; e.ax = ux; e.ay = uy; return [0, 0]; }
        if (e.t <= 0) { e.state = "recover"; e.t = 0.9 / spd; }
        return [e.ax * 270 * spd, e.ay * 270 * spd];
      case "fan": { const a = Math.atan2(uy, ux); for (let i = -2; i <= 2; i++) shoot(g, sx, sy, a + i * 0.2, 120, 8); e.state = "recover"; e.t = 0.8; break; }
      case "ring": for (let i = 0; i < 12; i++) shoot(g, sx, sy, (i / 12) * 6.28 + g.time, 90, 8); e.state = "recover"; e.t = 0.9; break;
      case "spiral":
        if (g.frame % 5 === 0) { const a = g.time * 5; shoot(g, sx, sy, a, 100, 7); shoot(g, sx, sy, a + Math.PI, 100, 7); }
        if (e.t <= 0) { e.state = "recover"; e.t = 1; }
        break;
      default: g.shake = 3; e.state = "recover"; e.t = 0.8;
    }
    return [0, 0];
  }
  if (e.t <= 0) { e.state = "chase"; e.t = 0.6 / spd; }
  return [0, 0];
}

/** Reward: EXP orbs (dropped by onFoeKill), Ember Core: +3 stat points, full power meter; arena unlocks. */
export function bossKilled(g: Game, e: Enemy) {
  const b = g.mb.boss; b.active = false; b.done = true; writeBossDone();
  g.pts += 3; g.tf = 100; g.hp = g.maxHp; g.ep = g.maxEp; g.shake = 6;
  g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
  g.banner = "WARDEN RUNE FALLS"; g.bannerT = 3;
  g.say("Ember Core obtained! +3 stat points, power meter full", 4);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  for (let i = 0; i < 12; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 20, Math.cos(i / 1.9) * 140, Math.sin(i / 1.9) * 140, 0.7, C_GOLD, 0, 2);
}
