/**
 * W17 glue (Master Builder): Ashmaw save sync, Hollowmere (boss11, optional) + Warden Rune (boss12, final) arenas, and the
 * Stillwater Charm (gear c7, unique Hollowmere drop). Called from game.ts / companion.ts via `// MB hook` lines.
 * Stillwater Charm: only in FOG_AREAS (the misty mere/sea maps; no fog system exists elsewhere): +STILL_EP Glow/s regen and an
 * extra hero light of radius STILL_LIGHT (draw17.ts addLights17). Nothing anywhere else.
 */
import type { Game } from "../../game";
import { hasPerk } from "../../gear";
import { syncAshmaw } from "../enemies/boss";
import { updateArena11 } from "../enemies/hollowmere";
import { updateArena12 } from "../enemies/wardenrune";

export const FOG_AREAS = new Set(["hushwater", "drowned", "undertide"]);
export const STILL_EP = 1.5, STILL_LIGHT = 72;
export const stillwater = (g: Game) => hasPerk(g.gear, "c7") && FOG_AREAS.has(g.area.id);
export const w17Active = (g: Game) => g.mb.boss11.active || g.mb.boss12.active;
/** HP floor for tests (fraction of max; 0 = off). Applied in onFoeHit for hollowmere / wardenrune. */
export const hpFloor: Record<string, number> = { hollowmere: 0, wardenrune: 0 };
export const w17Clamp = (e: { kind: string; hp: number; max: number }, d: number) => { const f = hpFloor[e.kind]; return f ? Math.max(0, Math.min(d, e.hp - f * e.max)) : d; };
export const w17Log = { charmEp: 0 };

export function updateW17(g: Game, dt: number) {
  if (g.frame % 30 === 0) syncAshmaw(g);
  updateArena11(g, dt); updateArena12(g, dt);
  if (stillwater(g) && g.ep < g.maxEp) { const was = g.ep; g.ep = Math.min(g.maxEp, g.ep + STILL_EP * dt); w17Log.charmEp += g.ep - was; }
}
/** faint(): drop out of an unfinished W17 fight (it re-wakes from its normal trigger). */
export function w17Abort(g: Game) {
  for (const [k, kind] of [["boss11", "hollowmere"], ["boss12", "wardenrune"]] as const) {
    const b = g.mb[k]; if (!b.active) continue;
    g.enemies = g.enemies.filter((e) => e.kind !== kind); b.active = false; b.phase = 0;
    g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
  }
}
export function w17KeepDone(g: Game, d11: boolean, d12: boolean) { g.mb.boss11.done = d11; g.mb.boss12.done = d12; }

const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), stillwater, FOG_AREAS, STILL_EP, STILL_LIGHT, hpFloor, w17Log, setHpFloor: (k: string, f: number) => { hpFloor[k] = f; } };
