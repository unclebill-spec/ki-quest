/** Enemy AI, hit reactions, EXP orb drops and hazards. Owner: Master Builder. */
import type { Game } from "../../game";
import { Enemy, FOE_INFO, makeEnemy } from "./types";
import { moveBody, solidAt, TILE, Area } from "../../world";
import { CH_COMBAT, K_SPARK, K_RING, K_DUST, C_GOLD, C_CYAN, C_DUST, C_RED } from "../../vendor/particles";
import { meterGain, TF_HIT } from "../combat/powerup";
import { updateBoss, bossKilled } from "./boss";
import { hurtAlly } from "../combat/companion";

/** Extra spawns this module adds to the area (wardens), on open floor near the given tiles. */
export function extraSpawns(a: Area): { kind: "warden"; x: number; y: number }[] {
  const at: Record<string, number[][]> = { lanternmoss: [[28, 16], [36, 28], [16, 20]], hushwater: [[20, 21], [30, 24]] };
  return (at[a.id] ?? []).map(([tx, ty]) => ({ kind: "warden" as const, ...freeNear(a, tx, ty) }));
}
export function freeNear(a: Area, tx: number, ty: number) {
  for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = (tx + dx) * TILE + 8, y = (ty + dy) * TILE + 8;
    if (!solidAt(a, x, y) && !solidAt(a, x - 8, y) && !solidAt(a, x + 8, y)) return { x, y };
  }
  return { x: tx * TILE + 8, y: ty * TILE + 8 };
}

/** Called from Game.damageFoe before applying damage. Returns adjusted damage/knockback. */
export function onFoeHit(g: Game, e: Enemy, d: number, kx: number, ky: number, crit: boolean, pierce = false) {
  if (e.kind === "boss" && g.mb.boss.lockT > 0) return { d: 0, kx: 0, ky: 0, blocked: true };
  if (e.kind === "warden" && e.guard) {
    const n = Math.hypot(kx, ky) || 1, front = (kx / n) * e.ax + (ky / n) * e.ay < -0.2;
    if (front) {
      if (pierce || crit) { e.guard = false; e.state = "recover"; e.t = 1.3; g.say("Guard broken!", 0.8); g.stats.guardBreaks = (g.stats.guardBreaks ?? 0) + 1; }
      else {
        g.stats.guarded = (g.stats.guarded ?? 0) + 1;
        g.parts.emit(CH_COMBAT, K_RING, e.x + e.ax * 8, e.y - 12 + e.ay * 6, 0, 0, 0.18, C_CYAN);
        return { d: d * 0.15, kx: kx * 0.1, ky: ky * 0.1, blocked: true };
      }
    }
  }
  meterGain(g, TF_HIT);
  e.hurt = e.kind === "boss" ? 0.04 : crit ? 0.35 : 0.16;
  return { d, kx: kx * e.heavy, ky: ky * e.heavy, blocked: false };
}

export function onFoeKill(g: Game, e: Enemy) {
  const info = FOE_INFO[e.kind];
  e.respawn = info.respawn;
  const n = e.kind === "boss" ? 10 : 3, each = Math.ceil(info.exp / n);
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.28; g.mb.orbs.push({ x: e.x, y: e.y - 8, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 30, v: each, t: 0 }); }
  if (e.kind === "boss") bossKilled(g, e);
}

function shoot(g: Game, x: number, y: number, ang: number, sp: number, dmg: number, life = 2.4) {
  g.shots.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life, foe: true, dmg });
  g.stats.foeShots++;
}
export { shoot };

export function updateFoes(g: Game, dt: number) {
  const p = g.p;
  for (const e of g.enemies) {
    if (e.dead) {
      e.respawn -= dt;
      if (e.respawn <= 0 && Math.hypot(e.hx - p.x, e.hy - p.y) > 220) Object.assign(e, makeEnemy(e.kind, e.hx, e.hy));
      continue;
    }
    e.flash = Math.max(0, e.flash - dt);
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
    let wx = 0, wy = 0;
    e.t -= dt;
    if (e.hurt > 0) { e.hurt -= dt; if (e.state === "tele" && e.kind !== "boss" && e.kind !== "warden") { e.state = "recover"; e.t = 0.3; } }
    else if (e.kind === "boss") [wx, wy] = updateBoss(g, e, dt, ux, uy, dist);
    else if (e.kind === "brute") {
      // melee rusher: chase, "!" + lunge-line telegraph, lunge
      if (e.state === "idle") { e.wander += dt; wx = Math.cos(e.wander * 0.7) * 14; wy = Math.sin(e.wander * 0.5) * 14; if (dist < 120) e.state = "chase"; }
      else if (e.state === "chase") { wx = ux * 46; wy = uy * 46; if (dist > 200) e.state = "idle"; if (dist < 30) { e.state = "tele"; e.t = 0.5; e.ax = ux; e.ay = uy; } }
      else if (e.state === "tele") { if (e.t <= 0) { e.state = "act"; e.t = 0.22; } }
      else if (e.state === "act") { wx = e.ax * 210; wy = e.ay * 210; if (Math.hypot(p.x - e.x, p.y - e.y) < 14) g.hurtHero(8, e.x, e.y); if (e.t <= 0) { e.state = "recover"; e.t = 0.6; } }
      else if (e.t <= 0) e.state = "chase";
    } else if (e.kind === "wisp") {
      // ranged shooter: keeps 80-110 px, strafes, charge-glow telegraph, orb shot
      if (e.state === "idle") { e.wander += dt; wx = Math.cos(e.wander) * 18; wy = Math.sin(e.wander * 1.3) * 18; if (dist < 150) e.state = "chase"; }
      else if (e.state === "chase") {
        const want = dist < 80 ? -1 : dist > 110 ? 1 : 0;
        wx = ux * 36 * want - uy * 20; wy = uy * 36 * want + ux * 20;
        if (dist > 230) e.state = "idle";
        if (e.t <= -1.4 && dist < 150) { e.state = "tele"; e.t = 0.7; }
      } else if (e.state === "tele") { if (e.t <= 0) { shoot(g, e.x, e.y - 14, Math.atan2(uy, ux), 95, 6); e.state = "recover"; e.t = 0.5; } }
      else if (e.t <= 0) { e.state = "chase"; e.t = 0; }
    } else {
      // tank/blocker: slow advance with a front shield; plants and slams (ring telegraph); shield drops while recovering
      if (e.state !== "recover" && e.state !== "act") { e.ax += (ux - e.ax) * Math.min(1, dt * 3); e.ay += (uy - e.ay) * Math.min(1, dt * 3); const n = Math.hypot(e.ax, e.ay) || 1; e.ax /= n; e.ay /= n; }
      if (e.state === "idle") { if (dist < 130) e.state = "chase"; }
      else if (e.state === "chase") { e.guard = true; wx = ux * 24; wy = uy * 24; if (dist > 220) e.state = "idle"; if (dist < 38) { e.state = "tele"; e.t = 0.85; g.mb.hazards.push({ x: e.x, y: e.y, r: 38, t: 0.85, max: 0.85, dmg: 12, foe: true }); } }
      else if (e.state === "tele") { if (e.t <= 0) { e.state = "act"; e.t = 0.15; g.shake = 2; } }
      else if (e.state === "act") { if (e.t <= 0) { e.state = "recover"; e.t = 1.1; e.guard = false; } }
      else if (e.t <= 0) { e.state = "chase"; e.guard = true; }
    }
    moveBody(g.area, e, (wx + e.vx) * dt, (wy + e.vy) * dt, e.kind === "boss" ? 12 : 6);
    e.vx *= Math.pow(0.004, dt); e.vy *= Math.pow(0.004, dt);
  }
  // keep foes from stacking
  const L = g.enemies;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j];
    if (a.dead || b.dead) continue;
    const R = a.kind === "boss" || b.kind === "boss" ? 26 : 16;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < R) { const k = (R - d) / 2 / d; moveBody(g.area, a, -dx * k * a.heavy, -dy * k * a.heavy, 6); moveBody(g.area, b, dx * k * b.heavy, dy * k * b.heavy, 6); }
  }
  updateHazards(g, dt);
  updateOrbs(g, dt);
}

function updateHazards(g: Game, dt: number) {
  const p = g.p;
  for (const h of g.mb.hazards) {
    h.t -= dt;
    if (h.t <= 0 && h.max > 0) {
      h.max = 0;
      if (Math.hypot(p.x - h.x, (p.y - h.y) * 1.6) < h.r) g.hurtHero(h.dmg, h.x, h.y);
      const al = g.mb.ally; if (al.joined && Math.hypot(al.x - h.x, (al.y - h.y) * 1.6) < h.r) hurtAlly(g, h.dmg * 0.8, h.x, h.y);
      g.parts.emit(CH_COMBAT, K_RING, h.x, h.y - 2, 0, 0, 0.3, C_RED);
      for (let i = 0; i < 6; i++) g.parts.emit(CH_COMBAT, K_DUST, h.x + Math.cos(i) * h.r * 0.7, h.y + Math.sin(i) * h.r * 0.4, Math.cos(i) * 40, -20, 0.3, C_DUST, 60);
    }
  }
  g.mb.hazards = g.mb.hazards.filter((h) => h.t > -0.2);
}

function updateOrbs(g: Game, dt: number) {
  const p = g.p;
  for (const o of g.mb.orbs) {
    o.t += dt;
    if (o.t > 0.35) { const dx = p.x - o.x, dy = p.y - 14 - o.y, d = Math.hypot(dx, dy) || 1, s = 120 + o.t * 260; o.vx += ((dx / d) * s - o.vx) * Math.min(1, dt * 8); o.vy += ((dy / d) * s - o.vy) * Math.min(1, dt * 8); }
    else { o.vx *= Math.pow(0.05, dt); o.vy *= Math.pow(0.05, dt); }
    o.x += o.vx * dt; o.y += o.vy * dt;
    if (o.t > 0.35 && Math.hypot(p.x - o.x, p.y - 14 - o.y) < 10) {
      o.v = -o.v; g.gainExp(-o.v, o.x, o.y);
      g.parts.emit(CH_COMBAT, K_SPARK, o.x, o.y, 0, -30, 0.2, C_GOLD);
    }
  }
  g.mb.orbs = g.mb.orbs.filter((o) => o.v > 0);
}
