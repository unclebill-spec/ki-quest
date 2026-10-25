// HD2D W14: gear v2 sources, mob drops, consumables, quick heal, revive prompt, save migration.
// KI_PORT=4710 node tests/loot.mjs   (needs `npm run build`; Playwright from /workspace/tools/game/node)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4710);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore", detached: true });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  // Old save: pre-v2 gear ids (w3 = Brann's old fist, c2 old charm) + mirela; boss flag already set.
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, quarryBossDown: true }));
    localStorage.setItem("kiquest-save-v1", JSON.stringify({ v: 2, at: 5, area: "Lanternmoss Hollow", areaId: "lanternmoss", play: 9, x: 0, y: 0, lvl: 14, exp: 0, pts: 0, str: 4, pow: 5, end: 6, hp: 50, ep: 40, tf: 0, mirela: true, gear: { w: "w3", a: "a2", c: "c2" } })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(300);
  const E = (f, a) => page.evaluate(f, a);
  let s = await E(() => { const g = window.__ki.game; return { gear: { ...g.gear }, have: [...g.have], coins: g.coins, items: { ...g.items }, mirela: g.mb.allies[0].joined }; });
  ok("old gear ids remapped by name", s.gear.w === "w6" && s.gear.a === "a3" && s.gear.c === "c4" && s.gear.h === "h0" && s.gear.f === "f0", JSON.stringify(s.gear));
  ok("old save keeps mirela, coins/items default 0", s.mirela === true && s.coins === 0 && s.items.morsel === 0 && s.items.tear === 0);
  const L = await E(() => window.__kiLoot.GEAR.filter((x) => x.src === "L" && x.lvl <= 14).map((x) => x.id));
  ok("old save gets every L item for its level", L.every((id) => s.have.includes(id)), L.filter((id) => !s.have.includes(id)).join());
  ok("boss flag already set -> Slagplate Vest owned", s.have.includes("a4"));
  // Level source: new L item appears when level reaches it.
  s = await E(async () => { const g = window.__ki.game, nx = window.__kiLoot.GEAR.filter((x) => x.src === "L").sort((a, b) => b.lvl - a.lvl)[0], l0 = g.lvl; g.lvl = nx.lvl - 1; g.have = g.have.filter((x) => x !== nx.id); await new Promise((r) => setTimeout(r, 700)); const early = g.have.includes(nx.id); g.lvl = nx.lvl; await new Promise((r) => setTimeout(r, 700)); const has = g.have.includes(nx.id); g.lvl = Math.max(l0, nx.lvl); return { id: nx.id, has, early }; });
  ok("level source unlocks on level-up", s.has && !s.early, JSON.stringify(s));
  // Boss drop source via MB done flag.
  s = await E(async () => { const g = window.__ki.game, it = window.__kiLoot.GEAR.find((x) => x.src === "B" && x.at === "rune"); g.mb.boss.done = true; await new Promise((r) => setTimeout(r, 700)); return { id: it.id, has: g.have.includes(it.id) }; });
  ok("boss source: Warden Rune downed grants its drop", s.has, s.id);
  // Shop: buy needs coins and the right area.
  s = await E(() => { const g = window.__ki.game; const a = g.buy("h1"); g.coins = 999; const b = g.buy("h1"), c = g.buy("h1"), d = g.buy("f3"); const t = g.buyItem("tear"); const m = g.buyItem("morsel"); return { a, b, c, d, t, m, has: g.have.includes("h1"), coins: g.coins, mo: g.items.morsel }; });
  ok("shop buy: coins gate, owned, wrong area", s.a === "not enough coins" && s.b === "" && s.c === "owned" && s.d === "not sold here" && s.has, JSON.stringify(s));
  ok("shop consumables: morsel 20c, no Tears in Wickhaven", s.m === "" && s.mo === 1 && s.t === "not sold here" && s.coins === 999 - 30 - 20, JSON.stringify(s));
  // Random drops: forced gear drop, pick up, duplicate -> coins.
  s = await E(() => { const g = window.__ki.game, L = window.__kiLoot; g.have = g.have.filter((x) => x !== "f1"); L.debug.force = { gear: "f1", coins: 0 }; L.rollKill(g, g.p.x, g.p.y, false); const n = g.drops.length; return { n }; });
  await page.waitForTimeout(200);
  s = { ...s, ...(await E(() => { const g = window.__ki.game; return { has: g.have.includes("f1"), toast: g.toast, left: g.drops.length }; })) };
  ok("forced mob gear drop picked up with toast", s.n === 1 && s.has && s.left === 0 && /Found: /.test(s.toast), JSON.stringify(s));
  s = await E(async () => { const g = window.__ki.game, L = window.__kiLoot, c0 = g.coins; L.debug.force = { gear: "f1", coins: 0 }; L.rollKill(g, g.p.x, g.p.y, false); await new Promise((r) => setTimeout(r, 200)); return { d: g.coins - c0 }; });
  ok("duplicate gear drop becomes coins", s.d === 5, JSON.stringify(s));
  s = await E(() => { const g = window.__ki.game, L = window.__kiLoot; L.seed(12345); let gear = 0, coins = 0; const c0 = g.coins; g.drops = [];
    for (let i = 0; i < 2000; i++) { L.rollKill(g, -9999, -9999, false); } gear = g.drops.filter((d) => d.kind === "gear").length; const it = g.drops.filter((d) => d.kind === "item"); coins = g.coins - c0; g.drops = []; L.seed(0);
    return { gear, morsel: it.filter((d) => d.id === "morsel").length, berry: it.filter((d) => d.id === "berry").length, tear: it.filter((d) => d.id === "tear").length, coins }; });
  ok("seeded drop rates near 3% gear / 10% morsel / 2% berry / 1% tear", s.gear > 30 && s.gear < 95 && s.morsel > 140 && s.morsel < 270 && s.berry > 20 && s.berry < 65 && s.tear > 6 && s.tear < 40 && s.coins >= 2000, JSON.stringify(s));
  s = await E(() => { const g = window.__ki.game, L = window.__kiLoot; g.items = { morsel: 0, berry: 0, tear: 0 }; L.rollKill(g, 0, 0, true); return { ...g.items }; });
  ok("boss drops 1 Kindleberry + 1 Wellspring Tear", s.berry === 1 && s.tear === 1);
  // Quick heal: morsel first, cooldown, then berry when out of morsels; stun blocks.
  s = await E(async () => { const g = window.__ki.game, L = window.__kiLoot; const w = (ms) => new Promise((r) => setTimeout(r, ms)); g.useCd = 0; g.stunT = 0;
    g.items = { morsel: 1, berry: 1, tear: 0 }; g.hp = 10; const r1 = L.quickHeal(g); const hp1 = g.hp; const r2 = L.quickHeal(g); await w(1100);
    g.hp = 10; g.tf = 0; const r3 = L.quickHeal(g); const hp3 = g.hp, tf3 = g.tf; await w(1100); g.items.morsel = 1; g.stunT = 0.4; const r4 = L.quickHeal(g);
    return { r1, r2, r3, r4, hp1, hp3, tf3, max: g.maxHp, exp: Math.round(10 + g.maxHp * 0.35) }; });
  ok("quick heal uses Glowcap Morsel (35%)", s.r1 === "" && Math.abs(s.hp1 - Math.min(s.max, s.exp)) <= 1, JSON.stringify(s));
  ok("quick heal 1 s cooldown", s.r2 === "cooldown");
  ok("no morsels -> Kindleberry: full HP + tf 100", s.r3 === "" && s.hp3 === s.max && s.tf3 === 100, JSON.stringify(s));
  ok("hit-stun blocks quick heal", s.r4 === "stunned");
  // Keyboard: H tap = morsel, G = berry, H hold 0.5 s = berry.
  await E(() => { const g = window.__ki.game; g.items = { morsel: 2, berry: 2, tear: 0 }; g.useCd = 0; g.stunT = 0; g.hp = 5; });
  await page.keyboard.press("KeyH"); await page.waitForTimeout(150);
  s = await E(() => ({ ...window.__ki.game.items })); ok("H tap uses a Morsel", s.morsel === 1 && s.berry === 2, JSON.stringify(s));
  await page.waitForTimeout(1000); await page.keyboard.press("KeyG"); await page.waitForTimeout(150);
  s = await E(() => ({ ...window.__ki.game.items })); ok("G uses a Kindleberry", s.berry === 1 && s.morsel === 1, JSON.stringify(s));
  await page.waitForTimeout(1000); await page.keyboard.down("KeyH"); await page.waitForTimeout(700); await page.keyboard.up("KeyH"); await page.waitForTimeout(150);
  s = await E(() => ({ ...window.__ki.game.items })); ok("H hold 0.5 s uses a Kindleberry", s.berry === 0 && s.morsel === 1, JSON.stringify(s));
  s = await E(() => { const b = document.querySelector("#healBtn"); return b && b.getAttribute("data-n"); }); ok("touch heal button with count badge", s === "1", String(s));
  // Revive prompt: Yes (keyboard) -> 50% HP + 2 s inv; world paused.
  const die = () => E(() => { const g = window.__ki.game; g.p.inv = 0; g.shield = 0; g.blocking = false; g.hp = 1; g.hurtHero(999, g.p.x + 10, g.p.y); return g.mode; });
  await E(() => { window.__ki.game.items.tear = 2; });
  s = await die(); ok("death with a Tear opens revive prompt", s === "revive", s);
  const snap = () => E(() => { const g = window.__ki.game; return JSON.stringify([g.play, g.p.x, g.p.y, g.enemies.map((e) => [Math.round(e.x), Math.round(e.y)])]); });
  const t0 = await snap(); await page.waitForTimeout(300); const t1 = await snap();
  ok("revive prompt pauses the action", t1 === t0, t0.slice(0, 80));
  await page.keyboard.press("KeyJ"); await page.waitForTimeout(150);
  s = await E(() => { const g = window.__ki.game; return { mode: g.mode, hp: g.hp, max: g.maxHp, inv: g.p.inv, tear: g.items.tear }; });
  ok("revive Yes: 50% HP, ~2 s invulnerable, Tear used", s.mode === "play" && s.hp === Math.ceil(s.max * 0.5) && s.inv > 1.5 && s.tear === 1, JSON.stringify(s));
  // No (touch tap on the No button) -> normal faint at the save pad.
  await die();
  await E(() => { const g = window.__ki.game; g.p.x += 200; });
  const b = await page.locator("#game").boundingBox(); await page.mouse.click(b.x + ((92 + 100) / 384) * b.width, b.y + ((70 + 60) / 216) * b.height); await page.waitForTimeout(150);
  s = await E(() => { const g = window.__ki.game; return { mode: g.mode, hp: g.hp, max: g.maxHp, tear: g.items.tear, atPad: Math.hypot(g.p.x - g.area.start.x, g.p.y - g.area.start.y) < 2 }; });
  ok("revive No (tap): faint at last spring, Tear kept", s.mode === "play" && s.hp === s.max && s.tear === 1 && s.atPad, JSON.stringify(s));
  // Save round trip carries v2 fields.
  s = await E(() => { const g = window.__ki.game; g.coins = 77; g.autosave(); const r = JSON.parse(localStorage.getItem("kiquest-autosave-v1")); return { gv: r.gv, coins: r.coins, items: r.items, have: r.have.length, mirela: r.mirela, h: r.gear.h }; });
  ok("save carries gv/have/coins/items/mirela", s.gv === 2 && s.coins === 77 && s.items.tear === 1 && s.have > 10 && s.mirela === true && !!s.h, JSON.stringify(s));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} catch (e) { ok("no exception", false, String(e.stack ?? e).slice(0, 900)); } finally { await browser.close(); try { process.kill(-srv.pid); } catch {} }
for (const r of results) console.log(r.join("  "));
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(`${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
