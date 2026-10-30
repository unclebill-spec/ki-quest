// W18.1: word-wrap for HUD text (toast + objective) so nothing runs off the 384-unit base width. Wording is never changed.
export function wrap(c: { measureText(s: string): { width: number } }, s: string, max: number): string[] {
  const out: string[] = []; let line = "";
  for (const w of s.split(" ")) {
    const t = line ? line + " " + w : w;
    if (!line || c.measureText(t).width <= max) { line = t; continue; }
    out.push(line); line = w;
  }
  if (line) out.push(line);
  return out;
}
/** Lines the objective used last frame (art.ts sets it), so the toast can sit above it. */
export const hud = { objLines: 1 };
(globalThis as unknown as { __kiText?: unknown }).__kiText = { wrap, hud };
