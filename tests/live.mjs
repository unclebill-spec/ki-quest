// Live check: node tests/live.mjs [url]  — loads, no console errors, offline reload via the service worker, screenshot.
import { createRequire } from "node:module";
const { chromium } = createRequire("/workspace/tools/game/node/")("playwright");
const url = process.argv[2] || "https://unclebill-spec.github.io/ki-quest/";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1152, height: 648 } }); const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
const r = await p.goto(url, { waitUntil: "networkidle" });
console.log("status", r.status(), "errors", errs.length ? errs : "none");
await p.evaluate(() => navigator.serviceWorker.ready); await p.reload({ waitUntil: "networkidle" });
const controlled = await p.evaluate(() => !!navigator.serviceWorker.controller);
await ctx.setOffline(true); let off = false;
try { await p.reload({ waitUntil: "load" }); await p.click("#startBtn"); await p.waitForTimeout(600); off = await p.evaluate(() => window.__ki.state().mode === "play"); } catch (e) { console.log("offline err", String(e).slice(0, 120)); }
console.log("sw controlled", controlled, "offline play", off);
await ctx.setOffline(false);
await p.evaluate(() => { const g = window.__ki.game; g.p.x = 15 * 16; g.p.y = 15 * 16; g.p.fx = 1; g.p.fy = 0; g.enemies.slice(0, 3).forEach((e, i) => { e.x = g.p.x + 50 + i * 22; e.y = g.p.y - 20 + i * 20; e.state = i ? "chase" : "tele"; e.t = 0.4; e.ax = -1; e.ay = 0; }); });
await p.keyboard.press("KeyJ"); await p.waitForTimeout(90); await p.keyboard.press("KeyK"); await p.waitForTimeout(70);
await p.screenshot({ path: "docs/live.png", clip: await p.locator("canvas").boundingBox() });
console.log("errors total", errs.length); await b.close(); process.exit(errs.length || !off ? 1 : 0);
