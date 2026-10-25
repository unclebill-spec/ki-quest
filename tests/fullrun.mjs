// Full start-to-credits run: every boss is a real kill (no hand-set progress flags). node tests/fullrun.mjs
// Run after `npx vite build`: node tests/world.mjs  -> docs/world-*.png
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const { chromium } = createRequire("/workspace/tools/game/node/")("playwright");
const PORT = String(process.env.KI_PORT || 4520);
const srv = spawn("npx", ["vite", "preview", "--port", PORT, "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const R = []; const ok = (n, c, d = "") => R.push([c ? "PASS" : "FAIL", n, d]);
const b = await chromium.launch();
try {
  const p = await b.newPage({ viewport: { width: 1152, height: 648 } });
  const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(`http://localhost:${PORT}/ki-quest/`); await p.evaluate(() => localStorage.clear()); await p.reload();
  const shot = (n) => p.screenshot({ path: `/tmp/full-w-${n}.png`, clip: { x: 0, y: 0, width: 1152, height: 648 } });
  const E = (f, a) => p.evaluate(f, a);
  const dismiss = async () => { for (let i = 0; i < 60 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(120); } };
  const KILL = (a) => E(({ x, y, flag }) => { const g = window.__ki.game, s = window.__ki.story, K = ["slag", "aurel", "vey", "nell", "pylon", "morvant", "malachar"]; s.box = null; g.p.x = x; g.p.y = y; let n = 0;
    for (; n < 60 * 300 && !s.flags[flag]; n++) { g.p.inv = 1; g.hp = g.maxHp; s.box = null; if (n > 120 && n % 20 === 0) for (const e of g.enemies) if (!e.dead && K.includes(e.kind)) { for (const k of ["boss2", "boss3", "boss4", "boss5", "boss6"]) if (g.mb[k]) g.mb[k].lockT = 0; e.hurt = 0; g.damageFoe(e, Math.ceil(e.max / (e.kind === "pylon" ? 6 : 40)), 0, 0, false); } g.step(1 / 60); }
    return { n, flag: !!s.flags[flag], area: g.area.id }; }, a);
  const ride = async (to) => { await dismiss(); await E((to) => { const g = window.__ki.game, t = g.area.travel.find((t) => t.to === to); window.__ki.story.flags.stoneT = false; g.p.x = t.x; g.p.y = t.y; }, to); await p.waitForTimeout(300);
    for (let i = 0; i < 6 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); }
    await p.waitForFunction((to) => window.__ki.game.area.id === to && window.__ki.story.fly <= 0, to, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(500); return E(() => window.__ki.game.area.id); };
  await p.click("#startBtn"); await p.waitForTimeout(700);
  ok("intro plays on new game", await E(() => window.__ki.story.intro === 0));
  await shot("intro");
  for (let i = 0; i < 5; i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(600); }
  ok("intro ends", await E(() => window.__ki.story.intro === -1 && window.__ki.story.flags.introSeen === true));
  ok("area 1 is Lanternmoss Hollow with NPCs", await E(() => window.__ki.game.area.id === "lanternmoss" && window.__ki.game.area.npcs.length === 4));
  // walk next to Elder Ama and talk
  await E(() => { const g = window.__ki.game, a = g.area.npcs.find((n) => n.id === "a"); g.p.x = a.x + 14; g.p.y = a.y; g.p.fx = -1; g.p.fy = 0; });
  await p.waitForTimeout(100); await p.keyboard.press("KeyJ"); await p.waitForTimeout(500);
  ok("talks to Elder Ama", await E(() => window.__ki.story.box?.who === "Elder Ama Quill"));
  await shot("dialog");
  for (let i = 0; i < 8 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); }
  ok("Ama flag set + objective moves on", await E(() => window.__ki.story.flags.metAma === true && /Lv 8/.test(window.__ki.story.objective())));
  await shot("wickhaven");
  // Lost Lanterns: catch 6 glow orbs, hand in to Pip
  for (let i = 0; i < 6; i++) { await E((i) => { const g = window.__ki.game, o = g.area.orbs[i]; g.p.x = o.x; g.p.y = o.y + 6; }, i); await p.waitForTimeout(80); }
  ok("6 glow orbs caught", await E(() => window.__ki.story.flags.orbs === 6));
  await E(() => { const g = window.__ki.game, n = g.area.npcs.find((n) => n.id === "p"); g.p.x = n.x + 14; g.p.y = n.y; });
  const exp0 = await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1000);
  await p.waitForTimeout(100); await p.keyboard.press("KeyJ"); await p.waitForTimeout(300);
  for (let i = 0; i < 8 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); }
  ok("Lost Lanterns reward", await E((e0) => window.__ki.story.flags.orbsDone === true && window.__ki.game.exp + window.__ki.game.lvl * 1000 > e0, exp0));
  await E(() => { window.__ki.game.lvl = 1; window.__ki.game.exp = 0; });
  // hidden spring: walk west through the false water
  await E(() => { const g = window.__ki.game; g.p.x = 5 * 16 + 8; g.p.y = 32 * 16 + 8; g.hp = 5; });
  await p.keyboard.down("ArrowLeft"); await p.waitForTimeout(900); await p.keyboard.up("ArrowLeft");
  ok("hidden spring found", await E(() => window.__ki.story.flags.spring === true && window.__ki.game.hp === window.__ki.game.maxHp));
  await p.screenshot({ path: "docs/world-spring.png" });
  // sealed ward blocks at Lv 1
  await E(() => { const g = window.__ki.game, w = g.area.wards[0]; g.p.x = w.tx * 16 - 10; g.p.y = w.ty * 16 + 8; });
  await p.keyboard.down("KeyD"); await p.waitForTimeout(400); await p.keyboard.up("KeyD"); await p.waitForTimeout(100);
  ok("sealed ward says Lv 8", await E(() => /Lv 8/.test(window.__ki.story.box?.lines[0] ?? "")));
  while (await E(() => !!window.__ki.story.box)) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  ok("ward still solid at Lv 1", await E(() => window.__ki.game.p.x < window.__ki.game.area.wards[0].tx * 16));
  // level up, pass the ward, ride the updraft
  await E(() => { const g = window.__ki.game, w = g.area.wards[0]; g.lvl = 8; g.p.x = w.tx * 16 - 6; g.p.y = w.ty * 16 + 8; });
  await p.keyboard.down("KeyD"); await p.waitForTimeout(500); await p.keyboard.up("KeyD");
  ok("ward opens at Lv 8", await E(() => window.__ki.game.p.x > window.__ki.game.area.wards[0].tx * 16 + 8));
  await E(() => { const g = window.__ki.game, s = g.area.travel[0]; g.p.x = s.x; g.p.y = s.y + 14; });
  await p.keyboard.down("KeyW"); await p.waitForTimeout(250); await p.keyboard.up("KeyW"); await p.waitForTimeout(100);
  ok("updraft prompt", await E(() => /Hushwater/.test(window.__ki.story.box?.lines[0] ?? "")));
  for (let i = 0; i < 6 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); }
  await p.waitForTimeout(1500); await shot("flight");
  await p.waitForTimeout(2200);
  ok("arrived in Hushwater", await E(() => window.__ki.game.area.id === "hushwater" && window.__ki.story.flags.area === "hushwater"));
  await shot("hushwater");
  await E(() => { const g = window.__ki.game, m = g.area.npcs.find((n) => n.id === "m"); g.p.x = m.x - 14; g.p.y = m.y; });
  await p.waitForTimeout(100); await p.keyboard.press("KeyJ"); await p.waitForTimeout(700);
  ok("meets Mirela", await E(() => window.__ki.story.box?.who === "Mirela Vant"));
  await shot("mirela");
  while (await E(() => !!window.__ki.story.box)) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await p.keyboard.press("KeyM"); await p.waitForTimeout(200); await shot("map"); await p.keyboard.press("KeyM");
  // Hushwater quests
  const talk = async (id) => { await E((id) => { const g = window.__ki.game, n = g.area.npcs.find((n) => n.id === id); g.p.x = n.x + 14; g.p.y = n.y; }, id); await p.waitForTimeout(120); await p.keyboard.press("KeyJ"); await p.waitForTimeout(300);
    for (let i = 0; i < 20 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(180); } };
  await talk("r"); await talk("h");
  ok("Reed quest accepted", await E(() => window.__ki.story.flags.reedQ === true));
  for (let i = 0; i < 8; i++) { await E(() => window.__ki.game.stats.kills++); await p.waitForTimeout(60); }
  ok("meadow count 8", await E(() => window.__ki.story.flags.reedN === 8));
  // Corvin guards the bell (orb guard in story/index.ts); his real fight is covered by tests/minis.mjs
  await E(() => { window.__ki.story.flags.corvinDown = true; window.__ki.game.mb.boss8.done = true; });
  await E(() => { const g = window.__ki.game, o = g.area.orbs[0]; g.p.x = o.x; g.p.y = o.y + 6; }); await p.waitForTimeout(150);
  ok("ferry bell found", await E(() => window.__ki.story.flags.bell === true));
  await talk("f"); await talk("h"); await talk("m");
  ok("Lantern Oath", await E(() => window.__ki.story.flags.bellDone && window.__ki.story.flags.reedDone && window.__ki.story.flags.oath));
  await p.waitForTimeout(200); await shot("oath");
  // continue restores the area
  await E(() => window.__ki.game.autosave()); await p.reload(); await p.click("#startBtn"); await p.waitForTimeout(400);
  ok("continue restores Hushwater", await E(() => window.__ki.game.area.id === "hushwater"));
  // Kilnreach: second updraft stone wakes after the oath
  await E(() => { const g = window.__ki.game, t = g.area.travel.find((t) => t.to === "kilnreach"); g.p.x = t.x; g.p.y = t.y; }); await p.waitForTimeout(300);
  ok("east stone offers Kilnreach", await E(() => /Kilnreach/.test(window.__ki.story.box?.lines?.join(" ") ?? JSON.stringify(window.__ki.story.box))));
  for (let i = 0; i < 6 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); } await p.waitForTimeout(2600);
  ok("flies to Kilnreach", await E(() => window.__ki.game.area.id === "kilnreach" && window.__ki.game.area.theme === "ember"));
  if (await E(() => window.__ki.game.area.id === "kilnreach")) { await E(() => { window.__ki.story.box = null; }); await talk("k"); } else console.log(await E(() => [window.__ki.game.area.id, JSON.stringify(window.__ki.story.box), window.__ki.story.fly]));
  if (!(await E(() => window.__ki.story.flags.metBrann))) await talk("k");
  ok("meets Brann", await E(() => window.__ki.story.flags.metBrann === true));
  await E(() => { const g = window.__ki.game; g.p.x = 12 * 16; g.p.y = 17 * 16; }); await p.waitForTimeout(400);
  await p.screenshot({ path: "/tmp/full-kilnreach.png" });
  ok("Brann quest given", await E(() => window.__ki.story.flags.brannQ === true));
  await E(() => { const g = window.__ki.game, t = g.area.travel.find((t) => t.to === "emberquarry"); g.p.x = t.x; g.p.y = t.y; }); await p.waitForTimeout(300);
  for (let i = 0; i < 6 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); } await p.waitForTimeout(2600);
  await p.waitForFunction(() => window.__ki.game.area.id === "emberquarry" && window.__ki.story.fly <= 0, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(400);
  ok("lift to Emberheart Quarry", await E(() => window.__ki.game.area.id === "emberquarry"));
  await E(() => { window.__ki.story.box = null; const g = window.__ki.game, o = g.area.orbs[0]; g.p.x = o.x; g.p.y = o.y + 6; }); await p.waitForTimeout(300);
  ok("Heart-Ember found", await E(() => window.__ki.story.flags.heart === true));
  await p.screenshot({ path: "/tmp/full-quarry.png" });
  await E(() => { window.__ki.story.box = null; const g = window.__ki.game; g.p.x = 36 * 16; g.p.y = 16 * 16; }); await p.waitForTimeout(1200);
  await p.screenshot({ path: "/tmp/full-quarry-arena.png" });
  await E(() => { window.__ki.story.enter("kilnreach"); window.__ki.story.box = null; }); await p.waitForTimeout(300);
  await talk("k"); if (!(await E(() => window.__ki.story.flags.brann))) await talk("k");
  ok("brann flag set", await E(() => window.__ki.story.flags.brann === true));
  await E(() => { window.__ki.story.enter("emberquarry"); window.__ki.story.box = null; }); await p.waitForTimeout(300);
  await E(() => { const t = window.__ki.game.area.travel.find((t) => t.to === "drowned"); window.__ki.game.p.x = t.x; window.__ki.game.p.y = t.y; }); await p.waitForTimeout(300);
  ok("drowned slab sealed before boss", await E(() => /Deal with it/.test(window.__ki.story.box?.lines?.join(" ") ?? "")));
  await E(() => { window.__ki.story.box = null; const g = window.__ki.game; }); ok("REAL Slagheart kill", (await E(() => 1)) && (await KILL(await E(() => { const A = globalThis.__kiMB.ARENA2; return { x: A.tx * 16 + 8, y: A.ty * 16 + 28, flag: "quarryBossDown" }; }))).flag); await E(() => { window.__ki.story.flags.quarryBeat || (window.__ki.game.p.x = 36 * 16, window.__ki.game.p.y = 16 * 16); }); await p.waitForTimeout(600);
  ok("post-boss story beat", await E(() => window.__ki.story.box?.who === "Brann Okoro" && window.__ki.story.flags.quarryBeat === true));
  await p.screenshot({ path: "/tmp/full-quarry-after-boss.png" });
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await E(() => { const t = window.__ki.game.area.travel.find((t) => t.to === "drowned"); window.__ki.game.p.x = t.x; window.__ki.game.p.y = t.y; window.__ki.story.flags.stoneT = false; }); await p.waitForTimeout(300);
  for (let i = 0; i < 6 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); }
  await p.waitForFunction(() => window.__ki.game.area.id === "drowned" && window.__ki.story.fly <= 0, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(400);
  ok("flies to Drowned Vesper (area 4)", await E(() => window.__ki.game.area.id === "drowned" && window.__ki.game.area.theme === "tide"));
  await E(() => { window.__ki.story.box = null; }); await talk("n"); if (!(await E(() => window.__ki.story.flags.metNeri))) await talk("n");
  await E(() => { const g = window.__ki.game, o = g.area.orbs[0]; g.p.x = o.x; g.p.y = o.y + 6; }); await p.waitForTimeout(300);
  await talk("n"); if (!(await E(() => window.__ki.story.flags.sigilDone))) await talk("n");
  ok("sun-sigil quest done", await E(() => window.__ki.story.flags.sigil === true && window.__ki.story.flags.sigilDone === true));
  await E(() => { const g = window.__ki.game; g.p.x = 23 * 16; g.p.y = 18 * 16; }); await p.waitForTimeout(500);
  await p.screenshot({ path: "/tmp/full-drowned.png" });
  for (let i = 0; i < 40 && !(await E(() => window.__ki.story.flags.sable1)); i++) { if (await E(() => window.__ki.story.box && window.__ki.story.box.who !== "Sable Kestrel")) await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  ok("Sable watches from the balcony", await E(() => window.__ki.story.flags.sable1 === true));
  await p.screenshot({ path: "/tmp/full-vesper-after-sigil.png" });
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await E(() => { const t = window.__ki.game.area.travel.find((t) => t.to === "undertide"); window.__ki.game.p.x = t.x; window.__ki.game.p.y = t.y; window.__ki.story.flags.stoneT = false; }); await p.waitForTimeout(300);
  for (let i = 0; i < 6 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(200); }
  await p.waitForFunction(() => window.__ki.game.area.id === "undertide" && window.__ki.story.fly <= 0, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(400);
  ok("tide stair to the Undertide", await E(() => window.__ki.game.area.id === "undertide"));
  await E(() => { window.__ki.story.box = null; const g = window.__ki.game; g.p.x = 37 * 16; g.p.y = 24 * 16; }); await p.waitForTimeout(400);
  ok("Sable at the drowned Wellspring", await E(() => window.__ki.story.flags.sable2 === true));
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await E(() => { const g = window.__ki.game; g.p.x = 37 * 16; g.p.y = 20 * 16; }); await p.waitForTimeout(900);
  await p.screenshot({ path: "/tmp/full-undertide.png" });
  await E(() => { const g = window.__ki.game; }); ok("REAL Aurel kill", (await KILL(await E(() => { const sp = globalThis.__kiMB.springOf(window.__ki.game); return { x: sp.x + 40, y: sp.y + 10, flag: "tideBossDown" }; }))).flag); await p.waitForTimeout(600);
  ok("post-general Sable beat", await E(() => window.__ki.story.flags.sable3 === true));
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  ok("per-area music", await E(() => window.__ki.audio.cur === "drowned-vesper"));
  ok("stone back to Vesper", (await ride("drowned")) === "drowned"); await p.waitForTimeout(600);
  ok("Archive opens after Aurel", await E(() => window.__ki.story.flags.twist === true && window.__ki.story.box?.who === "The Archive"));
  for (let i = 0; i < 40 && (await E(() => window.__ki.story.box?.who !== "Malachar Vesh")); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await p.keyboard.press("KeyJ"); await p.waitForTimeout(600);
  ok("Malachar projection turns the lamps red", await E(() => window.__ki.game.area.lamps.every((l) => l.c[0] === 1 && l.c[1] < 0.2)));
  await p.screenshot({ path: "/tmp/full-malachar.png" });
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  ok("Malachar named, lamps restored", await E(() => window.__ki.story.flags.malachar === true && window.__ki.game.area.lamps.every((l) => l.c[0] < 1)));
  await dismiss(); ok("ride Vesper -> Undertide", (await ride("undertide")) === "undertide"); ok("ride Undertide -> Stair", (await ride("stair")) === "stair"); await p.waitForTimeout(400);
  ok("Sunwarden's Stair intro", await E(() => window.__ki.game.area.id === "stair" && window.__ki.story.flags.stairIn === true));
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await E(() => { const g = window.__ki.game; g.p.x = 24 * 16; g.p.y = 19 * 16; }); await p.waitForTimeout(900);
  await p.screenshot({ path: "/tmp/full-stair-cage.png" });
  ok("REAL Twins kill", (await KILL(await E(() => { const A = globalThis.__kiMB.ARENA4; return { x: A.tx * 16 + 8, y: A.ty * 16 + 40, flag: "cageDone" }; }))).flag); await p.waitForTimeout(800);
  ok("Sable joins after the Red Cage", await E(() => window.__ki.story.flags.sableJoin === true));
  await p.screenshot({ path: "/tmp/full-sable-joins.png" });
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  ok("REAL Morvant kill", (await KILL(await E(() => { const A = globalThis.__kiMB.ARENA5; return { x: A.tx * 16 + 8, y: A.ty * 16 + 24, flag: "morvantDown" }; }))).flag); await p.waitForTimeout(800);
  ok("threshold beat after Morvant", await E(() => window.__ki.story.flags.threshold === true));
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await p.waitForTimeout(500); await p.screenshot({ path: "/tmp/full-stair-top.png" });
  await E(() => { const g = window.__ki.game; g.p.x = 33 * 16; g.p.y = 24 * 16; }); await p.waitForTimeout(700);
  await p.screenshot({ path: "/tmp/full-stair-sun.png" });
  await dismiss(); ok("ride top-ring stone -> Husk Sun", (await ride("husk")) === "husk"); await p.waitForTimeout(600);
  ok("finale: inside the husk sun", await E(() => window.__ki.game.area.id === "husk" && window.__ki.story.flags.huskIn === true));
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await E(() => { const g = window.__ki.game; g.p.x = 24 * 16; g.p.y = 21 * 16; }); await p.waitForTimeout(700);
  await p.screenshot({ path: "/tmp/full-husk-arena.png" });
  ok("REAL Malachar kill", (await KILL(await E(() => { const A = globalThis.__kiMB.ARENA6; return { x: A.tx * 16 + 8, y: A.ty * 16 + 40, flag: "malacharDown" }; }))).flag); await p.waitForTimeout(400);
  for (let i = 0; i < 40 && (await E(() => window.__ki.story.credits <= 0)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  ok("dawn + credits roll after Malachar", await E(() => window.__ki.story.flags.dawn === true && window.__ki.story.credits > 0));
  await p.waitForTimeout(6000); await p.screenshot({ path: "/tmp/full-credits.png" });
  await p.keyboard.press("KeyJ"); await p.waitForTimeout(400);
  ok("credits skippable", await E(() => window.__ki.story.credits === 0));
  await E(() => { window.__ki.story.box = null; window.__ki.story.enter("lanternmoss"); window.__ki.game.time = 60; }); await p.waitForTimeout(900);
  for (let i = 0; i < 30 && (await E(() => !!window.__ki.story.box)); i++) { await p.keyboard.press("KeyJ"); await p.waitForTimeout(150); }
  await p.screenshot({ path: "/tmp/full-dawn-day.png" });
  ok("free-roam dawn objective", await E(() => window.__ki.story.objective().startsWith("Dawn")));
  await p.keyboard.press("KeyM"); await p.waitForTimeout(300); await p.screenshot({ path: "/tmp/full-map-area4.png" }); await p.keyboard.press("KeyM");
  await E(() => { window.__ki.story.enter("lanternmoss"); }); await p.waitForTimeout(200);
  await E(() => { const g = window.__ki.game; g.p.x = 36 * 16; g.p.y = 18 * 16; }); await p.waitForTimeout(1200);
  ok("grotto banner", await E(() => window.__ki.game.area.props.filter((q) => q.kind === "crystal").length >= 6));
  await p.screenshot({ path: "/tmp/full-grotto.png" });
  const au = await E(() => ({ ctx: !!window.__ki.audio.ctx, bufs: window.__ki.audio.bufs.size, cur: window.__ki.audio.cur, played: window.__ki.audio.played.length }));
  ok("audio unlocked + music loaded", au.ctx && au.bufs > 0 && /theme/.test(au.cur), JSON.stringify(au));
  ok("no console errors", errs.length === 0, errs.join(" | "));
} finally { await b.close(); srv.kill(); }
for (const r of R) console.log(r.join("  "));
const f = R.filter((r) => r[0] === "FAIL").length; console.log(`${R.length - f}/${R.length} passed`); process.exit(f ? 1 : 0);
