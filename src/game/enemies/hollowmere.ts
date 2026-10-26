/**
 * OPTIONAL boss11: HOLLOWMERE, THE DRINKING COLOSSUS (sheet public/art/chars/hollowmere.*, tools/art/build_hollowmere.py).
 * A violet reed-backed colossus that drinks the Hushwater mere. NOT required: HOLLOWMERE_REQUIRED = false, nothing gates on
 * hollowmereDown except its own reward. Arena HUSH_ARENA (defined here, not in maps.ts): the west meadow of Hushwater,
 * tile 17,22 r5, off the main path. Wakes only when story `bell && corvinDown` and the hero steps onto the still ripple at the
 * centre (opt-in; a hint fires nearby). Sets hollowmereWake on wake, hollowmereDown on defeat (+ kiquest-mb-v1 boss11).
 * 560 HP, 3 phases (66 / 33 %); each change = banner, teal shockwave + knockback, 1.2 s invulnerability. Ground warnings
 * carry `mere: 0 violet | 1 teal | 2 fog` (drawn by src/game/combat/draw17.ts).
 *   P1 "HOLLOWMERE, THE DRINKING COLOSSUS"  lash (reed line toward hero) · drink (EP drain + pull, one safe ring)
 *   P2 "THE FOG RISES"   + fog surge (darkness, 3 lantern safe spots, the rest of the mere stings)
 *   P3 "THE MERE SINKS"  + sink (untargetable, 3 marked ripples, resurfaces with a splash at one of them)
 * Reward (unique, source B only): Stillwater Charm, gear c7 (src/game/combat/gear.ts) via the BOSS map. Owner: Master Builder.
 */
import type { Game } from "../../game";
import { Enemy, Hazard, makeEnemy } from "./types";
import { freeNear } from "./ai";
import { writeBossDone } from "../combat/state";
import { CH_COMBAT, K_RING, K_SPARK, K_DUST, C_VIOLET, C_CYAN, C_WHITE } from "../../vendor/particles";

export const HOLLOWMERE_REQUIRED = false;
export const HUSH_ARENA = { tx: 17, ty: 22, r: 5 };
export const ARENA11 = { area: "hushwater", tx: HUSH_ARENA.tx, ty: HUSH_ARENA.ty, r: HUSH_ARENA.r * 16 };
const PHASE_AT = [1, 0.66, 0.33];
export const MOVES11 = [["lash", "drink"], ["lash", "drink", "fog"], ["lash", "fog", "sink", "drink"]];
export const TELE11: Record<string, number> = { lash: 0.75, drink: 0.9, fog: 1.3, sink: 0.8 };
export const BANNERS11 = ["", "HOLLOWMERE, THE DRINKING COLOSSUS", "THE FOG RISES", "THE MERE SINKS"];
const COLS = [C_VIOLET, C_CYAN, C_WHITE];
export const hollowLog = { shocks: 0, moves: {} as Record<string, number>, hazards: 0, safe: 0, drained: 0, pulled: 0, maxPhase: 0, ripples: 0, surfaced: 0, sunkHits: 0, hinted: 0 };
let center = { x: ARENA11.tx * 16 + 8, y: ARENA11.ty * 16 + 8 };
let force: string | null = null, surfaceAt = { x: 0, y: 0 }, safeAt = { x: 0, y: 0, r: 0 }, hinted = false;
/** Fog-surge darkening (0..1), read by draw17. */
export let fogDark = 0;
export const arena11Center = () => center;
export const hollowOf = (g: Game) => g.enemies.find((e) => e.kind === "hollowmere" && !e.dead);
const story = () => (window as unknown as { __ki?: { story?: { flags: Record<string, unknown>; save(): void; box: unknown } } }).__ki?.story;
/** Wakeable now (opt-in ripple shows): bell rung and Corvin down, not yet beaten. */
export function hollowReady(g: Game) {
  const s = story(), b = g.mb.boss11;
  return !!s && g.area.id === ARENA11.area && !!s.flags.bell && !!s.flags.corvinDown && !s.flags.hollowmereDown && !b.done && !b.active;
}
/** True while the colossus is under the water (all hits are ignored). */
export const hollowSunk = (e: Enemy) => e.kind === "hollowmere" && e.move === "sink" && (e.state === "act" || (e.state === "tele" && e.t < 0.35));

function place(g: Game, h: Omit<Hazard, "foe" | "mere">, col: number) {
  if (Math.hypot(h.x - center.x, h.y - center.y) > ARENA11.r + 6) return;
  hollowLog.hazards++; g.mb.hazards.push({ ...h, foe: true, mere: col });
}
const spark = (g: Game, x: number, y: number, vx: number, vy: number, life: number, col: number, kind = K_SPARK) => g.parts.emit(CH_COMBAT, kind, x, y, vx, vy, life, col);

export function startHollowmere(g: Game, x?: number, y?: number) {
  const b = g.mb.boss11; center = { x: ARENA11.tx * 16 + 8, y: ARENA11.ty * 16 + 8 };
  if (x == null || y == null) { const at = freeNear(g.area, ARENA11.tx, ARENA11.ty - 2); x = at.x; y = at.y; }
  b.active = true; b.phase = 1; b.introT = 2.4; b.lockT = 1.4; hollowLog.maxPhase = 1; fogDark = 0;
  const e = makeEnemy("hollowmere", x, y); e.state = "recover"; e.t = 1.6; g.enemies.push(e);
  for (const f of g.enemies) if (f !== e && !f.dead && Math.hypot(f.x - center.x, f.y - center.y) < ARENA11.r + 24) { f.dead = true; f.respawn = 30; }
  g.banner = BANNERS11[1]; g.bannerT = 2.6; g.shake = 5;
  g.say("The mere rises and opens its mouth.", 2.4);
  const s = story(); if (s) { s.flags.hollowmereWake = true; s.save(); }
  for (let i = 0; i < 24; i++) spark(g, x, y, Math.cos(i * 0.26) * 120, Math.sin(i * 0.26) * 70, 0.6, COLS[i & 1], K_RING);
  return e;
}

export function updateArena11(g: Game, dt: number) {
  const b = g.mb.boss11, p = g.p;
  b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt); fogDark = Math.max(0, fogDark - dt * 0.6);
  if (g.area.id !== ARENA11.area) return;
  const s = story();
  if (hollowReady(g) && !s?.box) {
    const d = Math.hypot(p.x - center.x, p.y - center.y);
    if (d < 64 && !hinted) { hinted = true; hollowLog.hinted++; g.say("Something breathes under the still water...", 2.6); }
    if (g.frame % 9 === 0) spark(g, center.x + (Math.random() - 0.5) * 20, center.y + (Math.random() - 0.5) * 10, 0, -14, 0.8, C_VIOLET, K_DUST);
    if (d < 16) startHollowmere(g);
  }
  if (!b.active) return;
  const dx = p.x - center.x, dy = p.y - center.y, d = Math.hypot(dx, dy);
  if (d > ARENA11.r) { p.x = center.x + (dx / d) * ARENA11.r; p.y = center.y + (dy / d) * ARENA11.r; p.kx = -dx * 2; p.ky = -dy * 2; }
  const e = hollowOf(g);
  if (!e) return;
  const ex = e.x - center.x, ey = e.y - center.y, ed = Math.hypot(ex, ey) || 1, max = ARENA11.r - 14;
  if (ed > max) { e.x = center.x + (ex / ed) * max; e.y = center.y + (ey / ed) * max; }
  if (!hollowSunk(e) && g.frame % Math.max(2, 6 - b.phase) === 0) { const a = Math.random() * 6.28;
    spark(g, e.x + Math.cos(a) * 16, e.y - 14 + Math.sin(a) * 8, 0, -22 - Math.random() * 18, 0.8, COLS[(g.frame >> 2) & 1], K_DUST); }
  // drink: EP drains and the hero is pulled toward the maw unless inside the safe ring
  if (e.move === "drink" && e.state === "act") {
    const inSafe = Math.hypot(p.x - safeAt.x, p.y - safeAt.y) < safeAt.r;
    const hx = e.x - p.x, hy = e.y - p.y, hd = Math.hypot(hx, hy) || 1;
    if (!inSafe && hd < 150) {
      const was = g.ep; g.ep = Math.max(0, g.ep - 14 * dt); hollowLog.drained += was - g.ep;
      if (hd > 20) { p.x += (hx / hd) * 46 * dt; p.y += (hy / hd) * 46 * dt; hollowLog.pulled += 46 * dt; }
      if (hd < 22 && g.frame % 20 === 0) g.hurtHero(6, e.x, e.y);
      if (g.frame % 3 === 0) spark(g, p.x, p.y - 10, (hx / hd) * 90, (hy / hd) * 90, 0.4, C_CYAN);
    }
  }
}

function shockwave(g: Game, e: Enemy) {
  hollowLog.shocks++;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; place(g, { x: e.x + Math.cos(a) * 32, y: e.y + Math.sin(a) * 20, r: 12, t: 0.45, max: 0.45, dmg: 8 }, 1); }
  for (let i = 0; i < 28; i++) spark(g, e.x, e.y - 16, Math.cos(i * 0.224) * 170, Math.sin(i * 0.224) * 110, 0.7, COLS[i & 1], i & 1 ? K_RING : K_SPARK);
  for (const o of [g.p, ...g.mb.allies.filter((a) => a.joined && !a.ko)]) { const d = Math.hypot(o.x - e.x, o.y - e.y) || 1; if (d < 90) { o.kx = ((o.x - e.x) / d) * 210; o.ky = ((o.y - e.y) / d) * 210; } }
  g.shake = 6;
}

function telegraph(g: Game, e: Enemy, ux: number, uy: number) {
  const b = g.mb.boss11, p = g.p, T = e.t, a0 = Math.atan2(uy, ux);
  if (e.move === "lash") {
    const fan = b.phase >= 3 ? [-0.45, 0, 0.45] : [0];
    for (const off of fan) for (let k = 1; k <= 8; k++) { const a = a0 + off; place(g, { x: e.x + Math.cos(a) * k * 14, y: e.y - 4 + Math.sin(a) * k * 14, r: 10, t: T + k * 0.03, max: T + k * 0.03, dmg: 12 }, 1); }
  }
  if (e.move === "drink") {
    // the one safe ring: a reed island off to the side of the hero
    const sa = a0 + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), R = Math.min(ARENA11.r - 22, 40 + Math.random() * 16);
    safeAt = { x: center.x + Math.cos(sa) * R, y: center.y + Math.sin(sa) * R * 0.8, r: 20 }; hollowLog.safe++;
    g.mb.hazards.push({ x: safeAt.x, y: safeAt.y, r: safeAt.r, t: T + 2.0, max: T + 2.0, dmg: 0, foe: false, mere: 1, safe: true });
  }
  if (e.move === "fog") {
    fogDark = 1;
    const base = Math.random() * 6.28, R = ARENA11.r - 28, lanterns = [0, 1, 2].map((k) => ({ x: center.x + Math.cos(base + k * 2.094) * R, y: center.y + Math.sin(base + k * 2.094) * R * 0.8 }));
    for (let gy = -ARENA11.r; gy <= ARENA11.r; gy += 20) for (let gx = -ARENA11.r; gx <= ARENA11.r; gx += 20) {
      const x = center.x + gx, y = center.y + gy; if (Math.hypot(gx, gy) > ARENA11.r || lanterns.some((l) => Math.hypot(x - l.x, y - l.y) < 26)) continue;
      place(g, { x, y, r: 12, t: T, max: T, dmg: 13 }, 2); }
    for (const l of lanterns) { hollowLog.safe++; g.mb.hazards.push({ x: l.x, y: l.y, r: 20, t: T, max: T, dmg: 0, foe: false, mere: 2, safe: true }); }
  }
  if (e.move === "sink") {
    const spots = [{ x: p.x, y: p.y }];
    for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28, r = 20 + Math.random() * (ARENA11.r - 40); spots.push({ x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r * 0.8 }); }
    surfaceAt = spots[Math.floor(Math.random() * 3)];
    const TT = T + 1.2;
    for (const s of spots) { hollowLog.ripples++; place(g, { x: s.x, y: s.y, r: 22, t: TT, max: TT, dmg: s === surfaceAt ? 16 : 11 }, 0); }
  }
}

export function updateHollowmere(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const b = g.mb.boss11, r = e.hp / e.max;
  let want = 1; for (let k = 1; k < PHASE_AT.length; k++) if (r <= PHASE_AT[k]) want = k + 1;
  if (want > b.phase && !hollowSunk(e)) {
    b.phase = want; b.lockT = 1.2; e.state = "recover"; e.t = 1.3; e.move = ""; hollowLog.maxPhase = want;
    g.banner = BANNERS11[want]; g.bannerT = 1.9; g.mb.hazards = g.mb.hazards.filter((h) => h.mere == null);
    shockwave(g, e);
    return [0, 0];
  }
  const spd = [1, 1, 1.1, 1.2][b.phase];
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    if (e.t <= 0 || force) {
      const list = MOVES11[b.phase - 1];
      e.move = force ?? list[Math.floor(Math.random() * list.length)]; force = null;
      e.state = "tele"; e.t = TELE11[e.move] / spd; e.ax = ux; e.ay = uy; e.n = 0;
      hollowLog.moves[e.move] = (hollowLog.moves[e.move] ?? 0) + 1;
      telegraph(g, e, ux, uy);
      return [0, 0];
    }
    const k = dist > 60 ? 1 : dist < 34 ? -0.6 : 0;
    return [ux * 24 * k * spd, uy * 24 * k * spd];
  }
  if (e.state === "tele") {
    if (g.frame % 3 === 0) spark(g, e.x + (Math.random() - 0.5) * 28, e.y - 18, 0, -50, 0.4, e.move === "fog" ? C_WHITE : COLS[(g.frame >> 1) & 1]);
    if (e.t <= 0) {
      e.state = "act"; e.t = e.move === "drink" ? 2.0 : e.move === "sink" ? 1.2 : 0.3;
      if (e.move === "fog" || e.move === "lash") g.shake = 4;
      for (let i = 0; i < 10; i++) spark(g, e.x, e.y - 14, Math.cos(i * 0.63) * 80, Math.sin(i * 0.63) * 50, 0.45, COLS[i & 1], K_RING);
    }
    return [0, 0];
  }
  if (e.state === "act") {
    if (e.move === "sink" && e.t <= 0) {
      e.x = surfaceAt.x; e.y = surfaceAt.y; hollowLog.surfaced++; g.shake = 5;
      for (let i = 0; i < 20; i++) spark(g, e.x, e.y - 6, Math.cos(i * 0.314) * 110, -40 - Math.random() * 90, 0.6, i & 1 ? C_CYAN : C_WHITE);
    }
    if (e.t <= 0) { e.state = "recover"; e.t = (e.move === "sink" ? 1.1 : 0.85) / spd; }
    return [0, 0];
  }
  if (e.t <= 0) { e.state = "chase"; e.t = 0.7 / spd; }
  return [0, 0];
}

/** Defeat: hollowmereDown + boss11 saved; the Stillwater Charm is granted by gear.ts earned() on that flag (source B only). */
export function hollowmereKilled(g: Game, e: Enemy) {
  const b = g.mb.boss11; b.active = false; b.done = true; writeBossDone("boss11"); fogDark = 0;
  const s = story(); if (s) { s.flags.hollowmereDown = true; s.save(); }
  g.pts += 4; g.shake = 8;
  g.mb.hazards = g.mb.hazards.filter((h) => h.mere == null); g.shots = g.shots.filter((s) => !s.foe);
  g.banner = "HOLLOWMERE SINKS"; g.bannerT = 3.2;
  g.say("+4 stat points. A smooth violet stone glints in the reeds.", 4);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  for (let i = 0; i < 40; i++) spark(g, e.x, e.y - 16, Math.cos(i / 6.4) * 180, Math.sin(i / 6.4) * 120, 0.9, i % 5 === 0 ? C_WHITE : COLS[i & 1], i & 1 ? K_RING : K_SPARK);
}

/** Test hook: next move (when the boss is free to act). */
export function forceHollowMove(m: string) { force = m; }
const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), startHollowmere, hollowLog, ARENA11, HUSH_ARENA, MOVES11, BANNERS11, hollowOf, forceHollowMove, HOLLOWMERE_REQUIRED, hollowReady };
