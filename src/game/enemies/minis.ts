/**
 * Mini-bosses (HANDOFF "Mini-boss specs"): small r3 rings, each gated by story flags, 2-3 phases, every move telegraphs
 * first (state "tele", e.move) so companions step away (companion.ts isBoss -> isBigBoss). One data-driven engine:
 * a MiniSpec per boss lists arena, gate, phases, moves (typed: dash/ring/rain/crack/fan/nova/summon/blink/decoy) and FX colours.
 * Kill -> BossState.done + writeBossDone(slot), story flag + save, reward, clear minions/hazards/foe shots.
 * Debug: __kiMB.startMini(g, "kettle"), __kiMB.miniLog, __kiMB.MINIS. Owner: Master Builder.
 */
import type { Game } from "../../game";
import { Enemy, FoeKind, makeEnemy } from "./types";
import { freeNear } from "./ai";
import { writeBossDone } from "../combat/state";
import type { BossState } from "./types";
import { hurtAlly } from "../combat/companion";
import { solidAt } from "../../world";
import { CH_COMBAT, K_RING, K_SPARK, C_GOLD, C_CYAN, C_VIOLET, C_RED, C_WHITE } from "../../vendor/particles";

type Flags = Record<string, unknown>;
export type MiniSlot = "boss7" | "boss8" | "boss9" | "boss10";
export interface Move { type: "dash" | "ring" | "rain" | "crack" | "fan" | "nova" | "summon" | "blink" | "decoy"; tele: number; dmg: number; n?: number; r?: number; spd?: number; kind?: FoeKind; anim: string }
export interface MiniSpec {
  kind: FoeKind; slot: MiniSlot; name: string; area: string; tx: number; ty: number; r: number; flag: string;
  gate: (f: Flags, g: Game) => boolean; phaseAt: number[]; moves: string[][]; defs: Record<string, Move>;
  banners: string[]; /** phase-change line (one per phase index, or one for all) */ say: string | string[]; /** death line (staging npc_lines "Bosses") */ outro?: string; reward: (g: Game) => string; col: string[]; light: [number, number, number]; /** particle colours (vendor/particles C_*) */ pc: [number, number];
  /** spawn markers (tile x,y) cleared for good: they sit inside the ring */ clear: [number, number][]; speed: number;
}
const st = () => (window as unknown as { __ki?: { story?: { flags: Flags; save(): void; box?: unknown } } }).__ki?.story;

export const MINIS: MiniSpec[] = [
  { kind: "kettle", slot: "boss7", name: "FOREMAN KETTLE", area: "emberquarry", tx: 26, ty: 12, r: 3, flag: "kettleDown",
    gate: (f) => !!f.brannQ && !f.heart && !f.kettleDown, phaseAt: [1, 0.6, 0.3], speed: 26,
    moves: [["shovel", "steam"], ["shovel", "steam", "slag"], ["shovel", "boil", "slag", "steam"]],
    defs: { shovel: { type: "dash", tele: 0.75, dmg: 12, spd: 230, anim: "dash" }, steam: { type: "ring", tele: 0.8, dmg: 10, r: 40, anim: "slam" },
      slag: { type: "rain", tele: 0.8, dmg: 9, n: 5, anim: "cast" }, boil: { type: "crack", tele: 0.85, dmg: 11, n: 3, anim: "slam" } },
    banners: ["FOREMAN KETTLE · SHIFT'S NOT OVER", "KETTLE BUILDS PRESSURE", "KETTLE BOILS OVER"], say: "Kettle's rivets hiss!",
    col: ["rgba(255,150,60,.85)", "rgba(120,240,255,.8)", "#ffb04a", "#8af0ff"], light: [1, 0.55, 0.25], pc: [C_GOLD, C_CYAN],
    clear: [[26, 10], [22, 14]], reward: (g) => { g.pts += 2; return "Kettle's gauge: +2 stat points"; } },
  { kind: "corvin", slot: "boss8", name: "REEDWRAITH CORVIN", area: "hushwater", tx: 25, ty: 26, r: 3, flag: "corvinDown",
    gate: (f) => !!f.reedQ && !f.bell && !f.corvinDown, phaseAt: [1, 0.65, 0.3], speed: 24,
    moves: [["lantern", "ferry"], ["lantern", "ferry", "echo"], ["lantern", "toll", "echo", "ferry"]],
    defs: { lantern: { type: "fan", tele: 0.7, dmg: 8, n: 3, spd: 125, anim: "cast" }, ferry: { type: "blink", tele: 0.8, dmg: 9, r: 28, anim: "summon" },
      echo: { type: "decoy", tele: 0.8, dmg: 0, n: 2, kind: "reed_wraith", anim: "summon" }, toll: { type: "nova", tele: 0.9, dmg: 8, n: 12, spd: 105, anim: "slam" } },
    banners: ["REEDWRAITH CORVIN · THE BELL SLEEPS", "CORVIN CALLS HIS ECHOES", "THE BELL TOLLS"], say: "Corvin's lantern flares violet!",
    outro: "Then ring it. Ring it loud. I'm so tired of the quiet.",
    col: ["rgba(200,110,255,.85)", "rgba(140,255,210,.8)", "#e0a0ff", "#a0ffd0"], light: [0.75, 0.4, 1], pc: [C_VIOLET, C_CYAN],
    clear: [], reward: (g) => { g.pts += 2; return "The Ferry Bell is free · +2 stat points"; } },
  { kind: "gilt", slot: "boss10", name: "CAPMOTHER GILT", area: "lanternmoss", tx: 39, ty: 27, r: 3, flag: "capDone",
    gate: (f) => !!f.capQ && !f.capDone, phaseAt: [1, 0.6, 0.3], speed: 18,
    moves: [["spores", "capring"], ["spores", "capring", "brood", "puff"], ["spores", "roots", "brood", "puff", "capring"]],
    defs: { spores: { type: "rain", tele: 0.85, dmg: 8, n: 4, anim: "cast" }, capring: { type: "ring", tele: 0.8, dmg: 10, r: 42, anim: "slam" },
      brood: { type: "summon", tele: 0.8, dmg: 0, n: 2, kind: "mossling", anim: "summon" }, puff: { type: "fan", tele: 0.7, dmg: 7, n: 5, spd: 110, anim: "cast" },
      roots: { type: "crack", tele: 0.85, dmg: 10, n: 3, anim: "slam" } },
    banners: ["CAPMOTHER GILT · THE RING CLOSES", "GILT CALLS HER BROOD", "THE ROOT IN HER HEART"], say: "Gilt's cap flares gold!",
    outro: "(The root in her heart crumbles. The Capmother sighs, and lets a gold Glowcap crown fall.)",
    col: ["rgba(255,200,80,.85)", "rgba(150,255,190,.8)", "#ffd070", "#9affc0"], light: [1, 0.8, 0.35], pc: [C_GOLD, C_CYAN],
    clear: [], reward: (g) => { g.pts += 2; return "Glowcap crown · take it to Odile · +2 stat points"; } },
  { kind: "ombrelle", slot: "boss9", name: "LADY OMBRELLE", area: "hushwater", tx: 40, ty: 7, r: 3, flag: "ombrelleDown",
    gate: (f, g) => !!f.oath && !!g.mb.boss.done && !f.ombrelleDown, phaseAt: [1, 0.65, 0.3], speed: 22,
    moves: [["veil", "drift"], ["veil", "graves", "requiem", "drift"], ["candles", "graves3", "requiem", "veil", "drift"]],
    defs: { veil: { type: "fan", tele: 0.7, dmg: 8, n: 3, spd: 135, anim: "cast" }, drift: { type: "blink", tele: 0.75, dmg: 9, r: 26, anim: "summon" },
      graves: { type: "crack", tele: 0.85, dmg: 10, n: 2, anim: "slam" }, graves3: { type: "crack", tele: 0.8, dmg: 10, n: 3, anim: "slam" },
      requiem: { type: "nova", tele: 0.9, dmg: 8, n: 12, spd: 100, anim: "cast" }, candles: { type: "rain", tele: 0.8, dmg: 9, n: 4, anim: "cast" } },
    banners: ["LADY OMBRELLE · KNEEL, LAMPLIGHTER", "OMBRELLE REMEMBERS", "THE CANDLES GUTTER"],
    say: ["Ombrelle's parasol snaps open!", "Do you know what he was, before? No. You know nothing. He held the whole sky once!", "Cold candle-light pours from the graves!"],
    outro: "It's... cold. Tell him... I kept the light warm for him.",
    col: ["rgba(130,230,255,.85)", "rgba(200,170,255,.8)", "#9ae8ff", "#d0b0ff"], light: [0.5, 0.85, 1], pc: [C_CYAN, C_VIOLET],
    clear: [[42, 8]], reward: (g) => { g.pts += 3; return "The graves go quiet · +3 stat points"; } },
];
export const miniLog = { starts: 0, moves: {} as Record<string, number>, phases: {} as Record<string, number>, decoys: 0, decoyKills: 0, kills: [] as string[] };
const centers: Record<string, { x: number; y: number }> = {};
export const specOf = (k: string) => MINIS.find((m) => m.kind === k);
export const isMini = (k: string) => !!specOf(k);
const slotOf = (g: Game, s: MiniSpec) => (g.mb as unknown as Record<MiniSlot, BossState>)[s.slot];
export const miniActive = (g: Game) => MINIS.some((s) => slotOf(g, s)?.active);
export const miniLocked = (g: Game, e: Enemy) => { const s = specOf(e.kind); return !!s && slotOf(g, s).lockT > 0; };
export const miniState = (g: Game, k: string) => { const s = specOf(k); return s ? slotOf(g, s) : undefined; };
const lead = (s: MiniSpec) => s.r * 16 + 32; // leash radius (px): r3 wake ring + a step so rings can be dodged

export function startMini(g: Game, kind: string, x?: number, y?: number) {
  const s = specOf(kind)!; const b = slotOf(g, s); const c = freeNear(g.area, s.tx, s.ty);
  centers[kind] = { x: x ?? c.x, y: y ?? c.y }; const C = centers[kind];
  b.active = true; b.phase = 1; b.introT = 2; b.lockT = 1.1; miniLog.starts++;
  const a = Math.atan2(C.y - g.p.y, C.x - g.p.x) || -1.57;
  let ex = C.x + Math.cos(a) * 26, ey = C.y + Math.sin(a) * 26; if (solidAt(g.area, ex, ey)) { ex = C.x; ey = C.y; }
  const e = makeEnemy(s.kind, ex, ey); e.state = "recover"; e.t = 1.4; g.enemies.push(e);
  for (const f of g.enemies) if (f !== e && !f.dead && !f.minion && Math.hypot(f.x - C.x, f.y - C.y) < lead(s) + 16) { f.dead = true; f.respawn = 30; }
  g.banner = s.banners[0]; g.bannerT = 2.5; g.shake = 3;
  return e;
}

export function updateMinis(g: Game, dt: number) {
  const p = g.p;
  for (const s of MINIS) {
    const b = slotOf(g, s); if (!b) continue;
    b.lockT = Math.max(0, b.lockT - dt); b.introT = Math.max(0, b.introT - dt);
    if (g.area.id !== s.area) continue;
    // listed spawn markers inside the ring stay cleared
    for (const f of g.enemies) if (!f.minion && !f.dead && f.kind !== s.kind && s.clear.some(([tx, ty]) => Math.abs(f.hx - (tx * 16 + 8)) < 9 && Math.abs(f.hy - (ty * 16 + 8)) < 9)) { f.dead = true; f.respawn = Infinity; }
    const F = st()?.flags;
    if (!b.active && !b.done && F && s.gate(F, g) && !st()?.box) {
      const c = freeNear(g.area, s.tx, s.ty);
      if (Math.hypot(p.x - c.x, p.y - c.y) < s.r * 16) startMini(g, s.kind);
    }
    if (b.active) {
      const C = centers[s.kind], dx = p.x - C.x, dy = p.y - C.y, d = Math.hypot(dx, dy), R = lead(s);
      if (d > R) { p.x = C.x + (dx / d) * R; p.y = C.y + (dy / d) * R; p.kx = -dx * 2; p.ky = -dy * 2; }
      if (!g.enemies.some((e) => e.kind === s.kind && !e.dead)) b.active = false;
    }
  }
}

function shot(g: Game, x: number, y: number, ang: number, sp: number, dmg: number) {
  g.shots.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.8, foe: true, dmg }); g.stats.foeShots++;
}
function sparkle(g: Game, s: MiniSpec, x: number, y: number, n = 6, v = 90) {
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + g.time; g.parts.emit(CH_COMBAT, i & 1 ? K_RING : K_SPARK, x, y, Math.cos(a) * v, Math.sin(a) * v - 20, 0.45, i & 1 ? s.pc[0] : s.pc[1], 60, 2); }
}

function telegraph(g: Game, s: MiniSpec, e: Enemy, m: Move, ux: number, uy: number) {
  const p = g.p, T = e.t, H = g.mb.hazards, ph = slotOf(g, s).phase;
  if (m.type === "ring") H.push({ x: e.x, y: e.y, r: m.r ?? 40, t: T, max: T, dmg: m.dmg, foe: true });
  if (m.type === "rain") { const n = (m.n ?? 5) + ph - 1; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = i === 0 ? 0 : 10 + Math.random() * 34; H.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7, r: 13, t: T + i * 0.1, max: T + i * 0.1, dmg: m.dmg, foe: true }); } }
  if (m.type === "crack") { const b0 = Math.atan2(uy, ux), n = m.n ?? 1; for (let j = 0; j < n; j++) { const a = b0 + (j - (n - 1) / 2) * 0.55; for (let k = 1; k <= 5; k++) H.push({ x: e.x + Math.cos(a) * k * 16, y: e.y + Math.sin(a) * k * 16, r: 11, t: T + k * 0.07, max: T + k * 0.07, dmg: m.dmg, foe: true }); } }
  if (m.type === "blink") {
    // destination marker, then a burst ring there on arrival
    const a = Math.random() * 6.28, C = centers[s.kind]; let x = p.x + Math.cos(a) * 40, y = p.y + Math.sin(a) * 30;
    if (Math.hypot(x - C.x, y - C.y) > lead(s) - 8 || solidAt(g.area, x, y)) { x = C.x; y = C.y; }
    e.ax = x; e.ay = y; // marker drawn by drawMiniTele
  }
}

function act(g: Game, s: MiniSpec, e: Enemy, m: Move, ux: number, uy: number) {
  const b = slotOf(g, s);
  if (m.type === "fan") { const a0 = Math.atan2(uy, ux), n = (m.n ?? 3) + (b.phase >= 3 ? 2 : 0); for (let i = 0; i < n; i++) shot(g, e.x, e.y - 14, a0 + (i - (n - 1) / 2) * 0.22, m.spd ?? 130, m.dmg); }
  if (m.type === "nova") { const n = m.n ?? 10; for (let i = 0; i < n; i++) shot(g, e.x, e.y - 14, (i / n) * 6.28 + g.time, m.spd ?? 110, m.dmg); }
  if (m.type === "summon" || m.type === "decoy") {
    const alive = g.enemies.filter((f) => f.minion && !f.dead).length, n = Math.min(m.n ?? 2, 4 - alive);
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * 6.28 + g.time, x = e.x + Math.cos(a) * 30, y = e.y + Math.sin(a) * 22; if (solidAt(g.area, x, y)) continue;
      const f = makeEnemy(m.kind ?? "brute", x, y); f.minion = true; f.hp = f.max = m.type === "decoy" ? 8 : 14; f.state = "chase";
      if (m.type === "decoy") { (f as Enemy & { decoy?: boolean }).decoy = true; miniLog.decoys++; }
      g.enemies.push(f); g.parts.emit(CH_COMBAT, K_RING, x, y - 8, 0, 0, 0.4, s.pc[1]);
    }
  }
  if (m.type === "blink") { sparkle(g, s, e.x, e.y - 16); e.x = e.ax; e.y = e.ay; sparkle(g, s, e.x, e.y - 16, 10, 120); g.mb.hazards.push({ x: e.x, y: e.y, r: m.r ?? 30, t: 0.12, max: 0.12, dmg: m.dmg, foe: true }); }
  if (m.type === "ring" || m.type === "crack") { g.shake = 3; sparkle(g, s, e.x, e.y - 6, 10, 130); }
}

export function updateMini(g: Game, e: Enemy, dt: number, ux: number, uy: number, dist: number): [number, number] {
  const s = specOf(e.kind)!, b = slotOf(g, s), p = g.p, f = e.hp / e.max;
  let want = 1; for (let i = 1; i < s.phaseAt.length; i++) if (f <= s.phaseAt[i]) want = i + 1;
  if (want > b.phase) {
    b.phase = want; b.lockT = 1; e.state = "recover"; e.t = 1.1; e.move = ""; miniLog.phases[s.kind] = want;
    g.banner = s.banners[want - 1] ?? s.name; g.bannerT = 1.6; g.say(Array.isArray(s.say) ? s.say[want - 1] ?? s.say[0] : s.say, Array.isArray(s.say) ? 3 : 1.4);
    g.mb.hazards.push({ x: e.x, y: e.y, r: 34, t: 0.45, max: 0.45, dmg: 6, foe: true }); sparkle(g, s, e.x, e.y - 18, 14, 150);
    return [0, 0];
  }
  const spd = 1 + (b.phase - 1) * 0.15;
  if (e.state === "idle" || e.state === "chase") {
    e.state = "chase";
    if (e.t <= 0) {
      const list = s.moves[b.phase - 1], minions = g.enemies.filter((q) => q.minion && !q.dead).length;
      let k = 0; do e.move = list[Math.floor(Math.random() * list.length)]; while (++k < 8 && (s.defs[e.move].type === "summon" || s.defs[e.move].type === "decoy") && minions >= 3);
      const m = s.defs[e.move]; e.state = "tele"; e.t = m.tele / spd; e.ax = ux; e.ay = uy; e.n = 0;
      miniLog.moves[e.move] = (miniLog.moves[e.move] ?? 0) + 1;
      telegraph(g, s, e, m, ux, uy);
      return [0, 0];
    }
    const k = dist > 50 ? 1 : dist < 28 ? -0.6 : 0;
    return [ux * s.speed * k * spd, uy * s.speed * k * spd];
  }
  if (e.state === "tele") {
    const m = s.defs[e.move];
    if (m.type === "dash") { e.ax += (ux - e.ax) * Math.min(1, dt * 3); e.ay += (uy - e.ay) * Math.min(1, dt * 3); }
    if (g.frame % 4 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x + (Math.random() - 0.5) * 24, e.y - 12 - Math.random() * 20, 0, -50, 0.35, (g.frame >> 2) & 1 ? s.pc[0] : s.pc[1]);
    if (e.t <= 0) { e.state = "act"; e.t = m.type === "dash" ? 0.4 : 0.25; act(g, s, e, m, ux, uy); }
    return [0, 0];
  }
  if (e.state === "act") {
    const m = s.defs[e.move];
    if (m?.type === "dash") {
      if (e.n === 0 && Math.hypot(p.x - e.x, p.y - e.y) < 20) { g.hurtHero(m.dmg, e.x, e.y); e.n = 1; }
      for (const a of g.mb.allies) if (a.joined && !a.ko && Math.hypot(a.x - e.x, a.y - e.y) < 20) hurtAlly(g, Math.round(m.dmg * 0.7), e.x, e.y, a);
      if (g.frame % 2 === 0) g.parts.emit(CH_COMBAT, K_SPARK, e.x, e.y - 8, -e.ax * 50, -e.ay * 50, 0.3, s.pc[0]);
      if (e.t <= 0) { e.state = "recover"; e.t = 0.9 / spd; }
      return [e.ax * (m.spd ?? 220) * spd, e.ay * (m.spd ?? 220) * spd];
    }
    if (e.t <= 0) { e.state = "recover"; e.t = 0.85 / spd; }
    return [0, 0];
  }
  if (e.t <= 0) { e.state = "chase"; e.t = 0.6 / spd; }
  return [0, 0];
}

export function miniKilled(g: Game, e: Enemy) {
  const s = specOf(e.kind)!, b = slotOf(g, s); b.active = false; b.done = true; writeBossDone(s.slot); miniLog.kills.push(s.kind);
  const S = st(); if (S) { S.flags[s.flag] = true; S.save(); }
  const msg = s.reward(g); g.hp = g.maxHp; g.ep = g.maxEp; g.shake = 5;
  for (const m of g.enemies) if (m.minion && !m.dead) { m.dead = true; m.respawn = Infinity; }
  g.mb.hazards.length = 0; g.shots = g.shots.filter((q) => !q.foe);
  g.banner = `${s.name} FALLS`; g.bannerT = 2.6; g.say(s.outro ? `"${s.outro}" · ${msg}` : msg, s.outro ? 5 : 3.5);
  g.stats.bossKills = (g.stats.bossKills ?? 0) + 1;
  sparkle(g, s, e.x, e.y - 20, 16, 160);
}
export const miniDone = (g: Game) => MINIS.map((s) => !!slotOf(g, s)?.done);
export function miniRestore(g: Game, d: boolean[]) { MINIS.forEach((s, i) => { const b = slotOf(g, s); if (b && d[i]) b.done = true; }); }
/** Leaving the area / knocked out mid-fight: reset so the ring can be re-entered. */
export function miniAbort(g: Game) {
  for (const s of MINIS) { const b = slotOf(g, s); if (!b?.active) continue; b.active = false; g.enemies = g.enemies.filter((e) => e.kind !== s.kind && !e.minion); g.mb.hazards.length = 0; g.shots = g.shots.filter((q) => !q.foe); }
}

/** Draw-side FX (called from combat/draw.ts): telegraph lines/rings + "!" and additive neon glow. */
export function drawMiniTele(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number) {
  for (const e of g.enemies) { const s = !e.dead && e.state === "tele" ? specOf(e.kind) : undefined; if (!s) continue;
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy), m = s.defs[e.move]; if (!m) continue;
    c.fillStyle = (g.frame >> 2) & 1 ? s.col[2] : s.col[3]; c.fillRect(X - 2, Y - 74, 4, 9); c.fillRect(X - 2, Y - 63, 4, 3);
    c.strokeStyle = s.col[0]; c.lineWidth = 3;
    if (m.type === "dash") { c.beginPath(); c.moveTo(X, Y - 6); c.lineTo(X + e.ax * 90, Y - 6 + e.ay * 90); c.stroke(); }
    if (m.type === "fan") { const a = Math.atan2(e.ay, e.ax); c.lineWidth = 1; c.beginPath(); c.moveTo(X, Y - 14); c.arc(X, Y - 14, 46, a - 0.5, a + 0.5); c.closePath(); c.stroke(); }
    if (m.type === "nova" || m.type === "summon" || m.type === "decoy") { c.strokeStyle = s.col[1]; c.lineWidth = 1; c.beginPath(); c.arc(X, Y - 20, 8 + (1 - Math.min(1, e.t)) * 26, 0, 7); c.stroke(); }
    if (m.type === "blink") { c.strokeStyle = s.col[1]; c.lineWidth = 1; c.beginPath(); c.arc(Math.round(e.ax - cx), Math.round(e.ay - cy) - 4, 6 + Math.sin(g.time * 20) * 2, 0, 7); c.stroke(); }
  }
}
export function drawMiniGlow(g: Game, cx: number, cy: number, glow: (x: number, y: number, r: number, col: string) => void) {
  for (const e of g.enemies) { const s = !e.dead ? specOf(e.kind) : undefined; if (!s) continue;
    const b = slotOf(g, s), hot = e.state === "tele" ? 1 : 0.5;
    glow(e.x - cx, e.y - cy - 28, 10 + hot * 6 + Math.sin(g.time * 10) * 2, s.col[b.phase >= 3 ? 1 : 0]);
    if (b.lockT > 0) glow(e.x - cx, e.y - cy - 22, 34, s.col[1].replace(/[\d.]+\)$/, ".3)"));
  }
}
/** Sheet anim for the current move (draw.ts). */
export function miniAnim(g: Game, e: Enemy): [string, number] | null {
  const s = specOf(e.kind); if (!s) return null;
  if (slotOf(g, s).lockT > 0) return ["hurt", 0];
  if (e.state === "tele" || e.state === "act") return [s.defs[e.move]?.anim ?? "cast", e.state === "tele" ? Math.min(1, (g.time * 3) % 2) : 2];
  if (e.state === "recover") return ["stand", 0];
  return null;
}

const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), startMini, miniLog, MINIS };
