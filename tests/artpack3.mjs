// Art pack 3: Area 2 foes, FX strips, explicit right-facing rows. node tests/artpack3.mjs (after build). KI_PORT to change port.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4498);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const NEW = ["reed_wraith", "witchlight_newt", "fen_warden", "mossback_snapper", "duskhound", "mossling", "hush_squire", "bog_sprout"];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, oath: true })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(800);
  const E = (f, a) => page.evaluate(f, a);
  await E(() => { let sd = 4242; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  // right rows: hero walking right draws walk_right_N (no mirror); hero walking left uses left rows; a 48x64 boss sheet still mirrors
  await page.mouse.click(576, 324); await page.keyboard.down("d"); await page.waitForTimeout(400);
  const R = await E(() => ({ ...globalThis.__kiMB.drawLog.rook, fx: window.__ki.game.p.fx }));
  await page.keyboard.up("d"); await page.keyboard.down("a"); await page.waitForTimeout(400);
  const L = await E(() => ({ ...globalThis.__kiMB.drawLog.rook }));
  await page.keyboard.up("a");
  ok("hero facing right draws from *_right frames (not mirrored)", /^walk_right_\d$/.test(R.key) && R.flip === false, JSON.stringify(R));
  ok("hero facing left draws from *_left frames", /_left_\d$/.test(L.key) && L.flip === false, JSON.stringify(L));
  const rows = await E(async (names) => { const M = globalThis.__kiMB; names.forEach((n) => M.sheet(n)); for (let i = 0; i < 60 && names.some((n) => !M.sheet(n)); i++) await new Promise((r) => setTimeout(r, 50));
    return names.map((n) => { const s = M.sheet(n); return [n, !!s && [...s.rects.keys()].some((k) => k.includes("_right_"))]; }); }, ["rook", "mirela", "brann", ...NEW, "malachar"]);
  ok("all 11 art-pack sheets carry explicit right rows", rows.slice(0, 11).every((r) => r[1]), JSON.stringify(rows));
  // Hushwater spawns: all 8 new kinds on the existing g/w markers, no old brute/wisp
  const hw = await E(() => { const g = window.__ki.game, s = window.__ki.story; s.box = null; s.enter("hushwater"); s.box = null;
    return { kinds: g.area.spawns.map((x) => x.kind), live: g.enemies.filter((e) => !e.minion).map((e) => e.kind) }; });
  ok("Hushwater g/w markers spawn all 8 Area 2 foes", NEW.every((k) => hw.kinds.includes(k)) && !hw.kinds.some((k) => k === "brute" || k === "wisp") && hw.kinds.length === 9, JSON.stringify(hw.kinds));
  ok("each Area 2 foe has FOE_INFO-backed hp", await E((NEW) => window.__ki.game.enemies.filter((e) => NEW.includes(e.kind)).every((e) => e.max > 0 && e.hp === e.max), NEW));
  // every new foe draws from its own sheet
  await E(() => { const g = window.__ki.game; g.enemies.forEach((e, i) => { e.x = g.p.x - 60 + (i % 5) * 30; e.y = g.p.y - 30 + Math.floor(i / 5) * 40; e.hx = e.x; e.hy = e.y; e.state = "idle"; }); });
  await page.waitForTimeout(400);
  const drawn = await E((NEW) => NEW.filter((n) => globalThis.__kiMB.drawLog[n]), NEW);
  ok("all 8 Area 2 foes draw from their sheets", drawn.length === 8, JSON.stringify(drawn));
  // behaviours (sim stepped by hand, hero invulnerable, others parked)
  const solo = (kind, dx, body) => E(({ kind, dx, body }) => { const g = window.__ki.game; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); g.mb.allies.forEach((a) => (a.joined = false)); g.shots.length = 0; g.mb.hazards.length = 0;
    const e = g.enemies.find((x) => x.kind === kind); Object.assign(e, { dead: false, x: g.p.x + dx, y: g.p.y, hx: g.p.x + dx, hy: g.p.y, state: "chase", t: -2, hurt: 0, hp: e.max }); return new Function("g", "e", body)(g, e); }, { kind, dx, body });
  const wraith = await solo("reed_wraith", 120, "let cast = false, max = 0; const f0 = g.stats.foeShots; for (let i = 0; i < 400; i++) { g.p.inv = 1; g.step(1/60); if (e.state === 'tele') cast = true; if (cast && e.state === 'recover') { max = g.stats.foeShots - f0; break; } } return { cast, max };");
  ok("Reed Wraith casts (telegraph) and fires a 3-bolt fan", wraith.cast && wraith.max === 3, JSON.stringify(wraith));
  const warden = await solo("fen_warden", 30, "for (let i = 0; i < 10; i++) g.step(1/60); e.state = 'chase'; e.guard = true; e.ax = -1; e.ay = 0; const g0 = g.stats.guarded ?? 0, hp0 = e.hp; g.damageFoe(e, 10, 50, 0, false); return { guarded: (g.stats.guarded ?? 0) - g0, lost: hp0 - e.hp };");
  ok("Fen Warden blocks frontal hits with its shield", warden.guarded === 1 && warden.lost < 3, JSON.stringify(warden));
  const squire = await solo("hush_squire", 52, "let lunged = false, hp0 = g.hp, d0 = Math.hypot(e.x - g.p.x, e.y - g.p.y); for (let i = 0; i < 120; i++) { g.p.inv = 0; g.step(1/60); if (e.state === 'act') lunged = true; if (g.hp < hp0) break; } return { lunged, d0: Math.round(d0), hit: hp0 - g.hp };");
  ok("Hush Squire lunges from rapier range (~52 px) and connects", squire.lunged && squire.hit > 0, JSON.stringify(squire));
  const hound = await solo("duskhound", 30, "let lunged = false; for (let i = 0; i < 90; i++) { g.p.inv = 1; g.step(1/60); if (e.state === 'act') lunged = true; } return { lunged };");
  ok("Duskhound rushes and lunges", hound.lunged, JSON.stringify(hound));
  const sprout = await solo("bog_sprout", 90, "const x0 = e.x, y0 = e.y; const f0 = g.stats.foeShots; for (let i = 0; i < 300; i++) { g.p.inv = 1; g.step(1/60); } const shots = g.stats.foeShots - f0; return { moved: Math.round(Math.hypot(e.x - x0, e.y - y0)), shots };");
  ok("Bog Sprout stays rooted and spits", sprout.moved < 3 && sprout.shots >= 1, JSON.stringify(sprout));
  // FX strips: trigger each and let the renderer draw
  await E(() => { const g = window.__ki.game; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); g.shots.length = 0; g.mb.hazards.length = 0; });
  await E(() => { const g = window.__ki.game; g.ep = g.maxEp; g.shots.push({ x: g.p.x + 10, y: g.p.y - 14, vx: 260, vy: 0, life: 0.3, foe: false, dmg: 1, tech: 0 }); });
  await page.waitForTimeout(700);
  await E(() => { const g = window.__ki.game; g.mb.charging = true; g.mb.charge = 0.4; });
  await page.waitForTimeout(300);
  await E(() => { const g = window.__ki.game; g.mb.charging = false; g.mb.charge = 0; g.tf = 100; globalThis.__kiMB.transform(g); });
  await page.waitForTimeout(900);
  await page.keyboard.down("d"); await page.waitForTimeout(500); await page.keyboard.up("d"); await page.waitForTimeout(500);
  const fx = await E(() => ({ ...globalThis.__kiMB.fxLog }));
  const NAMES = ["kiblast_charge", "kiblast_projectile", "kiblast_impact", "flight_takeoff_dust", "flight_trail", "transform_burst"];
  ok("all 6 FX strips draw (charge, projectile, impact, takeoff dust, trail, transform burst)", NAMES.every((n) => fx[n] > 0), JSON.stringify(fx));
  ok("FX strips are draw-side only (transform still runs its timer)", await E(() => window.__ki.game.mb.tfOn && window.__ki.game.mb.tfT > 0));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const r of results) console.log(r.join("  "));
const pass = results.filter((r) => r[0] === "PASS").length;
console.log(`${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
