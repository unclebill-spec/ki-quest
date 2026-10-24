// Count Aurel (Undertide boss) checks: node tests/npc-bob.mjs (after npm run build). KI_PORT to change port. Writes docs/boss3-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4600);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, metAma: true })));
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(800);
  const E = (f, a) => page.evaluate(f, a);
  await E(() => { window.__ki.story.box = null; window.__ki.game.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); });
  const id = await E(() => { const a = window.__ki.game.area; return a.npcs.slice().sort((p, q) => Math.abs(p.x - 384) - Math.abs(q.x - 384))[0].id; });
  // sample the drawn bob every animation frame for 4 s; count sign flips per second
  const sample = (walk) => E(({ id, walk }) => new Promise((res) => { const g = window.__ki.game, n = g.area.npcs.find((n) => n.id === id), t0 = performance.now(); let last = null, flips = 0;
    if (walk) { g.p.x = n.x - 150; globalThis.__x0 = null; g.p.y = n.y; } else { g.p.x = n.x - 60; g.p.y = n.y; }
    const f = () => { window.__ki.story.box = null; if (walk) { g.p.x = Math.min(n.x + 140, g.p.x + 1.5); } const b = globalThis.__kiNpcBob[id]; const sx = globalThis.__kiNpcBob[id + "@x"]; if (globalThis.__x0 == null) globalThis.__x0 = sx; globalThis.__dx = Math.abs(sx - globalThis.__x0); if (last !== null && b !== last) flips++; last = b; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(flips / 4); };
    requestAnimationFrame(f); }), { id, walk });
  const still = await sample(false); await page.screenshot({ path: "docs/bill/npc-bob.png" });
  const walk = await sample(true); const dx = await E(() => globalThis.__dx);
  ok("camera scrolled while walking (NPC moved on screen)", dx > 40, `dx ${dx}px`);
  ok("NPC bob drawn", still > 0, String(still));
  ok("bob rate is the same standing still vs walking toward the NPC", Math.abs(walk - still) <= Math.max(1, still * 0.25), `still ${still}/s walk ${walk}/s`);
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
