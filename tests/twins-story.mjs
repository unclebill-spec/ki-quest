// Twins story integration: node tests/twins-story.mjs (after npm run build). KI_PORT to change port. Writes docs/boss4-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4488);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const FL = { introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, sable2: true, tideBossDown: true, sable3: true, stairIn: true };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate((FL) => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true, boss3: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify(FL)); }, FL);
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f, a) => page.evaluate(f, a);
  await E(() => { let sd = 4343; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  const st = await E((FL) => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; Object.assign(s.flags, FL); s.save(); s.enter("stair"); s.box = null; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; });
    g.p.x = M.ARENA4.tx * 16 + 8; g.p.y = M.ARENA4.ty * 16 + 40; for (let i = 0; i < 240; i++) { g.p.inv = 1; g.hp = g.maxHp; g.step(1 / 60); } return { act: g.mb.boss4.active, twins: M.twinsOf(g).filter((e) => !e.dead).length }; }, FL);
  ok("real Twins fight starts in the Red Cage", st.act && st.twins === 2, JSON.stringify(st));
  await page.waitForTimeout(300); await page.screenshot({ path: "docs/bill/twins.png" });
  const k = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; let n = 0;
    for (; n < 60 * 180 && !window.__ki.story.flags.cageDone; n++) { g.p.inv = 1; g.hp = g.maxHp; if (n % 20 === 0) { g.mb.boss4.lockT = 0; for (const p of M.pylonsOf(g)) if (!p.dead) { p.hurt = 0; g.damageFoe(p, Math.ceil(p.max / 6), 0, 0, false); } for (const e of M.twinsOf(g)) if (!e.dead) { e.hurt = 0; g.damageFoe(e, Math.ceil(e.max / 40), 0, 0, false); } } g.step(1 / 60); }
    return { n, cageDone: !!window.__ki.story.flags.cageDone, phase: g.mb.boss4.phase }; });
  ok("Twins killed in a real fight set cageDone", k.cageDone, JSON.stringify(k));
  await page.waitForFunction(() => window.__ki.story.box?.who, null, { timeout: 5000 }).catch(() => {});
  const who = await E(() => window.__ki.story.box?.who); ok("Sable join scene plays", await E(() => window.__ki.story.flags.sableJoin === true) && !!who, String(who));
  for (let i = 0; i < 60 && (await E(() => !!window.__ki.story.box)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(150); }
  const f = await E(() => { const g = window.__ki.game, a = g.mb.allies.find((a) => a.id === "sable"); g.p.x -= 120; for (let i = 0; i < 180; i++) { g.p.inv = 1; g.step(1 / 60); } return { joined: a.joined, d: Math.round(Math.hypot(a.x - g.p.x, a.y - g.p.y)) }; });
  ok("Sable follows the party", f.joined && f.d < 90, JSON.stringify(f));
  await page.waitForTimeout(300); await page.screenshot({ path: "docs/bill/sable.png" });
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
