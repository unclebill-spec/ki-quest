/** W17 drawing (Master Builder): Hollowmere / Warden Rune anims, arena rings, `mere` / `rune` hazard telegraphs, lights, glow,
 * the opt-in Hollowmere ripple, fog-surge darkening and the Stillwater Charm light. Hooked from draw.ts (`// MB hook W17`). */
import type { Game } from "../../game";
import type { Enemy } from "../enemies/types";
import { ARENA11, arena11Center, fogDark, hollowReady, hollowSunk } from "../enemies/hollowmere";
import { ARENA12, arena12Center } from "../enemies/wardenrune";
import { stillwater, STILL_LIGHT } from "./w17";

/** [anim, frame] for the new bosses, or "hide" while Hollowmere is under the water. */
export function anim17(g: Game, e: Enemy): [string, number] | "hide" | null {
  if (e.kind === "hollowmere") {
    if (hollowSunk(e)) return e.state === "act" ? "hide" : ["sink", 2];
    if (g.mb.boss11.lockT > 0) return ["hurt", 0];
    if (e.move === "sink" && e.state === "tele") return ["sink", Math.min(2, (1 - e.t / 0.8) * 3)];
    if (e.move === "sink" && e.state === "recover") return ["sink", Math.max(0, 2 - (1.1 - e.t) * 4)];
    if (e.state === "tele" || e.state === "act") return ["attack", e.state === "tele" ? 0 : 1 + (g.time * 8) % 2];
    if (e.state === "recover") return ["idle", 0];
    return ["walk", g.time * 4];
  }
  if (e.kind === "wardenrune") {
    if (g.mb.boss12.lockT > 0) return ["hurt", 0];
    const A: Record<string, string> = { glyph: "cast", slam: "slam", wall: "slam", beams: "cast", seal: "seal", echo: "cast" };
    if (e.state === "tele" || e.state === "act") return [A[e.move] ?? "cast", e.state === "tele" ? 0 : 1 + (g.time * 8) % 2];
    return ["idle", g.time * (g.mb.boss12.phase >= 5 ? 5 : 3)];
  }
  return null;
}

function ring(c: CanvasRenderingContext2D, X: number, Y: number, r: number, col: string, off: number) {
  c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = off; c.beginPath(); c.ellipse(X, Y, r, r, 0, 0, 7); c.stroke(); c.setLineDash([]);
}

export function drawGround17(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number) {
  const b11 = g.mb.boss11, b12 = g.mb.boss12;
  if (hollowReady(g)) { // the opt-in ripple: step in to wake it
    const a = arena11Center(), X = a.x - cx, Y = a.y - cy;
    for (let k = 0; k < 3; k++) { const r = ((g.time * 10 + k * 7) % 21) + 3; c.strokeStyle = `rgba(176,112,255,${0.6 - r / 40})`; c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, r, r / 1.6, 0, 0, 7); c.stroke(); }
  }
  if (b11.active) {
    const a = arena11Center(), X = a.x - cx, Y = a.y - cy;
    if (fogDark > 0) { const gr = c.createRadialGradient(X, Y, 10, X, Y, ARENA11.r + 40); gr.addColorStop(0, `rgba(30,24,60,${0.25 * fogDark})`); gr.addColorStop(1, `rgba(20,16,44,${0.6 * fogDark})`);
      c.fillStyle = gr; c.beginPath(); c.ellipse(X, Y, ARENA11.r + 40, ARENA11.r + 40, 0, 0, 7); c.fill(); }
    ring(c, X, Y, ARENA11.r + 8, b11.phase >= 3 ? "rgba(122,255,234,.75)" : "rgba(176,112,255,.7)", -g.time * 16);
  }
  if (b12.active) {
    const a = arena12Center(), X = a.x - cx, Y = a.y - cy, R = ARENA12.r;
    c.lineWidth = 1; c.strokeStyle = `rgba(90,240,255,${0.25 + 0.05 * b12.phase})`;
    for (let k = 0; k < 6; k++) { const s0 = g.time * 0.25 * b12.phase + k * 1.047; c.beginPath(); c.moveTo(X + Math.cos(s0) * (R - 20), Y + Math.sin(s0) * (R - 20) * 0.8); c.lineTo(X + Math.cos(s0 + 2.094) * (R - 20), Y + Math.sin(s0 + 2.094) * (R - 20) * 0.8); c.stroke(); }
    ring(c, X, Y, R + 8, b12.phase >= 6 ? ((g.frame >> 3) & 1 ? "rgba(255,255,255,.85)" : "rgba(90,240,255,.85)") : "rgba(90,240,255,.75)", -g.time * 12 * b12.phase);
    ring(c, X, Y, R - 4, "rgba(255,210,90,.45)", g.time * 8);
  }
  for (const h of g.mb.hazards) {
    if (h.max <= 0 || (h.mere == null && h.rune == null)) continue;
    const k = 1 - h.t / h.max, X = h.x - cx, Y = h.y - cy;
    if (h.safe) { // lantern / reed island / seal centre
      c.strokeStyle = (g.frame >> 3) & 1 ? "#fff6c0" : "#ffd24a"; c.lineWidth = 2; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.stroke(); c.fillStyle = "rgba(255,230,150,.18)"; c.fill();
      if (h.mere === 2) { c.fillStyle = "#ffd24a"; c.fillRect(X - 1, Y - 9, 3, 6); c.fillStyle = "#fff6c0"; c.fillRect(X, Y - 8, 1, 2); }
      continue; }
    const [RGB, HI] = h.rune != null ? (h.rune ? ["255,200,80", "#fff0b0"] : ["70,240,255", "#d0ffff"]) : [["176,112,255", "#f0c8ff"], ["58,200,192", "#b8fff0"], ["90,90,142", "#c8c8ff"]][h.mere ?? 0];
    c.fillStyle = `rgba(${RGB},${0.14 + k * 0.3})`; c.beginPath(); c.ellipse(X, Y, h.r, h.r / 1.6, 0, 0, 7); c.fill();
    c.strokeStyle = (g.frame >> 2) & 1 ? HI : "#ffffff"; c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, h.r * k, (h.r * k) / 1.6, 0, 0, 7); c.stroke();
    if (h.rune === 0 && h.r >= 18) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.047 + g.time; c.lineTo(X + Math.cos(a) * h.r * 0.7, Y + Math.sin(a) * h.r * 0.44); } c.closePath(); c.stroke(); }
    if (h.mere === 0) { c.strokeStyle = "rgba(122,255,234,.6)"; c.beginPath(); c.ellipse(X, Y, h.r * 0.5 + Math.sin(g.time * 8) * 2, h.r * 0.3, 0, 0, 7); c.stroke(); }
  }
}
export const skipHazard17 = (h: { mere?: number; rune?: number }) => h.mere != null || h.rune != null;

export function addLights17(g: Game, cx: number, cy: number, add: (x: number, y: number, r: number, col: [number, number, number]) => void) {
  if (stillwater(g)) add(g.p.x - cx, g.p.y - cy - 12, STILL_LIGHT, [0.75, 0.6, 1]);
  for (const e of g.enemies) if (!e.dead && e.kind === "hollowmere" && !hollowSunk(e)) add(e.x - cx, e.y - cy - 20, 64, g.mb.boss11.phase >= 3 ? [0.45, 1, 0.92] : [0.7, 0.45, 1]);
  for (const e of g.enemies) if (!e.dead && e.kind === "wardenrune") add(e.x - cx, e.y - cy - 34, 84, g.mb.boss12.phase >= 6 ? [1, 0.95, 0.75] : [0.35, 0.95, 1]);
}

const glow = (c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); };
export function drawAdditive17(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number) {
  for (const e of g.enemies) if (!e.dead && e.kind === "hollowmere" && !hollowSunk(e)) {
    glow(c, e.x - cx, e.y - cy - 22, e.state === "tele" ? 14 + Math.sin(g.time * 26) * 3 : 8, "rgba(122,255,234,.7)");
    if (g.mb.boss11.lockT > 0) glow(c, e.x - cx, e.y - cy - 20, 40, "rgba(176,112,255,.35)");
  }
  for (const e of g.enemies) if (!e.dead && e.kind === "wardenrune") {
    const X = e.x - cx, Y = e.y - cy, tele = e.state === "tele";
    glow(c, X, Y - 44, tele ? 12 + Math.sin(g.time * 30) * 3 : 7, "rgba(90,240,255,.9)");
    glow(c, X, Y - 30, 10, "rgba(90,240,255,.6)");
    if (tele) { c.strokeStyle = e.move === "echo" ? "rgba(255,150,80,.9)" : "rgba(90,240,255,.9)"; c.lineWidth = 1; c.beginPath(); c.arc(X, Y - 30, 10 + (1 - Math.min(1, e.t)) * 30, 0, 7); c.stroke(); }
    if (g.mb.boss12.lockT > 0) glow(c, X, Y - 30, 52, "rgba(255,210,90,.35)");
  }
}
/** Boss-bar colours / phase ticks for the W17 bosses. */
export function bar17(g: Game, kind: string, phase: number): { fill: string; text: string; ticks: number[] } | null {
  if (kind === "hollowmere") return { fill: phase >= 3 ? "#7affea" : phase === 2 ? "#8a8ae0" : "#b070ff", text: "#e8d8ff", ticks: [0.33, 0.66] };
  if (kind === "wardenrune") return { fill: phase >= 6 ? ((g.frame >> 2) & 1 ? "#ffffff" : "#5af0ff") : phase >= 4 ? "#ffd24a" : "#3ee0ff", text: "#d0ffff", ticks: [0.2, 0.4, 0.55, 0.7, 0.85] };
  return null;
}
