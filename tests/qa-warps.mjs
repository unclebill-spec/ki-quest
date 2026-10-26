// QA warps (?qa=ashmaw|hollowmere|warden): node tests/qa-warps.mjs (after npm run build). KI_PORT.
// Each warp must start next to the right boss, wake it, and never touch the real localStorage save slots.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4497);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const URL0 = `http://localhost:${PORT}/ki-quest/`;
const W = { ashmaw: ["lanternmoss", "boss", [1, 0]], hollowmere: ["hushwater", "boss11", [-1, 0]], warden: ["husk", "boss12", [0, -1]] };
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1152, height: 648 } });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(URL0);
  const SENT = { "kiquest-save-v1": "SENTINEL-save", "kiquest-autosave-v1": "SENTINEL-auto", "kiquest-slot1-v1": "SENTINEL-1", "kiquest-slot2-v1": "SENTINEL-2", "kiquest-slot3-v1": "SENTINEL-3",
    "kiquest-mb-v1": "{\"sentinel\":true}", "kiquest.story.v1": "{\"sentinel\":true}" };
  await page.evaluate((S) => { localStorage.clear(); for (const k in S) localStorage.setItem(k, S[k]); }, SENT);
  for (const [w, [area, key, dir]] of Object.entries(W)) {
    await page.goto(`${URL0}?qa=${w}`); await page.click("#startBtn");
    await page.waitForFunction(() => window.__ki?.game && window.__ki?.story, null, { timeout: 10000 }); await page.waitForTimeout(300);
    const r = await page.evaluate(([key, dir]) => {
      const g = window.__ki.game, s = window.__ki.story, a0 = g.area.id, lvl = g.lvl, obj = s.objective();
      for (let i = 0; i < 900 && !g.mb[key].active; i++) { if (s.box) s.box = null; g.p.x += dir[0] * 1.5; g.p.y += dir[1] * 1.5; g.p.inv = 1; g.step(1 / 60); }
      return { a0, lvl, obj, act: g.mb[key].active, qa: window.__kiQA, banner: g.banner };
    }, [key, dir]);
    ok(`${w}: starts in ${area} (quest line not stuck) and wakes ${key}`, r.a0 === area && r.act && r.qa === w && !/Elder Ama|graveyard keeper/.test(r.obj), JSON.stringify(r));
  }
  const p2 = await ctx.newPage(); await p2.goto(URL0);
  const real = await p2.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  ok("real save slots untouched (sentinels intact, no new keys)", Object.keys(SENT).every((k) => real[k] === SENT[k]) && Object.keys(real).length === Object.keys(SENT).length, JSON.stringify(real));
  const plain = await p2.evaluate(() => window.__kiQA === undefined); ok("no warp without ?qa=", plain);
  ok("no page errors", errs.length === 0, errs.join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const r of results) console.log(r.join("  "));
const f = results.filter((r) => r[0] === "FAIL").length; console.log(`${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
