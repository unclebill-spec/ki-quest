/** All Master Builder combat/enemy state lives on game.mb. */
import type { Orb, Hazard, BossState } from "../enemies/types";
export interface MBState {
  tech: number; charge: number; charging: boolean; fire: number;
  tfOn: boolean; tfT: number; chargingKi: boolean;
  orbs: Orb[]; hazards: Hazard[]; boss: BossState;
}
export function makeMB(): MBState {
  return { tech: 0, charge: 0, charging: false, fire: 0, tfOn: false, tfT: 0, chargingKi: false, orbs: [], hazards: [],
    boss: { phase: 0, active: false, done: readBossDone(), lockT: 0, introT: 0 } };
}
const SLOT = "kiquest-mb-v1"; // localStorage slot name
export function readBossDone() { try { return JSON.parse(localStorage.getItem(SLOT) || "{}").boss1 === true; } catch { return false; } }
export function writeBossDone() { try { localStorage.setItem(SLOT, JSON.stringify({ boss1: true })); } catch { /* storage blocked */ } }
