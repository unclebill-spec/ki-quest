/** HD2D W14: gear v2 (staging/art/icons/GEAR_SPEC.md). Five slots; bonuses add to STR/POW/END/SPD.
 * Sources: L = level, S = shop in area `at` (lvl = min level to buy), B = boss drop (`at` = boss key, see BOSS),
 * Q = quest (`at` = story flag). Icons: cells of public/icons/gear-icons.png (Art's gear-icons-v2.png, icons_v2.json; h0/c0 have no icon).
 * Text: staging/story/gear_text.md. a6 = post-finale epilogue chest (flag dawn); w6 + c6 Sunheart = Malachar drops. */
export type GearSlot = "h" | "a" | "w" | "f" | "c";
export type GearSrc = "L" | "S" | "B" | "Q";
export interface Gear { id: string; slot: GearSlot; name: string; src: GearSrc; at: string; lvl: number; str: number; pow: number; end: number; spd: number; perk: string; icon: [number, number] | null; desc: string }
export const GEAR: Gear[] = [
  { id: "h0", slot: "h", name: "Bare Head", src: "L", at: "", lvl: 1, str: 0, pow: 0, end: 0, spd: 0, perk: "", icon: null, desc: "Nothing between you and the dark but stubbornness." },
  { id: "h1", slot: "h", name: "Lampwick Headband", src: "S", at: "lanternmoss", lvl: 2, str: 1, pow: 0, end: 0, spd: 0, perk: "", icon: [0, 0], desc: "A red band with a lit wick knot. Never quite goes out." },
  { id: "h2", slot: "h", name: "Reed Circlet", src: "S", at: "hushwater", lvl: 6, str: 0, pow: 1, end: 1, spd: 0, perk: "", icon: [16, 0], desc: "Hushwater reeds, woven green. They hum a faint, steady Glow." },
  { id: "h3", slot: "h", name: "Lens Visor", src: "Q", at: "capDone", lvl: 8, str: 0, pow: 2, end: 0, spd: 0, perk: "Lens bios show weak points (stub)", icon: [32, 0], desc: "Ama's spare Lens on a strap. Reads where foes are weakest." },
  { id: "h4", slot: "h", name: "Kiln Helm", src: "B", at: "slag", lvl: 12, str: 1, pow: 0, end: 3, spd: -1, perk: "", icon: [48, 0], desc: "Soot-iron cap from Slagheart's crust. The ember slit still glows." },
  { id: "h5", slot: "h", name: "Tide Crown", src: "B", at: "aurel", lvl: 16, str: 0, pow: 3, end: 2, spd: 0, perk: "", icon: [64, 0], desc: "The Tide Crown. Aurel's cold circlet; a slow cyan tide circles it." },
  { id: "h6", slot: "h", name: "Sunwarden Halo-Band", src: "B", at: "morvant", lvl: 20, str: 2, pow: 3, end: 2, spd: 1, perk: "", icon: [80, 0], desc: "Morvant's gold band. A small sun disc reads warm lumens again." },
  { id: "a0", slot: "a", name: "Traveler's Wrap", src: "L", at: "", lvl: 1, str: 0, pow: 0, end: 0, spd: 0, perk: "", icon: [96, 0], desc: "Traveler's Wrap. Patched and comfy; it has walked many roads." },
  { id: "a1", slot: "a", name: "Moss Weave", src: "S", at: "lanternmoss", lvl: 3, str: 0, pow: 0, end: 2, spd: 0, perk: "", icon: [112, 0], desc: "Soft green knit that holds what little Glow remains." },
  { id: "a2", slot: "a", name: "Fenrunner Jacket", src: "S", at: "hushwater", lvl: 7, str: 0, pow: 0, end: 2, spd: 1, perk: "", icon: [0, 16], desc: "A short teal jacket, cut for running the fen boardwalks." },
  { id: "a3", slot: "a", name: "Tidewarden Coat", src: "S", at: "drowned", lvl: 11, str: 0, pow: 1, end: 3, spd: 0, perk: "", icon: [16, 16], desc: "Navy oilskin from Drowned Vesper. Sheds the sea and the cold." },
  { id: "a4", slot: "a", name: "Slagplate Vest", src: "B", at: "slag", lvl: 13, str: 1, pow: 0, end: 5, spd: -1, perk: "", icon: [32, 16], desc: "Dark iron plates whose seams still hold the quarry's heat." },
  { id: "a5", slot: "a", name: "Sunwarden Mantle", src: "B", at: "morvant", lvl: 18, str: 1, pow: 1, end: 5, spd: 0, perk: "", icon: [48, 16], desc: "The Sunwardens' cream mantle. Warm as a lamp left burning." },
  { id: "a6", slot: "a", name: "Kindleheart Garb", src: "Q", at: "dawn", lvl: 22, str: 2, pow: 2, end: 4, spd: 1, perk: "", icon: [64, 16], desc: "Kindleheart Garb. From the dawn chest, for whoever lit the sun." },
  { id: "w0", slot: "w", name: "Cloth Wraps", src: "L", at: "", lvl: 1, str: 0, pow: 0, end: 0, spd: 0, perk: "", icon: [80, 16], desc: "Plain white wraps. All grip, no Glow." },
  { id: "w1", slot: "w", name: "Ember Knuckles", src: "S", at: "lanternmoss", lvl: 4, str: 2, pow: 0, end: 0, spd: 0, perk: "", icon: [96, 16], desc: "Brass knuckles. Each blow leaves a small orange spark." },
  { id: "w2", slot: "w", name: "Glowcap Gauntlets", src: "B", at: "rune", lvl: 6, str: 3, pow: 1, end: -1, spd: 0, perk: "", icon: [112, 16], desc: "Chunky gauntlets glowing grotto-blue. Heavy, but they hit harder." },
  { id: "w3", slot: "w", name: "Reedwraith Grips", src: "B", at: "corvin", lvl: 9, str: 2, pow: 2, end: 0, spd: 0, perk: "", icon: [0, 32], desc: "Grey-green reed grips, found on the Meadow's toll path. Cold, quiet." },
  { id: "w4", slot: "w", name: "Cinder Fists", src: "S", at: "kilnreach", lvl: 12, str: 4, pow: 1, end: 0, spd: 0, perk: "", icon: [16, 32], desc: "Kilnreach iron fist guards, red-hot. Every punch leaves embers." },
  { id: "w5", slot: "w", name: "Tidebreaker Bracers", src: "B", at: "aurel", lvl: 16, str: 4, pow: 2, end: 1, spd: 0, perk: "", icon: [32, 32], desc: "Count Aurel's silver-blue bracers. Turn a blow like a tide." },
  { id: "w6", slot: "w", name: "Dusk Talons", src: "B", at: "malachar", lvl: 20, str: 6, pow: 2, end: 0, spd: 0, perk: "", icon: [48, 32], desc: "Malachar's clawed gauntlets, humming violet. The last dusk, tamed." },
  { id: "f0", slot: "f", name: "Worn Sandals", src: "L", at: "", lvl: 1, str: 0, pow: 0, end: 0, spd: 0, perk: "", icon: [64, 32], desc: "Thin brown soles. Long roads ahead." },
  { id: "f1", slot: "f", name: "Mossy Wraps", src: "S", at: "lanternmoss", lvl: 3, str: 0, pow: 0, end: 1, spd: 1, perk: "", icon: [80, 32], desc: "Green foot wraps. Quiet steps through the moss." },
  { id: "f2", slot: "f", name: "Fen Boots", src: "S", at: "hushwater", lvl: 7, str: 0, pow: 0, end: 2, spd: 1, perk: "No slow in swamp (stub)", icon: [96, 32], desc: "Tall fen boots. The marsh can't slow you down." },
  { id: "f3", slot: "f", name: "Updraft Treads", src: "Q", at: "visited_kilnreach", lvl: 9, str: 0, pow: 0, end: 0, spd: 2, perk: "Faster flight (stub)", icon: [112, 32], desc: "Light shoes with wing tabs. The updraft lifts you faster." },
  { id: "f4", slot: "f", name: "Kiln Stompers", src: "B", at: "kettle", lvl: 12, str: 2, pow: 0, end: 2, spd: -1, perk: "", icon: [0, 48], desc: "Heavy iron gallery boots. Every step rings like a forge." },
  { id: "f5", slot: "f", name: "Tidewalk Greaves", src: "S", at: "drowned", lvl: 15, str: 0, pow: 1, end: 2, spd: 2, perk: "Walk shallow water (stub)", icon: [16, 48], desc: "Silver shin guards. Shallow water barely slows you." },
  { id: "f6", slot: "f", name: "Sunstep Boots", src: "B", at: "twins", lvl: 19, str: 1, pow: 1, end: 1, spd: 3, perk: "", icon: [32, 48], desc: "Gold boots with sun soles. You leave warm prints behind." },
  { id: "c0", slot: "c", name: "No Charm", src: "L", at: "", lvl: 1, str: 0, pow: 0, end: 0, spd: 0, perk: "", icon: null, desc: "No charm. Your Glow is all your own." },
  { id: "c1", slot: "c", name: "Lantern Bead", src: "S", at: "lanternmoss", lvl: 2, str: 0, pow: 2, end: 0, spd: 0, perk: "", icon: [48, 48], desc: "A glowing orange bead on a cord. Brighter blasts, cheap price." },
  { id: "c2", slot: "c", name: "Linnet's Locket", src: "Q", at: "lettersDone", lvl: 8, str: 0, pow: 1, end: 2, spd: 0, perk: "Slow HP regen", icon: [64, 48], desc: "Linnet Vant's silver locket. Her old warmth slowly mends you." },
  { id: "c3", slot: "c", name: "Witchlight Charm", src: "B", at: "ombrelle", lvl: 10, str: 0, pow: 3, end: 0, spd: 1, perk: "", icon: [80, 48], desc: "A violet wisp in glass, from the Lantern Graveyard's oldest grave." },
  { id: "c4", slot: "c", name: "Wellspring Drop", src: "Q", at: "spring", lvl: 12, str: 0, pow: 3, end: 1, spd: 0, perk: "Glow regen", icon: [96, 48], desc: "A droplet of Wellspring water. Your Glow refills a little faster." },
  { id: "c5", slot: "c", name: "Capmother Spore", src: "B", at: "capmother", lvl: 14, str: 1, pow: 2, end: 1, spd: 0, perk: "Glow-sting on hit (stub)", icon: [112, 48], desc: "A glowing pink spore from the Glowcap ring. Foes it touches dazzle." },
  { id: "c6", slot: "c", name: "Sunheart", src: "B", at: "malachar", lvl: 20, str: 2, pow: 4, end: -1, spd: 0, perk: "Big blasts (+15%), tiny self-burn", icon: [0, 64], desc: "The Sunheart. The relit sun's warm core, beating slow and steady." },
  // MB hook (W17): unique optional-boss drop, source B only (never shops/loot/chests); effect in src/game/combat/w17.ts (fog areas). Icon reuses c3's violet glass for now.
  { id: "c7", slot: "c", name: "Stillwater Charm", src: "B", at: "hollowmere", lvl: 16, str: 0, pow: 1, end: 1, spd: 0, perk: "Fog sight + Glow regen in fog/water", icon: [64, 64], desc: "A smooth violet stone from Hollowmere's throat. Fog parts around whoever wears it." },
];
export const SLOT_ORDER: GearSlot[] = ["h", "a", "w", "f", "c"];
export const SLOT_NAMES: Record<GearSlot, string> = { h: "Head", a: "Garb", w: "Hands", f: "Feet", c: "Charm" };
export type Equip = Record<GearSlot, string>;
export const DEFAULT_GEAR: Equip = { h: "h0", a: "a0", w: "w0", f: "f0", c: "c0" };
export const SHOP_NAMES: Record<string, string> = { lanternmoss: "Wickhaven", hushwater: "Hushwater", drowned: "Drowned Vesper", kilnreach: "Kilnreach" };
/** Boss key -> (story flags, mb boss keys). "slag" = Slagheart (quarry). Ashmaw is the grotto boss (key "rune"). */
export const BOSS: Record<string, { name: string; flag?: string; mb?: string; /** TODO(MB): lead-in/quest flag used until the mini-boss fight exists; then drop it. */ alt?: string }> = {
  /* Key `rune` = Ashmaw (grotto boss), NOT Warden Rune: kept for save compatibility (Will, Oct 26; see CANON.md). Warden Rune = `wardenrune`. */
  rune: { name: "Ashmaw", mb: "boss" }, /* MB hook (W17) */ hollowmere: { name: "Hollowmere", flag: "hollowmereDown", mb: "boss11" }, wardenrune: { name: "Warden Rune", flag: "runeDown", mb: "boss12" }, slag: { name: "Slagheart", flag: "quarryBossDown", mb: "boss2" }, aurel: { name: "Count Aurel", flag: "tideBossDown", mb: "boss3" },
  twins: { name: "Cageward Twins", flag: "cageDone", mb: "boss4" }, morvant: { name: "Morvant", flag: "morvantDown", mb: "boss5" }, malachar: { name: "Malachar", flag: "malacharDown", mb: "boss6" },
  corvin: { name: "Reedwraith Corvin", flag: "corvinDown" }, kettle: { name: "Foreman Kettle", flag: "kettleDown" }, ombrelle: { name: "Lady Ombrelle", flag: "ombrelleDown" }, capmother: { name: "Capmother Gilt", flag: "capDone" },
};
export const price = (g: Gear) => g.lvl * 15;
export const gearById = (id: string) => GEAR.find((g) => g.id === id);
type Flags = Record<string, unknown>; type MB = Record<string, { done?: boolean } | unknown>;
/** Earned without buying: L by level, B by downed flag, Q by quest flag. */
export function earned(g: Gear, lvl: number, flags: Flags = {}, mb: MB = {}) {
  if (g.src === "L") return g.lvl <= lvl;
  if (g.src === "Q") return !!flags[g.at];
  if (g.src === "B") { const b = BOSS[g.at]; return !!b && (!!(b.flag && flags[b.flag]) || !!(b.alt && flags[b.alt]) || !!(b.mb && (mb[b.mb] as { done?: boolean } | undefined)?.done)); }
  return false;
}
export const owned = (have: string[], slot: GearSlot) => GEAR.filter((g) => g.slot === slot && have.includes(g.id));
export const shopStock = (areaId: string) => GEAR.filter((g) => g.src === "S" && g.at === areaId);
export function srcText(g: Gear) {
  if (g.src === "L") return `Lv ${g.lvl}`;
  if (g.src === "S") return `Shop: ${SHOP_NAMES[g.at] ?? g.at} (Lv ${g.lvl}, ${price(g)} coins)`;
  if (g.src === "B") return `Drop: ${BOSS[g.at]?.name ?? g.at}`;
  return g.at === "lettersDone" ? "Quest: Linnet's Letters (not in game yet)" : `Quest: ${({ capDone: "Ama's Capmother ring", dawn: "the epilogue chest", visited_kilnreach: "Updraft Cliff", spring: "the hidden Wellspring" } as Record<string, string>)[g.at] ?? g.at}`;
}
export function gearBonus(eq: Partial<Equip>) {
  const b = { str: 0, pow: 0, end: 0, spd: 0 };
  for (const s of SLOT_ORDER) { const g = eq[s] && gearById(eq[s]!); if (g) { b.str += g.str; b.pow += g.pow; b.end += g.end; b.spd += g.spd; } }
  return b;
}
export const hasPerk = (eq: Partial<Equip>, id: string) => Object.values(eq).includes(id);
let sheet: HTMLImageElement | null = null;
export function drawGearIcon(c: CanvasRenderingContext2D, g: Gear | undefined, x: number, y: number) {
  if (!g?.icon || typeof Image === "undefined") return false;
  if (!sheet) { sheet = new Image(); sheet.src = import.meta.env.BASE_URL + "icons/gear-icons.png"; }
  if (!sheet.complete || !sheet.naturalWidth) return false;
  c.drawImage(sheet, g.icon[0], g.icon[1], 16, 16, Math.round(x), Math.round(y), 16, 16); return true;
}
/** Old (W14 v1, 12-item) ids -> spec v2 ids by name, so old equips keep the same item. */
export const OLD_IDS: Record<string, string> = { w0: "w0", w1: "w1", w2: "w2", w3: "w6", a0: "a0", a1: "a1", a2: "a3", a3: "a5", c0: "c0", c1: "c1", c2: "c4", c3: "c6" };
