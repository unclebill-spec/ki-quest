// Master Builder combat checks: node tests/combat.mjs (after npm run build). KI_PORT to change port. Writes docs/combat-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4392);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`); await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true })); }); await page.reload(); await page.click("#startBtn");
  const shot = (n) => page.screenshot({ path: `docs/${n}.png`, clip: { x: 0, y: 0, width: 1152, height: 648 } });
  const E = (f) => page.evaluate(f);
  // sprites
  await page.waitForTimeout(800);
  // technique cycling
  const cyc = await E(() => { const g = window.__ki.game; const r = [g.mb.tech]; for (let i = 0; i < 3; i++) { window.__ki.input.key("KeyQ", true); g.step(1 / 60); window.__ki.input.key("KeyQ", false); g.step(1 / 60); r.push(g.mb.tech); } return r; });
  ok("Q cycles bolt→beam→spread→bolt", cyc.join() === "0,1,2,0", cyc.join());
  const spread = await E(() => { const g = window.__ki.game, I = window.__ki.input; g.mb.tech = 2; g.ep = g.maxEp; g.blastCd = 0; const ep = g.ep, n = g.shots.length; I.key("KeyK", true); g.step(1 / 60); I.key("KeyK", false); g.step(1 / 60); return { shots: g.shots.length - n, cost: ep - g.ep }; });
  ok("spread fires 5 shots and costs EP", spread.shots === 5 && spread.cost > 11, JSON.stringify(spread));
  const beam = await E(() => { const g = window.__ki.game, I = window.__ki.input; g.mb.tech = 1; g.ep = g.maxEp; g.blastCd = 0; g.shots.length = 0; I.key("KeyK", true); for (let i = 0; i < 50; i++) g.step(1 / 60); const ch = g.mb.charge; I.key("KeyK", false); g.step(1 / 60); const s = g.shots[g.shots.length - 1]; return { ch, pierce: !!s?.pierce, r: s?.r }; });
  ok("beam charges while held, fires piercing on release", beam.ch > 0.7 && beam.pierce && beam.r > 9, JSON.stringify(beam));
  // power meter + transform
  const tf = await E(() => { const g = window.__ki.game, I = window.__ki.input; g.tf = 0; g.mb.tfOn = false; I.key("ShiftLeft", true); for (let i = 0; i < 60; i++) g.step(1 / 60); I.key("ShiftLeft", false); g.step(1 / 60); const afterCharge = g.tf;
    const e = g.enemies[0]; e.hp = 999; const t0 = g.tf; g.damageFoe(e, 1, 0, 0, false); const afterHit = g.tf - t0;
    g.tf = 100; const md = g.meleeDmg; I.key("KeyT", true); g.step(1 / 60); I.key("KeyT", false); g.step(1 / 60);
    return { afterCharge, afterHit, on: g.mb.tfOn, boost: g.meleeDmg / md }; });
  ok("meter fills from charging and hits", tf.afterCharge > 7 && tf.afterHit > 1, JSON.stringify(tf));
  ok("T transforms with stat boost", tf.on && tf.boost > 1.4, JSON.stringify(tf));
  await E(() => { const g = window.__ki.game; g.enemies.forEach((e) => { if (Math.hypot(e.x - g.p.x, e.y - g.p.y) < 150) { e.state = "recover"; e.t = 9; } }); for (let i = 0; i < 20; i++) g.step(1 / 60); });
  await page.waitForTimeout(150); await shot("combat-transform");
  const rev = await E(() => { const g = window.__ki.game; for (let i = 0; i < 60 * 15; i++) g.step(1 / 60); return { on: g.mb.tfOn, tf: g.tf }; });
  ok("transform drains and reverts", !rev.on && rev.tf < 5, JSON.stringify(rev));
  // enemies
  const kinds = await E(() => [...new Set(window.__ki.game.enemies.map((e) => e.kind))].sort().join());
  ok("3 enemy types present", kinds === "brute,warden,wisp", kinds);
  const guard = await E(() => { const g = window.__ki.game; const w = g.enemies.find((e) => e.kind === "warden"); w.hp = 70; w.x = g.p.x + 20; w.y = g.p.y; w.ax = -1; w.ay = 0; w.guard = true; w.state = "chase";
    const h0 = w.hp; g.damageFoe(w, 10, 100, 0, false); const front = h0 - w.hp; const h1 = w.hp; g.damageFoe(w, 10, -100, 0, false); const back = h1 - w.hp;
    w.guard = true; w.state = "chase"; g.damageFoe(w, 10, 100, 0, false, true); return { front, back, broken: !w.guard }; });
  ok("warden blocks frontal hits, not from behind; beam breaks guard", guard.front < 2 && guard.back >= 9 && guard.broken, JSON.stringify(guard));
  const wt = await E(() => { const g = window.__ki.game; g.mb.hazards.length = 0; const w = g.enemies.find((e) => e.kind === "warden"); w.state = "chase"; w.hurt = 0; w.x = g.p.x + 30; w.y = g.p.y; g.step(1 / 60); return { st: w.state, haz: g.mb.hazards.length }; });
  ok("warden telegraphs slam with a ground ring", wt.st === "tele" && wt.haz === 1, JSON.stringify(wt));
  const kb = await E(() => { const g = window.__ki.game; const b = g.enemies.find((e) => e.kind === "brute" && !e.dead); b.vx = 0; b.hurt = 0; g.damageFoe(b, 1, 120, 0, false); return { vx: b.vx, hurt: b.hurt }; });
  ok("hurt stun + knockback", kb.vx >= 120 && kb.hurt > 0, JSON.stringify(kb));
  const orb = await E(() => { const g = window.__ki.game; const b = g.enemies.find((e) => e.kind === "wisp" && !e.dead); const x0 = g.exp + g.lvl * 1000; b.hp = 1; g.damageFoe(b, 5, 0, 0, false); const orbs = g.mb.orbs.length; for (let i = 0; i < 120; i++) g.step(1 / 60); return { orbs, gained: g.exp + g.lvl * 1000 - x0, left: g.mb.orbs.length }; });
  ok("kills drop EXP orbs that fly to the hero", orb.orbs === 3 && orb.gained > 0 && orb.left === 0, JSON.stringify(orb));
  // boss
  await E(() => { const g = window.__ki.game; g.hp = 9999; g.enemies.forEach((e) => { e.dead = true; e.respawn = 999; }); });
  const trig = await E(() => { const g = window.__ki.game; g.mb.tfOn = false; g.tf = 0; g.p.inv = 0;
    // arena tile 38,17; nearest free tile is used by the game
    g.p.x = 38 * 16 + 8; g.p.y = 17 * 16 + 8 + 30; for (let i = 0; i < 3; i++) g.step(1 / 60);
    const b = g.enemies.find((e) => e.kind === "boss"); return { active: g.mb.boss.active, boss: !!b, phase: g.mb.boss.phase }; });
  ok("arena trigger spawns boss (phase 1)", trig.active && trig.boss && trig.phase === 1, JSON.stringify(trig));
  const tele = await E(() => { const g = window.__ki.game; const b = g.enemies.find((e) => e.kind === "boss"); g.mb.boss.lockT = 0; b.state = "chase"; b.t = 0; b.hurt = 0; g.step(1 / 60); return { st: b.state, move: b.move }; });
  ok("boss telegraphs a move", tele.st === "tele" && !!tele.move, JSON.stringify(tele));
  for (let i = 0; i < 8; i++) { await E(() => window.__ki.game.step(1 / 60)); }
  await E(() => { const g = window.__ki.game; const b = g.enemies.find((e) => e.kind === "boss"); g.p.x = b.x - 40; g.p.y = b.y + 30; g.p.fx = 1; g.p.fy = 0; g.mb.tech = 1; g.mb.charging = true; g.mb.charge = 0.6; g.shots.push({ x: g.p.x + 20, y: g.p.y - 16, vx: 300, vy: -100, life: 0.4, foe: false, dmg: 0, pierce: true, r: 9, tech: 1, hit: [b] }); });
  await page.waitForTimeout(120); await shot("combat-boss");
  const ph = await E(() => { const g = window.__ki.game; const b = g.enemies.find((e) => e.kind === "boss"); const seen = new Set(); const moves = new Set();
    // deterministic: seeded RNG, and wait on state (a phase-3-only move telegraphed) instead of a fixed frame count
    const rnd = Math.random; let sd = 12345; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296);
    const p3 = () => [...moves].some((m) => /^3:(dash3|spiral|slam3)$/.test(m));
    for (const f of [0.6, 0.3]) { g.mb.boss.lockT = 0; b.hurt = 0; g.damageFoe(b, b.hp - b.max * f, 0, 0, false);
      for (let i = 0; i < 6000 && !(f === 0.6 ? g.mb.boss.phase === 2 && moves.size > 0 : p3()); i++) { g.p.inv = 1; g.hp = 9999; b.hp = Math.min(b.hp, b.max * f); g.step(1 / 60); seen.add(g.mb.boss.phase); if (b.state === "tele") moves.add(g.mb.boss.phase + ":" + b.move); } }
    Math.random = rnd;
    return { phases: [...seen].sort().join(), moves: [...moves].sort().join(" ") }; });
  ok("boss reaches phase 2 and 3 with phase moves", ph.phases.includes("2") && ph.phases.includes("3") && /3:(dash3|spiral|slam3)/.test(ph.moves), JSON.stringify(ph));
  await E(() => { const g = window.__ki.game; const b = g.enemies.find((e) => e.kind === "boss"); b.state = "tele"; b.move = "dash3"; b.t = 0.3; b.ax = -0.8; b.ay = 0.6; g.p.inv = 0; for (let i = 0; i < 4; i++) g.mb.hazards.push({ x: g.p.x + i * 20 - 30, y: g.p.y + 10, r: 26, t: 0.5, max: 0.8, dmg: 1, foe: true }); });
  await shot("combat-boss-p3");
  const rw = await E(() => { const g = window.__ki.game; const b = g.enemies.find((e) => e.kind === "boss"); const pts = g.pts; g.mb.boss.lockT = 0; g.damageFoe(b, 99999, 0, 0, false); for (let i = 0; i < 150; i++) g.step(1 / 60); return { done: g.mb.boss.done, active: g.mb.boss.active, pts: g.pts - pts, saved: localStorage.getItem("kiquest-mb-v1"), alive: g.enemies.some((e) => e.kind === "boss" && !e.dead) }; });
  ok("boss reward: +3 pts (plus level-ups), unlock, saved", rw.done && !rw.active && rw.pts >= 3 && !!rw.saved && !rw.alive, JSON.stringify(rw));
  // sprites loaded from public/art/chars
  const spr = await E(() => { const imgs = performance.getEntriesByType("resource").map((r) => r.name).filter((n) => n.includes("art/chars/")); return imgs.length; });
  ok("sprite sheets loaded", spr >= 10, String(spr));
  // perf: CPU throttled 4x, busy fight scene
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await E(() => { const g = window.__ki.game; localStorage.clear(); g.mb.boss.done = false; g.reset(); g.p.x = 38 * 16 + 8; g.p.y = 17 * 16 + 38; g.tf = 100; g.mb.tfOn = true; g.mb.tfT = 60; g.hp = 1e5; });
  const fps = await E(() => new Promise((res) => { const g = window.__ki.game; let n = 0; const t0 = performance.now(); const tick = () => { n++; g.hp = 1e5; g.p.inv = 1; if (n % 20 === 0) { g.blastCd = 0; g.ep = g.maxEp; } if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res({ fps: n / 3, parts: [0, 1, 2, 3].map((c) => g.parts.count(c)).join("/"), shots: g.shots.length }); }; requestAnimationFrame(tick); }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("fps with CPU 4x throttle (boss fight, transformed) >= 45", fps.fps >= 45, JSON.stringify(fps));
  ok("no page errors", errs.length === 0, errs.join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const r of results) console.log(r.join("  "));
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(`${results.length - fails}/${results.length} passed`); process.exit(fails ? 1 : 0);
