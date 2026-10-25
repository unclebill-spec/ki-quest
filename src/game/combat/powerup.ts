/** Power-up meter (g.tf, 0..100) and the timed transformation. Owner: Master Builder. */
import { barkParty } from "./barks"; // MB hook: barks
import type { Game } from "../../game";
import { CH_HUB, K_SPARK, K_RING, C_CYAN, C_VIOLET, C_GOLD } from "../../vendor/particles";

export const TF_TIME = 14; // seconds of boost
export const TF_HIT = 2.5, TF_HURT = 4, TF_CHARGE_PER_S = 9, TF_IDLE_PER_S = 0.4;

/** Stat multipliers while transformed. */
export function tfMul(g: Game) {
  return g.mb?.tfOn ? { melee: 1.5, blast: 1.4, speed: 1.25, def: 0.15, regen: 2.5 } : { melee: 1, blast: 1, speed: 1, def: 0, regen: 1 };
}
export function meterGain(g: Game, v: number) { if (!g.mb.tfOn) g.tf = Math.min(100, g.tf + v); }

export function transform(g: Game) {
  if (g.mb.tfOn || g.tf < 100) return false;
  g.mb.tfOn = true; g.mb.tfT = TF_TIME; g.shake = 4; g.stats.transforms = (g.stats.transforms ?? 0) + 1; g.mb.sfx.push("transform-powerup"); barkParty(g, "transform"); // MB hook: barks
 
  g.hp = Math.min(g.maxHp, g.hp + g.maxHp * 0.25); g.ep = g.maxEp;
  for (let i = 0; i < 12; i++) g.parts.emit(CH_HUB, K_SPARK, g.p.x, g.p.y - 14, Math.cos(i / 1.9) * 110, Math.sin(i / 1.9) * 110, 0.5, i & 1 ? C_CYAN : C_VIOLET, 0, 2);
  g.say("AWAKENED! Power, speed and guard up", 2);
  return true;
}

/** Charge (hold block while standing still, no shield) fills EP and the meter; transform on T / Y / TF. */
export function updatePowerup(g: Game, dt: number) {
  const m = g.mb, p = g.p, inp = g.input;
  m.chargingKi = g.blocking && !g.shield && !p.moving && !g.swing.step;
  if (m.chargingKi) {
    g.ep = Math.min(g.maxEp, g.ep + 14 * dt); meterGain(g, TF_CHARGE_PER_S * dt);
    if (g.frame % 5 === 0) { const a = g.parts.rand() * 6.28; g.parts.emit(CH_HUB, K_SPARK, p.x + Math.cos(a) * 10, p.y - 2, 0, -60, 0.35, C_CYAN); }
  }
  if (inp.pressed("transform")) { if (!transform(g)) g.say(m.tfOn ? "Already awakened" : `Power meter ${Math.floor(g.tf)}%`, 0.9); }
  if (m.tfOn) {
    m.tfT -= dt; g.tf = Math.max(0, (m.tfT / TF_TIME) * 100);
    if (g.frame % 3 === 0) {
      const a = g.parts.rand() * 6.28, r = 8 + g.parts.rand() * 6;
      g.parts.emit(CH_HUB, g.frame % 9 ? K_SPARK : K_RING, p.x + Math.cos(a) * r, p.y - 4 - g.parts.rand() * 20, Math.cos(a) * 8, -45 - g.parts.rand() * 30, 0.45, g.frame & 2 ? C_CYAN : C_VIOLET, -20, 1);
    }
    if (m.tfT <= 0) { m.tfOn = false; g.tf = 0; g.say("Power fades", 1.2); m.sfx.push("flight-land"); g.parts.emit(CH_HUB, K_RING, p.x, p.y - 14, 0, 0, 0.3, C_GOLD); }
  } else g.tf = Math.min(100, g.tf + TF_IDLE_PER_S * dt);
  // Flight: transformed + standing still = hover (matches the "fly" sprite in draw.ts).
  const hover = m.tfOn && !p.moving;
  if (hover && !m.hover) m.sfx.push("flight-takeoff");
  else if (!hover && m.hover && m.tfOn) m.sfx.push("flight-land");
  m.hover = hover;
}
const GP = globalThis as unknown as { __kiMB?: Record<string, unknown> }; GP.__kiMB = { ...(GP.__kiMB ?? {}), transform }; // MB hook: test access
