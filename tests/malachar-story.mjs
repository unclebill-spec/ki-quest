// Malachar story integration: node tests/malachar-story.mjs (after npm run build). KI_PORT to change port. Writes docs/boss4-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4492);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const FL = { introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, sable2: true, tideBossDown: true, sable3: true, stairIn: true, cageDone: true, sableJoin: true, crownShard: true, morvantDown: true, threshold: true, twist: true, malachar: true };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate((FL) => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true, boss3: true, boss4: true, boss5: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify(FL)); }, FL);
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f, a) => page.evaluate(f, a);
  await E(() => { let sd = 4343; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  const st = await E((FL) => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; Object.assign(s.flags, FL); s.save(); s.enter("husk"); return 1; }, FL);
  await page.waitForTimeout(500); ok("husk-sun scene plays on arrival", await E(() => window.__ki.story.flags.huskIn === true && !!window.__ki.story.box));
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(120); }
  const w = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; g.enemies.forEach((e) => { if (e.kind !== "malachar") { e.dead = true; e.respawn = 1e9; } }); g.p.x = M.ARENA6.tx * 16 + 8; g.p.y = M.ARENA6.ty * 16 + 40;
    for (let i = 0; i < 300; i++) { g.p.inv = 1; g.hp = g.maxHp; g.step(1 / 60); } const m = M.malacharOf(g); return { act: g.mb.boss6.active, m: !!m && !m.dead }; });
  ok("real Malachar fight wakes at the sun's heart", w.act && w.m, JSON.stringify(w));
  await page.waitForTimeout(300); await page.screenshot({ path: "docs/bill/malachar-fight.png" });
  const k = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; let n = 0;
    for (; n < 60 * 300 && !window.__ki.story.flags.malacharDown; n++) { g.p.inv = 1; g.hp = g.maxHp; const m = M.malacharOf(g); if (m && !m.dead && n % 20 === 0) { g.mb.boss6.lockT = 0; m.hurt = 0; g.damageFoe(m, Math.ceil(m.max / 40), 0, 0, false); } g.step(1 / 60); }
    return { n, down: !!window.__ki.story.flags.malacharDown, phase: g.mb.boss6.phase }; });
  ok("Malachar killed in a real fight (all phases) sets malacharDown", k.down && k.phase >= 5, JSON.stringify(k));
  await page.waitForFunction(() => window.__ki.story.box?.who === "The Wellsprings", null, { timeout: 5000 }).catch(() => {});
  ok("ending: the Wellsprings are given back", await E(() => window.__ki.story.box?.who === "The Wellsprings" && window.__ki.story.flags.poured === true));
  const seen = new Set(); for (let i = 0; i < 40 && !(await E(() => window.__ki.story.flags.runeSeen === true && !window.__ki.story.box)); i++) { const who = await E(() => window.__ki.story.box?.who ?? ""); seen.add(who); await page.keyboard.press("KeyJ"); await page.waitForTimeout(150); }
  ok("W17: Malachar's last words end on malacharFade (no dawn), Warden Rune intro follows", seen.has("Malachar Vesh") && seen.has("Warden Rune") && await E(() => window.__ki.story.flags.malacharFade === true && !window.__ki.story.flags.dawn), [...seen].join(","));
  await page.waitForTimeout(300);
  const wr = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; let n = 0;
    for (; n < 60 * 400 && !window.__ki.story.flags.runeDown; n++) { g.p.inv = 1; g.hp = g.maxHp; const m = M.runeOf(g); if (m && !m.dead && n % 20 === 0) { g.mb.boss12.lockT = 0; m.hurt = 0; g.damageFoe(m, Math.ceil(m.max / 40), 0, 0, false); } g.step(1 / 60); }
    return { n, down: !!window.__ki.story.flags.runeDown, phase: g.mb.boss12.phase }; });
  ok("Warden Rune killed in a real fight (all 6 phases) sets runeDown", wr.down && wr.phase >= 6, JSON.stringify(wr));
  for (let i = 0; i < 40 && (await E(() => window.__ki.story.credits <= 0)); i++) { const who = await E(() => window.__ki.story.box?.who ?? ""); seen.add(who); await page.keyboard.press("KeyJ"); await page.waitForTimeout(150); }
  ok("Warden Rune's last words + Rook's dawn line", seen.has("Warden Rune") && seen.has("Rook"), [...seen].join(","));
  ok("dawn flag + credits rolling", await E(() => window.__ki.story.flags.dawn === true && window.__ki.story.credits > 0));
  await page.waitForTimeout(4000); await page.screenshot({ path: "docs/bill/credits.png" });
  await page.waitForFunction(() => window.__ki.story.credits < 55, null, { timeout: 60000 }); await page.keyboard.press("KeyJ"); /* W17h: skip opens after 8 s */ await page.waitForTimeout(400);
  ok("credits end, dawn objective", await E(() => window.__ki.story.credits === 0 && window.__ki.story.objective().startsWith("Dawn")));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
