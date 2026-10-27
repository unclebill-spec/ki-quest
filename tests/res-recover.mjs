// W17l.2/.3: Auto resolution recovers. Two one-off 300 ms stalls must not drop the scale; sustained slowness (CPU throttle)
// steps it down; ~10 s of steady fps (W17l.3) steps it back up toward the cap. Manual presets never move.
// KI_PORT=4522 node tests/res-recover.mjs   (needs `npm run build`; Playwright from /workspace/tools/game/node)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const { chromium } = createRequire("/workspace/tools/game/node/")("playwright");
const PORT = Number(process.env.KI_PORT || 4522);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore", detached: true });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true })); });
  await page.reload(); await wait(300); await page.click("#startBtn"); await wait(2500);
  const r = () => page.evaluate(() => document.getElementById("game").width / 384);
  const r0 = await r(); ok("Auto starts at the cap (960x540 -> 2x)", r0 === 2, `r=${r0}`);
  await page.evaluate(() => new Promise((res) => { const stall = () => { const t = performance.now(); while (performance.now() - t < 300); }; stall(); setTimeout(() => { stall(); res(); }, 350); }));
  await wait(1500); ok("two one-off 300 ms stalls do not drop the scale", (await r()) === r0, `r=${await r()}`);
  const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 40 });
  let low = r0; for (let i = 0; i < 20 && low >= r0; i++) { await wait(500); low = await r(); }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("sustained slowness steps down", low < r0, `r=${low}`);
  let back = low, t0 = Date.now(); for (let i = 0; i < 40 && back < r0; i++) { await wait(500); back = await r(); }
  ok("steady fps steps back up to the cap", back === r0, `r=${back} after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // W17l.3 flap check: a step-up that fails ~5 s later bans that level (30 s), so 15 s of good fps must NOT retry it.
  const drop = async () => { await cdp.send("Emulation.setCPUThrottlingRate", { rate: 40 }); let x = r0; for (let i = 0; i < 20 && x >= r0; i++) { await wait(500); x = await r(); } await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); return x; };
  await wait(5000); const d2 = await drop(); await wait(15000); const held = await r();
  ok("a step-up that fails within 10 s is banned (no retry in the next 15 s)", d2 < r0 && held === d2, `drop=${d2} after15s=${held}`);
  await page.evaluate(() => localStorage.setItem("kiquest-opt-res", "Sharp")); await page.evaluate(() => dispatchEvent(new Event("kq-res")));
  const rb = await r(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 40 }); await wait(3000); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("manual preset (Sharp) never steps", (await r()) === rb, `r=${rb}->${await r()}`);
  ok("no page errors", errs.length === 0, errs.join(" | ").slice(0, 300));
} catch (e) { ok("no exception", false, String(e.stack ?? e).slice(0, 900)); } finally { await browser.close(); try { process.kill(-srv.pid); } catch {} }
for (const x of results) console.log(x.join("  "));
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(`${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
