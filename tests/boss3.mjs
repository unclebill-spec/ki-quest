// Count Aurel (Undertide boss) checks: node tests/boss3.mjs (after npm run build). KI_PORT to change port. Writes docs/boss3-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4395);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, sable2: true })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f) => page.evaluate(f);
  await E(() => { let sd = 4242; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  // walk into the Undertide arena → fight starts north of the spring; barrier holds
  const st = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; Object.assign(s.flags, { oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, sable2: true }); s.save(); s.enter("undertide"); g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; });
    const sp = M.springOf(g), before = g.mb.boss3.active; g.p.x = sp.x + 40; g.p.y = sp.y + 10; for (let i = 0; i < 10; i++) g.step(1 / 60);
    const b = g.enemies.find((e) => e.kind === "aurel" && !e.dead);
    for (let i = 0; i < 40; i++) { g.p.x += 6; g.step(1 / 60); } const far = Math.hypot(g.p.x - sp.x, g.p.y - sp.y);
    return { area: g.area.id, spring: [Math.round(sp.x / 16 - 0.5), Math.round(sp.y / 16 - 0.5)], tile: [M.ARENA3.tx, M.ARENA3.ty], before, act: g.mb.boss3.active, boss: !!b, bd: b ? Math.round(Math.hypot(b.x - sp.x, b.y - sp.y)) : -1, far: Math.round(far), r: M.ARENA3.r }; });
  ok("entering the Undertide arena (tile 37,17 r6) starts Count Aurel", st.area === "undertide" && st.tile.join() === "37,17" && st.r === 96 && !st.before && st.act && st.boss, JSON.stringify(st));
  ok("arena barrier keeps the hero in", st.far <= st.r + 4, JSON.stringify(st));
  // spring watcher: every frame, no tide hazard and no Aurel body on the spring
  const watch = `(() => { const g = window.__ki.game, M = globalThis.__kiMB, sp = M.springOf(g); let worst = 1e9, bossMin = 1e9; for (const h of g.mb.hazards) if (h.tide) worst = Math.min(worst, Math.hypot(h.x - sp.x, h.y - sp.y) - h.r); const b = g.enemies.find((e) => e.kind === "aurel" && !e.dead); if (b) bossMin = Math.hypot(b.x - sp.x, b.y - sp.y); window.__spr = window.__spr || { worst: 1e9, boss: 1e9 }; window.__spr.worst = Math.min(window.__spr.worst, worst); window.__spr.boss = Math.min(window.__spr.boss, bossMin); })()`;
  await E(`window.__watch = () => ${watch}`);
  // telegraphs: every move enters "tele" before acting; sweep/whirl place cyan warnings during the telegraph
  const tl = await E(() => { const g = window.__ki.game, b = g.enemies.find((e) => e.kind === "aurel" && !e.dead); let seq = [], last = "", hzTele = 0;
    for (let i = 0; i < 60 * 25; i++) { g.p.inv = 1; g.hp = g.maxHp; b.hp = b.max; const h0 = g.mb.hazards.length; g.step(1 / 60); window.__watch();
      if (b.state !== last) { seq.push(b.state + ":" + b.move); last = b.state; } if (b.state === "tele" && g.mb.hazards.length > h0 && g.mb.hazards[g.mb.hazards.length - 1].tide) hzTele++; }
    const acts = seq.filter((s) => s.startsWith("act")); let pre = 0; acts.forEach((a) => { const i = seq.indexOf(a); if (i > 0 && seq[i - 1].startsWith("tele")) pre++; });
    return { acts: acts.length, pre, hzTele, moves: [...new Set(acts)].join(",") }; });
  ok("every move is telegraphed first", tl.acts >= 3 && tl.pre === tl.acts, JSON.stringify(tl));
  ok("tide-wave warnings appear during the telegraph (cyan)", tl.hzTele > 0, JSON.stringify(tl));
  // companions see the telegraph and step away
  const cp = await E(() => { const g = window.__ki.game, b = g.enemies.find((e) => e.kind === "aurel" && !e.dead); let dodge = 0, tele = 0;
    for (let i = 0; i < 60 * 8; i++) { g.p.inv = 1; g.hp = g.maxHp; b.hp = b.max; for (const a of g.mb.allies) { a.hp = a.max; a.ko = false; } g.step(1 / 60); window.__watch(); if (b.state === "tele") { tele++; if (g.mb.allies.some((a) => a.joined && a.state === "dodge")) dodge++; } }
    return { tele, dodge, joined: g.mb.allies.map((a) => a.joined).join() }; });
  ok("companions dodge Aurel's telegraphs", cp.tele > 0 && cp.dodge / cp.tele > 0.5, JSON.stringify(cp));
  // phases 1→2→3→4, a shockwave each; later phases bring their own moves
  const ph = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, B = g.mb.boss3, b = g.enemies.find((e) => e.kind === "aurel" && !e.dead); const s0 = M.aurelLog.shocks, phases = [B.phase], moves = new Set(); M.aurelLog.summons = 0;
    const need = { 2: ["2:whirl"], 3: ["3:summon", "3:sweep2", "3:lunge4"], 4: ["4:ring"] };
    for (const [f, want] of [[0.7, 2], [0.45, 3], [0.2, 4]]) { B.lockT = 0; b.hurt = 0; g.damageFoe(b, b.hp - b.max * f, 0, 0, false);
      for (let i = 0; i < 9000 && !(need[want].every((m) => moves.has(m)) && b.state !== "tele" && (want !== 3 || M.aurelLog.summons > 0)); i++) { g.p.inv = 1; g.hp = g.maxHp; b.hp = b.max * f; g.step(1 / 60); window.__watch(); if (b.state === "tele") moves.add(B.phase + ":" + b.move); }
      phases.push(B.phase); }
    const minions = g.enemies.filter((e) => e.minion && !e.dead).length;
    return { phases: phases.join(">"), shocks: M.aurelLog.shocks - s0, moves: [...moves].sort().join(","), minions, summons: M.aurelLog.summons }; });
  ok("four phases, each change fires a shockwave", ph.phases === "1>2>3>4" && ph.shocks === 3, JSON.stringify(ph));
  ok("P2 whirlpools, P3 double wave + 4-lunge chain + drowned soldiers (≤4), P4 rising-water ring", /2:whirl/.test(ph.moves) && /3:sweep2/.test(ph.moves) && /3:lunge4/.test(ph.moves) && /3:summon/.test(ph.moves) && /4:ring/.test(ph.moves) && ph.summons > 0 && ph.minions > 0 && ph.minions <= 4, JSON.stringify(ph));
  const spr = await E(() => ({ ...window.__spr, R: globalThis.__kiMB.SPRING_R, placed: globalThis.__kiMB.aurelLog.hazards, minHaz: Math.round(globalThis.__kiMB.aurelLog.minHazD), minBoss: Math.round(globalThis.__kiMB.aurelLog.minBossD) }));
  ok("stays off the central spring: no Aurel body or tide hazard on it", spr.worst >= spr.R && spr.boss >= spr.R && spr.minHaz >= spr.R && spr.placed > 50, JSON.stringify(spr));
  // phase-3 screenshot: a fresh fight held at phase 3 mid-telegraph with both companions in
  await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, b = g.enemies.find((e) => e.kind === "aurel" && !e.dead), sp = M.springOf(g);
    g.mb.boss3.phase = 3; b.hp = b.max * 0.4; g.mb.hazards.length = 0; g.p.x = sp.x + 30; g.p.y = sp.y + 30; b.x = sp.x - 10; b.y = sp.y - 46; b.state = "chase"; b.t = 0;
    for (const [i, a] of g.mb.allies.entries()) { a.ko = false; a.hp = a.max; a.x = g.p.x - 24 + i * 44; a.y = g.p.y + 6; }
    for (let i = 0; i < 200 && !(b.state === "tele" && b.move === "sweep2"); i++) { if (b.state !== "tele") { b.state = "chase"; b.t = 0; } g.step(1 / 60); }
    for (let i = 0; i < 18; i++) g.step(1 / 60); });
  await page.waitForTimeout(250); await page.screenshot({ path: "docs/boss3-p3.png" });
  const bar = await E(() => { const g = window.__ki.game; return { active: g.mb.boss3.active, phase: g.mb.boss3.phase }; });
  ok("boss bar state live during the fight", bar.active && bar.phase >= 3, JSON.stringify(bar));
  const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const fps = await E(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / 2)); }; requestAnimationFrame(f); }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("fps with CPU 4x throttle (phase 3+, companions) >= 45", fps >= 45, String(fps));
  // reward
  const rw = await E(() => { const g = window.__ki.game, b = g.enemies.find((e) => e.kind === "aurel" && !e.dead); const pts = g.pts; g.mb.boss3.lockT = 0; b.hurt = 0; g.damageFoe(b, b.hp + 10, 0, 0, false); for (let i = 0; i < 30; i++) g.step(1 / 60);
    const sv = JSON.parse(localStorage.getItem("kiquest-mb-v1") || "{}"), flag = window.__ki.story.flags.tideBossDown, saved = JSON.parse(localStorage.getItem("kiquest.story.v1") || "{}");
    const minions = g.enemies.filter((e) => e.minion && !e.dead).length; g.reset();
    return { dpts: g.pts - pts, flag, savedFlag: saved.tideBossDown ?? saved.flags?.tideBossDown, sv, minions, done: g.mb.boss3.done, active: g.mb.boss3.active }; });
  ok("Aurel drops +5 pts, clears soldiers", rw.dpts >= 5 && rw.minions === 0, JSON.stringify(rw));
  ok("story flag tideBossDown set and saved (Sable's scene)", rw.flag === true && rw.savedFlag === true, JSON.stringify(rw));
  ok("boss3 reward saved (merged with boss1/boss2), persists across reset", rw.sv.boss1 && rw.sv.boss2 && rw.sv.boss3 && rw.done && !rw.active, JSON.stringify(rw));
  ok("no re-trigger after defeat", await E(() => { const g = window.__ki.game, sp = globalThis.__kiMB.springOf(g); g.p.x = sp.x + 30; g.p.y = sp.y; for (let i = 0; i < 20; i++) g.step(1 / 60); return !g.mb.boss3.active; }));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
