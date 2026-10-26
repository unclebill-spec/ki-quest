// Warden Rune, the Last Guardian (W17 true final boss, husk sun after Malachar): node tests/boss12.mjs (after npm run build). KI_PORT. Writes docs/bill/boss12.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4493);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const FL = { introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, quarryBeat: true, sigilDone: true, sable1: true, sable2: true, tideBossDown: true, sable3: true, twist: true, malachar: true,
  stairIn: true, cageDone: true, sableJoin: true, morvantDown: true, threshold: true, huskIn: true, malacharDown: true, poured: true };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.addInitScript(() => { let sd = 1212; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate((FL) => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true, boss3: true, boss4: true, boss5: true, boss6: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify(FL)); }, FL);
  await page.reload(); await page.click("#startBtn");
  await page.waitForFunction(() => window.__ki?.game && window.__ki?.story && globalThis.__kiMB?.ARENA12, null, { timeout: 10000 }); await page.waitForTimeout(400);
  const E = (f, a) => page.evaluate(f, a);
  // gate: Malachar down but his fade beat not played -> no Warden
  const gate = await E((FL) => { const g = window.__ki.game, s = window.__ki.story; Object.assign(s.flags, FL); s.save(); s.enter("husk"); s.box = { who: "test", lines: ["hold"], i: 0, t: 0 };
    g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); for (let i = 0; i < 30; i++) g.step(1 / 60); return { area: g.area.id, act: g.mb.boss12.active }; }, FL);
  ok("Warden sleeps until Malachar fades (malacharFade)", gate.area === "husk" && !gate.act, JSON.stringify(gate));
  const st = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; s.box = null; s.flags.malacharFade = true; s.flags.runeSeen = true; g.hp = 1; s.save();
    for (let i = 0; i < 10; i++) g.step(1 / 60); const e = M.runeOf(g), A = M.ARENA12, cx = A.tx * 16 + 8, cy = A.ty * 16 + 8, banner = g.banner, full = g.hp === g.maxHp;
    for (let i = 0; i < 80; i++) { g.p.y += 6; g.p.inv = 1; g.step(1 / 60); }
    return { act: g.mb.boss12.active, hp: e?.max, phase: g.mb.boss12.phase, banner, full, far: Math.round(Math.hypot(g.p.x - cx, g.p.y - cy)), r: A.r, obj: s.objective() }; });
  ok("Warden Rune wakes in the husk arena: 1500 HP, phase 1, banner, hero healed, objective", st.act && st.hp === 1500 && st.phase === 1 && st.banner === "WARDEN RUNE, LAST GUARDIAN" && st.full && st.obj === "Defeat Warden Rune, the last guardian", JSON.stringify(st));
  ok("arena barrier holds the hero (r 128)", st.r === 128 && st.far <= st.r + 4, JSON.stringify(st));
  await E(() => { window.__run = (m, extra) => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB, e = M.runeOf(g), L = M.runeLog, b0 = JSON.parse(JSON.stringify(L)); const r = { tele: false, act: false };
      g.mb.boss12.lockT = 0; M.forceRuneMove(m); let seenAct = false, hz0 = 0;
      for (let i = 0; i < 60 * 12; i++) { s.box = null; g.p.inv = 1; g.hp = g.maxHp; if (extra) extra(g, e, r); const was = e.state; g.step(1 / 60);
        if (e.state === "tele" && e.move === m) { if (was !== "tele") r.safeN = g.mb.hazards.filter((h) => h.safe && h.rune != null).length; r.tele = true; } if (e.state === "act" && e.move === m) { seenAct = true; r.act = true; } if (seenAct && e.state !== "act") break; }
      for (const k of ["shocks", "hazards", "safe", "gaps", "waves", "shots"]) r[k] = L[k] - b0[k]; r.beams = L.beams; r.echoes = Object.fromEntries(Object.entries(L.echoes).map(([k, v]) => [k, v - (b0.echoes[k] ?? 0)]).filter(([, v]) => v)); return r; }; });
  const mv = {}; for (const m of ["glyph", "slam", "wall", "beams", "seal"]) mv[m] = await E((m) => window.__run(m), m);
  ok("every move telegraphed then struck", Object.values(mv).every((r) => r.tele && r.act && r.hazards > 0), JSON.stringify(mv));
  ok("ward walls: 2 walls, each with a gap", mv.wall.gaps === 2, JSON.stringify(mv.wall));
  ok("wellspring beams: 4 beams x 3 waves", mv.beams.beams === 4 && mv.beams.waves === 3, JSON.stringify(mv.beams));
  ok("sealing: 3 closing rings + one safe centre", mv.seal.safe === 1 && mv.seal.safeN === 1, JSON.stringify(mv.seal));
  const ec = []; for (let i = 0; i < 6; i++) ec.push(await E(() => window.__run("echo")));
  const names = ec.map((r) => Object.keys(r.echoes).join("+"));
  ok("echoes of the fallen: round-robin ashmaw > hollowmere > slagheart > aurel > twins > malachar (aurel fires 10)", names.join(">") === "ashmaw>hollowmere>slagheart>aurel>twins>malachar" && ec[3].shots === 10 && ec.every((r) => r.hazards > 0), names.join(">") + " " + JSON.stringify(ec.map((r) => r.shots)));
  const ph = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB, B = g.mb.boss12, e = M.runeOf(g), out = [];
    for (const [want, frac] of [[2, 0.85], [3, 0.7], [4, 0.55], [5, 0.4], [6, 0.2]]) { const s0 = M.runeLog.shocks; let banner = "";
      for (let i = 0; i < 400 && B.phase < want; i++) { s.box = null; if (i % 10 === 0 && e.hp > e.max * frac) { B.lockT = 0; e.hurt = 0; g.damageFoe(e, e.hp - e.max * frac + 1, 0, 0, false); } g.p.inv = 1; g.step(1 / 60); if (B.phase === want && !banner) banner = g.banner; }
      const lock = B.lockT > 0, h0 = e.hp; e.hurt = 0; g.damageFoe(e, 30, 0, 0, false); out.push({ want, phase: B.phase, banner, shocks: M.runeLog.shocks - s0, lock, shielded: e.hp === h0 }); }
    return out; });
  const BAN = ["WARD WALLS", "THE WELLSPRING BEAMS", "THE SEALING", "ECHOES OF THE FALLEN", "THE LAST WATCH"];
  ok("6 phases at 85/70/55/40/20% with banner + shockwave + brief invulnerability", ph.every((p, i) => p.phase === p.want && p.banner === BAN[i] && p.shocks === 1 && p.lock && p.shielded), JSON.stringify(ph));
  const b6 = await E(() => window.__run("beams"));
  ok("P6 LAST WATCH: 6 beams x 3 waves", b6.beams === 6 && b6.waves === 3, JSON.stringify(b6));
  await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, e = M.runeOf(g); g.mb.boss12.lockT = 0; M.forceRuneMove("beams"); for (let i = 0; i < 400 && !(e.state === "tele" && e.move === "beams"); i++) { window.__ki.story.box = null; g.p.inv = 1; g.step(1 / 60); } g.p.x = e.x; g.p.y = e.y + 56; for (let i = 0; i < 8; i++) g.step(1 / 60); });
  await page.waitForTimeout(250); await page.screenshot({ path: "docs/bill/boss12.png" });
  const rw = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB, e = M.runeOf(g), pts = g.pts; let n = 0;
    for (; n < 60 * 60 && !e.dead; n++) { s.box = null; g.p.inv = 1; g.hp = g.maxHp; if (n % 10 === 0) { g.mb.boss12.lockT = 0; e.hurt = 0; g.damageFoe(e, 80, 0, 0, false); } g.step(1 / 60); }
    return { n, dead: e.dead, flag: s.flags.runeDown === true, sv: JSON.parse(localStorage.getItem("kiquest-mb-v1") || "{}"), done: g.mb.boss12.done, active: g.mb.boss12.active, dpts: g.pts - pts, banner: g.banner, hz: g.mb.hazards.length }; });
  ok("Warden Rune falls: THE WARDEN'S WATCH ENDS, +10 pts, runeDown + boss12 saved, hazards cleared", rw.dead && rw.flag && rw.sv.boss12 && rw.sv.boss6 && rw.done && !rw.active && rw.dpts >= 10 && rw.banner === "THE WARDEN'S WATCH ENDS" && rw.hz === 0, JSON.stringify(rw));
  await page.waitForFunction(() => window.__ki.story.box?.who === "Warden Rune", null, { timeout: 8000, polling: 50 }).catch(() => {});
  const end = await E(() => { const s = window.__ki.story, who = []; for (let k = 0; k < 10 && s.box; k++) { who.push(s.box.who); const t = s.box.then; s.box = null; t && t(); }
    return { who: who.join(">"), dawn: s.flags.dawn === true, credits: s.credits > 0, re: window.__ki.game.mb.boss12.active }; });
  ok("finale hand-off: Warden Rune > Rook, dawn saved, credits roll, no re-trigger", /^Warden Rune>.*Rook/.test(end.who) && end.dawn && end.credits && !end.re, JSON.stringify(end));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
