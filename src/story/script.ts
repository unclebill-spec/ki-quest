/** Area 1–2 story script (from staging/story: world.md, cast.md, area1.md). Original names and lines only. */
export interface NpcDef { name: string; coat: string; hair: string; skin: string; trim: string; tall?: number; float?: boolean; lines: (f: Flags) => string[] }
export type Flags = Record<string, number | boolean | string>;

export const INTRO = [
  "Three hundred years ago, the sun over the Unlit Reach went dark.",
  "Nobody alive remembers daylight. The land lives by what still glows: drifting orbs, cold blue fire, giant mushrooms.",
  "Under it all, hidden Wellsprings of liquid light feed every glow in the Reach.",
  "In Wickhaven, the lamps are dimming. Rook Calder lights other people's lamps for a living.",
  "Tonight, he means to find out why.",
];

export const NPCS: Record<string, Record<string, NpcDef>> = {
  lanternmoss: {
    a: { name: "Elder Ama Quill", coat: "#5a4a7a", hair: "#d8d8e0", skin: "#c89070", trim: "#7ff0ff", lines: (f) =>
      f.metAma ? (f.wardSeen ? ["The sealed ward north of the Watch reads your Glow. Grow stronger, child.", "Past it, an updraft stone. Ride it and see where the wraiths went."]
        : ["The Lens is yours now. Point it at anything that glows and it will tell you its story.", "Follow the dimming orbs east to the Old Watch. Something there still keeps watch."])
      : ["Rook. You've noticed it too, then. The lamps are drinking less light every night.", "Take this: the Lens. My old lamp-keeper's monocle, cut from spring-crystal.", "Something is drinking a Wellspring. Find out what. And Rook, block like you mean it."] },
    o: { name: "Odile Brask", coat: "#6a4630", hair: "#a03828", skin: "#e0a078", trim: "#ffb040", lines: () =>
      ["Mushroom-iron and stubbornness. That's all gear is.", "Bring me something worth forging and I'll make you a pair of boots you won't want to take off."] },
    j: { name: "Joss Tumble", coat: "#3c6a48", hair: "#e0c060", skin: "#f0c8a0", trim: "#f07020", tall: -3, lines: () =>
      ["Potions! Gossip! Same price!", "Gossip's free today: the fen folk say vampires in red sashes are walking the boardwalks. Vampires! In this economy.", "Old Pip swears the southwest marsh lies about where the water ends. Bottom corner, past the boardwalk. Don't tell him I told you."] },
    p: { name: "Pip Arden", coat: "#8a3a4a", hair: "#4a3020", skin: "#e8b890", trim: "#60e0ff", tall: -7, lines: (f) =>
      f.orbsDone ? ["They're all home! They keep bumping into each other. It's very cute."]
      : (f.orbs as number) >= 6 ? ["You found ALL of them?! Hold still, I'm counting... six! Six!", "Here, take some of my glow. You earned it."]
      : ["My glow orbs ran away again. Six of them!", `If you see a little light that looks embarrassed, that's one of mine. (${(f.orbs as number) || 0}/6 found)`] },
  },
  hushwater: {
    f: { name: "Fen Marrow", coat: "#5a5a3a", hair: "#b0b0b0", skin: "#c08868", trim: "#c8a0ff", lines: (f) =>
      f.bellDone ? ["The bell's back on the ferry post. The fog parts when it rings. Mostly."]
      : f.bell ? ["That's my Ferry Bell! Where was it? No, don't tell me. The meadow, wasn't it.", "Here. A ferryman pays his debts, even the ferryman's grumpy cousin."]
      : ["You came on the updraft. Brave, or lost. Same thing out here.", "My Ferry Bell washed away in the last fog. South, past the meadow, I'd wager. Bring it back?"] },
    h: { name: "Tallis Reed", coat: "#2a5a6a", hair: "#202838", skin: "#d8a888", trim: "#9fe8ff", tall: -4, lines: (f) =>
      f.reedDone ? ["The meadow's quiet. First time in a month I've slept. Thank you."]
      : (f.reedN as number) >= 8 ? ["Eight of them? The meadow's quiet already. Take this, and my thanks."]
      : f.reedQ ? [`The meadow things are still prowling. ${(f.reedN as number) || 0} of 8 down.`]
      : ["Welcome to Hushwater. Mind the boardwalks; the fen takes boots.", "Something's stirring in the Sunken Meadow south of town. Quiet eight of them for me?", "The graveyard's up on the hill. The keeper there talks to people who aren't there. Nicest person in town."] },
    m: { name: "Mirela Vant", coat: "#5a3a8a", hair: "#1e1830", skin: "#e8c8b8", trim: "#c8a0ff", lines: (f) =>
      f.oath ? ["The dead are calmer since you came. So am I, a little.", "Under your Wickhaven there's a grotto. That's where the spring went. Let's go take it back."]
      : f.bellDone && f.reedDone ? ["Fen's bell is ringing and the meadow is quiet. The wraiths noticed.", "All right, lamp-lighter. Lantern Oath: I'll walk with you to the Wellspring Grotto."]
      : f.metMirela ? ["The wraiths are restless. They keep saying 'drinker'. I'd like to know who taught them that word.", "When you're ready, I'll walk with you. Mind my lantern; it bites."]
        : ["You're the lamp-lighter from Wickhaven. The wraiths told me you'd come. They also said you're loud.", "Mirela Vant. I keep this graveyard. Something drained the spring under your town, and the dead felt it here.", "We'll be travelling together soon, I think. Don't make it weird."] },
    r: { name: "Orrin Cask", coat: "#3a3a2a", hair: "#806040", skin: "#c89870", trim: "#ffb060", tall: -2, lines: () =>
      ["Ferry's closed. Bell's gone. Fog's thick. It's a whole thing.", "Fen keeps a bell for the fog. Lose it and the boats go in circles. Ask him about it."] },
  },
  kilnreach: {
    k: { name: "Brann Okoro", coat: "#5a3428", hair: "#1a1210", skin: "#8a5a3a", trim: "#ff7a2a", tall: 2, lines: (f) =>
      f.metBrann ? ["The mountain's heartbeat is skipping. Something below the quarry is drinking the embers, same as your spring.", "When you go down there, I'm coming. My hammer's been bored for weeks."]
        : ["You flew in on the updraft? Ha. Nobody uses that slab anymore.", "Brann Okoro, quarry-smith. Where I come from the stone has a heartbeat, and I keep it warm with mine.", "You're the lamp-lighter? Then we're after the same thief. Something is draining things: your water, my fire."] },
    q: { name: "Dace Holloway", coat: "#4a4a50", hair: "#c0a080", skin: "#d8a080", trim: "#ffb040", lines: () =>
      ["Quarry Road's crawling with cinder-shades since the ember-veins started dimming.", "Mind the flow. Lava only looks slow."] },
    e: { name: "Tib", coat: "#7a3a2a", hair: "#ff9a4a", skin: "#e8b890", trim: "#ffe080", tall: -7, lines: () =>
      ["Brann says if you press your ear to the rock you can hear it breathing.", "I tried. It just made my ear hot."] },
  },
};
