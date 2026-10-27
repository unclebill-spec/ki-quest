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

/** Layout for a W x H game in a vw x vh window. Returns CSS size and backing scale r (integer). */
export function layout(W: number, H: number, vw: number, vh: number, dpr: number, coarse: boolean, mode: ResMode = getRes()) {
  const s = Math.min(vw / W, vh / H);
  const full = Math.max(1, Math.floor(s * dpr)); // largest whole device-pixel scale that fits
  if (mode === "Performance") { const k = s >= 2 ? Math.floor(s) : s; return { r: 1, cssW: W * k, cssH: H * k }; } // pre-W17l behaviour
  const r = mode === "Sharp" ? full : mode === "Balanced" ? Math.max(1, Math.ceil(full / 2)) : Math.min(full, coarse ? 4 : 6); // Auto caps cost on phones / 4K
  if (r === full) return { r, cssW: (W * r) / dpr, cssH: (H * r) / dpr }; // exact device pixels: crisp, even pixel art
  return { r, cssW: W * s, cssH: H * s }; // capped/Balanced: fill the window, browser upscales the rest
}
