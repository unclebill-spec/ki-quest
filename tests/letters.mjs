// W17f Linnet's Letters side quest: node tests/letters.mjs (after npm run build). KI_PORT to change port. Writes no PNGs.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4493);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e) + " @ " + (e.stack || "").split("\n").slice(1, 4).join(" | "))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, metAma: true, metMirela: true, visited_hushwater: true })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f, a) => page.evaluate(f, a);
  const go = (area) => E((a) => { const s = window.__ki.story; s.enter(a); s.box = null; window.__ki.game.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); }, area);
  const talk = async (id) => { // walk up, press J, read every line (the real input path)
    const said = await E((id) => { const g = window.__ki.game, n = g.area.npcs.find((n) => n.id === id); if (!n) return null; g.p.x = n.x + 14; g.p.y = n.y; g.p.fx = -1; g.p.fy = 0; return true; }, id);
    if (!said) return null; await page.waitForTimeout(120); await page.keyboard.press("KeyJ"); await page.waitForTimeout(300);
    const who = await E(() => window.__ki.story.box?.who ?? null), lines = await E(() => window.__ki.story.box?.lines ?? []);
    for (let i = 0; i < 14 && (await E(() => !!window.__ki.story.box)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(160); }
    return { who, lines };
  };
  const step = async (n = 30) => { await page.waitForTimeout(250); return E((n) => { const g = window.__ki.game; for (let i = 0; i < n; i++) { g.p.inv = 1; g.step(1 / 60); } }, n); };
  await E(() => { const s = window.__ki.story; Object.assign(s.flags, { introSeen: true, metAma: true, metMirela: true, visited_hushwater: true }); s.save(); });
  await go("hushwater");
  const o = await talk("r");
  ok("Orrin Cask gives the first letter (lettersQ, 1/4)", o && /L\. Vant/.test(o.lines.join(" ")) && (await E(() => window.__ki.story.flags.lettersQ === true && window.__ki.story.flags.lettersN === 1)), JSON.stringify([o, await E(() => window.__ki.story.flags)]));
  ok("hint names the meadow and boardwalk", /Letters 1\/4: Sunken Meadow and the east boardwalk/.test(await E(() => window.__ki.story.objective())));
  const L = await E(() => [[14, 22], [33, 24], [44, 11]]);
  const walk = await E((L) => { const A = window.__ki.game.area; const T = (x, y) => A.tiles?.[y * 48 + x]; return L.map(([x, y]) => window.__ki.game.solidAt ? !window.__ki.game.solidAt(x * 16 + 8, y * 16 + 8) : true); }, L);
  ok("letter tiles are walkable", walk.every(Boolean), JSON.stringify(walk));
  for (const [x, y] of L) { await E(([x, y]) => { const g = window.__ki.game; g.p.x = x * 16 + 8; g.p.y = y * 16 + 8; }, [x, y]); await step(6); }
  ok("3 letters picked up (4/4)", await E(() => window.__ki.story.flags.lettersN === 4 && !!window.__ki.story.flags.letter_3));
  ok("hint says bring them to Mirela", /bring all 4 to Mirela/.test(await E(() => window.__ki.story.objective())));
  const m = await talk("m");
  ok("Mirela reads the letters (lettersRead)", m && /crossed her sevens|crossed her sevens/.test(m.lines.join(" ")) && (await E(() => window.__ki.story.flags.lettersRead === true)));
  ok("hint says the oath comes first", /after the Lantern Oath/.test(await E(() => window.__ki.story.objective())));
  await E(() => { const s = window.__ki.story; Object.assign(s.flags, { bell: true, bellDone: true, reedQ: true, reedDone: true, oath: true }); s.save(); });
  await go("lanternmoss");
  ok("Linnet hidden before she wakes", await E(() => !window.__ki.game.area.npcs.some((n) => n.id === "l")));
  ok("hint points to the hidden spring", /hidden spring \(Lanternmoss/.test(await E(() => window.__ki.story.objective())));
  await E(() => { const g = window.__ki.game; g.p.x = 3 * 16 + 8; g.p.y = 32 * 16 + 8; }); await step(4);
  ok("Linnet wakes at the spring (linnetWoke scene)", await E(() => window.__ki.story.flags.linnetWoke === true && window.__ki.story.box?.who === "The spring"));
  for (let i = 0; i < 14 && (await E(() => !!window.__ki.story.box)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(160); }
  await step(2);
  ok("Linnet NPC shown after waking", await E(() => window.__ki.game.area.npcs.some((n) => n.id === "l")));
  await page.waitForFunction(() => !!window.__kiMB?.drawLog?.linnet, null, { timeout: 15000 }).catch(() => {});
  ok("Linnet drawn from her final sheet by frame name (linnet.json, not the placeholder)", await E(() => /^idle_down_[0-3]$/.test(window.__kiMB?.drawLog?.linnet?.key ?? "")), JSON.stringify(await E(() => window.__kiMB?.drawLog?.linnet ?? null)));
  await page.screenshot({ path: "/tmp/kq-linnet-ingame.png" });
  const li = await talk("l");
  ok("Linnet gives the Locket (lettersDone)", li?.who === "Linnet Vant" && (await E(() => window.__ki.story.flags.lettersDone === true)), JSON.stringify(li?.who));
  await page.waitForFunction(() => window.__ki.game.have.includes("c2"), null, { timeout: 5000 }).catch(() => {});
  ok("Linnet's Locket (c2) unlocked", await E(() => { const g = window.__ki.game; return g.have.includes("c2"); }));
  // epilogue: Linnet scene plays when lettersDone is set
  await E(() => { const s = window.__ki.story; Object.assign(s.flags, { malacharDown: true, malacharFade: true, runeDown: true, runeSeen: true, huskIn: true, poured: true }); s.save(); });
  await go("husk"); await step(2);
  const who = new Set();
  for (let i = 0; i < 160; i++) { const w = await E(() => window.__ki.story.box?.who ?? null); if (w) who.add(w); if (await E(() => window.__ki.story.credits > 0)) break; await page.keyboard.press("KeyJ"); await page.waitForTimeout(90); await step(1); }
  ok("epilogue plays the Linnet scene with lettersDone", who.has("Linnet Vant"), [...who].join(","));
  ok("linnetRest set after the epilogue", await E(() => window.__ki.story.flags.linnetRest === true));
  ok("Linnet gone after dawn", await E(() => { const s = window.__ki.story; s.enter("lanternmoss"); s.box = null; window.__ki.game.step(1 / 60); return !window.__ki.game.area.npcs.some((n) => n.id === "l"); }));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
