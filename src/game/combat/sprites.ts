/**
 * Sprite sheets from public/art/chars/<name>.json (frame rects listed per anim x facing; anim names read from the JSON).
 * Explicit "right" rows are used when the sheet has them; otherwise "left" is mirrored (fallback, e.g. 48x64 boss sheets). Hero "fly" frames sit on the ground row, so we lift them in code.
 * Each sheet also gets a one-time palette-shifted copy (cyan/violet, brighter) for the transformation.
 * Owner: Master Builder.
 */
export interface Rect { x: number; y: number; w: number; h: number }
export interface Sheet { name: string; img: HTMLImageElement; alt: HTMLCanvasElement | null; pivot: [number, number]; anims: Record<string, number>; rects: Map<string, Rect> }
export type Facing = "down" | "up" | "left" | "right";

const sheets = new Map<string, Sheet | null>();
const base = () => (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

export function sheet(name: string): Sheet | null {
  if (sheets.has(name)) return sheets.get(name)!;
  sheets.set(name, null);
  if (typeof document === "undefined") return null;
  fetch(`${base()}art/chars/${name}.json`).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j) return;
    const img = new Image();
    img.onload = () => {
      const rects = new Map<string, Rect>();
      for (const f of j.frames as { name?: string; anim: string; facing: string; i: number; x: number; y: number; w: number; h: number }[]) {
        // frames named "<sheet>_<anim>_<facing>_<i>" (e.g. linnet_idle_down_0) are keyed by that name; older sheets by their fields
        const key = f.name && f.name.startsWith(j.name + "_") ? f.name.slice(j.name.length + 1) : `${f.anim}_${f.facing}_${f.i}`;
        rects.set(key, f);
      }
      const anims: Record<string, number> = {};
      for (const k in j.anims) anims[k] = j.anims[k].count;
      sheets.set(name, { name, img, alt: shifted(img), pivot: j.pivot, anims, rects });
    };
    img.src = `${base()}art/chars/${name}.png`;
  }).catch(() => { /* placeholder art stays */ });
  return null;
}

/** Palette shift for the transformed state: hue pushed toward cyan/violet, brighter. Built once per sheet. */
function shifted(img: HTMLImageElement) {
  try {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = p[i], g = p[i + 1], b = p[i + 2], l = (r + g + b) / 3;
      p[i] = Math.min(255, l * 0.7 + b * 0.5); p[i + 1] = Math.min(255, l * 0.9 + 40); p[i + 2] = Math.min(255, l * 1.1 + 70);
    }
    x.putImageData(d, 0, 0); return c;
  } catch { return null; }
}

export function facingOf(fx: number, fy: number): Facing {
  return Math.abs(fx) > Math.abs(fy) * 0.9 ? (fx < 0 ? "left" : "right") : fy < 0 ? "up" : "down";
}

/** Draw frame i of anim (falls back to stand/idle). Feet at (x,y). Returns false if the sheet isn't ready. */
export function drawSprite(c: CanvasRenderingContext2D, s: Sheet | null, anim: string, f: Facing, i: number, x: number, y: number, opt: { alt?: boolean; lift?: number; flash?: boolean } = {}) {
  if (!s) return false;
  if (!s.anims[anim]) anim = s.anims.stand ? "stand" : "idle";
  const n = s.anims[anim] || 1; i = ((Math.floor(i) % n) + n) % n;
  let r = s.rects.get(`${anim}_${f}_${i}`), flip = false;
  if (!r && f === "right") { r = s.rects.get(`${anim}_left_${i}`); flip = true; }
  if (!r) return false;
  drawLog[s.name] = { key: flip ? `${anim}_left_${i}` : `${anim}_${f}_${i}`, flip };
  const src = opt.alt && s.alt ? s.alt : s.img;
  const X = Math.round(x - s.pivot[0]), Y = Math.round(y - s.pivot[1] - (opt.lift ?? 0));
  if (flip) { c.save(); c.translate(X * 2 + r.w, 0); c.scale(-1, 1); }
  c.drawImage(src, r.x, r.y, r.w, r.h, X, Y, r.w, r.h);
  if (opt.flash) { c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.7; c.drawImage(src, r.x, r.y, r.w, r.h, X, Y, r.w, r.h); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; }
  if (flip) c.restore();
  return true;
}

/** Last frame drawn per sheet (debug/tests): key = frame name used, flip = mirrored fallback. */
export const drawLog: Record<string, { key: string; flip: boolean }> = {};
const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), drawLog, sheet };
