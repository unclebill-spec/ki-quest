// W22: per-NPC bark no-repeat, docs/story copy, map key 'gold: letters', Codex 'n new', Linnet hello/zzz hooks (off, no lines), Options bark preview.
// was W21: old-save load gear toast suppressed, map 'letters' legend, codex "new" dots (story flags codexRead_<id>), Linnet's ambient barks + gating, Options > Barks (Off/Low/Normal).
// node tests/w21.mjs (after npm run build).
// SHOTS=dir also saves Pixel 7 + 1280x720 screenshots there. KI_PORT to change port.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire("/workspace/tools/game/node/");
const { chromium, devices } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4522), SHOTS = process.env.SHOTS || "";
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


    // 1. Per-NPC no-repeat: with rnd fixed to 0 the pool's first line would always win; the NPC's last line must be excluded
    await boot({ introSeen: true, metAma: true, visited_lanternmoss: true });
    await go("lanternmoss");
    const nr = await E(() => { const s = window.__ki.story, g = window.__ki.game, n = g.area.npcs.find((x) => x.id !== "l"); const out = [];
      s.rnd = () => 0; for (let i = 0; i < 12; i++) { g.p.x = n.x + 30; g.p.y = n.y; g.mode = "play"; g.toastT = 0; g.bannerT = 0; s.box = null; if (s.bark()) out.push(window.__kiText.hud.bark.text); }
      s.rnd = Math.random; return { id: n.id, out, key: s.flags[`lastBark_${g.area.id}_${n.id}`] }; });
    ok(`${vn}: NPC barked 12 times with rnd=0`, nr.out.length === 12, String(nr.out.length));
    ok(`${vn}: never the same bark twice in a row (rnd=0)`, nr.out.every((t, i) => i === 0 || t !== nr.out[i - 1]), nr.out.slice(0, 4).join(" | "));
    ok(`${vn}: last bark stored per NPC`, nr.key === nr.out[nr.out.length - 1].slice(0, 80));
    const rnd = await E(() => { const s = window.__ki.story, g = window.__ki.game, n = g.area.npcs.find((x) => x.id !== "l"); let prev = "", rep = 0, k = 0;
      for (let i = 0; i < 300; i++) { g.p.x = n.x + 30; g.p.y = n.y; g.mode = "play"; g.toastT = 0; g.bannerT = 0; s.box = null; if (s.bark()) { const t = window.__kiText.hud.bark.text; if (t === prev) rep++; prev = t; k++; } } return { rep, k }; });
    ok(`${vn}: 300 random barks, 0 back-to-back repeats`, rnd.k > 250 && rnd.rep === 0, JSON.stringify(rnd));
    // 3. Map key
    await boot({ introSeen: true, metAma: true, metMirela: true, lettersQ: true, lettersN: 2, letter_1: true, visited_hushwater: true });
    await go("hushwater");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(250);
    const lg = await E(() => window.__kiText.hud.mapLegend);
    ok(`${vn}: map key reads 'gold: letters'`, lg === "gold: letters", lg);
    const lgFit = await E(() => { const c = document.createElement("canvas").getContext("2d"); c.font = "7px monospace"; const a = c.measureText("gold: letters").width + 13; c.font = "bold 7px monospace"; const b = c.measureText("Letters 2/4").width + 8; return a + b + 6 < 34 * 8; });
    ok(`${vn}: map key and letters count don't overlap`, lgFit);
    await shot("map-key");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(200);
    // 4. Codex n new
    await boot({ introSeen: true, metAma: true, visited_hushwater: true, visited_lanternmoss: true });
    await go("lanternmoss"); await step(40);
    await E(() => { window.__ki.game.mode = "pause"; const u = window.__kiMenu.ui; u.tab = window.__kiMenu.TABS.indexOf("Lens"); u.sub = ""; u.sel = 0; }); await page.waitForTimeout(200);
    const c1 = await E(() => window.__kiMenu.codexLabel.text);
    ok(`${vn}: Lens row shows 'n new'`, / \d+ new$/.test(c1), c1);
    const n1 = Number((c1.match(/(\d+) new$/) || [])[1]);
    await shot("codex-new");
    await E(() => { const u = window.__kiMenu.ui; u.sub = "codex"; u.subSel = 0; }); await page.waitForTimeout(200);
    await E(() => { const u = window.__kiMenu.ui; u.sub = ""; }); await page.waitForTimeout(200);
    const c2 = await E(() => window.__kiMenu.codexLabel.text), n2 = Number((c2.match(/(\d+) new$/) || [0, 0])[1]);
    ok(`${vn}: reading an entry lowers the count (${n1} -> ${n2})`, n2 === n1 - 1, c2);
    const cFit = await E((t) => { const c = document.createElement("canvas").getContext("2d"); c.font = "7px monospace"; return c.measureText(t).width <= 104; }, c1);
    ok(`${vn}: Codex label fits its row`, cFit, c1);
    const c3 = await E(() => { const s = window.__ki.story; for (const e of window.__kiAmbient.CODEX) s.flags[`codexRead_${e.id}`] = true; return new Promise((r) => setTimeout(() => r(window.__kiMenu.codexLabel.text), 200)); });
    ok(`${vn}: all read -> no 'new'`, !/new/.test(c3), c3);
    // 5. Linnet hello/zzz hooks: off, empty (no Story lines yet)
    const lx = await E(() => { const A = window.__kiAmbient; return { on: A.LINNET_EXTRA_BARKS, h: A.LINNET_EXTRA.hello.length, z: A.LINNET_EXTRA.zzz.length, r1: A.linnetExtraBark({ linnetWoke: true }), r2: A.linnetExtraBark({ oath: true }) }; });
    ok(`${vn}: Linnet hello/zzz hooks exist, flag off, no lines invented`, lx.on === false && lx.h === 0 && lx.z === 0 && lx.r1 === undefined && lx.r2 === undefined, JSON.stringify(lx));
    const lb = await E(() => window.__kiAmbient.linnetBark({ linnetWoke: true }, 0.5, () => 0));
    ok(`${vn}: Linnet's W21 barks unchanged`, typeof lb === "string" && lb.length > 0);
    // 6. Options bark preview
    await boot({ introSeen: true, metAma: true, visited_lanternmoss: true });
    await go("lanternmoss");
    await E(() => { window.__ki.game.mode = "pause"; const u = window.__kiMenu.ui; u.tab = window.__kiMenu.TABS.indexOf("Options"); u.sub = ""; u.sel = 6; }); await page.waitForTimeout(120);
    const bh0 = await E(() => window.__ki.story.flags.barksHeard || 0);
    await page.keyboard.press("KeyJ"); await page.waitForTimeout(250);
    const pv = await E(() => ({ ...window.__kiMenu.preview, f: window.__ki.game.barkFreq, bh: window.__ki.story.flags.barksHeard || 0 }));
    ok(`${vn}: changing Barks plays a sample bark`, pv.f === 1 && pv.t > 0 && pv.text.length > 3 && !pv.text.startsWith("(No"), JSON.stringify(pv));
    ok(`${vn}: preview doesn't count as a heard bark`, pv.bh === bh0);
    await shot("options-preview");
    const pvFit = await E((t) => { const c = document.createElement("canvas").getContext("2d"); c.font = "7px monospace"; const L = window.__kiText.wrap(c, `“${t}”`, 384 - 198 - 6); return L.length <= 5 && L.every((l) => c.measureText(l).width <= 180); }, pv.text);
    ok(`${vn}: preview text wraps inside the side panel`, pvFit);
    await page.keyboard.press("KeyJ"); await page.waitForTimeout(250);
    const pv2 = await E(() => ({ ...window.__kiMenu.preview, f: window.__ki.game.barkFreq }));
    ok(`${vn}: Off shows a quiet note`, pv2.f === 0 && pv2.text.startsWith("(No barks"), JSON.stringify(pv2));
    await page.waitForTimeout(3800);
    ok(`${vn}: preview fades back to Controls`, (await E(() => window.__kiMenu.preview.t)) <= 0);
    await E(() => { localStorage.setItem("kiquest-opt-barks", "2"); window.__ki.game.barkFreq = 2; });
    ok(`${vn}: no page errors`, errs.length === 0, errs.slice(0, 3).join(" | "));
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
for (const [s, n, d] of results) console.log(`${s}  ${n}${d && s === "FAIL" ? "  :: " + d : ""}`);
const f = results.filter((r) => r[0] === "FAIL").length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
