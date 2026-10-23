/** Area data: one grey-box area, "Emberfall Hollow". Tiles are placeholders. */
export const TILE = 16;
export const MW = 48, MH = 34;
export const T_FLOOR = 0, T_WALL = 1, T_MOSS = 2, T_PLAZA = 3;
export interface Lamp { x: number; y: number; c: readonly [number, number, number]; seed: number }
export interface Spawn { kind: "brute" | "wisp"; x: number; y: number }
export interface Area { name: string; tiles: Uint8Array; lamps: Lamp[]; pad: { x: number; y: number }; start: { x: number; y: number }; spawns: Spawn[] }

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function buildArea(): Area {
  const t = new Uint8Array(MW * MH);
  const r = rng(7);
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < MW && y < MH) t[y * MW + x] = v; };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const edge = x === 0 || y === 0 || x === MW - 1 || y === MH - 1;
    t[y * MW + x] = edge ? T_WALL : r() < 0.18 ? T_MOSS : T_FLOOR;
  }
  // rock clusters
  for (let i = 0; i < 14; i++) {
    const cx = 3 + Math.floor(r() * (MW - 6)), cy = 3 + Math.floor(r() * (MH - 6));
    if (Math.abs(cx - 8) < 6 && Math.abs(cy - 8) < 5) continue;
    const n = 2 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) set(cx + Math.floor(r() * 3) - 1, cy + Math.floor(r() * 3) - 1, T_WALL);
  }
  // ruined plaza with the save pad
  for (let y = 4; y <= 11; y++) for (let x = 4; x <= 12; x++) set(x, y, T_PLAZA);
  for (const [x, y] of [[4, 4], [12, 4], [4, 11], [12, 11]]) set(x, y, T_WALL);
  // a dividing ridge with two gaps
  for (let y = 1; y < MH - 1; y++) if (y !== 9 && y !== 10 && y !== 24 && y !== 25) set(24, y, T_WALL);
  const lamps: Lamp[] = [
    { x: 4.5, y: 4.5, c: [1, 0.62, 0.3], seed: 1 }, { x: 12.5, y: 4.5, c: [1, 0.62, 0.3], seed: 2 },
    { x: 4.5, y: 11.5, c: [1, 0.62, 0.3], seed: 3 }, { x: 12.5, y: 11.5, c: [1, 0.62, 0.3], seed: 4 },
    { x: 24.5, y: 8.5, c: [0.35, 0.8, 1], seed: 5 }, { x: 24.5, y: 23.5, c: [0.35, 0.8, 1], seed: 6 },
    { x: 36.5, y: 16.5, c: [0.62, 0.38, 1], seed: 7 }, { x: 15.5, y: 26.5, c: [0.62, 0.38, 1], seed: 8 },
  ].map((l) => ({ ...l, c: l.c as unknown as Lamp["c"], x: l.x * TILE, y: l.y * TILE }));
  for (const l of lamps) set(Math.floor(l.x / TILE), Math.floor(l.y / TILE), T_WALL);
  const spawns: Spawn[] = [
    { kind: "brute", x: 18, y: 16 }, { kind: "brute", x: 14, y: 24 }, { kind: "wisp", x: 20, y: 28 },
    { kind: "brute", x: 30, y: 8 }, { kind: "wisp", x: 34, y: 12 }, { kind: "brute", x: 38, y: 22 },
    { kind: "wisp", x: 42, y: 28 }, { kind: "brute", x: 32, y: 28 }, { kind: "wisp", x: 40, y: 6 },
  ].map((s) => ({ ...s, kind: s.kind as Spawn["kind"], x: s.x * TILE + 8, y: s.y * TILE + 8 }));
  for (const s of spawns) set(Math.floor(s.x / TILE), Math.floor(s.y / TILE), T_FLOOR);
  return { name: "Emberfall Hollow", tiles: t, lamps, pad: { x: 8.5 * TILE, y: 7.5 * TILE }, start: { x: 8.5 * TILE, y: 9.5 * TILE }, spawns };
}

export function solidAt(a: Area, px: number, py: number) {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
  return a.tiles[y * MW + x] === T_WALL;
}
/** Move a circle-ish body (half-width hw) with axis-separated collision. */
export function moveBody(a: Area, o: { x: number; y: number }, dx: number, dy: number, hw = 5) {
  const hit = (x: number, y: number) => solidAt(a, x - hw, y - 3) || solidAt(a, x + hw, y - 3) || solidAt(a, x - hw, y + 2) || solidAt(a, x + hw, y + 2);
  let bumped = false;
  if (!hit(o.x + dx, o.y)) o.x += dx; else bumped = true;
  if (!hit(o.x, o.y + dy)) o.y += dy; else bumped = true;
  return bumped;
}
