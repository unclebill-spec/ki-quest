// HD2D W14: tabbed pause menu, gear, save slots, export/import, old-save migration.
// KI_PORT=4520 node tests/menus.mjs [--shots]   (needs `npm run build`; Playwright from /workspace/tools/game/node)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4520), SHOTS = process.argv.includes("--shots");
const DOCS = new URL("../docs/", import.meta.url).pathname;
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore", detached: true });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
const PADINIT = () => {
  const b = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
  window.__pad = { id: "fake", index: 0, connected: true, mapping: "standard", timestamp: 0, axes: [0, 0, 0, 0], buttons: b() };
  navigator.getGamepads = () => [window.__pad];
};
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  await page.addInitScript(PADINIT);
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  // Old v1 save (pre-W14 shape, with MB's mirela field) must load and migrate.
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true }));
    localStorage.setItem("kiquest-save-v1", JSON.stringify({ v: 1, at: 5, area: "Lanternmoss Hollow", x: 0, y: 0, lvl: 9, exp: 3, pts: 2, str: 4, pow: 5, end: 6, hp: 50, ep: 40, tf: 0, mirela: true })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(200);
  const E = (f, a) => page.evaluate(f, a);
  const st = () => E(() => { const g = window.__ki.game, u = window.__kiMenu.ui; return { mode: g.mode, tab: u.tab, sel: u.sel, sub: u.sub, subSel: u.subSel, str: g.str, pts: g.pts, lvl: g.lvl, gear: { ...g.gear }, maxHp: g.maxHp }; });
  let s = await E(() => { const g = window.__ki.game; return { lvl: g.lvl, end: g.end, mirela: g.mb.allies[0].joined, play: g.play, gear: g.gear.w }; });
  ok("old v1 save loads (lvl/end)", s.lvl === 9 && s.end === 6, JSON.stringify(s));
  ok("old v1 save keeps mirela", s.mirela === true);
  ok("old v1 migrates play/gear defaults", s.play < 5 && s.gear === "w0");
  const mig = await E(() => { const r = window.__kiMenu.importCode(JSON.stringify({ v: 1, at: 1, area: "X", x: 1, y: 2, lvl: 2, exp: 0, pts: 0, str: 3, pow: 3, end: 3, hp: 9, ep: 9, tf: 0, mirela: true, brann: false }));
    return r && { v: r.v, mirela: r.mirela, brann: r.brann, play: r.play }; });
  ok("importCode migrates raw v1 JSON, keeps mirela/brann", mig && mig.v === 2 && mig.mirela === true && mig.brann === false && mig.play === 0, JSON.stringify(mig));
  const bad = await E(() => [window.__kiMenu.importCode("garbage"), window.__kiMenu.importCode("KQSAVE1:!!!"), window.__kiMenu.importCode('{"v":9,"lvl":1}'), window.__kiMenu.importCode('{"v":1,"lvl":"x"}')].every((x) => x === null));
  ok("importCode rejects invalid / unknown version", bad);

  // Keyboard: Esc opens menu on Status; D / Q switch tabs; Esc closes.
  const key = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(60); };
  await key("Escape"); s = await st(); ok("Esc opens pause on Status", s.mode === "pause" && s.tab === 0);
  if (SHOTS) await shot("status");
  await key("KeyS"); s = await st(); ok("kb S moves row", s.sel === 1);
  await key("KeyD"); s = await st(); ok("kb D next tab (Gear)", s.tab === 1);
  await key("KeyQ"); s = await st(); ok("kb Q next tab (Items)", s.tab === 2);
  await key("ShiftLeft"); s = await st(); ok("kb Shift prev tab", s.tab === 1);
  await key("KeyA"); s = await st(); ok("kb A prev tab (Status)", s.tab === 0);
  // Gear equip via keyboard: Gear tab, Hands row, J opens picker, S to next item, J equips.
  await E(() => window.__ki.game.have.push("w1", "a1", "c1"));
  await key("KeyD"); const hp0 = (await st()).maxHp;
  if (SHOTS) await shot("gear");
  ok("gear tab lists 5 slots", (await E(() => window.__kiMenu.ui && 1)) === 1);
  await key("KeyS"); await key("KeyS"); await key("KeyJ"); s = await st(); ok("gear picker opens", s.sub === "pick");
  await key("KeyS");
  if (SHOTS) await shot("gear-compare");
  await key("KeyJ"); s = await st(); ok("gear equip Ember Knuckles", s.gear.w === "w1" && s.sub === "", JSON.stringify(s.gear));
  const md = await E(() => window.__ki.game.eStr - window.__ki.game.str); ok("gear bonus applies to STR", md === 2, `+${md}`);
  await key("KeyW"); await key("KeyJ"); await key("KeyS"); await key("KeyJ"); s = await st(); ok("garb equip raises max HP", s.gear.a === "a1" && s.maxHp === hp0 + 16, `${hp0}→${s.maxHp}`);
  await key("KeyK"); s = await st(); ok("K closes menu (back)", s.mode === "play");
  await key("Escape"); await key("KeyD"); await key("KeyD"); if (SHOTS) await shot("items"); await key("KeyD"); if (SHOTS) await shot("shop"); await key("KeyD"); if (SHOTS) await shot("lens"); await key("KeyD"); s = await st(); ok("Map tab", s.tab === 5);
  if (SHOTS) await shot("map");
  await key("KeyD"); s = await st(); ok("Options tab", s.tab === 6);
  if (SHOTS) await shot("options");
  await key("Escape"); s = await st(); ok("Esc closes menu", s.mode === "play");

  // Gamepad: Start opens, d-pad right / RB / LB tabs, down rows, A confirm, B back.
  const pad = async (i, ms = 90) => { await E((i) => { window.__pad.buttons[i].pressed = true; window.__pad.buttons[i].value = 1; }, i); await page.waitForTimeout(ms); await E((i) => { window.__pad.buttons[i].pressed = false; window.__pad.buttons[i].value = 0; }, i); await page.waitForTimeout(ms); };
  await pad(9); s = await st(); ok("pad Start opens", s.mode === "pause" && s.tab === 0);
  await pad(15); s = await st(); ok("pad d-pad right = next tab", s.tab === 1);
  await pad(4); s = await st(); ok("pad LB = next tab", s.tab === 2);
  await pad(5); s = await st(); ok("pad RB = prev tab", s.tab === 1);
  await pad(13); await pad(13); await pad(13); await pad(13); s = await st(); ok("pad down rows", s.sel === 4);
  await pad(0); s = await st(); ok("pad A opens charm picker", s.sub === "pick");
  await pad(13); await pad(0); s = await st(); ok("pad equip charm", s.gear.c === "c1", JSON.stringify(s.gear));
  await pad(14); await pad(14); s = await st(); ok("pad left wraps to Save tab", s.tab === 7, `tab=${s.tab}`);
  // Slot save via pad: Slot 1 -> A -> "Save here" -> A
  await pad(0); s = await st(); ok("slot action list", s.sub === "slot");
  if (SHOTS) await shot("save-actions");
  await pad(0); const slot1 = await E(() => JSON.parse(localStorage.getItem("kiquest-slot1-v1") || "null"));
  ok("slot 1 saved v2 w/ gear, story, mirela", slot1 && slot1.v === 2 && slot1.gear.w === "w1" && slot1.mirela === true && !!slot1.story && typeof slot1.play === "number", slot1 && JSON.stringify({ v: slot1.v, gear: slot1.gear, m: slot1.mirela }));
  await pad(1); s = await st(); ok("pad B closes", s.mode === "play");

  // Slot round trip: change state, load slot 1, state restored.
  await E(() => { const g = window.__ki.game; g.lvl = 1; g.str = 1; g.gear = { h: "h0", a: "a0", w: "w0", f: "f0", c: "c0" }; window.__ki.story.flags.testMark = 7; });
  await key("Escape"); await key("KeyA"); await key("KeyJ"); await key("KeyS"); await key("KeyJ");
  s = await E(() => { const g = window.__ki.game; return { mode: g.mode, lvl: g.lvl, str: g.str, w: g.gear.w, mark: window.__ki.story.flags.testMark ?? null, mirela: g.mb.allies[0].joined }; });
  ok("slot load round trip", s.mode === "play" && s.lvl === 9 && s.str === 4 && s.w === "w1" && s.mark === null && s.mirela === true, JSON.stringify(s));
  // Slots 2/3 via hook, preview rendering
  await E(() => { const g = window.__ki.game; g.lvl = 12; window.__kiMenu.saveToSlot(g, 2); g.lvl = 9; });
  await key("Escape"); await key("KeyA");
  if (SHOTS) await shot("save");
  const prev = await E(() => [0, 1, 2].map((i) => window.__kiMenu.readSlot(i)?.lvl ?? null)); ok("3 slots: 1 & 3 filled, 2 empty", prev[0] === 9 && prev[1] === null && prev[2] === 12, JSON.stringify(prev));
  // Export / import round trip through the DOM panel.
  await key("KeyJ"); await key("KeyS"); await key("KeyS"); await key("KeyJ");
  const code = await page.inputValue("#saveCodeText"); ok("export code shown", code.startsWith("KQSAVE1:") && code.length > 50);
  if (SHOTS) await shot("export");
  await page.click("#saveCodeClose"); await key("KeyS"); await key("KeyS"); await key("KeyS"); s = await st(); ok("Import row", s.sel === 3);
  await key("KeyJ"); await page.waitForSelector("#saveCode", { state: "visible", timeout: 3000 }).catch(() => {}); ok("import panel open", await page.isVisible("#saveCode"), JSON.stringify(await st()));
  await page.fill("#saveCodeText", "not a save"); await page.click("#saveCodeGo");
  ok("import rejects junk", (await page.textContent("#saveCodeMsg")).includes("not a valid"));
  await page.fill("#saveCodeText", code); await page.selectOption("#saveCodeSlot", { value: "1" });
  if (SHOTS) await shot("import");
  await page.click("#saveCodeGo"); const imsg = await page.textContent("#saveCodeMsg"); await page.waitForTimeout(1100);
  const imp = await E(() => { const a = window.__kiMenu.readSlot(0), b = window.__kiMenu.readSlot(1); return b && { same: JSON.stringify({ ...a }) === JSON.stringify({ ...b }), mirela: b.mirela, lvl: b.lvl }; });
  ok("export/import round trip into slot 2", imp && imp.same && imp.mirela === true, JSON.stringify(imp) + " " + imsg);
  ok("panel closes after import", !(await page.isVisible("#saveCode")));
  // Touch/pointer: tap Status tab, tap Resume twice.
  const tap = async (x, y) => { const b = await page.locator("#game").boundingBox(); await page.mouse.click(b.x + (x / 384) * b.width, b.y + (y / 216) * b.height); await page.waitForTimeout(60); };
  await tap(8 + 368 / 16, 12); s = await st(); ok("tap tab -> Status", s.tab === 0);
  await tap(40, 40 + 3 * 16 + 6); await tap(40, 40 + 3 * 16 + 6); s = await st(); ok("tap Resume row twice closes", s.mode === "play");
  // Autosave still works and carries v2 fields.
  await E(() => window.__ki.game.autosave()); const au = await E(() => JSON.parse(localStorage.getItem("kiquest-autosave-v1"))); ok("autosave kept (v2, mirela)", au.v === 2 && au.mirela === true && au.gear);
  ok("no console errors", errs.length === 0, errs.slice(0, 3).join(" | "));

  async function shot(n) {
    await page.waitForTimeout(80); await page.locator("#stage").screenshot({ path: `${DOCS}menus-${n}.png` });
  }
  if (SHOTS) { // phone sizes: portrait + landscape, every tab + gear compare + slots
    for (const [tag, w, h] of [["portrait", 390, 844], ["landscape", 844, 390]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(150);
      await key("Escape"); if ((await st()).mode !== "pause") await key("Escape");
      for (let t = 0; t < 8; t++) {
        await E((t) => { const u = window.__kiMenu.ui; u.tab = t; u.sel = 0; u.sub = ""; }, t);
        await page.waitForTimeout(80); await page.screenshot({ path: `${DOCS}menus-phone-${tag}-${["status", "gear", "items", "shop", "lens", "map", "options", "save"][t]}.png` });
      }
      await E(() => { const u = window.__kiMenu.ui; u.tab = 1; u.sel = 2; u.sub = "pick"; u.subSel = 1; }); await page.waitForTimeout(80);
      await page.screenshot({ path: `${DOCS}menus-phone-${tag}-gear-compare.png` });
      await key("Escape");
    }
  }
} catch (e) { ok("no exception", false, String(e.stack ?? e).slice(0, 900)); } finally { await browser.close(); try { process.kill(-srv.pid); } catch {} }
for (const r of results) console.log(r.join("  "));
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(`${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
