import "./style.css";
import { Input } from "./input";
import { Game } from "./game";
import { render, W, H, MENU_ROWS } from "./draw";
import { installer } from "./vendor/install";
import { enterFullscreen, canFullscreen } from "./vendor/screen";
import { readSave } from "./save";
import { preloadSheets } from "./game/combat/draw"; // MB hook
preloadSheets();
import { Audio } from "./audio";
import { Story } from "./story";
import { storyOverlay, bindStory } from "./areas/art";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const stage = document.getElementById("stage")!;
const input = new Input(stage);
const game = new Game(input);
const audio = new Audio();
const story = new Story(game, input);
bindStory(story);
addEventListener("pointerdown", () => audio.unlock()); addEventListener("keydown", () => audio.unlock());

// Landscape layout: keep 16:9, integer scale when it fits, fractional on small phones.
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const k = s >= 2 ? Math.floor(s) : s;
  canvas.style.width = W * k + "px"; canvas.style.height = H * k + "px";
}
addEventListener("resize", fit); fit();

// Title, Install (Gravewake installer copy) and fullscreen
const title = document.getElementById("title")!, startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const installBtn = document.getElementById("installBtn") as HTMLButtonElement, fsBtn = document.getElementById("fsBtn") as HTMLButtonElement;
if (readSave()) startBtn.textContent = "Continue";
const inst = installer();
const syncInstall = () => { const s = inst?.state(); installBtn.hidden = !(s === "ready" || s === "ios"); };
inst?.subscribe(syncInstall); syncInstall();
installBtn.onclick = async () => { if (inst?.state() === "ios") { document.getElementById("iosTip")!.hidden = false; } else await inst?.install(); syncInstall(); };
fsBtn.hidden = !canFullscreen(); fsBtn.onclick = () => void enterFullscreen();
const begin = () => { title.hidden = true; const cont = !!readSave(); game.start(true); story.begin(cont); };
startBtn.onclick = begin;
// W17d: New Game (keeps slots 1-3) + back to the title after the credits' THE END card
const newBtn = document.getElementById("newBtn") as HTMLButtonElement; newBtn.hidden = !readSave();
newBtn.onclick = () => { if (!confirm("Start a new game? Your current save is erased (Save slots 1-3 are kept).")) return;
  for (const k of ["kiquest-save-v1", "kiquest-autosave-v1", "kiquest.story.v1", "kiquest-mb-v1"]) try { localStorage.removeItem(k); } catch { /* private mode */ }
  location.reload(); };
addEventListener("kq-credits-end", () => { title.hidden = false; startBtn.textContent = "Continue"; newBtn.hidden = false; startBtn.focus(); });
startBtn.focus();

// Tap a status row on the canvas
canvas.addEventListener("pointerdown", (e) => {
  if (game.mode !== "pause") return;
  const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  const R = MENU_ROWS, i = Math.floor((y - R.y) / R.h);
  if (x >= R.x && x <= R.x + R.w && i >= 0 && i < 4) game.menuPick(i);
});

addEventListener("pagehide", () => game.autosave());
document.addEventListener("visibilitychange", () => { if (document.hidden) { game.autosave(); if (game.mode === "play") game.mode = "pause"; } });

let last = performance.now(), acc = 0;
const DT = 1 / 60;
function loop(now: number) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  while (acc >= DT) {
    if (!story.update(DT)) { game.step(DT); story.after(); } acc -= DT;
    if (game.mode === "title" && (input.pressed("melee") || input.pressed("pause")) && !title.hidden) begin();
  }
  { const F = story.flags as Record<string, unknown>; audio.watch(game as never, story.credits > 0 || (game.area.id === "husk" && !!F.malacharDown && (!F.dawn || !!story.box))); } // dawn epilogue + credits -> finale-theme
  if (game.mode !== "title") { render(ctx, game); storyOverlay(ctx, game, story, W, H); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

declare global { interface Window { __ki: unknown } }
window.__ki = {
  game, input, audio, story,
  state: () => ({ mode: game.mode, hp: game.hp, ep: game.ep, lvl: game.lvl, exp: game.exp, pts: game.pts, str: game.str, x: game.p.x, y: game.p.y, shots: game.shots.length, alive: game.enemies.filter((e) => !e.dead).length, ...game.stats }),
};
