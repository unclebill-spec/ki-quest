/** Enemy data. Kinds: brute = melee rusher, wisp = ranged shooter, warden = tank/blocker, boss = area boss. Owner: Master Builder. */
export type FoeKind = "brute" | "wisp" | "warden" | "boss";
export type FoeState = "idle" | "chase" | "tele" | "act" | "recover";
export interface Enemy {
  kind: FoeKind; x: number; y: number; vx: number; vy: number; hp: number; max: number;
  state: FoeState; t: number; ax: number; ay: number;
  flash: number; dead: boolean; respawn: number; hx: number; hy: number; hitBy: number; wander: number;
  /** Hurt stun seconds (no AI intent). */ hurt: number;
  /** Warden: shield raised toward (ax, ay). */ guard: boolean;
  /** Knockback taken multiplier. */ heavy: number;
  /** Boss move currently telegraphed / running. */ move: string; n: number;
}
export interface Orb { x: number; y: number; vx: number; vy: number; v: number; t: number }
export interface Hazard { x: number; y: number; r: number; t: number; max: number; dmg: number; foe: boolean }
export interface BossState { phase: number; active: boolean; done: boolean; lockT: number; introT: number }

export const FOE_INFO: Record<FoeKind, { name: string; hp: number; exp: number; heavy: number; respawn: number }> = {
  brute: { name: "Scrapjaw", hp: 30, exp: 6, heavy: 1, respawn: 25 },
  wisp: { name: "Glimmer Wisp", hp: 18, exp: 8, heavy: 1.2, respawn: 25 },
  warden: { name: "Stoneward", hp: 70, exp: 14, heavy: 0.35, respawn: 35 },
  boss: { name: "Warden Rune", hp: 420, exp: 80, heavy: 0.08, respawn: Infinity },
};

export function makeEnemy(kind: FoeKind, x: number, y: number): Enemy {
  const i = FOE_INFO[kind];
  return { kind, x, y, vx: 0, vy: 0, hp: i.hp, max: i.hp, state: "idle", t: 0, ax: 0, ay: 1, flash: 0, dead: false, respawn: 0,
    hx: x, hy: y, hitBy: 0, wander: Math.random() * 6, hurt: 0, guard: kind === "warden", heavy: i.heavy, move: "", n: 0 };
}
