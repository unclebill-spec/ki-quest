/** Seeded pixel-art ground tile generator (drawing only; nearest-neighbour, no AA).
 *  Per theme and terrain: VAR variants of 16x16 tiles with 3-step Bayer-dithered value noise and detail pixels
 *  (tufts, pebbles, cracks, moss, spores), plus ragged edge/corner fringe overlays so terrain borders don't follow the grid.
 *  Reusable: `groundSet(palette)` builds everything once; `drawGround()` picks variants with a position hash. */
export const VAR = 4;
const S = 16;
type RGB = [number, number, number];
export type Kind = "floor" | "moss" | "path" | "plaza" | "water";
export interface GroundPal { floor: string; moss: string; path: string; plaza: string; water: string; spore: string }
/** Overlay priority: higher terrain spills ragged edges onto lower neighbours. */
export const PRIO: Record<Kind, number> = { water: 0, plaza: 1, floor: 2, path: 3, moss: 4 };

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const shade = (c: RGB, k: number): RGB => c.map((v) => Math.max(0, Math.min(255, v * k))) as RGB;
export function hash(x: number, y: number, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
// tileable value noise (period 16) so variants also blend with each other at seams
function vnoise(x: number, y: number, cell: number, seed: number) {
  const n = S / cell, gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const g = (i: number, j: number) => hash(((i % n) + n) % n, ((j % n) + n) % n, seed);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return (g(x0, y0) * (1 - sx) + g(x0 + 1, y0) * sx) * (1 - sy) + (g(x0, y0 + 1) * (1 - sx) + g(x0 + 1, y0 + 1) * sx) * sy;
}
const mk = () => { const cv = document.createElement("canvas"); cv.width = cv.height = S; return cv; };

function baseTile(kind: Kind, pal: GroundPal, v: number, seed: number): HTMLCanvasElement {
  const cv = mk(), c = cv.getContext("2d")!, b = hex(pal[kind]), r = rng(seed * 97 + v * 13 + 1);
  const steps: RGB[] = [shade(b, 0.82), b, shade(b, 1.13)];
  const img = c.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // smooth noise sampled with a per-variant offset; 3 value steps via ordered dither
    const n = 0.65 * vnoise(x + v * 5, y + v * 3, 8, seed) + 0.35 * vnoise(x, y, 4, seed + v + 7);
    const q = Math.max(0, Math.min(2, Math.floor(n * 3 + (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * 0.9)));
    const col = steps[q], o = (y * S + x) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const px = (x: number, y: number, col: RGB, a = 1) => { c.fillStyle = css(col, a); c.fillRect(x & 15, y & 15, 1, 1); };
  const hi = shade(b, 1.3), lo = shade(b, 0.62);
  const R = (n: number) => Math.floor(r() * n);
  if (kind === "moss") {
    for (let i = 0, k = 3 + R(3); i < k; i++) { const x = R(16), y = 2 + R(13); px(x, y, hi); px(x, y - 1, shade(b, 1.2)); if (r() < 0.6) px(x + (r() < 0.5 ? -1 : 1), y, shade(b, 1.18)); px(x, y + 1, lo); }
    if (r() < 0.35) px(R(16), R(16), hex(pal.spore), 0.8);
    if (r() < 0.3) { const x = R(14), y = R(14); px(x, y, lo); px(x + 1, y, lo); }
  } else if (kind === "floor") {
    for (let i = 0, k = 1 + R(3); i < k; i++) { const x = R(15), y = R(15); px(x, y, hi); if (r() < 0.5) px(x + 1, y, shade(b, 1.18)); px(x, y + 1, lo); }
    if (r() < 0.5) { let x = R(16), y = R(16); for (let i = 0, k = 3 + R(4); i < k; i++) { px(x, y, lo); x += r() < 0.5 ? 1 : 0; y += 1; } }
    if (r() < 0.4) { const mc = hex(pal.moss); const x = R(14), y = R(14); px(x, y, mc); px(x + 1, y, mc); px(x, y + 1, shade(mc, 0.9)); }
  } else if (kind === "path") {
    for (let i = 0, k = 2 + R(4); i < k; i++) { const x = R(16), y = R(16); px(x, y, r() < 0.5 ? hi : shade(b, 1.2)); px(x, y + 1, lo); }
    for (let i = 0, k = 2 + R(3); i < k; i++) px(R(16), R(16), lo);
  } else if (kind === "plaza") {
    // offset flagstones: mortar lines that don't align to the tile grid, plus chips, cracks and seam moss
    const m = shade(b, 0.78), sy = 3 + R(4), sx1 = 2 + R(5), sx2 = 8 + R(5);
    c.fillStyle = css(m); c.fillRect(0, sy, 16, 1); c.fillRect(0, sy + 8, 16, 1); c.fillRect(sx1, 0, 1, sy); c.fillRect(sx2, sy + 1, 1, 7); c.fillRect(sx1 + 3, sy + 9, 1, 16 - sy - 9);
    for (let i = 0; i < 3; i++) px(R(16), R(16), hi);
    if (r() < 0.5) { let x = R(14), y = R(10); for (let i = 0; i < 4; i++) { px(x, y, lo); x += 1; y += r() < 0.6 ? 1 : 0; } }
    if (r() < 0.5) { const mc = hex(pal.moss); px(R(16), sy, mc); px(R(16), sy + 8, shade(mc, 1.1)); }
  } else if (kind === "water") {
    for (let i = 0, k = 2 + R(2); i < k; i++) { const x = R(13), y = R(16); c.fillStyle = css(shade(b, 1.25)); c.fillRect(x, y, 2 + R(2), 1); }
  }
  return cv;
}

// ragged fringe mask: depth from the edge varies 1..5px along it (seeded, continuous-ish)
function fringe(src: HTMLCanvasElement, dir: number, v: number, seed: number, rim: RGB): HTMLCanvasElement {
  const cv = mk(), c = cv.getContext("2d")!, sc = src.getContext("2d")!.getImageData(0, 0, S, S), img = c.createImageData(S, S);
  const depth: number[] = [];
  for (let i = 0; i < S; i++) depth.push(Math.round(1 + 4 * (0.7 * vnoise(i + v * 4, dir * 5, 8, seed + 31) + 0.3 * hash(i, v + dir * 7, seed + 3))));
  // taper towards the ends so edges meet corners without a step
  for (let i = 0; i < S; i++) { const e = Math.min(i, S - 1 - i); if (e < 2) depth[i] = Math.min(depth[i], 2 + e); }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const along = dir === 0 || dir === 2 ? x : y, d = dir === 0 ? y : dir === 1 ? S - 1 - x : dir === 2 ? S - 1 - y : x, o = (y * S + x) * 4;
    if (d < depth[along]) { img.data.set(sc.data.subarray(o, o + 4), o); }
    else if (d === depth[along]) { img.data[o] = rim[0]; img.data[o + 1] = rim[1]; img.data[o + 2] = rim[2]; img.data[o + 3] = 150; }
  }
  c.putImageData(img, 0, 0); return cv;
}
// small corner blob for diagonal-only neighbours (corner index 0=NW 1=NE 2=SE 3=SW)
function corner(src: HTMLCanvasElement, k: number, v: number, seed: number, rim: RGB): HTMLCanvasElement {
  const cv = mk(), c = cv.getContext("2d")!, sc = src.getContext("2d")!.getImageData(0, 0, S, S), img = c.createImageData(S, S);
  const rad = 2.5 + 2 * hash(k, v, seed + 9);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = k === 1 || k === 2 ? S - 1 - x : x, dy = k >= 2 ? S - 1 - y : y, d = Math.hypot(dx, dy) + hash(x, y, seed + k) * 1.2, o = (y * S + x) * 4;
    if (d < rad) img.data.set(sc.data.subarray(o, o + 4), o);
    else if (d < rad + 1) { img.data[o] = rim[0]; img.data[o + 1] = rim[1]; img.data[o + 2] = rim[2]; img.data[o + 3] = 130; }
  }
  c.putImageData(img, 0, 0); return cv;
}

export interface GroundSet { base: Record<Kind, HTMLCanvasElement[]>; edge: Record<Kind, HTMLCanvasElement[][]>; shore: Record<Kind, HTMLCanvasElement[][]>; cor: Record<Kind, HTMLCanvasElement[][]>; }
export function groundSet(pal: GroundPal, seed = 1): GroundSet {
  const kinds: Kind[] = ["floor", "moss", "path", "plaza", "water"];
  const set = { base: {}, edge: {}, shore: {}, cor: {} } as GroundSet;
  const shoreRim = shade(hex(pal.water), 0.5);
  kinds.forEach((k, ki) => {
    const sd = seed * 1009 + ki * 101;
    set.base[k] = Array.from({ length: VAR }, (_, v) => baseTile(k, pal, v, sd));
    const rim = shade(hex(pal[k]), 0.6);
    set.edge[k] = [0, 1, 2, 3].map((d) => Array.from({ length: VAR }, (_, v) => fringe(set.base[k][v], d, v, sd, rim)));
    set.shore[k] = [0, 1, 2, 3].map((d) => Array.from({ length: VAR }, (_, v) => fringe(set.base[k][v], d, v, sd + 5, shoreRim)));
    set.cor[k] = [0, 1, 2, 3].map((d) => Array.from({ length: VAR }, (_, v) => corner(set.base[k][v], d, v, sd, rim)));
  });
  return set;
}

/** Draw ground tile `self` at (X,Y); `nb(dx,dy)` returns the neighbour's Kind or null (wall/out of map). */
export function drawGround(c: CanvasRenderingContext2D, G: GroundSet, self: Kind, X: number, Y: number, tx: number, ty: number, nb: (dx: number, dy: number) => Kind | null) {
  const v = (n: number) => Math.floor(hash(tx, ty, n) * VAR);
  c.drawImage(G.base[self][v(1)], X, Y);
  const p = PRIO[self], D: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]], over: (Kind | null)[] = [];
  for (let d = 0; d < 4; d++) {
    const k = nb(D[d][0], D[d][1]); over.push(k && PRIO[k] > p ? k : null);
    // fringe on our side of the shared edge; the variant is keyed to the edge so both sides agree
    if (over[d]) c.drawImage((self === "water" ? G.shore : G.edge)[over[d]!][d][v(11 + d)], X, Y);
  }
  const C: [number, number, number, number][] = [[-1, -1, 0, 3], [1, -1, 0, 1], [1, 1, 2, 1], [-1, 1, 2, 3]];
  for (let k = 0; k < 4; k++) {
    const [dx, dy, a, b] = C[k]; if (over[a] || over[b]) continue;
    const n = nb(dx, dy); if (n && PRIO[n] > p) c.drawImage(G.cor[n][k][v(21 + k)], X, Y);
  }
}
