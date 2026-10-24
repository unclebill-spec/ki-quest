/** Areas: ASCII maps (src/areas/maps.ts) -> tiles, lamps, props, NPCs, spawns, gates and updraft stones. */
import { LANTERNMOSS, HUSHWATER } from "./areas/maps";
export const TILE = 16;
export const MW = 48, MH = 34;
export const T_FLOOR = 0, T_WALL = 1, T_MOSS = 2, T_PLAZA = 3, T_WATER = 4, T_PATH = 5, T_BOARD = 6, T_WARD = 7, T_HIDDEN = 8;
export interface Lamp { x: number; y: number; c: readonly [number, number, number]; seed: number }
export interface Spawn { kind: "brute" | "wisp"; x: number; y: number }
export interface Prop { kind: "house" | "tree" | "grave"; x: number; y: number }
export interface Npc { id: string; x: number; y: number }
export interface Travel { x: number; y: number; to: string; label: string }
export interface Orb { i: number; x: number; y: number }
export interface Ward { tx: number; ty: number; lvl: number }
export interface Area {
  id: string; name: string; music: string; theme: "moss" | "marsh";
  tiles: Uint8Array; lamps: Lamp[]; pad: { x: number; y: number }; start: { x: number; y: number }; spawns: Spawn[];
  props: Prop[]; npcs: Npc[]; orbs: Orb[]; springs: { x: number; y: number }[]; travel: Travel[]; wards: Ward[];
  zones: { name: string; x0: number; y0: number; x1: number; y1: number }[];
}

interface Def { id: string; name: string; music: string; theme: Area["theme"]; rows: string[]; lamp: Lamp["c"]; to: string; toLabel: string; wardLvl: number; zones: Area["zones"] }
export const AREA_DEFS: Record<string, Def> = {
  lanternmoss: {
    id: "lanternmoss", name: "Lanternmoss Hollow", music: "area1-theme", theme: "moss", rows: LANTERNMOSS, lamp: [0.35, 0.8, 1],
    to: "hushwater", toLabel: "Hushwater", wardLvl: 4,
    zones: [{ name: "Wickhaven", x0: 1, y0: 1, x1: 20, y1: 10 }, { name: "The Old Watch", x0: 31, y0: 1, x1: 46, y1: 11 },
      { name: "Witchlight Fen", x0: 1, y0: 11, x1: 13, y1: 32 }, { name: "Updraft Cliff", x0: 43, y0: 1, x1: 46, y1: 5 }, { name: "Glowcap Woods", x0: 0, y0: 0, x1: 47, y1: 33 }],
  },
  hushwater: {
    id: "hushwater", name: "Hushwater", music: "area1-theme", theme: "marsh", rows: HUSHWATER, lamp: [0.62, 0.42, 1],
    to: "lanternmoss", toLabel: "Lanternmoss Hollow", wardLvl: 0,
    zones: [{ name: "Hushwater Landing", x0: 1, y0: 1, x1: 5, y1: 6 }, { name: "Hushwater Town", x0: 16, y0: 5, x1: 33, y1: 13 },
      { name: "Lantern Graveyard", x0: 34, y0: 1, x1: 46, y1: 9 }, { name: "Sunken Meadow", x0: 0, y0: 14, x1: 47, y1: 33 }, { name: "Hushwater Fen", x0: 0, y0: 0, x1: 47, y1: 33 }],
  },
};

const TILECH: Record<string, number> = { "#": T_WALL, ",": T_MOSS, "=": T_PLAZA, "~": T_WATER, ":": T_PATH, b: T_BOARD, W: T_WARD, V: T_HIDDEN, K: T_MOSS };

export function buildArea(id = "lanternmoss"): Area {
  const d = AREA_DEFS[id] ?? AREA_DEFS.lanternmoss;
  const t = new Uint8Array(MW * MH);
  const C = (n: number) => n * TILE + 8;
  const lamps: Lamp[] = [], props: Prop[] = [], npcs: Npc[] = [], spawns: Spawn[] = [], travel: Travel[] = [], wards: Ward[] = [], orbs: Orb[] = [], springs: { x: number; y: number }[] = [];
  let pad = { x: C(2), y: C(2) }, start: { x: number; y: number } | null = null;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    let ch = (d.rows[y] ?? "")[x] ?? "#";
    if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) ch = "#";
    let v = TILECH[ch] ?? T_FLOOR;
    if (ch === "L") { lamps.push({ x: C(x), y: C(y), c: d.lamp, seed: lamps.length + 1 }); v = T_WALL; }
    else if (ch === "T") { props.push({ kind: "tree", x: C(x), y: C(y) }); v = T_WALL; }
    else if (ch === "G") { props.push({ kind: "grave", x: C(x), y: C(y) }); v = T_WALL; }
    else if (ch === "H") props.push({ kind: "house", x: C(x + 1), y: C(y + 1) });
    else if (ch === "S") { pad = { x: C(x), y: C(y) }; v = T_PLAZA; }
    else if (ch === "@") start = { x: C(x), y: C(y) };
    else if (ch === "K") springs.push({ x: C(x), y: C(y) });
    else if (ch === "*") orbs.push({ i: orbs.length, x: C(x), y: C(y) });
    else if (ch === "U") travel.push({ x: C(x), y: C(y), to: d.to, label: d.toLabel });
    else if (ch === "W") wards.push({ tx: x, ty: y, lvl: d.wardLvl });
    else if (ch === "g" || ch === "w") spawns.push({ kind: ch === "g" ? "brute" : "wisp", x: C(x), y: C(y) });
    else if (/[a-z]/.test(ch) && ch !== "b") { npcs.push({ id: ch, x: C(x), y: C(y) }); v = T_PLAZA; }
    if (t[y * MW + x] !== T_WALL) t[y * MW + x] = v;
  }
  // houses: 3x2 solid footprint
  for (const h of props) if (h.kind === "house") {
    const tx = Math.floor(h.x / TILE) - 1, ty = Math.floor(h.y / TILE) - 1;
    for (let yy = ty; yy < ty + 2; yy++) for (let xx = tx; xx < tx + 3; xx++) t[yy * MW + xx] = T_WALL;
  }
  // a lamp glow on every house and plaza edge looks busy; houses carry their own cap glow (drawn in areas/art.ts)
  return { id: d.id, name: d.name, music: d.music, theme: d.theme, tiles: t, lamps, pad, start: start ?? { x: pad.x, y: pad.y + 2 * TILE }, spawns, props, npcs, orbs, springs, travel, wards, zones: d.zones };
}

export function zoneAt(a: Area, px: number, py: number) {
  const x = px / TILE, y = py / TILE;
  return a.zones.find((z) => x >= z.x0 && x <= z.x1 + 1 && y >= z.y0 && y <= z.y1 + 1)?.name ?? a.name;
}

/** Sealed wards open when the hero's level is high enough (set by story/world.ts each frame). */
export let wardOpen = false;
export function setWardOpen(v: boolean) { wardOpen = v; }

export function solidAt(a: Area, px: number, py: number) {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
  const v = a.tiles[y * MW + x];
  return v === T_WALL || v === T_WATER || (v === T_WARD && !wardOpen);
}
/** Move a circle-ish body (half-width hw) with axis-separated collision. */
export function moveBody(a: Area, o: { x: number; y: number }, dx: number, dy: number, hw = 5) {
  const hit = (x: number, y: number) => solidAt(a, x - hw, y - 3) || solidAt(a, x + hw, y - 3) || solidAt(a, x - hw, y + 2) || solidAt(a, x + hw, y + 2);
  let bumped = false;
  if (!hit(o.x + dx, o.y)) o.x += dx; else bumped = true;
  if (!hit(o.x, o.y + dy)) o.y += dy; else bumped = true;
  return bumped;
}
