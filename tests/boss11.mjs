// Hollowmere, the Drinking Colossus (OPTIONAL W17 boss, Hushwater west meadow) + Stillwater Charm uniqueness/effect: node tests/boss11.mjs (after npm run build). KI_PORT. Writes docs/bill/boss11.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4492);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const FL = { introSeen: true, oath: true, brann: true, brannQ: true, heart: true, quarryBossDown: true, quarryBeat: true, sigilDone: true, sable1: true, sable2: true, tideBossDown: true };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.addInitScript(() => { let sd = 1111; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate((FL) => { localStorage.clear(); localStorage.setItem("kiquest-mb-v1", JSON.stringify({ boss1: true, boss2: true, boss3: true })); localStorage.setItem("kiquest.story.v1", JSON.stringify(FL)); }, FL);
  await page.reload(); await page.click("#startBtn");
  await page.waitForFunction(() => window.__ki?.game && window.__ki?.story && globalThis.__kiMB?.ARENA11, null, { timeout: 10000 }); await page.waitForTimeout(400);
  const E = (f, a) => page.evaluate(f, a);
  ok("Hollowmere is optional (HOLLOWMERE_REQUIRED=false)", await E(() => globalThis.__kiMB.HOLLOWMERE_REQUIRED === false));
  // gate: no bell / corvinDown -> the mere stays still, even standing on the ripple
  const gate = await E((FL) => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB; Object.assign(s.flags, FL); s.flags.bell = false; s.flags.corvinDown = false; s.save(); s.enter("hushwater"); s.box = null;
    g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); const A = M.ARENA11; g.p.x = A.tx * 16 + 8; g.p.y = A.ty * 16 + 8; for (let i = 0; i < 60; i++) { s.box = null; g.step(1 / 60); }
    const a = g.mb.boss11.active; s.flags.bell = true; for (let i = 0; i < 60; i++) { s.box = null; g.step(1 / 60); } return { area: g.area.id, a, b: g.mb.boss11.active }; }, FL);
  ok("gate: no wake without bell + corvinDown", gate.area === "hushwater" && !gate.a && !gate.b, JSON.stringify(gate));
  const wk = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB, A = M.ARENA11, cx = A.tx * 16 + 8, cy = A.ty * 16 + 8; s.flags.corvinDown = true;
    g.p.x = cx + 50; g.p.y = cy; for (let i = 0; i < 40; i++) { s.box = null; g.step(1 / 60); } const near = { hint: M.hollowLog.hinted, act: g.mb.boss11.active };
    g.p.x = cx; g.p.y = cy + 4; for (let i = 0; i < 6; i++) { s.box = null; g.step(1 / 60); } const m = M.hollowOf(g);
    return { near, act: g.mb.boss11.active, hp: m?.max, phase: g.mb.boss11.phase, banner: g.banner, wake: s.flags.hollowmereWake === true, tile: [A.tx, A.ty], r: A.r }; });
  ok("opt-in: hint near the ripple, wakes only on stepping in (560 HP, phase 1, banner, hollowmereWake)", wk.near.hint >= 1 && !wk.near.act && wk.act && wk.hp === 560 && wk.phase === 1 && wk.banner === "HOLLOWMERE, THE DRINKING COLOSSUS" && wk.wake, JSON.stringify(wk));
  await E(() => { window.__run = (m, extra) => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB, e = M.hollowOf(g); const L = M.hollowLog, b0 = JSON.parse(JSON.stringify(L)); const r = { tele: false, act: false, sunkHp: true };
      g.mb.boss11.lockT = 0; M.forceHollowMove(m); let seenAct = false;
      for (let i = 0; i < 60 * 12; i++) { s.box = null; g.p.inv = 1; g.hp = g.maxHp; e.hp = Math.max(e.hp, e.max * 0.7); if (extra) extra(g, e, r);
        g.step(1 / 60); if (e.state === "tele" && e.move === m) r.tele = true; if (e.state === "act" && e.move === m) { seenAct = true; r.act = true; } if (seenAct && e.state !== "act") break; }
      for (const k of ["shocks", "hazards", "safe", "drained", "pulled", "ripples", "surfaced", "sunkHits"]) r[k] = Math.round((L[k] - b0[k]) * 10) / 10; return r; }; });
  const lash = await E(() => window.__run("lash"));
  ok("lash: telegraphed water line (hazards) then strike", lash.tele && lash.act && lash.hazards >= 8, JSON.stringify(lash));
  const drink = await E(() => window.__run("drink", (g, e) => { g.ep = g.maxEp; g.p.x = e.x + 70; g.p.y = e.y; }));
  ok("drink: drains Glow + pulls the hero toward the maw, one safe ring offered", drink.act && drink.drained > 10 && drink.pulled > 0 && drink.safe === 1, JSON.stringify(drink));
  const safe = await E(() => window.__run("drink", (g, e, r) => { const h = g.mb.hazards.find((h) => h.safe && h.mere === 1); if (h) { g.p.x = h.x; g.p.y = h.y; } g.ep = g.maxEp; }));
  ok("drink: standing in the safe ring = no drain", safe.act && safe.drained === 0 && safe.pulled === 0, JSON.stringify(safe));
  const fog = await E(() => window.__run("fog"));
  ok("fog: arena-wide fog warnings with 3 lantern safe spots", fog.act && fog.safe === 3 && fog.hazards >= 10, JSON.stringify(fog));
  const sink = await E(() => window.__run("sink", (g, e, r) => { if (e.state === "act") { const h = e.hp; e.hurt = 0; g.damageFoe(e, 40, 0, 0, false); if (e.hp !== h) r.sunkHp = false; } }));
  ok("sink: 3 ripples (one on the hero), invulnerable while sunk, resurfaces", sink.act && sink.ripples === 3 && sink.surfaced === 1 && sink.sunkHits > 0 && sink.sunkHp, JSON.stringify(sink));
  const ph = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB, B = g.mb.boss11, e = M.hollowOf(g), out = [];
    for (const [want, frac] of [[2, 0.66], [3, 0.33]]) { const s0 = M.hollowLog.shocks; let banner = "";
      for (let i = 0; i < 400 && B.phase < want; i++) { s.box = null; if (i % 10 === 0 && e.hp > e.max * frac) { B.lockT = 0; e.hurt = 0; g.damageFoe(e, e.hp - e.max * frac + 1, 0, 0, false); } g.p.inv = 1; g.step(1 / 60); if (B.phase === want && !banner) banner = g.banner; }
      out.push({ want, phase: B.phase, banner, shocks: M.hollowLog.shocks - s0, lock: B.lockT > 0 }); }
    return out; });
  ok("3 phases at 66% / 33% with banner + shockwave + lock", ph[0].phase === 2 && ph[0].banner === "THE FOG RISES" && ph[1].phase === 3 && ph[1].banner === "THE MERE SINKS" && ph.every((p) => p.shocks === 1 && p.lock), JSON.stringify(ph));
  const pre = await E(() => { const g = window.__ki.game, L = window.__kiLoot; const c7 = L.GEAR.find((x) => x.id === "c7"); return { have: g.have.includes("c7"), src: c7?.src, at: c7?.at, name: c7?.name }; });
  ok("Stillwater Charm c7: source B (hollowmere) only, not owned before the kill", pre.src === "B" && pre.at === "hollowmere" && pre.name === "Stillwater Charm" && !pre.have, JSON.stringify(pre));
  // screenshot: phase 3, mid-fog telegraph, colossus framed
  await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, e = M.hollowOf(g); g.mb.boss11.lockT = 0; M.forceHollowMove("fog"); for (let i = 0; i < 400 && !(e.state === "tele" && e.move === "fog"); i++) { window.__ki.story.box = null; g.p.inv = 1; g.step(1 / 60); } g.p.x = e.x; g.p.y = e.y + 46; });
  await page.waitForTimeout(250); await page.screenshot({ path: "docs/bill/boss11.png" });
  const rw = await E(async () => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB, e = M.hollowOf(g), pts = g.pts; let n = 0;
    for (; n < 60 * 60 && !e.dead; n++) { s.box = null; g.p.inv = 1; g.hp = g.maxHp; if (n % 10 === 0) { g.mb.boss11.lockT = 0; e.hurt = 0; g.damageFoe(e, 60, 0, 0, false); } g.step(1 / 60); }
    for (let i = 0; i < 30; i++) g.step(1 / 60); await new Promise((r) => setTimeout(r, 900));
    return { n, dead: e.dead, flag: s.flags.hollowmereDown === true, sv: JSON.parse(localStorage.getItem("kiquest-mb-v1") || "{}").boss11 === true, done: g.mb.boss11.done, active: g.mb.boss11.active, dpts: g.pts - pts, banner: g.banner, c7: g.have.includes("c7"), hz: g.mb.hazards.filter((h) => h.mere != null).length }; });
  ok("Hollowmere falls: HOLLOWMERE SINKS, +4 pts, hollowmereDown + boss11 saved, hazards cleared", rw.dead && rw.flag && rw.sv && rw.done && !rw.active && rw.dpts >= 4 && rw.banner === "HOLLOWMERE SINKS" && rw.hz === 0, JSON.stringify(rw));
  ok("Stillwater Charm granted by the kill", rw.c7, JSON.stringify(rw));
  const uq = await E(() => { const g = window.__ki.game, L = window.__kiLoot; const shops = L.GEAR.filter((x) => x.src === "S").map((x) => x.id); g.have = g.have.filter((x) => x !== "c7"); const d0 = g.drops.length;
    L.debug.force = { gear: "c7", coins: 0 }; L.rollKill(g, g.p.x, g.p.y, false); const forced = g.drops.slice(d0).some((d) => d.id === "c7");
    let rolled = false; L.seed?.(7); for (let i = 0; i < 3000; i++) { const k = g.drops.length; L.rollKill(g, g.p.x, g.p.y, false); if (g.drops.slice(k).some((d) => d.id === "c7")) rolled = true; g.drops.length = d0; }
    const sources = L.GEAR.filter((x) => x.id === "c7").map((x) => x.src + ":" + x.at); g.have.push("c7"); return { inShop: shops.includes("c7"), forced, rolled, sources, dupes: L.GEAR.filter((x) => x.name === "Stillwater Charm").length }; });
  ok("unique: never in shops, never in loot rolls (even debug.force), single B source", !uq.inShop && !uq.forced && !uq.rolled && uq.sources.join() === "B:hollowmere" && uq.dupes === 1, JSON.stringify(uq));
  const ch = await E(() => { const g = window.__ki.game, s = window.__ki.story, M = globalThis.__kiMB, out = {};
    for (const a of ["hushwater", "drowned", "undertide", "kilnreach"]) { s.enter(a); s.box = null; g.gear.c = "c7"; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); const c0 = M.w17Log.charmEp;
      for (let i = 0; i < 120; i++) { s.box = null; g.ep = 0; g.p.inv = 1; g.step(1 / 60); } out[a] = { sw: M.stillwater(g), ep: Math.round((M.w17Log.charmEp - c0) * 100) / 100 }; }
    g.gear.c = ""; out.off = M.stillwater(g); return out; });
  ok("charm: Glow regen + fog light only in fog/water areas (1.5 EP/s in hushwater/drowned/undertide), not elsewhere", ["hushwater", "drowned", "undertide"].every((a) => ch[a].sw && ch[a].ep > 2.5 && ch[a].ep < 3.5) && !ch.kilnreach.sw && ch.kilnreach.ep === 0, JSON.stringify(ch));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}  ${d}`);
const pass = results.filter((r) => r[0] === "PASS").length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
