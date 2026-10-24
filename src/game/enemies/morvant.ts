/**
 * Stair top-ring boss: MORVANT, THE ECLIPSE GOLEM (sheet public/art/chars/morvant.*). Original design: a basalt golem with a
 * dead-sun eclipse disc in its chest, gold corona horns, neon violet rune seams.
 * Arena = STAIR_ARENA in src/areas/maps.ts (top ring, tile 32,5 r4). Wakes once the Red Cage is broken (cageDone) and the hero
 * steps onto the ring. 4 phases by HP (75/50/25%), each change = shockwave (gold/violet ring + knockback) + short shield.
 * Every move telegraphs first (state "tele", e.move); ground warnings carry `eclipse: true` (drawn violet/gold):
 *   P1  slam (fist quake: 3 rings at the hero) · beam (corona beam: a line of flares toward the hero)
 *   P2  + orbit (eclipse orbs: two spiralling arms of shots)
 *   P3  "TOTALITY": slam · beam2 (cross beams) · orbit · nova (expanding rings with one open gap) — arena darkens
 *   P4  "CORONA": beam2 · orbit · nova · eclipse (umbra floods the ring, one lit crescent stays safe), faster
 * Reward: Umbra Heart, +6 stat points, full HP/EP/power, saved kiquest-mb-v1 {boss5:true}, story flag morvantDown. Owner: Master Builder.
 */
import type { Game } from "../../game";
import { Enemy, Hazard, makeEnemy } from "./types";
import { freeNear, shoot } from "./ai";
import { STAIR_ARENA } from "../../areas/maps";
import { writeBossDone } from "../combat/state";
import { CH_COMBAT, K_RING, K_SPARK, C_GOLD, C_VIOLET, C_WHITE } from "../../vendor/particles";

export const ARENA5 = { area: "stair", tx: STAIR_ARENA.tx, ty: STAIR_ARENA.ty, r: STAIR_ARENA.r * 16 + 8 };
const PHASE_AT = [1, 0.75, 0.5, 0.25];
export const MOVES5 = [["slam", "beam"], ["slam", "beam", "orbit"], ["slam", "beam2", "orbit", "nova"], ["beam2", "orbit", "nova", "eclipse"]];
export const TELE5: Record<string, number> = { slam: 0.75, beam: 0.85, beam2: 0.8, orbit: 0.7, nova: 0.9, eclipse: 1.2 };
export const morvantLog = { shocks: 0, moves: {} as Record<string, number>, hazards: 0, shots: 0, sparkles: 0, maxPhase: 0, safeGaps: 0 };
let center = { x: 0, y: 0 };
export const arena5Center = () => center;
export const morvantOf = (g: Game) => g.enemies.find((e) => e.kind === "morvant" && !e.dead);
const flags = () => (window as unknown as { __ki?: { story?: { flags: Record<string, unknown>; save(): void } } }).__ki?.story;

function place(g: Game, h: Omit<Hazard, "foe" | "eclipse">) {
  // stay on the ring: drop warnings whose centre falls outside the arena
  if (Math.hypot(h.x - center.x, h.y - center.y) > ARENA5.r + 6) return;
  morvantLog.hazards++; g.mb.hazards.push({ ...h, foe: true, eclipse: true });
}

export function startMorvant(g: Game, x?: number, y?: number) {
  const b = g.mb.boss5; center = { x: ARENA5.tx * 16 + 8, y: ARENA5.ty * 16 + 8 };
  if (x == null || y == null) ({ x, y } = { x: center.x, y: center.y - 16 });
  b.active = true; b.phase = 1; b.introT = 2.2; b.lockT = 1.4; morvantLog.maxPhase = 1;
  const e = makeEnemy("morvant", x, y); e.state = "recover"; e.t = 1.6; g.enemies.push(e);
  for (const f of g.enemies) if (f !== e && !f.dead && Math.hypot(f.x - center.x, f.y - center.y) < ARENA5.r + 24) { f.dead = true; f.respawn = 30; }
  g.banner = "MORVANT, THE ECLIPSE GOLEM"; g.bannerT = 2.5; g.shake = 4;
  g.say("NONE ASCEND.", 2);
  return e;
}

export function updateArena5(g: Game, dt: number) {
  const b = g.mb.boss5, p = g.p;
  b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt);
  if (g.area.id === ARENA5.area && !b.active && !b.done && flags()?.flags.cageDone && !flags()?.flags.morvantDown) {
    const cx = ARENA5.tx * 16 + 8, cy = ARENA5.ty * 16 + 8;
    if (Math.hypot(p.x - cx, p.y - cy) < ARENA5.r - 16) { center = { x: cx, y: cy }; const at = freeNear(g.area, ARENA5.tx, ARENA5.ty - 1); startMorvant(g, at.x, at.y); }
  }
  if (!b.active) return;
  const dx = p.x - center.x, dy = p.y - center.y, d = Math.hypot(dx, dy);
  if (d > ARENA5.r) { p.x = center.x + (dx / d) * ARENA5.r; p.y = center.y + (dy / d) * ARENA5.r; p.kx = -dx * 2; p.ky = -dy * 2; }
  const e = morvantOf(g);
  if (e) {
    const ex = e.x - center.x, ey = e.y - center.y, ed = Math.hypot(ex, ey) || 1, max = ARENA5.r - 14;
    if (ed > max) { e.x = center.x + (ex / ed) * max; e.y = center.y + (ey / ed) * max; }
    // the top ring sits at the map's top edge (camera clamped): keep his crest on screen
    if (e.y < center.y - 18) e.y = center.y - 18;
    // ambient eclipse sparkle: gold corona motes + violet umbra dust
    if (g.frame % 4 === 0) { const a = Math.random() * 6.28, r = 10 + Math.random() * 10; morvantLog.sparkles++;
      g.parts.emit(CH_COMBAT, K_SPARK, e.x + Math.cos(a) * r, e.y - 22 + Math.sin(a) * r, Math.cos(a) * 20, -30 - Math.random() * 20, 0.6, (g.frame >> 2) & 1 ? C_GOLD : C_VIOLET); }
  }
}

function shockwave(g: Game, e: Enemy) {
  morvantLog.shocks++;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; place(g, { x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 20, r: 13, t: 0.45, max: 0.45, dmg: 8 }); }
  for (let i = 0; i < 18; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 22, Math.cos(i * 0.35) * 160, Math.sin(i * 0.35) * 160, 0.6, i % 3 ? C_GOLD : C_VIOLET, 0, 2);
  for (const o of [g.p, ...g.mb.allies.filter((a) => a.joined && !a.ko)]) { const d = Math.hypot(o.x - e.x, o.y - e.y) || 1; if (d < 80) { o.kx = ((o.x - e.x) / d) * 200; o.ky = ((o.y - e.y) / d) * 200; } }
  g.shake = 6;
}

function beam(g: Game, e: Enemy, ux: number, uy: number, T: number) {
  for (let k = 1; k <= 8; k++) place(g, { x: e.x + ux * k * 16, y: e.y - 6 + uy * k * 16, r: 10, t: T + k * 0.05, max: T + k * 0.05, dmg: 11 });
}

function telegraph(g: Game, e: Enemy, ux: number, uy: number) {
  const b = g.mb.boss5, p = g.p, T = e.t;
  if (e.move === "slam") for (let k = 0; k < 3; k++) place(g, { x: p.x + (Math.random() - 0.5) * 20 * k, y: p.y + (Math.random() - 0.5) * 14 * k, r: 16, t: T + k * 0.35, max: T + k * 0.35, dmg: 12 });
  if (e.move === "beam") beam(g, e, ux, uy, T);
  if (e.move === "beam2") { const a = Math.atan2(uy, ux); for (const o of [0, 1.5708, 3.1416, 4.7124]) beam(g, e, Math.cos(a + o), Math.sin(a + o), T + (o ? 0.25 : 0)); }
  if (e.move === "nova") {
    // three expanding rings around him, each with a 2-slot gap (the safe door) that rotates
    const gap0 = Math.floor(Math.random() * 16); morvantLog.safeGaps++;
    for (const [rr, dt] of [[26, 0], [42, 0.35], [58, 0.7]] as [number, number][]) for (let i = 0; i < 16; i++) {
      const gi = (gap0 + Math.round(dt * 4)) % 16; if (i === gi || i === (gi + 1) % 16) continue;
      const a = (i / 16) * 6.28; place(g, { x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr * 0.75, r: 10, t: T + dt, max: T + dt, dmg: 10 + b.phase }); }
  }
  if (e.move === "eclipse") {
    // umbra floods the ring; a lit crescent opposite the golem stays safe
    const sa = Math.atan2(center.y - e.y, center.x - e.x) + (Math.random() - 0.5), sx = center.x + Math.cos(sa) * (ARENA5.r - 22), sy = center.y + Math.sin(sa) * (ARENA5.r - 22);
    morvantLog.safeGaps++;
    for (let gy = -ARENA5.r; gy <= ARENA5.r; gy += 20) for (let gx = -ARENA5.r; gx <= ARENA5.r; gx += 20) {
      const x = center.x + gx, y = center.y + gy; if (Math.hypot(gx, gy) > ARENA5.r || Math.hypot(x - sx, y - sy) < 30) continue;
      place(g, { x, y, r: 12, t: T, max: T, dmg: 14 }); }
    g.mb.hazards.push({ x: sx, y: sy, r: 24, t: T, max: T, dmg: 0, foe: false, eclipse: true, safe: true });
  }
}

export function updateMorvant(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const b = g.mb.boss5;
  const r = e.hp / e.max, want = r <= PHASE_AT[3] ? 4 : r <= PHASE_AT[2] ? 3 : r <= PHASE_AT[1] ? 2 : 1;
  if (want > b.phase) {
    b.phase = want; b.lockT = 1.2; e.state = "recover"; e.t = 1.3; e.move = ""; morvantLog.maxPhase = want;
    g.banner = ["", "", "THE CORONA STIRS", "TOTALITY", "CORONA UNBOUND"][want]; g.bannerT = 1.8;
    shockwave(g, e);
    return [0, 0];
  }
  const spd = b.phase >= 4 ? 1.3 : b.phase >= 3 ? 1.15 : 1;
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    if (e.t <= 0) {
      const list = MOVES5[b.phase - 1];
      e.move = list[Math.floor(Math.random() * list.length)];
      e.state = "tele"; e.t = TELE5[e.move] / spd; e.ax = ux; e.ay = uy; e.n = 0;
      morvantLog.moves[e.move] = (morvantLog.moves[e.move] ?? 0) + 1;
      telegraph(g, e, ux, uy);
      return [0, 0];
    }
    const k = dist > 50 ? 1 : dist < 30 ? -0.5 : 0;
    return [ux * 30 * k * spd, uy * 30 * k * spd];
  }
  if (e.state === "tele") {
    if (g.frame % 3 === 0) { morvantLog.sparkles++; g.parts.emit(CH_COMBAT, K_SPARK, e.x + (Math.random() - 0.5) * 30, e.y - 24 + (Math.random() - 0.5) * 20, 0, -60, 0.4, g.frame & 1 ? C_GOLD : C_VIOLET); }
    if (e.t <= 0) {
      e.state = "act"; e.t = e.move === "orbit" ? 1.0 : 0.3;
      if (e.move === "slam" || e.move === "eclipse" || e.move === "nova") g.shake = 4;
      if (e.move.startsWith("beam")) for (let i = 0; i < 8; i++) g.parts.emit(CH_COMBAT, K_SPARK, e.x + e.ax * i * 14, e.y - 6 + e.ay * i * 14, 0, -20, 0.35, C_GOLD);
    }
    return [0, 0];
  }
  if (e.state === "act") {
    if (e.move === "orbit" && g.frame % 6 === 0) {
      const arms = b.phase >= 4 ? 3 : 2;
      for (let k = 0; k < arms; k++) { shoot(g, e.x, e.y - 18, e.n * 0.42 + (k / arms) * 6.28, 70, 7, 1.6); morvantLog.shots++; }
      e.n++;
    }
    if (e.t <= 0) { e.state = "recover"; e.t = 0.9 / spd; }
    return [0, 0];
  }
  if (e.t <= 0) { e.state = "chase"; e.t = 0.7 / spd; }
  return [0, 0];
}

/** Reward: Umbra Heart, +6 stat points, full HP/EP/power; saved boss5; story flag morvantDown (threshold beat). */
export function morvantKilled(g: Game, e: Enemy) {
  const b = g.mb.boss5; b.active = false; b.done = true; writeBossDone("boss5");
  const st = flags(); if (st) { st.flags.morvantDown = true; st.save(); }
  g.pts += 6; g.tf = 100; g.hp = g.maxHp; g.ep = g.maxEp; g.shake = 7;
  g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
  g.banner = "THE ECLIPSE BREAKS"; g.bannerT = 3;
  g.say("Umbra Heart obtained! +6 stat points, power meter full", 4);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  for (let i = 0; i < 24; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 24, Math.cos(i / 3.8) * 170, Math.sin(i / 3.8) * 170, 0.8, i % 3 === 0 ? C_WHITE : i & 1 ? C_GOLD : C_VIOLET, 0, 2);
}

const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), startMorvant, morvantLog, ARENA5, MOVES5, morvantOf };
