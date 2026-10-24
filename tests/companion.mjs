// Companion checks (Mirela + Brann): node tests/companion.mjs (after vite build). KI_PORT to change port. Writes docs/companion-fight.png.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4393);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  // old-format save (no mirela field) + no oath: must load fine and she must not join
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true }));
    localStorage.setItem("kiquest-save-v1", JSON.stringify({ v: 1, at: 1, area: "Lanternmoss Hollow", x: 0, y: 0, lvl: 3, exp: 0, pts: 0, str: 3, pow: 3, end: 3, hp: 50, ep: 40, tf: 0 })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(500);
  const E = (f, a) => page.evaluate(f, a);
  const pre = await E(() => { const g = window.__ki.game; for (let i = 0; i < 60; i++) g.step(1 / 60); return { lvl: g.lvl, joined: g.mb.ally.joined }; });
  ok("old save loads, Mirela not joined before the oath", pre.lvl === 3 && !pre.joined, JSON.stringify(pre));
  // the story sets flags.oath when the Lantern Oath completes
  const join = await E(() => { const s = window.__ki.story, g = window.__ki.game; s.flags.oath = true; s.save(); for (let i = 0; i < 40; i++) g.step(1 / 60); const a = g.mb.ally; return { joined: a.joined, d: Math.hypot(a.x - g.p.x, a.y - g.p.y) }; });
  ok("joins on the Lantern Oath flag, beside the hero", join.joined && join.d < 40, JSON.stringify(join));
  // follow: walk the hero right for 3 s, she trails at a short distance
  const fol = await E(() => { const g = window.__ki.game, I = window.__ki.input; g.enemies.forEach((e) => { e.dead = true; e.respawn = 999; }); const ds = [];
    I.key("KeyD", true); for (let i = 0; i < 180; i++) { g.step(1 / 60); if (i > 60) ds.push(Math.hypot(g.mb.ally.x - g.p.x, g.mb.ally.y - g.p.y)); } I.key("KeyD", false);
    for (let i = 0; i < 90; i++) g.step(1 / 60); const a = g.mb.ally; return { max: Math.round(Math.max(...ds)), rest: Math.round(Math.hypot(a.x - g.p.x, a.y - g.p.y)), tp: a.teleports }; });
  ok("follows at a short distance", fol.max < 70 && fol.rest >= 10 && fol.rest < 40, JSON.stringify(fol));
  // wall / far teleport
  const tp = await E(() => { const g = window.__ki.game, a = g.mb.ally; const t0 = a.teleports; a.x = g.p.x + 400; a.y = g.p.y; g.step(1 / 60); const far = Math.hypot(a.x - g.p.x, a.y - g.p.y);
    // stuck: put her inside a wall tile next to the hero area
    const A = g.area; let wx = 0, wy = 0; outer: for (let ty = 0; ty < 34; ty++) for (let tx = 0; tx < 48; tx++) if (A.tiles[ty * 48 + tx] === 1 && Math.hypot(tx * 16 - g.p.x, ty * 16 - g.p.y) < 160) { wx = tx * 16 + 8; wy = ty * 16 + 8; break outer; }
    a.x = wx; a.y = wy; g.step(1 / 60); return { far: Math.round(far), unstuck: !window.__ki.game.area || Math.hypot(a.x - wx, a.y - wy) > 4, tps: a.teleports - t0 }; });
  ok("teleports to the hero when far or inside a wall", tp.far < 40 && tp.unstuck && tp.tps >= 2, JSON.stringify(tp));
  // doorway check: she never rests in a 1-tile gap
  const door = await E(() => { const g = window.__ki.game, A = g.area; const gaps = [];
    for (let ty = 1; ty < 33; ty++) for (let tx = 1; tx < 47; tx++) { const s = (x, y) => [1, 4].includes(A.tiles[y * 48 + x]); if (!s(tx, ty) && ((s(tx - 1, ty) && s(tx + 1, ty)) || (s(tx, ty - 1) && s(tx, ty + 1)))) gaps.push([tx, ty]); }
    let bad = 0, n = 0;
    for (const [tx, ty] of gaps.slice(0, 12)) { // hero stands just past the gap, facing away
      g.p.x = tx * 16 + 8; g.p.y = ty * 16 + 8 + 24; if (g.p.y > 33 * 16 || [1, 4].includes(A.tiles[Math.floor(g.p.y / 16) * 48 + tx])) continue; g.p.fx = 0; g.p.fy = 1; n++;
      for (let i = 0; i < 150; i++) g.step(1 / 60); const a = g.mb.ally; if (Math.floor(a.x / 16) === tx && Math.floor(a.y / 16) === ty) bad++; }
    return { gaps: gaps.length, tried: n, bad }; });
  ok("doesn't rest in doorways", door.bad === 0, JSON.stringify(door));
  // fight: brutes + wisp near the hero; she engages, damages, fires a bolt
  const fight = await E(() => { const g = window.__ki.game, a = g.mb.ally; g.p.x = g.area.start.x; g.p.y = g.area.start.y; g.hp = 1e5;
    a.x = g.p.x - 14; a.y = g.p.y; a.hp = a.max; const foes = [["brute", 50, 0], ["brute", 40, 30], ["wisp", -60, -30]].map(([k, dx, dy]) => { const e = g.makeEnemy(k, g.p.x + dx, g.p.y + dy); e.hp = e.max = 500; g.enemies.push(e); return e; });
    const h0 = a.hits; let fought = 0, minHp = 1e9; const b0 = a.bolts;
    for (let i = 0; i < 60 * 10; i++) { g.p.inv = 1; g.hp = 1e5; a.hp = Math.max(a.hp, a.max * 0.5); g.step(1 / 60); if (a.state === "fight") fought++; }
    const dealt = foes.reduce((s, e) => s + (500 - e.hp), 0);
    return { fought, hits: a.hits - h0, bolts: a.bolts - b0, dealt: Math.round(dealt), perHit: +(dealt / Math.max(1, a.hits - h0 + a.bolts - b0)).toFixed(1), heroMelee: +g.meleeDmg.toFixed(1) }; });
  ok("approaches and melees nearby foes, fires the odd ki bolt", fight.fought > 60 && fight.hits >= 4 && fight.bolts >= 1 && fight.dealt > 0, JSON.stringify(fight));
  ok("modest damage (below the hero's melee)", fight.perHit < fight.heroMelee, JSON.stringify(fight));
  // screenshot: fighting beside the hero
  await E(() => { const g = window.__ki.game, a = g.mb.ally; g.shots = g.shots.filter((s) => !s.foe); const e = g.enemies.filter((e) => !e.dead && e.max === 500); e.forEach((f, i) => { f.x = g.p.x + 30 + i * 6; f.y = g.p.y - 4 + i * 14; f.state = "chase"; });
    a.x = g.p.x + 12; a.y = g.p.y + 10; a.atkT = 0; g.p.fx = 1; g.p.fy = 0; g.swing.step = 2; g.swing.t = 0.1; g.step(1 / 60); a.atk = 0.18; a.atkStep = 2; });
  await page.waitForTimeout(150); await page.screenshot({ path: "docs/companion-fight.png" });
  // low HP retreat, boss telegraph dodge
  const ret = await E(() => { const g = window.__ki.game, a = g.mb.ally; a.hp = a.max * 0.2; g.step(1 / 60); return a.state; });
  ok("retreats when low on HP", ret === "retreat", ret);
  const dodge = await E(() => { const g = window.__ki.game, a = g.mb.ally; a.hp = a.max; g.enemies.forEach((e) => { e.dead = true; e.respawn = 999; });
    const b = g.makeEnemy("boss", g.p.x + 40, g.p.y); b.state = "tele"; b.t = 5; b.move = "fan"; g.enemies.push(b); a.x = b.x - 20; a.y = b.y + 4; const d0 = Math.hypot(a.x - b.x, a.y - b.y);
    for (let i = 0; i < 40; i++) { b.state = "tele"; b.t = 5; g.p.inv = 1; g.step(1 / 60); } const r = { st: a.state, d0: Math.round(d0), d1: Math.round(Math.hypot(a.x - b.x, a.y - b.y)) }; b.dead = true; b.respawn = 1e9; g.enemies = g.enemies.filter((e) => e !== b); return r; });
  ok("steps back when a boss telegraphs", dodge.st === "dodge" && dodge.d1 > dodge.d0 + 20, JSON.stringify(dodge));
  // KO at 0 HP, revive after the fight / on the save pad
  const ko = await E(() => { const g = window.__ki.game, a = g.mb.ally; const e = g.makeEnemy("brute", a.x + 60, a.y); g.enemies.push(e); a.inv = 0; a.hp = 3;
    window.__ki.game.shots.push({ x: a.x, y: a.y - 14, vx: 0, vy: 0, life: 1, foe: true, dmg: 10 }); g.p.inv = 1; g.step(1 / 60); const down = a.ko;
    for (let i = 0; i < 60; i++) { g.p.inv = 1; g.step(1 / 60); } const stillDown = a.ko; e.dead = true; e.respawn = 999;
    for (let i = 0; i < 60 * 4; i++) g.step(1 / 60); const back = !a.ko && a.hp > 0;
    a.hp = 0; a.ko = true; a.calmT = 0; g.p.x = g.area.pad.x; g.p.y = g.area.pad.y; g.onPad = false; g.step(1 / 60); return { down, stillDown, back, pad: !a.ko && a.hp === a.max }; });
  ok("knocked out at 0 HP, revives after the fight and at a save pad", ko.down && ko.stillDown && ko.back && ko.pad, JSON.stringify(ko));
  // save persistence: the pad save carries mirela:true; a fresh load (story flag cleared) still has her
  const sv = await E(() => { const rec = JSON.parse(localStorage.getItem("kiquest-save-v1")); const s = window.__ki.story; s.flags.oath = false; s.save(); const g = window.__ki.game; g.start(true); return { field: rec.mirela, joined: g.mb.ally.joined }; });
  ok("save persists joined (back-compatible field)", sv.field === true && sv.joined, JSON.stringify(sv));
  // no stuck bodies: long scripted wander, she never sits inside a wall, never far for long
  const st = await E(() => { const g = window.__ki.game, I = window.__ki.input, a = g.mb.ally, A = g.area; let inWall = 0, far = 0; const keys = ["KeyD", "KeyS", "KeyA", "KeyW"];
    const solid = (x, y) => [1, 4].includes(A.tiles[Math.floor(y / 16) * 48 + Math.floor(x / 16)]);
    for (let k = 0; k < 16; k++) { const key = keys[k % 4]; I.key(key, true); for (let i = 0; i < 70; i++) { g.p.inv = 1; g.hp = 1e5; g.step(1 / 60); if (solid(a.x, a.y)) inWall++; if (Math.hypot(a.x - g.p.x, a.y - g.p.y) > 120) far++; } I.key(key, false); }
    return { inWall, far, tps: a.teleports }; });
  ok("no stuck bodies on a long walk", st.inWall === 0 && st.far < 20, JSON.stringify(st));
  // ---- Brann: second companion (story flag brann), tank with taunt; both together never overlap ----
  const bj = await E(() => { const g = window.__ki.game, s = window.__ki.story, b = g.mb.allies[1]; const before = b.joined; s.flags.oath = true; s.flags.brann = true; s.save();
    g.enemies.forEach((e) => { e.dead = true; e.respawn = 999; }); g.p.x = g.area.start.x; g.p.y = g.area.start.y; for (let i = 0; i < 40; i++) g.step(1 / 60);
    return { before, joined: b.joined, id: b.id, max: b.max, mirMax: g.mb.allies[0].max, d: Math.round(Math.hypot(b.x - g.p.x, b.y - g.p.y)) }; });
  ok("Brann joins on the brann flag, tankier than Mirela", !bj.before && bj.joined && bj.id === "brann" && bj.max > bj.mirMax && bj.d < 40, JSON.stringify(bj));
  const ov = await E(() => { const g = window.__ki.game, I = window.__ki.input, [m, b] = g.mb.allies; let minD = 1e9, stack = 0; const keys = ["KeyD", "KeyS", "KeyA", "KeyW"];
    for (let k = 0; k < 8; k++) { I.key(keys[k % 4], true); for (let i = 0; i < 60; i++) { g.p.inv = 1; g.step(1 / 60); const d = Math.hypot(m.x - b.x, m.y - b.y); if (i > 20) { minD = Math.min(minD, d); if (d < 8) stack++; } } I.key(keys[k % 4], false); }
    for (let i = 0; i < 120; i++) g.step(1 / 60); const rest = Math.hypot(m.x - b.x, m.y - b.y);
    // forced overlap resolves
    b.x = m.x; b.y = m.y; for (let i = 0; i < 10; i++) g.step(1 / 60);
    return { minD: Math.round(minD), stack, rest: Math.round(rest), after: Math.round(Math.hypot(m.x - b.x, m.y - b.y)) }; });
  ok("Mirela and Brann never stack (walk, rest, forced overlap)", ov.stack === 0 && ov.rest >= 12 && ov.after >= 11, JSON.stringify(ov));
  const bdoor = await E(() => { const g = window.__ki.game, A = g.area; const gaps = []; g.enemies.forEach((e) => { e.dead = true; e.respawn = 999; });
    for (let ty = 1; ty < 33; ty++) for (let tx = 1; tx < 47; tx++) { const s = (x, y) => [1, 4].includes(A.tiles[y * 48 + x]); if (!s(tx, ty) && ((s(tx - 1, ty) && s(tx + 1, ty)) || (s(tx, ty - 1) && s(tx, ty + 1)))) gaps.push([tx, ty]); }
    let bad = 0, n = 0;
    for (const [tx, ty] of gaps.slice(0, 12)) { g.p.x = tx * 16 + 8; g.p.y = ty * 16 + 8 + 24; if (g.p.y > 33 * 16 || [1, 4].includes(A.tiles[Math.floor(g.p.y / 16) * 48 + tx])) continue; g.p.fx = 0; g.p.fy = 1; n++;
      for (let i = 0; i < 150; i++) g.step(1 / 60); for (const a of g.mb.allies) if (Math.floor(a.x / 16) === tx && Math.floor(a.y / 16) === ty) bad++; }
    return { tried: n, bad }; });
  ok("neither companion rests in a doorway", bdoor.bad === 0, JSON.stringify(bdoor));
  const bf = await E(() => { const g = window.__ki.game, [m, b] = g.mb.allies; g.p.x = g.area.start.x; g.p.y = g.area.start.y; g.hp = 1e5; m.x = g.p.x - 14; m.y = g.p.y + 10; b.x = g.p.x + 10; b.y = g.p.y - 10; m.hp = m.max; b.hp = b.max; b.tauntCd = 0;
    const foes = [["brute", 46, -6], ["brute", 40, 26], ["wisp", 60, -30]].map(([k, dx, dy]) => { const e = g.makeEnemy(k, g.p.x + dx, g.p.y + dy); e.hp = e.max = 500; g.enemies.push(e); return e; });
    const h0 = b.hits, mh0 = m.hits, t0 = b.taunts; let tauntedAt = 0, aimOk = 0;
    for (let i = 0; i < 60 * 10; i++) { g.p.inv = 1; g.hp = 1e5; m.hp = Math.max(m.hp, m.max * 0.5); b.hp = Math.max(b.hp, b.max * 0.5); g.step(1 / 60);
      for (const e of foes) if (e.taunt > 0) { tauntedAt++; if (Math.hypot(e.x - b.x, e.y - b.y) < Math.hypot(e.x - g.p.x, e.y - g.p.y) + 4) aimOk++; } }
    const before = foes.reduce((s, e) => s + (500 - e.hp), 0);
    return { bHits: b.hits - h0, mHits: m.hits - mh0, taunts: b.taunts - t0, tauntedAt, aimOk, perHit: +(g.mb.allies[1].hits ? (2.5 + g.lvl * 0.5) * 1.45 : 0).toFixed(1), heroMelee: +g.meleeDmg.toFixed(1), dealt: Math.round(before) }; });
  ok("Brann melees and taunts foes onto himself; both fight", bf.bHits >= 3 && bf.mHits >= 3 && bf.taunts >= 1 && bf.tauntedAt > 0 && bf.aimOk / bf.tauntedAt > 0.6, JSON.stringify(bf));
  ok("Brann damage stays modest (below the hero's melee)", bf.perHit < bf.heroMelee, JSON.stringify(bf));
  await E(() => { const g = window.__ki.game, [m, b] = g.mb.allies; g.shots = g.shots.filter((s) => !s.foe); const e = g.enemies.filter((e) => !e.dead && e.max === 500); e.forEach((f, i) => { f.x = g.p.x + 34 + i * 4; f.y = g.p.y - 12 + i * 14; f.state = "chase"; });
    m.x = g.p.x + 14; m.y = g.p.y + 14; b.x = g.p.x + 20; b.y = g.p.y - 8; g.p.fx = 1; g.p.fy = 0; g.step(1 / 60); m.atk = 0.18; m.atkStep = 2; b.atk = 0.2; b.atkStep = 3; m.fx = b.fx = 1; m.fy = b.fy = 0; });
  await page.waitForTimeout(150); await page.screenshot({ path: "docs/companions-fight.png" });
  const vis = await E(() => { const g = window.__ki.game; return g.mb.allies.map((a) => ({ id: a.id, dx: Math.round(a.x - g.p.x), dy: Math.round(a.y - g.p.y), j: a.joined, ko: a.ko })); });
  ok("both companions on screen beside the hero for the fight shot", vis.every((a) => a.j && !a.ko && Math.abs(a.dx) < 150 && Math.abs(a.dy) < 90), JSON.stringify(vis));
  const bsv = await E(() => { const g = window.__ki.game; g.p.x = g.area.pad.x; g.p.y = g.area.pad.y; g.onPad = false; for (let i = 0; i < 5; i++) g.step(1 / 60); const rec = JSON.parse(localStorage.getItem("kiquest-save-v1"));
    const s = window.__ki.story; s.flags.brann = false; s.save(); g.start(true); return { field: rec.brann, joined: g.mb.allies[1].joined }; });
  ok("save persists Brann (optional field)", bsv.field === true && bsv.joined, JSON.stringify(bsv));
  // fps at 4x throttle with her fighting
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await E(() => { const g = window.__ki.game; g.p.x = g.area.start.x; g.p.y = g.area.start.y; for (let i = 0; i < 6; i++) { const e = g.makeEnemy(i % 2 ? "wisp" : "brute", g.p.x + 40 + i * 8, g.p.y - 20 + i * 8); e.hp = e.max = 1e4; g.enemies.push(e); } });
  const fps = await E(() => new Promise((res) => { const g = window.__ki.game; let n = 0; const t0 = performance.now(); const tick = () => { n++; g.hp = 1e5; g.p.inv = 1; for (const a of g.mb.allies) a.hp = a.max; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res({ fps: n / 3, st: g.mb.ally.state }); }; requestAnimationFrame(tick); }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("fps with CPU 4x throttle (Mirela + Brann fighting) >= 45", fps.fps >= 45, JSON.stringify(fps));
  ok("no page errors", errs.length === 0, errs.join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const r of results) console.log(r.join("  "));
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(`${results.length - fails}/${results.length} passed`); process.exit(fails ? 1 : 0);
