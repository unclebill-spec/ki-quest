/** All Master Builder combat/enemy state lives on game.mb. */
import type { Orb, Hazard, BossState } from "../enemies/types";
import { Ally, makeAlly } from "./companion";
export interface MBState {
  tech: number; charge: number; charging: boolean; fire: number;
  tfOn: boolean; tfT: number; chargingKi: boolean;
  /** One-shot SFX cues for src/audio.ts (drained each frame); hover = transformed flight (loops flight-loop). */
  sfx: string[]; hover: boolean;
  orbs: Orb[]; hazards: Hazard[]; boss: BossState;
  /** Kilnreach quarry boss, Slagheart (src/game/enemies/slagheart.ts). */ boss2: BossState;
  /** Undertide boss, Count Aurel (src/game/enemies/aurel.ts). */ boss3: BossState;
  /** Stair boss, the Cageward Twins (src/game/enemies/twins.ts). */ boss4: BossState;
  /** Stair top-ring boss, Morvant (src/game/enemies/morvant.ts). */ boss5: BossState;
  /** Finale boss, Malachar Vesh (src/game/enemies/malachar.ts). */ boss6: BossState;
  /** Mini-bosses (src/game/enemies/minis.ts): boss7 Kettle, boss8 Corvin, boss9 Ombrelle, boss10 Capmother Gilt. */ boss7: BossState; boss8: BossState; boss9: BossState; boss10: BossState;
  /** W17: boss11 Hollowmere (optional, hollowmere.ts), boss12 Warden Rune (final, wardenrune.ts). */ boss11: BossState; boss12: BossState;
  /** Companions (src/game/combat/companion.ts): [Mirela, Brann, Sable]. ally = allies[0] (Mirela). */ allies: Ally[]; ally: Ally;
}
export function makeMB(): MBState {
  const allies = [makeAlly("mirela"), makeAlly("brann"), makeAlly("sable")];
  return { tech: 0, charge: 0, charging: false, fire: 0, tfOn: false, tfT: 0, chargingKi: false, sfx: [], hover: false, orbs: [], hazards: [], allies, ally: allies[0],
    boss: { phase: 0, active: false, done: readBossDone(), lockT: 0, introT: 0 },
    boss2: { phase: 0, active: false, done: readBossDone("boss2"), lockT: 0, introT: 0 },
    boss3: { phase: 0, active: false, done: readBossDone("boss3"), lockT: 0, introT: 0 },
    boss4: { phase: 0, active: false, done: readBossDone("boss4"), lockT: 0, introT: 0 },
    boss5: { phase: 0, active: false, done: readBossDone("boss5"), lockT: 0, introT: 0 },
    boss6: { phase: 0, active: false, done: readBossDone("boss6"), lockT: 0, introT: 0 },
    boss7: { phase: 0, active: false, done: readBossDone("boss7"), lockT: 0, introT: 0 },
    boss8: { phase: 0, active: false, done: readBossDone("boss8"), lockT: 0, introT: 0 }, boss9: { phase: 0, active: false, done: readBossDone("boss9"), lockT: 0, introT: 0 },
    boss10: { phase: 0, active: false, done: readBossDone("boss10"), lockT: 0, introT: 0 },
    boss11: { phase: 0, active: false, done: readBossDone("boss11"), lockT: 0, introT: 0 }, boss12: { phase: 0, active: false, done: readBossDone("boss12"), lockT: 0, introT: 0 } };
}
const SLOT = "kiquest-mb-v1"; // localStorage slot name
/** Slot shape {boss1?: true, boss2?: true}; writes merge so each boss keeps its own flag. */
export function readBossDone(key = "boss1") { try { return JSON.parse(localStorage.getItem(SLOT) || "{}")[key] === true; } catch { return false; } }
export function writeBossDone(key = "boss1") { try { const o = JSON.parse(localStorage.getItem(SLOT) || "{}") || {}; o[key] = true; localStorage.setItem(SLOT, JSON.stringify(o)); } catch { /* storage blocked */ } }
