/**
 * Art pack 3 FX strips (public/art/fx/<name>.json/png), layered over the procedural glow/particles.
 * Draw-side only: one-shots are spawned by watching game state between frames (no sim hooks, no RNG, no damage/timing change).
 * kiblast_charge on the hand while charging, kiblast_projectile on Ki Bolt shots, kiblast_impact where a player shot ends,
 * flight_takeoff_dust when hover starts, flight_trail behind the transformed hero while moving, transform_burst on transform (then loops 4-7).
 * Owner: Master Builder.
 */
import type { Game } from "../../game";
import { BEAM_FULL } from "./techniques";

interface Strip { img: HTMLImageElement; fw: number; fh: number; n: number; fps: number; loop: boolean; px: number; py: number; rects: { x: number; y: number; w: number; h: number }[] }
export const FX_NAMES = ["kiblast_charge", "kiblast_projectile", "kiblast_impact", "flight_takeoff_dust", "flight_trail", "transform_burst"] as const;
type FxName = (typeof FX_NAMES)[number];
const strips = new Map<string, Strip | null>();
const base = () => (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
function strip(name: FxName): Strip | null {
  if (strips.has(name)) return strips.get(name)!;
  strips.set(name, null);
  if (typeof document === "undefined") return null;
  fetch(`${base()}art/fx/${name}.json`).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j) return; const img = new Image();
    img.onload = () => strips.set(name, { img, fw: j.frame[0], fh: j.frame[1], n: j.count, fps: j.fps, loop: j.loop, px: j.pivot[0], py: j.pivot[1], rects: j.frames });
    img.src = `${base()}art/fx/${name}.png`;
  }).catch(() => { /* procedural FX stay */ });
  return null;
}
export function preloadFx() { FX_NAMES.forEach(strip); }

/** Debug/tests: draws per strip and one-shots spawned. */
export const fxLog: Record<string, number> = {};
interface Live { name: FxName; x: number; y: number; t0: number; ang: number; from?: number; to?: number }
const live: Live[] = [];
let wasHover = false, wasTf = false, trailT = 0;
const seen = new Map<object, { x: number; y: number }>();

function frame(c: CanvasRenderingContext2D, name: FxName, i: number, x: number, y: number, ang = 0, alpha = 1) {
  const s = strip(name); if (!s) return false;
  const r = s.rects[((Math.floor(i) % s.n) + s.n) % s.n];
  c.save(); c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(y));
  if (ang) { if (Math.abs(ang) > Math.PI / 2) { c.scale(-1, 1); ang = Math.PI - ang; } c.rotate(ang); }
  c.drawImage(s.img, r.x, r.y, r.w, r.h, -s.px, -s.py, r.w, r.h); c.restore();
  fxLog[name] = (fxLog[name] ?? 0) + 1; return true;
}
function spawn(g: Game, name: FxName, x: number, y: number, ang = 0, from?: number, to?: number) { live.push({ name, x, y, t0: g.time, ang, from, to }); fxLog[`spawn:${name}`] = (fxLog[`spawn:${name}`] ?? 0) + 1; }

/** Called once per frame from drawTelegraphs (normal blend, over the light). */
export function drawFxStrips(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number) {
  const m = g.mb, p = g.p;
  // state watchers -> one-shots
  if (m.tfOn && !wasTf) spawn(g, "transform_burst", p.x, p.y, 0, 0, 7);
  if (m.hover && !wasHover) spawn(g, "flight_takeoff_dust", p.x, p.y);
  wasTf = m.tfOn; wasHover = m.hover;
  if (m.tfOn && p.moving && g.time - trailT > 0.07) { trailT = g.time; spawn(g, "flight_trail", p.x - p.fx * 10, p.y - 12 - p.fy * 6, Math.atan2(p.fy, p.fx)); }
  const now = new Set<object>();
  for (const s of g.shots) if (!s.foe) { now.add(s); if (s.life > 0) seen.set(s, { x: s.x, y: s.y }); }
  for (const [s, at] of seen) if (!now.has(s) || (s as { life: number }).life <= 0) { spawn(g, "kiblast_impact", at.x, at.y); seen.delete(s); }
  // transform aura loop behind/around the hero (frames 4-7) after the intro burst
  const intro = live.some((l) => l.name === "transform_burst");
  if (m.tfOn && !intro) frame(c, "transform_burst", 4 + Math.floor(g.time * 12) % 4, p.x - cx, p.y - cy, 0, 0.45);
  // one-shots
  for (let k = live.length - 1; k >= 0; k--) {
    const l = live[k], s = strip(l.name), fps = s?.fps ?? 12, n = l.to != null ? l.to - (l.from ?? 0) + 1 : s?.n ?? 6;
    const i = Math.floor((g.time - l.t0) * fps);
    if (i >= n || g.time < l.t0) { live.splice(k, 1); continue; }
    frame(c, l.name, (l.from ?? 0) + i, l.x - cx, l.y - cy, l.ang, l.name === "flight_trail" ? 0.7 : 1);
  }
  // loops on live things
  if (m.charging) { const k = Math.min(1, m.charge / BEAM_FULL); frame(c, "kiblast_charge", g.time * 12, p.x - cx + p.fx * 10, p.y - cy - 14 + p.fy * 8, 0, 0.6 + 0.4 * k); }
  for (const s of g.shots) if (!s.foe && s.life > 0 && (s.tech == null || s.tech === 0)) frame(c, "kiblast_projectile", g.time * 16, s.x - cx, s.y - cy, Math.atan2(s.vy, s.vx) || 1e-6);
}
const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), fxLog, FX_NAMES };
