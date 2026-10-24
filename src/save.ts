/**
 * Save system, modelled on Gravewake's (sim.ts saveSlot/readSaves/autosave): versioned localStorage keys,
 * one JSON record shape shared by the save pad slot and the page-hide autosave, every read guarded.
 */
export const SAVE_KEY = "kiquest-save-v1";
export const AUTO_KEY = "kiquest-autosave-v1";
export interface SaveRecord {
  v: 1; at: number; area: string; x: number; y: number;
  lvl: number; exp: number; pts: number; str: number; pow: number; end: number; hp: number; ep: number; tf: number;
  /** Mirela joined (MB). Optional: older saves lack it. */ mirela?: boolean;
}
export function writeSave(rec: SaveRecord, auto = false) {
  try { localStorage.setItem(auto ? AUTO_KEY : SAVE_KEY, JSON.stringify(rec)); return true; } catch { return false; }
}
export function parseSave(raw: string | null): SaveRecord | null {
  try {
    const r = JSON.parse(raw || "null");
    if (!r || r.v !== 1 || typeof r.lvl !== "number") return null;
    return r as SaveRecord;
  } catch { return null; }
}
/** The newest of the pad save and the autosave. */
export function readSave(): SaveRecord | null {
  let a: SaveRecord | null = null, b: SaveRecord | null = null;
  try { a = parseSave(localStorage.getItem(SAVE_KEY)); b = parseSave(localStorage.getItem(AUTO_KEY)); } catch { /* private mode */ }
  if (a && b) return a.at >= b.at ? a : b;
  return a ?? b;
}
