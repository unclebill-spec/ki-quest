// QA warp: ?qa=ashmaw|hollowmere|warden|ending. Swaps localStorage for an in-memory store seeded with a
// fixed save next to that boss, so real save slots are never read or written. Not linked from any UI.
(function () {
  var w = (location.search.match(/[?&]qa=(ashmaw|hollowmere|warden|ending)\b/) || [])[1]; if (!w) return;
  var base = { introSeen: 1, oath: 1, brann: 1, brannQ: 1, heart: 1, quarryBossDown: 1, quarryBeat: 1, sigilDone: 1, sable1: 1, sable2: 1, tideBossDown: 1 };
  var late = { sable3: 1, twist: 1, malachar: 1, stairIn: 1, cageDone: 1, sableJoin: 1, morvantDown: 1, threshold: 1, huskIn: 1, malacharDown: 1, poured: 1, malacharFade: 1 };
  var F = {
    ashmaw: { area: "lanternmoss", x: 536, y: 280, lvl: 8, mb: 0, fl: { introSeen: 1, metAma: 1, metMirela: 1, bell: 1, bellDone: 1, reedQ: 1, reedDone: 1, oath: 1, visited_wickhaven: 1, visited_hushwater: 1 }, g: { w: "w1", a: "a2", c: "c1", h: "h2", f: "f2" } },
    hollowmere: { area: "hushwater", x: 328, y: 360, lvl: 15, mb: 3, fl: Object.assign({ metAma: 1, metMirela: 1, bell: 1, bellDone: 1, reedQ: 1, reedDone: 1, corvinDown: 1 }, base), g: { w: "w3", a: "a4", c: "c4", h: "h4", f: "f4" } },
    warden: { area: "husk", x: 392, y: 312, lvl: 22, mb: 10, fl: Object.assign({}, base, late), g: { w: "w6", a: "a5", c: "c6", h: "h6", f: "f6" } },
    ending: { area: "husk", x: 392, y: 312, lvl: 22, mb: 10, fl: Object.assign({ runeSeen: 1 }, base, late), g: { w: "w6", a: "a5", c: "c6", h: "h6", f: "f6" } }
  }[w];
  var flags = { area: F.area }; for (var k in F.fl) flags[k] = true;
  var mb = {}; for (var i = 1; i <= F.mb; i++) mb["boss" + i] = true;
  var L = F.lvl, have = []; for (var s in F.g) have.push(F.g[s]);
  var save = { v: 2, at: Date.now(), area: F.area, areaId: F.area, x: F.x, y: F.y, lvl: L, exp: 0, pts: 0, str: L + 2, pow: L + 2, end: L + 2, hp: 9999, ep: 999, tf: 0,
    mirela: L >= 6, brann: L >= 6, play: 0, gear: F.g, gv: 2, have: have, coins: 300, items: { berry: 5 }, story: flags, bosses: mb };
  var m = { "kiquest-save-v1": JSON.stringify(save), "kiquest.story.v1": JSON.stringify(flags), "kiquest-mb-v1": JSON.stringify(mb), "kiquest-opt-noshake": "1" };
  var st = { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; },
    clear: function () { m = {}; }, key: function (i) { return Object.keys(m)[i] || null; }, get length() { return Object.keys(m).length; } };
  Object.defineProperty(window, "localStorage", { value: st, configurable: true });
  window.__kiQA = w;
  // ending: once Warden Rune spawns, drop it to 40 HP (phases cascade) so the defeat -> dawn -> credits chain is quick to reach.
  if (w === "ending") var iv = setInterval(function () { var M = globalThis.__kiMB, g = window.__ki && window.__ki.game, e = M && M.runeOf && g && M.runeOf(g); if (e) { e.hp = Math.min(e.hp, 40); clearInterval(iv); } }, 200);
})();
