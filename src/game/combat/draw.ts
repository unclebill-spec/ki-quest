/** Master Builder render hooks: sprites, telegraphs, orbs, aura, technique HUD, power meter, boss bar. */
import type { Game, Shot } from "../../game";
import type { Enemy } from "../enemies/types";
import { FOE_INFO } from "../enemies/types";
import { sheet, drawSprite, facingOf } from "./sprites";
import { TECHS, BEAM_FULL } from "./techniques";
import { ARENA, arenaCenter } from "../enemies/boss";
import { ARENA2, arena2Center } from "../enemies/slagheart";
import { ROLES } from "./companion";

export let HERO_SHEET = "rook";
export function setHero(n: string) { HERO_SHEET = n; }
const FOE_SHEET: Record<Enemy["kind"], string> = { brute: "vesper_squire", wisp: "vesper_hexer", warden: "watch_guard", boss: "warden_rune", slag: "slag_golem" };
export function preloadSheets() { sheet(HERO_SHEET); sheet("mirela"); sheet("brann"); Object.values(FOE_SHEET).forEach(sheet); }

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
  const s = sheet(FOE_SHEET[e.kind]), f = facingOf(g.p.x - e.x, g.p.y - e.y), fl = e.flash > 0;
  let anim = "walk", i = g.time * 7;
  if (e.hurt > 0) { anim = "hurt"; i = 0; }
  else if (e.kind === "boss") {
    if (g.mb.boss.lockT > 0) { anim = "guard"; i = g.time * 4; }
    else if (e.move.startsWith("slam")) anim = "stomp", i = e.state === "tele" ? 0 : 2;
    else if (e.state === "tele" || e.state === "act") { anim = e.move.startsWith("dash") ? "attack" : "beam"; i = e.state === "tele" ? 0 : 1 + (g.time * 8) % 2; }
    else if (e.state === "recover") { anim = "stand"; i = 0; }
  } else if (e.kind === "slag") {
    const A: Record<string, string> = { charge: "charge", rain: "rain", crack: "slam", crack3: "slam", summon: "summon" };
    if (g.mb.boss2.lockT > 0) { anim = "hurt"; i = 0; }
    else if (e.state === "tele" || e.state === "act") { anim = A[e.move] ?? "charge"; i = e.state === "tele" ? (e.move === "summon" ? 0 : Math.min(1, g.time * 3 % 2)) : 2; }
    else if (e.state === "recover") { anim = "stand"; i = 0; }
    else i = g.time * 4;
  } else if (e.kind === "warden" && e.guard && e.state !== "tele") { anim = "block"; i = e.state === "chase" ? 0 : 1; }
  else if (e.state === "tele") { anim = "attack"; i = 0; }
  else if (e.state === "act") { anim = "attack"; i = 1 + (g.time * 10) % 2; }
  else if (e.state === "recover" || e.state === "idle" && e.kind !== "wisp") { anim = e.state === "idle" ? "walk" : "stand"; }
  const bob = e.kind === "wisp" ? Math.sin(g.time * 4 + e.hx) * 2 : 0;
  c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(x, y, e.kind === "boss" || e.kind === "slag" ? 18 : 8, e.kind === "boss" || e.kind === "slag" ? 5 : 2.5, 0, 0, 7); c.fill();
  if (drawSprite(c, s, anim, f, i, x, y, { flash: fl, lift: -bob })) return true;
  if (e.kind === "warden") {
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
  for (const h of g.mb.hazards) {
    if (h.max <= 0) continue;
    const k = 1 - h.t / h.max, X = h.x - cx, Y = h.y - cy;
    c.fillStyle = `rgba(255,60,40,${0.12 + k * 0.25})`; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.fill();
    c.strokeStyle = (g.frame >> 2) & 1 ? "#ffef6a" : "#ff5a3a"; c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, h.r * k, (h.r * k) / 1.6, 0, 0, 7); c.stroke();
  }
}

/** Lights for the multiply layer. */
export function addLights(g: Game, cx: number, cy: number, add: (x: number, y: number, r: number, col: [number, number, number]) => void) {
  if (g.mb.tfOn) add(g.p.x - cx, g.p.y - cy - 14, 64, [0.5, 0.9, 1]);
  for (const o of g.mb.orbs) add(o.x - cx, o.y - cy, 16, [1, 0.85, 0.4]);
  for (const e of g.enemies) if (!e.dead && e.kind === "boss") add(e.x - cx, e.y - cy - 24, 56, g.mb.boss.phase === 3 ? [1, 0.3, 0.3] : [0.7, 0.4, 1]);
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
  for (const e of g.enemies) if (!e.dead && e.kind === "warden" && e.state === "tele") {
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
  // boss bar
  const b = g.enemies.find((e) => (e.kind === "boss" || e.kind === "slag") && !e.dead);
  if (b) {
    const st = b.kind === "slag" ? g.mb.boss2 : g.mb.boss, hot = b.kind === "slag";
    const w = 200, x = W / 2 - w / 2, y = 202;
    c.fillStyle = "#000c"; c.fillRect(x - 2, y - 9, w + 4, 15);
    c.font = "bold 6px monospace"; c.textAlign = "center"; c.fillStyle = hot ? "#ffe0b0" : "#ffd0e8"; c.fillText(`${FOE_INFO[b.kind].name} · PHASE ${st.phase}`, W / 2, y - 2);
    c.fillStyle = "#2a1020"; c.fillRect(x, y, w, 4); c.fillStyle = st.phase === 3 ? "#ff3a5a" : hot ? "#ff9a2a" : "#c050ff"; c.fillRect(x, y, Math.round(w * Math.max(0, b.hp / b.max)), 4);
    c.fillStyle = "#fff6"; for (const k of [0.33, 0.66]) c.fillRect(x + Math.round(w * k), y, 1, 4);
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
