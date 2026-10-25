/** Enemy data. Kinds: brute = melee rusher, wisp = ranged shooter, warden = tank/blocker, boss = area boss. Owner: Master Builder. */
export type FoeKind = "brute" | "wisp" | "warden" | "boss" | "slag" | "aurel" | "vey" | "nell" | "pylon" | "morvant" | "malachar"
  | "reed_wraith" | "witchlight_newt" | "fen_warden" | "mossback_snapper" | "duskhound" | "mossling" | "hush_squire" | "bog_sprout"
  | "kettle" | "corvin";
/** Arena bosses (big body, boss bar, companions dodge their telegraphs). */
export const isBigBoss = (k: string) => k === "boss" || k === "slag" || k === "aurel" || k === "vey" || k === "nell" || k === "morvant" || k === "malachar" || MINI_KINDS.has(k);
/** Mini-bosses (src/game/enemies/minis.ts). */
export const MINI_KINDS = new Set<string>(["kettle", "corvin"]);
export type FoeState = "idle" | "chase" | "tele" | "act" | "recover";
export interface Enemy {
  kind: FoeKind; x: number; y: number; vx: number; vy: number; hp: number; max: number;
  state: FoeState; t: number; ax: number; ay: number;
  flash: number; dead: boolean; respawn: number; hx: number; hy: number; hitBy: number; wander: number;
  /** Hurt stun seconds (no AI intent). */ hurt: number;
  /** Warden: shield raised toward (ax, ay). */ guard: boolean;
  /** Knockback taken multiplier. */ heavy: number;
  /** Boss move currently telegraphed / running. */ move: string; n: number;
  /** Taunted by a companion: seconds left and who (ai.ts aims at them). */ taunt: number; tauntBy: string;
  /** Boss-summoned add: never respawns. */ minion: boolean;
}
export interface Orb { x: number; y: number; vx: number; vy: number; v: number; t: number }
export interface Hazard { x: number; y: number; r: number; t: number; max: number; dmg: number; foe: boolean; /** drawn cyan (Count Aurel tide splashes) */ tide?: boolean; /** drawn red/violet (Cageward Twins) */ cage?: boolean; /** drawn violet/gold (Morvant) */ eclipse?: boolean; /** lit safe zone, no damage */ safe?: boolean; /** Malachar: spring colour 0 red 1 violet 2 cyan 3 green */ dusk?: number }
export interface BossState { phase: number; active: boolean; done: boolean; lockT: number; introT: number }

export const FOE_INFO: Record<FoeKind, { name: string; hp: number; exp: number; heavy: number; respawn: number }> = {
  brute: { name: "Scrapjaw", hp: 30, exp: 6, heavy: 1, respawn: 25 },
  wisp: { name: "Glimmer Wisp", hp: 18, exp: 8, heavy: 1.2, respawn: 25 },
  warden: { name: "Stoneward", hp: 70, exp: 14, heavy: 0.35, respawn: 35 },
  boss: { name: "Warden Rune", hp: 420, exp: 80, heavy: 0.08, respawn: Infinity },
  slag: { name: "Slagheart", hp: 620, exp: 140, heavy: 0.05, respawn: Infinity },
  aurel: { name: "Count Aurel", hp: 760, exp: 180, heavy: 0.05, respawn: Infinity },
  morvant: { name: "Morvant, the Eclipse Golem", hp: 900, exp: 240, heavy: 0, respawn: Infinity },
  malachar: { name: "Malachar Vesh, the Last Dusk", hp: 1200, exp: 400, heavy: 0, respawn: Infinity },
  vey: { name: "Vey of the Cage", hp: 430, exp: 110, heavy: 0.08, respawn: Infinity },
  nell: { name: "Nell of the Cage", hp: 400, exp: 110, heavy: 0.08, respawn: Infinity },
  kettle: { name: "Foreman Kettle", hp: 380, exp: 90, heavy: 0.1, respawn: Infinity },
  corvin: { name: "Reedwraith Corvin", hp: 340, exp: 110, heavy: 0.3, respawn: Infinity },
  pylon: { name: "Cage Pylon", hp: 60, exp: 6, heavy: 0, respawn: Infinity },
  // Area 2 (Hushwater) foes, art pack 3
  reed_wraith: { name: "Reed Wraith", hp: 22, exp: 10, heavy: 1.1, respawn: 28 },
  witchlight_newt: { name: "Witchlight Newt", hp: 16, exp: 8, heavy: 1.3, respawn: 25 },
  bog_sprout: { name: "Bog Sprout", hp: 24, exp: 8, heavy: 0.3, respawn: 25 },
  fen_warden: { name: "Fen Warden", hp: 76, exp: 15, heavy: 0.35, respawn: 35 },
  mossback_snapper: { name: "Mossback Snapper", hp: 52, exp: 11, heavy: 0.5, respawn: 30 },
  duskhound: { name: "Duskhound", hp: 24, exp: 7, heavy: 1.2, respawn: 25 },
  mossling: { name: "Mossling", hp: 26, exp: 6, heavy: 1, respawn: 25 },
  hush_squire: { name: "Hush Squire", hp: 34, exp: 10, heavy: 0.8, respawn: 30 },
};

/** Behaviour role for small foes: brute = melee lunger, wisp = ranged shooter, warden = shield/slam tank. Bosses have none. */
export type Role = "brute" | "wisp" | "warden";
const ROLE: Partial<Record<FoeKind, Role>> = { brute: "brute", wisp: "wisp", warden: "warden",
  duskhound: "brute", mossling: "brute", mossback_snapper: "brute", hush_squire: "brute",
  reed_wraith: "wisp", witchlight_newt: "wisp", bog_sprout: "wisp", fen_warden: "warden" };
export const roleOf = (k: string): Role | undefined => ROLE[k as FoeKind];
/** Per-kind tuning over the role defaults (brute/wisp/warden values are the originals, unchanged).
 * spd chase speed, tele telegraph s, reach start-attack distance, lunge speed, actT lunge s, dmg, shot speed, keep [near, far], spread shots per volley, slamR. */
export interface Tune { spd: number; tele: number; reach: number; lunge: number; actT: number; dmg: number; shot: number; keep: [number, number]; spread: number; slamR: number }
const BASE: Record<Role, Tune> = {
  brute: { spd: 46, tele: 0.5, reach: 30, lunge: 210, actT: 0.22, dmg: 8, shot: 0, keep: [0, 0], spread: 1, slamR: 0 },
  wisp: { spd: 36, tele: 0.7, reach: 150, lunge: 0, actT: 0, dmg: 6, shot: 95, keep: [80, 110], spread: 1, slamR: 0 },
  warden: { spd: 24, tele: 0.85, reach: 38, lunge: 0, actT: 0.15, dmg: 12, shot: 0, keep: [0, 0], spread: 1, slamR: 38 },
};
const TUNE: Partial<Record<FoeKind, Partial<Tune>>> = {
  duskhound: { spd: 64, tele: 0.4, lunge: 240, dmg: 7 },
  mossling: { spd: 40, dmg: 6 },
  mossback_snapper: { spd: 28, tele: 0.6, lunge: 170, dmg: 11 },
  hush_squire: { spd: 40, tele: 0.65, reach: 60, lunge: 300, actT: 0.26, dmg: 10 }, // long rapier lunge
  reed_wraith: { tele: 0.9, shot: 80, dmg: 7, keep: [100, 140], spread: 3 }, // casts a 3-bolt fan
  witchlight_newt: { spd: 44, tele: 0.6, shot: 110, dmg: 5, keep: [70, 100] },
  bog_sprout: { spd: 0, tele: 0.8, reach: 130, shot: 85, dmg: 6, keep: [0, 999] }, // rooted lurker
  fen_warden: { spd: 22, dmg: 13, slamR: 40 },
};
export const tuneOf = (k: FoeKind): Tune => ({ ...BASE[roleOf(k) ?? "brute"], ...(TUNE[k] ?? {}) });

export function makeEnemy(kind: FoeKind, x: number, y: number): Enemy {
  const i = FOE_INFO[kind];
  return { kind, x, y, vx: 0, vy: 0, hp: i.hp, max: i.hp, state: "idle", t: 0, ax: 0, ay: 1, flash: 0, dead: false, respawn: 0,
    hx: x, hy: y, hitBy: 0, wander: Math.random() * 6, hurt: 0, guard: roleOf(kind) === "warden", heavy: i.heavy, move: "", n: 0, taunt: 0, tauntBy: "", minion: false };
}
