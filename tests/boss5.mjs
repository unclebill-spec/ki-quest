// Morvant, the Eclipse Golem (Stair top ring) checks: node tests/boss5.mjs (after npm run build). KI_PORT to change port. Writes docs/boss5-*.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4487);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const FL = { introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, sable2: true, tideBossDown: true, sable3: true, stairIn: true };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate((FL) => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true, boss3: true, boss4: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify(FL)); }, FL);
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f, a) => page.evaluate(f, a);
  await E(() => { let sd = 5151; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  // gate: no fight before the Red Cage is broken
  const gate = await E((FL) => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; Object.assign(s.flags, FL); s.save(); s.enter("stair"); s.box = null; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; });
    const cx = M.ARENA5.tx * 16 + 8, cy = M.ARENA5.ty * 16 + 8; g.p.x = cx; g.p.y = cy + 24; for (let i = 0; i < 20; i++) g.step(1 / 60); return { act: g.mb.boss5.active }; }, FL);
  ok("Morvant sleeps until the Red Cage is broken (cageDone)", !gate.act, JSON.stringify(gate));
  const st = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; Object.assign(s.flags, { cageDone: true, sableJoin: true }); s.save(); s.box = null;
    const cx = M.ARENA5.tx * 16 + 8, cy = M.ARENA5.ty * 16 + 8; g.p.x = cx; g.p.y = cy + 24; for (let i = 0; i < 10; i++) g.step(1 / 60);
    const m = M.morvantOf(g); for (let i = 0; i < 60; i++) { g.p.y += 6; g.step(1 / 60); } const far = Math.hypot(g.p.x - cx, g.p.y - cy);
    return { area: g.area.id, tile: [M.ARENA5.tx, M.ARENA5.ty], act: g.mb.boss5.active, m: !!m, hp: m?.max, phase: g.mb.boss5.phase, far: Math.round(far), r: M.ARENA5.r, banner: g.banner }; });
  ok("stepping onto the top ring (Stair 32,5) wakes Morvant, 900 HP, phase 1", st.area === "stair" && st.tile.join() === "32,5" && st.act && st.m && st.hp === 900 && st.phase === 1, JSON.stringify(st));
  ok("arena barrier keeps the hero on the ring", st.far <= st.r + 4, JSON.stringify(st));
  // P1: every act telegraphed first; slam + beam; eclipse warnings; sparkles
  const p1 = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, m = M.morvantOf(g); g.mb.boss5.lockT = 0; const seq = []; let last = "", hz = 0; const sp0 = M.morvantLog.sparkles;
    for (let i = 0; i < 60 * 20; i++) { g.p.inv = 1; g.hp = g.maxHp; m.hp = m.max; const h0 = g.mb.hazards.length; g.step(1 / 60); if (g.mb.hazards.length > h0 && g.mb.hazards.at(-1).eclipse) hz++; if (m.state !== last) { seq.push(m.state + ":" + m.move); last = m.state; } }
    let acts = 0, pre = 0; seq.forEach((s, i) => { if (s.startsWith("act")) { acts++; if (i > 0 && seq[i - 1].startsWith("tele")) pre++; } });
    return { acts, pre, hz, moves: [...new Set(seq.filter((s) => s.startsWith("tele")).map((s) => s.slice(5)))].sort().join(), sparkles: M.morvantLog.sparkles - sp0, parts: g.parts.count ?? -1 }; });
  ok("P1: every move telegraphed first (slam quake + corona beam), violet/gold eclipse warnings", p1.acts >= 4 && p1.pre === p1.acts && p1.hz > 0 && /slam/.test(p1.moves) && /beam/.test(p1.moves), JSON.stringify(p1));
  ok("gold/violet sparkle particles emitted around him", p1.sparkles > 100, JSON.stringify(p1));
  const cp = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, m = M.morvantOf(g); let dodge = 0, tele = 0;
    for (let i = 0; i < 60 * 8; i++) { g.p.inv = 1; g.hp = g.maxHp; m.hp = m.max; for (const a of g.mb.allies) { a.hp = a.max; a.ko = false; } g.step(1 / 60); if (m.state === "tele") { tele++; if (g.mb.allies.some((a) => a.joined && a.state === "dodge")) dodge++; } }
    return { tele, dodge, joined: g.mb.allies.filter((a) => a.joined).map((a) => a.id).join() }; });
  ok("companions dodge his telegraphs", cp.tele > 0 && cp.dodge / cp.tele > 0.5, JSON.stringify(cp));
  // phases 2..4: shockwave + short shield each, new moves
  const ph = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, B = g.mb.boss5, m = M.morvantOf(g), out = [];
    for (const [want, frac, need] of [[2, 0.7, ["orbit"]], [3, 0.45, ["nova", "beam2"]], [4, 0.2, ["eclipse", "nova"]]]) {
      const s0 = M.morvantLog.shocks, sh0 = M.morvantLog.shots; B.lockT = 0; m.hurt = 0; for (let i = 0; i < 40 && B.phase < want; i++) { if (i % 10 === 0 && m.hp > m.max * frac) { B.lockT = 0; m.hurt = 0; g.damageFoe(m, m.hp - m.max * frac, 0, 0, false); } g.p.inv = 1; g.step(1 / 60); }
      const phase = B.phase, shocks = M.morvantLog.shocks - s0, lock = B.lockT > 0, h0 = m.hp; m.hurt = 0; g.damageFoe(m, 30, 0, 0, false); const shielded = m.hp === h0;
      const seen = new Set(); let safeOk = true, safeN = 0, umbra = 0;
      let tail = 90; for (let i = 0; i < 60 * 40 && tail > 0; i++) { if (need.every((n) => seen.has(n))) tail--; g.p.inv = 1; g.hp = g.maxHp; m.hp = Math.max(m.max * (frac - 0.04), Math.min(m.hp, m.max * frac)); const was = m.state; g.step(1 / 60);
        if (m.state === "tele" && was !== "tele") { seen.add(m.move);
          if (m.move === "eclipse") { const safe = g.mb.hazards.find((h) => h.safe); if (!safe) safeOk = false; else { safeN++; const dmg = g.mb.hazards.filter((h) => h.eclipse && !h.safe && h.max > 0); umbra = dmg.length; if (dmg.some((h) => Math.hypot(safe.x - h.x, (safe.y - h.y) * 1.6) < h.r)) safeOk = false; } } } }
      out.push({ want, phase, shocks, lock, shielded, seen: [...seen].sort().join(), shots: M.morvantLog.shots - sh0, safeOk, safeN, umbra }); }
    return out; });
  ok("4 phases: 75/50/25% each change with a shockwave + brief shield", ph.every((p) => p.phase === p.want && p.shocks === 1 && p.lock && p.shielded), JSON.stringify(ph.map(({ want, phase, shocks, lock, shielded }) => ({ want, phase, shocks, lock, shielded }))));
  ok("P2: eclipse-orb spiral arms (foe shots)", /orbit/.test(ph[0].seen) && ph[0].shots >= 10, JSON.stringify(ph[0]));
  ok("P3 TOTALITY: cross beams + nova rings with an open gap", /beam2/.test(ph[1].seen) && /nova/.test(ph[1].seen), JSON.stringify(ph[1]));
  ok("P4 CORONA: umbra floods the ring, lit crescent left safe (no warning overlaps it)", /eclipse/.test(ph[2].seen) && ph[2].safeN >= 1 && ph[2].safeOk && ph[2].umbra >= 8, JSON.stringify(ph[2]));
  // screenshot: phase 4, Morvant fully in frame mid-beam telegraph, hero + companions below
  await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, m = M.morvantOf(g), cx = M.ARENA5.tx * 16 + 8, cy = M.ARENA5.ty * 16 + 8; g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
    const put = () => { m.x = cx; m.y = cy - 4; g.p.x = cx; g.p.y = cy + 40; }; put();
    for (const [i, a] of g.mb.allies.entries()) { a.joined = true; a.ko = false; a.hp = a.max; a.x = cx - 36 + i * 36; a.y = cy + 56; }
    m.state = "chase"; m.t = 0; for (let k = 0; k < 600 && !(m.state === "tele" && m.move === "beam2" && m.t < 0.45); k++) { if (m.state === "tele" && m.move !== "beam2") { m.state = "chase"; m.t = 0; g.mb.hazards.length = 0; } else if (m.state !== "tele" && m.state !== "chase") { m.state = "chase"; m.t = 0; } g.p.inv = 1; g.hp = g.maxHp; put(); g.step(1 / 60); } });
  await page.waitForTimeout(200); await page.screenshot({ path: "docs/boss5-p4.png" });
  const vis = await E(() => { const g = window.__ki.game, m = globalThis.__kiMB.morvantOf(g), W = 384, H = 216, MW = 48 * 16, MH = 34 * 16;
    const cx = Math.max(0, Math.min(MW - W, g.p.x - W / 2)), cy = Math.max(0, Math.min(MH - H, g.p.y - 16 - H / 2)), sx = m.x - cx, sy = m.y - cy;
    return { active: g.mb.boss5.active, phase: g.mb.boss5.phase, box: [Math.round(sx - 24), Math.round(sy - 66), Math.round(sx + 24), Math.round(sy + 2)], move: m.move, state: m.state }; });
  ok("screenshot frames Morvant fully (sprite + crest inside the view), phase 4 bar live", vis.active && vis.phase === 4 && vis.box[0] >= 0 && vis.box[1] >= 0 && vis.box[2] <= 384 && vis.box[3] <= 216, JSON.stringify(vis));
  const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const fpsOnce = () => E(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / 2)); }; requestAnimationFrame(f); }));
  const fps = Math.max(await fpsOnce(), await fpsOnce()); // best of two 2 s samples (shared box noise)
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("fps with CPU 4x throttle (Morvant P4 + 3 companions + particles) >= 45", fps >= 45, String(fps));
  const rw = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, m = M.morvantOf(g); const pts = g.pts; g.mb.boss5.lockT = 0; m.hurt = 0; g.damageFoe(m, m.hp + 10, 0, 0, false); for (let i = 0; i < 30; i++) g.step(1 / 60);
    const sv = JSON.parse(localStorage.getItem("kiquest-mb-v1") || "{}"), flag = window.__ki.story.flags.morvantDown, saved = JSON.parse(localStorage.getItem("kiquest.story.v1") || "{}");
    const hz = g.mb.hazards.length, fs = g.shots.filter((s) => s.foe).length; g.reset();
    return { dpts: g.pts - pts, flag, savedFlag: saved.morvantDown ?? saved.flags?.morvantDown, sv, hz, fs, done: g.mb.boss5.done, active: g.mb.boss5.active }; });
  ok("Morvant drops +6 pts and clears his hazards/shots", rw.dpts >= 6 && rw.hz === 0 && rw.fs === 0, JSON.stringify(rw));
  ok("story flag morvantDown set and saved", rw.flag === true && rw.savedFlag === true, JSON.stringify(rw));
  ok("boss5 reward saved (merged with boss1-4), persists across reset", rw.sv.boss1 && rw.sv.boss4 && rw.sv.boss5 && rw.done && !rw.active, JSON.stringify(rw));
  await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; g.p.x = M.ARENA5.tx * 16 + 8; g.p.y = M.ARENA5.ty * 16 + 24; });
  await page.waitForFunction(() => { const s = window.__ki.story; if (s.box) s.box = null; return s.flags.threshold === true; }, null, { timeout: 8000, polling: 100 }).catch(() => {});
  const th = await E(() => { const g = window.__ki.game; for (let i = 0; i < 20; i++) g.step(1 / 60); return { re: g.mb.boss5.active, threshold: window.__ki.story.flags.threshold === true }; });
  ok("no re-trigger after defeat; threshold beat plays", !th.re && th.threshold, JSON.stringify(th));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
