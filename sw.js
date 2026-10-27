/* Gravewake service worker (install1). Generated at build time by scripts/gravewake-sw-plugin.mjs. */
const VERSION = "c13a03e3abea33cf";
const PREFIX = "kiquest-";
const CACHE = PREFIX + VERSION;
const PRECACHE = ["./","art/chars/ashmaw.json","art/chars/ashmaw.png","art/chars/bog_sprout.json","art/chars/bog_sprout.png","art/chars/brann.json","art/chars/brann.png","art/chars/cageward_nell.json","art/chars/cageward_nell.png","art/chars/cageward_vey.json","art/chars/cageward_vey.png","art/chars/corvin.json","art/chars/corvin.png","art/chars/count_aurel.json","art/chars/count_aurel.png","art/chars/duskhound.json","art/chars/duskhound.png","art/chars/fen_warden.json","art/chars/fen_warden.png","art/chars/frames.json","art/chars/gilt.json","art/chars/gilt.png","art/chars/hollowmere.json","art/chars/hollowmere.png","art/chars/hush_squire.json","art/chars/hush_squire.png","art/chars/kettle.json","art/chars/kettle.png","art/chars/malachar.json","art/chars/malachar.png","art/chars/mirela.json","art/chars/mirela.png","art/chars/morvant.json","art/chars/morvant.png","art/chars/mossback_snapper.json","art/chars/mossback_snapper.png","art/chars/mossling.json","art/chars/mossling.png","art/chars/ombrelle.json","art/chars/ombrelle.png","art/chars/reed_wraith.json","art/chars/reed_wraith.png","art/chars/refs/vesper_hexer_ref.png","art/chars/refs/vesper_squire_ref.png","art/chars/refs/warden_rune_ref.png","art/chars/refs/watch_guard_ref.png","art/chars/rook.json","art/chars/rook.png","art/chars/sable.json","art/chars/sable.png","art/chars/slag_golem.json","art/chars/slag_golem.png","art/chars/vesper_hexer.json","art/chars/vesper_hexer.png","art/chars/vesper_squire.json","art/chars/vesper_squire.png","art/chars/warden_rune.json","art/chars/warden_rune.png","art/chars/watch_guard.json","art/chars/watch_guard.png","art/chars/witchlight_newt.json","art/chars/witchlight_newt.png","art/fx/flight_takeoff_dust.json","art/fx/flight_takeoff_dust.png","art/fx/flight_trail.json","art/fx/flight_trail.png","art/fx/kiblast_charge.json","art/fx/kiblast_charge.png","art/fx/kiblast_impact.json","art/fx/kiblast_impact.png","art/fx/kiblast_projectile.json","art/fx/kiblast_projectile.png","art/fx/transform_burst.json","art/fx/transform_burst.png","assets/index-C9c5Ryyx.js","assets/index-d1YwnaLF.css","audio/CREDITS_LICENSES.md","audio/area1-theme.ogg","audio/area2-theme.ogg","audio/bark-brann-attack.ogg","audio/bark-brann-hurt.ogg","audio/bark-brann-transform.ogg","audio/bark-brann-victory.ogg","audio/bark-mirela-attack.ogg","audio/bark-mirela-hurt.ogg","audio/bark-mirela-transform.ogg","audio/bark-mirela-victory.ogg","audio/bark-rook-attack.ogg","audio/bark-rook-hurt.ogg","audio/bark-rook-transform.ogg","audio/bark-rook-victory.ogg","audio/bark-sable-attack.ogg","audio/bark-sable-hurt.ogg","audio/bark-sable-transform.ogg","audio/bark-sable-victory.ogg","audio/blast-charge.ogg","audio/blast-fire.ogg","audio/blast-impact.ogg","audio/block.ogg","audio/boss-theme.ogg","audio/boss2-theme.ogg","audio/crit-hit.ogg","audio/drowned-vesper.ogg","audio/exp-pickup.ogg","audio/finale-theme.ogg","audio/flight-land.ogg","audio/flight-loop.ogg","audio/flight-takeoff.ogg","audio/husk-theme.ogg","audio/kiblast-charge-full.ogg","audio/kiblast-charge-loop.ogg","audio/kilnreach-quarry.ogg","audio/kilnreach-theme.ogg","audio/levelup.ogg","audio/punch-heavy.ogg","audio/punch-light.ogg","audio/shield.ogg","audio/transform-powerup.ogg","audio/transform.ogg","audio/ui-cancel.ogg","audio/ui-close.ogg","audio/ui-confirm.ogg","audio/ui-equip.ogg","audio/ui-error.ogg","audio/ui-load.ogg","audio/ui-move.ogg","audio/ui-open.ogg","audio/ui-save.ogg","audio/ui-tab.ogg","icons/consumables.png","icons/gear-icons.png","icons/icon-192.png","icons/icon-512.png","icons/pickup.png","kiquest.webmanifest","qa.js"];
const PASS = new RegExp("^(api/|auth/|_serverFn|__grok/manifest)");
const scope = () => self.registration.scope;
const inScope = (url) => url.origin === self.location.origin && url.href.startsWith(scope());
const local = (url) => url.href.slice(scope().length).split("#")[0];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async (u) => {
      const url = new URL(u, scope()).href;
      try {
        const res = await fetch(new Request(url, { cache: "reload" }));
        if (res.ok) await cache.put(url, res);
      } catch (_e) { /* offline during install: the file is fetched (and kept) on first use */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function page(request) {
  const cache = await caches.open(CACHE);
  const home = new URL("./", scope()).href;
  const net = fetch(request).then(async (res) => {
    const path = local(new URL(request.url)).split("?")[0];
    if (res.ok && (path === "" || path === "index.html")) await cache.put(home, res.clone());
    return res;
  });
  try {
    // Network first, so a republished build is what opens; a dead or stalled network falls back after 4 s.
    return await Promise.race([net, new Promise((_ok, no) => setTimeout(() => no(new Error("slow")), 4000))]);
  } catch (_e) {
    const hit = (await cache.match(request, { ignoreSearch: true })) || (await cache.match(home));
    return hit || net;
  }
}

async function file(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  const path = local(new URL(request.url));
  if (res.ok && res.type === "basic" && /^(assets|art)\//.test(path)) await cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!inScope(url) || PASS.test(local(url)) || url.searchParams.has("install")) return;
  event.respondWith(request.mode === "navigate" ? page(request) : file(request));
});
