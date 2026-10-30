// W20: Linnet's Locket greeting, map letter count, rare Mirela re-read line (no EXP), compass sparkle + reduced-flash option,
// Story's ambient barks + codex (src/story/ambient.ts), visitedAreas() + old-save backfill. node tests/w20.mjs (after npm run build).
// SHOTS=dir also saves Pixel 7 + 1280x720 screenshots there. KI_PORT to change port.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium, devices } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4520), SHOTS = process.env.SHOTS || "";
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await chromium.launch();
const views = [["pixel7", { ...devices["Pixel 7 landscape"] }], ["desktop1280", { viewport: { width: 1280, height: 720 } }]];
const KEY = "kiquest.story.v1";
try {
  for (const [vn, ctxOpt] of views) {
    const ctx = await browser.newContext(ctxOpt); const page = await ctx.newPage();
    const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    const shot = (n) => SHOTS ? page.screenshot({ path: `${SHOTS}/${vn}-${n}.png` }) : null;
    const E = (f, a) => page.evaluate(f, a);
    const boot = async (flags, extra = {}) => {
      await page.goto(`http://localhost:${PORT}/ki-quest/`);
      await E((x) => { localStorage.clear(); for (const [a, b] of Object.entries(x)) localStorage.setItem(a, b); }, extra);
      await page.reload(); await page.waitForTimeout(500);
      await page.click("#startBtn").catch(() => page.tap("#startBtn")); await page.waitForTimeout(700);
      await E((f) => { const s = window.__ki.story; s.flags = { ...f }; s.codexT = 0; s.intro = -1; s.box = null; s.save(); }, flags); // a loaded save with exactly these flags (no codex_/codexInit yet = old save)
    };
    const step = async (n = 30) => { await page.waitForTimeout(120); return E((n) => { const g = window.__ki.game; for (let i = 0; i < n; i++) { g.p.inv = 1; g.step(1 / 60); } }, n); };
    const go = async (area) => { await E((a) => { const s = window.__ki.story; s.enter(a); s.box = null; window.__ki.game.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); }, area); await page.waitForTimeout(500); };
    const close = async () => { for (let i = 0; i < 40 && (await E(() => !!window.__ki.story.box)); i++) { await page.keyboard.press("KeyJ"); await page.waitForTimeout(110); } };
    const talk = async (id, snap) => { const n = await E((id) => { const g = window.__ki.game, n = g.area.npcs.find((n) => n.id === id); if (!n) return null; g.p.x = n.x + 14; g.p.y = n.y; g.p.fx = -1; g.p.fy = 0; return true; }, id);
      if (!n) return null; await page.waitForTimeout(120); await page.keyboard.press("KeyJ"); await page.waitForTimeout(350);
      const b = await E(() => { const b = window.__ki.story.box; return b ? { who: b.who, lines: b.lines.slice() } : null; }); if (snap) await shot(snap); await close(); return b; };
    const fitsBox = (lines) => E((L) => { const c = document.createElement("canvas").getContext("2d"); c.font = "8px monospace"; return L.every((l) => window.__kiText.wrap(c, l, 384 - 40).length <= 4); }, lines);

    // 1. Linnet greeting with / without the Locket
    await boot({ introSeen: true, oath: true, lettersQ: true, lettersN: 4, lettersRead: true, linnetWoke: true, lettersDone: true, visited_lanternmoss: true });
    await E(() => { const g = window.__ki.game; if (!g.have.includes("c2")) g.have.push("c2"); g.gear.c = "c0"; });
    await go("lanternmoss");
    const exp0 = await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1e6);
    const off = await talk("l");
    ok(`${vn}: Linnet without the Locket on: usual line`, off && off.who === "Linnet Vant" && /Don't fuss over me/.test(off.lines[0]), JSON.stringify(off));
    await E(() => { window.__ki.game.equip("c2"); });
    const on = await talk("l", "linnet-locket");
    ok(`${vn}: Linnet notices her Locket when it's worn`, on && /^Oh! My locket\./.test(on.lines[0]) && /lamplighter/.test(on.lines[0]) && /^It sat against my collarbone/.test(on.lines[1]) && on.lines.length === 2 && !/Don't fuss/.test(on.lines.join(" ")), JSON.stringify(on));
    ok(`${vn}: Locket greeting fits the dialogue box`, on && await fitsBox(on.lines));
    ok(`${vn}: Locket greeting gives no reward (EXP same, one Locket)`, (await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1e6)) === exp0 && (await E(() => window.__ki.game.have.filter((x) => x === "c2").length)) === 1);
    // gate: linnetWoke && lettersDone && !dawn (dawn = the ending flag; there is no endingSeen)
    const gate = async (patch) => { await E((p) => { const s = window.__ki.story; Object.assign(s.flags, p); }, patch); await go("lanternmoss"); const r = await talk("l"); await E(() => { const s = window.__ki.story; s.flags.linnetWoke = true; s.flags.lettersDone = true; s.flags.dawn = false; }); return r; };
    const noL = (r) => !r || !r.lines.some((l) => /^Oh! My locket\./.test(l)); // the hand-in line also says "My locket", so match the greeting exactly
    { const r0 = await gate({ lettersDone: false }); ok(`${vn}: Locket greeting gated on lettersDone`, noL(r0), JSON.stringify(r0)); }
    ok(`${vn}: Locket greeting gated on linnetWoke`, noL(await gate({ linnetWoke: false })));
    const after = await gate({ dawn: true });
    ok(`${vn}: no Locket greeting after the ending (dawn)`, noL(after), JSON.stringify(after));
    await go("lanternmoss"); const again = await talk("l");
    ok(`${vn}: greeting returns with the gate restored`, again && /^Oh! My locket\./.test(again.lines[0]), JSON.stringify(again));

    // 3. Mirela re-read line: rare, no EXP
    await go("hushwater");
    await E(() => { window.__ki.story.rnd = () => 0.9; });
    const m1 = await talk("m");
    ok(`${vn}: Mirela usually has no re-read line (rnd 0.9)`, m1 && !m1.lines.some((l) => /letters out again|re-reading|Third time|smooths a page/.test(l)), JSON.stringify(m1));
    const e1 = await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1e6);
    await E(() => { let i = 0; window.__ki.story.rnd = () => [0.05, 0.5][i++ % 2]; });
    const m2 = await talk("m", "mirela-reread");
    ok(`${vn}: rare re-read line appears (rnd 0.05)`, m2 && /Third time through/.test(m2.lines.at(-1)), JSON.stringify(m2));
    ok(`${vn}: re-read line fits the dialogue box`, m2 && await fitsBox(m2.lines));
    ok(`${vn}: re-read gives no EXP and is counted`, (await E(() => window.__ki.game.exp + window.__ki.game.lvl * 1e6)) === e1 && (await E(() => window.__ki.story.flags.rereadN)) === 1);
    await E(() => { window.__ki.story.rnd = Math.random; });

    // 2. map n/4 + 4. compass sparkle (letters hunt)
    await boot({ introSeen: true, metAma: true, metMirela: true, lettersQ: true, lettersN: 2, letter_1: true, visited_hushwater: true });
    await go("hushwater");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(250);
    let mp = await E(() => ({ mode: window.__ki.game.mode, tab: window.__kiMenu.TABS[window.__kiMenu.ui.tab], t: window.__kiText.hud.mapLetters }));
    ok(`${vn}: map shows the letter count (2/4)`, mp.mode === "map" && mp.t === "Letters 2/4", JSON.stringify(mp));
    await shot("map-letters");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(200);
    const L = [[33, 24], [44, 11]];
    const cs0 = await E(() => window.__kiText.hud.fx.compassSpark);
    await E(([x, y]) => { const g = window.__ki.game; g.p.x = x * 16 + 8 + 30; g.p.y = y * 16 + 8; }, L[0]); await step(3); await page.waitForTimeout(200);
    const cs1 = await E(() => window.__kiText.hud.fx.compassSpark);
    ok(`${vn}: compass sparkles once when you reach a letter`, cs1 === cs0 + 1, `${cs0}->${cs1}`);
    await step(10); ok(`${vn}: no repeat sparkle while you stay there`, (await E(() => window.__kiText.hud.fx.compassSpark)) === cs1);
    await shot("compass-sparkle");
    const r0 = await E(() => ({ ...window.__kiText.hud.fx }));
    await E(([x, y]) => { const g = window.__ki.game; g.p.x = x * 16 + 8; g.p.y = y * 16 + 8; }, L[0]); await step(3); await page.waitForTimeout(200);
    const r1 = await E(() => ({ ...window.__kiText.hud.fx }));
    ok(`${vn}: normal pickup burst has rings`, r1.rings > r0.rings, JSON.stringify([r0, r1]));
    await page.keyboard.press("KeyM"); await page.waitForTimeout(250);
    ok(`${vn}: map count follows pickups (3/4)`, (await E(() => window.__kiText.hud.mapLetters)) === "Letters 3/4");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(200);

    // 4b. reduced-flash toggle (Options row 5), persists after reload, softens the effects
    ok(`${vn}: reduced flash defaults off`, (await E(() => window.__ki.game.flashLow)) === false);
    await E(() => { const u = window.__kiMenu.ui; window.__ki.game.mode = "pause"; u.tab = 6; u.sel = 5; u.sub = ""; }); await page.waitForTimeout(150);
    await page.keyboard.press("KeyJ"); await page.waitForTimeout(150);
    await shot("options-reduced-flash");
    ok(`${vn}: Options toggles reduced flash on`, (await E(() => window.__ki.game.flashLow && localStorage.getItem("kiquest-opt-lowflash") === "1")) === true);
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    await page.reload(); await page.waitForTimeout(500); await page.click("#startBtn").catch(() => page.tap("#startBtn")); await page.waitForTimeout(700);
    ok(`${vn}: reduced flash persists after reload`, (await E(() => window.__ki.game.flashLow)) === true);
    await go("hushwater");
    const q0 = await E(() => ({ ...window.__kiText.hud.fx }));
    await E(([x, y]) => { const g = window.__ki.game; g.p.x = x * 16 + 8; g.p.y = y * 16 + 8; }, L[1]); await step(3); await page.waitForTimeout(200);
    const q1 = await E(() => ({ ...window.__kiText.hud.fx, n: window.__ki.story.flags.lettersN }));
    ok(`${vn}: reduced flash: pickup burst has no rings and fewer sparks`, q1.n === 4 && q1.rings === q0.rings && q1.sparks - q0.sparks > 0 && q1.sparks - q0.sparks <= 6, JSON.stringify([q0, q1]));
    // compass pulse steady + objective blink steady (no frame toggling)
    await E(() => { const s = window.__ki.story; s.flags.lettersN = 2; s.flags.letter_3 = false; s.flags.letter_2 = false; s.flags.lettersRead = false; const g = window.__ki.game; g.p.x = 5 * 16; g.p.y = 30 * 16; });
    const xs = []; for (let i = 0; i < 5; i++) { await step(17); await page.waitForTimeout(90); xs.push(await E(() => { const c = window.__kiText.hud.compass; return c.shown ? Math.round(Math.hypot(c.x - 192, c.y) * 10) : null; })); }
    ok(`${vn}: reduced flash: compass chevron does not pulse`, xs.every((v) => v !== null && v === xs[0]), JSON.stringify(xs));
    await E(() => { localStorage.setItem("kiquest-opt-lowflash", "0"); window.__ki.game.flashLow = false; });

    // 5. barks + codex + visitedAreas + backfill
    await boot({ introSeen: true, metAma: true, oath: true, metMirela: true, reedQ: true, ashmawDown: true, quarryBossDown: true, area: "kilnreach" });
    await step(40); await page.waitForTimeout(300);
    const v = await E(() => { const f = JSON.parse(localStorage.getItem("kiquest.story.v1")); return Object.keys(f).filter((k) => k.startsWith("visited_") && f[k]).sort(); });
    ok(`${vn}: old save backfilled visited_ flags (saved)`, ["visited_emberquarry", "visited_hushwater", "visited_kilnreach", "visited_lanternmoss"].every((k) => v.includes(k)) && !v.includes("visited_stair") && !v.includes("visited_husk"), v.join(","));
    const va = await E(async () => { const m = window.__kiAmbient; return m ? { a: m.visitedAreas({ visited_hushwater: true, visited_stair: false, foo: true, visited_husk: true }), e: m.visitedAreas({}) } : null; });
    ok(`${vn}: visitedAreas() reads visited_<id> flags (true only), old save = []`, va && JSON.stringify(va.a.sort()) === '["hushwater","husk"]' && va.e.length === 0, JSON.stringify(va));
    const cx = await E(() => { const f = window.__ki.story.flags; return Object.keys(f).filter((k) => k.startsWith("codex_")); });
    ok(`${vn}: codex unlocked from progress + saved as codex_ flags`, cx.includes("codex_mossling") && cx.includes("codex_boss_ashmaw") && cx.includes("codex_boss_slagheart") && cx.includes("codex_place_kilnreach") && !cx.includes("codex_boss_malachar"), cx.join(","));
    ok(`${vn}: first run on an old save is quiet (no codex toast)`, !/Codex:/.test(await E(() => window.__ki.game.toast)));
    await go("drowned"); for (let i = 0; i < 4; i++) { await E(() => { window.__ki.game.toastT = 0; window.__ki.story.box = null; }); await step(40); if (/Codex/.test(await E(() => window.__ki.game.toast))) break; } await page.waitForTimeout(200);
    const ct = await E(() => ({ toast: window.__ki.game.toast, saved: JSON.parse(localStorage.getItem("kiquest.story.v1")).codex_place_vesper }));
    ok(`${vn}: new area unlocks a codex page with a toast, saved`, /Codex: Drowned Vesper/.test(ct.toast) && ct.saved === true, JSON.stringify(ct));
    await shot("codex-toast");
    // barks
    await go("lanternmoss");
    const bk = await E(() => { const s = window.__ki.story, g = window.__ki.game; g.toastT = 0; g.bannerT = 0; const n = g.area.npcs[0]; g.p.x = n.x + 40; g.p.y = n.y; s.rnd = () => 0.5; const r = s.bark(); s.rnd = Math.random; return { r, b: { ...window.__kiText.hud.bark, box: null } }; });
    await step(2); await page.waitForTimeout(200);
    const bb = await E(() => window.__kiText.hud.bark.box);
    ok(`${vn}: bark shows a Story line over a nearby NPC`, bk.r && bk.b.who && bk.b.text.length > 10 && bk.b.npc, JSON.stringify(bk));
    ok(`${vn}: bark bubble is drawn on screen`, bb && bb.x >= 0 && bb.y >= 0 && bb.x + bb.w <= 384 && bb.y + bb.h <= 216, JSON.stringify(bb));
    await shot("bark");
    const sv = await E(() => { const f = JSON.parse(localStorage.getItem("kiquest.story.v1")); return { n: f.barksHeard, l: f.lastBark }; });
    ok(`${vn}: bark count saved`, sv.n >= 1 && typeof sv.l === "string" && sv.l.length > 0, JSON.stringify(sv));
    await go("husk"); await step(2);
    const hk = await E(() => { const s = window.__ki.story, g = window.__ki.game; g.toastT = 0; g.bannerT = 0; s.rnd = () => 0.1; const r = s.bark(true); s.rnd = Math.random; return { r, area: g.area.id, b: { ...window.__kiText.hud.bark, box: null } }; });
    ok(`${vn}: husk barks are speakerless narration`, hk.r && hk.b.who === "" && /^\(/.test(hk.b.text), JSON.stringify(hk));
    await go("lanternmoss");
    // every bark + codex text fits
    const fit = await E(() => { const m = window.__kiAmbient, c = document.createElement("canvas").getContext("2d"); c.font = "7px monospace"; let bad = [], n = 0;
      for (const [a, p] of Object.entries(m.AMBIENT)) for (const l of [...p.dark, ...p.day, ...p.night, ...p.weather.flatMap((w) => w.lines)]) { n++; const L = window.__kiText.wrap(c, l, 220); if (L.length > 3 || L.some((x) => c.measureText(x).width > 220)) bad.push(a + ":" + l); }
      let cbad = []; for (const e of m.CODEX) { const L = window.__kiText.wrap(c, e.text, 384 - 152); if (L.length > 10 || L.some((x) => c.measureText(x).width > 232)) cbad.push(e.id + ":" + L.length); }
      return { n, bad, codex: m.CODEX.length, cbad }; });
    ok(`${vn}: all ${fit.n} barks fit a 3-line bubble`, fit.n >= 170 && fit.bad.length === 0, fit.bad.slice(0, 3).join(" | "));
    ok(`${vn}: all ${fit.codex} codex pages fit the Lens panel`, fit.codex === 26 && fit.cbad.length === 0, fit.cbad.join(","));
    // codex in the Lens tab
    await page.waitForTimeout(150); await E(() => { const g = window.__ki.game; window.__ki.story.box = null; g.mode = "pause"; const u = window.__kiMenu.ui; u.tab = 4; u.sub = ""; u.sel = 0; }); await page.waitForTimeout(100);
    for (let i = 0; i < 12; i++) { await page.keyboard.press("KeyW"); await page.waitForTimeout(60); if (await E(() => window.__kiMenu.ui.sel > 0)) break; } // W wraps to the last row (Codex)
    await page.keyboard.press("KeyJ"); await page.waitForTimeout(150);
    const cd = await E(() => ({ sub: window.__kiMenu.ui.sub, sel: window.__kiMenu.ui.sel, tab: window.__kiMenu.ui.tab, mode: window.__ki.game.mode, box: !!window.__ki.story.box }));
    ok(`${vn}: Lens > Codex opens the codex list`, cd.sub === "codex", JSON.stringify(cd));
    await page.keyboard.press("KeyS"); await page.waitForTimeout(80); await page.keyboard.press("KeyS"); await page.waitForTimeout(150);
    await shot("codex");
    await page.keyboard.press("KeyK"); await page.waitForTimeout(100);
    ok(`${vn}: back closes the codex`, (await E(() => window.__kiMenu.ui.sub)) === "");
    await page.keyboard.press("Escape"); await page.waitForTimeout(100);
    ok(`${vn}: no page errors`, errs.length === 0, errs.slice(0, 3).join(" | "));
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}${d && s === "FAIL" ? "  :: " + d : ""}`);
const f = results.filter((r) => r[0] === "FAIL").length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
