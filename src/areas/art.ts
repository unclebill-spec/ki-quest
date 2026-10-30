/** World art for areas: tile palettes, props (mushroom houses, cap trees, graves), NPCs, wards, updraft stones, and the story overlay. */
import type { Game } from "../game";
import type { Story } from "../story";
import { TILE, MW, MH, T_FLOOR, T_WALL, T_MOSS, T_PLAZA, T_WATER, T_PATH, T_BOARD, T_WARD, T_HIDDEN, wardOpen } from "../world";
import { NPCS, INTRO } from "../story/script";
import { wrap as wrapText, hud as hudText } from "../textfit";
import { sheet, drawSprite } from "../game/combat/sprites";
import { groundSet, drawGround, type GroundSet, type Kind } from "./groundgen";

type C2 = CanvasRenderingContext2D;
const PAL = {
  moss: { floor: ["#3d3a46", "#383542"], moss: ["#33452f", "#2f402b"], path: ["#5a4c3c", "#54473a"], wall: ["#3a3448", "#4c4560", "#231f2e"], water: ["#1c2a4a", "#22325a"] },
  violet: { floor: ["#5c5274", "#585070"], moss: ["#4c4670", "#48426c"], path: ["#6e6488", "#6a6084"], wall: ["#3e3650", "#5e5678", "#1e1828"], water: ["#07040f", "#090512"] },
  husk: { floor: ["#4a2a2e", "#46282c"], moss: ["#3a2230", "#36202c"], path: ["#5a3a30", "#56362e"], wall: ["#2a1418", "#4a2a26", "#140a0c"], water: ["#c06a20", "#d07a28"] },
  tide: { floor: ["#2a3a40", "#26363c"], moss: ["#1e3a3a", "#1c3636"], path: ["#3c4a4a", "#384646"], wall: ["#2a3438", "#4a5a5c", "#141c20"], water: ["#0e4a5a", "#125664"] },
  ember: { floor: ["#3a2e2a", "#362a26"], moss: ["#2e2626", "#2a2222"], path: ["#5a4232", "#54402e"], wall: ["#3a2a28", "#5a3a30", "#1e1412"], water: ["#8a2a10", "#a03a14"] },
  marsh: { floor: ["#2f3440", "#2b303b"], moss: ["#2c3a3a", "#283636"], path: ["#4a4438", "#454034"], wall: ["#2e2a3e", "#403a56", "#1c1828"], water: ["#241a44", "#2c2052"] },
};

const GPAL = { moss: { spore: "#6ad8ff", plaza: "#544c5a" }, marsh: { spore: "#b48aff", plaza: "#4c4652" }, ember: { spore: "#ff8a4a", plaza: "#6a5650" }, tide: { spore: "#7affe0", plaza: "#4e5e60" }, violet: { spore: "#d4a0ff", plaza: "#6e6284" }, husk: { spore: "#ffb050", plaza: "#5a3236" } };
const GSETS: Partial<Record<"moss" | "marsh" | "ember" | "tide" | "violet" | "husk", GroundSet>> = {};
const gset = (t: "moss" | "marsh" | "ember" | "tide" | "violet" | "husk") => (GSETS[t] ??= groundSet({ floor: PAL[t].floor[0], moss: PAL[t].moss[0], path: PAL[t].path[0], water: PAL[t].water[0], ...GPAL[t] }, t === "moss" ? 1 : t === "marsh" ? 2 : t === "ember" ? 3 : 4));
const CREDITS = ["#KINDLE QUEST", "", "an original game for Bill Weathersbee", "", "#Lamps still need lighting.", "#Just not all the time.", "", "",
  "#A Burning Bush Productions game", "", "#Created by", "Will (Bill Weathersbee)", "",
  "#Story & World", "the World/Story team", "Hearthmoor Story", "", "#Combat, Heroes & Bosses", "the Master Builder team", "",
  "#Art", "Nintendo 64 Style and the art team", "", "#Menus, Save & Input", "the Cozy Builder team", "",
  "#Music & Sound", "Hearthmoor Sound (ACE-Step 1.5, sfxr)", "", "#Build & Release", "Nintendo 64 Style", "",
  "#Starring", "Rook, the lamplighter", "Mirela, keeper of the dead", "Brann Okoro, smith", "Sable Kestrel, the herald who turned", "",
  "#and", "Malachar Vesh, the Last Dusk", "",
  "#Also starring", "Ashmaw, Grotto Devourer", "Slagheart", "Count Aurel, Tide General", "the Cageward Twins", "Morvant, the Eclipse Golem", "Hollowmere, the Drinking Colossus", "",
  "#Final boss", "Warden Rune, the Last Guardian of the Wellsprings", "", "",
  "#Thank you for playing.", "", "The glow nights still come each evening.", "Everyone gathers close, by choice now."];
/** W17d: scroll just past the last line, then a 4 s THE END card (was ~10 s of empty gradient). */
export const CREDITS_T = Math.ceil((216 /* view H */ + 24 + CREDITS.length * 14) / 16) + 4;
const KIND: Record<number, Kind> = { [T_FLOOR]: "floor", [T_MOSS]: "moss", [T_PATH]: "path", [T_PLAZA]: "plaza", [T_WATER]: "water", [T_HIDDEN]: "water", [T_WARD]: "floor" };

export function tile(c: C2, theme: "moss" | "marsh" | "ember" | "tide" | "violet" | "husk", v: number, X: number, Y: number, tx: number, ty: number, time: number, tiles?: Uint8Array) {
  if (v === T_HIDDEN) v = T_WATER;
  const P = PAL[theme], ch = (tx + ty) & 1;
  const k = KIND[v];
  if (tiles && k && v !== T_WARD) {
    const G = gset(theme);
    drawGround(c, G, k, X, Y, tx, ty, (dx, dy) => { const x = tx + dx, y = ty + dy; return x < 0 || y < 0 || x >= MW || y >= MH ? null : KIND[tiles[y * MW + x]] ?? null; });
    if (v === T_WATER) { const w = Math.sin(time * 1.6 + tx * 0.9 + ty * 1.3); c.fillStyle = (theme === "marsh" ? "rgba(190,140,255,.22)" : theme === "ember" ? "rgba(255,200,80,.35)" : theme === "tide" ? "rgba(122,255,224,.25)" : "rgba(120,200,255,.18)"); c.fillRect(X + 3 + Math.round(w * 2), Y + 6 + ((tx * 5 + ty) % 6), 6, 1); }
    return;
  }
  if (v === T_WALL) { c.fillStyle = P.wall[0]; c.fillRect(X, Y, TILE, TILE); c.fillStyle = P.wall[1]; c.fillRect(X, Y, TILE, 4); c.fillStyle = P.wall[2]; c.fillRect(X, Y + 13, TILE, 3); }
  else if (v === T_PLAZA) { c.fillStyle = ch ? "#5a5260" : "#544c5a"; c.fillRect(X, Y, TILE, TILE); c.fillStyle = "#463f4c"; c.fillRect(X, Y, TILE, 1); c.fillRect(X, Y, 1, TILE); }
  else if (v === T_WATER) {
    c.fillStyle = P.water[ch]; c.fillRect(X, Y, TILE, TILE);
    const k = Math.sin(time * 1.6 + tx * 0.9 + ty * 1.3);
    c.fillStyle = (theme === "marsh" ? "rgba(190,140,255,.22)" : theme === "ember" ? "rgba(255,200,80,.35)" : theme === "tide" ? "rgba(122,255,224,.25)" : "rgba(120,200,255,.18)"); c.fillRect(X + 3 + Math.round(k * 2), Y + 6 + ((tx * 5 + ty) % 6), 6, 1);
  }
  else if (v === T_BOARD) { if (tiles) c.drawImage(gset(theme).base.water[(tx * 7 + ty * 3) & 3], X, Y); else { c.fillStyle = P.water[ch]; c.fillRect(X, Y, TILE, TILE); } c.fillStyle = "#6a5038"; c.fillRect(X + 1, Y, TILE - 2, TILE); c.fillStyle = "#4a3828"; for (let i = 0; i < 4; i++) c.fillRect(X + 1, Y + i * 4 + 3, TILE - 2, 1); }
  else if (v === T_WARD) {
    if (tiles) c.drawImage(gset(theme).base.floor[(tx * 7 + ty * 3) & 3], X, Y); else { c.fillStyle = P.floor[ch]; c.fillRect(X, Y, TILE, TILE); }
    if (!wardOpen) { c.fillStyle = "#2a2440"; c.fillRect(X + 1, Y, TILE - 2, TILE); c.fillStyle = `rgba(120,220,255,${0.5 + 0.3 * Math.sin(time * 3)})`; c.fillRect(X + 4, Y + 3, 8, 1); c.fillRect(X + 7, Y + 3, 2, 10); c.fillRect(X + 4, Y + 12, 8, 1); }
  }
  else { const p = v === T_MOSS ? P.moss : v === T_PATH ? P.path : P.floor; c.fillStyle = p[ch]; c.fillRect(X, Y, TILE, TILE); }
}

function forge(c: C2, x: number, y: number) {
  // ember-theme house: stone smithy with slate roof, chimney and a glowing forge mouth
  c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(x, y + 10, 26, 6, 0, 0, 7); c.fill();
  c.fillStyle = "#4a3a34"; c.fillRect(x - 18, y - 10, 36, 20); c.fillStyle = "#3a2c28"; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) c.fillRect(x - 18 + j * 9 + (i % 2) * 4, y - 9 + i * 4, 1, 3);
  c.fillStyle = "#ff7a2a"; c.fillRect(x - 5, y, 10, 10); c.fillStyle = "#ffd070"; c.fillRect(x - 3, y + 3, 6, 7);
  c.fillStyle = "#ffb060"; c.fillRect(x - 13, y - 4, 5, 4); c.fillRect(x + 8, y - 4, 5, 4);
  c.fillStyle = "#2a2226"; c.beginPath(); c.moveTo(x - 24, y - 9); c.lineTo(x, y - 24); c.lineTo(x + 24, y - 9); c.fill();
  c.fillStyle = "#3a3036"; c.beginPath(); c.moveTo(x - 20, y - 10); c.lineTo(x, y - 21); c.lineTo(x + 20, y - 10); c.fill();
  c.fillStyle = "#5a4a44"; c.fillRect(x + 9, y - 28, 6, 14); c.fillStyle = "#ff6a2a"; c.fillRect(x + 10, y - 29, 4, 2);
}
function dome(c: C2, x: number, y: number) {
  // tide-theme house: half-drowned stone dome with a cracked sun disc over the door
  c.fillStyle = "rgba(0,0,0,.4)"; c.beginPath(); c.ellipse(x, y + 10, 26, 6, 0, 0, 7); c.fill();
  c.fillStyle = "#4a5a5c"; c.fillRect(x - 18, y - 8, 36, 18); c.fillStyle = "#3a484a"; c.fillRect(x - 18, y + 4, 36, 6);
  c.fillStyle = "#5e7072"; c.beginPath(); c.ellipse(x, y - 8, 20, 14, 0, Math.PI, 0); c.fill();
  c.fillStyle = "#2a8a7a"; for (const dx of [-14, -6, 9, 15]) c.fillRect(x + dx, y - 6, 2, 10);
  c.fillStyle = "#10262a"; c.beginPath(); c.ellipse(x, y + 2, 5, 8, 0, Math.PI, 0); c.fill(); c.fillRect(x - 5, y + 2, 10, 8);
  c.fillStyle = "#c8b060"; c.beginPath(); c.arc(x, y - 14, 4, 0, 7); c.fill(); c.fillStyle = "#5e7072"; c.fillRect(x + 1, y - 18, 1, 8);
  c.fillStyle = "#7affe0"; c.fillRect(x - 12, y - 2, 3, 3); c.fillRect(x + 10, y - 2, 3, 3);
}
function pillar(c: C2, x: number, y: number) {
  c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, y + 5, 8, 3, 0, 0, 7); c.fill();
  c.fillStyle = "#5e7072"; c.fillRect(x - 5, y - 20, 10, 25); c.fillStyle = "#4a5a5c"; c.fillRect(x - 5, y - 20, 3, 25); c.fillStyle = "#788a8c"; c.fillRect(x - 7, y - 23, 14, 4);
  c.fillStyle = "#2a8a7a"; c.fillRect(x - 3, y - 6, 2, 9); c.fillRect(x + 2, y - 12, 2, 5); c.fillStyle = "#7affe0"; c.fillRect(x + 2, y - 13, 1, 1);
}
function house(c: C2, x: number, y: number) {
  // 3x2 tile footprint centred at (x, y): wooden walls under a giant blue mushroom cap
  c.fillStyle = "rgba(0,0,0,.4)"; c.beginPath(); c.ellipse(x, y + 10, 26, 6, 0, 0, 7); c.fill();
  c.fillStyle = "#5a4636"; c.fillRect(x - 18, y - 10, 36, 20); c.fillStyle = "#463628"; for (let i = 0; i < 5; i++) c.fillRect(x - 18, y - 8 + i * 4, 36, 1);
  c.fillStyle = "#2a1e16"; c.fillRect(x - 4, y, 8, 10); c.fillStyle = "#ffd890"; c.fillRect(x - 13, y - 4, 5, 4); c.fillRect(x + 8, y - 4, 5, 4);
  c.fillStyle = "#2a4a8a"; c.beginPath(); c.ellipse(x, y - 12, 28, 13, 0, Math.PI, 0); c.fill();
  c.fillStyle = "#3c64c8"; c.beginPath(); c.ellipse(x, y - 14, 25, 10, 0, Math.PI, 0); c.fill();
  c.fillStyle = "#7aa8f0"; for (const [dx, dy] of [[-12, -18], [4, -21], [14, -16], [-3, -15]]) c.fillRect(x + dx, y + dy, 3, 2);
  c.fillStyle = "#1e3466"; c.fillRect(x - 28, y - 13, 56, 2);
}
function crystal(c: C2, x: number, y: number) {
  c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, y + 5, 7, 3, 0, 0, 7); c.fill();
  c.fillStyle = "#3a8aa8"; c.beginPath(); c.moveTo(x - 6, y + 5); c.lineTo(x - 3, y - 14); c.lineTo(x + 1, y + 5); c.fill();
  c.fillStyle = "#7ff0ff"; c.beginPath(); c.moveTo(x - 1, y + 5); c.lineTo(x + 3, y - 20); c.lineTo(x + 6, y + 5); c.fill();
  c.fillStyle = "#d8ffff"; c.fillRect(x + 2, y - 14, 1, 10);
}
function spire(c: C2, x: number, y: number) {
  c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, y + 5, 8, 3, 0, 0, 7); c.fill();
  c.fillStyle = "#3a2622"; c.beginPath(); c.moveTo(x - 7, y + 5); c.lineTo(x - 1, y - 22); c.lineTo(x + 7, y + 5); c.fill();
  c.fillStyle = "#ff6a2a"; c.fillRect(x - 2, y - 12, 1, 6); c.fillRect(x + 1, y - 4, 1, 6); c.fillStyle = "#ffb060"; c.fillRect(x - 1, y - 18, 1, 3);
}
function tree(c: C2, x: number, y: number, marsh: boolean) {
  c.fillStyle = "rgba(0,0,0,.4)"; c.beginPath(); c.ellipse(x, y + 6, 9, 3, 0, 0, 7); c.fill();
  c.fillStyle = "#cfc4a8"; c.fillRect(x - 2, y - 14, 5, 20);
  c.fillStyle = marsh ? "#5a3a8a" : "#2a7a8a"; c.beginPath(); c.ellipse(x, y - 15, 11, 7, 0, Math.PI, 0); c.fill();
  c.fillStyle = marsh ? "#8a5ac8" : "#48b0c0"; c.beginPath(); c.ellipse(x, y - 16, 9, 5, 0, Math.PI, 0); c.fill();
  c.fillStyle = "#e0f8ff"; c.fillRect(x - 5, y - 19, 2, 2); c.fillRect(x + 3, y - 18, 2, 2);
}
function grave(c: C2, x: number, y: number) {
  c.fillStyle = "rgba(0,0,0,.4)"; c.fillRect(x - 6, y + 4, 12, 3);
  c.fillStyle = "#6a6a80"; c.fillRect(x - 5, y - 8, 10, 13); c.fillRect(x - 3, y - 10, 6, 2);
  c.fillStyle = "#4a4a5e"; c.fillRect(x - 1, y - 6, 2, 7); c.fillRect(x - 3, y - 4, 6, 2);
}
/** Idle bob: wall-clock time plus a per-NPC phase from its id. Never from screen x (that moved with the camera and sped the bob up while walking). */
/** Last drawn bob per NPC id (read by tests/npc-bob.mjs). */
export const NPC_BOB: Record<string, number> = ((globalThis as Record<string, unknown>).__kiNpcBob ??= {}) as Record<string, number>;
export const npcBob = (id: string, t: number) => Math.round(Math.sin(t * 2 + id.charCodeAt(0) * 1.7) * 0.6);
/** NPC: ~16x26, real clothes (coat or tunic over a shirt, belt at the waist, trousers, boots), head ~1/4 of height. */
function npc(c: C2, id: string, area: string, x: number, y: number, t: number) {
  const d = NPCS[area]?.[id]; if (!d) return;
  x = Math.round(x); y = Math.round(y);
  if (d.float) { c.save(); c.globalAlpha = 0.72; y -= 3 + Math.round(Math.sin(t * 2) * 1.5); } // W17f: Linnet, a half-translucent floating wraith
  if (d.sprite) { // final NPC sheet (24x32, idle/walk x 4 facings); the drawn placeholder below is only a fallback while it loads
    const sh = sheet(d.sprite);
    if (sh) { NPC_BOB[id] = 0; NPC_BOB[id + "@x"] = x; c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, y + (d.float ? 3 : 0), 6, 2, 0, 0, 7); c.fill();
      const ok = drawSprite(c, sh, "idle", "down", t * 4, x, y); if (ok) { if (d.float) c.restore(); return; } }
  }
  const h = 26 + (d.tall ?? 0), bob = npcBob(id, t); NPC_BOB[id] = bob; NPC_BOB[id + "@x"] = x;
  const top = y - h + bob, leg = Math.round(h * 0.38), torso = Math.round(h * 0.34), head = h - leg - torso;
  c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(x, y, 6, 2, 0, 0, 7); c.fill();
  // legs + boots
  c.fillStyle = "#2a2a3a"; c.fillRect(x - 4, y - leg, 3, leg - 2); c.fillRect(x + 1, y - leg, 3, leg - 2);
  c.fillStyle = "#1a1418"; c.fillRect(x - 4, y - 2, 3, 2); c.fillRect(x + 1, y - 2, 3, 2);
  // torso (coat), belt, arms
  const ty = top + head;
  c.fillStyle = d.coat; c.fillRect(x - 5, ty, 10, torso + 2);
  c.fillStyle = "#e8e0d0"; c.fillRect(x - 1, ty, 2, torso - 2);
  c.fillStyle = "#281a1a"; c.fillRect(x - 5, ty + torso - 2, 10, 2); c.fillStyle = d.trim; c.fillRect(x - 1, ty + torso - 2, 2, 2);
  c.fillStyle = d.coat; c.fillRect(x - 7, ty + 1, 2, torso - 1); c.fillRect(x + 5, ty + 1, 2, torso - 1);
  c.fillStyle = d.skin; c.fillRect(x - 7, ty + torso, 2, 2); c.fillRect(x + 5, ty + torso, 2, 2);
  // head + hair
  c.fillStyle = d.skin; c.fillRect(x - 3, top + 1, 6, head - 1);
  c.fillStyle = d.hair; c.fillRect(x - 4, top, 8, 3); c.fillRect(x - 4, top + 1, 1, head - 2); c.fillRect(x + 3, top + 1, 1, head - 2);
  c.fillStyle = "#181018"; c.fillRect(x - 2, top + 4, 1, 1); c.fillRect(x + 1, top + 4, 1, 1);
  if (d.float) { c.fillStyle = "#cfd2dc"; c.fillRect(x - 4, top + 3, 1, head + 4); c.fillStyle = d.trim; c.fillRect(x, ty + 2, 1, 1); /* braid + locket glint */ c.restore(); }
}

/** Push props, NPCs, stones into the y-sorted draw list (called from draw.ts). */
/** The husk sun seen from the Stair: a vast dark sphere hanging in the void, south-east of the rings. */
const SUN = { x: 38 * 16, y: 25 * 16, r: 104 };
const edge = (T: Uint8Array, x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => T[(y + b) * 48 + x + a] === T_WATER);
/** Day strength after the dawn epilogue: a gentle 4-minute day/night cycle (0 = glow night, 1 = noon). */
export const dayK = (t: number) => Math.max(0, Math.sin((t / 240) * Math.PI * 2));
export function worldSprites(c: C2, g: Game, cx: number, cy: number, list: { y: number; d: () => void }[]) {
  if (g.area.theme === "violet") list.push({ y: -1e9, d: () => {
    const X = SUN.x - cx, Y = SUN.y - cy; if (X < -SUN.r - 40 || X > 460 || Y < -SUN.r - 40 || Y > 300) return;
    const gr = c.createRadialGradient(X - 18, Y - 18, 6, X, Y, SUN.r); gr.addColorStop(0, "#2a1838"); gr.addColorStop(0.7, "#120a1c"); gr.addColorStop(1, "#06030c");
    c.fillStyle = gr; c.beginPath(); c.arc(X, Y, SUN.r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#3a2450"; c.lineWidth = 1; for (const k of [-0.5, 0, 0.45]) { c.beginPath(); c.ellipse(X, Y + k * SUN.r, SUN.r * Math.sqrt(1 - k * k), 4, 0, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = "#5a2a1a"; for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = SUN.r * (0.2 + 0.07 * i); c.fillRect(Math.round(X + Math.cos(a) * r), Math.round(Y + Math.sin(a) * r * 0.8), 2, 1); }
  } });
  const a = g.area, marsh = a.theme === "marsh";
  for (const p of a.props) {
    const X = p.x - cx, Y = p.y - cy;
    if (X < -40 || X > 424 || Y < -40 || Y > 260) continue;
    list.push({ y: p.y + (p.kind === "house" ? 8 : 0), d: () => p.kind === "house" ? (a.theme === "ember" ? forge(c, X, Y) : a.theme === "tide" ? dome(c, X, Y) : house(c, X, Y)) : p.kind === "crystal" ? crystal(c, X, Y) : p.kind === "tree" ? (a.theme === "ember" ? spire(c, X, Y) : a.theme === "tide" ? pillar(c, X, Y) : tree(c, X, Y, marsh)) : grave(c, X, Y) });
  }
  for (const n of a.npcs) list.push({ y: n.y, d: () => npc(c, n.id, a.id, n.x - cx, n.y - cy, g.time) });
  for (const s of a.travel) {
    const X = s.x - cx, Y = s.y - cy;
    c.fillStyle = "#3a3a52"; c.beginPath(); c.ellipse(X, Y, 12, 6, 0, 0, 7); c.fill();
    c.strokeStyle = "#c8f0ff"; c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, 8, 4, 0, 0, 7); c.stroke();
  }
}
/** Story handle so world art can hide collected orbs (set by main.ts). */
let st: Story | null = null;
export function bindStory(s: Story) { st = s; }
/** Light sources for the multiply layer. */
export function worldLights(g: Game, cx: number, cy: number, add: (x: number, y: number, r: number, col: [number, number, number], f: number) => void) {
  for (const p of g.area.props) if (p.kind === "crystal") add(p.x - cx, p.y - cy - 8, 40, [0.45, 0.95, 1], 0);
  for (const p of g.area.props) if (p.kind === "house") add(p.x - cx, p.y - cy - 12, 56, g.area.theme === "ember" ? [1, 0.5, 0.2] : g.area.theme === "tide" ? [0.3, 0.9, 0.8] : [0.35, 0.55, 1], 0);
  const T = g.area.tiles, X0 = Math.max(0, Math.floor(cx / 16) - 1), Y0 = Math.max(0, Math.floor(cy / 16) - 1);
  if (g.area.theme === "violet") { // the Stair: soft violet fill, neon ring edges, the husk sun's cold rim
    add(192, 108, 340, [0.2, 0.15, 0.28], 0);
    for (let ty = Y0; ty < Math.min(34, Y0 + 16); ty++) for (let tx = X0; tx < Math.min(48, X0 + 27); tx++) if ((tx + ty) % 3 === 0 && T[ty * 48 + tx] !== T_WATER && T[ty * 48 + tx] !== T_WALL && edge(T, tx, ty)) add(tx * 16 + 8 - cx, ty * 16 + 8 - cy, 34, [0.32, 0.16, 0.5], 0);
    add(SUN.x - cx, SUN.y - cy, 220, [0.22, 0.1, 0.3], 0);
  }
  if (g.area.theme === "husk") add(192, 108, 360, [0.3, 0.16, 0.12], 0);
  if (st?.flags.dawn) { const k = dayK(g.time); if (k > 0.02) add(192, 108, 520, [1.5 * k, 1.35 * k, 1.0 * k], 0); }
  if (g.area.theme === "ember" || g.area.theme === "tide" || g.area.theme === "husk") { // lava / glowing canals light the scene
    const t = g.area.tiles, x0 = Math.max(0, Math.floor(cx / 16)), y0 = Math.max(0, Math.floor(cy / 16));
    for (let ty = y0; ty < Math.min(34, y0 + 15); ty += 2) for (let tx = x0; tx < Math.min(48, x0 + 25); tx += 2) if (t[ty * 48 + tx] === T_WATER) add(tx * 16 + 8 - cx, ty * 16 + 8 - cy, 44, g.area.theme === "ember" ? [0.55, 0.22, 0.08] : g.area.theme === "husk" ? [0.5, 0.3, 0.1] : [0.1, 0.35, 0.35], 0);
    if (g.area.id === "emberquarry") add(192, 108, 320, [0.16, 0.1, 0.07], 0);
  }
  for (const s of g.area.travel) add(s.x - cx, s.y - cy, 52, [0.7, 0.9, 1], 0);
  for (const n of g.area.npcs) add(n.x - cx, n.y - cy - 12, 30, [0.8, 0.75, 0.7], 0);
  for (const s of g.area.springs) add(s.x - cx, s.y - cy, 60, [0.5, 1, 0.8], 0);
  for (const o of g.area.orbs) if (!st?.flags[`orb_${g.area.id}_${o.i}`]) add(o.x - cx, o.y - cy - 10, 36, [0.45, 0.85, 1], 0);
}
/** Additive glows after the light layer. */
export function worldGlow(c: C2, g: Game, cx: number, cy: number, glow: (c: C2, x: number, y: number, r: number, col: string, a?: number) => void) {
  if (g.area.theme === "violet") { // neon rims on the floating rings + the husk sun's rim
    const T = g.area.tiles, X0 = Math.max(0, Math.floor(cx / 16)), Y0 = Math.max(0, Math.floor(cy / 16)), k = 0.55 + 0.25 * Math.sin(g.time * 2);
    c.fillStyle = `rgba(200,140,255,${k})`;
    for (let ty = Y0; ty < Math.min(34, Y0 + 15); ty++) for (let tx = X0; tx < Math.min(48, X0 + 26); tx++) {
      const v = T[ty * 48 + tx]; if (v === T_WATER || v === T_WALL) continue;
      const X = tx * 16 - cx, Y = ty * 16 - cy, w = (x: number, y: number) => T[y * 48 + x] === T_WATER;
      if (ty > 0 && w(tx, ty - 1)) c.fillRect(X, Y, 16, 1); if (ty < 33 && w(tx, ty + 1)) c.fillRect(X, Y + 15, 16, 2);
      if (tx > 0 && w(tx - 1, ty)) c.fillRect(X, Y, 1, 16); if (tx < 47 && w(tx + 1, ty)) c.fillRect(X + 15, Y, 1, 16);
    }
    const sx = SUN.x - cx, sy = SUN.y - cy, f = 0.5 + 0.5 * Math.sin(g.time * 0.9) * Math.sin(g.time * 2.3);
    glow(c, sx, sy, SUN.r + 26, "rgba(150,70,220,.35)"); glow(c, sx + 10, sy - 8, 14 + f * 6, `rgba(255,170,90,${0.25 + 0.3 * f})`);
  }
  if (g.area.theme === "husk") for (const p of g.area.props) if (p.kind === "crystal") glow(c, p.x - cx, p.y - cy - 10, 20, st?.flags.poured ? "rgba(255,220,120,.7)" : "rgba(255,120,60,.35)");
  for (const p of g.area.props) {
    if (p.kind === "house") { glow(c, p.x - cx, p.y - cy - 16, 22, g.area.theme === "ember" ? "rgba(255,120,40,.35)" : "rgba(80,140,255,.35)"); glow(c, p.x - cx - 10, p.y - cy - 2, 5, "rgba(255,210,140,.7)"); glow(c, p.x - cx + 10, p.y - cy - 2, 5, "rgba(255,210,140,.7)"); }
    else if (p.kind === "crystal") glow(c, p.x - cx + 2, p.y - cy - 8, 14, "rgba(120,240,255,.5)");
    else if (p.kind === "tree") glow(c, p.x - cx, p.y - cy - 17, 10, g.area.theme === "marsh" ? "rgba(170,110,255,.45)" : g.area.theme === "ember" ? "rgba(255,110,40,.4)" : g.area.theme === "tide" ? "rgba(122,255,224,.35)" : "rgba(90,220,240,.4)");
  }
  for (const s of g.area.springs) {
    const X = s.x - cx, Y = s.y - cy, k = 0.6 + 0.4 * Math.sin(g.time * 2.4);
    glow(c, X, Y, 18, `rgba(110,255,200,${0.35 * k})`); glow(c, X, Y - 6 - ((g.time * 14) % 10), 3, "rgba(220,255,240,.8)");
  }
  for (const o of g.area.orbs) if (!st?.flags[`orb_${g.area.id}_${o.i}`]) {
    const X = o.x - cx + Math.sin(g.time * 1.3 + o.i) * 3, Y = o.y - cy - 10 + Math.sin(g.time * 2 + o.i * 2) * 3;
    glow(c, X, Y, 12, "rgba(120,230,255,.55)"); glow(c, X, Y, 4, "#ffffff");
  }
  for (const s of g.area.travel) {
    const k = 0.5 + 0.3 * Math.sin(g.time * 2.5);
    glow(c, s.x - cx, s.y - cy, 18, "rgba(200,240,255,.6)", k);
    for (let i = 0; i < 3; i++) { const yy = ((g.time * 30 + i * 12) % 36); glow(c, s.x - cx + (i - 1) * 5, s.y - cy - yy, 3, "rgba(220,250,255,.8)", 1 - yy / 36); }
  }
}

function wrap(c: C2, s: string, w: number) {
  const out: string[] = []; let line = "";
  for (const word of s.split(" ")) { const t = line ? line + " " + word : word; if (c.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
}
/** Story overlay: objective, talk hint, dialogue box, intro, flight transition. Drawn after render(). */
export function storyOverlay(c: C2, g: Game, s: Story, W: number, H: number) {
  c.save(); c.font = "8px monospace"; c.textBaseline = "top";
  if (s.credits > 0) { // dawn credits roll
    const t = CREDITS_T - s.credits, a = Math.min(1, t / 1.5);
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, `rgba(255,214,140,${a})`); gr.addColorStop(0.5, `rgba(200,150,170,${a})`); gr.addColorStop(1, `rgba(40,30,70,${a})`);
    c.fillStyle = gr; c.fillRect(0, 0, W, H); c.textAlign = "center";
    if (s.credits < 4) { c.globalAlpha = Math.min(1, (4 - s.credits) / 0.8); c.fillStyle = "#fff6dc"; c.font = "bold 16px monospace"; c.fillText("THE END", W / 2, H / 2 - 6); c.font = "8px monospace"; c.fillStyle = "#3a2440"; c.fillText("A Burning Bush Productions game", W / 2, H / 2 + 12); c.globalAlpha = 1; }
    CREDITS.forEach((l, i) => { const y = H + 10 + i * 14 - t * 16; if (y < -12 || y > H + 12) return; c.fillStyle = l.startsWith("#") ? "#fff6dc" : "#3a2440"; c.font = l.startsWith("#") ? "bold 10px monospace" : "8px monospace"; c.fillText(l.replace(/^#/, ""), W / 2, y); });
    c.font = "8px monospace"; c.fillStyle = "rgba(58,36,64,.8)"; c.fillText("(J / Start to skip)", W / 2, H - 10); c.restore(); return;
  }
  if (g.mode === "play" && !s.active) {
    const L = wrapText(c, s.objective(), W - 12); c.textAlign = "right"; hudText.objLines = L.length; // W18.1: wraps instead of running off the left edge
    L.forEach((o, i) => { const y = H - 10 - (L.length - 1 - i) * 10, w = c.measureText(o).width + 8; c.fillStyle = "rgba(10,8,20,.55)"; c.fillRect(W - w, y - 2, w, 10 + (i === L.length - 1 ? 2 : 0)); c.fillStyle = "#ffe9a8"; c.fillText(o, W - 4, y); });
    const n = s.near ? g.area.npcs.find((q) => q.id === s.near) : undefined; /* guard: near can be stale for one frame after an area change or a hide-until-flag NPC leaving */
    if (n) { const d = NPCS[g.area.id]?.[n.id]; const X = n.x - Math.round(Math.max(0, Math.min(48 * 16 - W, g.p.x - W / 2))), Y = n.y - Math.round(Math.max(0, Math.min(34 * 16 - H, g.p.y - 16 - H / 2))) - 36;
      if (d) { c.textAlign = "center"; c.fillStyle = "rgba(10,8,20,.75)"; const t = "Talk: " + d.name.split(" ")[0]; const w = c.measureText(t).width + 6; c.fillRect(X - w / 2, Y - 1, w, 10); c.fillStyle = "#9fe8ff"; c.fillText(t, X, Y); } }
  }
  if (s.box) {
    const b = s.box, txt = b.lines[b.i].slice(0, Math.floor(b.t * 60));
    c.fillStyle = "rgba(12,10,26,.92)"; c.fillRect(8, H - 62, W - 16, 54); c.strokeStyle = "#7ff0ff"; c.lineWidth = 1; c.strokeRect(8.5, H - 61.5, W - 17, 53);
    c.fillStyle = "#7ff0ff"; c.textAlign = "left"; c.fillText(b.who, 16, H - 57);
    c.fillStyle = "#f0ecff"; wrap(c, txt, W - 36).slice(0, 4).forEach((l, i) => c.fillText(l, 16, H - 45 + i * 10));
    if (b.t * 60 >= b.lines[b.i].length && (g.frame >> 4) & 1) { c.fillStyle = "#ffe9a8"; c.fillText("▼", W - 22, H - 18); }
  }
  if (s.intro >= 0) {
    c.fillStyle = "#06050c"; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { const x = (i * 97 + g.time * (6 + i % 4)) % W, y = (i * 53 + Math.sin(g.time + i) * 8) % H;
      const gr = c.createRadialGradient(x, y, 0, x, y, 8); gr.addColorStop(0, i % 3 ? "rgba(100,210,255,.55)" : "rgba(190,140,255,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(x - 8, y - 8, 16, 16); }
    const a = Math.min(1, s.introT * 2); c.globalAlpha = a; c.fillStyle = "#e8e4ff"; c.textAlign = "center"; c.font = "9px monospace";
    wrap(c, INTRO[s.intro] ?? "", W - 80).forEach((l, i, arr) => c.fillText(l, W / 2, H / 2 - arr.length * 6 + i * 12));
    c.globalAlpha = 1; c.font = "7px monospace"; c.fillStyle = "#8a86a8"; c.fillText("Melee: next · Pause: skip", W / 2, H - 16);
  }
  if (s.fly > 0) {
    flightMap(c, g, s, W, H);
  }
  c.restore();
}

/** Lens map of the current area: terrain, zone names, hearthstone, stones, NPCs, foes, hero. */
export function areaMap(c: C2, g: Game, ox: number, oy: number, s: number) {
  const a = g.area, M = 48;
  const col: Record<number, string> = { [T_WALL]: "#4c4560", [T_PLAZA]: "#6a6070", [T_WATER]: a.theme === "marsh" ? "#2a1e52" : a.theme === "ember" ? "#a03a14" : a.theme === "tide" ? "#125664" : "#1c2e58", [T_PATH]: "#5a4c3c", [T_BOARD]: "#7a5a3a", [T_MOSS]: "#2a3c2a", [T_HIDDEN]: a.theme === "marsh" ? "#2a1e52" : "#1c2e58", [T_WARD]: wardOpen ? "#26232e" : "#7ff0ff" };
  for (let y = 0; y < 34; y++) for (let x = 0; x < M; x++) { c.fillStyle = col[a.tiles[y * M + x]] ?? "#26232e"; c.fillRect(ox + x * s, oy + y * s, Math.ceil(s), Math.ceil(s)); }
  for (const p of a.props) { c.fillStyle = p.kind === "house" ? "#3c64c8" : p.kind === "tree" ? "#48b0c0" : "#8a8aa0"; c.fillRect(ox + (p.x / TILE) * s - 1.5, oy + (p.y / TILE) * s - 1.5, 3, 3); }
  c.font = "6px monospace"; c.textAlign = "center"; c.fillStyle = "rgba(255,240,200,.85)";
  for (const z of a.zones.slice(0, -1)) c.fillText(z.name, ox + ((z.x0 + z.x1 + 1) / 2) * s, oy + ((z.y0 + z.y1 + 1) / 2) * s);
  c.fillStyle = "#7ff0ff"; c.fillRect(ox + (a.pad.x / TILE) * s - 2, oy + (a.pad.y / TILE) * s - 2, 4, 4);
  for (const t of a.travel) { c.fillStyle = "#fff"; c.fillRect(ox + (t.x / TILE) * s - 2, oy + (t.y / TILE) * s - 2, 4, 4); }
  for (const o of a.orbs) if (!st?.flags[`orb_${a.id}_${o.i}`]) { c.fillStyle = "#c8f8ff"; c.fillRect(ox + (o.x / TILE) * s - 1, oy + (o.y / TILE) * s - 1, 2, 2); }
  for (const n of a.npcs) { c.fillStyle = "#6aff8a"; c.fillRect(ox + (n.x / TILE) * s - 1.5, oy + (n.y / TILE) * s - 1.5, 3, 3); }
  for (const e of g.enemies) if (!e.dead) { c.fillStyle = "#ff4a4a"; c.fillRect(ox + (e.x / TILE) * s - 1, oy + (e.y / TILE) * s - 1, 2, 2); }
  c.fillStyle = g.frame & 16 ? "#fff" : "#ffd04a"; c.fillRect(ox + (g.p.x / TILE) * s - 2, oy + (g.p.y / TILE) * s - 2, 4, 4);
}

/** World-map flight screen: the Mirrorfen Reaches, a dotted route and the hero's glow riding the updraft. */
const SPOTS: Record<string, { x: number; y: number; name: string }> = {
  lanternmoss: { x: 0.28, y: 0.58, name: "Lanternmoss Hollow" }, hushwater: { x: 0.7, y: 0.38, name: "Hushwater" }, kilnreach: { x: 0.86, y: 0.72, name: "Kilnreach" }, emberquarry: { x: 0.9, y: 0.84, name: "Emberheart Quarry" }, drowned: { x: 0.52, y: 0.16, name: "Drowned Vesper" }, undertide: { x: 0.56, y: 0.22, name: "The Undertide" }, stair: { x: 0.5, y: 0.05, name: "Sunwarden's Stair" }, husk: { x: 0.62, y: 0.03, name: "The Husk Sun" },
};
const LOCKED = [{ x: 0.3, y: 0.8, name: "Wellspring Grotto" }];
function flightMap(c: C2, g: Game, s: Story, W: number, H: number) {
  const glow = (c: C2, x: number, y: number, r: number, col: string) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const T = 3.2, t = T - s.fly, a = Math.max(0, Math.min(1, t / 0.4, s.fly / 0.4));
  const p = Math.max(0, Math.min(1, (t - 0.5) / 2.0)), e = p * p * (3 - 2 * p);
  c.globalAlpha = a; c.fillStyle = "#0a0e22"; c.fillRect(0, 0, W, H);
  // parchment-dark land masses
  c.fillStyle = "#1a2a2a"; c.beginPath(); c.ellipse(W * 0.3, H * 0.62, W * 0.2, H * 0.3, 0.2, 0, 7); c.fill();
  c.fillStyle = "#221a38"; c.beginPath(); c.ellipse(W * 0.7, H * 0.42, W * 0.2, H * 0.28, -0.3, 0, 7); c.fill();
  c.fillStyle = "#16202e"; c.beginPath(); c.ellipse(W * 0.52, H * 0.18, W * 0.12, H * 0.1, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(W * 0.86, H * 0.75, W * 0.1, H * 0.12, 0, 0, 7); c.fill();
  for (let i = 0; i < 24; i++) { c.fillStyle = "rgba(160,200,255,.15)"; c.fillRect((i * 83 + t * 30) % W, (i * 41) % H, 6, 1); }
  c.font = "7px monospace"; c.textAlign = "center"; c.textBaseline = "top";
  for (const l of LOCKED) { c.fillStyle = "#4a4860"; c.fillRect(W * l.x - 2, H * l.y - 2, 4, 4); c.fillStyle = "#6a6888"; c.fillText(l.name, W * l.x, H * l.y + 4); }
  const A = SPOTS[s.flyFrom] ?? SPOTS.lanternmoss, B = SPOTS[s.flyTo || g.area.id] ?? SPOTS.hushwater;
  const ax = W * A.x, ay = H * A.y, bx = W * B.x, by = H * B.y, mx = (ax + bx) / 2, my = Math.min(ay, by) - 40;
  c.strokeStyle = "rgba(255,233,168,.6)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, bx, by); c.stroke(); c.setLineDash([]);
  for (const sp of [A, B]) { c.fillStyle = "#7ff0ff"; c.fillRect(W * sp.x - 2, H * sp.y - 2, 5, 5); c.fillStyle = "#e8f8ff"; c.fillText(sp.name, W * sp.x, H * sp.y + 5); }
  const u = 1 - e, hx = u * u * ax + 2 * u * e * mx + e * e * bx, hy = u * u * ay + 2 * u * e * my + e * e * by;
  glow(c, hx, hy, 14, "rgba(120,230,255,.6)"); glow(c, hx, hy, 4, "#ffffff");
  c.fillStyle = "#ffe9a8"; c.font = "8px monospace"; c.fillText("THE MIRRORFEN REACHES", W / 2, 8);
  c.fillStyle = "#c8c4e8"; c.fillText(`Riding the updraft to ${B.name}...`, W / 2, H - 16);
  c.globalAlpha = 1;
}
