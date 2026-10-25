/** Hero voice barks (staging/sound bark-<hero>-<kind>.ogg). Owner: Master Builder.
 *  Cues go through g.mb.sfx (src/audio.ts plays them; voice volumes/ducking live there).
 *  attack: melee finishers only, every 3rd per hero (deterministic, no Math.random so seeded tests stay put).
 *  hurt: 1.5 s cooldown per hero. transform: hero transform (companions answer). victory: boss fight won.
 *  One bark per hero at a time: a hero stays busy for the clip length (sim time). */
import type { Game } from "../../game";
export type BarkHero = "rook" | "mirela" | "brann" | "sable";
export type BarkKind = "attack" | "hurt" | "transform" | "victory";
export const BARK_LEN: Record<BarkHero, Record<BarkKind, number>> = {
  rook: { attack: 0.42, hurt: 0.44, transform: 1.46, victory: 1.49 },
  mirela: { attack: 0.52, hurt: 0.6, transform: 1.93, victory: 1.9 },
  brann: { attack: 0.62, hurt: 0.48, transform: 1.39, victory: 1.16 },
  sable: { attack: 0.47, hurt: 0.34, transform: 1.42, victory: 1.2 },
};
export const HURT_CD = 1.5, ATTACK_EVERY = 3;
const busy: Record<string, number> = {}, hurtAt: Record<string, number> = {}, fin: Record<string, number> = {};
export const barkLog = { played: [] as string[], skippedBusy: 0, skippedCd: 0 };
export function resetBarks() { for (const o of [busy, hurtAt, fin]) for (const k in o) delete o[k]; barkLog.played.length = 0; barkLog.skippedBusy = 0; barkLog.skippedCd = 0; }
export function bark(g: Game, hero: BarkHero, kind: BarkKind) {
  const t = g.time;
  if (kind === "attack" && (fin[hero] = (fin[hero] ?? 0) + 1) % ATTACK_EVERY !== 1) return false;
  if (kind === "hurt" && t < (hurtAt[hero] ?? -1e9) + HURT_CD) { barkLog.skippedCd++; return false; }
  if (t < (busy[hero] ?? -1e9)) { barkLog.skippedBusy++; return false; }
  if (kind === "hurt") hurtAt[hero] = t;
  busy[hero] = t + BARK_LEN[hero][kind];
  const n = `bark-${hero}-${kind}`; g.mb.sfx.push(n); barkLog.played.push(n); if (barkLog.played.length > 60) barkLog.played.shift();
  return true;
}
/** Hero + every joined, standing companion. */
export function barkParty(g: Game, kind: BarkKind) {
  bark(g, "rook", kind);
  for (const a of g.mb.allies) if (a.joined && !a.ko) bark(g, a.id as BarkHero, kind);
}
const G = globalThis as unknown as { __kiMB?: Record<string, unknown> };
G.__kiMB = { ...(G.__kiMB ?? {}), bark, barkParty, barkLog, resetBarks, BARK_LEN };
