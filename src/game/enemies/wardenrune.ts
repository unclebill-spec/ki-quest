/**
 * TRUE FINAL boss12: WARDEN RUNE, LAST GUARDIAN (sheet public/art/chars/warden_rune.*, tools/art/build_warden_rune.py).
 * Slate-and-gold guardian with cyan rune seams. Fought in HUSK_ARENA (tile 24,15 r8) after Malachar: story sets
 * malacharFade (instead of dawn) -> runeSeen intro -> the fight wakes on husk && malacharFade && !runeDown && !story.box.
 * Defeat saves runeDown + kiquest-mb-v1 boss12; story then plays the Warden's last lines, dawn, Rook, credits.
 * 1500 HP, 6 phases (85 / 70 / 55 / 40 / 20 %); each change = banner, cyan shockwave + knockback, 1.2 s invulnerability.
 * Every move telegraphs; ground warnings carry `rune: 0 cyan | 1 gold` (drawn by src/game/combat/draw17.ts).
 *   P1 "WARDEN RUNE, LAST GUARDIAN"  glyph (rune circles on/around hero) · slam (gold ring)
 *   P2 "WARD WALLS"          + wall (two crossing walls, each with a 2-cell gap)
 *   P3 "THE WELLSPRING BEAMS" + beams (4 beams, 3 rotating waves)
 *   P4 "THE SEALING"         + seal (rings close inward; the gold centre is safe)
 *   P5 "ECHOES OF THE FALLEN" + echo (an earlier boss's pattern, round-robin: ashmaw, hollowmere, slagheart, aurel, twins, malachar)
 *   P6 "THE LAST WATCH"      everything faster, 6 beams, more glyphs
 * Owner: Master Builder.
 */
import type { Game } from "../../game";
import { Enemy, Hazard, makeEnemy } from "./types";
import { freeNear, shoot } from "./ai";
import { HUSK_ARENA } from "../../areas/maps";
import { writeBossDone } from "../combat/state";
import { CH_COMBAT, K_RING, K_SPARK, C_CYAN, C_GOLD, C_WHITE } from "../../vendor/particles";

export const ARENA12 = { area: "husk", tx: HUSK_ARENA.tx, ty: HUSK_ARENA.ty, r: HUSK_ARENA.r * 16 };
const PHASE_AT = [1, 0.85, 0.7, 0.55, 0.4, 0.2];
export const MOVES12 = [["glyph", "slam"], ["glyph", "slam", "wall"], ["glyph", "wall", "beams"], ["beams", "glyph", "seal", "wall"], ["echo", "beams", "wall", "glyph"], ["echo", "beams", "seal", "wall", "glyph"]];
export const TELE12: Record<string, number> = { glyph: 0.9, slam: 0.8, wall: 1.0, beams: 1.0, seal: 1.3, echo: 1.0 };
export const BANNERS12 = ["", "WARDEN RUNE, LAST GUARDIAN", "WARD WALLS", "THE WELLSPRING BEAMS", "THE SEALING", "ECHOES OF THE FALLEN", "THE LAST WATCH"];
export const ECHOES = ["ashmaw", "hollowmere", "slagheart", "aurel", "twins", "malachar"];
const C_EMBER = 8;
export const runeLog = { shocks: 0, moves: {} as Record<string, number>, hazards: 0, shots: 0, maxPhase: 0, gaps: 0, beams: 0, waves: 0, safe: 0, echoes: {} as Record<string, number> };
let center = { x: 0, y: 0 }, force: string | null = null, echoI = 0;
export const arena12Center = () => center;
export const runeOf = (g: Game) => g.enemies.find((e) => e.kind === "wardenrune" && !e.dead);
const story = () => (window as unknown as { __ki?: { story?: { flags: Record<string, unknown>; save(): void; box: unknown } } }).__ki?.story;

function place(g: Game, h: Omit<Hazard, "foe" | "rune">, col: number) {
  if (Math.hypot(h.x - center.x, h.y - center.y) > ARENA12.r + 6) return;
  runeLog.hazards++; g.mb.hazards.push({ ...h, foe: true, rune: col });
}
const spark = (g: Game, x: number, y: number, vx: number, vy: number, life: number, col: number, kind = K_SPARK) => g.parts.emit(CH_COMBAT, kind, x, y, vx, vy, life, col);

export function startRune(g: Game, x?: number, y?: number) {
  const b = g.mb.boss12; center = { x: ARENA12.tx * 16 + 8, y: ARENA12.ty * 16 + 8 };
  if (x == null || y == null) { const at = freeNear(g.area, ARENA12.tx, ARENA12.ty - 2); x = at.x; y = at.y; }
  b.active = true; b.phase = 1; b.introT = 2.4; b.lockT = 1.4; runeLog.maxPhase = 1; echoI = 0;
  const e = makeEnemy("wardenrune", x, y); e.state = "recover"; e.t = 1.6; g.enemies.push(e);
  for (const f of g.enemies) if (f !== e && !f.dead && Math.hypot(f.x - center.x, f.y - center.y) < ARENA12.r + 24) { f.dead = true; f.respawn = 30; }
  g.hp = g.maxHp; g.ep = g.maxEp;
  g.banner = BANNERS12[1]; g.bannerT = 2.8; g.shake = 6;
  g.say("STAND ASIDE, LAMPLIGHTER.", 2.4);
  for (let i = 0; i < 30; i++) spark(g, x, y - 30, Math.cos(i * 0.21) * 150, Math.sin(i * 0.21) * 100, 0.7, i % 3 ? C_CYAN : C_GOLD, K_RING);
  return e;
}

export function updateArena12(g: Game, dt: number) {
  const b = g.mb.boss12, p = g.p;
  b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt);
  if (g.area.id !== ARENA12.area) return;
  const s = story();
  if (!b.active && !b.done && s?.flags.malacharFade && !s.flags.runeDown && !s.box) { center = { x: ARENA12.tx * 16 + 8, y: ARENA12.ty * 16 + 8 }; startRune(g); }
  if (!b.active) return;
  const dx = p.x - center.x, dy = p.y - center.y, d = Math.hypot(dx, dy);
  if (d > ARENA12.r) { p.x = center.x + (dx / d) * ARENA12.r; p.y = center.y + (dy / d) * ARENA12.r; p.kx = -dx * 2; p.ky = -dy * 2; }
  const e = runeOf(g);
  if (!e) return;
  const ex = e.x - center.x, ey = e.y - center.y, ed = Math.hypot(ex, ey) || 1, max = ARENA12.r - 16;
  if (ed > max) { e.x = center.x + (ex / ed) * max; e.y = center.y + (ey / ed) * max; }
  if (g.frame % Math.max(1, 6 - b.phase) === 0) { const a = Math.random() * 6.28, r = 10 + Math.random() * 14;
    spark(g, e.x + Math.cos(a) * r, e.y - 34 + Math.sin(a) * r, Math.cos(a) * 18, -36 - Math.random() * 20, 0.7, (g.frame >> 2) % 4 ? C_CYAN : C_GOLD); }
  if (b.phase >= 6 && g.frame % 2 === 0) spark(g, center.x + (Math.random() - 0.5) * ARENA12.r * 2, center.y + (Math.random() - 0.5) * ARENA12.r, 0, -55, 0.8, g.frame & 2 ? C_WHITE : C_CYAN);
}

function shockwave(g: Game, e: Enemy) {
  runeLog.shocks++;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; place(g, { x: e.x + Math.cos(a) * 36, y: e.y + Math.sin(a) * 24, r: 13, t: 0.45, max: 0.45, dmg: 9 }, i & 1); }
  for (let i = 0; i < 36; i++) spark(g, e.x, e.y - 30, Math.cos(i * 0.175) * 190, Math.sin(i * 0.175) * 190, 0.75, i % 4 ? C_CYAN : C_GOLD, i & 1 ? K_RING : K_SPARK);
  for (const o of [g.p, ...g.mb.allies.filter((a) => a.joined && !a.ko)]) { const d = Math.hypot(o.x - e.x, o.y - e.y) || 1; if (d < 96) { o.kx = ((o.x - e.x) / d) * 230; o.ky = ((o.y - e.y) / d) * 230; } }
  g.shake = 8;
}

const line = (g: Game, x: number, y: number, ux: number, uy: number, n: number, T: number, col: number, dmg = 12) => {
  for (let k = 1; k <= n; k++) place(g, { x: x + ux * k * 15, y: y + uy * k * 15, r: 10, t: T + k * 0.04, max: T + k * 0.04, dmg }, col);
};
function wall(g: Game, horiz: boolean, at: number, T: number) {
  const R = ARENA12.r, cells = Math.floor((R * 2) / 18), gap = 2 + Math.floor(Math.random() * (cells - 5)); runeLog.gaps++;
  for (let i = 0; i <= cells; i++) { if (i === gap || i === gap + 1) continue;
    const o = -R + i * 18, x = horiz ? center.x + o : at, y = horiz ? at : center.y + o;
    place(g, { x, y, r: 11, t: T, max: T, dmg: 13 }, 0); }
}

function echo(g: Game, e: Enemy, which: string, T: number, a0: number) {
  const p = g.p; runeLog.echoes[which] = (runeLog.echoes[which] ?? 0) + 1;
  if (which === "ashmaw") for (let i = -3; i <= 3; i++) { const a = a0 + i * 0.3; place(g, { x: e.x + Math.cos(a) * 34, y: e.y + Math.sin(a) * 26, r: 13, t: T, max: T, dmg: 13 }, 1); }
  if (which === "hollowmere") for (const off of [-0.4, 0, 0.4]) line(g, e.x, e.y - 4, Math.cos(a0 + off), Math.sin(a0 + off), 8, T, 0);
  if (which === "slagheart") for (let k = 0; k < 7; k++) { const r = k ? 18 + Math.random() * 44 : 0, a = Math.random() * 6.28; place(g, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7, r: 14, t: T + k * 0.1, max: T + k * 0.1, dmg: 13 }, 1); }
  if (which === "aurel") { const gap0 = Math.floor(Math.random() * 16); runeLog.gaps++;
    for (let i = 0; i < 16; i++) { if (i === gap0 || i === (gap0 + 1) % 16) continue; const a = (i / 16) * 6.28; place(g, { x: e.x + Math.cos(a) * 52, y: e.y + Math.sin(a) * 40, r: 11, t: T, max: T, dmg: 12 }, 0); } }
  if (which === "twins") { const d = 6 * 15; for (const a of [Math.PI / 4, -Math.PI / 4]) line(g, p.x - Math.cos(a) * d / 2, p.y - Math.sin(a) * d / 2, Math.cos(a), Math.sin(a), 6, T, 0); }
  if (which === "malachar") for (let k = 0; k < 4; k++) { const a = a0 + 0.4 + (k / 4) * 6.28; line(g, e.x, e.y - 6, Math.cos(a), Math.sin(a), 9, T + (k & 1) * 0.2, k & 1); }
}

function telegraph(g: Game, e: Enemy, ux: number, uy: number) {
  const b = g.mb.boss12, p = g.p, T = e.t, a0 = Math.atan2(uy, ux);
  if (e.move === "glyph") { const n = b.phase >= 6 ? 6 : b.phase >= 4 ? 5 : 3;
    for (let k = 0; k < n; k++) { const r = k ? 26 + Math.random() * 40 : 0, a = Math.random() * 6.28; place(g, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.75, r: 18, t: T + k * 0.15, max: T + k * 0.15, dmg: 13 }, 0); } }
  if (e.move === "slam") { place(g, { x: e.x, y: e.y, r: 26, t: T, max: T, dmg: 15 }, 1);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; place(g, { x: e.x + Math.cos(a) * 44, y: e.y + Math.sin(a) * 32, r: 12, t: T + 0.25, max: T + 0.25, dmg: 12 }, 1); } }
  if (e.move === "wall") { wall(g, true, p.y, T); wall(g, false, p.x, T + 0.5); }
  if (e.move === "beams") { const n = b.phase >= 6 ? 6 : 4, off = Math.random() * 0.6; runeLog.beams = n;
    for (let w = 0; w < 3; w++) { runeLog.waves++; for (let k = 0; k < n; k++) { const a = a0 + off + w * 0.35 + (k / n) * 6.28; line(g, e.x, e.y - 6, Math.cos(a), Math.sin(a), 9, T + w * 0.35, 0, 12); } } }
  if (e.move === "seal") {
    runeLog.safe++;
    for (const [rr, dt] of [[ARENA12.r - 10, 0], [ARENA12.r - 40, 0.45], [ARENA12.r - 70, 0.9]] as [number, number][]) {
      const n = Math.max(10, Math.round(rr / 7)); for (let i = 0; i < n; i++) { const a = (i / n) * 6.28; place(g, { x: center.x + Math.cos(a) * rr, y: center.y + Math.sin(a) * rr * 0.8, r: 12, t: T + dt, max: T + dt, dmg: 14 }, dt ? 0 : 1); } }
    g.mb.hazards.push({ x: center.x, y: center.y, r: 26, t: T + 0.9, max: T + 0.9, dmg: 0, foe: false, rune: 1, safe: true });
  }
  if (e.move === "echo") { const w = ECHOES[echoI++ % ECHOES.length]; e.n = ECHOES.indexOf(w); echo(g, e, w, T, a0); }
}

export function updateRune(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const b = g.mb.boss12, r = e.hp / e.max;
  let want = 1; for (let k = 1; k < PHASE_AT.length; k++) if (r <= PHASE_AT[k]) want = k + 1;
  if (want > b.phase) {
    b.phase = want; b.lockT = 1.2; e.state = "recover"; e.t = 1.3; e.move = ""; runeLog.maxPhase = want;
    g.banner = BANNERS12[want]; g.bannerT = 1.9; g.mb.hazards = g.mb.hazards.filter((h) => h.rune == null);
    shockwave(g, e);
    return [0, 0];
  }
  const spd = [1, 1, 1.05, 1.1, 1.18, 1.25, 1.35][b.phase];
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    if (e.t <= 0 || force) {
      const list = MOVES12[b.phase - 1];
      e.move = force ?? list[Math.floor(Math.random() * list.length)]; force = null;
      e.state = "tele"; e.t = TELE12[e.move] / spd; e.ax = ux; e.ay = uy; e.n = 0;
      runeLog.moves[e.move] = (runeLog.moves[e.move] ?? 0) + 1;
      telegraph(g, e, ux, uy);
      return [0, 0];
    }
    const k = dist > 60 ? 1 : dist < 34 ? -0.6 : 0;
    return [ux * 30 * k * spd, uy * 30 * k * spd];
  }
  if (e.state === "tele") {
    if (g.frame % 2 === 0) spark(g, e.x + (Math.random() - 0.5) * 30, e.y - 34 + (Math.random() - 0.5) * 26, 0, -70, 0.4, e.move === "echo" ? C_EMBER : (g.frame >> 1) % 3 ? C_CYAN : C_GOLD);
    if (e.t <= 0) {
      e.state = "act"; e.t = 0.35;
      if (e.move === "slam" || e.move === "seal" || e.move === "wall") g.shake = 6;
      if (e.move === "echo" && ECHOES[e.n] === "aurel") for (let i = 0; i < 10; i++) { shoot(g, e.x, e.y - 24, (i / 10) * 6.28, 80, 8, 2); runeLog.shots++; }
      for (let i = 0; i < 12; i++) spark(g, e.x, e.y - 30, Math.cos(i * 0.52) * 95, Math.sin(i * 0.52) * 95, 0.45, i & 1 ? C_CYAN : C_GOLD, K_RING);
    }
    return [0, 0];
  }
  if (e.state === "act") { if (e.t <= 0) { e.state = "recover"; e.t = 0.85 / spd; } return [0, 0]; }
  if (e.t <= 0) { e.state = "chase"; e.t = 0.6 / spd; }
  return [0, 0];
}

/** Defeat: runeDown + boss12 saved; story plays the Warden's last lines -> dawn -> Rook -> credits. */
export function runeKilled(g: Game, e: Enemy) {
  const b = g.mb.boss12; b.active = false; b.done = true; writeBossDone("boss12");
  const s = story(); if (s) { s.flags.runeDown = true; s.save(); }
  g.pts += 10; g.tf = 100; g.hp = g.maxHp; g.ep = g.maxEp; g.shake = 10;
  g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
  g.banner = "THE WARDEN'S WATCH ENDS"; g.bannerT = 3.8;
  g.say("+10 stat points. The last seal breaks.", 4);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  for (let i = 0; i < 56; i++) spark(g, e.x, e.y - 30, Math.cos(i / 8.9) * 210, Math.sin(i / 8.9) * 210, 1, i % 5 === 0 ? C_WHITE : i & 1 ? C_CYAN : C_GOLD, i & 1 ? K_RING : K_SPARK);
}

export function forceRuneMove(m: string) { force = m; }
const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), startRune, runeLog, ARENA12, MOVES12, BANNERS12, ECHOES, runeOf, forceRuneMove };
