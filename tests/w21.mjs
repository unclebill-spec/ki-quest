// W21: map 'letters' legend, codex "new" dots (story flags codexRead_<id>), Linnet's ambient barks + gating, Options > Barks (Off/Low/Normal).
// node tests/w21.mjs (after npm run build).
// SHOTS=dir also saves Pixel 7 + 1280x720 screenshots there. KI_PORT to change port.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium, devices } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4521), SHOTS = process.env.SHOTS || "";
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


    const sim = (sec, pos) => E(([sec, pos]) => { const s = window.__ki.story, g = window.__ki.game; const h0 = s.flags.barksHeard || 0;
      for (let i = 0; i < sec * 60; i++) { g.toastT = 0; g.bannerT = 0; g.p.inv = 1; if (pos) { g.p.x = pos[0]; g.p.y = pos[1]; } if (!s.update(1 / 60)) { g.step(1 / 60); s.after(); } }
      return (s.flags.barksHeard || 0) - h0; }, [sec, pos]);
    const LB = (f, t, r = 0.5) => E(([f, t, r]) => window.__kiAmbient.linnetBark(f, t, () => r), [f, t, r]);
    const pool = (f, t) => E(([f, t]) => { const out = new Set(); for (let i = 0; i < 13; i++) out.add(window.__kiAmbient.linnetBark(f, t, () => (i + 0.5) / 13)); return [...out]; }, [f, t]);

    // 1. Map legend
    await boot({ introSeen: true, metAma: true, metMirela: true, lettersQ: true, lettersN: 2, letter_1: true, visited_hushwater: true });
    await go("hushwater");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(250);
    let mp = await E(() => ({ mode: window.__ki.game.mode, lg: window.__kiText.hud.mapLegend, n: window.__kiText.hud.mapLetters }));
    ok(`${vn}: map legend reads 'letters' beside the gold dots`, mp.mode === "map" && mp.lg === "letters" && mp.n === "Letters 2/4", JSON.stringify(mp));
    await shot("map-legend");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(200);
    await E(() => { const f = window.__ki.story.flags; f.letter_1 = f.letter_2 = f.letter_3 = f.letter_4 = true; f.lettersN = 4; });
    await page.keyboard.press("KeyM"); await page.waitForTimeout(250);
    ok(`${vn}: legend hidden once no letters are left on the map`, (await E(() => window.__kiText.hud.mapLegend)) === "");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(200);
    await go("lanternmoss"); await page.keyboard.press("KeyM"); await page.waitForTimeout(250);
    ok(`${vn}: no legend outside Hushwater`, (await E(() => window.__kiText.hud.mapLegend)) === "");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(200);

    // 2. Codex "new" dots
    await boot({ introSeen: true, metAma: true, ashmawDown: true, metMirela: true, oath: true, visited_lanternmoss: true, visited_hushwater: true });
    await go("lanternmoss"); await step(60);
    const cx0 = await E(() => { const F = window.__ki.story.flags; const ids = Object.keys(F).filter((k) => k.startsWith("codex_") && F[k]).map((k) => k.slice(6)); return { ids, read: Object.keys(F).filter((k) => k.startsWith("codexRead_")) }; });
    ok(`${vn}: codex has unlocked entries, none read yet`, cx0.ids.length >= 2 && cx0.read.length === 0, JSON.stringify(cx0));
    await E(() => { window.__ki.game.mode = "pause"; const u = window.__kiMenu.ui; u.tab = window.__kiMenu.TABS.indexOf("Lens"); u.sub = "codex"; u.subSel = 0; }); await page.waitForTimeout(250);
    await shot("codex-new-dots");
    const cx1 = await E(() => { const F = window.__ki.story.flags; return Object.keys(F).filter((k) => k.startsWith("codexRead_") && F[k]); });
    ok(`${vn}: opening an entry clears its dot (only that one)`, cx1.length === 1, JSON.stringify(cx1));
    await E(() => { window.__kiMenu.ui.subSel = 1; }); await page.waitForTimeout(250);
    const cx2 = await E(() => { const F = window.__ki.story.flags; return Object.keys(F).filter((k) => k.startsWith("codexRead_") && F[k]); });
    ok(`${vn}: second entry read when opened`, cx2.length === 2, JSON.stringify(cx2));
    await page.reload(); await page.waitForTimeout(500);
    const cx3 = await E((K) => { const f = JSON.parse(localStorage.getItem(K) || "{}"); return Object.keys(f).filter((k) => k.startsWith("codexRead_") && f[k]); }, KEY);
    ok(`${vn}: read state survives a reload (story flag save, no new top-level field)`, JSON.stringify(cx3.sort()) === JSON.stringify(cx2.sort()), JSON.stringify(cx3));

    // 3. Linnet barks + gating
    const BK = await E(() => window.__kiAmbient.LINNET_BARKS.length);
    ok(`${vn}: LINNET_BARKS has 13 lines`, BK === 13);
    const fitB = await E(() => { const c = document.createElement("canvas").getContext("2d"); c.font = "7px monospace"; return window.__kiAmbient.LINNET_BARKS.filter((b) => { const L = window.__kiText.wrap(c, b.line, 220); return L.length > 3 || L.some((x) => c.measureText(x).width > 220); }).length; });
    ok(`${vn}: every Linnet bark fits the bubble`, fitB === 0);
    const DAY = 60, NIGHT = 180;
    ok(`${vn}: no Linnet barks before she wakes`, (await LB({ oath: true }, DAY)) === undefined);
    ok(`${vn}: no Linnet barks after the ending (dawn)`, (await LB({ linnetWoke: true, lettersDone: true, dawn: true }, NIGHT)) === undefined);
    const pDay = await pool({ linnetWoke: true }, DAY);
    ok(`${vn}: day, letters not done: only the 8 any-time lines`, pDay.length === 8 && !pDay.some((l) => /stars|Night again|my girl|sunrise|spelling/.test(l)), JSON.stringify(pDay));
    const pDone = await pool({ linnetWoke: true, lettersDone: true }, DAY);
    ok(`${vn}: lettersDone adds its 3 lines`, pDone.length === 11 && pDone.some((l) => /my girl/.test(l)) && !pDone.some((l) => /stars/.test(l)), JSON.stringify(pDone));
    const pNight = await pool({ linnetWoke: true, lettersDone: true }, NIGHT);
    ok(`${vn}: night adds the 2 night-only lines`, pNight.length === 13 && pNight.some((l) => /stars are out/.test(l)), JSON.stringify(pNight.length));
    ok(`${vn}: never the same Linnet line twice running`, (await E(() => { const m = window.__kiAmbient, f = { linnetWoke: true }; let prev = "", rep = 0; for (let i = 0; i < 200; i++) { const l = m.linnetBark(f, 60, Math.random, prev); if (l === prev) rep++; prev = l; } return rep; })) === 0);
    // in game: at the hidden spring
    await boot({ introSeen: true, oath: true, lettersQ: true, lettersN: 4, lettersRead: true, visited_lanternmoss: true });
    await go("lanternmoss"); await step(5);
    const lin0 = await E(() => window.__ki.game.area.npcs.some((n) => n.id === "l"));
    ok(`${vn}: Linnet not at the spring before linnetWoke`, !lin0);
    await E(() => { window.__ki.story.flags.linnetWoke = true; }); await step(5);
    const bl = await E(() => { const s = window.__ki.story, g = window.__ki.game; g.time = 60; const n = g.area.npcs.find((n) => n.id === "l"); if (!n) return null; g.p.x = n.x + 30; g.p.y = n.y; g.toastT = 0; g.bannerT = 0; s.rnd = () => 0.3; const r = s.bark(); s.rnd = Math.random; return { r, b: { ...window.__kiText.hud.bark, box: null } }; });
    await page.waitForTimeout(150);
    ok(`${vn}: Linnet barks at the spring once awake`, bl && bl.r && bl.b.who === "Linnet Vant" && bl.b.npc === "l", JSON.stringify(bl));
    const bb = await E(() => window.__kiText.hud.bark.box);
    ok(`${vn}: Linnet's bubble is on screen`, bb && bb.x >= 0 && bb.y >= 0 && bb.x + bb.w <= 384 && bb.y + bb.h <= 216, JSON.stringify(bb));
    await shot("linnet-bark");
    await E(() => { window.__ki.story.flags.dawn = true; }); await step(5);
    const bd = await E(() => { const s = window.__ki.story, g = window.__ki.game; g.p.x = 5 * 16 + 38; g.p.y = 31 * 16 + 8; g.toastT = 0; g.bannerT = 0; const h = window.__kiText.hud.bark; h.text = ""; h.who = ""; h.t = 0; const r = s.bark(); return { r, l: g.area.npcs.some((n) => n.id === "l"), who: window.__kiText.hud.bark.who, t: window.__kiText.hud.bark.text }; });
    const lines = await E(() => window.__kiAmbient.LINNET_BARKS.map((b) => b.line));
    ok(`${vn}: after dawn Linnet is gone and says nothing`, !bd.l && bd.who !== "Linnet Vant" && !lines.includes(bd.t), JSON.stringify(bd));

    // 4. Options > Barks
    await boot({ introSeen: true, metAma: true, visited_lanternmoss: true });
    await go("lanternmoss");
    const ama = await E(() => { const n = window.__ki.game.area.npcs[0]; return [n.x + 40, n.y]; });
    ok(`${vn}: default is Normal`, (await E(() => window.__ki.game.barkFreq)) === 2);
    const nN = await sim(120, ama);
    await E(() => { window.__ki.game.mode = "pause"; const u = window.__kiMenu.ui; u.tab = window.__kiMenu.TABS.indexOf("Options"); u.sub = ""; u.sel = 6; }); await page.waitForTimeout(120);
    await page.keyboard.press("KeyJ"); await page.waitForTimeout(150);
    ok(`${vn}: Barks Normal -> Low`, (await E(() => window.__ki.game.barkFreq)) === 1);
    await E(() => { window.__ki.game.mode = "play"; window.__ki.story.barkT = 0.1; });
    const nL = await sim(120, ama);
    ok(`${vn}: Low is about half as chatty as Normal (120 s: N ${nN}, L ${nL})`, nN >= 4 && nL >= 1 && nL < nN && nL <= Math.ceil(nN * 0.7), `${nN}/${nL}`);
    await E(() => { window.__ki.game.mode = "pause"; const u = window.__kiMenu.ui; u.tab = window.__kiMenu.TABS.indexOf("Options"); u.sel = 6; }); await page.waitForTimeout(120);
    await page.keyboard.press("KeyJ"); await page.waitForTimeout(200);
    ok(`${vn}: Barks Low -> Off`, (await E(() => window.__ki.game.barkFreq)) === 0);
    await shot("options-barks");
    const rowFit = await E(() => { const c = document.createElement("canvas").getContext("2d"); c.font = "bold 8px monospace"; const a = c.measureText("Barks").width; c.font = "7px monospace"; return a + c.measureText("Normal").width + 15 < 170; });
    ok(`${vn}: Barks row text fits`, rowFit);
    await E(() => { window.__ki.game.mode = "play"; window.__ki.story.barkT = 0.1; });
    ok(`${vn}: Off = no barks in 60 s`, (await sim(60, ama)) === 0);
    await page.reload(); await page.waitForTimeout(500);
    ok(`${vn}: Off survives a reload`, (await E(() => [window.__ki.game.barkFreq, localStorage.getItem("kiquest-opt-barks")])).join() === "0,0");
    await E(() => { localStorage.setItem("kiquest-opt-barks", "2"); });
    ok(`${vn}: no page errors`, errs.length === 0, errs.slice(0, 3).join(" | "));
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}${d && s === "FAIL" ? "  :: " + d : ""}`);
const f = results.filter((r) => r[0] === "FAIL").length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
