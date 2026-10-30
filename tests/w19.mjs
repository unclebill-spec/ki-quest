// W19: Mirela pickup lines fit, compass ping, toast/objective overlap, title cleanup, no "Ki Quest" text. node tests/w19.mjs (after npm run build). KI_PORT to change port.
// SHOTS=dir also saves Pixel 7 + 1280x720 screenshots there.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
const require = createRequire("/workspace/tools/game/node/");
const { chromium, devices } = require("playwright");
const PORT = Number(process.env.KI_PORT || 4519), SHOTS = process.env.SHOTS || "";
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
// static: no player-visible "Ki Quest" in the built game
const dist = ["dist/index.html", ...readdirSync("dist/assets").filter((f) => f.endsWith(".js")).map((f) => "dist/assets/" + f), "dist/kiquest.webmanifest"];
const hits = dist.filter((f) => { try { return /Ki Quest/i.test(readFileSync(f, "utf8")); } catch { return false; } });
ok('no "Ki Quest" text in the built game (html, bundle, manifest)', hits.length === 0, hits.join(","));
const browser = await chromium.launch();
const views = [["pixel7", { ...devices["Pixel 7 landscape"] }], ["desktop1280", { viewport: { width: 1280, height: 720 } }]];
try {
  for (const [vn, ctxOpt] of views) {
    const ctx = await browser.newContext(ctxOpt); const page = await ctx.newPage();
    const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    const shot = (n) => SHOTS ? page.screenshot({ path: `${SHOTS}/${vn}-${n}.png` }) : null;
    await page.goto(`http://localhost:${PORT}/ki-quest/`);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("kiquest.story.v1", JSON.stringify({ introSeen: true, metAma: true, metMirela: true, visited_hushwater: true })); });
    await page.reload(); await page.waitForTimeout(500);
    const title = await page.evaluate(() => document.querySelector("#title")?.innerText ?? "");
    ok(`${vn}: title has no dev text (grey-box / Stage 1)`, !/grey-box|stage 1/i.test(title) && /KINDLE QUEST/.test(title), title.replace(/\n/g, " | "));
    ok(`${vn}: title shows the studio name`, /Burning Bush Productions/.test(title));
    await shot("title");
    await page.click("#startBtn").catch(() => page.tap("#startBtn")); await page.waitForTimeout(600);
    const E = (f, a) => page.evaluate(f, a);
    const step = async (n = 30) => { await page.waitForTimeout(120); return E((n) => { const g = window.__ki.game; for (let i = 0; i < n; i++) { g.p.inv = 1; g.step(1 / 60); } }, n); };
    const go = (area) => E((a) => { const s = window.__ki.story; s.enter(a); s.box = null; window.__ki.game.enemies.forEach((e) => { e.dead = true; e.respawn = 1e9; }); }, area);
    await E(() => { const s = window.__ki.story; Object.assign(s.flags, { lettersQ: true, lettersN: 1 }); s.save(); });
    await go("hushwater"); await step(4); await page.waitForTimeout(200);
    const L = [[14, 22], [33, 24], [44, 11]];
    // compass: start near letter 3 so the "nearest" isn't just list order
    await E(() => { const g = window.__ki.game; g.p.x = 40 * 16 + 8; g.p.y = 14 * 16 + 8; }); await step(2); await page.waitForTimeout(250);
    let cp = await E(() => { const c = window.__kiText.hud.compass; const g = window.__ki.game; return { t: c.target, shown: c.shown, px: g.p.x, py: g.p.y }; });
    const ang = (x, y) => Math.atan2(y * 16 + 8 - cp.py, x * 16 + 8 - cp.px);
    ok(`${vn}: compass points at the nearest uncollected letter`, cp.t && Math.abs(cp.t.a - ang(44, 11)) < 0.01 && cp.shown, JSON.stringify(cp));
    await shot("compass");
    const fits = []; let pickShot = false;
    for (const [x, y] of L) {
      await E(([x, y]) => { const g = window.__ki.game; g.p.x = x * 16 + 8; g.p.y = y * 16 + 8; }, [x, y]); await step(3); await page.waitForTimeout(250);
      fits.push(await E(() => { const g = window.__ki.game, T = window.__kiText, c = document.createElement("canvas").getContext("2d"); c.font = "8px monospace";
        const Ls = T.wrap(c, g.toast, 384 - 24), b = T.hud.toastBox; return { toast: g.toast, n: window.__ki.story.flags.lettersN, max: Math.max(...Ls.map((l) => c.measureText(l).width)), lines: Ls.length, box: b, obj: T.hud.objBox }; }));
      if (!pickShot) { await shot("letter-pickup-mirela"); pickShot = true; }
      const nx = await E(() => window.__kiText.hud.compass.target);
      if (fits.at(-1).n < 4) { const rem = L.filter(([a, b]) => !(a === x && b === y)); ok(`${vn}: compass moves on after letter ${fits.at(-1).n}`, nx && !(nx && Math.hypot(nx.x - (x * 16 + 8), nx.y - (y * 16 + 8)) < 1)); }
    }
    await shot("letter4-mirela");
    for (const f of fits) ok(`${vn}: pickup ${f.n}/4 has Mirela's line and fits (${f.lines} lines, ${f.max.toFixed(0)}/360 wide)`, /Mirela: "/.test(f.toast) && f.max <= 360 && f.box && f.box.y >= 0 && f.box.x >= 0 && f.box.x + f.box.w <= 384 && (!f.obj || f.box.y + f.box.h <= f.obj.y + 1), JSON.stringify(f));
    ok(`${vn}: 4/4 reached`, fits.at(-1).n === 4);
    ok(`${vn}: compass gone once all 4 letters are collected`, await E(() => window.__kiText.hud.compass.target === null && !window.__kiText.hud.compass.shown));
    // overlap: one-line toast over one-line objective
    await E(() => { const s = window.__ki.story; Object.assign(s.flags, { lettersQ: false }); window.__ki.game.say("Saved · HP and EP restored", 3); }); await step(1); await page.waitForTimeout(300);
    const ov = await E(() => { const h = window.__kiText.hud; return { t: h.toastBox, o: h.objBox, ol: h.objLines }; });
    ok(`${vn}: 1-line toast sits above a 1-line objective (no overlap)`, ov.ol === 1 && ov.t && ov.o && ov.t.h === 13 && ov.t.y + ov.t.h <= ov.o.y, JSON.stringify(ov));
    await shot("toast-over-objective");
    // Linnet motes
    await E(() => { const s = window.__ki.story; Object.assign(s.flags, { lettersQ: true, lettersN: 4, lettersRead: true, oath: true, linnetWoke: true }); s.save(); });
    await go("lanternmoss"); await page.waitForTimeout(500); await step(2); await E(() => { window.__ki.game.toastT = 0; window.__ki.game.bannerT = 0; const g = window.__ki.game, n = g.area.npcs.find((q) => q.id === "l"); if (n) { g.p.x = n.x + 30; g.p.y = n.y + 10; } });
    const m0 = await E(() => window.__kiText.hud.motes.n); await step(60); await page.waitForTimeout(700);
    const m1 = await E(() => window.__kiText.hud.motes.n);
    ok(`${vn}: Linnet gives off glow motes`, m1 - m0 >= 4, `${m0}->${m1}`); await E(() => { window.__ki.game.toastT = 0; });
    await shot("linnet-motes");
    ok(`${vn}: 0 page errors`, errs.length === 0, errs.slice(0, 3).join(" ; "));
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
for (const r of results) console.log(r.join(" | "));
const f = results.filter((r) => r[0] === "FAIL").length; console.log(`w19: ${results.length - f}/${results.length}`); process.exit(f ? 1 : 0);
