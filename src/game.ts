/** Ki Quest simulation: hero, combat, enemies, EXP/levels, save pad. No drawing here. */
import { bark } from "./game/combat/barks"; // MB hook: barks
import { Input } from "./input";
import { Area, buildArea, moveBody, solidAt } from "./world";
import { ParticlePool, CH_COMBAT, K_SPARK, K_RING, K_DUST, C_GOLD, C_WHITE, C_RED, C_DUST } from "./vendor/particles";
import { SaveRecord, readSave, writeSave } from "./save";
// MB hook: combat + enemy systems (src/game/combat, src/game/enemies)
import { Enemy, makeEnemy as mbMakeEnemy, FoeKind } from "./game/enemies/types";
import { updateFoes, onFoeHit, onFoeKill, extraSpawns } from "./game/enemies/ai";
import { updateArena } from "./game/enemies/boss";
import { updateTechnique } from "./game/combat/techniques";
import { updatePowerup, tfMul, meterGain, TF_HURT } from "./game/combat/powerup";
import { makeMB } from "./game/combat/state";
import { updateAllies } from "./game/combat/companion";
import { updateArena2 } from "./game/enemies/slagheart";
import { updateArena3 } from "./game/enemies/aurel";
import { updateArena4 } from "./game/enemies/twins";
import { updateArena5 } from "./game/enemies/morvant";
import { updateArena6 } from "./game/enemies/malachar";
import { updateMinis, miniActive, miniAbort, miniDone, miniRestore } from "./game/enemies/minis"; // MB hook
import { isBigBoss } from "./game/enemies/types";
export type { Enemy } from "./game/enemies/types";

export type Mode = "title" | "play" | "pause" | "map";
export interface Shot { x: number; y: number; vx: number; vy: number; life: number; foe: boolean; dmg: number; pierce?: boolean; r?: number; tech?: number; hit?: Enemy[] }
export interface Num { x: number; y: number; txt: string; col: string; t: number; big: boolean }

export const EP_BLAST = 8, EP_SHIELD_PER_S = 22;
export const expNext = (l: number) => Math.round(12 * Math.pow(l, 1.3));
const DIRS8 = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)]);

export class Game {
  mode: Mode = "title";
  area: Area = buildArea();
  time = 0; frame = 0;
  p = { x: 0, y: 0, fx: 0, fy: 1, dir8: 2, moving: false, running: false, walk: 0, inv: 0, kx: 0, ky: 0 };
  lvl = 1; exp = 0; pts = 0; str = 3; pow = 3; end = 3; hp = 0; ep = 0; tf = 0;
  swing = { step: 0, t: 0, queued: false, hitId: 0, chainT: 0, chainStep: 0 };
  blastCd = 0; blocking = false; shield = false;
  enemies: Enemy[] = []; shots: Shot[] = []; nums: Num[] = [];
  toast = ""; toastT = 0; banner = ""; bannerT = 0; levelT = 0;
  menuSel = 0; onPad = false; shake = 0;
  parts = new ParticlePool();
  stats = { crits: 0, normals: 0, blasts: 0, kills: 0, saves: 0, levelUps: 0, shieldBlocks: 0, hurt: 0, transforms: 0, guarded: 0, guardBreaks: 0, bossKills: 0, foeShots: 0 };
  mb = makeMB();
  get bossActive() { return this.mb.boss.active || this.mb.boss2.active || this.mb.boss3.active || this.mb.boss4.active || this.mb.boss5.active || this.mb.boss6.active || miniActive(this); } // MB hook: audio boss theme
  private hitSerial = 1;

  constructor(public input: Input) { this.reset(); }

  get maxHp() { return 60 + this.end * 8; }
  get maxEp() { return 40 + this.pow * 4; }
  get meleeDmg() { return (3 + this.str * 1.5) * tfMul(this).melee; }
  get blastDmg() { return (6 + this.pow * 2.5) * tfMul(this).blast; }
  get defense() { return Math.min(0.6, this.end * 0.03) + tfMul(this).def; }

  reset() {
    Object.assign(this.p, { x: this.area.start.x, y: this.area.start.y });
    this.hp = this.maxHp; this.ep = this.maxEp;
    const mdone = miniDone(this); const done = this.mb.boss.done, done2 = this.mb.boss2.done, done3 = this.mb.boss3.done, done4 = this.mb.boss4.done, done5 = this.mb.boss5.done, done6 = this.mb.boss6.done; this.mb = makeMB(); this.mb.boss.done = done; this.mb.boss2.done = done2; this.mb.boss3.done = done3; this.mb.boss4.done = done4; this.mb.boss5.done = done5; this.mb.boss6.done = done6; miniRestore(this, mdone); this.tf = 0;
    this.enemies = [...this.area.spawns, ...extraSpawns(this.area)].map((s) => this.makeEnemy(s.kind, s.x, s.y));
  }
  makeEnemy(kind: FoeKind, x: number, y: number): Enemy { return mbMakeEnemy(kind, x, y); }
  record(): SaveRecord {
    return { v: 1, at: Date.now(), area: this.area.name, x: this.p.x, y: this.p.y, lvl: this.lvl, exp: this.exp, pts: this.pts, str: this.str, pow: this.pow, end: this.end, hp: this.hp, ep: this.ep, tf: this.tf, mirela: this.mb.allies[0].joined, brann: this.mb.allies[1].joined }; // MB hook: companions
  }
  load(r: SaveRecord) {
    Object.assign(this, { lvl: r.lvl, exp: r.exp, pts: r.pts, str: r.str, pow: r.pow, end: r.end, tf: r.tf });
    this.hp = Math.min(this.maxHp, r.hp); this.ep = Math.min(this.maxEp, r.ep);
    if (!solidAt(this.area, r.x, r.y)) { this.p.x = r.x; this.p.y = r.y; }
    if (r.mirela === true) this.mb.allies[0].joined = true; if (r.brann === true) this.mb.allies[1].joined = true; // MB hook: old saves lack the fields
  }
  start(cont: boolean) {
    const s = cont ? readSave() : null;
    this.reset();
    if (s) this.load(s);
    this.mode = "play"; this.banner = this.area.name; this.bannerT = 3;
  }
  autosave() { if (this.mode !== "title") writeSave(this.record(), true); }
  say(s: string, t = 1.6) { this.toast = s; this.toastT = t; }
  num(x: number, y: number, v: number, col: string, big = false) { this.nums.push({ x, y, txt: String(Math.round(v)), col, t: 0.9, big }); }

  step(dt: number) {
    const inp = this.input;
    inp.poll();
    this.time += dt; this.frame++;
    if (this.mode === "title") return;
    if (inp.pressed("pause")) { this.mode = this.mode === "pause" ? "play" : "pause"; this.menuSel = 0; return; }
    if (inp.pressed("map")) { this.mode = this.mode === "map" ? "play" : "map"; return; }
    if (this.mode === "pause") return this.menu();
    if (this.mode === "map") { if (inp.pressed("melee") || inp.pressed("blast")) this.mode = "play"; return; }
    this.toastT -= dt; this.bannerT -= dt; this.levelT -= dt; this.shake = Math.max(0, this.shake - dt * 20);
    this.hero(dt);
    updatePowerup(this, dt); updateArena(this, dt); updateArena2(this, dt); updateArena3(this, dt); updateArena4(this, dt); updateArena5(this, dt); updateArena6(this, dt); updateMinis(this, dt); // MB hook
    updateFoes(this, dt);
    updateAllies(this, dt); // MB hook: companions (Mirela, Brann)
    this.projectiles(dt);
    for (const n of this.nums) { n.t -= dt; n.y -= dt * 22; }
    this.nums = this.nums.filter((n) => n.t > 0);
    this.parts.update(dt);
  }

  private menuLast = 0;
  menu() {
    const inp = this.input;
    const rows = 4;
    const v = inp.my > 0.5 ? 1 : inp.my < -0.5 ? -1 : 0;
    if (inp.pressed("down") || (v === 1 && this.menuLast !== 1)) this.menuSel = (this.menuSel + 1) % rows;
    if (inp.pressed("up") || (v === -1 && this.menuLast !== -1)) this.menuSel = (this.menuSel + rows - 1) % rows;
    this.menuLast = v;
    if (inp.pressed("melee") || inp.pressed("confirm")) this.menuPick(this.menuSel);
    if (inp.pressed("blast")) this.mode = "play";
  }
  menuPick(i: number) {
    this.menuSel = i;
    if (i === 3) { this.mode = "play"; return; }
    if (this.pts <= 0) { this.say("No points to spend"); return; }
    const k = (["str", "pow", "end"] as const)[i];
    const hpWas = this.maxHp, epWas = this.maxEp;
    this[k]++; this.pts--;
    this.hp += this.maxHp - hpWas; this.ep += this.maxEp - epWas;
  }

  hero(dt: number) {
    const inp = this.input, p = this.p;
    p.inv = Math.max(0, p.inv - dt);
    this.blastCd = Math.max(0, this.blastCd - dt);
    this.blocking = inp.down("block");
    this.shield = this.blocking && inp.down("blast") && this.ep > 0;
    if (this.shield) this.ep = Math.max(0, this.ep - EP_SHIELD_PER_S * dt);
    else if (!this.blocking) this.ep = Math.min(this.maxEp, this.ep + 5 * tfMul(this).regen * dt);
    // melee combo
    const sw = this.swing;
    if (sw.step) {
      sw.t += dt;
      if (sw.t > 0.07 && sw.t < 0.16 && sw.hitId === 0) { sw.hitId = this.hitSerial++; this.meleeHit(); if (sw.step === 3) bark(this, "rook", "attack"); /* MB hook: barks */ }
      if (inp.pressed("melee") && sw.t > 0.1 && sw.step < 3) sw.queued = true;
      if (sw.t >= (sw.step === 3 ? 0.32 : 0.24)) {
        if (sw.queued) { sw.step++; sw.t = 0; sw.queued = false; sw.hitId = 0; }
        else { sw.chainT = sw.step < 3 ? 0.22 : 0; sw.chainStep = sw.step; sw.step = 0; }
      }
    } else if (!this.blocking && inp.pressed("melee")) {
      const next = sw.chainT > 0 && sw.chainStep < 3 ? sw.chainStep + 1 : 1;
      Object.assign(sw, { step: next, t: 0, queued: false, hitId: 0 });
    }
    sw.chainT = Math.max(0, sw.chainT - dt);
    updateTechnique(this, dt); // MB hook: techniques
    // movement (8-dir, double-tap run)
    let mx = inp.mx, my = inp.my;
    const m = Math.hypot(mx, my);
    p.moving = m > 0.1;
    p.running = inp.running && !this.blocking;
    if (p.moving) {
      const a = Math.atan2(my, mx);
      p.dir8 = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
      if (!sw.step) { p.fx = DIRS8[p.dir8][0]; p.fy = DIRS8[p.dir8][1]; }
    }
    let sp = (p.running ? 125 : 72) * tfMul(this).speed;
    if (this.blocking) sp *= 0.3;
    if (sw.step) sp *= 0.25;
    p.walk += dt * (p.moving ? (p.running ? 14 : 9) : 0);
    if (p.running && p.moving && this.frame % 6 === 0) this.parts.emit(CH_COMBAT, K_DUST, p.x, p.y, -mx * 20, -8, 0.3, C_DUST);
    moveBody(this.area, p, (mx * sp + p.kx) * dt, (my * sp + p.ky) * dt);
    p.kx *= Math.pow(0.002, dt); p.ky *= Math.pow(0.002, dt);
    // save pad
    const on = Math.hypot(p.x - this.area.pad.x, p.y - this.area.pad.y) < 12;
    if (on && !this.onPad) {
      this.hp = this.maxHp; this.ep = this.maxEp;
      if (writeSave(this.record())) { this.stats.saves++; this.say("Saved · HP and EP restored"); }
      else this.say("Save failed (storage blocked)");
    }
    this.onPad = on;
  }

  meleeHit() {
    const p = this.p, sw = this.swing;
    const hx = p.x + p.fx * 14, hy = p.y - 10 + p.fy * 10;
    for (const e of this.enemies) {
      if (e.dead || Math.hypot(e.x - hx, e.y - 8 - hy) > 18) continue;
      const crit = Math.random() < (sw.step === 3 ? 0.25 : 0.12);
      let d = this.meleeDmg * (sw.step === 3 ? 1.4 : 1) * (0.9 + Math.random() * 0.2);
      if (crit) d *= 1.8;
      const kb = crit ? 300 : sw.step === 3 ? 120 : 25;
      this.damageFoe(e, d, p.fx * kb, p.fy * kb, crit);
    }
  }
  damageFoe(e: Enemy, d: number, kx: number, ky: number, crit: boolean, pierce = false) {
    const h = onFoeHit(this, e, d, kx, ky, crit, pierce); d = h.d; kx = h.kx; ky = h.ky; // MB hook
    if (h.blocked) { crit = false; if (!d) return; }
    e.hp -= d; e.vx += kx; e.vy += ky; e.flash = 0.12;
    if (crit) { this.stats.crits++; this.shake = 3; } else this.stats.normals++;
    this.num(e.x, e.y - 22, d, crit ? "#ffe14a" : "#ff4a4a", crit);
    const a = Math.atan2(ky, kx);
    for (let i = 0; i < (crit ? 8 : 4); i++) {
      const b = a + (Math.random() - 0.5) * 1.6, s = 50 + Math.random() * 60;
      this.parts.emit(CH_COMBAT, K_SPARK, e.x, e.y - 10, Math.cos(b) * s, Math.sin(b) * s - 20, 0.25, crit ? C_GOLD : C_WHITE, 200, 2);
    }
    if (e.state === "tele" && crit) e.state = "recover", e.t = 0.4;
    if (e.hp <= 0) this.kill(e);
  }
  kill(e: Enemy) {
    e.dead = true; this.stats.kills++;
    onFoeKill(this, e); // MB hook: EXP orbs, boss reward
    this.parts.emit(CH_COMBAT, K_RING, e.x, e.y - 8, 0, -6, 0.35, C_WHITE);
    for (let i = 0; i < 8; i++) this.parts.emit(CH_COMBAT, K_SPARK, e.x, e.y - 8, Math.cos(i) * 70, Math.sin(i) * 70, 0.4, C_GOLD, 120, 1);
  }
  gainExp(v: number, x = this.p.x, y = this.p.y - 30) {
    this.exp += v;
    this.nums.push({ x, y, txt: `+${v} EXP`, col: "#9fe8ff", t: 1.1, big: false });
    while (this.exp >= expNext(this.lvl)) {
      this.exp -= expNext(this.lvl); this.lvl++; this.pts += 3; this.levelT = 2.5; this.stats.levelUps++;
      this.hp = this.maxHp; this.ep = this.maxEp;
      this.say(`Level ${this.lvl}! +3 points (Esc / Start / II to spend)`, 3);
    }
  }
  hurtHero(d: number, fromX: number, fromY: number) {
    const p = this.p;
    if (p.inv > 0) return;
    const a = Math.atan2(p.y - fromY, p.x - fromX);
    if (this.shield) { this.stats.shieldBlocks++; this.num(p.x, p.y - 34, 0, "#9fe8ff"); p.inv = 0.2; return; }
    if (this.blocking) d *= 0.3;
    d *= 1 - this.defense;
    this.hp -= d; p.inv = 0.6; bark(this, "rook", "hurt"); /* MB hook: barks */ meterGain(this, TF_HURT); // MB hook this.stats.hurt++; this.shake = 2;
    p.kx = Math.cos(a) * (this.blocking ? 60 : 160); p.ky = Math.sin(a) * (this.blocking ? 60 : 160);
    this.num(p.x, p.y - 34, d, "#ff9a9a");
    if (this.hp <= 0) {
      this.hp = this.maxHp; this.ep = this.maxEp; p.x = this.area.start.x; p.y = this.area.start.y; p.kx = p.ky = 0;
      this.say("Knocked out! Back at the save pad.", 2.5);
      if (this.mb.boss.active) { this.enemies = this.enemies.filter((e) => e.kind !== "boss"); this.mb.boss.active = false; this.mb.hazards.length = 0; }
      miniAbort(this); // MB hook
      if (this.mb.boss2.active) { this.enemies = this.enemies.filter((e) => e.kind !== "slag" && !e.minion); this.mb.boss2.active = false; this.mb.hazards.length = 0; }
      if (this.mb.boss3.active) { this.enemies = this.enemies.filter((e) => e.kind !== "aurel" && !e.minion); this.mb.boss3.active = false; this.mb.hazards.length = 0; } // MB hook
      if (this.mb.boss4.active) { this.enemies = this.enemies.filter((e) => e.kind !== "vey" && e.kind !== "nell" && e.kind !== "pylon" && !e.minion); this.mb.boss4.active = false; this.mb.hazards.length = 0; } // MB hook
      if (this.mb.boss6.active) { this.enemies = this.enemies.filter((e) => e.kind !== "malachar"); this.mb.boss6.active = false; this.mb.hazards.length = 0; this.shots = this.shots.filter((s) => !s.foe); } // MB hook
      if (this.mb.boss5.active) { this.enemies = this.enemies.filter((e) => e.kind !== "morvant"); this.mb.boss5.active = false; this.mb.hazards.length = 0; this.shots = this.shots.filter((s) => !s.foe); } // MB hook
    }
  }

  projectiles(dt: number) {
    const p = this.p;
    for (const s of this.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (solidAt(this.area, s.x, s.y + 10)) { s.life = 0; this.parts.emit(CH_COMBAT, K_RING, s.x, s.y, 0, 0, 0.2, s.foe ? C_RED : C_WHITE); continue; }
      if (s.foe) {
        const d = Math.hypot(s.x - p.x, s.y - (p.y - 14));
        if (this.shield && d < 22) { s.life = 0; this.stats.shieldBlocks++; this.parts.emit(CH_COMBAT, K_RING, s.x, s.y, 0, 0, 0.25, C_WHITE); continue; }
        if (d < 10) { s.life = 0; this.hurtHero(s.dmg, s.x - s.vx, s.y - s.vy); }
      } else {
        for (const e of this.enemies) if (!e.dead && !s.hit?.includes(e) && Math.hypot(e.x - s.x, e.y - (isBigBoss(e.kind) ? 18 : 10) - s.y) < (isBigBoss(e.kind) ? 20 : 12) + (s.r ?? 0)) {
          if (s.pierce) s.hit!.push(e); else s.life = 0;
          const crit = Math.random() < 0.1;
          const n = Math.hypot(s.vx, s.vy) || 1;
          this.damageFoe(e, s.dmg * (crit ? 1.8 : 1), (s.vx / n) * (crit ? 260 : 110), (s.vy / n) * (crit ? 260 : 110), crit, s.pierce);
          this.parts.emit(CH_COMBAT, K_RING, s.x, s.y, 0, 0, 0.25, C_WHITE);
          if (!s.pierce) break;
        }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }
}
