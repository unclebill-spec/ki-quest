// Morvant story integration: node tests/morvant-story.mjs (after npm run build). KI_PORT to change port. Writes docs/boss4-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4490);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const FL = { introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, sable2: true, tideBossDown: true, sable3: true, stairIn: true, cageDone: true, sableJoin: true, crownShard: true };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate((FL) => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true, boss3: true, boss4: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify(FL)); }, FL);
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f, a) => page.evaluate(f, a);
  await E(() => { let sd = 4343; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  const st = await E((FL) => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; Object.assign(s.flags, FL); s.save(); s.enter("stair"); s.box = null; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; });
    g.p.x = M.ARENA5.tx * 16 + 8; g.p.y = M.ARENA5.ty * 16 + 24; for (let i = 0; i < 240; i++) { g.p.inv = 1; g.hp = g.maxHp; g.step(1 / 60); } const m = M.morvantOf(g); return { act: g.mb.boss5.active, m: !!m && !m.dead, th: !!s.flags.threshold }; }, FL);
  ok("real Morvant fight starts on the top ring (stone still shut)", st.act && st.m && !st.th, JSON.stringify(st));
  await page.waitForTimeout(300); await page.screenshot({ path: "docs/bill/morvant.png" });
  const k = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; let n = 0;
    for (; n < 60 * 240 && !window.__ki.story.flags.morvantDown; n++) { g.p.inv = 1; g.hp = g.maxHp; const m = M.morvantOf(g); if (m && !m.dead && n % 20 === 0) { g.mb.boss5.lockT = 0; m.hurt = 0; g.damageFoe(m, Math.ceil(m.max / 40), 0, 0, false); } g.step(1 / 60); }
    return { n, down: !!window.__ki.story.flags.morvantDown, phase: g.mb.boss5.phase }; });
  ok("Morvant killed in a real fight sets morvantDown", k.down, JSON.stringify(k));
  await page.waitForFunction(() => window.__ki.story.box?.who === "Morvant", null, { timeout: 5000 }).catch(() => {});
  ok("ASCEND line plays and threshold opens", await E(() => window.__ki.story.box?.who === "Morvant" && /ASCEND/.test(JSON.stringify(window.__ki.story.box)) && window.__ki.story.flags.threshold === true));
  for (let i = 0; i < 60 && (await E(() => !!window.__ki.story.box)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(120); }
  await E(() => { const g = window.__ki.game, t = g.area.travel.find((t) => t.to === "husk"); window.__ki.story.flags.stoneT = false; g.p.x = t.x; g.p.y = t.y + 30; });
  for (let i = 0; i < 12; i++) { await E(() => { const g = window.__ki.game, t = g.area.travel.find((t) => t.to === "husk"); if (t) g.p.y = Math.max(t.y, g.p.y - 3); }); await page.waitForTimeout(80); }
  ok("stone offers the ride to the Husk Sun", /Husk Sun/.test(await E(() => JSON.stringify(window.__ki.story.box?.lines))));
  for (let i = 0; i < 6 && (await E(() => !!window.__ki.story.box)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(150); }
  await page.waitForFunction(() => window.__ki.game.area.id === "husk", null, { timeout: 8000 }).catch(() => {});
  ok("top-ring stone carries the party into the Husk Sun", await E(() => window.__ki.game.area.id === "husk"));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
