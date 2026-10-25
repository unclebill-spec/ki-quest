// Mini-boss lead-ins (Kettle, Corvin, Ombrelle, Capmother): node tests/minibosses-story.mjs. KI_PORT to change port.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4630);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, metAma: true })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f, a) => page.evaluate(f, a);
  const who = () => E(() => window.__ki.story.box?.who ?? null);
  const go = (a, tx, ty, fl) => E(({ a, tx, ty, fl }) => { const g = window.__ki.game, s = window.__ki.story; Object.assign(s.flags, fl); s.box = null; s.enter(a); s.box = null; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); g.p.x = tx * 16 + 8; g.p.y = ty * 16 + 8; }, { a, tx, ty, fl });
  const lines = () => E(() => (window.__ki.story.box?.lines ?? []).join(" "));
  // gate closed -> nothing fires
  await go("lanternmoss", 39, 27, { metAma: true }); await page.waitForTimeout(500);
  ok("Capmother ring silent before capQ", !(await E(() => window.__ki.story.flags.capSeen)));
  // Odile hands out capQ
  const od = await E(() => { const s = window.__ki.story, g = window.__ki.game; s.box = null; const n = g.area.npcs.find((n) => n.id === "o"); g.p.x = n.x; g.p.y = n.y + 14; return !!n; });
  for (let i = 0; i < 12 && !(await E(() => window.__ki.story.flags.capQ)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(200); }
  ok("Odile gives The Capmother's Ring (capQ)", od && (await E(() => !!window.__ki.story.flags.capQ)), JSON.stringify(await E(() => ({ near: window.__ki.story.near, box: window.__ki.story.box?.who ?? null, mode: window.__ki.game.mode, area: window.__ki.game.area.id, ama: window.__ki.story.flags.metAma }))));
  const cases = [
    ["Capmother", "lanternmoss", 39, 27, {}, "capSeen", /Capmother/],
    ["Corvin", "hushwater", 25, 25, { reedQ: true }, "corvinSeen", /bell sleeps/],
    ["Ombrelle", "hushwater", 40, 7, { oath: true }, "ombrelleSeen", /grave-girl/],
    ["Kettle", "emberquarry", 26, 12, { brannQ: true }, "kettleSeen", /CLOCKS OUT/],
  ];
  for (const [n, a, tx, ty, fl, flag, re] of cases) {
    await go(a, tx, ty, fl); await page.waitForFunction((f) => window.__ki.story.flags[f], flag, { timeout: 4000 }).catch(() => {});
    const l = await lines(); ok(`${n} lead-in plays at (${tx},${ty}) and sets ${flag}`, re.test(l), l.slice(0, 80));
    if (n === "Kettle") await page.screenshot({ path: "docs/bill/kettle-leadin.png" });
    await E(() => { window.__ki.story.box = null; });
  }
  await go("hushwater", 20, 20, { ombrelleDown: true }); await page.waitForFunction(() => window.__ki.story.flags.ombrelleBeat, null, { timeout: 4000 }).catch(() => {});
  { const l = await lines(); ok("Sable's crypt-stair beat after Ombrelle (ombrelleBeat)", /drinks it/.test(l), l.slice(0, 80)); await E(() => { window.__ki.story.box = null; }); }
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const r of results) console.log(r.join("  ")); const f = results.filter((r) => r[0] !== "PASS").length; console.log(`${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
