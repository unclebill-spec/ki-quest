/**
 * Unified input: keyboard/mouse, gamepad and touch (floating stick + 4 buttons + pause/map icons).
 * Stick maths and pad reading are Gravewake's (src/vendor/screen.ts copy). Touch UI shows on touch and
 * auto-hides once a key, mouse or pad is used; the mouse cursor hides after 2 s still.
 */
import { readStick, readPad, PAD, STICK_CAP } from "./vendor/screen";

export type Btn = "melee" | "blast" | "block" | "cycle" | "pause" | "map" | "run" | "up" | "down" | "confirm";
const KEYMAP: Record<string, Btn> = {
  KeyJ: "melee", KeyK: "blast", ShiftLeft: "block", ShiftRight: "block", KeyQ: "cycle", Escape: "pause", KeyM: "map",
  Enter: "confirm", Space: "confirm", ArrowUp: "up", ArrowDown: "down",
};
const PADMAP: [number, Btn][] = [[PAD.A, "melee"], [PAD.B, "blast"], [PAD.X, "run"], [PAD.LB, "cycle"], [PAD.RB, "block"], [PAD.Start, "pause"], [PAD.Back, "map"], [PAD.Up, "up"], [PAD.Down, "down"]];
const DIRKEYS: Record<string, [number, number]> = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

export class Input {
  mx = 0; my = 0; running = false;
  private held = new Set<Btn>();
  private prev = new Set<Btn>();
  private now = new Set<Btn>();
  private keys = new Set<string>();
  private touchBtns = new Set<Btn>();
  private padBtns = new Set<Btn>();
  private lastTap: Record<string, number> = {};
  private keyRun = false;
  private stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0, run: false };
  private padAxis = { x: 0, y: 0 };
  source: "keys" | "pad" | "touch" = "keys";
  private cursorTimer = 0;

  constructor(private root: HTMLElement) {
    addEventListener("keydown", (e) => {
      if (e.repeat) { if (KEYMAP[e.code] || DIRKEYS[e.code]) e.preventDefault(); return; }
      this.use("keys");
      if (DIRKEYS[e.code]) {
        const t = performance.now();
        if (t - (this.lastTap[e.code] ?? -1e9) < 260) this.keyRun = true;
        this.lastTap[e.code] = t;
      }
      if (KEYMAP[e.code] || DIRKEYS[e.code]) e.preventDefault();
      this.keys.add(e.code);
    });
    addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
      if (!Object.keys(DIRKEYS).some((k) => this.keys.has(k))) this.keyRun = false;
    });
    addEventListener("blur", () => { this.keys.clear(); this.touchBtns.clear(); this.keyRun = false; });
    addEventListener("mousemove", () => {
      document.body.classList.remove("nocursor");
      clearTimeout(this.cursorTimer);
      this.cursorTimer = window.setTimeout(() => document.body.classList.add("nocursor"), 2000);
    });
    addEventListener("mousedown", () => this.use("keys"));
    // Touch: buttons by data-b, stick from any touch in the left 45% of the screen.
    const base = root.querySelector<HTMLElement>("#stickBase")!, knob = root.querySelector<HTMLElement>("#stickKnob")!;
    root.addEventListener("touchstart", (e) => {
      this.use("touch");
      for (const t of Array.from(e.changedTouches)) {
        const el = (t.target as HTMLElement).closest?.("[data-b]") as HTMLElement | null;
        if (el) { this.touchBtns.add(el.dataset.b as Btn); el.classList.add("on"); continue; }
        if (this.stick.id < 0 && t.clientX < innerWidth * 0.45) {
          Object.assign(this.stick, { id: t.identifier, ox: t.clientX, oy: t.clientY, x: 0, y: 0, run: false });
          base.style.display = "block"; base.style.left = t.clientX + "px"; base.style.top = t.clientY + "px";
          knob.style.transform = "";
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.stick.id) { this.stick.id = -1; this.stick.x = this.stick.y = 0; this.stick.run = false; base.style.display = "none"; continue; }
        const el = (t.target as HTMLElement).closest?.("[data-b]") as HTMLElement | null;
        if (el) { this.touchBtns.delete(el.dataset.b as Btn); el.classList.remove("on"); }
      }
    };
    root.addEventListener("touchend", end); root.addEventListener("touchcancel", end);
    root.addEventListener("touchmove", (e) => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === this.stick.id) {
        const s = readStick(t.clientX - this.stick.ox, t.clientY - this.stick.oy, STICK_CAP);
        this.stick.x = s.x; this.stick.y = s.y; this.stick.run = s.running;
        knob.style.transform = `translate(${s.x * STICK_CAP}px,${s.y * STICK_CAP}px)`;
      }
      e.preventDefault();
    }, { passive: false });
  }

  private use(s: "keys" | "pad" | "touch") {
    if (this.source === s) return;
    this.source = s;
    document.body.classList.toggle("touch", s === "touch");
  }

  /** Call once per frame before reading. */
  poll() {
    const pad = readPad(navigator.getGamepads?.());
    this.padBtns.clear(); this.padAxis.x = this.padAxis.y = 0;
    if (pad) {
      PADMAP.forEach(([i, b]) => pad.pressed[i] && this.padBtns.add(b));
      let px = Math.abs(pad.lx) > 0.18 ? pad.lx : 0, py = Math.abs(pad.ly) > 0.18 ? pad.ly : 0;
      if (pad.pressed[PAD.Left]) px = -1; if (pad.pressed[PAD.Right]) px = 1;
      if (pad.pressed[PAD.Up]) py = -1; if (pad.pressed[PAD.Down]) py = 1;
      this.padAxis.x = px; this.padAxis.y = py;
      if (this.padBtns.size || px || py) this.use("pad");
    }
    this.prev = this.now;
    this.now = new Set<Btn>();
    for (const k of this.keys) if (KEYMAP[k]) this.now.add(KEYMAP[k]);
    this.touchBtns.forEach((b) => this.now.add(b));
    this.padBtns.forEach((b) => this.now.add(b));
    this.held = this.now;
    let x = 0, y = 0;
    for (const k of this.keys) if (DIRKEYS[k]) { x += DIRKEYS[k][0]; y += DIRKEYS[k][1]; }
    if (this.keys.has("ArrowUp")) y -= 1; if (this.keys.has("ArrowDown")) y += 1;
    let run = this.keyRun && (x !== 0 || y !== 0);
    if (!x && !y) { x = this.stick.x + this.padAxis.x; y = this.stick.y + this.padAxis.y; run = this.stick.run || Math.hypot(this.padAxis.x, this.padAxis.y) > 0.95 && this.padBtns.has("run") || this.padBtns.has("run"); }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    this.mx = x; this.my = y; this.running = run && m > 0.1;
  }
  down(b: Btn) { return this.held.has(b); }
  pressed(b: Btn) { return this.now.has(b) && !this.prev.has(b); }
  /** Test hook: simulate a key press/release. */
  key(code: string, on: boolean) { if (on) this.keys.add(code); else this.keys.delete(code); }
}
