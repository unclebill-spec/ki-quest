/**
 * Finale boss: MALACHAR VESH, THE LAST DUSK (sheet public/art/chars/malachar.*). Original design: the fallen Sunwarden in
 * black-and-crimson plate, a crown of red spikes, a dusk cape, and the four Wellsprings he drank set in his breastplate
 * (red, violet, cyan, green). Arena = HUSK_ARENA in src/areas/maps.ts (the sun's heart, tile 24,15 r8). Wakes once the
 * hero has entered the husk (story huskIn) and steps onto the ring. 5 phases by HP (80/60/40/20%); each change = banner,
 * prismatic shockwave + knockback, ~1.2 s invulnerability. Every move telegraphs first (state "tele", e.move); ground
 * warnings carry `dusk: 0..3` (drawn in that spring's neon colour) and companions dodge them.
 *   P1  "THE LAST DUSK"     slash (crimson crescent toward the hero) · cast (fan of red bolts)
 *   P2  "THE STOLEN SPRINGS" + prism (four coloured beams, one per spring)
 *   P3  "CROWN OF THORNS"   cast · prism · rain (red spikes fall on and around the hero) · spiral (4-colour shot arms)
 *   P4  "NIGHTFALL"         prism · rain · nova (rings with a gap) · dusk (night floods the ring, one warm light stays safe)
 *   P5  "THE LAST LIGHT"    everything faster, prism x8, spiral x6 arms, heavy sparkle storm
 * Defeat: story flag malacharDown (saved) -> src/story/index.ts plays the Wellsprings ending, dawn and credits.
 * Also saves kiquest-mb-v1 {boss6:true}; reward = Sunheart (+8 stat points, full HP/EP/power). Owner: Master Builder.
 */
import type { Game } from "../../game";
import { Enemy, Hazard, makeEnemy } from "./types";
import { freeNear, shoot } from "./ai";
import { HUSK_ARENA } from "../../areas/maps";
import { writeBossDone } from "../combat/state";
import { CH_COMBAT, K_RING, K_SPARK, C_RED, C_VIOLET, C_CYAN, C_GREEN, C_WHITE, C_GOLD } from "../../vendor/particles";

export const ARENA6 = { area: "husk", tx: HUSK_ARENA.tx, ty: HUSK_ARENA.ty, r: HUSK_ARENA.r * 16 };
const PHASE_AT = [1, 0.8, 0.6, 0.4, 0.2];
export const MOVES6 = [["slash", "cast"], ["slash", "cast", "prism"], ["cast", "prism", "rain", "spiral"], ["prism", "rain", "nova", "dusk"], ["prism", "rain", "nova", "dusk", "spiral"]];
export const TELE6: Record<string, number> = { slash: 0.6, cast: 0.55, prism: 0.85, rain: 0.9, spiral: 0.7, nova: 0.9, dusk: 1.2 };
export const BANNERS6 = ["", "MALACHAR VESH, THE LAST DUSK", "THE STOLEN SPRINGS", "CROWN OF THORNS", "NIGHTFALL", "THE LAST LIGHT"];
const COLS = [C_RED, C_VIOLET, C_CYAN, C_GREEN];
export const malacharLog = { shocks: 0, moves: {} as Record<string, number>, hazards: 0, shots: 0, sparkles: 0, maxPhase: 0, safeGaps: 0, colours: [0, 0, 0, 0], beams: 0 };
let center = { x: 0, y: 0 };
export const arena6Center = () => center;
export const malacharOf = (g: Game) => g.enemies.find((e) => e.kind === "malachar" && !e.dead);
const story = () => (window as unknown as { __ki?: { story?: { flags: Record<string, unknown>; save(): void; box: unknown } } }).__ki?.story;

function place(g: Game, h: Omit<Hazard, "foe" | "dusk">, col: number) {
  if (Math.hypot(h.x - center.x, h.y - center.y) > ARENA6.r + 6) return;
  malacharLog.hazards++; malacharLog.colours[col]++; g.mb.hazards.push({ ...h, foe: true, dusk: col });
}
const spark = (g: Game, x: number, y: number, vx: number, vy: number, life: number, col: number, kind = K_SPARK) => { malacharLog.sparkles++; g.parts.emit(CH_COMBAT, kind, x, y, vx, vy, life, col); };

export function startMalachar(g: Game, x?: number, y?: number) {
  const b = g.mb.boss6; center = { x: ARENA6.tx * 16 + 8, y: ARENA6.ty * 16 + 8 };
  if (x == null || y == null) ({ x, y } = { x: center.x, y: center.y - 24 });
  b.active = true; b.phase = 1; b.introT = 2.4; b.lockT = 1.4; malacharLog.maxPhase = 1;
  const e = makeEnemy("malachar", x, y); e.state = "recover"; e.t = 1.6; g.enemies.push(e);
  for (const f of g.enemies) if (f !== e && !f.dead && Math.hypot(f.x - center.x, f.y - center.y) < ARENA6.r + 24) { f.dead = true; f.respawn = 30; }
  g.banner = BANNERS6[1]; g.bannerT = 2.6; g.shake = 5;
  g.say("Be the last warm thing, lamplighter.", 2.4);
  return e;
}

export function updateArena6(g: Game, dt: number) {
  const b = g.mb.boss6, p = g.p;
  b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt);
  const s = story();
  if (g.area.id === ARENA6.area && !b.active && !b.done && s?.flags.huskIn && !s.flags.malacharDown && !s.box) {
    const cx = ARENA6.tx * 16 + 8, cy = ARENA6.ty * 16 + 8;
    if (Math.hypot(p.x - cx, p.y - cy) < ARENA6.r - 24) { center = { x: cx, y: cy }; const at = freeNear(g.area, ARENA6.tx, ARENA6.ty - 2); startMalachar(g, at.x, at.y); }
  }
  if (!b.active) return;
  const dx = p.x - center.x, dy = p.y - center.y, d = Math.hypot(dx, dy);
  if (d > ARENA6.r) { p.x = center.x + (dx / d) * ARENA6.r; p.y = center.y + (dy / d) * ARENA6.r; p.kx = -dx * 2; p.ky = -dy * 2; }
  const e = malacharOf(g);
  if (e) {
    const ex = e.x - center.x, ey = e.y - center.y, ed = Math.hypot(ex, ey) || 1, max = ARENA6.r - 16;
    if (ed > max) { e.x = center.x + (ex / ed) * max; e.y = center.y + (ey / ed) * max; }
    // ambient: the four stolen springs leak out of him as neon motes; denser every phase
    const every = Math.max(1, 5 - b.phase);
    if (g.frame % every === 0) { const a = Math.random() * 6.28, r = 8 + Math.random() * 14;
      spark(g, e.x + Math.cos(a) * r, e.y - 26 + Math.sin(a) * r, Math.cos(a) * 24, -30 - Math.random() * 24, 0.7, COLS[(g.frame >> 1) & 3]); }
    if (b.phase >= 5 && g.frame % 2 === 0) spark(g, center.x + (Math.random() - 0.5) * ARENA6.r * 2, center.y + (Math.random() - 0.5) * ARENA6.r, 0, -50, 0.8, (g.frame >> 1) & 1 ? C_WHITE : C_GOLD);
  }
}

function shockwave(g: Game, e: Enemy) {
  malacharLog.shocks++;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; place(g, { x: e.x + Math.cos(a) * 34, y: e.y + Math.sin(a) * 22, r: 13, t: 0.45, max: 0.45, dmg: 9 }, i & 3); }
  for (let i = 0; i < 32; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 24, Math.cos(i * 0.2) * 180, Math.sin(i * 0.2) * 180, 0.7, COLS[i & 3], 0, 2);
  malacharLog.sparkles += 32;
  for (const o of [g.p, ...g.mb.allies.filter((a) => a.joined && !a.ko)]) { const d = Math.hypot(o.x - e.x, o.y - e.y) || 1; if (d < 90) { o.kx = ((o.x - e.x) / d) * 220; o.ky = ((o.y - e.y) / d) * 220; } }
  g.shake = 7;
}

function beam(g: Game, e: Enemy, ux: number, uy: number, T: number, col: number) {
  for (let k = 1; k <= 9; k++) place(g, { x: e.x + ux * k * 15, y: e.y - 6 + uy * k * 15, r: 10, t: T + k * 0.04, max: T + k * 0.04, dmg: 11 }, col);
}

function telegraph(g: Game, e: Enemy, ux: number, uy: number) {
  const b = g.mb.boss6, p = g.p, T = e.t, a0 = Math.atan2(uy, ux);
  if (e.move === "slash") for (let i = -3; i <= 3; i++) { const a = a0 + i * 0.32; place(g, { x: e.x + Math.cos(a) * 32, y: e.y - 4 + Math.sin(a) * 26, r: 12, t: T, max: T, dmg: 12 }, 0); }
  if (e.move === "prism") { const n = b.phase >= 5 ? 8 : 4, off = Math.random() * 0.6; malacharLog.beams = n; for (let k = 0; k < n; k++) { const a = a0 + off + (k / n) * 6.28; beam(g, e, Math.cos(a), Math.sin(a), T + (k & 1) * 0.2, k & 3); } }
  if (e.move === "rain") for (let k = 0; k < (b.phase >= 5 ? 9 : 6); k++) { const r = k ? 18 + Math.random() * 40 : 0, a = Math.random() * 6.28;
    place(g, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7, r: 14, t: T + k * 0.12, max: T + k * 0.12, dmg: 13 }, k % 3 ? 0 : 1); }
  if (e.move === "nova") { const gap0 = Math.floor(Math.random() * 18); malacharLog.safeGaps++;
    for (const [rr, dt] of [[28, 0], [48, 0.35], [68, 0.7]] as [number, number][]) for (let i = 0; i < 18; i++) {
      const gi = (gap0 + Math.round(dt * 4)) % 18; if (i === gi || i === (gi + 1) % 18) continue;
      const a = (i / 18) * 6.28; place(g, { x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr * 0.75, r: 10, t: T + dt, max: T + dt, dmg: 11 + b.phase }, dt ? 2 : 3); } }
  if (e.move === "dusk") {
    // night floods the ring; one warm light (the hero's lamp) stays safe on the far side
    const sa = Math.atan2(center.y - e.y, center.x - e.x) + (Math.random() - 0.5), R = ARENA6.r - 30, sx = center.x + Math.cos(sa) * R, sy = center.y + Math.sin(sa) * R;
    malacharLog.safeGaps++;
    for (let gy = -ARENA6.r; gy <= ARENA6.r; gy += 22) for (let gx = -ARENA6.r; gx <= ARENA6.r; gx += 22) {
      const x = center.x + gx, y = center.y + gy; if (Math.hypot(gx, gy) > ARENA6.r || Math.hypot(x - sx, y - sy) < 32) continue;
      place(g, { x, y, r: 13, t: T, max: T, dmg: 15 }, ((gx + gy) / 22) & 1 ? 1 : 2); }
    g.mb.hazards.push({ x: sx, y: sy, r: 24, t: T, max: T, dmg: 0, foe: false, dusk: 3, safe: true });
  }
}

export function updateMalachar(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const b = g.mb.boss6, r = e.hp / e.max;
  let want = 1; for (let k = 1; k < PHASE_AT.length; k++) if (r <= PHASE_AT[k]) want = k + 1;
  if (want > b.phase) {
    b.phase = want; b.lockT = 1.2; e.state = "recover"; e.t = 1.3; e.move = ""; malacharLog.maxPhase = want;
    g.banner = BANNERS6[want]; g.bannerT = 1.9; g.mb.hazards = g.mb.hazards.filter((h) => h.dusk == null);
    shockwave(g, e);
    return [0, 0];
  }
  const spd = [1, 1, 1.08, 1.16, 1.25, 1.35][b.phase];
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    if (e.t <= 0) {
      const list = MOVES6[b.phase - 1];
      e.move = list[Math.floor(Math.random() * list.length)];
      e.state = "tele"; e.t = TELE6[e.move] / spd; e.ax = ux; e.ay = uy; e.n = 0;
      malacharLog.moves[e.move] = (malacharLog.moves[e.move] ?? 0) + 1;
      telegraph(g, e, ux, uy);
      return [0, 0];
    }
    const k = dist > 56 ? 1 : dist < 32 ? -0.6 : 0;
    return [ux * 34 * k * spd, uy * 34 * k * spd];
  }
  if (e.state === "tele") {
    if (g.frame % 2 === 0) spark(g, e.x + (Math.random() - 0.5) * 30, e.y - 28 + (Math.random() - 0.5) * 24, 0, -70, 0.4, COLS[(g.frame >> 1) & 3]);
    if (e.t <= 0) {
      e.state = "act"; e.t = e.move === "spiral" ? 1.1 : e.move === "cast" ? 0.4 : 0.3;
      if (e.move === "rain" || e.move === "dusk" || e.move === "nova") g.shake = 5;
      if (e.move === "cast") { const n = b.phase >= 3 ? 7 : 5, a0 = Math.atan2(e.ay, e.ax); for (let i = 0; i < n; i++) { shoot(g, e.x, e.y - 20, a0 + (i - (n - 1) / 2) * 0.22, 95, 8, 2); malacharLog.shots++; } }
      for (let i = 0; i < 10; i++) spark(g, e.x, e.y - 26, Math.cos(i * 0.63) * 90, Math.sin(i * 0.63) * 90, 0.45, COLS[i & 3], K_RING);
    }
    return [0, 0];
  }
  if (e.state === "act") {
    if (e.move === "spiral" && g.frame % 6 === 0) {
      const arms = b.phase >= 5 ? 6 : 4;
      for (let k = 0; k < arms; k++) { shoot(g, e.x, e.y - 20, e.n * 0.38 + (k / arms) * 6.28, 75, 7, 1.7); malacharLog.shots++; }
      e.n++;
    }
    if (e.t <= 0) { e.state = "recover"; e.t = 0.85 / spd; }
    return [0, 0];
  }
  if (e.t <= 0) { e.state = "chase"; e.t = 0.65 / spd; }
  return [0, 0];
}

/** Defeat: saves malacharDown (story then plays the Wellsprings ending -> dawn -> credits) + boss6; Sunheart reward. */
export function malacharKilled(g: Game, e: Enemy) {
  const b = g.mb.boss6; b.active = false; b.done = true; writeBossDone("boss6");
  const s = story(); if (s) { s.flags.malacharDown = true; s.save(); }
  g.pts += 8; g.tf = 100; g.hp = g.maxHp; g.ep = g.maxEp; g.shake = 9;
  g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
  g.banner = "THE LAST DUSK ENDS"; g.bannerT = 3.5;
  g.say("Sunheart obtained! +8 stat points. Now give the light back.", 4);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  for (let i = 0; i < 48; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 26, Math.cos(i / 7.6) * 200, Math.sin(i / 7.6) * 200, 0.9, i % 5 === 0 ? C_WHITE : COLS[i & 3], 0, 2);
  malacharLog.sparkles += 48;
}

const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), startMalachar, malacharLog, ARENA6, MOVES6, malacharOf, BANNERS6 };
