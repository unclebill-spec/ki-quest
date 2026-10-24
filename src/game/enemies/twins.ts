/**
 * Stair boss: THE CAGEWARD TWINS, Vey (red, chain-hook) and Nell (violet, cage-lantern), jailers of the Red Cage
 * (sheets public/art/chars/cageward_vey.* / cageward_nell.*). Arena = STAIR_CAGE in src/areas/maps.ts; the three cage pylons
 * stand on the `C` tiles (21,14) (27,14) (24,18). Linked fight, 3 phases (shared BossState g.mb.boss4):
 *   P1 LOCKED   while any pylon stands both twins are shielded (hits do 0, violet ward ring). Pylons are static foes (60 HP).
 *               Vey: chain (line slam telegraph) · Nell: orbs (lantern orb fan, charge glow). One twin acts at a time.
 *   P2 OPEN     last pylon breaks: shockwave, shields drop. They share/swap kits: each may use the other's move, plus the linked
 *               moves swap (both blink to each other's spot, rings at both) and cross (both dash through the hero, two lines).
 *   P3 ENRAGED  one twin falls: shockwave, the survivor enrages (x1.35 speed, both kits, + rage: spiral of cage sparks).
 * Every move telegraphs first (state "tele", e.move); ground warnings carry `cage: true` and are drawn red/violet.
 * Reward (both down): Cage Key, +6 stat points, full HP/EP/power, saved kiquest-mb-v1 {boss4:true}, story flag cageDone
 * (the world then plays Sable's join beat and sets sableJoin). Owner: Master Builder.
 */
import type { Game } from "../../game";
import { Enemy, FoeKind, Hazard, makeEnemy } from "./types";
import { freeNear, shoot } from "./ai";
import { STAIR_CAGE } from "../../areas/maps";
import { writeBossDone } from "../combat/state";
import { hurtAlly } from "../combat/companion";
import { CH_COMBAT, K_RING, K_SPARK, C_WHITE, C_RED, C_VIOLET } from "../../vendor/particles";

export const ARENA4 = { area: "stair", tx: STAIR_CAGE.tx, ty: STAIR_CAGE.ty, r: STAIR_CAGE.r * 16 + 8 };
export const PYLON_TILES: [number, number][] = [[21, 14], [27, 14], [24, 18]];
export const MOVES4: Record<string, string[][]> = {
  vey: [["chain"], ["chain", "orbs", "swap", "cross"], ["chain", "orbs", "rage", "chain"]],
  nell: [["orbs"], ["orbs", "chain", "swap", "cross"], ["orbs", "chain", "rage", "orbs"]],
};
export const TELE4: Record<string, number> = { chain: 0.75, orbs: 0.8, swap: 0.9, cross: 0.85, rage: 1.0 };
export const twinsLog = { shocks: 0, moves: {} as Record<string, number>, shieldedHits: 0, pylons: 0, swaps: 0, crosses: 0, linked: 0, enraged: "" as string, rageSpeed: 1, maxBusy: 0 };
let center = { x: 0, y: 0 };
export const arena4Center = () => center;
export const isTwin = (k: string) => k === "vey" || k === "nell";
export const twinsOf = (g: Game) => g.enemies.filter((e) => isTwin(e.kind) && !e.dead);
export const pylonsOf = (g: Game) => g.enemies.filter((e) => e.kind === "pylon" && !e.dead);
const other = (g: Game, e: Enemy) => twinsOf(g).find((f) => f !== e);
const C = (t: number) => t * 16 + 8;
function place(g: Game, h: Omit<Hazard, "foe" | "cage">) { g.mb.hazards.push({ ...h, foe: true, cage: true }); }

export function startTwins(g: Game) {
  const b = g.mb.boss4; center = { x: C(ARENA4.tx), y: C(ARENA4.ty) };
  b.active = true; b.phase = 1; b.introT = 2.2; b.lockT = 0.8;
  for (const f of g.enemies) if (!f.dead && Math.hypot(f.x - center.x, f.y - center.y) < ARENA4.r + 30) { f.dead = true; f.respawn = 30; }
  const a = freeNear(g.area, ARENA4.tx - 2, ARENA4.ty - 1), c = freeNear(g.area, ARENA4.tx + 2, ARENA4.ty - 1);
  for (const [k, at] of [["vey", a], ["nell", c]] as [FoeKind, { x: number; y: number }][]) { const e = makeEnemy(k, at.x, at.y); e.state = "recover"; e.t = k === "vey" ? 1.4 : 2.3; g.enemies.push(e); }
  for (const [tx, ty] of PYLON_TILES) { const p = makeEnemy("pylon", C(tx), C(ty) + 6); p.state = "idle"; g.enemies.push(p); }
  g.banner = "THE CAGEWARD TWINS"; g.bannerT = 2.5; g.shake = 4;
}

export function updateArena4(g: Game, dt: number) {
  const b = g.mb.boss4, p = g.p;
  b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt);
  if (g.area.id === ARENA4.area && !b.active && !b.done && Math.hypot(p.x - C(ARENA4.tx), p.y - C(ARENA4.ty)) < ARENA4.r - 24) startTwins(g);
  if (!b.active) return;
  const dx = p.x - center.x, dy = p.y - center.y, d = Math.hypot(dx, dy);
  if (d > ARENA4.r) { p.x = center.x + (dx / d) * ARENA4.r; p.y = center.y + (dy / d) * ARENA4.r; p.kx = -dx * 2; p.ky = -dy * 2; }
  // pylons are rooted
  for (const e of g.enemies) if (e.kind === "pylon") { e.x = e.hx; e.y = e.hy; e.vx = e.vy = 0; }
  const busy = twinsOf(g).filter((e) => e.state === "tele" || e.state === "act").length; twinsLog.maxBusy = Math.max(twinsLog.maxBusy, busy);
  if (b.phase === 1 && pylonsOf(g).length === 0) {
    b.phase = 2; b.lockT = 1; g.banner = "THE CAGE IS OPEN"; g.bannerT = 1.8;
    for (const e of twinsOf(g)) { e.state = "recover"; e.t = 1.1; e.move = ""; shockwave(g, e); }
  }
}
/** Twins take no damage while any pylon stands. */
export function twinShielded(g: Game, e: Enemy) { return isTwin(e.kind) && (g.mb.boss4.lockT > 0 || pylonsOf(g).length > 0); }

function shockwave(g: Game, e: Enemy) {
  twinsLog.shocks++;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; place(g, { x: e.x + Math.cos(a) * 34, y: e.y + Math.sin(a) * 22, r: 13, t: 0.45, max: 0.45, dmg: 8 }); }
  for (let i = 0; i < 14; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 18, Math.cos(i * 0.45) * 150, Math.sin(i * 0.45) * 150, 0.55, e.kind === "vey" ? C_RED : C_VIOLET, 0, 2);
  for (const o of [g.p, ...g.mb.allies.filter((a) => a.joined && !a.ko)]) { const d = Math.hypot(o.x - e.x, o.y - e.y) || 1; if (d < 90) { o.kx = ((o.x - e.x) / d) * 220; o.ky = ((o.y - e.y) / d) * 220; } }
  g.shake = 6;
}
function line(g: Game, x: number, y: number, ux: number, uy: number, T: number, n = 7) {
  for (let k = 1; k <= n; k++) place(g, { x: x + ux * k * 16, y: y + uy * k * 16, r: 11, t: T + k * 0.04, max: T + k * 0.04, dmg: 10 });
}
function begin(g: Game, e: Enemy, mv: string, ux: number, uy: number, spd: number) {
  e.move = mv; e.state = "tele"; e.t = TELE4[mv] / spd; e.ax = ux; e.ay = uy; e.n = 0;
  twinsLog.moves[mv] = (twinsLog.moves[mv] ?? 0) + 1;
  const T = e.t, p = g.p;
  if (mv === "chain") line(g, e.x, e.y, ux, uy, T);
  if (mv === "cross") line(g, e.x, e.y, ux, uy, T, 9);
  if (mv === "swap") { const o = other(g, e); if (o) { place(g, { x: e.x, y: e.y, r: 22, t: T, max: T, dmg: 9 }); place(g, { x: o.x, y: o.y, r: 22, t: T, max: T, dmg: 9 }); } }
  if (mv === "rage") for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28 * 2, r = 24 + i * 4; place(g, { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.75, r: 12, t: T + i * 0.06, max: T + i * 0.06, dmg: 10 }); }
  void p;
}

export function updateTwin(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const b = g.mb.boss4, p = g.p, o = other(g, e);
  const spd = b.phase >= 3 ? 1.35 : 1; if (b.phase >= 3) twinsLog.rageSpeed = spd;
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    const partnerBusy = o && (o.state === "tele" || o.state === "act");
    if (e.t <= 0 && !partnerBusy && b.lockT <= 0) {
      const list = MOVES4[e.kind][b.phase - 1];
      let mv = list[Math.floor(Math.random() * list.length)];
      if ((mv === "swap" || mv === "cross") && !o) mv = e.kind === "vey" ? "chain" : "orbs";
      if (mv === "swap" || mv === "cross") {
        // linked move: both twins telegraph together
        twinsLog.linked++; begin(g, e, mv, ux, uy, spd);
        if (o) { const ox = p.x - o.x, oy = p.y - o.y, od = Math.hypot(ox, oy) || 1; begin(g, o, mv, ox / od, oy / od, spd); o.t = e.t; }
      } else begin(g, e, mv, ux, uy, spd);
      return [0, 0];
    }
    // keep apart from the partner (flank the hero) at mid range
    const side = e.kind === "vey" ? 1 : -1, want = dist > 70 ? 1 : dist < 40 ? -0.7 : 0;
    return [(ux * want - uy * 0.5 * side) * 42 * spd, (uy * want + ux * 0.5 * side) * 42 * spd];
  }
  if (e.state === "tele") {
    if (e.move === "chain" || e.move === "cross") { /* aim locked: the line on the ground is the attack */ }
    if (g.frame % 5 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x + (Math.random() - 0.5) * 22, e.y - 22, 0, -50, 0.35, e.kind === "vey" ? C_RED : C_VIOLET);
    if (e.t <= 0) {
      e.state = "act"; e.t = e.move === "cross" ? 0.42 : 0.25;
      if (e.move === "orbs") { const a0 = Math.atan2(p.y - e.y, p.x - e.x), n = b.phase >= 3 ? 7 : 5; for (let i = 0; i < n; i++) shoot(g, e.x, e.y - 16, a0 + (i - (n - 1) / 2) * 0.22, 105, 7); }
      if (e.move === "swap" && o && e.kind === "vey") { const x = e.x, y = e.y; e.x = o.x; e.y = o.y; o.x = x; o.y = y; twinsLog.swaps++; g.shake = 3; for (const q of [e, o]) g.parts.emit(CH_COMBAT, K_RING, q.x, q.y - 16, 0, 0, 0.4, C_VIOLET); }
      if (e.move === "chain" || e.move === "rage") g.shake = 3;
    }
    return [0, 0];
  }
  if (e.state === "act") {
    if (e.move === "cross") {
      if (e.n === 0 && e.kind === "vey") { twinsLog.crosses++; e.n = 1; }
      if (Math.hypot(p.x - e.x, p.y - e.y) < 18) g.hurtHero(10, e.x, e.y);
      for (const a of g.mb.allies) if (a.joined && !a.ko && Math.hypot(a.x - e.x, a.y - e.y) < 18) hurtAlly(g, 7, e.x, e.y, a);
      if (e.t <= 0) { e.state = "recover"; e.t = 1 / spd; return [0, 0]; }
      return [e.ax * 300 * spd, e.ay * 300 * spd];
    }
    if (e.t <= 0) { e.state = "recover"; e.t = 0.9 / spd; }
    return [0, 0];
  }
  if (e.t <= 0) { e.state = "chase"; e.t = (b.phase >= 3 ? 0.5 : 0.9) + Math.random() * 0.4; }
  return [0, 0];
}

/** A pylon or a twin died. Survivor enrages; both down = reward. */
export function twinKilled(g: Game, e: Enemy) {
  const b = g.mb.boss4;
  if (e.kind === "pylon") { twinsLog.pylons++; g.say(`Cage pylon shattered! (${3 - pylonsOf(g).length}/3)`, 1.5); for (let i = 0; i < 10; i++) g.parts.emit(CH_COMBAT, K_SPARK, e.x, e.y - 14, Math.cos(i) * 110, Math.sin(i) * 110 - 30, 0.5, C_RED, 120, 2); return; }
  const s = other(g, e);
  if (s) {
    b.phase = 3; b.lockT = 1; twinsLog.enraged = s.kind; s.state = "recover"; s.t = 1.2; s.move = "";
    g.banner = `${s.kind === "vey" ? "VEY" : "NELL"} ENRAGES`; g.bannerT = 2; shockwave(g, s);
    return;
  }
  b.active = false; b.done = true; writeBossDone("boss4");
  const st = (window as unknown as { __ki?: { story?: { flags: Record<string, unknown>; save(): void } } }).__ki?.story; if (st) { st.flags.cageDone = true; st.save(); }
  g.pts += 6; g.tf = 100; g.hp = g.maxHp; g.ep = g.maxEp; g.shake = 6;
  for (const m of g.enemies) if (m.minion || m.kind === "pylon") { m.dead = true; m.respawn = Infinity; }
  g.mb.hazards.length = 0; g.shots = g.shots.filter((q) => !q.foe);
  g.banner = "THE RED CAGE BREAKS"; g.bannerT = 3;
  g.say("Cage Key obtained! +6 stat points, power meter full", 4);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  for (let i = 0; i < 14; i++) g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, e.x, e.y - 22, Math.cos(i / 2.2) * 150, Math.sin(i / 2.2) * 150, 0.7, C_WHITE, 0, 2);
}

const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), startTwins, twinsLog, ARENA4, MOVES4, PYLON_TILES, twinsOf, pylonsOf };
