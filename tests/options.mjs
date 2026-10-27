// W17l: Options tab — Resolution setting persists per device (localStorage) and resizes the backing store; Quit returns to the title.
// KI_PORT=4521 node tests/options.mjs   (needs `npm run build`; Playwright from /workspace/tools/game/node)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const { chromium } = createRequire("/workspace/tools/game/node/")("playwright");
const PORT = Number(process.env.KI_PORT || 4521);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore", detached: true });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true })); });
  await page.reload(); await page.waitForTimeout(300);
  const E = (f, a) => page.evaluate(f, a);
  const cw = () => E(() => document.getElementById("game").width);
  ok("Auto default: backing store at device pixels (1920x1080 @2x -> r=6 cap)", (await cw()) === 384 * 6, `w=${await cw()}`);
  await page.click("#startBtn"); await page.waitForTimeout(300);
  const key = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(80); };
  await key("Escape"); await E(() => { const u = window.__kiMenu.ui; u.tab = 6; u.sel = 2; u.sub = ""; }); await page.waitForTimeout(80);
  await key("KeyJ");
  let res = await E(() => localStorage.getItem("kiquest-opt-res"));
  ok("Resolution cycles Auto -> Performance, stored in localStorage", res === "Performance", res);
  ok("Performance = 1x backing store", (await cw()) === 384, `w=${await cw()}`);
  await key("KeyJ"); res = await E(() => localStorage.getItem("kiquest-opt-res"));
  ok("-> Balanced (half of full 10x -> 5x)", res === "Balanced" && (await cw()) === 384 * 5, `${res} w=${await cw()}`);
  const slot = await E(() => localStorage.getItem("kiquest-save-v1") || "");
  ok("setting not in the save record", !slot.includes("Balanced"));
  await page.reload(); await page.waitForTimeout(300);
  ok("Resolution persists across reload", (await E(() => localStorage.getItem("kiquest-opt-res"))) === "Balanced" && (await cw()) === 384 * 5, `w=${await cw()}`);
  await page.click("#startBtn"); await page.waitForTimeout(300);
  await key("Escape"); await E(() => { const u = window.__kiMenu.ui; u.tab = 6; u.sel = 3; u.sub = ""; }); await page.waitForTimeout(80);
  await key("KeyJ"); await page.waitForTimeout(500);
  const t = await E(() => ({ mode: window.__ki.game.mode, title: !document.getElementById("title").hidden, btn: document.getElementById("startBtn").textContent, save: !!localStorage.getItem("kiquest-autosave-v1") || !!localStorage.getItem("kiquest-save-v1") }));
  ok("Quit to title: mode title + title screen shown (not restarted by the same J)", t.mode === "title" && t.title, JSON.stringify(t));
  ok("Quit autosaves; title offers Continue", t.save && t.btn === "Continue", JSON.stringify(t));
  await page.click("#startBtn"); await page.waitForTimeout(400);
  ok("Continue after Quit resumes play", (await E(() => window.__ki.game.mode)) === "play");
  ok("no page errors", errs.length === 0, errs.join(" | ").slice(0, 400));
} catch (e) { ok("no exception", false, String(e.stack ?? e).slice(0, 900)); } finally { await browser.close(); try { process.kill(-srv.pid); } catch {} }
for (const r of results) console.log(r.join("  "));
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(`${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
