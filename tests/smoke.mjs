// Smoke test: node tests/smoke.mjs  (needs `npm run build`; uses Playwright from /workspace/tools/game/node)
import { createRequire } from "node:module";
import { spawn, execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const gif = process.argv.includes("--gif");
const srv = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => { results.push([c ? "PASS" : "FAIL", n, d]); };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto("http://localhost:4173/ki-quest/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click("#startBtn");
  const S = () => page.evaluate(() => window.__ki.state());
  let s = await S(); ok("starts in play", s.mode === "play");
  // walk + double-tap run
  const x0 = s.x; await page.keyboard.down("KeyD"); await page.waitForTimeout(400); await page.keyboard.up("KeyD");
  s = await S(); const walk = s.x - x0; ok("8-dir walk moves hero", walk > 15, `dx=${walk.toFixed(1)}`);
  await page.keyboard.press("KeyA"); await page.keyboard.down("KeyA"); await page.waitForTimeout(400);
  const run = await page.evaluate(() => window.__ki.game.p.running); await page.keyboard.up("KeyA");
  ok("double-tap run", run === true);
  await page.keyboard.down("KeyD"); await page.keyboard.down("KeyS"); await page.waitForTimeout(200);
  const d8 = await page.evaluate(() => window.__ki.game.p.dir8); await page.keyboard.up("KeyD"); await page.keyboard.up("KeyS");
  ok("diagonal facing", d8 === 1, `dir8=${d8}`);
  // place a brute next to the hero and combo it
  await page.evaluate(() => { const g = window.__ki.game; const e = g.enemies[0]; g.p.fx = 1; g.p.fy = 0; e.x = g.p.x + 14; e.y = g.p.y; e.state = "recover"; e.t = 5; e.hp = 999; e.max = 999; });
  for (let i = 0; i < 9; i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(90); }
  await page.waitForTimeout(300);
  s = await S(); ok("melee combo hits", s.normals + s.crits >= 3, `normal=${s.normals} crit=${s.crits}`);
  const step3 = await page.evaluate(() => window.__ki.game.stats); 
  // force a crit to check yellow number + knockback
  const crit = await page.evaluate(() => { const g = window.__ki.game, e = g.enemies[0]; const r = Math.random; Math.random = () => 0.01; e.vx = 0; g.damageFoe(e, 10, 300, 0, true); Math.random = r; const n = g.nums[g.nums.length - 1]; return { col: n.col, big: n.big, vx: e.vx }; });
  ok("crit = yellow number + knockback", crit.col === "#ffe14a" && crit.big && crit.vx >= 300, JSON.stringify(crit));
  const norm = await page.evaluate(() => { const g = window.__ki.game, e = g.enemies[0]; g.damageFoe(e, 3, 60, 0, false); return g.nums[g.nums.length - 1].col; });
  ok("normal hit = red number", norm === "#ff4a4a");
  // blast
  const ep0 = (await S()).ep; await page.keyboard.press("KeyK"); await page.waitForTimeout(30);
  s = await S(); ok("ki blast spends EP and spawns shot", s.blasts === 1 && s.ep < ep0 - 7, `ep ${ep0.toFixed(1)}→${s.ep.toFixed(1)}`);
  // block + shield
  await page.keyboard.down("ShiftLeft"); await page.waitForTimeout(100);
  const blk = await page.evaluate(() => window.__ki.game.blocking);
  await page.keyboard.down("KeyK"); await page.waitForTimeout(500);
  const sh = await page.evaluate(() => { const g = window.__ki.game; const hp = g.hp; g.p.inv = 0; g.hurtHero(20, g.p.x + 10, g.p.y); return { shield: g.shield, hpSame: g.hp === hp, ep: g.ep }; });
  await page.keyboard.up("KeyK"); await page.keyboard.up("ShiftLeft");
  ok("block (hold)", blk === true); ok("energy shield blocks damage and drains EP", sh.shield && sh.hpSame && sh.ep < s.ep, JSON.stringify(sh));
  // enemy AI telegraph
  const tele = await page.evaluate(async () => { const g = window.__ki.game; const e = g.enemies[1]; e.hp = 999; e.x = g.p.x + 25; e.y = g.p.y; e.state = "chase"; e.t = 0; for (let i = 0; i < 10; i++) { g.step(1 / 60); if (e.state === "tele") return true; } return e.state; });
  ok("brute telegraphs before lunging", tele === true, String(tele));
  const wt = await page.evaluate(() => { const g = window.__ki.game; const e = g.enemies.find((x) => x.kind === "wisp"); e.x = g.p.x + 90; e.y = g.p.y; e.state = "chase"; e.t = -2; const n0 = g.shots.length; let saw = false; for (let i = 0; i < 70; i++) { g.step(1 / 60); if (e.state === "tele") saw = true; } return { saw, fired: g.shots.some((s) => s.foe) || g.stats.hurt > 0, n0 }; });
  ok("wisp telegraphs then fires", wt.saw && wt.fired, JSON.stringify(wt));
  // EXP + level up via kills
  const lv = await page.evaluate(() => { const g = window.__ki.game; const l0 = g.lvl; for (let k = 0; k < 5; k++) { const e = g.enemies[2 + k]; e.hp = 1; g.damageFoe(e, 5, 0, 0, false); } return { l0, l: g.lvl, pts: g.pts, kills: g.stats.kills }; });
  ok("kills give EXP and level up gives 3 points", lv.l > lv.l0 && lv.pts === 3 * (lv.l - lv.l0), JSON.stringify(lv));
  if (gif) mkdirSync("/tmp/kiq", { recursive: true });
  // pause/status menu: spend a point on STR
  await page.keyboard.press("Escape"); await page.waitForTimeout(50);
  const str0 = (await S()).str; await page.keyboard.press("KeyJ"); await page.waitForTimeout(50);
  s = await S(); ok("status menu spends STR point", s.mode === "pause" && s.str === str0 + 1, `str ${str0}→${s.str}`);
  await page.screenshot({ path: "docs/stage1-status.png", clip: await page.locator("canvas").boundingBox() });
  await page.keyboard.press("Escape"); await page.waitForTimeout(50); await page.keyboard.press("KeyM"); await page.waitForTimeout(50);
  ok("map stub opens", (await S()).mode === "map"); await page.screenshot({ path: "docs/stage1-map.png", clip: await page.locator("canvas").boundingBox() }); await page.keyboard.press("KeyM"); await page.waitForTimeout(50);
  // save pad
  await page.evaluate(() => { const g = window.__ki.game; g.p.x = g.area.pad.x; g.p.y = g.area.pad.y + 20; g.onPad = false; });
  await page.keyboard.down("KeyW"); await page.waitForTimeout(400); await page.keyboard.up("KeyW");
  s = await S(); const saved = await page.evaluate(() => !!localStorage.getItem("kiquest-save-v1"));
  ok("save pad saves", s.saves >= 1 && saved);
  await page.reload(); const label = await page.textContent("#startBtn"); await page.click("#startBtn");
  s = await S(); ok("continue restores level", label === "Continue" && s.lvl === lv.l, `lvl=${s.lvl}`);
  // touch UI present on a touch device context
  const tctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const tp = await tctx.newPage(); await tp.goto("http://localhost:4173/ki-quest/"); await tp.tap("#startBtn");
  await tp.touchscreen.tap(700, 300); const touchOn = await tp.evaluate(() => document.body.classList.contains("touch") && getComputedStyle(document.getElementById("touch")).display !== "none");
  ok("touch controls appear on touch", touchOn); await tctx.close();
  // screenshot scene: hero mid-fight with a blast in flight
  await page.evaluate(() => { const g = window.__ki.game; g.p.x = 15 * 16; g.p.y = 15 * 16; g.p.fx = 1; g.p.fy = 0; const es = g.enemies.filter((e) => !e.dead).slice(0, 3); es.forEach((e, i) => { e.x = g.p.x + 50 + i * 22; e.y = g.p.y - 20 + i * 20; e.state = i === 0 ? "tele" : "chase"; e.t = 0.4; e.ax = -1; e.ay = 0; }); });
  await page.keyboard.press("KeyJ"); await page.waitForTimeout(90); await page.keyboard.press("KeyK"); await page.waitForTimeout(70);
  await page.screenshot({ path: "docs/stage1.png", clip: await page.locator("canvas").boundingBox() });
  if (gif) {
    await page.keyboard.down("KeyD");
    for (let i = 0; i < 36; i++) { if (i % 6 === 0) await page.keyboard.press(i % 12 ? "KeyJ" : "KeyK"); await page.screenshot({ path: `/tmp/kiq/f${String(i).padStart(2, "0")}.png`, clip: await page.locator("canvas").boundingBox() }); }
    await page.keyboard.up("KeyD");
  }
  ok("no page errors", errs.length === 0, errs.join(" | "));
} finally { await browser.close(); srv.kill(); }
if (gif) { execSync(`ffmpeg -loglevel error -y -framerate 10 -i /tmp/kiq/f%02d.png -vf "scale=384:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse" docs/stage1.gif`); rmSync("/tmp/kiq", { recursive: true, force: true }); }
for (const r of results) console.log(r.join("  "));
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(`${results.length - fails}/${results.length} passed`); process.exit(fails ? 1 : 0);
