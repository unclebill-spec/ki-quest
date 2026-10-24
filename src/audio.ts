/**
 * Audio: staged CC0 music + SFX (Hearthmoor Sound, staging/sound). Web Audio, loaded after the first gesture.
 * Driven by diffing game state each frame, so the sim (game.ts / src/game/*) needs no audio calls.
 * Music: area theme, boss theme when a boss is engaged (game.bossActive, if present). Mute: N key (saved).
 */
type G = { mode: string; stats: Record<string, number>; shield: boolean; tf: number; area: { music?: string }; bossActive?: boolean; dialog?: unknown;
  mb?: { sfx: string[]; charging: boolean; hover: boolean } };
const BASE = import.meta.env.BASE_URL + "audio/";
const VOL: Record<string, number> = { "punch-light": 0.7, "block": 0.7, "blast-charge": 0.7, "shield": 0.7, "exp-pickup": 0.5,
  "kiblast-charge-full": 0.7, "flight-takeoff": 0.7, "flight-land": 0.7, "kiblast-charge-loop": 0.5, "flight-loop": 0.5 };
const KEY = "kiquest.mute.v1";

export class Audio {
  ctx: AudioContext | null = null; music!: GainNode; sfx!: GainNode;
  bufs = new Map<string, AudioBuffer>(); loading = new Set<string>();
  cur = ""; src: AudioBufferSourceNode | null = null;
  muted = localStorage.getItem(KEY) === "1";
  prev: Record<string, number> = {}; prevShield = false; prevTf = 0; played: string[] = [];

  constructor() {
    addEventListener("keydown", (e) => { if (e.code === "KeyN") this.setMute(!this.muted); });
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.music = this.ctx.createGain(); this.sfx = this.ctx.createGain();
      this.music.connect(this.ctx.destination); this.sfx.connect(this.ctx.destination);
      this.applyMute();
    }
    void this.ctx.resume();
  }
  setMute(m: boolean) { this.muted = m; localStorage.setItem(KEY, m ? "1" : "0"); this.applyMute(); }
  private applyMute() { if (!this.ctx) return; this.music.gain.value = this.muted ? 0 : 0.45; this.sfx.gain.value = this.muted ? 0 : 0.9; }
  private load(n: string) {
    if (!this.ctx || this.bufs.has(n) || this.loading.has(n)) return;
    this.loading.add(n);
    fetch(BASE + n + ".ogg").then((r) => r.arrayBuffer()).then((b) => this.ctx!.decodeAudioData(b))
      .then((buf) => { this.bufs.set(n, buf); if (n === this.cur && !this.src) this.startMusic(); })
      .catch(() => {}).finally(() => this.loading.delete(n));
  }
  play(n: string) {
    this.played.push(n); if (this.played.length > 40) this.played.shift();
    if (!this.ctx) return;
    const b = this.bufs.get(n); if (!b) { this.load(n); return; }
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = b; g.gain.value = VOL[n] ?? 1; s.connect(g).connect(this.sfx); s.start();
    if (n === "levelup" || n === "transform" || n === "transform-powerup") this.duck();
  }
  loops = new Map<string, { s: AudioBufferSourceNode; g: GainNode }>();
  /** Start/stop a looping SFX (whole-file loop). */
  loop(n: string, on: boolean) {
    const cur = this.loops.get(n);
    if (!on) { if (cur) { cur.s.stop(); this.loops.delete(n); } return; }
    if (cur || !this.ctx) return;
    const b = this.bufs.get(n); if (!b) { this.load(n); return; }
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = b; s.loop = true; g.gain.value = VOL[n] ?? 1; s.connect(g).connect(this.sfx); s.start();
    this.loops.set(n, { s, g });
  }
  private duck() { if (!this.ctx || this.muted) return; const t = this.ctx.currentTime, g = this.music.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.22, t); g.linearRampToValueAtTime(0.45, t + 2); }
  setMusic(n: string) {
    if (n === this.cur) return;
    this.cur = n; if (this.src) { this.src.stop(); this.src = null; }
    if (n) this.startMusic();
  }
  private startMusic() {
    if (!this.ctx) return;
    const b = this.bufs.get(this.cur); if (!b) { this.load(this.cur); return; }
    const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(this.music); s.start(); this.src = s;
  }
  /** Per-frame: turn state changes into sounds. */
  watch(g: G) {
    const S = g.stats, P = this.prev, d = (k: string) => (S[k] ?? 0) - (P[k] ?? 0);
    if (P.crits !== undefined) {
      if (d("crits") > 0) this.play("crit-hit");
      else if (d("normals") > 0) this.play("punch-light");
      if (d("blasts") > 0) this.play("blast-fire");
      if (d("kills") > 0) { this.play("punch-heavy"); this.play("exp-pickup"); }
      if (d("levelUps") > 0) this.play("levelup");
      if (d("shieldBlocks") > 0) this.play("block");
      if (d("hurt") > 0) this.play("blast-impact");
      if (d("saves") > 0) this.play("levelup");
      if (d("talks") > 0) this.play("exp-pickup");
      if (d("travels") > 0) this.play("transform");
    }
    this.prev = { ...S };
    if (g.mb) {
      for (const n of g.mb.sfx) this.play(n);
      g.mb.sfx.length = 0;
      const play = g.mode === "play";
      this.loop("kiblast-charge-loop", play && g.mb.charging);
      this.loop("flight-loop", play && g.mb.hover);
    }
    if (g.shield && !this.prevShield) this.play("shield");
    this.prevShield = g.shield;
    if (g.tf >= 100 && this.prevTf < 100) this.play("transform");
    this.prevTf = g.tf;
    this.setMusic(g.mode === "title" ? "" : g.bossActive ? "boss-theme" : (g.area.music ?? "area1-theme"));
  }
}
