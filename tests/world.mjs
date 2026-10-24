// Targeted test for world/story/audio (executor-owned): intro, NPC talk, sealed ward, updraft travel, Hushwater, Lens map, audio.
// Run after `npx vite build`: node tests/world.mjs  -> docs/world-*.png
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const { chromium } = createRequire("/workspace/tools/game/node/")("playwright");
const srv = spawn("npx", ["vite", "preview", "--port", "4174", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const R = []; const ok = (n, c, d = "") => R.push([c ? "PASS" : "FAIL", n, d]);
const b = await chromium.launch();
try {
  const p = await b.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto("http://localhost:4174/ki-quest/"); await p.evaluate(() => localStorage.clear()); await p.reload();
  const shot = (n) => p.screenshot({ path: `docs/world-${n}.png`, clip: { x: 0, y: 0, width: 1152, height: 648 } });
  const E = (f, a) => p.evaluate(f, a);
  await p.click("#startBtn"); await p.waitForTimeout(700);
  ok("intro plays on new game", await E(() => window.__ki.story.intro === 0));
  await shot("intro");
  for (let i = 0; i < 5; i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(600); }
  ok("intro ends", await E(() => window.__ki.story.intro === -1 && window.__ki.story.flags.introSeen === true));
  ok("area 1 is Lanternmoss Hollow with NPCs", await E(() => window.__ki.game.area.id === "lanternmoss" && window.__ki.game.area.npcs.length === 4));
  // walk next to Elder Ama and talk
  await E(() => { const g = window.__ki.game, a = g.area.npcs.find((n) => n.id === "a"); g.p.x = a.x + 14; g.p.y = a.y; g.p.fx = -1; g.p.fy = 0; });
  await p.waitForTimeout(100); await p.keyboard.press("KeyJ"); await p.waitForTimeout(500);
  ok("talks to Elder Ama", await E(() => window.__ki.story.box?.who === "Elder Ama Quill"));
  await shot("dialog");
  for (let i = 0; i < 8 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); }
  ok("Ama flag set + objective moves on", await E(() => window.__ki.story.flags.metAma === true && /Lv 4/.test(window.__ki.story.objective())));
  await shot("wickhaven");
  // sealed ward blocks at Lv 1
  await E(() => { const g = window.__ki.game, w = g.area.wards[0]; g.p.x = w.tx * 16 - 10; g.p.y = w.ty * 16 + 8; });
  await p.keyboard.down("KeyD"); await p.waitForTimeout(400); await p.keyboard.up("KeyD"); await p.waitForTimeout(100);
  ok("sealed ward says Lv 4", await E(() => /Lv 4/.test(window.__ki.story.box?.lines[0] ?? "")));
  while (await E(() => !!window.__ki.story.box)) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  ok("ward still solid at Lv 1", await E(() => window.__ki.game.p.x < window.__ki.game.area.wards[0].tx * 16));
  // level up, pass the ward, ride the updraft
  await E(() => { const g = window.__ki.game, w = g.area.wards[0]; g.lvl = 4; g.p.x = w.tx * 16 - 6; g.p.y = w.ty * 16 + 8; });
  await p.keyboard.down("KeyD"); await p.waitForTimeout(500); await p.keyboard.up("KeyD");
  ok("ward opens at Lv 4", await E(() => window.__ki.game.p.x > window.__ki.game.area.wards[0].tx * 16 + 8));
  await E(() => { const g = window.__ki.game, s = g.area.travel[0]; g.p.x = s.x; g.p.y = s.y + 14; });
  await p.keyboard.down("KeyW"); await p.waitForTimeout(250); await p.keyboard.up("KeyW"); await p.waitForTimeout(100);
  ok("updraft prompt", await E(() => /Hushwater/.test(window.__ki.story.box?.lines[0] ?? "")));
  for (let i = 0; i < 6 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); }
  await p.waitForTimeout(500); await shot("flight");
  await p.waitForTimeout(1800);
  ok("arrived in Hushwater", await E(() => window.__ki.game.area.id === "hushwater" && window.__ki.story.flags.area === "hushwater"));
  await shot("hushwater");
  await E(() => { const g = window.__ki.game, m = g.area.npcs.find((n) => n.id === "m"); g.p.x = m.x - 14; g.p.y = m.y; });
  await p.waitForTimeout(100); await p.keyboard.press("KeyJ"); await p.waitForTimeout(700);
  ok("meets Mirela", await E(() => window.__ki.story.box?.who === "Mirela Vant"));
  await shot("mirela");
  while (await E(() => !!window.__ki.story.box)) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await p.keyboard.press("KeyM"); await p.waitForTimeout(200); await shot("map"); await p.keyboard.press("KeyM");
  // continue restores the area
  await E(() => window.__ki.game.autosave()); await p.reload(); await p.click("#startBtn"); await p.waitForTimeout(400);
  ok("continue restores Hushwater", await E(() => window.__ki.game.area.id === "hushwater"));
  const au = await E(() => ({ ctx: !!window.__ki.audio.ctx, bufs: window.__ki.audio.bufs.size, cur: window.__ki.audio.cur, played: window.__ki.audio.played.length }));
  ok("audio unlocked + music loaded", au.ctx && au.bufs > 0 && au.cur === "area1-theme", JSON.stringify(au));
  ok("no console errors", errs.length === 0, errs.join(" | "));
} finally { await b.close(); srv.kill(); }
for (const r of R) console.log(r.join("  "));
const f = R.filter((r) => r[0] === "FAIL").length; console.log(`${R.length - f}/${R.length} passed`); process.exit(f ? 1 : 0);
