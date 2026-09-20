// אליאס בדיגיטל: עבודה בלי אינטרנט.
// פותחים מהזיכרון מיד, ומעדכנים ברקע כשיש רשת. גרסה חדשה מופיעה בפתיחה הבאה.
const CACHE = "alias-v1";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-maskable.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return; // Firebase וכו' עוברים ישר לרשת
  const key = req.mode === "navigate" ? "./index.html" : req;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req)
      .then(res => { if (res && res.ok) cache.put(key, res.clone()); return res; })
      .catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || new Response("אין חיבור לאינטרנט", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
