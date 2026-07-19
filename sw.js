const CACHE_NAME = "fleet-app-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const url of APP_SHELL) {
        const request = new Request(url, { cache: "reload" });
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (err) {}
      }
    })()
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match("./index.html");
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        return new Response("Offline", {
          status: 503,
          statusText: "Offline"
        });
      }
    })()
  );
});
