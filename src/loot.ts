/**
 * HD2D W14: loot. Coins, consumables (Glowcap Morsel / Kindleberry / Wellspring Tear), random mob gear drops,
 * quick-heal (H / pad RT / touch "heal" button; G / pad LT or a 0.5 s hold = Kindleberry) and the revive prompt.
 * Game owns the state (g.items, g.coins, g.have); this file holds the rules so combat files stay untouched.
 */
import type { Game } from "./game";
import { GEAR, gearById, drawGearIcon } from "./gear";

export type ItemId = "morsel" | "berry" | "tear";
export const ITEMS: Record<ItemId, { name: string; max: number; price: number; drop: number; desc: string; col: string }> = {
  morsel: { name: "Glowcap Morsel", max: 9, price: 20, drop: 0.10, desc: "A warm bite of glowcap. Heals 35% HP.", col: "#7ce0ff" },
  berry: { name: "Kindleberry", max: 3, price: 120, drop: 0.02, desc: "Rare and sun-sweet. Full health, full Kindle gauge.", col: "#ff9a3c" },
  tear: { name: "Wellspring Tear", max: 2, price: 300, drop: 0.01, desc: "One drop of living spring. Calls a fallen hero back.", col: "#8ab8ff" },
};
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const MOB_GEAR = ["h1", "a1", "w1", "f1", "c1"], GEAR_DROP = 0.03, DUPE_COINS = 5, USE_CD = 1;
export const newItems = () => ({ morsel: 0, berry: 0, tear: 0 } as Record<ItemId, number>);

/** Seedable RNG (tests: __kiLoot.seed(n) or __kiLoot.force = {...}). */
let seed = 0;
export const rng = { next: () => { if (!seed) return Math.random(); seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; } };
export const debug = { force: null as null | { gear?: string; item?: ItemId; coins?: number } };

export function addItem(g: Game, id: ItemId, n = 1) {
  const before = g.items[id]; g.items[id] = Math.min(ITEMS[id].max, before + n);
  return g.items[id] - before;
}
export interface Drop { x: number; y: number; kind: "gear" | "item"; id: string; t: number }
/** Non-boss kill: coins, one gear roll (3%), consumable rolls. Bosses: coins + 1 Kindleberry + 1 Tear. */
export function rollKill(g: Game, x: number, y: number, boss: boolean) {
  const f = debug.force; debug.force = null;
  g.coins += f?.coins ?? (boss ? 50 : 1 + Math.floor(rng.next() * 3));
  if (boss) { addItem(g, "berry"); addItem(g, "tear"); g.say("Boss spoils: Kindleberry + Wellspring Tear", 2.5); return; }
  const gid0 = f ? f.gear : rng.next() < GEAR_DROP ? MOB_GEAR[Math.floor(rng.next() * MOB_GEAR.length)] : undefined;
  const gid = gid0 && gearById(gid0)?.src !== "B" ? gid0 : undefined; // MB hook (W17): boss-unique gear (e.g. c7 Stillwater Charm) never drops as loot
  if (gid) g.drops.push({ x, y, kind: "gear", id: gid, t: 30 });
  const r = rng.next();
  const it: ItemId | undefined = f ? f.item : r < ITEMS.tear.drop ? "tear" : r < ITEMS.tear.drop + ITEMS.berry.drop ? "berry" : r < ITEMS.tear.drop + ITEMS.berry.drop + ITEMS.morsel.drop ? "morsel" : undefined;
  if (it) g.drops.push({ x: x + 8, y, kind: "item", id: it, t: 30 });
}
export function pickup(g: Game, d: Drop) {
  if (d.kind === "gear") {
    const it = gearById(d.id)!;
    if (g.have.includes(d.id)) { g.coins += DUPE_COINS; g.say(`Found: ${it.name} (have it: +${DUPE_COINS} coins)`, 2); }
    else { g.have.push(d.id); g.say(`Found: ${it.name}`, 2.2); }
  } else {
    const id = d.id as ItemId;
    if (addItem(g, id)) g.say(`Found: ${ITEMS[id].name}`, 1.8); else { g.coins += 2; g.say(`${ITEMS[id].name} pocket full (+2 coins)`, 1.8); }
  }
}
export function updateDrops(g: Game, dt: number) {
  g.useCd = Math.max(0, g.useCd - dt); g.stunT = Math.max(0, g.stunT - dt);
  for (const d of g.drops) { d.t -= dt; if (Math.hypot(d.x - g.p.x, d.y - g.p.y) < 14) { d.t = -1; pickup(g, d); } }
  g.drops = g.drops.filter((d) => d.t > 0);
}
/** Use an item. Returns "" on success or the reason it failed. */
export function useItem(g: Game, id: ItemId): string {
  if (!g.items[id]) return "none";
  if (id === "tear") return "auto";
  if (g.useCd > 0) return "cooldown";
  if (g.stunT > 0) return "stunned";
  g.items[id]--; g.useCd = USE_CD;
  if (id === "morsel") g.hp = Math.min(g.maxHp, g.hp + g.maxHp * 0.35);
  else { g.hp = g.maxHp; g.ep = g.maxEp; if (!g.mb.tfOn) g.tf = 100; }
  g.say(`${ITEMS[id].name}!`, 1.2); g.num(g.p.x, g.p.y - 40, 0, "#7cff9a");
  return "";
}
/** Quick heal: morsel, else berry. `strong` (G / LT / hold) = berry. */
export function quickHeal(g: Game, strong = false) {
  const id: ItemId = strong || !g.items.morsel ? "berry" : "morsel";
  const r = useItem(g, id);
  if (r === "none") g.say("No healing items", 1);
  return r;
}
let holdT = 0, held = false;
/** Per-frame input for quick use (play mode only). */
export function quickInput(g: Game, dt: number) {
  const i = g.input;
  if (i.pressed("berry")) { quickHeal(g, true); return; }
  if (i.isHeld("heal")) { holdT += dt; if (holdT >= 0.5 && !held) { held = true; quickHeal(g, true); } }
  else { if (holdT > 0 && !held) quickHeal(g, false); holdT = 0; held = false; }
}

// --- revive prompt (mode "revive": the world is frozen until the player answers) ---
export const revive = { sel: 0, lastY: 0 };
export function reviveStep(g: Game) {
  const i = g.input, vy = i.my > 0.5 || i.mx > 0.5 ? 1 : i.my < -0.5 || i.mx < -0.5 ? -1 : 0;
  if ((vy && vy !== revive.lastY) || i.pressed("down") || i.pressed("up") || i.tapY || i.tapX) revive.sel = revive.sel ? 0 : 1;
  revive.lastY = vy;
  if (i.pressed("melee") || i.pressed("confirm")) answer(g, revive.sel === 0);
  else if (i.pressed("blast")) answer(g, false);
}
export function answer(g: Game, yes: boolean) {
  g.mode = "play";
  if (yes && g.items.tear > 0) { g.items.tear--; g.hp = Math.ceil(g.maxHp * 0.5); g.p.inv = 2; g.say("The Wellspring answers.", 2.5); }
  else g.faint();
}
export const REV_BOX = { x: 92, y: 70, w: 200, h: 76 };
export function reviveTap(g: Game, x: number, y: number) {
  const B = REV_BOX; if (x < B.x || x > B.x + B.w) return;
  if (y >= B.y + 34 && y < B.y + 50) answer(g, true); else if (y >= B.y + 52 && y < B.y + 68) answer(g, false);
}
export function drawRevive(c: CanvasRenderingContext2D, g: Game) {
  const B = REV_BOX; c.fillStyle = "rgba(6,4,12,.6)"; c.fillRect(0, 0, 384, 216);
  c.fillStyle = "#16112a"; c.fillRect(B.x, B.y, B.w, B.h); c.strokeStyle = "#8ab8ff"; c.strokeRect(B.x + 0.5, B.y + 0.5, B.w - 1, B.h - 1);
  c.textAlign = "center"; c.font = "bold 9px monospace"; c.fillStyle = "#cfe8ff"; c.fillText("Use Wellspring Tear?", B.x + B.w / 2, B.y + 14);
  c.font = "7px monospace"; c.fillStyle = "#8a84a0"; c.fillText(`The spring remembers you. Rise?  (${g.items.tear} carried)`, B.x + B.w / 2, B.y + 26);
  ["Yes (revive at 50% HP, 2 s invulnerable)", "No (wake at the last spring)"].forEach((t, i) => {
    const y = B.y + 34 + i * 18, on = revive.sel === i;
    c.fillStyle = on ? "#3a2c70" : "#1c1630"; c.fillRect(B.x + 6, y, B.w - 12, 16);
    c.fillStyle = on ? "#ffd76a" : "#b8b0d0"; c.font = on ? "bold 7px monospace" : "7px monospace"; c.fillText(t, B.x + B.w / 2, y + 11);
  });
}
const img = (f: string) => { if (typeof Image === "undefined") return null; const i = new Image(); i.src = import.meta.env.BASE_URL + "icons/" + f; return i; };
let cons: HTMLImageElement | null = null, spark: HTMLImageElement | null = null;
const CONS_X: Record<ItemId, number> = { morsel: 0, berry: 16, tear: 32 }; // Art consumables.json
const ok = (i: HTMLImageElement | null) => !!i && i.complete && i.naturalWidth > 0;
/** Art's consumables.png; drawn placeholder until it loads. */
export function drawItemIcon(c: CanvasRenderingContext2D, id: ItemId, x: number, y: number) {
  cons ??= img("consumables.png");
  if (ok(cons)) { c.drawImage(cons!, CONS_X[id], 0, 16, 16, Math.round(x), Math.round(y), 16, 16); return; }
  const col = ITEMS[id].col; c.fillStyle = "#120e1c";
  if (id === "morsel") { c.fillRect(x + 2, y + 3, 10, 5); c.fillStyle = col; c.fillRect(x + 3, y + 4, 8, 3); c.fillStyle = "#e8e0c8"; c.fillRect(x + 6, y + 7, 2, 4); }
  else if (id === "berry") { c.fillRect(x + 3, y + 3, 8, 8); c.fillStyle = col; c.fillRect(x + 4, y + 4, 6, 6); c.fillStyle = "#ffe070"; c.fillRect(x + 6, y + 6, 2, 2); }
  else { c.fillRect(x + 5, y + 1, 4, 11); c.fillRect(x + 4, y + 5, 6, 7); c.fillStyle = col; c.fillRect(x + 6, y + 2, 2, 3); c.fillRect(x + 5, y + 6, 4, 5); }
}
/** HUD counts under the HP bar + world pickups. */
export function drawLootHud(c: CanvasRenderingContext2D, g: Game, x = 8, y = 30) {
  c.textAlign = "left"; c.font = "7px monospace";
  ITEM_IDS.forEach((id, i) => { drawItemIcon(c, id, x + i * 26, y - 9); c.fillStyle = "#e8e0ff"; c.fillText(String(g.items[id]), x + i * 26 + 14, y); });
  c.fillStyle = "#ffd76a"; c.fillText(`${g.coins}c`, x + 80, y);
  const b = document.getElementById("healBtn"); if (b) b.dataset.n = String(g.items.morsel + g.items.berry);
}
export function drawDrops(c: CanvasRenderingContext2D, g: Game, cx: number, cy: number) {
  for (const d of g.drops) {
    const X = Math.round(d.x - cx), Y = Math.round(d.y - cy - 6 + Math.sin(g.time * 4 + d.x) * 2);
    c.fillStyle = d.kind === "gear" ? "rgba(255,215,106,.35)" : "rgba(124,224,255,.35)"; c.fillRect(X - 6, Y - 6, 12, 12);
    c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(X - 5, Math.round(d.y - cy), 10, 2);
    if (d.kind === "item") drawItemIcon(c, d.id as ItemId, X - 8, Y - 8); else if (!drawGearIcon(c, gearById(d.id), X - 8, Y - 8)) { c.fillStyle = "#ffd76a"; c.fillRect(X - 3, Y - 3, 6, 6); }
    spark ??= img("pickup.png"); // Art pickup.png: 4 frames 12x12, 160 ms
    if (ok(spark)) c.drawImage(spark!, (Math.floor(g.time / 0.16) % 4) * 12, 0, 12, 12, X - 6, Y - 14, 12, 12);
  }
}
/** Touch heal button with a count badge, added beside the existing touch buttons (index.html untouched). */
export function addHealButton() {
  if (typeof document === "undefined" || document.getElementById("healBtn")) return;
  const melee = document.querySelector('[data-b="melee"]'); if (!melee?.parentElement) return;
  const b = document.createElement("button"); b.id = "healBtn"; b.className = "tb sm heal"; b.dataset.b = "heal"; b.textContent = "+"; b.dataset.n = "0";
  melee.parentElement.insertBefore(b, melee.parentElement.firstChild);
}
if (typeof window !== "undefined") (window as unknown as { __kiLoot: unknown }).__kiLoot = { ITEMS, GEAR, rng, debug, rollKill, useItem, quickHeal, answer, reviveTap, revive, seed: (n: number) => { seed = n >>> 0; } };
