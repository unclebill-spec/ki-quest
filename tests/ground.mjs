// Ground-texture shots + fps: node tests/ground.mjs <before|after> [fresh|midquest]  (midquest = W20: Linnet awake + 2/4 letters, so Linnet's motes and the compass are active in the fps runs)  (after `npx vite build`; KI_PORT, default 4181)
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const { chromium } = createRequire("/workspace/tools/game/node/")("playwright");
const PORT = String(process.env.KI_PORT || 4181), TAG = process.argv[2] || "after", SAVE = process.argv[3] || process.env.KI_GROUND_SAVE || "fresh";
const srv = spawn("npx", ["vite", "preview", "--port", PORT, "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const b = await chromium.launch(); const errs = [];
try {
  const p = await b.newPage({ viewport: { width: 1152, height: 648 } });
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`http://localhost:${PORT}/ki-quest/`); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click("#startBtn"); await p.waitForTimeout(700);
  for (let i = 0; i < 5; i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(500); }
  if (SAVE === "midquest") await p.evaluate(() => { const s = window.__ki.story; Object.assign(s.flags, { introSeen: true, oath: true, linnetWoke: true, lettersQ: true, lettersN: 2 }); s.save(); });
  const spots = [["lanternmoss", "wickhaven", 12, 6], ["lanternmoss", "fen", 7, 22], ["lanternmoss", "woods", 28, 18], ["hushwater", "town", 24, 9], ["hushwater", "meadow", 20, 24]];
  for (const [area, n, tx, ty] of spots) {
    await p.evaluate(([a, tx, ty]) => { const k = window.__ki; if (k.game.area.id !== a) k.story.enter(a); const g = k.game; g.enemies.forEach((e) => (e.dead = true)); g.p.x = tx * 16 + 8; g.p.y = ty * 16 + 8; g.time = 0; k.story.box = null; k.story.intro = -1; k.story.flags.introSeen = true; g.bannerT = 0; }, [area, tx, ty]);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `docs/ground_${TAG}${SAVE === "midquest" ? "_mq" : ""}_${n}.png`, clip: await p.locator("canvas").boundingBox() });
  }
  const cdp = await p.context().newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const measure = () => p.evaluate(() => new Promise((res) => { const g = window.__ki.game; let n = 0; const t0 = performance.now(); const tick = () => { n++; g.p.x = 200 + ((performance.now() - t0) / 5) % 400; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(n / 3); }; requestAnimationFrame(tick); }));
  const fps = await measure();
  console.log(`fps @4x throttle (${TAG}, ${SAVE}, hushwater meadow): ${fps.toFixed(1)}  errors: ${errs.length}`);
  if (SAVE === "midquest") {
    const cs = await p.evaluate(() => { const c = window.__kiText.hud.compass; return { shown: !!c.shown, target: !!c.target }; });
    console.log(`midquest compass active: ${cs.shown || cs.target} ${JSON.stringify(cs)}`);
    await p.evaluate(() => { const k = window.__ki, g = k.game; k.story.enter("lanternmoss"); g.enemies.forEach((e) => (e.dead = true)); k.story.box = null; g.bannerT = 0; });
    await p.waitForTimeout(300);
    const m0 = await p.evaluate(() => { const k = window.__ki, g = k.game, n = g.area.npcs.find((q) => q.id === "l"); if (n) { g.p.x = n.x + 30; g.p.y = n.y + 10; } return window.__kiText.hud.motes.n; });
    const f2 = await p.evaluate(() => new Promise((res) => { const g = window.__ki.game, n = g.area.npcs.find((q) => q.id === "l"); let k = 0; const t0 = performance.now(); const tick = () => { k++; if (n) { g.p.x = n.x + 20 + ((performance.now() - t0) / 20) % 40; g.p.y = n.y + 10; } if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(k / 3); }; requestAnimationFrame(tick); }));
    const m1 = await p.evaluate(() => window.__kiText.hud.motes.n);
    console.log(`fps @4x throttle (${TAG}, ${SAVE}, lanternmoss by Linnet, motes ${m1 - m0} emitted): ${f2.toFixed(1)}  errors: ${errs.length}`);
    if (!(cs.shown || cs.target) || m1 - m0 < 1) { console.log("FAIL midquest: compass or motes not active"); errs.push("midquest inactive"); }
  }
} finally { await b.close(); srv.kill(); }
process.exit(errs.length ? 1 : 0);
