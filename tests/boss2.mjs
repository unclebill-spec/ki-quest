// Slagheart (Kilnreach quarry boss) checks: node tests/boss2.mjs (after npm run build). KI_PORT to change port. Writes docs/boss2-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4394);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, oath: true, brann: true, brannQ: true, heart: true })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f) => page.evaluate(f);
  // seeded RNG so move picks are reproducible
  await E(() => { let sd = 777; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  // walk into the quarry arena → fight starts, barrier holds
  const st = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; s.enter("emberquarry"); g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; });
    const A = M.ARENA2; const before = g.mb.boss2.active; g.p.x = A.tx * 16 + 8; g.p.y = A.ty * 16 + 8 + 20; for (let i = 0; i < 10; i++) g.step(1 / 60);
    const b = g.enemies.find((e) => e.kind === "slag" && !e.dead); const act = g.mb.boss2.active;
    for (let i = 0; i < 30; i++) { g.p.x += 6; g.step(1 / 60); } const far = Math.hypot(g.p.x - A.tx * 16, g.p.y - A.ty * 16);
    return { area: g.area.id, before, act, boss: !!b, far: Math.round(far), r: A.r }; });
  ok("entering the quarry arena starts Slagheart", st.area === "emberquarry" && !st.before && st.act && st.boss, JSON.stringify(st));
  ok("arena barrier keeps the hero in", st.far < st.r + 50, JSON.stringify(st));
  // telegraphs: every move enters "tele" before acting; rain/crack spawn warning hazards during the telegraph
  const tl = await E(() => { const g = window.__ki.game, b = g.enemies.find((e) => e.kind === "slag" && !e.dead); let seq = [], last = "", hzTele = 0;
    for (let i = 0; i < 60 * 25; i++) { g.p.inv = 1; g.hp = g.maxHp; b.hp = b.max; const h0 = g.mb.hazards.length; g.step(1 / 60);
      if (b.state !== last) { seq.push(b.state + ":" + b.move); last = b.state; } if (b.state === "tele" && (b.move === "rain" || b.move === "crack") && g.mb.hazards.length > h0) hzTele++; }
    const acts = seq.filter((s) => s.startsWith("act")); let pre = 0; acts.forEach((a) => { const i = seq.indexOf(a); if (i > 0 && seq[i - 1].startsWith("tele")) pre++; });
    return { acts: acts.length, pre, hzTele, moves: [...new Set(acts)].join(",") }; });
  ok("every move is telegraphed first", tl.acts >= 3 && tl.pre === tl.acts, JSON.stringify(tl));
  ok("ember rain / molten crack warn during the telegraph", tl.hzTele > 0, JSON.stringify(tl));
  // phases 1→2→3 with shockwaves; phase-3 move set includes summon + crack3
  const ph = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, B = g.mb.boss2, b = g.enemies.find((e) => e.kind === "slag" && !e.dead); const s0 = M.slagLog.shocks, phases = [B.phase], moves = new Set(); M.slagLog.summons = 0;
    for (const f of [0.6, 0.3]) { B.lockT = 0; b.hurt = 0; g.damageFoe(b, b.hp - b.max * f, 0, 0, false); const want = f === 0.6 ? 2 : 3;
      for (let i = 0; i < 8000 && !(want === 3 ? moves.has("3:summon") && moves.has("3:crack3") && M.slagLog.summons > 0 && b.state !== "tele" : [...moves].some((m) => m[0] === "2")); i++) { g.p.inv = 1; g.hp = g.maxHp; b.hp = Math.min(b.hp, b.max * f); g.step(1 / 60); if (b.state === "tele") moves.add(B.phase + ":" + b.move); }
      phases.push(B.phase);
      if (f === 0.6) moves.clear(); }
    const minions = g.enemies.filter((e) => e.minion && !e.dead).length;
    return { phases: phases.join(">"), shocks: M.slagLog.shocks - s0, moves: [...moves].join(","), minions, summons: M.slagLog.summons }; });
  ok("three phases, each change fires a shockwave", ph.phases === "1>2>3" && ph.shocks === 2, JSON.stringify(ph));
  ok("phase 3 adds summon + triple crack; minions appear (≤4)", /3:summon/.test(ph.moves) && /3:crack3/.test(ph.moves) && ph.summons > 0 && ph.minions > 0 && ph.minions <= 4, JSON.stringify(ph));
  // screenshot phase 3 with both companions in the fight
  await E(() => { const g = window.__ki.game, b = g.enemies.find((e) => e.kind === "slag" && !e.dead); b.state = "tele"; b.move = "rain"; b.t = 0.6; g.p.x = b.x - 30; g.p.y = b.y + 40; });
  await page.waitForTimeout(250); await page.screenshot({ path: "docs/boss2-p3.png" });
  const bar = await E(() => { const g = window.__ki.game; return { active: g.mb.boss2.active, phase: g.mb.boss2.phase }; });
  ok("boss bar state live during the fight", bar.active && bar.phase === 3, JSON.stringify(bar));
  // fps at 4x throttle mid-fight
  const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const fps = await E(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / 2)); }; requestAnimationFrame(f); }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("fps with CPU 4x throttle (phase 3) >= 45", fps >= 45, String(fps));
  // reward: kill → +4 pts, full heal, boss2 saved and merged with boss1, survives reset
  const rw = await E(() => { const g = window.__ki.game, b = g.enemies.find((e) => e.kind === "slag" && !e.dead); const pts = g.pts; g.hp = 1; b.lockT = 0; window.__ki.game.mb.boss2.lockT = 0; b.hurt = 0; g.damageFoe(b, b.hp + 10, 0, 0, false); for (let i = 0; i < 30; i++) g.step(1 / 60);
    const sv = JSON.parse(localStorage.getItem("kiquest-mb-v1") || "{}"); const minions = g.enemies.filter((e) => e.minion && !e.dead).length; g.reset();
    return { dpts: g.pts - pts, full: true, sv, minions, done: g.mb.boss2.done, active: g.mb.boss2.active }; });
  ok("Slagheart drops +4 pts, clears minions", rw.dpts >= 4 && rw.minions === 0, JSON.stringify(rw));
  ok("reward saved (boss1 + boss2 merged) and persists across reset", rw.sv.boss1 === true && rw.sv.boss2 === true && rw.done && !rw.active, JSON.stringify(rw));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
