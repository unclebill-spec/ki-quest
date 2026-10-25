// Mini-bosses (src/game/enemies/minis.ts): node tests/minis.mjs (after npm run build). KI_PORT to change port. KI_MINI=kettle to run one.
// Per boss: gate closed -> no wake; gate open + hero inside the r3 ring -> fight; telegraphs fire and companions dodge;
// phases advance; REAL kill through g.damageFoe sets the story flag (saved) and the boss slot; per-boss extras (guards, decoys).
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4495);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
// [kind, slot, flag, gate-open flags, gate-closed flags, mb done slots needed]
const CASES = [
  ["kettle", "boss7", "kettleDown", { brannQ: true, kettleSeen: true }, { brannQ: true, heart: true, kettleSeen: true }, { boss1: true }],
  ["corvin", "boss8", "corvinDown", { reedQ: true, reedN: 2, corvinSeen: true }, { reedQ: true, bell: true, corvinSeen: true }, { boss1: true }],
  ["gilt", "boss10", "capDone", { capQ: true, capSeen: true }, { capSeen: true }, {}],
  ["ombrelle", "boss9", "ombrelleDown", { oath: true, ombrelleSeen: true }, { oath: true, ombrelleDown: false, ombrelleSeen: true, _noBoss1: true }, { boss1: true }],
].filter((c) => !process.env.KI_MINI || c[0] === process.env.KI_MINI);
const browser = await chromium.launch();
try {
  for (const [kind, slot, flag, FL, CLOSED, MBD] of CASES) {
    const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
    const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    await page.goto(`http://localhost:${PORT}/ki-quest/`);
    await page.evaluate(({ FL, MBD }) => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify(MBD)); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, metAma: true, ...FL })); }, { FL, MBD });
    await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
    const E = (f, a) => page.evaluate(f, a);
    await E(() => { let sd = 2718; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
    const go = (fl) => E(({ kind, fl }) => { const g = window.__ki.game, s = window.__ki.story, S = globalThis.__kiMB.MINIS.find((m) => m.kind === kind);
      for (const k of Object.keys(s.flags)) if (!["introSeen", "metAma"].includes(k)) delete s.flags[k]; Object.assign(s.flags, fl);
      s.enter(S.area); s.box = null; g.p.x = S.tx * 16 + 8; g.p.y = S.ty * 16 + 8;
      g.mb.allies.forEach((a, i) => { if (i < 2) { a.joined = true; a.ko = false; a.hp = a.max; a.x = g.p.x - 10 + i * 20; a.y = g.p.y + 10; } });
      const bd = g.mb.boss.done; if (fl._noBoss1) g.mb.boss.done = false; // Ombrelle's gate also needs Area 1's boss
      for (let i = 0; i < 90; i++) { s.box = null; g.p.inv = 1; g.hp = g.maxHp; g.step(1 / 60); }
      g.mb.boss.done = bd;
      const e = g.enemies.find((e) => e.kind === kind && !e.dead); const cl = S.clear.filter(([tx, ty]) => g.enemies.some((f) => !f.dead && !f.minion && f.kind !== kind && Math.abs(f.hx - tx * 16 - 8) < 9 && Math.abs(f.hy - ty * 16 - 8) < 9)).length;
      return { area: g.area.id, boss: !!e, act: g.mb[S.slot].active, cleared: S.clear.length - cl, of: S.clear.length }; }, { kind, fl });
    const c0 = await go(CLOSED);
    ok(`${kind}: ring stays quiet while the gate is shut`, !c0.boss && !c0.act, JSON.stringify(c0));
    const c1 = await go(FL);
    ok(`${kind}: wakes inside the ring when the gate is open (in-ring spawns cleared)`, c1.boss && c1.act && c1.cleared === c1.of, JSON.stringify(c1));
    if (kind === "corvin") {
      await E(() => { const g = window.__ki.game, o = g.area.orbs[0]; g.p.x = o.x; g.p.y = o.y + 6; }); await page.waitForTimeout(200);
      const b = await E(() => !!window.__ki.story.flags.bell);
      ok("corvin: the Ferry Bell can't be picked up while he stands", !b);
    }
    await page.waitForTimeout(400); await page.screenshot({ path: `docs/bill/mini-${kind}.png` });
    const f = await E(({ kind, slot, flag }) => { const g = window.__ki.game, L = globalThis.__kiMB.miniLog; let n = 0, dodge = 0, tele = 0, haz = 0;
      const k0 = g.stats.kills, t0 = Object.values(L.moves).reduce((a, b) => a + b, 0);
      for (; n < 60 * 200 && !window.__ki.story.flags[flag]; n++) {
        g.p.inv = 1; g.hp = g.maxHp; for (const a of g.mb.allies) if (a.joined) { a.hp = a.max; a.ko = false; }
        const e = g.enemies.find((e) => e.kind === kind && !e.dead);
        if (e && e.state === "tele") { tele++; if (g.mb.allies.some((a) => a.joined && a.state === "dodge")) dodge++; }
        haz = Math.max(haz, g.mb.hazards.length);
        if (e && n > 240 && n % 30 === 0 && e.state !== "tele") { g.mb[slot].lockT = 0; e.hurt = 0; g.damageFoe(e, Math.ceil(e.max / 30), 0, 0, false); }
        // Corvin: hold him above the P3 line until an echo decoy has been killed (companions can't finish him early),
        // and from P2 on force the echo move (test hook) instead of waiting for the RNG to pick it.
        if (kind === "corvin" && e && L.decoyKills === 0) { e.hp = Math.max(e.hp, Math.ceil(e.max * 0.4)); if (g.mb[slot].phase >= 2 && e.state !== "tele" && !g.enemies.some((q) => q.decoy && !q.dead)) globalThis.__kiMB.forceMiniMove("corvin", "echo"); }
        const dq = g.enemies.find((q) => q.decoy && !q.dead); if (dq && n % 45 === 0) { dq.hurt = 0; g.damageFoe(dq, 99, 0, 0, false); } // hero swats an echo
        g.step(1 / 60);
      }
      return { n, down: !!window.__ki.story.flags[flag], phase: L.phases[kind] ?? 1, moves: Object.values(L.moves).reduce((a, b) => a + b, 0) - t0, tele, dodge, haz,
        done: g.mb[slot].done, saved: JSON.parse(localStorage.getItem("kiquest-mb-v1") || "{}")[slot] === true, story: JSON.parse(localStorage.getItem("kiquest.story.v1") || "{}")[flag] === true,
        realKills: g.stats.kills - k0, minions: g.enemies.filter((e) => e.minion && !e.dead).length, act: g.mb[slot].active }; }, { kind, slot, flag });
    ok(`${kind}: telegraphs fire (moves, hazards) and companions dodge them`, f.moves >= 3 && f.tele > 0 && f.dodge > 0, JSON.stringify({ moves: f.moves, tele: f.tele, dodge: f.dodge, haz: f.haz }));
    ok(`${kind}: reaches its last phase`, f.phase >= 3, `phase ${f.phase}`);
    ok(`${kind}: REAL kill sets ${flag} (saved) and ${slot}`, f.down && f.story && f.done && f.saved && !f.act && f.minions === 0, JSON.stringify(f));
    const r = await E(({ kind }) => { const g = window.__ki.game; for (let i = 0; i < 60; i++) g.step(1 / 60); return !g.enemies.some((e) => e.kind === kind && !e.dead); }, { kind });
    ok(`${kind}: stays down`, r);
    if (kind === "corvin") {
      await E(() => { const g = window.__ki.game, o = g.area.orbs[0]; g.p.x = o.x; g.p.y = o.y + 6; }); await page.waitForTimeout(200);
      const d = await E(() => { const s = window.__ki.story, L = globalThis.__kiMB.miniLog; return { decoys: L.decoys, decoyKills: L.decoyKills, reedN: s.flags.reedN, bell: !!s.flags.bell }; });
      // reedN may rise from real meadow foes the allies fell; it must never include the echo decoys
      ok("corvin: echo decoys are killed but never count toward reedN", d.decoyKills > 0 && d.reedN - 2 === f.realKills, JSON.stringify({ ...d, realKills: f.realKills }));
      ok("corvin: bell is pickable once he falls", d.bell);
    }
    ok(`${kind}: no page errors`, errs.length === 0, errs.slice(0, 3).join(" | "));
    await page.close();
  }
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
