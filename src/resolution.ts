// W17l: per-device Resolution setting (localStorage, never the save slot).
// The game still draws in 384x216 logical units; the canvas backing store is scaled by `r`
// (ctx.setTransform) so text and shapes rasterise at device resolution instead of being upscaled.
export const RES_MODES = ["Auto", "Performance", "Balanced", "Sharp"] as const;
export type ResMode = (typeof RES_MODES)[number];
const KEY = "kiquest-opt-res";
export function getRes(): ResMode {
  try { const v = localStorage.getItem(KEY) as ResMode; if (RES_MODES.includes(v)) return v; } catch { /* private mode */ }
  return "Auto";
}
export function setRes(m: ResMode) { try { localStorage.setItem(KEY, m); } catch { /* */ } dispatchEvent(new Event("kq-res")); }
export function cycleRes() { const m = RES_MODES[(RES_MODES.indexOf(getRes()) + 1) % RES_MODES.length]; setRes(m); return m; }

let autoCap = 99; // Auto's current cap (99 = natural cap). Manual presets never step.
let autoMax = 1, upAt = -1e9, upLevel = 0; const ban = new Map<number, number>(); // W17l.2 step-up hysteresis
export const isAuto = () => getRes() === "Auto";
/** W17l.1: jump straight to the scale the measured fps can afford (cost ~ r^2), at least one step, floor 1x.
 *  W17l.2: if this undoes a step-up from the last 3 s, that level is banned for 30 s. */
export function autoSlow(fps: number, now = performance.now()): boolean {
  if (!isAuto() || lastAutoR <= 1) return false;
  if (lastAutoR === upLevel && now - upAt < 3000) ban.set(upLevel, now + 30000);
  autoCap = Math.max(1, Math.min(lastAutoR - 1, Math.floor(lastAutoR * Math.sqrt(Math.max(fps, 1) / 58)))); return true;
}
/** W17l.2: one level up toward the natural cap (caller: ~5 s sustained at 58+ fps). */
export function autoUp(now = performance.now()): boolean {
  const L = lastAutoR + 1;
  if (!isAuto() || L > autoMax || (ban.get(L) ?? 0) > now) return false;
  autoCap = L; upLevel = L; upAt = now; return true;
}
/** W17l.2: area change: back to the natural cap and re-measure. */
export function autoReset() { autoCap = 99; ban.clear(); upLevel = 0; }
let lastAutoR = 1;
/** Layout for a W x H game in a vw x vh window. Returns CSS size and backing scale r (integer). */
export function layout(W: number, H: number, vw: number, vh: number, dpr: number, coarse: boolean, mode: ResMode = getRes()) {
  const s = Math.min(vw / W, vh / H);
  const full = Math.max(1, Math.floor(s * dpr)); // largest whole device-pixel scale that fits
  if (mode === "Performance") { const k = s >= 2 ? Math.floor(s) : s; return { r: 1, cssW: W * k, cssH: H * k }; } // pre-W17l behaviour
  const r = mode === "Sharp" ? full : mode === "Balanced" ? Math.max(1, Math.ceil(full / 2)) : Math.min(full, coarse ? 4 : 6, autoCap); // Auto caps cost on phones / 4K, and steps down if slow
  if (mode === "Auto") { lastAutoR = r; autoMax = Math.min(full, coarse ? 4 : 6); }
  if (r === full) return { r, cssW: (W * r) / dpr, cssH: (H * r) / dpr }; // exact device pixels: crisp, even pixel art
  return { r, cssW: W * s, cssH: H * s }; // capped/Balanced: fill the window, browser upscales the rest
}

// W17l.1/.2 Auto sampling, called once per frame from main.ts. 250 ms samples; single frames >250 ms are one-off
// hitches and are skipped, as is anything while the tab is hidden. 2 slow samples (<48 fps) in a row step down;
// 20 fast samples (58+ fps, ~5 s) step up one level; an area change resets to the natural cap. Returns true to refit.
let slowN = 0, fastN = 0, fpsT = 0, frames = 0, resArea = "";
export function autoTick(dt: number, playing: boolean, area: string, now = performance.now()): boolean {
  if (!playing || !isAuto() || (typeof document !== "undefined" && document.hidden)) return false;
  if (area !== resArea) { const was = resArea; resArea = area; slowN = fastN = fpsT = frames = 0; if (was) { autoReset(); return true; } return false; }
  if (dt > 250) return false;
  fpsT += dt; frames++;
  if (fpsT < 250) return false;
  const f = frames / (fpsT / 1000); fpsT = 0; frames = 0;
  slowN = f < 48 ? slowN + 1 : 0; fastN = f >= 58 ? fastN + 1 : 0;
  if (slowN >= 2) { slowN = fastN = 0; return autoSlow(f, now); }
  if (fastN >= 20) { fastN = 0; return autoUp(now); }
  return false;
}
