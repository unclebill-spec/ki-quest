// W18: a FRESH save (localStorage cleared, New Game) can finish Linnet's Letters and keep Linnet's Locket (c2) across a reload.
// node tests/locket.mjs (after npm run build). KI_PORT to change port. Writes no PNGs.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4494);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  const E = (f, a) => page.evaluate(f, a);
  await page.click((await page.isVisible("#newBtn")) ? "#newBtn" : "#startBtn"); await page.waitForTimeout(600);
  const close = async () => { for (let i = 0; i < 40 && (await E(() => !!window.__ki.story.box || window.__ki.story.intro >= 0)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(120); } };
  await close();
  ok("fresh save: no letters flags, no Locket", await E(() => { const f = window.__ki.story.flags; return !f.lettersQ && !f.lettersDone && !window.__ki.game.have.includes("c2"); }));
  const go = (a) => E((a) => { const s = window.__ki.story; s.enter(a); s.box = null; window.__ki.game.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); }, a);
  const talk = async (id) => { const n = await E((id) => { const g = window.__ki.game, n = g.area.npcs.find((n) => n.id === id); if (!n) return null; g.p.x = n.x + 14; g.p.y = n.y; g.p.fx = -1; g.p.fy = 0; return true; }, id);
    if (!n) return false; await page.waitForTimeout(120); await page.keyboard.press("KeyJ"); await page.waitForTimeout(300); await close(); return true; };
  const step = async (n) => { await page.waitForTimeout(200); await E((n) => { const g = window.__ki.game; for (let i = 0; i < n; i++) { g.p.inv = 1; g.step(1 / 60); } }, n); await close(); };
  // W18.1: HUD text must fit the 384-unit base width (8px monospace; toast max W-24, objective max W-12), wording unchanged
  const fits = []; const fit = async (what, max) => { const r = await E(([what, max]) => { const g = window.__ki.game, s = what === "toast" ? g.toast : window.__ki.story.objective(); const c = document.createElement("canvas").getContext("2d"); c.font = "8px monospace";
    const L = window.__kiText.wrap(c, s, max); return { s, full: c.measureText(s).width, ok: L.every((l) => c.measureText(l).width <= max) && L.join(" ") === s, n: L.length }; }, [what, max]); fits.push([what, r]); };
  await go("hushwater"); await talk("m"); await talk("r"); await fit("toast", 360); await fit("obj", 372);
  ok("Orrin starts the quest on a fresh save", await E(() => window.__ki.story.flags.lettersQ === true && window.__ki.story.flags.lettersN === 1));
  for (const [x, y] of [[14, 22], [33, 24], [44, 11]]) { await E(([x, y]) => { const g = window.__ki.game; g.p.x = x * 16 + 8; g.p.y = y * 16 + 8; }, [x, y]); await step(6); await fit("toast", 360); await fit("obj", 372); }
  const e0 = await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1e6);
  await talk("m"); await fit("obj", 372);
  ok("Mirela reads the 4 letters (+EXP)", await E(() => window.__ki.story.flags.lettersRead === true) && (await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1e6)) > e0);
  // main-quest prerequisite only (the Lantern Oath chain is a separate quest)
  await E(() => { Object.assign(window.__ki.story.flags, { bell: true, bellDone: true, reedQ: true, reedDone: true, oath: true }); window.__ki.story.save(); });
  await go("lanternmoss"); await E(() => { const g = window.__ki.game; g.p.x = 3 * 16 + 8; g.p.y = 32 * 16 + 8; }); await step(4); await step(2);
  await fit("obj", 372);
  ok("Linnet wakes", await E(() => window.__ki.story.flags.linnetWoke === true && window.__ki.game.area.npcs.some((n) => n.id === "l")));
  await talk("l"); await step(40);
  ok("lettersDone set and Locket granted", await E(() => window.__ki.story.flags.lettersDone === true && window.__ki.game.have.includes("c2")));
  const e1 = await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1e6); await talk("l"); await step(2);
  ok("talking again gives no second reward (EXP same, exactly one Locket)", (await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1e6)) === e1 && (await E(() => window.__ki.game.have.filter((x) => x === "c2").length)) === 1);
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(800); await close(); await step(40);
  ok("after reload + Continue: lettersDone kept", await E(() => window.__ki.story.flags.lettersDone === true));
  ok("after reload + Continue: exactly one Locket owned", await E(() => window.__ki.game.have.filter((x) => x === "c2").length === 1));
  ok("every letter toast + objective line fits the base width (wrapped, wording kept)", fits.filter(([w]) => w === "toast").length === 4 && fits.length >= 10 && fits.every(([, r]) => r.ok && r.s.length > 0), JSON.stringify(fits.filter(([, r]) => !r.ok)));
  ok("fit check is real (some texts were wider than the screen and got wrapped)", fits.some(([, r]) => r.full > 384 - 24 && r.n > 1), JSON.stringify(fits.map(([w, r]) => [w, Math.round(r.full), r.n])));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
