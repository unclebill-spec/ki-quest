/**
 * Companions (a list on g.mb.allies; g.mb.ally is Mirela, kept for older hooks/tests).
 * - Mirela: joins after the Lantern Oath (story flag `oath`, or `mirela` in the save). Quick melee + ki bolts, teal sash.
 * - Brann Okoro: joins on story flag `brann` (or `brann` in the save). Tank/bruiser: more HP, takes less damage, slower heavier
 *   swings, and taunts nearby foes onto himself every few seconds (ai.ts aims taunted foes at him). Amber sash.
 * - Sable: joins on story flag `sableJoin` (after the Red Cage, cageDone). Ranged/support caster: holds ~70 px back from foes,
 *   fires violet ki bolts often, weak melee, and every few seconds pulses a ward-heal on the hero and nearby companions
 *   when anyone is hurt. Violet sash. Rests centred further behind the hero than the other two.
 * All follow a few steps behind the hero on opposite sides (never in a doorway, never stacked on each other), teleport beside
 * the hero when far or stuck, retreat when low, step back from boss telegraphs, are knocked out at 0 HP and revive once the
 * fight is over or on a save pad. Damage stays modest. Owner: Master Builder.
 */
import type { Game } from "../../game";
import type { Enemy } from "../enemies/types";
import { moveBody, solidAt, TILE } from "../../world";
import { CH_COMBAT, K_SPARK, K_RING, C_CYAN, C_WHITE, C_GOLD, C_VIOLET } from "../../vendor/particles";

export type AllyId = "mirela" | "brann" | "sable";
export interface Ally {
  id: AllyId; name: string; joined: boolean; tauntCd: number; taunts: number; x: number; y: number; fx: number; fy: number; hp: number; max: number; ko: boolean;
  state: "follow" | "fight" | "retreat" | "dodge"; atk: number; atkT: number; atkStep: number; boltCd: number; inv: number;
  walk: number; moving: boolean; stuckT: number; lx: number; ly: number; calmT: number; kx: number; ky: number;
  hits: number; bolts: number; teleports: number; kos: number; heals: number; healCd: number;
}
export const LEASH = 100, ALLY_MAX = 70, ALLY_RANGE = 120, ALLY_SPEED = 78;
const STORY_KEY = "kiquest.story.v1", SAVE_KEYS = ["kiquest-save-v1", "kiquest-autosave-v1"];
/** Per-companion role. flag = story flag that makes them join; the save field has the same name as the id. */
export const ROLES: Record<AllyId, { name: string; flag: string; max: number; speed: number; atkCd: number; melee: number; reach: number; armor: number; bolt: boolean; taunt: boolean; side: number; sash: string; sashD: string; back?: number; caster?: boolean; heal?: boolean }> = {
  mirela: { name: "Mirela", flag: "oath", max: ALLY_MAX, speed: ALLY_SPEED, atkCd: 0.85, melee: 1, reach: 22, armor: 1, bolt: true, taunt: false, side: 1, sash: "#3ee0c8", sashD: "#1f8a7a" },
  brann: { name: "Brann", flag: "brann", max: 130, speed: 66, atkCd: 1.35, melee: 1.45, reach: 24, armor: 0.6, bolt: false, taunt: true, side: -1, sash: "#ffb02a", sashD: "#a8621a" },
  sable: { name: "Sable", flag: "sableJoin", max: 80, speed: 74, atkCd: 1.1, melee: 0.7, reach: 20, armor: 0.9, bolt: true, taunt: false, side: 0, sash: "#c070ff", sashD: "#7a3ab8", back: 36, caster: true, heal: true },
};
export const TAUNT_R = 64, TAUNT_T = 3, TAUNT_CD = 7, HEAL_CD = 8, HEAL_HERO = 10, HEAL_ALLY = 8, CASTER_RANGE = 70;

/** True if the join flag is set or any save says they joined (old saves without the field: false). */
export function readJoined(id: AllyId = "mirela") {
  try {
    if (JSON.parse(localStorage.getItem(STORY_KEY) || "{}")?.flags?.[ROLES[id].flag] === true) return true;
    if (JSON.parse(localStorage.getItem(STORY_KEY) || "{}")?.[ROLES[id].flag] === true) return true;
    return SAVE_KEYS.some((k) => JSON.parse(localStorage.getItem(k) || "null")?.[id] === true);
  } catch { return false; }
}
export function makeAlly(id: AllyId = "mirela", joined = readJoined(id)): Ally {
  const R = ROLES[id];
  return { id, name: R.name, joined, tauntCd: 3, taunts: 0, x: -999, y: -999, fx: 0, fy: 1, hp: R.max, max: R.max, ko: false, state: "follow", atk: 0, atkT: 0, atkStep: 0, boltCd: 2,
    inv: 0, walk: 0, moving: false, stuckT: 0, lx: 0, ly: 0, calmT: 0, kx: 0, ky: 0, hits: 0, bolts: 0, teleports: 0, kos: 0, heals: 0, healCd: 4 };
}
/** Modest damage: well under the hero's (hero melee 3 + str*1.5, bolt 6 + pow*2.5). */
export const allyMelee = (g: Game, a?: Ally) => (2.5 + g.lvl * 0.5) * (a ? ROLES[a.id].melee : 1);
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
  const shielded = g.enemies.some((f) => f.kind === "pylon" && !f.dead);
  for (const e of g.enemies) { if (e.dead || (shielded && (e.kind === "vey" || e.kind === "nell")) || Math.hypot(e.x - g.p.x, e.y - g.p.y) > LEASH) continue; const d = Math.hypot(e.x - a.x, e.y - a.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
export function hurtAlly(g: Game, d: number, fx: number, fy: number, a: Ally = g.mb.ally) {
  if (!a.joined || a.ko || a.inv > 0) return;
  d *= ROLES[a.id].armor; a.hp -= d; a.inv = 0.5; const ang = Math.atan2(a.y - fy, a.x - fx); a.kx = Math.cos(ang) * 140; a.ky = Math.sin(ang) * 140;
  g.num(a.x, a.y - 34, d, "#ffc0e0");
  if (a.hp <= 0) { a.hp = 0; a.ko = true; a.kos++; a.calmT = 0; a.atk = 0; g.say(`${a.name} is down!`, 1.5); }
}

export const anyBossActive = (g: Game) => g.mb.boss.active || g.mb.boss2.active || g.mb.boss3.active || g.mb.boss4.active || g.mb.boss5.active || g.mb.boss6.active;
const isBoss = (e: Enemy) => e.kind === "boss" || e.kind === "slag" || e.kind === "aurel" || e.kind === "vey" || e.kind === "nell" || e.kind === "morvant" || e.kind === "malachar";

export function updateAllies(g: Game, dt: number) { for (const a of g.mb.allies) updateAlly(g, a, dt); separate(g); }
/** Companions never stack: push apart pairs closer than 14 px. */
function separate(g: Game) {
  const L = g.mb.allies.filter((a) => a.joined && !a.ko && a.x >= 0);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 14) { const ux = d > 0 ? dx / d : 1, uy = d > 0 ? dy / d : 0, k = (14 - d) / 2; for (const [o, sg] of [[a, -1], [b, 1]] as [Ally, number][]) { const ox = o.x, oy = o.y; moveBody(g.area, o, sg * ux * k, sg * uy * k); if (isDoorway(g, o.x, o.y) && !isDoorway(g, ox, oy)) { o.x = ox; o.y = oy; } } }
  }
}

function updateAlly(g: Game, a: Ally, dt: number) {
  const p = g.p, R = ROLES[a.id];
  if (!a.joined) { if (g.frame % 30 === 0 && readJoined(a.id)) { a.joined = true; warp(g, a); g.say(`${a.name} joins you!`, 2); } else return; }
  a.inv = Math.max(0, a.inv - dt); a.boltCd -= dt; a.tauntCd -= dt;
  const toHero = Math.hypot(p.x - a.x, p.y - a.y);
  if (toHero > 170 || a.x < 0) warp(g, a);
  // revive: on a save pad, or when no foe is near for 3 s and no boss fight
  if (a.ko) {
    const near = nearestFoe(g, a, 160);
    a.calmT = near || anyBossActive(g) ? 0 : a.calmT + dt;
    if (g.onPad || a.calmT > 3) { a.ko = false; a.hp = g.onPad ? a.max : a.max * 0.6; a.inv = 1; g.say(`${a.name} is back on their feet`, 1.5); g.parts.emit(CH_COMBAT, K_RING, a.x, a.y - 12, 0, 0, 0.4, C_CYAN); }
    a.moving = false; a.kx = a.ky = 0; return;
  }
  if (g.onPad) a.hp = a.max;
  // threats on her: foe shots, brute lunges (hazards are handled in ai.ts)
  for (const s of g.shots) if (s.foe && s.life > 0 && Math.hypot(s.x - a.x, s.y - (a.y - 14)) < 9) { s.life = 0; hurtAlly(g, s.dmg * 0.8, s.x - s.vx, s.y - s.vy, a); }
  for (const e of g.enemies) if (!e.dead && e.kind === "brute" && e.state === "act" && Math.hypot(e.x - a.x, e.y - a.y) < 14) hurtAlly(g, 6, e.x, e.y, a);
  if (a.ko) return;
  const boss = g.enemies.find((e) => !e.dead && isBoss(e) && e.state === "tele") ?? g.enemies.find((e) => !e.dead && isBoss(e));
  // support: ward-heal pulse when the hero or a companion is hurt
  if (R.heal) {
    a.healCd -= dt;
    const hurt = g.hp < g.maxHp * 0.75 || g.mb.allies.some((o) => o.joined && !o.ko && o.hp < o.max * 0.75);
    if (a.healCd <= 0 && hurt) {
      a.healCd = HEAL_CD; a.heals++; a.atk = 0.3; a.atkStep = 4;
      if (Math.hypot(p.x - a.x, p.y - a.y) < 110) g.hp = Math.min(g.maxHp, g.hp + HEAL_HERO);
      for (const o of g.mb.allies) if (o.joined && !o.ko && Math.hypot(o.x - a.x, o.y - a.y) < 110) o.hp = Math.min(o.max, o.hp + HEAL_ALLY);
      g.parts.emit(CH_COMBAT, K_RING, a.x, a.y - 14, 0, 0, 0.5, C_VIOLET); g.parts.emit(CH_COMBAT, K_RING, p.x, p.y - 14, 0, 0, 0.4, C_VIOLET);
      g.nums.push({ x: p.x, y: p.y - 40, txt: "WARD +" + HEAL_HERO, col: "#c070ff", t: 0.9, big: false });
    }
  }
  const foe = nearestFoe(g, a, ALLY_RANGE);
  // rest spots: behind the hero, Mirela on one side and Brann on the other
  const sd = R.side, bk = R.back ?? 22;
  let tx = p.x - p.fx * bk + p.fy * 12 * sd, ty = p.y - p.fy * (bk - 6) - p.fx * 8 * sd, sp = R.speed;
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
    if (R.taunt && a.tauntCd <= 0) {
      // taunt: nearby non-boss foes turn on him for a few seconds
      let n = 0; for (const e of g.enemies) if (!e.dead && !isBoss(e) && Math.hypot(e.x - a.x, e.y - a.y) < TAUNT_R) { e.taunt = TAUNT_T; e.tauntBy = a.id; n++; }
      if (n) { a.tauntCd = TAUNT_CD; a.taunts++; g.parts.emit(CH_COMBAT, K_RING, a.x, a.y - 16, 0, 0, 0.45, C_GOLD); g.nums.push({ x: a.x, y: a.y - 40, txt: "TAUNT!", col: "#ffb02a", t: 0.9, big: false }); }
    }
    if (R.bolt && a.boltCd <= 0 && (R.caster ? d > 28 : d > 40 && Math.random() < 0.04)) {
      a.boltCd = R.caster ? 1.5 + Math.random() * 0.6 : 3.5 + Math.random() * 2; a.bolts++; a.atk = 0.3; a.atkStep = 4;
      g.shots.push({ x: a.x + a.fx * 8, y: a.y - 14, vx: a.fx * 200, vy: a.fy * 200, life: R.caster ? 0.9 : 0.8, foe: false, dmg: allyBolt(g) * (R.caster ? 0.8 : 1), tech: 0 });
    }
    if (R.caster) { tx = foe.x - (dx / d) * CASTER_RANGE; ty = foe.y - (dy / d) * CASTER_RANGE; if (isDoorway(g, tx, ty) || !free(g, tx, ty)) { tx = a.x; ty = a.y; } }
    else { tx = foe.x - (dx / d) * 16; ty = foe.y - (dy / d) * 4; }
    if (d < R.reach && a.atkT <= 0) {
      a.atkT = R.atkCd; a.atk = 0.28; a.atkStep = a.atkStep % 3 + 1; a.hits++;
      const crit = Math.random() < 0.08;
      g.damageFoe(foe, allyMelee(g, a) * (crit ? 1.6 : 1), a.fx * (R.taunt ? 90 : 40), a.fy * (R.taunt ? 90 : 40), crit);
      if (R.taunt) g.shake = Math.max(g.shake, 1);
      g.parts.emit(CH_COMBAT, K_SPARK, foe.x, foe.y - 10, a.fx * 50, -20, 0.2, C_WHITE);
    }
  } else a.state = "follow";
  a.atkT -= dt; a.atk = Math.max(0, a.atk - dt);
  // never park in a doorway: slide the rest spot back toward the hero side
  if (a.state === "follow" && (isDoorway(g, tx, ty) || !free(g, tx, ty))) {
    const c: [number, number][] = [[(tx + p.x) / 2 - p.fx * 4, (ty + p.y) / 2 - p.fy * 4], [p.x + p.fy * 16 * sd, p.y - p.fx * 16 * sd], [p.x - p.fy * 16 * sd, p.y + p.fx * 16 * sd],
      [p.x - p.fx * 20, p.y - p.fy * 20], [p.x + p.fx * 18 + p.fy * 14 * sd, p.y + p.fy * 18 - p.fx * 14 * sd], [p.x + 18 * sd, p.y], [p.x, p.y + 18 * sd], [p.x - 18 * sd, p.y], [p.x, p.y - 18 * sd]];
    const ok = c.find(([x, y]) => !isDoorway(g, x, y) && free(g, x, y)); if (ok) [tx, ty] = ok;
  }
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
  if (anyBossActive(g) && a.state !== "dodge" && toHero > 120) warp(g, a);
}
