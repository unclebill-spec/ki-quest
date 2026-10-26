/**
 * HD2D W14: tabbed pause menu (Status / Gear / Lens / Map / Options / Save), gear compare, 3 save slots,
 * export/import codes. Logic + canvas drawing + touch; game.ts calls menuStep(), draw.ts calls drawMenu().
 * Controls (existing bindings only): Esc/Start open+close · W/S/arrows/stick/d-pad rows · A/D/left/right or Q/LB, Shift/RB tabs ·
 * J/Enter/Space/A pad confirm · K/B pad back. Touch: tap a tab or a row (tap selected row again = confirm).
 */
import type { Game } from "./game";
import { expNext } from "./game";
import { GEAR, GearSlot, SLOT_NAMES, SLOT_ORDER, SHOP_NAMES, gearById, owned, gearBonus, drawGearIcon, Gear, shopStock, price, srcText } from "./gear";
import { ITEMS, ITEM_IDS, useItem, drawItemIcon, reviveTap, type ItemId } from "./loot";
import { SLOT_COUNT, readSlot, writeSlot, exportCode, importCode, SaveRecord, slotKey } from "./save";
import { areaMap } from "./areas/art";
import { getRes, cycleRes } from "./resolution";

export const TABS = ["Status", "Gear", "Items", "Shop", "Lens", "Map", "Options", "Save"] as const;
export const W = 384, H = 216;
export const TAB_BAR = { x: 8, y: 6, w: 368 / 8, h: 14 };
export const ROWS = { x: 14, y: 40, h: 16, w: 170 };
const MB_SLOT = "kiquest-mb-v1", STORY_KEY = "kiquest.story.v1";

export const ui = { tab: 0, sel: 0, sub: "" as "" | "pick" | "slot", subSel: 0, msg: "", msgT: 0, lastX: 0, lastY: 0 };
type Ki = { story?: { flags: Record<string, unknown>; save(): void; enter(id: string, atStart?: boolean): void; box?: unknown }; audio?: { muted: boolean; setMute(m: boolean): void } };
const ki = () => ((globalThis as unknown as { __ki?: Ki }).__ki ?? {}) as Ki;
/** UI sounds (staging/sound ui-*.ogg, CC0) through the existing Audio sfx bus; ui-move rate-limited to 1 per 50 ms. */
const UI_SFX = ["ui-open", "ui-close", "ui-tab", "ui-move", "ui-confirm", "ui-cancel", "ui-equip", "ui-save", "ui-load", "ui-error"] as const;
type UiSfx = (typeof UI_SFX)[number];
let lastMove = 0;
export function sfx(n: UiSfx) {
  const a = ki().audio as unknown as { play?(n: string): void; load?(n: string): void } | undefined; if (!a?.play) return;
  if (n === "ui-move") { const t = performance.now(); if (t - lastMove < 50) return; lastMove = t; }
  for (const k of UI_SFX) a.load?.(k); // preload (no-op once cached / before the audio unlock)
  a.play(n);
}
const SLOTS: GearSlot[] = SLOT_ORDER;
/** Shopkeepers (Story gear_text.md): NPC letter per area. Drowned Vesper's Marlo Quayle is `s` on the DROWNED map (5,3), next to the save pad. */
export const KEEPERS: Record<string, { npc: string; name: string; hi: string }> = {
  lanternmoss: { npc: "j", name: "Joss Tumble", hi: "Potions, wraps, beads! Everything glows, nothing's refunded." },
  hushwater: { npc: "r", name: "Orrin Cask", hi: "Ferry's slow, so I sell boots. Fen Boots. Reed Circlets. Don't ask." },
  kilnreach: { npc: "q", name: "Dace Holloway", hi: "Cinder Fists, forged on Brann's anvil. Fair trade, fair weight." },
  drowned: { npc: "s", name: "Marlo Quayle", hi: "Marlo Quayle, chandler. Oilskins, greaves, and Tears in glass." },
};
/** Shop rows here: gear sold in this area + consumables (Tears from area 2 on). Empty when no keeper is near. */
export function shopRows(g: Game): ({ kind: "gear"; it: Gear } | { kind: "item"; id: ItemId })[] {
  const k = KEEPERS[g.area.id]; if (!k) return [];
  const n = k.npc ? g.area.npcs.find((x: { id: string }) => x.id === k.npc) : null, at = n ?? g.area.pad;
  if (Math.hypot(at.x - g.p.x, at.y - g.p.y) > 56) return [];
  const items = (["morsel", "berry", "tear"] as ItemId[]).filter((id) => id !== "tear" || g.area.id !== "lanternmoss");
  return [...shopStock(g.area.id).map((it) => ({ kind: "gear" as const, it })), ...items.map((id) => ({ kind: "item" as const, id }))];
}
const SLOT_ACTS = ["Save here", "Load", "Export code", "Cancel"];

export function openMenu() { ui.tab = 0; ui.sel = 0; ui.sub = ""; sfx("ui-open"); }
function note(s: string) { ui.msg = s; ui.msgT = 2.5; }

function rowCount(g: Game) {
  switch (TABS[ui.tab]) {
    case "Status": return 4;
    case "Gear": return ui.sub === "pick" ? owned(g.have, SLOTS[ui.sel]).length : SLOTS.length;
    case "Items": return ITEM_IDS.length;
    case "Shop": return Math.max(1, shopRows(g).length);
    case "Lens": return Math.max(1, bios(g).length);
    case "Map": return 1;
    case "Options": return 5;
    case "Save": return ui.sub === "slot" ? SLOT_ACTS.length : SLOT_COUNT + 1;
  }
  return 1;
}

/** Called by Game.step while mode === "pause" (after the pause toggle check). */
export function menuStep(g: Game, dt = 1 / 60) {
  const inp = g.input;
  ui.msgT -= dt;
  if (codeOpen()) return;
  const vx = inp.mx > 0.5 ? 1 : inp.mx < -0.5 ? -1 : 0, vy = inp.my > 0.5 ? 1 : inp.my < -0.5 ? -1 : 0;
  let dTab = 0;
  if (vx && vx !== ui.lastX) dTab = vx;
  else if (inp.tapX && !vx) dTab = Math.sign(inp.tapX);
  if (inp.pressed("cycle")) dTab = 1;
  if (inp.pressed("block")) dTab = -1;
  ui.lastX = vx;
  if (dTab && !ui.sub) { sfx("ui-tab"); ui.tab = (ui.tab + TABS.length + dTab) % TABS.length; ui.sel = 0; return; }
  const n = rowCount(g);
  let dy = 0;
  if (inp.pressed("down") || (vy === 1 && ui.lastY !== 1)) dy = 1;
  if (inp.pressed("up") || (vy === -1 && ui.lastY !== -1)) dy = -1;
  if (!dy && !vy && inp.tapY) dy = Math.sign(inp.tapY);
  ui.lastY = vy;
  if (dy) { sfx("ui-move"); if (ui.sub) ui.subSel = (ui.subSel + n + dy) % n; else ui.sel = (ui.sel + n + dy) % n; }
  if (inp.pressed("melee") || inp.pressed("confirm")) confirm(g);
  else if (inp.pressed("blast")) back(g);
}
export function back(g: Game) { if (ui.sub) { ui.sub = ""; sfx("ui-cancel"); } else { g.mode = "play"; sfx("ui-close"); } }

export function confirm(g: Game) {
  const tab = TABS[ui.tab];
  if (tab === "Status") { if (ui.sel === 3) sfx("ui-close"); else if (g.pts > 0) sfx("ui-confirm"); g.menuPick(ui.sel); }
  else if (tab === "Gear") {
    if (!ui.sub) { sfx("ui-confirm"); ui.sub = "pick"; const list = owned(g.have, SLOTS[ui.sel]); ui.subSel = Math.max(0, list.findIndex((x) => x.id === g.gear[SLOTS[ui.sel]])); }
    else { const it = owned(g.have, SLOTS[ui.sel])[ui.subSel]; if (it) { g.equip(it.id); note(`Equipped ${it.name}`); sfx("ui-equip"); } ui.sub = ""; }
  } else if (tab === "Items") {
    const id = ITEM_IDS[ui.sel], r = useItem(g, id);
    sfx(r ? "ui-error" : "ui-confirm");
    note(r === "" ? `Used ${ITEMS[id].name}` : r === "auto" ? "Used automatically when you fall" : r === "none" ? `No ${ITEMS[id].name}` : r === "cooldown" ? "Wait a moment" : "Can't use that now");
  } else if (tab === "Shop") {
    const row = shopRows(g)[ui.sel]; if (!row) { sfx("ui-error"); return; }
    const r = row.kind === "gear" ? g.buy(row.it.id) : g.buyItem(row.id);
    sfx(r ? "ui-error" : "ui-save"); note(r ? r : `Bought ${row.kind === "gear" ? row.it.name : ITEMS[row.id].name}`);
    const st = ki().story; if (!r && st) { st.flags.shopOpen = true; st.save(); }
  } else if (tab === "Options") {
    sfx(ui.sel >= 3 ? "ui-close" : "ui-confirm");
    if (ui.sel === 0) { const a = ki().audio; if (a) a.setMute(!a.muted); }
    else if (ui.sel === 1) { g.shakeOff = !g.shakeOff; try { localStorage.setItem("kiquest-opt-noshake", g.shakeOff ? "1" : "0"); } catch { /* */ } }
    else if (ui.sel === 2) note(`Resolution: ${cycleRes()}`); // W17l, per device (localStorage)
    else if (ui.sel === 3) dispatchEvent(new Event("kq-quit")); // W17l: main.ts autosaves + shows the title
    else g.mode = "play";
  } else if (tab === "Save") {
    if (!ui.sub) { sfx("ui-confirm"); if (ui.sel === SLOT_COUNT) openCode(g, "import"); else { ui.sub = "slot"; ui.subSel = 0; } return; }
    const act = SLOT_ACTS[ui.subSel], i = ui.sel; ui.sub = "";
    if (act === "Save here") { const k = saveToSlot(g, i); sfx(k ? "ui-save" : "ui-error"); note(k ? `Saved to slot ${i + 1}` : "Save failed (storage blocked)"); }
    else if (act === "Load") { const k = loadSlot(g, i); sfx(k ? "ui-load" : "ui-error"); note(k ? `Loaded slot ${i + 1}` : `Slot ${i + 1} is empty`); }
    else if (act === "Export code") { const r = readSlot(i); if (r) { sfx("ui-confirm"); openCode(g, "export", r); } else { sfx("ui-error"); note(`Slot ${i + 1} is empty`); } }
    else sfx("ui-cancel");
  } else if (tab === "Map") { g.mode = "play"; sfx("ui-close"); }
}

/** Full snapshot: game record + story flags + boss-done map (so a slot restores the whole run). */
export function snapshot(g: Game): SaveRecord {
  const r = g.record();
  try { r.story = JSON.parse(localStorage.getItem(STORY_KEY) || "{}") || {}; } catch { r.story = {}; }
  const s = ki().story; if (s) r.story = { ...s.flags };
  try { r.bosses = JSON.parse(localStorage.getItem(MB_SLOT) || "{}") || {}; } catch { r.bosses = {}; }
  return r;
}
export function saveToSlot(g: Game, i: number) { return writeSlot(i, snapshot(g)); }
export function applyRecord(g: Game, r: SaveRecord) {
  try {
    if (r.bosses) { localStorage.setItem(MB_SLOT, JSON.stringify(r.bosses)); const b = r.bosses as Record<string, boolean>;
      const mb = g.mb as unknown as Record<string, { done: boolean; active: boolean }>;
      for (const k of ["boss", "boss2", "boss3", "boss4", "boss5", "boss6", "boss7", "boss8", "boss9", "boss10", "boss11", "boss12"]) if (mb[k])  /* MB hook W17 */ { mb[k].done = b[k === "boss" ? "boss1" : k] === true; mb[k].active = false; } }
  } catch { /* storage blocked */ }
  const s = ki().story;
  if (s && r.story) { s.flags = { ...r.story }; s.save(); }
  const id = r.areaId || (r.story?.area as string) || "";
  if (s && id) s.enter(id, true);
  g.load(r);
  g.mode = "play";
}
export function loadSlot(g: Game, i: number) { const r = readSlot(i); if (!r) return false; applyRecord(g, r); return true; }

// ---- export / import overlay (DOM, so phones get a real text box + file picker) ----
let box: HTMLDivElement | null = null;
export const codeOpen = () => !!box;
export function closeCode() { if (box) sfx("ui-close"); box?.remove(); box = null; }
export function openCode(g: Game, kind: "export" | "import", rec?: SaveRecord) {
  closeCode();
  const d = document.createElement("div"); d.id = "saveCode"; d.className = "savecode";
  const code = rec ? exportCode(rec) : "";
  d.innerHTML = `<div class="savecode-in"><h3>${kind === "export" ? "Export save" : "Import save"}</h3>
    <p></p>
    <textarea id="saveCodeText" spellcheck="false" ${kind === "export" ? "readonly" : ""}></textarea>
    ${kind === "import" ? `<div class="row"><label>Slot <select id="saveCodeSlot">${Array.from({ length: SLOT_COUNT }, (_, i) => `<option value="${i}">${i + 1}</option>`).join("")}</select></label><input type="file" id="saveCodeFile" accept=".kqsave,.txt,.json,text/plain,application/json"></div>` : ""}
    <div class="row"><button id="saveCodeGo">${kind === "export" ? "Copy" : "Import"}</button>${kind === "export" ? '<button id="saveCodeDl">Download</button>' : ""}<button id="saveCodeClose">Close</button></div>
    <p id="saveCodeMsg" class="msg"></p></div>`;
  d.querySelector("p")!.textContent = kind === "export" ? "Copy this code or download the file. Keep it safe." : "Paste a save code or pick a save file, choose a slot, then Import.";
  // Keep typing out of the game's key handler (window listener; it preventDefaults Space/Enter/letters).
  for (const ev of ["keydown", "keyup"]) d.addEventListener(ev, (e) => { e.stopPropagation(); if ((e as KeyboardEvent).code === "Escape") closeCode(); });
  d.addEventListener("touchstart", (e) => e.stopPropagation()); d.addEventListener("touchmove", (e) => e.stopPropagation());
  (document.getElementById("stage") ?? document.body).appendChild(d); box = d;
  const ta = d.querySelector<HTMLTextAreaElement>("#saveCodeText")!, msg = d.querySelector<HTMLElement>("#saveCodeMsg")!;
  ta.value = code;
  d.querySelector<HTMLButtonElement>("#saveCodeClose")!.onclick = closeCode;
  if (kind === "export") {
    d.querySelector<HTMLButtonElement>("#saveCodeGo")!.onclick = async () => { ta.select(); try { await navigator.clipboard.writeText(code); msg.textContent = "Copied."; } catch { msg.textContent = "Select the text and copy it."; } };
    d.querySelector<HTMLButtonElement>("#saveCodeDl")!.onclick = () => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
      a.download = `kindle-quest-lv${rec?.lvl ?? 1}.kqsave`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
  } else {
    const sel = d.querySelector<HTMLSelectElement>("#saveCodeSlot")!; sel.value = String(Math.min(ui.sel, SLOT_COUNT - 1));
    d.querySelector<HTMLInputElement>("#saveCodeFile")!.onchange = async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f && f.size < 200_000) ta.value = await f.text(); };
    d.querySelector<HTMLButtonElement>("#saveCodeGo")!.onclick = () => {
      const r = importCode(ta.value);
      if (!r) { sfx("ui-error"); msg.textContent = "That is not a valid Kindle Quest save."; return; }
      const i = Number(sel.value) || 0; writeSlot(i, r); sfx("ui-save");
      msg.textContent = `Imported into slot ${i + 1} (Lv ${r.lvl}). Load it from the Save tab.`;
      note(`Imported into slot ${i + 1}`); setTimeout(closeCode, 900);
    };
  }
  ta.focus();
  void g;
}

// ---- touch ----
let bound = false;
export function bindMenuTouch(g: Game) {
  if (bound || typeof document === "undefined") return; bound = true;
  const cv = document.getElementById("game") as HTMLCanvasElement | null; if (!cv) return;
  cv.addEventListener("pointerdown", (e) => {
    if ((g.mode !== "pause" && g.mode !== "revive") || codeOpen()) return;
    const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    if (g.mode === "revive") reviveTap(g, x, y); else menuTap(g, x, y);
  });
}
/** Tap at internal coords (exported for tests). */
export function menuTap(g: Game, x: number, y: number) {
  const T = TAB_BAR;
  if (y >= T.y && y < T.y + T.h && x >= T.x) { const t = Math.floor((x - T.x) / T.w); if (t >= 0 && t < TABS.length) { if (t !== ui.tab) sfx("ui-tab"); ui.tab = t; ui.sel = 0; ui.sub = ""; } return; }
  if (x >= W - 40 && y >= H - 16) { back(g); return; }
  const R = ROWS, i = Math.floor((y - R.y) / (["Lens", "Gear", "Shop"].includes(TABS[ui.tab]) ? 13 : R.h));
  const n = rowCount(g), sx = ui.sub ? R.x + R.w + 8 : R.x;
  if (x < sx || x > sx + R.w || i < 0 || i >= n) return;
  if (ui.sub) { if (ui.subSel === i) confirm(g); else { ui.subSel = i; sfx("ui-move"); } }
  else { if (ui.sel === i) confirm(g); else { ui.sel = i; sfx("ui-move"); } }
}

// ---- bios ----
function bios(g: Game) {
  const F = (ki().story?.flags ?? {}) as Record<string, unknown>, mb = g.mb as unknown as Record<string, { done: boolean }>;
  const A = (id: string) => g.mb.allies.some((a) => a.id === id && a.joined);
  const L: { name: string; tag: string; text: string[] }[] = [
    { name: "You", tag: "Lantern-born wanderer", text: ["A traveler with a spark of Glow.", "Every lamp you pass burns a", "little brighter for it."] },
  ];
  if (A("mirela") || F.oath) L.push({ name: "Mirela", tag: "Oathkeeper · ally", text: ["Swore to walk with you to the", "dead sun. Fights close, throws", "teal bolts, never retreats."] });
  if (A("brann") || F.brann) L.push({ name: "Brann", tag: "Shield-wall · ally", text: ["Big, slow, loud. Draws foes off", "you with a taunt and takes", "the hits nobody else can."] });
  if (A("sable") || F.sableJoin) L.push({ name: "Sable", tag: "Caster · healer · ally", text: ["She reads the Lens like a book.", "Hangs back, casts, and mends", "the party when it counts."] });
  if (F.linnetWoke) L.push({ name: "Linnet Vant", tag: F.linnetRest ? "Sleeping Wraith · at rest" : "Sleeping Wraith · Power 0 lm", text: ["Mirela's grandmother. Followed", "a spring west and stayed to keep", F.linnetRest ? "it company. Saw her sunrise." : "it company. Still waiting for dawn."] }); // W17f
  if (mb.boss?.done) L.push({ name: "Ashmaw", tag: "Grotto Devourer · defeated", text: ["An ember-jawed beast of the grotto.", "Dashes, fans, slams. Its embers", "went cold at last."] }); // MB hook W17
  if (mb.boss2?.done) L.push({ name: "Slagheart", tag: "Quarry boss · defeated", text: ["Molten core in a slag shell.", "The quarry cools without it."] });
  if (mb.boss3?.done) L.push({ name: "Count Aurel", tag: "Undertide · defeated", text: ["Lord of the drowned spring.", "Called the tide to his side."] });
  if (mb.boss4?.done) L.push({ name: "Cageward Twins", tag: "Red Cage · defeated", text: ["Two wardens, three pylons,", "one cage. Broken together."] });
  if (mb.boss5?.done) L.push({ name: "Morvant", tag: "Eclipse Golem · defeated", text: ["Guarded the Husk Ring. Its", "fall opened the way up."] });
  if (mb.boss6?.done) L.push({ name: "Malachar Vesh", tag: "The Last Dusk · defeated", text: ["Wanted the world dark.", "Dawn came anyway."] });
  if (mb.boss11?.done) L.push({ name: "Hollowmere", tag: "Drinking Colossus · defeated", text: ["It drank the Hushwater mere.", "The fog thins without it."] }); // MB hook W17
  if (mb.boss12?.done) L.push({ name: "Warden Rune", tag: "Last Guardian · defeated", text: ["Kept the world dim so it", "could not burn. Its watch is over."] }); // MB hook W17
  return L;
}

// ---- drawing ----
const fmtTime = (s = 0) => { const m = Math.floor(s / 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
function row(c: CanvasRenderingContext2D, x: number, y: number, w: number, sel: boolean, label: string, right = "", dim = false) {
  c.fillStyle = sel ? "#3a2c70" : "#1c1630"; c.fillRect(x, y, w, ROWS.h - 3);
  if (sel) { c.strokeStyle = "#ffd76a"; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, ROWS.h - 4); }
  c.textAlign = "left"; c.font = "bold 8px monospace"; c.fillStyle = dim ? "#77708e" : "#fff"; c.fillText(label, x + 5, y + 9.5);
  if (right) { c.textAlign = "right"; c.font = "7px monospace"; c.fillStyle = "#cfe8ff"; c.fillText(right, x + w - 5, y + 9.5); }
}
const delta = (v: number) => (v > 0 ? `+${v}` : String(v));
function deltaCol(v: number) { return v > 0 ? "#6dff8a" : v < 0 ? "#ff6a6a" : "#8a84a0"; }

export function drawMenu(c: CanvasRenderingContext2D, g: Game) {
  c.fillStyle = "rgba(6,4,12,.86)"; c.fillRect(0, 0, W, H);
  const T = TAB_BAR;
  TABS.forEach((t, i) => {
    const x = Math.round(T.x + i * T.w), on = i === ui.tab;
    c.fillStyle = on ? "#3a2c70" : "#16112a"; c.fillRect(x + 1, T.y, Math.floor(T.w) - 2, T.h);
    if (on) { c.fillStyle = "#ffd76a"; c.fillRect(x + 1, T.y + T.h - 2, Math.floor(T.w) - 2, 2); }
    c.textAlign = "center"; c.font = on ? "bold 8px monospace" : "8px monospace"; c.fillStyle = on ? "#fff" : "#a9a0c8"; c.fillText(t, x + T.w / 2, T.y + 10);
  });
  c.textAlign = "left"; c.font = "7px monospace"; c.fillStyle = "#b8b0d0";
  c.fillText(`Lv ${g.lvl}  HP ${Math.ceil(g.hp)}/${g.maxHp}  EP ${Math.floor(g.ep)}/${g.maxEp}  EXP ${g.exp}/${expNext(g.lvl)}  ${g.area.name}  ${fmtTime(g.play)}`, 14, 32);
  const tab = TABS[ui.tab], R = ROWS;
  if (tab === "Status") {
    const b = gearBonus(g.gear);
    const rows: [string, number, number, string][] = [["STR", g.str, b.str, "melee power"], ["POW", g.pow, b.pow, "Glow blast, max EP"], ["END", g.end, b.end, "defense, max HP"]];
    rows.forEach(([k, v, gb, d], i) => row(c, R.x, R.y + i * R.h, R.w, ui.sel === i, `${k} ${v}${gb ? ` (${delta(gb)})` : ""}`, g.pts ? "+" : d));
    row(c, R.x, R.y + 3 * R.h, R.w, ui.sel === 3, "Resume");
    side(c, [`Points to spend: ${g.pts}`, "", `Melee ${g.meleeDmg.toFixed(1)}`, `Blast ${g.blastDmg.toFixed(1)}`, `Defense ${Math.round(g.defense * 100)}%`, `Speed ${b.spd ? delta(b.spd) + " SPD" : "normal"}`, `Coins ${g.coins}`, `Kills ${g.stats.kills}  Saves ${g.stats.saves}`], g.pts ? "#ffd04a" : "#cfe8ff");
  } else if (tab === "Gear") {
    const GH = 13;
    SLOTS.forEach((s, i) => { const it = gearById(g.gear[s]); row(c, R.x, R.y + i * GH, R.w, ui.sel === i, `${SLOT_NAMES[s]}`, it?.name ?? "-"); drawGearIcon(c, it, R.x + 48, R.y + i * GH - 3); });
    const slot = SLOTS[ui.sel], list = owned(g.have, slot), cur = gearById(g.gear[slot])!;
    const cy = R.y + SLOTS.length * GH + 6;
    if (ui.sub === "pick") {
      const x = R.x + R.w + 8;
      list.forEach((it, i) => { row(c, x, R.y + i * GH, R.w, ui.subSel === i, "    " + it.name, it.id === cur.id ? "E" : ""); drawGearIcon(c, it, x + 2, R.y + i * GH - 3); });
      compare(c, g, list[ui.subSel] ?? cur, cur, R.x, Math.max(cy, R.y + list.length * GH + 4));
    } else {
      compare(c, g, cur, cur, R.x, cy);
      c.font = "7px monospace"; c.fillStyle = "#8a84a0"; c.textAlign = "left";
      const locked = GEAR.filter((x) => x.slot === slot && !g.have.includes(x.id));
      c.fillText(`${list.length}/${list.length + locked.length} owned · J/A to choose`, R.x + R.w + 10, R.y + 9);
      locked.slice(0, 4).forEach((x, i) => c.fillText(`${x.name}: ${srcText(x)}`.slice(0, 44), R.x + R.w + 10, R.y + 21 + i * 10));
    }
  } else if (tab === "Items") {
    ITEM_IDS.forEach((id, i) => { row(c, R.x, R.y + i * R.h, R.w, ui.sel === i, "    " + ITEMS[id].name, `${g.items[id]}/${ITEMS[id].max}`); drawItemIcon(c, id, R.x + 2, R.y + i * R.h - 2); });
    const I = ITEMS[ITEM_IDS[ui.sel]];
    side(c, [I.name, ...wrap(I.desc, 30), "", ITEM_IDS[ui.sel] === "tear" ? "Used when you fall (prompt)." : "J/A: use now (1 s cooldown)", "Quick heal: H · RT · + button", "Kindleberry: G · LT · hold +"], "#cfe8ff");
  } else if (tab === "Shop") {
    const k = KEEPERS[g.area.id], rows = shopRows(g);
    if (!rows.length) side(c, ["No shop here", "", k ? (k.npc ? `Talk shop with ${k.name}:` : `${k.name} trades near the save pad.`) : "Shops: Wickhaven, Hushwater,", k ? "stand close, then open this tab." : "Kilnreach, Drowned Vesper.", "", `Coins ${g.coins}`], "#cfe8ff", R.x);
    else {
      rows.forEach((r, i) => {
        const y = R.y + i * 13, name = r.kind === "gear" ? r.it.name : ITEMS[r.id].name, cost = r.kind === "gear" ? price(r.it) : ITEMS[r.id].price;
        const tag = r.kind === "gear" ? (g.have.includes(r.it.id) ? "owned" : `${cost}c`) : `${cost}c (${g.items[r.id]})`;
        row(c, R.x, y, R.w + 20, ui.sel === i, "    " + name, tag, r.kind === "gear" && (g.have.includes(r.it.id) || g.lvl < r.it.lvl));
        if (r.kind === "gear") drawGearIcon(c, r.it, R.x + 2, y - 3); else drawItemIcon(c, r.id, R.x + 2, y - 3);
      });
      const r = rows[ui.sel] ?? rows[0];
      const lines = r.kind === "gear" ? [r.it.name, `Lv ${r.it.lvl}  ${statLine(r.it)}`, ...wrap(r.it.desc, 28), r.it.perk ? `Perk: ${r.it.perk}` : ""] : [ITEMS[r.id].name, ...wrap(ITEMS[r.id].desc, 28)];
      side(c, [...lines, "", `${k.name}:`, ...wrap(`"${k.hi}"`, 28).slice(0, 3), `Coins ${g.coins}`], "#ffd76a", R.x + R.w + 34);
    }
  } else if (tab === "Lens") {
    const L = bios(g);
    L.forEach((b, i) => row(c, R.x, R.y + i * 13, 110, ui.sel === i, b.name));
    const b = L[ui.sel] ?? L[0];
    side(c, [b.name, b.tag, "", ...b.text], "#cfe8ff", 140);
  } else if (tab === "Map") {
    const s = 3.2; areaMap(c, g, Math.round(W / 2 - (48 * s) / 2), 38, s);
  } else if (tab === "Options") {
    const a = ki().audio;
    row(c, R.x, R.y, R.w, ui.sel === 0, "Sound", a?.muted ? "Off" : "On");
    row(c, R.x, R.y + R.h, R.w, ui.sel === 1, "Screen shake", g.shakeOff ? "Off" : "On");
    row(c, R.x, R.y + 2 * R.h, R.w, ui.sel === 2, "Resolution", getRes());
    row(c, R.x, R.y + 3 * R.h, R.w, ui.sel === 3, "Quit to title");
    row(c, R.x, R.y + 4 * R.h, R.w, ui.sel === 4, "Resume");
    side(c, ["Controls", "Move  WASD / stick", "Melee J · A   Blast K · B", "Block Shift · RB  Tech Q · LB", "Power T/L · Y   Map M · Back", "Pause Esc · Start  Mute N"], "#cfe8ff");
  } else if (tab === "Save") {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const r = readSlot(i);
      row(c, R.x, R.y + i * R.h, R.w + 40, ui.sel === i, `Slot ${i + 1}`, r ? `${(r.area || r.areaId || "?").slice(0, 16)} Lv${r.lvl} ${fmtTime(r.play)}` : "- empty -", !r);
    }
    row(c, R.x, R.y + SLOT_COUNT * R.h, R.w + 40, ui.sel === SLOT_COUNT, "Import save code / file");
    if (ui.sub === "slot") { const x = R.x + R.w + 48; SLOT_ACTS.forEach((t, i) => row(c, x, R.y + i * R.h, 110, ui.subSel === i, t)); }
    c.font = "7px monospace"; c.fillStyle = "#8a84a0"; c.textAlign = "left";
    c.fillText("Autosave keeps running when the page hides; the save pad still saves too.", R.x, R.y + 5 * R.h);
    void slotKey;
  }
  if (ui.msgT > 0) { c.textAlign = "center"; c.font = "bold 8px monospace"; c.fillStyle = "#ffd76a"; c.fillText(ui.msg, W / 2, H - 22); }
  c.textAlign = "center"; c.font = "6px monospace"; c.fillStyle = "#8a84a0";
  c.fillText("A/D · Q/LB · Shift/RB: tabs   W/S: rows   J/A: choose   K/B: back   Esc/Start: close", W / 2 - 16, H - 6);
  c.fillStyle = "#1c1630"; c.fillRect(W - 40, H - 16, 36, 13); c.fillStyle = "#fff"; c.font = "bold 7px monospace"; c.fillText("Back", W - 22, H - 7);
}
function side(c: CanvasRenderingContext2D, lines: string[], col: string, x = ROWS.x + ROWS.w + 14) {
  c.textAlign = "left"; lines.forEach((l, i) => { c.font = i === 0 ? "bold 8px monospace" : "7px monospace"; c.fillStyle = i === 0 ? col : "#b8b0d0"; c.fillText(l, x, ROWS.y + 9 + i * 11); });
}
const statLine = (it: Gear) => (["str", "pow", "end", "spd"] as const).filter((k) => it[k]).map((k) => `${k.toUpperCase()}${delta(it[k])}`).join(" ") || "no stats";
function wrap(t: string, n: number) { const out: string[] = []; let l = ""; for (const w of t.split(" ")) { if ((l + " " + w).trim().length > n) { out.push(l); l = w; } else l = (l + " " + w).trim(); } if (l) out.push(l); return out; }
function compare(c: CanvasRenderingContext2D, g: Game, it: Gear, cur: Gear, x: number, y: number) {
  c.fillStyle = "#120e22"; c.fillRect(x, y, 356, 44);
  const ix = drawGearIcon(c, it, x + 4, y + 4) ? 18 : 0;
  c.textAlign = "left"; c.font = "bold 8px monospace"; c.fillStyle = "#ffd76a"; c.fillText(it.name, x + 5 + ix, y + 10);
  c.font = "7px monospace"; c.fillStyle = "#a9a0c8"; c.fillText(srcText(it).slice(0, 40), x + 150, y + 10);
  (["str", "pow", "end", "spd"] as const).forEach((k, i) => {
    const d = it[k] - cur[k], X = x + 5 + ix + i * 62;
    c.fillStyle = "#cfe8ff"; c.fillText(`${k.toUpperCase()} ${delta(it[k])}`, X, y + 21);
    if (it !== cur) { c.fillStyle = deltaCol(d); c.fillText(d ? `(${delta(d)})` : "(=)", X + 34, y + 21); }
  });
  c.fillStyle = "#b8b0d0"; c.fillText(it.desc.slice(0, 66), x + 5, y + 31);
  if (it.perk) { c.fillStyle = "#9fe8b0"; c.fillText(`Perk: ${it.perk}`, x + 5, y + 40); }
  void g;
}
// Test hook (read-only use in tests/menus.mjs).
if (typeof window !== "undefined") (window as unknown as { __kiMenu: unknown }).__kiMenu = { ui, TABS, shopRows, KEEPERS, exportCode, importCode, readSlot, saveToSlot, loadSlot, menuTap, codeOpen, closeCode };
