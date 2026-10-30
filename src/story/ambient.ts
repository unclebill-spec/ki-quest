// Kindle Quest ambient barks + codex (Hearthmoor Story, 2026-10-30). NEW data table: nothing reads it yet.
// Suggested home: src/story/ambient.ts. Uses the same Flags type as src/story/script.ts and dayK from src/areas/art.ts.
import type { Flags } from "./script";
import { dayK } from "../areas/art";

export type BarkPool = { dark: string[]; day: string[]; night: string[]; weather: { id: string; when: (f: Flags) => boolean; lines: string[] }[] };

export const AMBIENT: Record<string, BarkPool> = {
  lanternmoss: {
    dark: [
      "Lamp's lit, lamp's lit. Say it twice and it stays lit. Probably.",
      "The Old Watch bell hasn't rung in years. The pigeons prefer it.",
      "Glowcaps on the Woods path are taller this week. Showing off.",
      "Mind the updraft stone on the cliff. It doesn't wait for you.",
      "My mushroom lamp flickered at supper. I gave it a stern look.",
      "Cold fire's lovely till you try to toast bread on it.",
      "Witchlight's out in the fen. Purple means 'go home', my nan said.",
      "Someone keeps leaving moss-cakes at the hearthstone. Not me. Mostly.",
      "Wickhaven's never had a dull night. It's had a dark one. Every one.",
      "The Grotto hums when you put your ear to the well. Try it.",
      "Glow orbs drifted into my kitchen again. Rent's due, little ones.",
    ],
    day: [
      "Is the sky meant to be this... loud? It's very yellow.",
      "Day! Real day! I've had my shutters open since breakfast.",
      "My lamp's off and nobody's scolded me. Strangest feeling.",
      "The glowcaps fold up at noon now. Shy, I reckon.",
    ],
    night: [
      "Night again. Lamps on. Old habits feel good on a full belly.",
      "Orbs are back out. They were only napping through the gold bit.",
      "You can see both now: stars and glowcaps. Spoiled, we are.",
      "Rook used to light every lamp on this lane. Now he just waves.",
    ],
    weather: [
      { id: "sporefall", when: () => true, lines: [
        "Sporefall tonight. Breathe through your scarf, sneeze in blue.",
        "Spores in my hair again. I glow like a dandelion.",
        "Glowcap dust on the rooftops. Looks like frost that likes you.",
        "Sweep the spores off the step and they just glow on the broom.",
      ] },
    ],
  },
  hushwater: {
    dark: [
      "Speak softly near the graveyard. Not for the dead. For the keeper.",
      "Boardwalk's damp. It's always damp. Hushwater, see.",
      "The reeds whisper. Mostly they say 'mind your step'.",
      "Lantern Graveyard's the brightest street in town. Bit grim. Lovely.",
      "Fen Marrow's heard every fog story. Tell him a new one, he'll pay.",
      "Wraiths in the meadow are harmless. They just like a chat.",
      "My boots squelch. Not slimy, just wet. Very honestly wet.",
      "Don't feed the witchlight newts. They'll follow you to dinner.",
      "Some folk say the marsh drinks. Water goes somewhere, I say.",
      "The Landing lamps are blue. The graveyard lamps are violet. Rules.",
    ],
    day: [
      "Sun on the fen! The reeds look embarrassed to be seen.",
      "The meadow's gold now. Even the wraiths come out to look.",
      "Washing's actually drying. Hushwater history, that.",
      "Daylight makes the graveyard look almost cheerful. Almost.",
    ],
    night: [
      "Witchlight's back at dusk. The marsh missed its purple.",
      "Night ferry's running. Fen says it's still a whole thing.",
      "The graves glow brighter after a warm day. Stored it up, maybe.",
      "Mirela's lanterns lit themselves tonight. Cheeky lanterns.",
    ],
    weather: [
      { id: "fog", when: (f) => !f.bellDone, lines: [
        "Fog's so thick I waved at my own reflection twice.",
        "Can't see the Landing from the Landing. Fog's a menace.",
        "Boats in fog go in circles. So do I, and I'm on foot.",
        "Hold a lantern up and the fog just politely glows at you.",
      ] },
      { id: "clear", when: (f) => !!f.bellDone, lines: [
        "Fog's gone. Turns out my neighbour's been waving for weeks.",
        "I can see the far reeds! They're further than I thought.",
        "Bell rang and the fog lifted like a lid. Rude of it to stay so long.",
      ] },
    ],
  },
  kilnreach: {
    dark: [
      "Forge Square never sleeps. It snores, but it never sleeps.",
      "Ember-veins pulse under your boots here. Don't go barefoot.",
      "Quarry Road's for carts and fools. Pick which you are.",
      "Brann's bread came out of the forge oven. Tastes like victory.",
      "The Emberflow looks slow. Ask Dace how slow. Don't, actually.",
      "Slopes are steep. Mountain goats here have stern opinions.",
      "Hammer on anvil, all night long. Kilnreach's lullaby.",
      "Red lamps on the Landing so the fliers know where the ground is.",
      "Tib's been listening to rocks again. Ear's bright red.",
      "My apron's older than me. Hand-me-down from the mountain.",
    ],
    day: [
      "Daylight on the slopes. The stone looks warm for once.",
      "Sun's up and the forge is still hotter. Forge wins.",
      "Real light! I can finally see what I've been hammering.",
      "Kids are racing shadows down Quarry Road. New game, that.",
    ],
    night: [
      "Night shift. Veins glow red, sky glows blue. Pretty town.",
      "Embers on the wind at night look like little lost stars.",
      "Forge smoke and starlight. Smells like home, looks like magic.",
      "We kept the mountain warm through the dark. Habit now.",
    ],
    weather: [
      { id: "ashfall", when: (f) => !f.quarryBossDown, lines: [
        "Ash coming down soft tonight. Mountain's restless.",
        "Ashfall again. Hats on, mugs covered, chins up.",
        "Grey flakes on the anvil. The mountain's sneezing.",
        "The ash is cold. That's wrong. Ash should be warm.",
      ] },
      { id: "embershine", when: (f) => !!f.quarryBossDown, lines: [
        "Veins are bright as noon again. Mountain's got its pulse back.",
        "No more ash. The Slopes look freshly scrubbed.",
        "Heartbeat's steady. My hammer keeps time with it.",
      ] },
    ],
  },
  emberquarry: {
    dark: [
      "Smith's Lift creaks a tune. Nobody's sure which tune.",
      "Galleries go deeper than the maps. Maps get bored.",
      "Scrapjaws chew rubble. Don't let them sample your boots.",
      "Heart-Ember Seam glows like a coal that's thinking.",
      "Stonewards don't speak. They just stand there being right.",
      "Shift bell's three hundred years late. Kettle still waits for it.",
      "Hot down here. Brann calls it 'cosy'. Brann's a furnace.",
      "Mind the edges. The quarry's a long way down and proud of it.",
      "Echoes here answer back. Mostly with your own bad jokes.",
    ],
    day: [
      "Light's reaching the lift shaft now. Miners stopped squinting.",
      "A sunbeam hit the Galleries floor. Everyone went to look.",
      "Daytime in a quarry still looks like a quarry. Brighter quarry.",
      "First warm breeze down the shaft. Smells of grass. Grass!",
    ],
    night: [
      "Night or day, the Quarry Heart doesn't care. It just glows.",
      "Night shift's quiet now. The golems tuck in at dusk.",
      "Veins at night, red as cherries. Don't lick them.",
      "The lift lanterns come on by themselves now. Show-offs.",
    ],
    weather: [
      { id: "heat", when: (f) => !f.quarryBossDown, lines: [
        "Air's wobbling. Either it's heat or I need a sit down.",
        "Something below is drinking the warmth. Walls feel thirsty.",
        "Embers keep dimming mid-glow. Like a sigh with sparks.",
        "Heat shimmer on the lift. Looks like it's melting. It isn't.",
      ] },
    ],
  },
  drowned: {
    dark: [
      "Mind the step. The sea moved it again. It does that.",
      "The canals glow teal. Something below is still breathing.",
      "Tidewarden Court's steps are worn smooth. Three centuries of sitting.",
      "Sigil Quay used to sell maps. Now the maps sell themselves. Soggy.",
      "Neri writes down everything. Even this. Hello, Neri.",
      "Vesper sank, but the bells still ring under the water. Soft ones.",
      "Oilskins are fashion here. Wet is the colour of the season.",
      "The shades on the quay don't bother you if you don't bother them.",
      "Fish swim past the second-floor windows. Lovely neighbours.",
      "Old Calder's on the steps again. He's a fixture. A kind one.",
    ],
    day: [
      "Sunlight through the water! The canals look like glass jewels.",
      "Daylight on the Court. You can read the old carvings now.",
      "The sea's warmer by noon. Even the shades seem to stretch.",
      "I dried my hat on a roof for the first time ever.",
    ],
    night: [
      "Night tide's in. The teal glow comes back up to say goodnight.",
      "Stars reflect in the canals now. Two skies for one city.",
      "Evening bells under the water. Same tune, three hundred years.",
      "Lamps on the Landing at dusk. We keep that habit for the boats.",
    ],
    weather: [
      { id: "high tide", when: (f) => !f.tideBossDown, lines: [
        "Tide's high and sulky tonight. Steps one to five are underwater.",
        "Spray off the quay's like rain that came from the wrong way.",
        "Water's up to the knees on the Landing. Keep your Lens dry.",
        "The sea pulls toward the Undertide. Like it's being called.",
      ] },
    ],
  },
  undertide: {
    dark: [
      "Tide Stair: one step down, two steps damp.",
      "Kelp Galleries sway like a slow dance. Don't cut in.",
      "It's quiet down here. The water does all the talking.",
      "Air pockets glow blue. Breathe in, it tastes like mint.",
      "The Drowned Wellspring sings when nobody's fighting near it.",
      "Old Vesper statues in the kelp. One looks like it's winking.",
      "Everything down here's polished. The sea's a tidy keeper.",
      "Bubbles rising. Little lanterns going home.",
    ],
    day: [
      "Daylight reaches this far now. Faint, gold, very polite.",
      "Sun-ripples on the stair. Like walking on a lit harp.",
      "Fish come up to feel the light. So do I.",
      "Kelp's greener in the day. Who knew kelp was green?",
    ],
    night: [
      "Night down here looks the same, but the kelp hums softer.",
      "The Wellspring glows brighter at night. Showing off for the stars.",
      "Glow orbs drift down the Tide Stair after dark. Night swim.",
      "Night current's gentle now. The sea's stopped being called.",
    ],
    weather: [
      { id: "current", when: (f) => !f.tideBossDown, lines: [
        "Current's strong. Hold the rail. The Stair has a rail. Use it.",
        "Everything's drifting toward the Wellspring. Me included.",
        "The kelp all points one way tonight. Downhill, toward Him.",
        "Something's drinking the tide. The water feels thin.",
      ] },
    ],
  },
  stair: {
    dark: [
      "Don't look down. There isn't a down. That's the problem.",
      "Floating Rings drift a hand's width a night. Mind the gaps.",
      "The Waystation's roof is gone. The view's better without it.",
      "Court soldiers say the Stair was built to reach the sun. Ambitious.",
      "Wind up here has no smell. Nothing to blow past.",
      "The husk sun hangs so close you can hear it creak.",
      "Red Cage light hurts if you stare. Stare at your boots instead.",
      "Captain Fenn polishes his buttons when he's nervous. Shiny buttons.",
    ],
    day: [
      "Gold light on the Rings! The Stair looks like a necklace now.",
      "Day up here is huge. I can see three towns and a cloud.",
      "The husk sun's warm. Warm! I'm sunburnt on one ear.",
      "Waystation roof's gone, so we get the whole sky. Fair trade.",
    ],
    night: [
      "Night on the Stair. The Rings glow violet like old coins.",
      "Stars this close feel personal. One waved, I'm sure.",
      "Night wind whistles through the Rings. Almost a tune.",
      "The Court keeps lanterns lit up here at night. Out of kindness now.",
    ],
    weather: [
      { id: "void wind", when: (f) => !f.sableJoin, lines: [
        "Void wind's up. Hold your hat. Hold your friend's hat.",
        "It's cold enough to see your words. Pick nice ones.",
        "The Rings rattle in the wind like chained bells.",
        "Wind's carrying red sparks from the Cage. Don't catch them.",
      ] },
    ],
  },
  husk: {
    dark: [
      "(Wind threads the empty ribs of the Husk Gate.)",
      "(Somewhere deep in the Heart, something ticks like cooling iron.)",
      "(Old Sunwarden runes line the arch. Half say TEND. Half say MINE.)",
      "(The black glass walls hold your reflection a moment too long.)",
      "(Ash drifts upward here, as if the sun still remembers heat.)",
      "(A faint gold seam pulses under the floor, slow as sleep.)",
      "(The hall is so large your footsteps come back as strangers.)",
      "(Five pedestals stand in a ring, waiting for something to return.)",
    ],
    day: [
      "(Light pours through the Gate like warm honey.)",
      "(The walls hum a low, contented note.)",
      "(Gold motes drift through the Heart and settle on your sleeves.)",
      "(The black glass has gone clear. You can see the Reach far below.)",
    ],
    night: [
      "(Out in the Reach it is night. In here the glow only softens.)",
      "(Glow orbs nest in the arch of the Gate like small moons.)",
      "(The Heart dims to an ember's breath, resting.)",
      "(Far below, a thousand lamps answer the sun's quiet light.)",
    ],
    weather: [
      { id: "sunflare", when: (f) => !!f.malacharDown, lines: [
        "(A slow flare rolls across the ceiling, gentle as a stretch.)",
        "(Gold sparks spill from the seams and wink out on the floor.)",
        "(The sun shudders once, then brightens, the way a hearth catches.)",
        "(Each flare washes the hall in the colour of a different Wellspring.)",
      ] },
    ],
  },
};

/** Pick one ambient line: time pool (dark before dawn; day/night after), with a 1-in-3 chance of an active weather line. */
export function ambientBark(area: string, f: Flags, t: number, rnd: () => number = Math.random): string | undefined {
  const p = AMBIENT[area]; if (!p) return undefined;
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
  const w = p.weather.filter((x) => x.when(f));
  if (w.length && rnd() < 1 / 3) return pick(pick(w).lines);
  return pick(!f.dawn ? p.dark : dayK(t) > 0.35 ? p.day : p.night);
}

export type CodexEntry = { id: string; title: string; kind: "enemy" | "boss" | "place" | "item"; unlock: string; text: string };

/** Visited areas for codex unlocks. Save field: the build's own `visited_<id>` flags (story/index.ts sets them on area entry,
 *  saved under kiquest.story.v1). An old save without them reads as [] (nothing visited yet). */
export const visitedAreas = (f: Flags): string[] => Object.keys(f).filter((k) => k.startsWith("visited_") && !!f[k]).map((k) => k.slice(8));

/** unlock: "always", "flags.<key>" (story flag truthy) or "area.<id>" (id in visitedAreas(f)). */
export const codexUnlocked = (e: CodexEntry, f: Flags): boolean =>
  e.unlock === "always" ? true : e.unlock.startsWith("area.") ? visitedAreas(f).includes(e.unlock.slice(5)) : !!f[e.unlock.slice(6)];
export const CODEX: CodexEntry[] = [
  { id: "mossling", title: "Mossling", kind: "enemy", unlock: "always", text: "A tuft of glowing moss that learned to hop. Mosslings nibble lamp-wicks and scatter into green sparks when struck. Wickhaven children swear they purr." },
  { id: "glimmer_wisp", title: "Glimmer Wisp", kind: "enemy", unlock: "always", text: "A loose scrap of Wellspring light, curious and easily upset. Most wisps are harmless. The ones the Court has bottled and shaken are not." },
  { id: "bog_sprout", title: "Bog Sprout", kind: "enemy", unlock: "area.hushwater", text: "A marsh bulb that pops up under boardwalks, all leaves and temper. It bursts into violet petals, never anything worse." },
  { id: "witchlight_newt", title: "Witchlight Newt", kind: "enemy", unlock: "area.hushwater", text: "Small, purple, glowing, and absolutely sure it owns the fen. Its light is borrowed from the witchlight, and it hates giving any back." },
  { id: "reed_wraith", title: "Reed Wraith", kind: "enemy", unlock: "area.hushwater", text: "Dead whose glow never went out, drifting where the ferries used to run. Most only want company. Some have been told to want more." },
  { id: "duskhound", title: "Duskhound", kind: "enemy", unlock: "flags.ashmawDown", text: "The Vesper Court's hunting dogs, lean as shadows with cold blue eyes. They track Glow, not scent, so a dim lamp is a good hiding place." },
  { id: "hush_squire", title: "Hush Squire", kind: "enemy", unlock: "flags.ashmawDown", text: "Young knights of the Vesper Court in dark coats and polished boots. They fight neatly and apologise for nothing. Many quietly wish they had joined the lamp guild." },
  { id: "scrapjaw_stoneward", title: "Scrapjaw and Stoneward", kind: "enemy", unlock: "area.emberquarry", text: "Old quarry golems. Scrapjaws were built to chew rubble; Stonewards were built to stand guard. Neither was told to stop, so neither has." },
  { id: "boss_ashmaw", title: "Ashmaw, Grotto Devourer", kind: "boss", unlock: "flags.ashmawDown", text: "An ember-beast left starving in the Wellspring Grotto and called a guard. It ate the spring's light because nothing else was offered. It broke apart into warm sparks, and the Grotto breathed again." },
  { id: "boss_hollowmere", title: "Hollowmere, the Drinking Colossus", kind: "boss", unlock: "flags.hollowmereDown", text: "The great thirst in Hushwater's west meadow, hidden by the fog. When the Ferry Bell rang, it woke. When it fell, the marsh got its water back in one warm, glowing tide." },
  { id: "boss_slagheart", title: "Slagheart", kind: "boss", unlock: "flags.quarryBossDown", text: "The molten heart-golem at the bottom of Emberheart Quarry, made to keep the mountain warm. It wore a dead sun on its chest and drank the ember-veins dry. Kilnreach's heartbeat steadied the night it fell." },
  { id: "boss_aurel", title: "Count Aurel, Tide General", kind: "boss", unlock: "flags.tideBossDown", text: "Vesper's drowned general, a Court vampire in sea-dark plate who guarded the sunken Wellspring. He held the tide high so nobody could reach it. The sea has been calmer since." },
  { id: "boss_twins", title: "The Cageward Twins", kind: "boss", unlock: "flags.sableJoin", text: "Vey and Nell of the Cage, the Court's jailers on the Stair. Vey swings a red chain-hook; Nell carries a violet cage-lantern. Three pylons fed their shield. They never once fought apart." },
  { id: "boss_morvant", title: "Morvant, the Eclipse Golem", kind: "boss", unlock: "flags.morvantDown", text: "The gatekeeper at the top of the Stair, a golem cut to the shape of an eclipse. It was built to keep everyone out of the husk sun, and it did, until it didn't." },
  { id: "boss_malachar", title: "Lord Malachar Vesh, the Last Dusk", kind: "boss", unlock: "flags.malacharDown", text: "Once the Sunwarden, who tended the sun and let it starve because he liked being needed in the dark. He drained the Wellsprings into his own heart to be the last light. He was not, as it turned out, the last word." },
  { id: "boss_rune", title: "Warden Rune, Last Guardian of the Wellsprings", kind: "boss", unlock: "flags.runeDown", text: "The ancient wall that sealed the Wellsprings and kept the Reach dim so it could not burn. It woke when the light was poured back. Its old rule was simple: keep the world small enough to stay safe." },
  { id: "place_wickhaven", title: "Wickhaven", kind: "place", unlock: "always", text: "A lamp-lighters' village in Lanternmoss Hollow, where mushroom lamps line the lanes and every child can trim a wick. Rook Calder grew up lighting its lamps." },
  { id: "place_hushwater", title: "Hushwater", kind: "place", unlock: "area.hushwater", text: "A marsh town on boardwalks, kept by the Ferry Bell and the Lantern Graveyard. Its dead are neighbours, and its fog used to be a resident." },
  { id: "place_kilnreach", title: "Kilnreach", kind: "place", unlock: "area.kilnreach", text: "A forge town on the mountain's shoulder, built over ember-veins. They say the stone has a heartbeat, and the smiths keep it warm." },
  { id: "place_vesper", title: "Drowned Vesper", kind: "place", unlock: "area.drowned", text: "A city the sea took the night the sun went out. Its canals still glow teal from the Wellspring breathing far below." },
  { id: "place_stair", title: "The Stair", kind: "place", unlock: "area.stair", text: "Broken rings of stone climbing the void toward the husk sun. The Vesper Court held it, and once a Waystation sold tea here." },
  { id: "place_husk", title: "The Husk Sun", kind: "place", unlock: "area.husk", text: "The burnt-out sun itself, hollow and vast. Its Heart held Malachar's throne. Now it holds light again." },
  { id: "item_lens", title: "The Lens", kind: "item", unlock: "always", text: "A monocle of cut spring-crystal. It reads power in lumens, maps the ground and finds the lost. It frosts over when it sees something it cannot measure." },
  { id: "item_tear", title: "Wellspring Tear", kind: "item", unlock: "always", text: "A drop of liquid light in a glass vial. Shopkeepers keep them behind the counter, and adventurers keep them close to the heart." },
  { id: "item_hearthstone", title: "Hearthstones and Updraft Stones", kind: "item", unlock: "always", text: "Rune slabs older than the dark. Hearthstones remember you; updraft stones throw you skyward. Both hum when a Glow-user walks past." },
  { id: "item_kindle", title: "The Kindle Gauge", kind: "item", unlock: "always", text: "The fire every hero carries. It fills with every hit and every hard breath, and when it is full you Kindle into your brightest self." },
];

// ---- W20 (N64 Style): wiring helpers below this line. Story's table above is pasted unchanged. ----
/** Area order along the main path; reaching a later area means every earlier one was walked through. */
export const AREA_ORDER = ["lanternmoss", "hushwater", "kilnreach", "emberquarry", "drowned", "undertide", "stair", "husk"];
const PROGRESS: [string, string[]][] = [
  ["lanternmoss", ["introSeen", "metAma", "ashmawDown"]],
  ["hushwater", ["metMirela", "oath", "reedQ", "bell", "lettersQ", "corvinDown", "hollowmereDown", "ombrelleDown"]],
  ["emberquarry", ["brannQ", "heart", "kettleDown", "quarryBossDown", "quarryBeat"]], // kilnreach is walked through to reach the quarry
  ["undertide", ["sable2", "tideBossDown", "twist"]], // drowned is walked through to reach the undertide
  ["stair", ["sableJoin", "morvantDown", "threshold"]],
  ["husk", ["malacharDown", "malacharFade", "runeDown", "dawn"]],
];
/** Migration for old saves: backfill visited_<id> from progress flags (and the saved current area). Only ever sets flags to true. Returns how many it added. */
export function backfillVisited(f: Flags): number {
  let top = -1;
  const cur = typeof f.area === "string" ? AREA_ORDER.indexOf(f.area as string) : -1;
  if (cur >= 0 && !f[`visited_${f.area}`]) { f[`visited_${f.area}`] = true; }
  for (const [id, keys] of PROGRESS) if (keys.some((k) => !!f[k])) top = Math.max(top, AREA_ORDER.indexOf(id));
  let n = 0;
  for (let i = 0; i <= top; i++) { const k = `visited_${AREA_ORDER[i]}`; if (!f[k]) { f[k] = true; n++; } }
  return n;
}

(globalThis as unknown as { __kiAmbient?: unknown }).__kiAmbient = { AMBIENT, CODEX, visitedAreas, codexUnlocked, backfillVisited }; // W20 test hook
