/* TTJ Team OS service worker — makes the installed app load instantly and
   survive flaky networks, without ever serving a stale build:
   - hashed build assets (/assets/…): cache-first (immutable by content hash)
   - the page itself + everything else same-origin: network-first, falling
     back to the last cached copy when offline
   - cross-origin (Firebase, Anthropic, fonts) is never touched. */
const CACHE = "ttj-v3"; /* bump on icon/brand changes — icon paths don't carry content hashes */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const immutable = url.pathname.includes("/assets/") || /\.(png|jpe?g|svg|woff2?)$/.test(url.pathname);
  if (immutable) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === "navigate") {
          const shell = await caches.match(new URL("./index.html", self.registration.scope).href);
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
