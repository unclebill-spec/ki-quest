// Hero voice barks: node tests/barks.mjs (after build). KI_PORT to change port.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4497);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const HEROES = ["rook", "mirela", "brann", "sable"], KINDS = ["attack", "hurt", "transform", "victory"];
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://localhost:${PORT}/ki-quest/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, oath: true, brann: true, sableJoin: true })); });
  await page.reload(); await page.click("#startBtn"); await page.waitForTimeout(600);
  const E = (f, a) => page.evaluate(f, a);
  await E(() => { let sd = 777; Math.random = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296); });
  // files: all 16 shipped and decodable; preload so later plays are audible
  const files = await E(async (names) => { const A = window.__ki.audio; A.unlock(); const bad = [];
    for (const n of names) { const r = await fetch("/ki-quest/audio/" + n + ".ogg").catch(() => null); if (!r || !r.ok) { bad.push(n); continue; } try { await A.ctx.decodeAudioData(await r.arrayBuffer()); } catch { bad.push(n); } A.load(n); }
    for (let i = 0; i < 60 && names.some((n) => !A.bufs.has(n)); i++) await new Promise((r) => setTimeout(r, 50));
    return { bad, loaded: names.filter((n) => A.bufs.has(n)).length, ctx: A.ctx.state }; }, HEROES.flatMap((h) => KINDS.map((k) => `bark-${h}-${k}`)));
  ok("16 bark files ship in public/audio and decode", files.bad.length === 0 && files.loaded === 16, JSON.stringify(files));
  const setup = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; });
    for (const [i, a] of g.mb.allies.entries()) { a.joined = true; a.ko = false; a.hp = a.max; a.x = g.p.x - 20 + i * 20; a.y = g.p.y + 16; } M.resetBarks(); return g.mb.allies.map((a) => a.id).join(); });
  // attack: hero finisher (combo step 3) barks; steps 1-2 do not
  const atk = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; M.resetBarks(); g.time += 10;
    const sw = (st) => { Object.assign(g.swing, { step: st, t: 0.06, queued: false, hitId: 0, chainT: 0 }); for (let i = 0; i < 4; i++) g.step(1 / 60); };
    sw(1); sw(2); const after12 = M.barkLog.played.filter((n) => n === "bark-rook-attack").length; g.time += 2; sw(3);
    return { after12, after3: M.barkLog.played.filter((n) => n === "bark-rook-attack").length }; });
  ok("Rook attack bark only on the combo finisher", atk.after12 === 0 && atk.after3 === 1, JSON.stringify(atk));
  // companions: real fight vs a brute; each ally's 3rd hit (finisher) barks
  const ca = await E((HA) => { const g = window.__ki.game, M = globalThis.__kiMB; M.resetBarks(); const hits0 = g.mb.allies.map((a) => a.hits);
    for (let i = 0; i < 60 * 30; i++) { g.p.inv = 1; g.hp = g.maxHp; for (const a of g.mb.allies) { a.hp = a.max; a.ko = false; a.inv = 1; }
      if (!g.enemies.some((e) => !e.dead && e.kind === "brute")) { g.enemies.push(Object.assign(structuredClone(g.enemies.find((e) => e.kind === "brute") ?? g.enemies[0]), { dead: false, hp: 400, max: 400, x: g.p.x + 24, y: g.p.y, kind: "brute", minion: true, respawn: 1e9, state: "chase" })); }
      g.step(1 / 60); if (HA.every((h) => M.barkLog.played.includes(`bark-${h}-attack`))) break; }
    return { played: M.barkLog.played.filter((n) => n.endsWith("-attack")), hits: g.mb.allies.map((a, i) => a.hits - hits0[i]) }; }, ["mirela", "brann", "sable"]);
  ok("Mirela, Brann and Sable attack barks on their finishers", ["mirela", "brann", "sable"].every((h) => ca.played.includes(`bark-${h}-attack`)), JSON.stringify(ca));
  // hurt: 1.5 s cooldown per hero
  const hu = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB; g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); M.resetBarks(); g.time += 10;
    const hit = () => { g.p.inv = 0; g.hp = g.maxHp; g.hurtHero(1, g.p.x + 10, g.p.y); };
    const allyHit = () => { for (const a of g.mb.allies) { a.inv = 0; a.ko = false; a.hp = a.max; g.shots.push({ x: a.x, y: a.y - 14, vx: 0, vy: 0, life: 1, foe: true, dmg: 1 }); } g.step(1 / 60); };
    hit(); allyHit(); g.time += 0.7; hit(); allyHit(); const at07 = M.barkLog.played.filter((n) => n.endsWith("-hurt")).length; const cd = M.barkLog.skippedCd;
    g.time += 1.0; hit(); allyHit();
    const hurts = M.barkLog.played.filter((n) => n.endsWith("-hurt")); return { at07, cd, total: hurts.length, heroes: [...new Set(hurts)].sort().join() }; });
  ok("hurt barks for all four, 1.5 s cooldown per hero", hu.at07 === 4 && hu.cd >= 4 && hu.total === 8 && hu.heroes === "bark-brann-hurt,bark-mirela-hurt,bark-rook-hurt,bark-sable-hurt", JSON.stringify(hu));
  // transform: party barks + music ducks 6 dB while it plays; one bark per hero at a time
  await page.waitForTimeout(400);
  const tf = await E(async () => { const g = window.__ki.game, M = globalThis.__kiMB, A = window.__ki.audio; M.resetBarks(); g.time += 10; A.setMute(false); A.setMusic(""); A.setMusic("area1-theme");
    g.tf = 100; const did = M.transform(g); g.p.inv = 0; g.hurtHero(1, g.p.x + 10, g.p.y); const busy = M.barkLog.skippedBusy;
    // W20: wait for the audio clock to move past the duck start (under load it can sit at ~0.01 s for >150 ms, and gain.value only shows the automation once the audio thread renders)
    const t0 = A.ctx.currentTime; await new Promise((r) => setTimeout(r, 150)); for (let i = 0; i < 40 && A.ctx.currentTime < t0 + 0.1; i++) await new Promise((r) => setTimeout(r, 50)); const gain = A.music.gain.value, until = A.duckUntil - A.ctx.currentTime;
    return { did, tfs: M.barkLog.played.filter((n) => n.endsWith("-transform")).sort().join(), busy, hurtAfter: M.barkLog.played.filter((n) => n === "bark-rook-hurt").length, gain: +gain.toFixed(3), until: +until.toFixed(2), played: A.played.filter((n) => n.startsWith("bark-") && n.endsWith("transform")).length }; });
  ok("transform barks for the party", tf.did && tf.tfs === "bark-brann-transform,bark-mirela-transform,bark-rook-transform,bark-sable-transform" && tf.played === 4, JSON.stringify(tf));
  ok("transform bark ducks the music 6 dB while it plays", Math.abs(tf.gain - 0.225) < 0.01 && tf.until > 1, JSON.stringify(tf));
  ok("only one bark per hero at a time (hurt during transform bark is skipped)", tf.busy >= 1 && tf.hurtAfter === 0, JSON.stringify(tf));
  // victory: real boss kill (Malachar via damageFoe)
  const vi = await E(() => { const g = window.__ki.game, M = globalThis.__kiMB, s = window.__ki.story; M.resetBarks(); g.time += 10; g.mb.tfOn = false;
    Object.assign(s.flags, { huskIn: true }); s.enter("husk"); g.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); for (const a of g.mb.allies) { a.joined = true; a.ko = false; a.hp = a.max; } M.startMalachar(g);
    const b = g.enemies.find((e) => e.kind === "malachar" && !e.dead); if (!b) return { boss: false };
    for (let i = 0; i < 400 && !b.dead; i++) { g.p.inv = 1; g.hp = g.maxHp; g.mb.boss6.lockT = 0; b.hurt = 0; g.damageFoe(b, 200, 0, 0, false); g.step(1 / 60); }
    return { boss: true, al: g.mb.allies.map((a) => a.id + (a.joined ? 'J' : '') + (a.ko ? 'K' : '')).join(), dead: b.dead, v: M.barkLog.played.filter((n) => n.endsWith("-victory")).sort().join() }; });
  ok("victory barks for the party on a boss kill", vi.dead && vi.v === "bark-brann-victory,bark-mirela-victory,bark-rook-victory,bark-sable-victory", JSON.stringify(vi));
  await page.waitForTimeout(300);
  const au = await E(() => window.__ki.audio.played.filter((n) => n.endsWith("-victory")).length);
  ok("victory barks reach the audio engine", au === 4, String(au));
  ok("no console/page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(s, n, s === "FAIL" ? d : "");
console.log(`${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
process.exit(results.every((r) => r[0] === "PASS") ? 0 : 1);
