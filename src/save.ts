/**
 * Save system, modelled on Gravewake's (sim.ts saveSlot/readSaves/autosave): versioned localStorage keys,
 * one JSON record shape shared by the save pad slot and the page-hide autosave, every read guarded.
 */
export const SAVE_KEY = "kiquest-save-v1";
export const AUTO_KEY = "kiquest-autosave-v1";
export interface SaveRecord {
  /** 1 = original record; 2 = adds play/areaId/gear/story/bosses (all optional, see migrate()). */
  v: 1 | 2; at: number; area: string; x: number; y: number;
  lvl: number; exp: number; pts: number; str: number; pow: number; end: number; hp: number; ep: number; tf: number;
  /** Mirela joined (MB). Optional: older saves lack it. */ mirela?: boolean;
  /** Brann joined (MB). Optional: older saves lack it. */ brann?: boolean;
  /** v2 (HD2D W14): playtime seconds, area id, equipped gear, story flags + boss-done snapshots for slots. */
  play?: number; areaId?: string; gear?: { w: string; a: string; c: string; h?: string; f?: string };
  /** Gear v2 (W14): gv=2 marks spec-v2 ids; owned gear, coins, consumable counts. All optional, default empty/0. */
  gv?: number; have?: string[]; coins?: number; items?: Partial<Record<"morsel" | "berry" | "tear", number>>; story?: Record<string, unknown>; bosses?: Record<string, unknown>;
}
export const SAVE_VERSION = 2;
export const SLOT_COUNT = 3;
export const slotKey = (i: number) => `kiquest-slot${i + 1}-v1`;
const NUMS = ["at", "x", "y", "lvl", "exp", "pts", "str", "pow", "end", "hp", "ep", "tf"] as const;
/** Validate + upgrade any known record version to the current one. Unknown fields (e.g. mirela, brann) are kept. */
export function migrate(r: unknown): SaveRecord | null {
  if (!r || typeof r !== "object") return null;
  const o = { ...(r as Record<string, unknown>) };
  if (o.v !== 1 && o.v !== 2) return null;
  for (const k of NUMS) if (typeof o[k] !== "number" || !isFinite(o[k] as number)) { if (k === "tf" || k === "at") o[k] = 0; else return null; }
  if (typeof o.area !== "string") o.area = "";
  if (o.v === 1) { o.v = 2; if (typeof o.play !== "number") o.play = 0; }
  if (o.mirela !== undefined && typeof o.mirela !== "boolean") delete o.mirela;
  if (o.brann !== undefined && typeof o.brann !== "boolean") delete o.brann;
  if (o.gear && typeof o.gear !== "object") delete o.gear;
  if (o.have !== undefined && !Array.isArray(o.have)) delete o.have;
  if (typeof o.coins !== "number" || !isFinite(o.coins) || o.coins < 0) o.coins = 0;
  if (!o.items || typeof o.items !== "object") o.items = {};
  return o as unknown as SaveRecord;
}
export function readSlot(i: number): SaveRecord | null {
  try { return migrate(JSON.parse(localStorage.getItem(slotKey(i)) || "null")); } catch { return null; }
}
export function writeSlot(i: number, rec: SaveRecord) {
  try { localStorage.setItem(slotKey(i), JSON.stringify(rec)); return true; } catch { return false; }
}
const MAGIC = "KQSAVE1:";
/** Portable text code: MAGIC + base64(utf8 JSON). */
export function exportCode(rec: SaveRecord) {
  const b = new TextEncoder().encode(JSON.stringify({ kq: "kindle-quest", v: SAVE_VERSION, rec }));
  let s = ""; b.forEach((x) => (s += String.fromCharCode(x)));
  return MAGIC + btoa(s);
}
/** Accepts a code, or a raw JSON record / export object (from a .json file). Returns null if invalid. */
export function importCode(text: string): SaveRecord | null {
  try {
    let t = text.trim(), o: unknown;
    if (t.startsWith(MAGIC)) { const bin = atob(t.slice(MAGIC.length).replace(/\s+/g, "")); o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))); }
    else o = JSON.parse(t);
    const w = o as { kq?: string; rec?: unknown };
    return migrate(w && w.kq === "kindle-quest" ? w.rec : o);
  } catch { return null; }
}
export function writeSave(rec: SaveRecord, auto = false) {
  try { localStorage.setItem(auto ? AUTO_KEY : SAVE_KEY, JSON.stringify(rec)); return true; } catch { return false; }
}
export function parseSave(raw: string | null): SaveRecord | null {
  try {
    const r = JSON.parse(raw || "null");
    return migrate(r);
  } catch { return null; }
}
/** The newest of the pad save and the autosave. */
export function readSave(): SaveRecord | null {
  let a: SaveRecord | null = null, b: SaveRecord | null = null;
  try { a = parseSave(localStorage.getItem(SAVE_KEY)); b = parseSave(localStorage.getItem(AUTO_KEY)); } catch { /* private mode */ }
  if (a && b) return a.at >= b.at ? a : b;
  return a ?? b;
}
