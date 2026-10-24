// Count Aurel (Undertide boss) checks: node tests/aurel-story.mjs (after npm run build). KI_PORT to change port. Writes docs/boss3-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4396);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, sable2: true, sable1: true, sigilDone: true })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f) => page.evaluate(f);
  await E(() => { let sd = 4242; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  const st = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; s.enter("undertide"); s.box = null; g.enemies.forEach((e) => { if (e.kind !== "aurel") { e.dead = true; e.respawn = 1e9; } });
    const sp = M.springOf(g); g.p.x = sp.x + 40; g.p.y = sp.y + 10; for (let i = 0; i < 240; i++) { g.p.inv = 1; g.hp = g.maxHp; g.step(1 / 60); } return { act: g.mb.boss3.active, boss: !!g.enemies.find((e) => e.kind === "aurel" && !e.dead) }; });
  ok("real Aurel fight starts in the Undertide", st.act && st.boss, JSON.stringify(st));
  await page.waitForTimeout(300); await page.screenshot({ path: "docs/bill/aurel.png" });
  // real kill: whittle him down through all phases with damageFoe, letting the fight step
  const k = await E(() => { const g = window.__ki.game; let n = 0; for (; n < 60 * 120; n++) { const b = g.enemies.find((e) => e.kind === "aurel" && !e.dead); if (!b) break; g.p.inv = 1; g.hp = g.maxHp; if (n % 20 === 0) { g.mb.boss3.lockT = 0; b.hurt = 0; g.damageFoe(b, Math.ceil(b.max / 40), 0, 0, false); } g.step(1 / 60); } for (let i = 0; i < 60; i++) g.step(1 / 60); return { n, flag: window.__ki.story.flags.tideBossDown, phase: g.mb.boss3.phase }; });
  ok("Aurel killed in a real fight sets tideBossDown", k.flag === true, JSON.stringify(k));
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(150); }
  await E(() => { window.__ki.story.box = null; window.__ki.story.enter("drowned"); }); await page.waitForTimeout(800);
  ok("Archive reveal plays after the real kill", await E(() => window.__ki.story.flags.twist === true && window.__ki.story.box?.who === "The Archive"));
  for (let i = 0; i < 60 && (await E(() => !window.__ki.story.flags.malachar)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(150); }
  ok("Malachar unmasked", await E(() => window.__ki.story.flags.malachar === true));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
