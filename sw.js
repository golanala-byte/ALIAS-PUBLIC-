// אליאס בדיגיטל: עבודה בלי אינטרנט.
// דף האפליקציה נטען מהרשת כשיש חיבור (כדי שעדכונים ייכנסו מיד),
// ונופל לעותק השמור אחרי 2.5 שניות או כשאין רשת. שאר הקבצים מהזיכרון.
const CACHE = "alias-v2";
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

function timeout(ms) { return new Promise(r => setTimeout(() => r(null), ms)); }

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return; // Firebase וכו' עוברים ישר לרשת

  if (req.mode === "navigate") {           // דף האפליקציה: רשת קודם, ואז הזיכרון
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const net = fetch(req).then(res => { if (res && res.ok) cache.put("./index.html", res.clone()); return res; }).catch(() => null);
      const fresh = await Promise.race([net, timeout(2500)]);
      if (fresh) return fresh;
      const hit = await cache.match("./index.html", { ignoreSearch: true });
      return hit || net || new Response("אין חיבור לאינטרנט", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    })());
    return;
  }

  e.respondWith(caches.open(CACHE).then(async cache => {   // שאר הקבצים: זיכרון קודם
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || new Response("", { status: 503 });
  }));
});
