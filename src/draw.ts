/** Rendering: placeholder tiles, hero/foes, Gravewake light layer (multiply) + additive ki glow, HUD and menus. */
import { Game, Enemy, expNext } from "./game";
import { TILE, MW, MH, T_WALL, T_MOSS, T_PLAZA } from "./world";
import { lightSprite, flickerStep, rgbCss, RGB } from "./vendor/light";
import { buildAtlas, ATLAS_CELL, maskSize } from "./vendor/particles";

export const W = 384, H = 216;
const AMBIENT: RGB = [0.2, 0.17, 0.3];
let light: HTMLCanvasElement, lctx: CanvasRenderingContext2D, atlas: HTMLCanvasElement | null = null;

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
  c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
}
function addLight(x: number, y: number, r: number, col: RGB, flick: number) {
  const sx = Math.round(x - r), sy = Math.round(y - r);
  const s = lightSprite(r, col, flick, sx, sy);
  if (s) lctx.drawImage(s, sx, sy);
}

/** The hero, ~24x32, feet at (x,y). Spiky hair, short jacket over a shirt, belt at the waist, pants, boots. */
function hero(c: CanvasRenderingContext2D, g: Game, x: number, y: number) {
  const p = g.p, side = Math.abs(p.fx) > 0.5, back = p.fy < -0.5 && !side, flip = p.fx < -0.3;
  const step = p.moving ? Math.round(Math.sin(p.walk)) : 0;
  const L = Math.round(x) - 12, T = Math.round(y) - 32;
  c.save();
  if (flip) { c.translate(L * 2 + 24, 0); c.scale(-1, 1); }
  const r = (cx: number, cy: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(L + cx, T + cy, w, h); };
  // shadow
  c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(L + 12, T + 31, 8, 2.5, 0, 0, 7); c.fill();
  // boots + legs (pants): two separate legs
  const lA = side ? step : step, lB = -lA;
  r(7, 23 + Math.max(0, lA), 4, 6 - Math.max(0, lA), "#2c3a6e"); r(13, 23 + Math.max(0, lB), 4, 6 - Math.max(0, lB), "#2c3a6e");
  r(7, 22, 10, 3, "#33447e"); // hips
  r(6, 29, 5, 2, "#1a1410"); r(13, 29, 5, 2, "#1a1410");
  // belt = visible waist (narrower than shoulders)
  r(7, 20, 10, 2, "#5a3a1c"); r(11, 20, 2, 2, "#e0b84a");
  // torso: shirt then open short jacket, shoulders wider than waist
  r(6, 13, 12, 7, back ? "#b2332e" : "#e9e2d0");
  if (!back) { r(5, 13, 4, 8, "#b2332e"); r(15, 13, 4, 8, "#b2332e"); r(9, 13, 6, 1, "#7c1f1c"); }
  r(4, 13, 16, 2, "#c43c34"); // shoulders
  // arms (skin) + wristbands; punching arm reaches forward
  const punch = g.swing.step > 0 && g.swing.t < 0.16;
  if (side) {
    r(10, 15, 3, 5, "#d9a37a");
    if (punch) { r(12, 15, 9, 3, "#d9a37a"); r(20, 14, 3, 4, "#f0e6d8"); } else r(10, 20, 3, 2, "#3a6fd0");
  } else {
    r(2, 14, 3, 7, "#d9a37a"); r(19, 14, 3, 7, "#d9a37a"); r(2, 19, 3, 2, "#3a6fd0"); r(19, 19, 3, 2, "#3a6fd0");
    if (punch) r(p.fy > 0 ? 18 : 2, p.fy > 0 ? 21 : 9, 4, 4, "#f0e6d8");
  }
  // head
  r(8, 5, 8, 8, "#e2ad84"); r(10, 12, 4, 1, "#c48d66");
  if (!back) { if (side) r(13, 8, 2, 2, "#101018"); else { r(9, 8, 2, 2, "#101018"); r(13, 8, 2, 2, "#101018"); } }
  // spiky hair (dark teal) — original silhouette: swept back, three spikes
  c.fillStyle = "#1d3b48";
  c.beginPath(); c.moveTo(L + 7, T + 8); c.lineTo(L + 5, T + 1); c.lineTo(L + 10, T + 4); c.lineTo(L + 12, T - 1); c.lineTo(L + 14, T + 4);
  c.lineTo(L + 19, T + 1); c.lineTo(L + 17, T + 8); c.lineTo(L + 16, T + 5); c.lineTo(L + 8, T + 5); c.closePath(); c.fill();
  if (back) r(8, 5, 8, 6, "#1d3b48");
  c.restore();
}

function foe(c: CanvasRenderingContext2D, e: Enemy, x: number, y: number, t: number) {
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(x, y, 8, 2.5, 0, 0, 7); c.fill();
  const f = e.flash > 0;
  if (e.kind === "brute") {
    const sq = e.state === "tele" ? 2 : 0;
    c.fillStyle = f ? "#fff" : "#4f5a46"; c.fillRect(x - 9, y - 18 + sq, 18, 17 - sq);
    c.fillStyle = f ? "#fff" : "#6b7a5c"; c.fillRect(x - 7, y - 21 + sq, 14, 5);
    c.fillStyle = "#2e3428"; c.fillRect(x - 10, y - 4, 5, 4); c.fillRect(x + 5, y - 4, 5, 4);
  } else {
    const bob = Math.sin(t * 4 + e.hx) * 2;
    c.fillStyle = f ? "#fff" : "#4a2e6e"; c.beginPath(); c.arc(x, y - 16 + bob, 7, 0, 7); c.fill();
    c.fillStyle = f ? "#fff" : "#352050"; c.beginPath(); c.moveTo(x - 5, y - 13 + bob); c.lineTo(x, y - 3 + bob); c.lineTo(x + 5, y - 13 + bob); c.fill();
  }
}

export function render(c: CanvasRenderingContext2D, g: Game) {
  if (!light) { light = document.createElement("canvas"); light.width = W; light.height = H; lctx = light.getContext("2d")!; atlas = buildAtlas(); }
  const p = g.p;
  const shx = g.shake ? (Math.random() - 0.5) * g.shake : 0, shy = g.shake ? (Math.random() - 0.5) * g.shake : 0;
  const cx = Math.round(Math.max(0, Math.min(MW * TILE - W, p.x - W / 2)) + shx), cy = Math.round(Math.max(0, Math.min(MH * TILE - H, p.y - 16 - H / 2)) + shy);
  c.imageSmoothingEnabled = false;
  c.fillStyle = "#0d0b14"; c.fillRect(0, 0, W, H);
  // tiles
  const a = g.area;
  for (let ty = Math.floor(cy / TILE); ty <= Math.floor((cy + H) / TILE); ty++) for (let tx = Math.floor(cx / TILE); tx <= Math.floor((cx + W) / TILE); tx++) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
    const v = a.tiles[ty * MW + tx], X = tx * TILE - cx, Y = ty * TILE - cy, ch = (tx + ty) & 1;
    if (v === T_WALL) { c.fillStyle = "#3a3448"; c.fillRect(X, Y, TILE, TILE); c.fillStyle = "#4c4560"; c.fillRect(X, Y, TILE, 4); c.fillStyle = "#231f2e"; c.fillRect(X, Y + 13, TILE, 3); }
    else if (v === T_PLAZA) { c.fillStyle = ch ? "#5a5260" : "#544c5a"; c.fillRect(X, Y, TILE, TILE); c.fillStyle = "#463f4c"; c.fillRect(X, Y, TILE, 1); c.fillRect(X, Y, 1, TILE); }
    else { c.fillStyle = v === T_MOSS ? (ch ? "#33452f" : "#2f402b") : ch ? "#3d3a46" : "#383542"; c.fillRect(X, Y, TILE, TILE); }
  }
  // save pad
  const padX = a.pad.x - cx, padY = a.pad.y - cy;
  c.fillStyle = "#24515a"; c.beginPath(); c.ellipse(padX, padY, 14, 7, 0, 0, 7); c.fill();
  c.strokeStyle = "#7ff0ff"; c.lineWidth = 1; c.beginPath(); c.ellipse(padX, padY, 11, 5, 0, 0, 7); c.stroke();
  // lamp posts
  for (const l of a.lamps) { const X = l.x - cx, Y = l.y - cy; c.fillStyle = "#2a2433"; c.fillRect(X - 3, Y - 6, 6, 10); c.fillStyle = rgbCss(l.c); c.fillRect(X - 2, Y - 10, 4, 4); }
  // entities sorted by y
  const list: { y: number; d: () => void }[] = [];
  for (const e of g.enemies) if (!e.dead) list.push({ y: e.y, d: () => foe(c, e, e.x - cx, e.y - cy, g.time) });
  list.push({ y: p.y, d: () => { if (p.inv > 0 && g.frame % 6 < 3) return; hero(c, g, p.x - cx, p.y - cy); } });
  list.sort((m, n) => m.y - n.y).forEach((o) => o.d());
  // light layer (Gravewake light.ts): ambient + banded light sprites, multiplied over the world
  lctx.globalCompositeOperation = "source-over"; lctx.fillStyle = rgbCss(AMBIENT); lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = "lighter";
  for (const l of a.lamps) addLight(l.x - cx, l.y - cy, 80, l.c, flickerStep(g.frame, l.seed));
  addLight(padX, padY, 48, [0.35, 0.85, 0.95], flickerStep(g.frame, 9));
  addLight(p.x - cx, p.y - cy - 14, 48, g.shield ? [0.4, 0.8, 1] : [0.5, 0.48, 0.6], 0);
  for (const s of g.shots) addLight(s.x - cx, s.y - cy, 32, s.foe ? [0.8, 0.3, 0.9] : [0.4, 0.85, 1], 0);
  for (const e of g.enemies) if (!e.dead && e.kind === "wisp" && e.state === "tele") addLight(e.x - cx, e.y - cy - 16, 32, [0.8, 0.3, 0.9], 0);
  c.globalCompositeOperation = "multiply"; c.drawImage(light, 0, 0); c.globalCompositeOperation = "source-over";
  // emissives: additive (lighter)
  c.globalCompositeOperation = "lighter";
  for (const l of a.lamps) glow(c, l.x - cx, l.y - cy - 8, 10, rgbCss(l.c, 0.8));
  glow(c, padX, padY, 16, "rgba(90,220,255,.5)", 0.6 + 0.3 * Math.sin(g.time * 3));
  for (const e of g.enemies) if (!e.dead) {
    const X = e.x - cx, Y = e.y - cy;
    if (e.kind === "brute") { c.fillStyle = e.state === "tele" ? "#ffdd55" : "#ff3030"; c.fillRect(X - 5, Y - 15, 3, 2); c.fillRect(X + 2, Y - 15, 3, 2); }
    else glow(c, X, Y - 16, e.state === "tele" ? 6 + (0.7 - e.t) * 18 : 6, "rgba(220,90,255,.9)");
  }
  for (const s of g.shots) {
    const X = s.x - cx, Y = s.y - cy;
    if (s.foe) { glow(c, X, Y, 10, "rgba(230,80,255,.9)"); c.fillStyle = "#ffd0ff"; c.fillRect(X - 1.5, Y - 1.5, 3, 3); }
    else { glow(c, X - s.vx * 0.03, Y - s.vy * 0.03, 9, "rgba(60,160,255,.6)"); glow(c, X, Y, 13, "rgba(80,200,255,.95)"); glow(c, X, Y, 5, "#ffffff"); }
  }
  if (g.shield) { const r = 20 + Math.sin(g.time * 20); c.strokeStyle = "rgba(120,220,255,.9)"; c.lineWidth = 2; c.beginPath(); c.arc(p.x - cx, p.y - cy - 14, r, 0, 7); c.stroke(); glow(c, p.x - cx, p.y - cy - 14, r + 4, "rgba(60,150,255,.35)"); }
  if (g.levelT > 0) glow(c, p.x - cx, p.y - cy - 16, 30 + (2.5 - g.levelT) * 20, "rgba(255,220,120,.7)", Math.min(1, g.levelT));
  c.globalCompositeOperation = "source-over";
  // telegraphs (drawn over light so they always read)
  for (const e of g.enemies) if (!e.dead && e.state === "tele") {
    const X = Math.round(e.x - cx), Y = Math.round(e.y - cy);
    c.fillStyle = (g.frame >> 2) & 1 ? "#ffef6a" : "#ff5a3a"; c.fillRect(X - 1, Y - 34, 3, 7); c.fillRect(X - 1, Y - 25, 3, 2);
    if (e.kind === "brute") { c.strokeStyle = "rgba(255,80,60,.8)"; c.lineWidth = 2; c.beginPath(); c.moveTo(X, Y - 4); c.lineTo(X + e.ax * 40, Y - 4 + e.ay * 40); c.stroke(); }
  }
  // block pose marker
  if (g.blocking && !g.shield) { c.strokeStyle = "#cfd8ff"; c.lineWidth = 2; c.beginPath(); c.arc(p.x - cx + p.fx * 8, p.y - cy - 14 + p.fy * 6, 9, Math.atan2(p.fy, p.fx) - 1, Math.atan2(p.fy, p.fx) + 1); c.stroke(); }
  // particles (Gravewake pool + atlas)
  if (atlas) {
    const P = g.parts;
    for (let i = 0; i < P.size; i++) {
      if (P.life[i] <= 0) continue;
      const fr = P.frameOf(i), [mw, mh] = maskSize(P.kind[i], fr);
      c.drawImage(atlas, (P.kind[i] * 2 + fr) * ATLAS_CELL, P.color[i] * ATLAS_CELL, mw, mh, Math.round(P.x[i] - cx - mw / 2), Math.round(P.y[i] - cy - mh / 2), mw, mh);
    }
  }
  // damage numbers
  c.textAlign = "center";
  for (const n of g.nums) {
    c.font = n.big ? "bold 12px monospace" : "bold 9px monospace";
    const X = Math.round(n.x - cx), Y = Math.round(n.y - cy);
    c.fillStyle = "#000"; c.fillText(n.txt, X + 1, Y + 1); c.fillStyle = n.col; c.fillText(n.big ? n.txt + "!" : n.txt, X, Y);
  }
  hud(c, g);
  if (g.mode === "pause") pauseMenu(c, g);
  if (g.mode === "map") mapView(c, g);
}

function bar(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, v: number, col: string, back = "#1a1424") {
  c.fillStyle = "#000"; c.fillRect(x - 1, y - 1, w + 2, h + 2); c.fillStyle = back; c.fillRect(x, y, w, h);
  c.fillStyle = col; c.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, v))), h);
  c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, v))), 1);
}
function hud(c: CanvasRenderingContext2D, g: Game) {
  // technique icon
  c.fillStyle = "#000a"; c.fillRect(4, 4, 22, 22); c.strokeStyle = "#8a7cff"; c.lineWidth = 1; c.strokeRect(4.5, 4.5, 21, 21);
  c.globalCompositeOperation = "lighter"; glow(c, 15, 15, 9, "rgba(80,200,255,.95)"); glow(c, 15, 15, 3, "#fff"); c.globalCompositeOperation = "source-over";
  c.font = "bold 8px monospace"; c.textAlign = "left";
  c.fillStyle = "#fff"; c.fillText(`Lv${g.lvl}`, 30, 11);
  bar(c, 52, 5, 90, 6, g.hp / g.maxHp, "#46d66a"); c.fillStyle = "#cfe"; c.fillText("HP", 146, 11);
  bar(c, 52, 14, 90, 4, g.ep / g.maxEp, "#3aa8ff"); c.fillStyle = "#cfe"; c.fillText("EP", 146, 19);
  bar(c, 30, 22, 112, 2, g.exp / expNext(g.lvl), "#ffd04a");
  // transform meter placeholder
  bar(c, 4, 30, 22, 3, g.tf / 100, g.tf >= 100 ? (g.frame & 8 ? "#ff7aff" : "#c060ff") : "#9050d0");
  c.font = "6px monospace"; c.fillStyle = "#c9b"; c.fillText(g.tf >= 100 ? "TF RDY" : "TF", 4, 40);
  if (g.pts > 0) { c.font = "bold 7px monospace"; c.fillStyle = g.frame & 16 ? "#ffd04a" : "#fff"; c.fillText(`+${g.pts} pts`, 160, 11); }
  c.textAlign = "center";
  if (g.bannerT > 0) {
    c.globalAlpha = Math.min(1, g.bannerT); c.fillStyle = "#000a"; c.fillRect(W / 2 - 80, 40, 160, 18);
    c.font = "bold 10px monospace"; c.fillStyle = "#e8dcff"; c.fillText(g.banner, W / 2, 53); c.globalAlpha = 1;
  }
  if (g.toastT > 0) { c.font = "8px monospace"; const w = c.measureText(g.toast).width + 12; c.fillStyle = "#000c"; c.fillRect(W / 2 - w / 2, H - 22, w, 13); c.fillStyle = "#fff"; c.fillText(g.toast, W / 2, H - 12); }
  if (g.levelT > 0) { c.font = "bold 14px monospace"; c.fillStyle = "#ffe14a"; c.fillText("LEVEL UP!", W / 2, 80); }
}
export const MENU_ROWS = { x: 120, y: 78, h: 18, w: 144 };
function pauseMenu(c: CanvasRenderingContext2D, g: Game) {
  c.fillStyle = "rgba(6,4,12,.82)"; c.fillRect(0, 0, W, H);
  c.textAlign = "center"; c.font = "bold 12px monospace"; c.fillStyle = "#cfe8ff"; c.fillText("STATUS", W / 2, 24);
  c.font = "8px monospace"; c.fillStyle = "#b8b0d0";
  c.fillText(`Lv ${g.lvl}   HP ${Math.ceil(g.hp)}/${g.maxHp}   EP ${Math.floor(g.ep)}/${g.maxEp}   EXP ${g.exp}/${expNext(g.lvl)}`, W / 2, 40);
  c.fillStyle = g.pts ? "#ffd04a" : "#8a84a0"; c.fillText(`Points to spend: ${g.pts}`, W / 2, 56);
  const rows = [["STR", g.str, "melee power"], ["POW", g.pow, "ki blast power, max EP"], ["END", g.end, "defense, max HP"], ["Resume", "", ""]] as const;
  const R = MENU_ROWS;
  rows.forEach((row, i) => {
    const y = R.y + i * R.h, sel = g.menuSel === i;
    c.fillStyle = sel ? "#3a2c70" : "#1c1630"; c.fillRect(R.x, y, R.w, R.h - 3);
    if (sel) { c.strokeStyle = "#ffd76a"; c.strokeRect(R.x + 0.5, y + 0.5, R.w - 1, R.h - 4); }
    c.textAlign = "left"; c.fillStyle = "#fff"; c.font = "bold 9px monospace"; c.fillText(String(row[0]), R.x + 6, y + 11);
    if (i < 3) { c.fillText(String(row[1]), R.x + 44, y + 11); c.font = "6px monospace"; c.fillStyle = "#a9a0c8"; c.fillText(String(row[2]), R.x + 62, y + 11); c.textAlign = "right"; c.fillStyle = g.pts ? "#ffd04a" : "#555"; c.font = "bold 9px monospace"; c.fillText("+", R.x + R.w - 6, y + 11); }
  });
  c.textAlign = "center"; c.font = "6px monospace"; c.fillStyle = "#8a84a0";
  c.fillText("W/S or stick to move · J / A / tap to add · Esc / Start to close", W / 2, H - 14);
  c.fillText("Inventory · Equip · Options · Journal tabs arrive in a later chunk", W / 2, H - 6);
}
function mapView(c: CanvasRenderingContext2D, g: Game) {
  c.fillStyle = "rgba(6,4,12,.88)"; c.fillRect(0, 0, W, H);
  const s = 3, ox = Math.round(W / 2 - (MW * s) / 2), oy = 30;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const v = g.area.tiles[y * MW + x]; c.fillStyle = v === T_WALL ? "#4c4560" : v === T_PLAZA ? "#6a6070" : "#26232e"; c.fillRect(ox + x * s, oy + y * s, s, s); }
  c.fillStyle = "#7ff0ff"; c.fillRect(ox + (g.area.pad.x / TILE) * s - 2, oy + (g.area.pad.y / TILE) * s - 2, 4, 4);
  for (const e of g.enemies) if (!e.dead) { c.fillStyle = "#ff4a4a"; c.fillRect(ox + (e.x / TILE) * s - 1, oy + (e.y / TILE) * s - 1, 2, 2); }
  c.fillStyle = g.frame & 16 ? "#fff" : "#ffd04a"; c.fillRect(ox + (g.p.x / TILE) * s - 2, oy + (g.p.y / TILE) * s - 2, 4, 4);
  c.textAlign = "center"; c.font = "bold 10px monospace"; c.fillStyle = "#cfe8ff"; c.fillText(`SCANNER · ${g.area.name}`, W / 2, 20);
  c.font = "6px monospace"; c.fillStyle = "#8a84a0"; c.fillText("Map stub: world map, scans and radar come later · M / Select to close", W / 2, H - 8);
}
