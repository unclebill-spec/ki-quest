// Malachar Vesh, the Last Dusk (finale, husk sun heart) checks: node tests/boss6.mjs (after npm run build). KI_PORT to change port. Writes docs/boss6-p5.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4491);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const FL = { introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, quarryBeat: true, sigilDone: true, sable1: true, sable2: true, tideBossDown: true, sable3: true, twist: true, malachar: true,
  stairIn: true, cageDone: true, sableJoin: true, morvantDown: true, threshold: true };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.addInitScript(() => { let sd = 6161; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate((FL) => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true, boss3: true, boss4: true, boss5: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify(FL)); }, FL);
  await page.reload(); await page.click("#startBtn");
  await page.waitForFunction(() => window.__ki?.game && window.__ki?.story && globalThis.__kiMB?.ARENA6, null, { timeout: 10000 }); await page.waitForTimeout(400);
  const E = (f, a) => page.evaluate(f, a);
  // gate: while the "inside the husk" scene has not played (huskIn unset, dialog up) he does not wake
  const gate = await E((FL) => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; Object.assign(s.flags, FL); s.flags.huskIn = false; s.save(); s.enter("husk"); s.box = { who: "test", lines: ["hold"], i: 0, t: 0 };
    g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); const cx = M.ARENA6.tx * 16 + 8, cy = M.ARENA6.ty * 16 + 8; g.p.x = cx; g.p.y = cy + 40; for (let i = 0; i < 20; i++) g.step(1 / 60); return { area: g.area.id, act: g.mb.boss6.active }; }, FL);
  ok("Malachar sleeps until the husk-sun scene has played (huskIn)", gate.area === "husk" && !gate.act, JSON.stringify(gate));
  const st = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; s.flags.huskIn = true; s.save(); s.box = null;
    const cx = M.ARENA6.tx * 16 + 8, cy = M.ARENA6.ty * 16 + 8; g.p.x = cx; g.p.y = cy + 40; for (let i = 0; i < 10; i++) g.step(1 / 60);
    const m = M.malacharOf(g), banner = g.banner; for (let i = 0; i < 80; i++) { g.p.y += 6; g.p.inv = 1; g.step(1 / 60); } const far = Math.hypot(g.p.x - cx, g.p.y - cy);
    return { tile: [M.ARENA6.tx, M.ARENA6.ty], act: g.mb.boss6.active, m: !!m, hp: m?.max, phase: g.mb.boss6.phase, far: Math.round(far), r: M.ARENA6.r, banner }; });
  ok("stepping onto the heart ring (Husk 24,15 r8) wakes Malachar, 1250 HP, phase 1 + banner", st.tile.join() === "24,15" && st.r === 128 && st.act && st.m && st.hp === 1250 && st.phase === 1 && /MALACHAR/.test(st.banner), JSON.stringify(st));
  ok("arena barrier keeps the hero on the ring", st.far <= st.r + 4, JSON.stringify(st));
  const p1 = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, m = M.malacharOf(g); g.mb.boss6.lockT = 0; const seq = []; let last = "", hz = 0; const sp0 = M.malacharLog.sparkles;
    for (let i = 0; i < 60 * 20; i++) { g.p.inv = 1; g.hp = g.maxHp; m.hp = m.max; const h0 = g.mb.hazards.length; g.step(1 / 60); if (g.mb.hazards.length > h0 && g.mb.hazards.at(-1).dusk != null) hz++; if (m.state !== last) { seq.push(m.state + ":" + m.move); last = m.state; } }
    let acts = 0, pre = 0; seq.forEach((s, i) => { if (s.startsWith("act")) { acts++; if (i > 0 && seq[i - 1].startsWith("tele")) pre++; } });
    return { acts, pre, hz, moves: [...new Set(seq.filter((s) => s.startsWith("tele")).map((s) => s.slice(5)))].sort().join(), sparkles: M.malacharLog.sparkles - sp0 }; });
  ok("P1: every move telegraphed first (crimson slash + bolt fan), neon ground warnings", p1.acts >= 6 && p1.pre === p1.acts && p1.hz > 0 && /slash/.test(p1.moves) && /cast/.test(p1.moves), JSON.stringify(p1));
  ok("heavy neon sparkle (>= 200 particles in 20 s of phase 1)", p1.sparkles >= 200, JSON.stringify(p1));
  const cp = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, m = M.malacharOf(g); let dodge = 0, tele = 0;
    for (let i = 0; i < 60 * 8; i++) { g.p.inv = 1; g.hp = g.maxHp; m.hp = m.max; for (const a of g.mb.allies) { a.hp = a.max; a.ko = false; } g.step(1 / 60); if (m.state === "tele") { tele++; if (g.mb.allies.some((a) => a.joined && a.state === "dodge")) dodge++; } }
    return { tele, dodge, joined: g.mb.allies.filter((a) => a.joined).map((a) => a.id).join() }; });
  ok("companions (Mirela, Brann, Sable) dodge his telegraphs", cp.joined.split(",").length === 3 && cp.tele > 0 && cp.dodge / cp.tele > 0.5, JSON.stringify(cp));
  const ph = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, B = g.mb.boss6, m = M.malacharOf(g), out = [];
    for (const [want, frac, need] of [[2, 0.75, ["prism"]], [3, 0.55, ["rain", "spiral"]], [4, 0.35, ["dusk", "nova"]], [5, 0.15, ["spiral", "prism", "dusk"]]]) {
      const s0 = M.malacharLog.shocks, sh0 = M.malacharLog.shots, c0 = [...M.malacharLog.colours]; let banner = "";
      for (let i = 0; i < 40 && B.phase < want; i++) { if (i % 10 === 0 && m.hp > m.max * frac) { B.lockT = 0; m.hurt = 0; g.damageFoe(m, m.hp - m.max * frac, 0, 0, false); } g.p.inv = 1; g.step(1 / 60); if (B.phase === want && !banner) banner = g.banner; }
      const phase = B.phase, shocks = M.malacharLog.shocks - s0, lock = B.lockT > 0, h0 = m.hp; m.hurt = 0; g.damageFoe(m, 30, 0, 0, false); const shielded = m.hp === h0;
      const seen = new Set(); let safeOk = true, safeN = 0, night = 0, maxBeams = 0;
      let tail = 90; for (let i = 0; i < 60 * 40 && tail > 0; i++) { if (need.every((n) => seen.has(n))) tail--; g.p.inv = 1; g.hp = g.maxHp; for (const a of g.mb.allies) { a.hp = a.max; a.ko = false; } m.hp = Math.max(m.max * (frac - 0.04), Math.min(m.hp, m.max * frac)); const was = m.state, hz0 = g.mb.hazards.length; g.step(1 / 60);
        if (m.state === "tele" && was !== "tele") { seen.add(m.move);
          if (m.move === "prism") maxBeams = Math.max(maxBeams, M.malacharLog.beams);
          if (m.move === "dusk") { const safe = g.mb.hazards.find((h) => h.safe); if (!safe) safeOk = false; else { safeN++; const dmg = g.mb.hazards.filter((h) => h.dusk != null && !h.safe && h.max > 0); night = dmg.length; if (dmg.some((h) => Math.hypot(safe.x - h.x, (safe.y - h.y) * 1.6) < h.r)) safeOk = false; } } } }
      out.push({ want, phase, shocks, lock, shielded, banner, seen: [...seen].sort().join(), shots: M.malacharLog.shots - sh0, safeOk, safeN, night, maxBeams, cols: M.malacharLog.colours.map((v, i) => v - c0[i]) }); }
    return out; });
  const BAN = ["THE STOLEN SPRINGS", "CROWN OF THORNS", "NIGHTFALL", "THE LAST LIGHT"];
  ok("5 phases: 80/60/40/20% each change with banner + prismatic shockwave + brief invulnerability", ph.every((p, i) => p.phase === p.want && p.shocks === 1 && p.lock && p.shielded && p.banner === BAN[i]), JSON.stringify(ph.map(({ want, phase, shocks, lock, shielded, banner }) => ({ want, phase, shocks, lock, shielded, banner }))));
  ok("P2 STOLEN SPRINGS: four-colour prism beams (red/violet/cyan/green warnings)", /prism/.test(ph[0].seen) && ph[0].maxBeams >= 4 && ph[0].cols.every((v) => v > 0), JSON.stringify(ph[0]));
  ok("P3 CROWN OF THORNS: spike rain + 4-arm spiral shots", /rain/.test(ph[1].seen) && /spiral/.test(ph[1].seen) && ph[1].shots >= 20, JSON.stringify(ph[1]));
  ok("P4 NIGHTFALL: night floods the ring, one warm light left safe (no warning overlaps it)", /dusk/.test(ph[2].seen) && /nova/.test(ph[2].seen) && ph[2].safeN >= 1 && ph[2].safeOk && ph[2].night >= 20, JSON.stringify(ph[2]));
  ok("P5 THE LAST LIGHT: 8 prism beams, 6-arm spirals, safe light still honoured", ph[3].maxBeams >= 8 && /spiral/.test(ph[3].seen) && ph[3].safeOk && ph[3].safeN >= 1, JSON.stringify(ph[3]));
  // screenshot: phase 5, mid-prism telegraph, Malachar fully framed, hero + three companions below
  await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, m = M.malacharOf(g), cx = M.ARENA6.tx * 16 + 8, cy = M.ARENA6.ty * 16 + 8; g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe);
    const put = () => { m.x = cx; m.y = cy - 10; g.p.x = cx; g.p.y = cy + 30; }; put();
    for (const [i, a] of g.mb.allies.entries()) { a.joined = true; a.ko = false; a.hp = a.max; a.x = cx - 40 + i * 40; a.y = cy + 48; }
    m.state = "chase"; m.t = 0; for (let k = 0; k < 900 && !(m.state === "tele" && m.move === "prism" && m.t < 0.5); k++) { if (m.state === "tele" && m.move !== "prism") { m.state = "chase"; m.t = 0; g.mb.hazards.length = 0; g.shots = g.shots.filter((s) => !s.foe); } else if (m.state !== "tele" && m.state !== "chase") { m.state = "chase"; m.t = 0; } g.p.inv = 1; g.hp = g.maxHp; put(); g.step(1 / 60); } });
  await page.waitForTimeout(200); await page.screenshot({ path: "docs/boss6-p5.png" });
  const vis = await E(() => { const g = window.__ki.game, m = globalThis.__kiMB.malacharOf(g), W = 384, H = 216, MW = 48 * 16, MH = 34 * 16;
    const cx = Math.max(0, Math.min(MW - W, g.p.x - W / 2)), cy = Math.max(0, Math.min(MH - H, g.p.y - 16 - H / 2)), sx = m.x - cx, sy = m.y - cy;
    return { active: g.mb.boss6.active, phase: g.mb.boss6.phase, box: [Math.round(sx - 24), Math.round(sy - 66), Math.round(sx + 24), Math.round(sy + 2)], move: m.move, state: m.state }; });
  ok("screenshot frames Malachar fully (sprite + crown inside the view), phase 5 bar live", vis.active && vis.phase === 5 && vis.box[0] >= 0 && vis.box[1] >= 0 && vis.box[2] <= 384 && vis.box[3] <= 216, JSON.stringify(vis));
  const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const fpsOnce = () => E(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / 2)); }; requestAnimationFrame(f); }));
  const fps = Math.max(await fpsOnce(), await fpsOnce());
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("fps with CPU 4x throttle (Malachar P5 + 3 companions + sparkle storm) >= 45", fps >= 45, String(fps));
  const rw = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, m = M.malacharOf(g); const pts = g.pts; g.mb.boss6.lockT = 0; m.hurt = 0; g.damageFoe(m, m.hp + 10, 0, 0, false); for (let i = 0; i < 30; i++) g.step(1 / 60);
    const sv = JSON.parse(localStorage.getItem("kiquest-mb-v1") || "{}"), flag = window.__ki.story.flags.malacharDown, saved = JSON.parse(localStorage.getItem("kiquest.story.v1") || "{}");
    return { dpts: g.pts - pts, flag, savedFlag: saved.malacharDown ?? saved.flags?.malacharDown, sv, hz: g.mb.hazards.length, fs: g.shots.filter((s) => s.foe).length, done: g.mb.boss6.done, active: g.mb.boss6.active, banner: g.banner }; });
  ok("Malachar falls: THE LAST DUSK ENDS banner, Sunheart +8 pts, hazards/shots cleared", rw.dpts >= 8 && rw.hz === 0 && rw.fs === 0 && rw.banner === "THE LAST DUSK ENDS", JSON.stringify(rw));
  ok("story flag malacharDown set and saved", rw.flag === true && rw.savedFlag === true, JSON.stringify(rw));
  ok("boss6 saved (merged with boss1-5)", rw.sv.boss1 && rw.sv.boss5 && rw.sv.boss6 && rw.done && !rw.active, JSON.stringify(rw));
  // hand-off: the story's husk ending reads malacharDown -> Wellsprings scene -> Malachar's last words -> dawn -> credits
  await page.waitForFunction(() => window.__ki.story.box?.who === "The Wellsprings", null, { timeout: 8000, polling: 50 }).catch(() => {});
  const end = await E(() => { const s = window.__ki.story, who = []; for (let k = 0; k < 10 && s.box; k++) { who.push(s.box.who); const t = s.box.then; s.box = null; t && t(); }
    return { who: who.join(">"), fade: s.flags.malacharFade === true, dawn: s.flags.dawn === true, credits: s.credits > 0, re: window.__ki.game.mb.boss6.active }; });
  ok("W17 hand-off: Wellsprings > Malachar, malacharFade saved (no dawn / credits yet: Warden Rune is next), no re-trigger", /^The Wellsprings>Malachar Vesh$/.test(end.who) && end.fade && !end.dawn && !end.credits && !end.re, JSON.stringify(end));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
