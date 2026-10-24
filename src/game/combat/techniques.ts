/** Ki techniques: cycled with Q / LB / L. Each costs EP. Owner: Master Builder. */
import type { Game, Shot } from "../../game";
import { CH_COMBAT, K_SPARK, K_RING, C_CYAN, C_WHITE } from "../../vendor/particles";

export interface Tech { id: "bolt" | "beam" | "spread"; name: string; cost: number; cd: number; col: string }
export const TECHS: Tech[] = [
  { id: "bolt", name: "Ki Bolt", cost: 6, cd: 0.22, col: "rgba(80,200,255,.95)" },
  { id: "beam", name: "Lance Beam", cost: 16, cd: 0.5, col: "rgba(255,120,255,.95)" },
  { id: "spread", name: "Scatter Burst", cost: 12, cd: 0.45, col: "rgba(255,210,90,.95)" },
];
export const BEAM_FULL = 0.8;

export function cycleTech(g: Game) {
  const m = g.mb; m.tech = (m.tech + 1) % TECHS.length; m.charge = 0; m.charging = false;
  g.say(`Technique: ${TECHS[m.tech].name} (${TECHS[m.tech].cost} EP)`, 1.1);
}

function shot(g: Game, ang: number, sp: number, dmg: number, extra: Partial<Shot> = {}) {
  const p = g.p;
  g.shots.push({ x: p.x + Math.cos(ang) * 10, y: p.y - 14 + Math.sin(ang) * 8, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.2, foe: false, dmg, ...extra });
}

/** Replaces the single blast. Bolt/spread fire on press; beam charges while held and fires on release. */
export function updateTechnique(g: Game, dt: number) {
  const inp = g.input, m = g.mb, t = TECHS[m.tech], p = g.p;
  m.fire = Math.max(0, m.fire - dt);
  if (inp.pressed("cycle")) cycleTech(g);
  if (g.blocking) { m.charging = false; m.charge = 0; return; }
  const ang = Math.atan2(p.fy, p.fx), boost = g.mb.tfOn ? 1.4 : 1;
  const pay = () => { if (g.ep < t.cost) { g.say("Not enough EP", 0.8); return false; } g.ep -= t.cost; g.blastCd = t.cd; g.stats.blasts++; return true; };
  if (t.id === "beam") {
    if (inp.pressed("blast") && g.blastCd <= 0) { m.charging = true; m.charge = 0; }
    if (m.charging) {
      m.charge = Math.min(BEAM_FULL, m.charge + dt);
      if (g.frame % 4 === 0) { const a = g.parts.rand() * 6.28; g.parts.emit(CH_COMBAT, K_SPARK, p.x + p.fx * 10 + Math.cos(a) * 12, p.y - 14 + Math.sin(a) * 12, -Math.cos(a) * 50, -Math.sin(a) * 50, 0.22, C_CYAN); }
      if (!inp.down("blast")) {
        m.charging = false;
        if (pay()) {
          const k = 0.5 + m.charge / BEAM_FULL;
          shot(g, ang, 340, g.blastDmg * 1.3 * k, { pierce: true, r: 6 + 4 * k, tech: 1, life: 0.9, hit: [] });
          m.fire = 0.15; g.shake = 1.5;
        }
        m.charge = 0;
      }
    }
    return;
  }
  if (!inp.pressed("blast") || g.blastCd > 0) return;
  if (!pay()) return;
  m.fire = 0.12;
  if (t.id === "bolt") shot(g, ang, 260, g.blastDmg * 0.85, { tech: 0 });
  else for (let i = -2; i <= 2; i++) shot(g, ang + i * 0.22, 200, g.blastDmg * 0.55, { tech: 2, life: 0.6 });
  g.parts.emit(CH_COMBAT, K_RING, p.x + p.fx * 10, p.y - 14 + p.fy * 8, 0, 0, 0.15, boost > 1 ? C_CYAN : C_WHITE);
}
