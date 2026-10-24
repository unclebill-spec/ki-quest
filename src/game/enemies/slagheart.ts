/**
 * Kilnreach quarry boss: SLAGHEART, a basalt slag golem with a molten core (sheet public/art/chars/slag_golem.*).
 * 3 phases by HP, each phase change = shockwave ring + short shield. Every move telegraphs first (state "tele", e.move):
 *   P1  charge (aimed line) · rain (ember rain: rings fall around the hero)
 *   P2  + crack (molten ground crack: a line of rings racing from the golem toward the hero)
 *   P3  faster; crack3 (three cracks fanning out) · denser rain · summon (cinder-shade adds, max 4 alive)
 * Reward: Heartstone, +4 stat points, full HP/EP/power, saved as kiquest-mb-v1 {boss2:true}. Owner: Master Builder.
 *
 * ARENA2: the round chamber in Emberheart Quarry (QUARRY_ARENA in src/areas/maps.ts, radius in tiles). Walking into it starts
 * the fight; startSlagheart(g) also starts it anywhere (tests, dev console: __kiMB.startSlagheart(__ki.game)).
 */
import type { Game } from "../../game";
import { Enemy, makeEnemy } from "./types";
import { freeNear } from "./ai";
import { QUARRY_ARENA } from "../../areas/maps";
import { writeBossDone } from "../combat/state";
import { hurtAlly } from "../combat/companion";
import { CH_COMBAT, K_RING, K_SPARK, C_GOLD, C_RED } from "../../vendor/particles";

export const ARENA2 = { area: "emberquarry", tx: QUARRY_ARENA.tx, ty: QUARRY_ARENA.ty, r: QUARRY_ARENA.r * 16 };
const PHASE_AT = [1, 0.66, 0.33];
export const MOVES2 = [["charge", "rain"], ["charge", "rain", "crack"], ["charge", "crack3", "rain", "summon"]];
export const TELE2: Record<string, number> = { charge: 0.8, rain: 0.75, crack: 0.85, crack3: 0.8, summon: 1.0 };
export const slagLog = { shocks: 0, summons: 0, moves: {} as Record<string, number> };
let center = { x: 0, y: 0 };
export const arena2Center = () => center;
export const slagOf = (g: Game) => g.enemies.find((e) => e.kind === "slag" && !e.dead);

/** Start the fight with the arena centred on (x, y) (default: in front of the hero). */
export function startSlagheart(g: Game, x = g.p.x, y = g.p.y - 50) {
  const b = g.mb.boss2; center = { x, y: y + 40 };
  b.active = true; b.phase = 1; b.introT = 2.2; b.lockT = 1.4;
  const e = makeEnemy("slag", x, y); e.state = "recover"; e.t = 1.6; g.enemies.push(e);
  for (const f of g.enemies) if (f !== e && !f.dead && Math.hypot(f.x - center.x, f.y - center.y) < ARENA2.r + 20) { f.x = f.hx = center.x + (f.x < center.x ? -1 : 1) * (ARENA2.r + 60); f.hy = f.y; }
  g.banner = "SLAGHEART, KILN-EATER"; g.bannerT = 2.5; g.shake = 4;
  return e;
}

export function updateArena2(g: Game, dt: number) {
  const b = g.mb.boss2, p = g.p;
  b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt);
  if (g.area.id === ARENA2.area && !b.active && !b.done) {
    const c = freeNear(g.area, ARENA2.tx, ARENA2.ty);
    if (Math.hypot(p.x - c.x, p.y - c.y) < ARENA2.r - 30) startSlagheart(g, c.x, c.y - 40);
  }
  if (b.active) {
    const dx = p.x - center.x, dy = p.y - center.y, d = Math.hypot(dx, dy);
    if (d > ARENA2.r) { p.x = center.x + (dx / d) * ARENA2.r; p.y = center.y + (dy / d) * ARENA2.r; p.kx = -dx * 2; p.ky = -dy * 2; }
  }
}

function shockwave(g: Game, e: Enemy) {
  slagLog.shocks++;
  g.mb.hazards.push({ x: e.x, y: e.y, r: 58, t: 0.55, max: 0.55, dmg: 9, foe: true });
  for (let i = 0; i < 14; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 18, Math.cos(i * 0.45) * 150, Math.sin(i * 0.45) * 150, 0.55, C_RED, 0, 2);
  // shove everyone back a step
  for (const o of [g.p, ...g.mb.allies.filter((a) => a.joined && !a.ko)]) { const d = Math.hypot(o.x - e.x, o.y - e.y) || 1; if (d < 90) { o.kx = ((o.x - e.x) / d) * 220; o.ky = ((o.y - e.y) / d) * 220; } }
  g.shake = 6;
}

function telegraph(g: Game, e: Enemy, ux: number, uy: number) {
  const b = g.mb.boss2, p = g.p, T = e.t;
  if (e.move === "rain") {
    const n = b.phase === 3 ? 9 : b.phase === 2 ? 7 : 5;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = i === 0 ? 0 : 12 + Math.random() * 46; g.mb.hazards.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7, r: 15, t: T + i * 0.12, max: T + i * 0.12, dmg: 9, foe: true }); }
  }
  if (e.move === "crack" || e.move === "crack3") {
    const base = Math.atan2(uy, ux), dirs = e.move === "crack3" ? [base - 0.5, base, base + 0.5] : [base];
    for (const a of dirs) for (let k = 1; k <= 7; k++) g.mb.hazards.push({ x: e.x + Math.cos(a) * k * 18, y: e.y + Math.sin(a) * k * 18, r: 13, t: T + k * 0.07, max: T + k * 0.07, dmg: 12, foe: true });
  }
}

export function updateSlag(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const b = g.mb.boss2, p = g.p;
  const want = e.hp / e.max <= PHASE_AT[2] ? 3 : e.hp / e.max <= PHASE_AT[1] ? 2 : 1;
  if (want > b.phase) {
    b.phase = want; b.lockT = 1.2; e.state = "recover"; e.t = 1.3; e.move = "";
    g.banner = want === 3 ? "SLAGHEART BOILS OVER" : "SLAGHEART: PHASE 2"; g.bannerT = 1.8;
    shockwave(g, e);
    return [0, 0];
  }
  const spd = b.phase === 3 ? 1.3 : 1;
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    if (e.t <= 0) {
      const list = MOVES2[b.phase - 1];
      const minions = g.enemies.filter((f) => f.minion && !f.dead).length;
      do e.move = list[Math.floor(Math.random() * list.length)]; while (e.move === "summon" && minions >= 4);
      e.state = "tele"; e.t = TELE2[e.move] / spd; e.ax = ux; e.ay = uy; e.n = 0;
      slagLog.moves[e.move] = (slagLog.moves[e.move] ?? 0) + 1;
      telegraph(g, e, ux, uy);
      return [0, 0];
    }
    const k = dist > 64 ? 1 : dist < 40 ? -0.5 : 0;   // slow, heavy plod
    return [ux * 24 * k * spd, uy * 24 * k * spd];
  }
  if (e.state === "tele") {
    if (e.move === "charge") { e.ax += (ux - e.ax) * Math.min(1, dt * 3); e.ay += (uy - e.ay) * Math.min(1, dt * 3); }
    if (g.frame % 5 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x + (Math.random() - 0.5) * 30, e.y - 14, 0, -60, 0.35, C_GOLD);
    if (e.t <= 0) { e.state = "act"; e.t = e.move === "charge" ? 0.5 : 0.25; if (e.move === "summon") summon(g, e); if (e.move.startsWith("crack")) g.shake = 4; }
    return [0, 0];
  }
  if (e.state === "act") {
    if (e.move === "charge") {
      if (Math.hypot(p.x - e.x, p.y - e.y) < 22) g.hurtHero(b.phase === 3 ? 16 : 13, e.x, e.y);
      for (const a of g.mb.allies) if (a.joined && !a.ko && Math.hypot(a.x - e.x, a.y - e.y) < 22) hurtAlly(g, 10, e.x, e.y, a);
      if (g.frame % 2 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x, e.y - 8, -e.ax * 50, -e.ay * 50, 0.3, C_RED);
      if (e.t <= 0) { e.state = "recover"; e.t = 1.0 / spd; g.shake = 3; }
      return [e.ax * 240 * spd, e.ay * 240 * spd];
    }
    if (e.t <= 0) { e.state = "recover"; e.t = 0.9 / spd; }
    return [0, 0];
  }
  if (e.t <= 0) { e.state = "chase"; e.t = 0.7 / spd; }
  return [0, 0];
}

function summon(g: Game, e: Enemy) {
  slagLog.summons++;
  const room = Math.min(3, 4 - g.enemies.filter((f) => f.minion && !f.dead).length);
  for (let i = 0; i < room; i++) {
    const a = (i / 3) * 6.28 + g.time, x = e.x + Math.cos(a) * 34, y = e.y + Math.sin(a) * 24;
    const m = makeEnemy("brute", x, y); m.minion = true; m.hp = m.max = 16; m.state = "chase"; g.enemies.push(m);
    g.parts.emit(CH_COMBAT, K_RING, x, y - 8, 0, 0, 0.4, C_RED);
  }
  g.say("Cinder-shades crawl out of the slag!", 1.5);
}

/** Reward: EXP orbs (onFoeKill), Heartstone: +4 stat points, full HP/EP/power meter, adds crumble; saved. */
export function slagKilled(g: Game, e: Enemy) {
  const b = g.mb.boss2; b.active = false; b.done = true; writeBossDone("boss2");
  g.pts += 4; g.tf = 100; g.hp = g.maxHp; g.ep = g.maxEp; g.shake = 6;
  for (const m of g.enemies) if (m.minion) { m.dead = true; m.respawn = Infinity; }
  g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
  g.banner = "SLAGHEART CRUMBLES"; g.bannerT = 3;
  g.say("Heartstone obtained! +4 stat points, power meter full", 4);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  for (let i = 0; i < 14; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 22, Math.cos(i / 2.2) * 150, Math.sin(i / 2.2) * 150, 0.7, C_GOLD, 0, 2);
}

(globalThis as unknown as { __kiMB: unknown }).__kiMB = { startSlagheart, slagLog, ARENA2, MOVES2 };
