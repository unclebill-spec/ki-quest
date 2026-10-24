/**
 * Mirela, companion fighter (joins after the Lantern Oath: story flag `oath` in kiquest.story.v1, or `mirela` in the game save).
 * Follows a few steps behind the hero (never parks in a doorway), teleports beside the hero when far or stuck,
 * melees the nearest foe in range, sometimes fires a ki bolt, retreats when low, steps back from boss telegraphs.
 * Knocked out at 0 HP; revives once the fight is over (no foes near for a few seconds) or on a save pad. Owner: Master Builder.
 */
import type { Game } from "../../game";
import type { Enemy } from "../enemies/types";
import { moveBody, solidAt, TILE } from "../../world";
import { CH_COMBAT, K_SPARK, K_RING, C_CYAN, C_WHITE } from "../../vendor/particles";

export interface Ally {
  joined: boolean; x: number; y: number; fx: number; fy: number; hp: number; max: number; ko: boolean;
  state: "follow" | "fight" | "retreat" | "dodge"; atk: number; atkT: number; atkStep: number; boltCd: number; inv: number;
  walk: number; moving: boolean; stuckT: number; lx: number; ly: number; calmT: number; kx: number; ky: number;
  hits: number; bolts: number; teleports: number; kos: number;
}
export const LEASH = 100, ALLY_MAX = 70, ALLY_RANGE = 120, ALLY_SPEED = 78;
const STORY_KEY = "kiquest.story.v1", SAVE_KEYS = ["kiquest-save-v1", "kiquest-autosave-v1"];

/** True if the Lantern Oath flag is set or any save says she joined (old saves without the field: false). */
export function readJoined() {
  try {
    if (JSON.parse(localStorage.getItem(STORY_KEY) || "{}")?.oath === true) return true;
    return SAVE_KEYS.some((k) => JSON.parse(localStorage.getItem(k) || "null")?.mirela === true);
  } catch { return false; }
}
export function makeAlly(joined = readJoined()): Ally {
  return { joined, x: -999, y: -999, fx: 0, fy: 1, hp: ALLY_MAX, max: ALLY_MAX, ko: false, state: "follow", atk: 0, atkT: 0, atkStep: 0, boltCd: 2,
    inv: 0, walk: 0, moving: false, stuckT: 0, lx: 0, ly: 0, calmT: 0, kx: 0, ky: 0, hits: 0, bolts: 0, teleports: 0, kos: 0 };
}
/** Modest damage: well under the hero's (hero melee 3 + str*1.5, bolt 6 + pow*2.5). */
export const allyMelee = (g: Game) => 2.5 + g.lvl * 0.5;
export const allyBolt = (g: Game) => 4 + g.lvl * 0.7;

const free = (g: Game, x: number, y: number) => !solidAt(g.area, x - 5, y - 3) && !solidAt(g.area, x + 5, y - 3) && !solidAt(g.area, x - 5, y + 2) && !solidAt(g.area, x + 5, y + 2);
/** A doorway / 1-tile gap: walls on both sides along one axis. */
export function isDoorway(g: Game, x: number, y: number) {
  const s = (dx: number, dy: number) => solidAt(g.area, x + dx * TILE, y + dy * TILE);
  return (s(-1, 0) && s(1, 0)) || (s(0, -1) && s(0, 1));
}
/** Teleport beside the hero on the first free, non-doorway spot (behind first). */
function warp(g: Game, a: Ally) {
  const p = g.p;
  for (const r of [18, 26, 34]) for (let k = 0; k < 8; k++) {
    const ang = Math.atan2(-p.fy, -p.fx) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 4);
    const x = p.x + Math.cos(ang) * r, y = p.y + Math.sin(ang) * r;
    if (free(g, x, y) && !isDoorway(g, x, y)) { a.x = x; a.y = y; a.stuckT = 0; a.teleports++; g.parts.emit(CH_COMBAT, K_RING, x, y - 12, 0, 0, 0.3, C_CYAN); return; }
  }
  a.x = p.x; a.y = p.y; a.teleports++;
}
function nearestFoe(g: Game, a: Ally, r: number) {
  let best: Enemy | null = null, bd = r;
  for (const e of g.enemies) { if (e.dead || Math.hypot(e.x - g.p.x, e.y - g.p.y) > LEASH) continue; const d = Math.hypot(e.x - a.x, e.y - a.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
export function hurtAlly(g: Game, d: number, fx: number, fy: number) {
  const a = g.mb.ally; if (!a.joined || a.ko || a.inv > 0) return;
  a.hp -= d; a.inv = 0.5; const ang = Math.atan2(a.y - fy, a.x - fx); a.kx = Math.cos(ang) * 140; a.ky = Math.sin(ang) * 140;
  g.num(a.x, a.y - 34, d, "#ffc0e0");
  if (a.hp <= 0) { a.hp = 0; a.ko = true; a.kos++; a.calmT = 0; a.atk = 0; g.say("Mirela is down!", 1.5); }
}

export function updateAlly(g: Game, dt: number) {
  const a = g.mb.ally, p = g.p;
  if (!a.joined) { if (g.frame % 30 === 0 && readJoined()) { a.joined = true; warp(g, a); g.say("Mirela joins you!", 2); } else return; }
  a.inv = Math.max(0, a.inv - dt); a.boltCd -= dt;
  const toHero = Math.hypot(p.x - a.x, p.y - a.y);
  if (toHero > 170 || a.x < 0) warp(g, a);
  // revive: on a save pad, or when no foe is near for 3 s and no boss fight
  if (a.ko) {
    const near = nearestFoe(g, a, 160);
    a.calmT = near || g.mb.boss.active ? 0 : a.calmT + dt;
    if (g.onPad || a.calmT > 3) { a.ko = false; a.hp = g.onPad ? a.max : a.max * 0.6; a.inv = 1; g.say("Mirela is back on her feet", 1.5); g.parts.emit(CH_COMBAT, K_RING, a.x, a.y - 12, 0, 0, 0.4, C_CYAN); }
    a.moving = false; a.kx = a.ky = 0; return;
  }
  if (g.onPad) a.hp = a.max;
  // threats on her: foe shots, brute lunges (hazards are handled in ai.ts)
  for (const s of g.shots) if (s.foe && s.life > 0 && Math.hypot(s.x - a.x, s.y - (a.y - 14)) < 9) { s.life = 0; hurtAlly(g, s.dmg * 0.8, s.x - s.vx, s.y - s.vy); }
  for (const e of g.enemies) if (!e.dead && e.kind === "brute" && e.state === "act" && Math.hypot(e.x - a.x, e.y - a.y) < 14) hurtAlly(g, 6, e.x, e.y);
  if (a.ko) return;
  const boss = g.enemies.find((e) => !e.dead && e.kind === "boss");
  const foe = nearestFoe(g, a, ALLY_RANGE);
  let tx = p.x - p.fx * 22 + p.fy * 10, ty = p.y - p.fy * 16 - p.fx * 6, sp = ALLY_SPEED;
  if (boss && boss.state === "tele") {
    a.state = "dodge"; const d = Math.hypot(a.x - boss.x, a.y - boss.y) || 1;
    tx = boss.x + ((a.x - boss.x) / d) * 110; ty = boss.y + ((a.y - boss.y) / d) * 110; sp = 110;
  } else if (a.hp < a.max * 0.3) {
    a.state = "retreat"; tx = p.x - p.fx * 30; ty = p.y - p.fy * 30;
    if (foe) { const d = Math.hypot(a.x - foe.x, a.y - foe.y) || 1; tx += ((a.x - foe.x) / d) * 30; ty += ((a.y - foe.y) / d) * 30; }
    sp = 100;
  } else if (foe && toHero < LEASH) {
    a.state = "fight"; const dx = foe.x - a.x, dy = foe.y - a.y, d = Math.hypot(dx, dy) || 1;
    a.fx = dx / d; a.fy = dy / d;
    if (a.boltCd <= 0 && d > 40 && Math.random() < 0.04) {
      a.boltCd = 3.5 + Math.random() * 2; a.bolts++; a.atk = 0.3; a.atkStep = 4;
      g.shots.push({ x: a.x + a.fx * 8, y: a.y - 14, vx: a.fx * 200, vy: a.fy * 200, life: 0.8, foe: false, dmg: allyBolt(g), tech: 0 });
    }
    tx = foe.x - (dx / d) * 16; ty = foe.y - (dy / d) * 4;
    if (d < 22 && a.atkT <= 0) {
      a.atkT = 0.85; a.atk = 0.28; a.atkStep = a.atkStep % 3 + 1; a.hits++;
      const crit = Math.random() < 0.08;
      g.damageFoe(foe, allyMelee(g) * (crit ? 1.6 : 1), a.fx * 40, a.fy * 40, crit);
      g.parts.emit(CH_COMBAT, K_SPARK, foe.x, foe.y - 10, a.fx * 50, -20, 0.2, C_WHITE);
    }
  } else a.state = "follow";
  a.atkT -= dt; a.atk = Math.max(0, a.atk - dt);
  // never park in a doorway: slide the rest spot back toward the hero side
  if (a.state === "follow" && isDoorway(g, tx, ty)) { tx = (tx + p.x) / 2 - p.fx * 4; ty = (ty + p.y) / 2 - p.fy * 4; if (isDoorway(g, tx, ty)) { tx = p.x + p.fy * 16; ty = p.y - p.fx * 16; } }
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  const stop = a.state === "follow" ? 6 : 3;
  a.moving = d > stop && a.atk <= 0;
  let vx = 0, vy = 0;
  if (a.moving) { const s = (a.state === "follow" && d > 60 ? sp * 1.5 : sp) * Math.min(1, d / 20); vx = (dx / d) * s; vy = (dy / d) * s; if (a.state === "follow") { a.fx = dx / d; a.fy = dy / d; } }
  a.walk += dt * (a.moving ? 9 : 0);
  const bx = a.x, by = a.y;
  moveBody(g.area, a, (vx + a.kx) * dt, (vy + a.ky) * dt);
  a.kx *= Math.pow(0.002, dt); a.ky *= Math.pow(0.002, dt);
  // don't overlap the hero
  const hx = a.x - p.x, hy = a.y - p.y, hd = Math.hypot(hx, hy);
  if (hd > 0 && hd < 12) moveBody(g.area, a, (hx / hd) * (12 - hd), (hy / hd) * (12 - hd));
  // stuck: wanted to move but barely did
  const moved = Math.hypot(a.x - bx, a.y - by);
  if (a.moving && d > 20 && moved < 8 * dt) a.stuckT += dt; else a.stuckT = Math.max(0, a.stuckT - dt);
  if (a.stuckT > 0.8 || !free(g, a.x, a.y)) warp(g, a);
  // boss arena barrier applies to her too
  if (g.mb.boss.active && a.state !== "dodge" && toHero > 120) warp(g, a);
}
