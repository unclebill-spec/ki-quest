/** Master Builder render hooks: sprites, telegraphs, orbs, aura, technique HUD, power meter, boss bar. */
import type { Game, Shot } from "../../game";
import type { Enemy } from "../enemies/types";
import { FOE_INFO, roleOf, isBigBoss } from "../enemies/types";
import { isMini, miniAnim, miniState, drawMiniTele, drawMiniGlow, specOf } from "../enemies/minis";
import { sheet, drawSprite, facingOf } from "./sprites";
import { drawFxStrips, preloadFx } from "./fx";
import { TECHS, BEAM_FULL } from "./techniques";
import { ARENA, arenaCenter } from "../enemies/boss";
import { ARENA2, arena2Center } from "../enemies/slagheart";
import { ARENA3, arena3Center } from "../enemies/aurel";
import { ROLES } from "./companion";
import { ARENA4, arena4Center, pylonsOf, twinsOf } from "../enemies/twins";
import { ARENA5, arena5Center } from "../enemies/morvant";
import { ARENA6, arena6Center } from "../enemies/malachar";

export let HERO_SHEET = "rook";
export function setHero(n: string) { HERO_SHEET = n; }
const FOE_SHEET: Record<Enemy["kind"], string> = { brute: "vesper_squire", wisp: "vesper_hexer", warden: "watch_guard", boss: "warden_rune", slag: "slag_golem", aurel: "count_aurel", vey: "cageward_vey", nell: "cageward_nell", pylon: "", morvant: "morvant", malachar: "malachar",
  reed_wraith: "reed_wraith", witchlight_newt: "witchlight_newt", fen_warden: "fen_warden", mossback_snapper: "mossback_snapper", duskhound: "duskhound", mossling: "mossling", hush_squire: "hush_squire", bog_sprout: "bog_sprout", kettle: "kettle" };
export function preloadSheets() { sheet(HERO_SHEET); sheet("mirela"); sheet("brann"); sheet("sable"); Object.values(FOE_SHEET).filter(Boolean).forEach(sheet); preloadFx(); }

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
  c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
}

/** Hero via sheet. Returns false (use placeholder) if the sheet isn't loaded. */
export function drawHeroSprite(c: CanvasRenderingContext2D, g: Game, x: number, y: number) {
  const s = sheet(HERO_SHEET), p = g.p, sw = g.swing, m = g.mb;
  let anim = "idle", i = g.time * 6;
  if (p.inv > 0.35) { anim = "hurt"; i = 0; }
  else if (sw.step) { anim = sw.step === 1 ? "punch1" : sw.step === 2 ? "punch2" : "kick"; i = (sw.t / (sw.step === 3 ? 0.32 : 0.24)) * 3; }
  else if (m.charging || m.fire > 0) { anim = "blast"; i = m.charging ? Math.min(1, (m.charge / BEAM_FULL) * 2) : 2; }
  else if (g.blocking) { anim = "block"; i = g.shield ? 1 : 0; }
  else if (m.tfOn && !p.moving) { anim = "fly"; i = g.time * 4; }
  else if (p.moving) { anim = "walk"; i = p.walk / 1.6; }
  return drawSprite(c, s, anim, facingOf(p.fx, p.fy), i, x, y, { alt: m.tfOn, lift: anim === "fly" ? 6 + Math.sin(g.time * 4) * 2 : 0 });
}

/** Placeholder hero palette swap while transformed. */
export function heroPal(g: Game, col: string) {
  if (!g.mb.tfOn) return col;
  return ({ "#2f7a90": "#9ff6ff", "#b2332e": "#6a3ad0", "#c43c34": "#8a52ff", "#7c1f1c": "#3a1f8a", "#2c3a6e": "#20304e", "#33447e": "#283a66" } as Record<string, string>)[col] ?? col;
}

/** Foe via sheet or grey-box. Returns true if drawn here. */
export function drawFoeMB(c: CanvasRenderingContext2D, g: Game, e: Enemy, x: number, y: number) {
  if (e.kind === "pylon") {
    // cage pylon: iron spike with a red heart-crystal (sits on the C crystal prop)
    const fl = e.flash > 0, k = e.hp / e.max;
    c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(x, y, 8, 2.5, 0, 0, 7); c.fill();
    c.fillStyle = fl ? "#fff" : "#2a2230"; c.fillRect(x - 4, y - 30, 8, 30); c.fillStyle = fl ? "#fff" : "#4a3a52"; c.fillRect(x - 6, y - 4, 12, 4); c.fillRect(x - 2, y - 36, 4, 6);
    c.fillStyle = fl ? "#fff" : (g.frame >> 3) & 1 ? "#ff4a5a" : "#c02848"; c.fillRect(x - 3, y - 24, 6, 9);
    c.fillStyle = "#000a"; c.fillRect(x - 8, y - 42, 16, 3); c.fillStyle = "#ff5a6a"; c.fillRect(x - 7, y - 41, Math.round(14 * k), 1);
    return true;
  }
  const s = sheet(FOE_SHEET[e.kind]), f = facingOf(g.p.x - e.x, g.p.y - e.y), fl = e.flash > 0;
  let anim = "walk", i = g.time * 7;
  if (e.hurt > 0) { anim = "hurt"; i = 0; }
  else if (e.kind === "boss") {
    if (g.mb.boss.lockT > 0) { anim = "guard"; i = g.time * 4; }
    else if (e.move.startsWith("slam")) anim = "stomp", i = e.state === "tele" ? 0 : 2;
    else if (e.state === "tele" || e.state === "act") { anim = e.move.startsWith("dash") ? "attack" : "beam"; i = e.state === "tele" ? 0 : 1 + (g.time * 8) % 2; }
    else if (e.state === "recover") { anim = "stand"; i = 0; }
  } else if (isMini(e.kind)) {
    const r = miniAnim(g, e); if (r) [anim, i] = r; else { anim = "walk"; i = g.time * 5; }
  } else if (e.kind === "slag") {
    const A: Record<string, string> = { charge: "charge", rain: "rain", crack: "slam", crack3: "slam", summon: "summon" };
    if (g.mb.boss2.lockT > 0) { anim = "hurt"; i = 0; }
    else if (e.state === "tele" || e.state === "act") { anim = A[e.move] ?? "charge"; i = e.state === "tele" ? (e.move === "summon" ? 0 : Math.min(1, g.time * 3 % 2)) : 2; }
    else if (e.state === "recover") { anim = "stand"; i = 0; }
    else i = g.time * 4;
  } else if (e.kind === "aurel") {
    const A: Record<string, string> = { lunge: "lunge", lunge4: "lunge", sweep: "sweep", sweep2: "sweep", whirl: "whirl", summon: "summon", ring: "ring" };
    if (g.mb.boss3.lockT > 0) { anim = "hurt"; i = 0; }
    else if (e.state === "tele" || e.state === "act") { anim = A[e.move] ?? "lunge"; const n = anim === "lunge" || anim === "sweep" ? 3 : 2; i = e.state === "tele" ? 0 : Math.min(n - 1, 1 + (g.time * 8) % (n - 1)); }
    else if (e.state === "recover") { anim = "stand"; i = 0; }
    else i = g.time * 5;
  } else if (e.kind === "malachar") {
    const A: Record<string, string> = { slash: "slash", cast: "cast", prism: "prism", rain: "rain", spiral: "cast", nova: "dusk", dusk: "dusk" };
    if (g.mb.boss6.lockT > 0) { anim = "hurt"; i = 0; }
    else if (e.state === "tele" || e.state === "act") { anim = A[e.move] ?? "slash"; const n = anim === "slash" || anim === "cast" ? 3 : 2; i = e.state === "tele" ? 0 : Math.min(n - 1, 1 + (g.time * 8) % (n - 1)); }
    else if (e.state === "recover") { anim = "stand"; i = 0; }
    else i = g.time * (g.mb.boss6.phase >= 4 ? 6 : 4);
  } else if (e.kind === "morvant") {
    const A: Record<string, string> = { slam: "slam", beam: "beam", beam2: "beam", orbit: "orbit", nova: "nova", eclipse: "eclipse" };
    if (g.mb.boss5.lockT > 0) { anim = "hurt"; i = 0; }
    else if (e.state === "tele" || e.state === "act") { anim = A[e.move] ?? "slam"; const n = anim === "slam" || anim === "beam" ? 3 : 2; i = e.state === "tele" ? 0 : Math.min(n - 1, 1 + (g.time * 8) % (n - 1)); }
    else if (e.state === "recover") { anim = "stand"; i = 0; }
    else i = g.time * (g.mb.boss5.phase >= 4 ? 6 : 4);
  } else if (e.kind === "vey" || e.kind === "nell") {
    const A: Record<string, string> = { chain: "slam", cross: "dash", orbs: "orb", swap: "cast", rage: "rage" };
    if (g.mb.boss4.lockT > 0) { anim = "hurt"; i = 0; }
    else if (e.state === "tele" || e.state === "act") { anim = A[e.move] ?? "slam"; const n = anim === "slam" || anim === "dash" ? 3 : 2; i = e.state === "tele" ? 0 : Math.min(n - 1, 1 + (g.time * 8) % (n - 1)); }
    else if (e.state === "recover") { anim = "stand"; i = 0; }
    else i = g.time * (g.mb.boss4.phase >= 3 ? 7 : 5);
  } else if (roleOf(e.kind) === "warden" && e.guard && e.state !== "tele") { anim = "block"; i = e.state === "chase" ? 0 : 1; }
  else if (e.state === "tele" && e.kind === "reed_wraith") { anim = "cast"; i = (1 - Math.max(0, e.t) / 0.9) * 3; }
  else if (e.state === "tele" && e.kind === "hush_squire") { anim = "block"; i = 1; } // en-garde before the lunge
  else if (e.state === "tele") { anim = "attack"; i = 0; }
  else if (e.state === "act") { anim = "attack"; i = 1 + (g.time * 10) % 2; }
  else if (e.state === "recover" || e.state === "idle" && roleOf(e.kind) !== "wisp") { anim = e.state === "idle" ? "walk" : "stand"; }
  const bob = e.kind === "wisp" || e.kind === "reed_wraith" ? Math.sin(g.time * 4 + e.hx) * 2 : 0;
  c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(x, y, isBigBoss(e.kind) ? 18 : 8, isBigBoss(e.kind) ? 5 : 2.5, 0, 0, 7); c.fill();
  if (drawSprite(c, s, anim, f, i, x, y, { flash: fl, lift: -bob })) return true;
  if (roleOf(e.kind) === "warden") {
    c.fillStyle = fl ? "#fff" : "#4a4e5e"; c.fillRect(x - 10, y - 24, 20, 23); c.fillStyle = fl ? "#fff" : "#6a7088"; c.fillRect(x - 7, y - 28, 14, 6);
    if (e.guard) { c.fillStyle = "#8aa0c0"; c.fillRect(x + e.ax * 11 - 5, y - 20 + e.ay * 6, 10, 14); }
    return true;
  }
  if (e.kind === "boss") {
    const ph = g.mb.boss.phase;
    c.fillStyle = fl ? "#fff" : ph === 3 ? "#5a2030" : "#3a2a48"; c.fillRect(x - 18, y - 46, 36, 45);
    c.fillStyle = fl ? "#fff" : "#5a4470"; c.fillRect(x - 22, y - 44, 44, 10); c.fillRect(x - 10, y - 58, 20, 13);
    return true;
  }
  return false;
}

/** Ground layer: arena ring and hazard telegraphs (before entities). */
export function drawGround(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number) {
  const b = g.mb.boss;
  if (b.active) { const a = arenaCenter(g); c.strokeStyle = `rgba(255,${b.phase === 3 ? 60 : 120},200,.6)`; c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = -g.time * 20; c.beginPath(); c.ellipse(a.x - cx, a.y - cy, ARENA.r + 8, ARENA.r + 8, 0, 0, 7); c.stroke(); c.setLineDash([]); }
  const b2 = g.mb.boss2;
  if (b2.active) { const a = arena2Center(); c.strokeStyle = `rgba(255,${b2.phase === 3 ? 60 : 150},40,.65)`; c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = -g.time * 20; c.beginPath(); c.ellipse(a.x - cx, a.y - cy, ARENA2.r + 8, ARENA2.r + 8, 0, 0, 7); c.stroke(); c.setLineDash([]); }
  const b3 = g.mb.boss3;
  if (b3.active) { const a = arena3Center(); c.strokeStyle = b3.phase >= 4 ? "rgba(200,110,255,.7)" : "rgba(80,240,255,.6)"; c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = -g.time * 20; c.beginPath(); c.ellipse(a.x - cx, a.y - cy, ARENA3.r + 8, ARENA3.r + 8, 0, 0, 7); c.stroke(); c.setLineDash([]); }
  const b4 = g.mb.boss4;
  if (b4.active) {
    const a = arena4Center(), shield = pylonsOf(g).length > 0;
    c.strokeStyle = b4.phase >= 3 ? "rgba(255,40,70,.8)" : "rgba(255,70,110,.6)"; c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = -g.time * 20; c.beginPath(); c.ellipse(a.x - cx, a.y - cy, ARENA4.r + 8, ARENA4.r + 8, 0, 0, 7); c.stroke(); c.setLineDash([]);
    // shield links: each live pylon feeds both twins
    if (shield) { c.strokeStyle = (g.frame >> 2) & 1 ? "rgba(255,90,120,.55)" : "rgba(200,110,255,.55)"; c.lineWidth = 1; for (const p of pylonsOf(g)) for (const t of twinsOf(g)) { c.beginPath(); c.moveTo(p.x - cx, p.y - cy - 20); c.lineTo(t.x - cx, t.y - cy - 24); c.stroke(); } }
  }
  const b5 = g.mb.boss5;
  if (b5.active) {
    const a = arena5Center(), AX = a.x - cx, AY = a.y - cy;
    if (b5.phase >= 3) { // totality: the umbra darkens the ring
      const gr = c.createRadialGradient(AX, AY, 10, AX, AY, ARENA5.r + 30); gr.addColorStop(0, "rgba(10,0,20,0)"); gr.addColorStop(1, `rgba(10,0,24,${b5.phase >= 4 ? 0.55 : 0.4})`);
      c.fillStyle = gr; c.beginPath(); c.ellipse(AX, AY, ARENA5.r + 30, ARENA5.r + 30, 0, 0, 7); c.fill(); }
    c.strokeStyle = b5.phase >= 3 ? "rgba(255,210,90,.8)" : "rgba(200,110,255,.7)"; c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = -g.time * 20; c.beginPath(); c.ellipse(AX, AY, ARENA5.r + 8, ARENA5.r + 8, 0, 0, 7); c.stroke(); c.setLineDash([]);
  }
  const b6 = g.mb.boss6;
  if (b6.active) {
    const a = arena6Center(), AX = a.x - cx, AY = a.y - cy, R = ARENA6.r;
    if (b6.phase >= 4) { // nightfall: the heart's ring goes dark at the edges
      const gr = c.createRadialGradient(AX, AY, 20, AX, AY, R + 40); gr.addColorStop(0, "rgba(10,0,16,0)"); gr.addColorStop(1, `rgba(8,0,18,${b6.phase >= 5 ? 0.5 : 0.4})`);
      c.fillStyle = gr; c.beginPath(); c.ellipse(AX, AY, R + 40, R + 40, 0, 0, 7); c.fill(); }
    // four-colour dashed ring, one quarter per stolen spring, spinning faster every phase
    const cols = ["rgba(255,70,90,.8)", "rgba(208,112,255,.8)", "rgba(127,240,255,.8)", "rgba(122,255,154,.8)"];
    c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = -g.time * 14 * b6.phase;
    for (let k = 0; k < 4; k++) { const s0 = g.time * 0.3 * b6.phase + k * 1.5708; c.strokeStyle = cols[k]; c.beginPath(); c.ellipse(AX, AY, R + 8, R + 8, 0, s0, s0 + 1.5708); c.stroke(); }
    c.setLineDash([]);
  }
  for (const h of g.mb.hazards) {
    if (h.max <= 0) continue;
    if (h.dusk != null) { const k = 1 - h.t / h.max, X = h.x - cx, Y = h.y - cy, RGB = ["255,60,80", "190,90,255", "90,230,255", "110,255,150"][h.dusk], HI = ["#ffb0b8", "#f0c0ff", "#d0ffff", "#d0ffe0"][h.dusk];
      if (h.safe) { c.strokeStyle = (g.frame >> 3) & 1 ? "#fff6c0" : "#ffd24a"; c.lineWidth = 2; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.stroke(); c.fillStyle = "rgba(255,230,150,.18)"; c.fill(); continue; }
      c.fillStyle = `rgba(${RGB},${0.14 + k * 0.3})`; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.fill();
      c.strokeStyle = (g.frame >> 2) & 1 ? HI : "#ffffff"; c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, h.r * k, (h.r * k) / 1.6, 0, 0, 7); c.stroke(); continue; }
    if (h.eclipse) { const k = 1 - h.t / h.max, X = h.x - cx, Y = h.y - cy;
      if (h.safe) { c.strokeStyle = (g.frame >> 3) & 1 ? "#fff6c0" : "#ffd24a"; c.lineWidth = 2; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.stroke(); continue; }
      c.fillStyle = `rgba(120,30,200,${0.15 + k * 0.3})`; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.fill();
      c.strokeStyle = (g.frame >> 2) & 1 ? "#ffd24a" : "#d080ff"; c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, h.r * k, (h.r * k) / 1.6, 0, 0, 7); c.stroke(); continue; }
    if (h.cage) { const k = 1 - h.t / h.max, X = h.x - cx, Y = h.y - cy; c.fillStyle = `rgba(255,40,90,${0.13 + k * 0.27})`; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.fill(); c.strokeStyle = (g.frame >> 2) & 1 ? "#ff8aa0" : "#c070ff"; c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, h.r * k, (h.r * k) / 1.6, 0, 0, 7); c.stroke(); continue; }
    const k = 1 - h.t / h.max, X = h.x - cx, Y = h.y - cy;
    c.fillStyle = h.tide ? `rgba(40,200,255,${0.14 + k * 0.28})` : `rgba(255,60,40,${0.12 + k * 0.25})`; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.fill();
    c.strokeStyle = h.tide ? ((g.frame >> 2) & 1 ? "#b8fff8" : "#c070ff") : (g.frame >> 2) & 1 ? "#ffef6a" : "#ff5a3a"; c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, h.r * k, (h.r * k) / 1.6, 0, 0, 7); c.stroke();
  }
}

/** Lights for the multiply layer. */
export function addLights(g: Game, cx: number, cy: number, add: (x: number, y: number, r: number, col: [number, number, number]) => void) {
  if (g.mb.tfOn) add(g.p.x - cx, g.p.y - cy - 14, 64, [0.5, 0.9, 1]);
  for (const o of g.mb.orbs) add(o.x - cx, o.y - cy, 16, [1, 0.85, 0.4]);
  for (const e of g.enemies) if (!e.dead && e.kind === "boss") add(e.x - cx, e.y - cy - 24, 56, g.mb.boss.phase === 3 ? [1, 0.3, 0.3] : [0.7, 0.4, 1]);
  for (const e of g.enemies) if (!e.dead && e.kind === "aurel") add(e.x - cx, e.y - cy - 24, 60, g.mb.boss3.phase >= 4 ? [0.8, 0.45, 1] : [0.35, 0.9, 1]);
  for (const e of g.enemies) if (!e.dead && (e.kind === "vey" || e.kind === "nell")) add(e.x - cx, e.y - cy - 24, 56, e.kind === "vey" ? [1, 0.3, 0.35] : [0.75, 0.4, 1]);
  for (const e of g.enemies) if (!e.dead && e.kind === "morvant") add(e.x - cx, e.y - cy - 26, 70, g.mb.boss5.phase >= 3 ? [1, 0.8, 0.35] : [0.75, 0.4, 1]);
  for (const e of g.enemies) if (!e.dead && e.kind === "malachar") { const L6: [number, number, number][] = [[1, 0.25, 0.3], [1, 0.25, 0.3], [0.8, 0.4, 1], [0.4, 0.95, 1], [0.5, 1, 0.6], [1, 0.95, 0.8]]; add(e.x - cx, e.y - cy - 28, 80, L6[g.mb.boss6.phase] ?? L6[1]); }
  for (const e of g.enemies) if (!e.dead && e.kind === "pylon") add(e.x - cx, e.y - cy - 20, 30, [1, 0.25, 0.35]);
  for (const e of g.enemies) { const s = !e.dead ? specOf(e.kind) : undefined; if (s) add(e.x - cx, e.y - cy - 22, 52, s.light); }
  for (const e of g.enemies) if (!e.dead && e.kind === "slag") add(e.x - cx, e.y - cy - 22, 64, [1, 0.5 - g.mb.boss2.phase * 0.08, 0.2]);
}

/** Additive pass: aura, beam charge, orbs, boss glow. */
export function drawAdditive(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number) {
  const p = g.p, X = p.x - cx, Y = p.y - cy, m = g.mb;
  if (m.tfOn) { const pulse = 0.6 + 0.4 * Math.sin(g.time * 14); glow(c, X, Y - 14, 22 + pulse * 4, "rgba(120,240,255,.55)"); glow(c, X, Y - 18, 12, "rgba(210,120,255,.5)", pulse); }
  if (m.chargingKi) glow(c, X, Y - 12, 18 + Math.sin(g.time * 30) * 2, "rgba(90,220,255,.45)");
  if (m.charging) { const k = m.charge / BEAM_FULL; glow(c, X + p.fx * 10, Y - 14 + p.fy * 8, 5 + k * 10, "rgba(255,120,255,.9)"); glow(c, X + p.fx * 10, Y - 14 + p.fy * 8, 3 + k * 3, "#fff"); }
  for (const o of m.orbs) { glow(c, o.x - cx, o.y - cy, 6, "rgba(255,210,90,.9)"); c.fillStyle = "#fff6c0"; c.fillRect(o.x - cx - 1, o.y - cy - 1, 2, 2); }
  for (const e of g.enemies) if (!e.dead && e.kind === "boss") {
    const col = m.boss.phase === 3 ? "rgba(255,60,60,.8)" : "rgba(200,90,255,.8)";
    glow(c, e.x - cx, e.y - cy - 40, e.state === "tele" ? 12 + Math.sin(g.time * 30) * 3 : 7, col);
    if (m.boss.lockT > 0) glow(c, e.x - cx, e.y - cy - 24, 40, "rgba(255,120,200,.35)");
  }
  for (const e of g.enemies) if (!e.dead && e.kind === "aurel") {
    glow(c, e.x - cx, e.y - cy - 46, e.state === "tele" ? 9 + Math.sin(g.time * 30) * 2 : 6, "rgba(120,250,255,.85)"); // cold crown
    glow(c, e.x - cx + 8, e.y - cy - 24, e.state === "tele" ? 7 : 4, m.boss3.phase >= 3 ? "rgba(200,110,255,.8)" : "rgba(90,230,255,.7)"); // rapier
    if (m.boss3.lockT > 0) glow(c, e.x - cx, e.y - cy - 24, 44, "rgba(80,220,255,.35)");
  }
  for (const e of g.enemies) if (!e.dead && (e.kind === "vey" || e.kind === "nell")) {
    const col = e.kind === "vey" ? "rgba(255,60,80,.85)" : "rgba(200,110,255,.85)";
    glow(c, e.x - cx, e.y - cy - 46, e.state === "tele" ? 9 + Math.sin(g.time * 30) * 2 : 5, col); // hood slit
    if (m.boss4.phase >= 3) glow(c, e.x - cx, e.y - cy - 24, 30 + Math.sin(g.time * 16) * 4, "rgba(255,40,60,.35)");
    if (pylonsOf(g).length > 0 || m.boss4.lockT > 0) glow(c, e.x - cx, e.y - cy - 24, 40, "rgba(200,110,255,.3)");
  }
  for (const e of g.enemies) if (!e.dead && e.kind === "morvant") {
    const EX = e.x - cx, EY = e.y - cy, ph = m.boss5.phase, pulse = Math.sin(g.time * (e.state === "tele" ? 24 : 6));
    glow(c, EX, EY - 30, 12 + pulse * 2 + (e.state === "tele" ? 6 : 0), "rgba(255,200,70,.85)"); // gold corona around the chest eclipse
    glow(c, EX, EY - 30, 5, "rgba(190,90,255,.9)");
    glow(c, EX, EY - 52, 6 + pulse, "rgba(255,220,110,.8)"); // crescent horns
    for (let k = 0; k < 4; k++) { const a = g.time * 1.6 + k * 1.5708, r = 20 + ph * 2; glow(c, EX + Math.cos(a) * r, EY - 30 + Math.sin(a) * r * 0.5, 3, k & 1 ? "rgba(255,210,90,.9)" : "rgba(200,110,255,.9)"); } // orbiting motes
    if (ph >= 3) glow(c, EX, EY - 28, 34 + pulse * 4, "rgba(150,60,255,.3)");
    if (m.boss5.lockT > 0) glow(c, EX, EY - 28, 46, "rgba(255,210,90,.35)");
  }
  for (const e of g.enemies) if (!e.dead && e.kind === "morvant" && e.state === "tele") {
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
    c.fillStyle = (g.frame >> 2) & 1 ? "#ffd24a" : "#c070ff"; c.fillRect(X - 2, Y - 80, 4, 9); c.fillRect(X - 2, Y - 69, 4, 3);
    if (e.move.startsWith("beam")) { const a0 = Math.atan2(e.ay, e.ax); c.strokeStyle = "rgba(255,210,90,.9)"; c.lineWidth = 2; c.setLineDash([4, 3]);
      for (const o of e.move === "beam2" ? [0, 1.5708, 3.1416, 4.7124] : [0]) { c.beginPath(); c.moveTo(X, Y - 6); c.lineTo(X + Math.cos(a0 + o) * 128, Y - 6 + Math.sin(a0 + o) * 128); c.stroke(); } c.setLineDash([]); }
    if (e.move === "orbit") { c.strokeStyle = "rgba(200,110,255,.8)"; c.lineWidth = 1; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(X, Y - 18, 14 + i * 10 + Math.sin(g.time * 20) * 2, 0, 7); c.stroke(); } }
    if (e.move === "slam" || e.move === "nova" || e.move === "eclipse") { c.strokeStyle = "rgba(255,200,80,.85)"; c.lineWidth = 1; c.beginPath(); c.arc(X, Y - 26, 10 + (1 - Math.min(1, e.t)) * 30, 0, 7); c.stroke(); }
  }
  for (const e of g.enemies) if (!e.dead && e.kind === "malachar") {
    const EX = e.x - cx, EY = e.y - cy, ph = m.boss6.phase, tele = e.state === "tele", pulse = Math.sin(g.time * (tele ? 26 : 6));
    const NEON = ["rgba(255,60,80,.9)", "rgba(200,100,255,.9)", "rgba(110,240,255,.9)", "rgba(110,255,150,.9)"];
    glow(c, EX, EY - 54 + Math.sin(g.time * 3) * 1.5, 9 + pulse * 2 + (tele ? 5 : 0), "rgba(255,50,70,.85)"); // crown of red spikes
    glow(c, EX, EY - 30, 6 + (tele ? 4 : 0), "rgba(255,255,255,.5)"); // warden sigil
    for (let k = 0; k < 4; k++) { const a = g.time * (1.4 + ph * 0.3) + k * 1.5708, r = 18 + ph * 3; glow(c, EX + Math.cos(a) * r, EY - 30 + Math.sin(a) * r * 0.5, 3.5 + (ph >= 5 ? 1.5 : 0), NEON[k]); } // the four stolen springs orbit him
    if (ph >= 3) glow(c, EX, EY - 28, 30 + pulse * 4, ph >= 5 ? "rgba(255,240,200,.3)" : "rgba(170,60,255,.28)");
    if (m.boss6.lockT > 0) glow(c, EX, EY - 28, 50, NEON[(g.frame >> 3) & 3].replace(".9)", ".35)"));
    if (tele) {
      const X = Math.round(EX), Y = Math.round(EY);
      c.fillStyle = (g.frame >> 2) & 1 ? "#ff4a5a" : "#7ff0ff"; c.fillRect(X - 2, Y - 76, 4, 9); c.fillRect(X - 2, Y - 65, 4, 3);
      if (e.move === "prism") { const a0 = Math.atan2(e.ay, e.ax), n = ph >= 5 ? 8 : 4; c.lineWidth = 2; c.setLineDash([4, 3]);
        for (let k = 0; k < n; k++) { c.strokeStyle = NEON[k & 3]; c.beginPath(); c.moveTo(X, Y - 6); c.lineTo(X + Math.cos(a0 + (k / n) * 6.28) * 134, Y - 6 + Math.sin(a0 + (k / n) * 6.28) * 134); c.stroke(); } c.setLineDash([]); }
      if (e.move === "spiral" || e.move === "cast") { c.strokeStyle = NEON[1]; c.lineWidth = 1; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(X, Y - 20, 14 + i * 10 + Math.sin(g.time * 20) * 2, 0, 7); c.stroke(); } }
      if (e.move === "rain" || e.move === "nova" || e.move === "dusk") { c.strokeStyle = e.move === "rain" ? NEON[0] : NEON[2]; c.lineWidth = 1; c.beginPath(); c.arc(X, Y - 28, 10 + (1 - Math.min(1, e.t)) * 32, 0, 7); c.stroke(); }
    }
  }
  for (const e of g.enemies) if (!e.dead && e.kind === "pylon") glow(c, e.x - cx, e.y - cy - 20, 10 + Math.sin(g.time * 8) * 2, "rgba(255,60,90,.8)");
  drawMiniGlow(g, cx, cy, (x, y, r, col) => glow(c, x, y, r, col));
  for (const e of g.enemies) if (!e.dead && e.kind === "slag") {
    const hot = e.state === "tele" ? 1 : 0.6;
    glow(c, e.x - cx, e.y - cy - 30, 14 + hot * 6 + Math.sin(g.time * 12) * 2, m.boss2.phase === 3 ? "rgba(255,70,30,.85)" : "rgba(255,150,50,.75)");
    if (m.boss2.lockT > 0) glow(c, e.x - cx, e.y - cy - 24, 44, "rgba(255,140,60,.35)");
  }
}

/** Player shots per technique. Returns true if drawn. */
export function drawShot(c: CanvasRenderingContext2D, s: Shot, X: number, Y: number) {
  if (s.foe || s.tech == null || s.tech === 0) return false;
  if (s.tech === 1) { const n = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / n, uy = s.vy / n, r = s.r ?? 6; for (let k = 0; k < 4; k++) glow(c, X - ux * k * 8, Y - uy * k * 8, r + 6 - k, "rgba(255,110,255,.8)"); glow(c, X, Y, r, "#fff"); return true; }
  glow(c, X, Y, 8, "rgba(255,200,80,.9)"); glow(c, X, Y, 3, "#fff"); return true;
}

/** Overlay telegraphs for boss moves (over the light). */
export function drawTelegraphs(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number) {
  drawMiniTele(c, g, cx, cy);
  drawFxStrips(c, g, cx, cy); // art pack 3 strips over the glow
  for (const e of g.enemies) if (!e.dead && e.kind === "boss" && e.state === "tele") {
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
    c.fillStyle = (g.frame >> 2) & 1 ? "#ffef6a" : "#ff5a3a"; c.fillRect(X - 2, Y - 74, 4, 9); c.fillRect(X - 2, Y - 63, 4, 3);
    if (e.move.startsWith("dash")) { c.strokeStyle = "rgba(255,80,60,.85)"; c.lineWidth = 3; c.beginPath(); c.moveTo(X, Y - 6); c.lineTo(X + e.ax * 120, Y - 6 + e.ay * 120); c.stroke(); }
    if (e.move === "ring" || e.move === "spiral") { c.strokeStyle = "rgba(220,90,255,.8)"; c.lineWidth = 1; c.beginPath(); c.arc(X, Y - 22, 10 + (1 - e.t) * 30, 0, 7); c.stroke(); }
    if (e.move === "fan") { const a = Math.atan2(e.ay, e.ax); c.strokeStyle = "rgba(255,160,60,.6)"; c.beginPath(); c.moveTo(X, Y - 22); c.arc(X, Y - 22, 50, a - 0.45, a + 0.45); c.closePath(); c.stroke(); }
  }
  for (const e of g.enemies) if (!e.dead && e.kind === "slag" && e.state === "tele") {
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
    c.fillStyle = (g.frame >> 2) & 1 ? "#ffef6a" : "#ff5a3a"; c.fillRect(X - 2, Y - 76, 4, 9); c.fillRect(X - 2, Y - 65, 4, 3);
    if (e.move === "charge") { c.strokeStyle = "rgba(255,120,40,.9)"; c.lineWidth = 4; c.beginPath(); c.moveTo(X, Y - 6); c.lineTo(X + e.ax * 130, Y - 6 + e.ay * 130); c.stroke(); }
    if (e.move === "summon") { c.strokeStyle = "rgba(255,90,40,.8)"; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28 + g.time; c.beginPath(); c.arc(X + Math.cos(a) * 34, Y + Math.sin(a) * 24, 6 + Math.sin(g.time * 20) * 2, 0, 7); c.stroke(); } }
  }
  for (const e of g.enemies) if (!e.dead && e.kind === "aurel" && e.state === "tele") {
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
    c.fillStyle = (g.frame >> 2) & 1 ? "#b8fff8" : "#c070ff"; c.fillRect(X - 2, Y - 78, 4, 9); c.fillRect(X - 2, Y - 67, 4, 3);
    if (e.move.startsWith("lunge")) { c.strokeStyle = "rgba(120,250,255,.9)"; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X, Y - 10); c.lineTo(X + e.ax * 110, Y - 10 + e.ay * 110); c.stroke(); c.setLineDash([]); }
    if (e.move === "summon") { c.strokeStyle = "rgba(190,110,255,.85)"; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28 + g.time; c.beginPath(); c.arc(X + Math.cos(a) * 34, Y + Math.sin(a) * 24, 6 + Math.sin(g.time * 20) * 2, 0, 7); c.stroke(); } }
  }
  for (const e of g.enemies) if (!e.dead && (e.kind === "vey" || e.kind === "nell") && e.state === "tele") {
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
    c.fillStyle = (g.frame >> 2) & 1 ? "#ff8aa0" : e.kind === "vey" ? "#ff3a4a" : "#c070ff"; c.fillRect(X - 2, Y - 78, 4, 9); c.fillRect(X - 2, Y - 67, 4, 3);
    if (e.move === "cross" || e.move === "chain") { c.strokeStyle = e.kind === "vey" ? "rgba(255,70,90,.9)" : "rgba(200,110,255,.9)"; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X, Y - 6); c.lineTo(X + e.ax * 120, Y - 6 + e.ay * 120); c.stroke(); c.setLineDash([]); }
    if (e.move === "orbs") { const a = Math.atan2(e.ay, e.ax); c.strokeStyle = "rgba(200,110,255,.6)"; c.beginPath(); c.moveTo(X, Y - 16); c.arc(X, Y - 16, 50, a - 0.5, a + 0.5); c.closePath(); c.stroke(); }
    if (e.move === "swap" || e.move === "rage") { c.strokeStyle = "rgba(255,90,140,.8)"; c.lineWidth = 1; c.beginPath(); c.arc(X, Y - 22, 10 + (1 - Math.min(1, e.t)) * 30, 0, 7); c.stroke(); }
  }
  for (const e of g.enemies) if (!e.dead && roleOf(e.kind) === "warden" && e.state === "tele") {
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
    c.fillStyle = (g.frame >> 2) & 1 ? "#ffef6a" : "#ff5a3a"; c.fillRect(X - 1, Y - 40, 3, 7); c.fillRect(X - 1, Y - 31, 3, 2);
  }
}

export function drawHudMB(c: CanvasRenderingContext2D, g: Game, W: number) {
  const m = g.mb, t = TECHS[m.tech];
  // technique icon (bolt / beam / spread)
  c.fillStyle = "#000c"; c.fillRect(4, 4, 22, 22); c.strokeStyle = m.tfOn ? "#7ff0ff" : "#8a7cff"; c.lineWidth = 1; c.strokeRect(4.5, 4.5, 21, 21);
  c.globalCompositeOperation = "lighter";
  if (t.id === "bolt") { glow(c, 15, 15, 8, t.col); glow(c, 15, 15, 3, "#fff"); }
  else if (t.id === "beam") { for (let k = 0; k < 4; k++) glow(c, 8 + k * 4, 15, 5, t.col); glow(c, 21, 15, 3, "#fff"); }
  else for (let k = -1; k <= 1; k++) { glow(c, 18, 15 + k * 5, 4, t.col); glow(c, 18, 15 + k * 5, 1.5, "#fff"); }
  c.globalCompositeOperation = "source-over";
  c.font = "5px monospace"; c.textAlign = "left"; c.fillStyle = g.ep >= t.cost ? "#cfe" : "#f66"; c.fillText(String(t.cost), 6, 24);
  // power meter
  const full = g.tf >= 100 && !m.tfOn;
  c.fillStyle = "#000"; c.fillRect(3, 29, 24, 5); c.fillStyle = "#1a1424"; c.fillRect(4, 30, 22, 3);
  c.fillStyle = m.tfOn ? (g.frame & 4 ? "#7ff0ff" : "#d070ff") : full ? (g.frame & 8 ? "#ff7aff" : "#c060ff") : "#9050d0"; c.fillRect(4, 30, Math.round(22 * g.tf / 100), 3);
  c.font = "6px monospace"; c.fillStyle = m.tfOn ? "#7ff0ff" : "#c9b"; c.fillText(m.tfOn ? `AWAKE ${Math.ceil(m.tfT)}` : full ? "TF RDY" : "PWR", 4, 40);
  // twin boss bars (two halves + pylon count)
  const tw = g.mb.boss4.active ? (["vey", "nell"] as const).map((k) => g.enemies.find((e) => e.kind === k)) : [];
  if (tw.length) {
    const st = g.mb.boss4, w = 200, x = W / 2 - w / 2, y = 202, py = pylonsOf(g).length;
    c.fillStyle = "#000c"; c.fillRect(x - 2, y - 9, w + 4, 15);
    c.font = "bold 6px monospace"; c.textAlign = "center"; c.fillStyle = "#ffd0dc";
    c.fillText(`Cageward Twins · PHASE ${st.phase}${py ? ` · SHIELDED ${py}/3 PYLONS` : st.phase >= 3 ? " · ENRAGED" : ""}`, W / 2, y - 2);
    tw.forEach((e, k) => { const bx = x + k * (w / 2 + 2), bw = w / 2 - 2; c.fillStyle = "#2a1020"; c.fillRect(bx, y, bw, 4); if (e && !e.dead) { c.fillStyle = py ? "#8a6a9a" : k ? "#c070ff" : "#ff3a5a"; c.fillRect(bx, y, Math.round(bw * Math.max(0, e.hp / e.max)), 4); } });
    return;
  }
  // boss bar
  const b = g.enemies.find((e) => (e.kind === "boss" || e.kind === "slag" || e.kind === "aurel" || e.kind === "morvant" || e.kind === "malachar" || isMini(e.kind)) && !e.dead);
  if (b) {
    const st = miniState(g, b.kind) ?? (b.kind === "slag" ? g.mb.boss2 : b.kind === "aurel" ? g.mb.boss3 : b.kind === "morvant" ? g.mb.boss5 : b.kind === "malachar" ? g.mb.boss6 : g.mb.boss), fin = b.kind === "malachar", hot = b.kind === "slag", tide = b.kind === "aurel", ecl = b.kind === "morvant";
    const w = 200, x = W / 2 - w / 2, y = 202;
    c.fillStyle = "#000c"; c.fillRect(x - 2, y - 9, w + 4, 15);
    c.font = "bold 6px monospace"; c.textAlign = "center"; c.fillStyle = fin ? "#ffd0e0" : ecl ? "#ffe8a0" : tide ? "#c8fff8" : hot ? "#ffe0b0" : "#ffd0e8"; c.fillText(`${FOE_INFO[b.kind].name} · PHASE ${st.phase}`, W / 2, y - 2);
    c.fillStyle = "#2a1020"; c.fillRect(x, y, w, 4); c.fillStyle = fin ? ["#ff3a5a", "#ff3a5a", "#c070ff", "#3ee0ff", "#5aff8a", (g.frame >> 2) & 1 ? "#ffffff" : "#ffe08a"][st.phase] : ecl ? (st.phase >= 3 ? ((g.frame >> 3) & 1 ? "#ffd24a" : "#f0a830") : "#b060ff") : tide ? (st.phase >= 4 ? "#c070ff" : st.phase === 3 ? "#7a8aff" : "#3ee0ff") : st.phase === 3 ? "#ff3a5a" : hot ? "#ff9a2a" : "#c050ff"; c.fillRect(x, y, Math.round(w * Math.max(0, b.hp / b.max)), 4);
    c.fillStyle = "#fff6"; for (const k of fin ? [0.2, 0.4, 0.6, 0.8] : tide || ecl ? [0.25, 0.5, 0.75] : [0.33, 0.66]) c.fillRect(x + Math.round(w * k), y, 1, 4);
  }
}

/** Companions: own sheets, a sash (Mirela teal, Brann amber) + small HP pip bar so they read as allies, slumped when knocked out. */
export function allyDraw(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number, list: { y: number; d: () => void }[]) {
  for (const a of g.mb.allies) { if (!a.joined || a.x < 0) continue;
  const R = ROLES[a.id];
  list.push({ y: a.y, d: () => {
    const x = a.x - cx, y = a.y - cy, s = sheet(a.id);
    if (a.inv > 0 && !a.ko && g.frame % 6 < 3) return;
    c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(x, y, 8, 2.5, 0, 0, 7); c.fill();
    let anim = "idle", i = g.time * 5;
    if (a.ko) { anim = "hurt"; i = 1; }
    else if (a.inv > 0.3) { anim = "hurt"; i = 0; }
    else if (a.atk > 0) { anim = a.atkStep === 4 ? "blast" : a.atkStep === 1 ? "punch1" : a.atkStep === 2 ? "punch2" : "kick"; i = (1 - a.atk / 0.28) * 3; }
    else if (g.mb.tfOn && !a.moving) { anim = "fly"; i = g.time * 4; }
    else if (a.moving) { anim = "walk"; i = a.walk / 1.6; }
    const f = facingOf(a.fx, a.fy);
    if (a.ko) c.globalAlpha = 0.55;
    const ok = drawSprite(c, s, anim, f, i, x, y + (a.ko ? 4 : 0), { lift: anim === "fly" ? 5 + Math.sin(g.time * 4 + 1) * 2 : 0 });
    if (!ok) { c.fillStyle = "#6a4a8a"; c.fillRect(x - 6, y - 26, 12, 25); c.fillStyle = "#e8c8a8"; c.fillRect(x - 4, y - 32, 8, 7); }
    // sash: teal diagonal band shoulder to hip
    const ly = anim === "fly" ? 5 : 0, sx = f === "left" ? 1 : -1;
    c.fillStyle = R.sash; for (let k = 0; k < 7; k++) c.fillRect(Math.round(x + sx * (3 - k)), Math.round(y - 22 + k - ly), 2, 2);
    c.fillStyle = R.sashD; c.fillRect(Math.round(x - sx * 4), Math.round(y - 15 - ly), 2, 4);
    c.globalAlpha = 1;
    // HP pip bar
    c.fillStyle = "#000a"; c.fillRect(Math.round(x - 8), Math.round(y - 37), 16, 3);
    c.fillStyle = a.ko ? "#555" : a.hp < a.max * 0.3 ? "#ff6a6a" : R.sash; c.fillRect(Math.round(x - 7), Math.round(y - 36), Math.round(14 * a.hp / a.max), 1);
    if (a.ko) { c.font = "5px monospace"; c.textAlign = "center"; c.fillStyle = "#cfe"; c.fillText("KO", x, y - 39); }
  } });
}
}
