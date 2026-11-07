/**
 * ShopPilot PWA Service Worker (Phase F)
 * Provides offline caching, network-first strategy for live prices,
 * and offline shell fallback.
 */

const CACHE_NAME = "shoppilot-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install: pre-cache offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ShopPilot SW] Pre-caching offline shell");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ShopPilot SW] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for dynamic routes, fallback to cache, then offline.html
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip WebSocket and external analytics
  if (url.protocol === "ws:" || url.protocol === "wss:") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for shell assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith("/icons/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css"))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Offline fallback
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If navigation request fails, return offline shell
        if (event.request.mode === "navigate") {
          return caches.match(OFFLINE_URL);
        }
        return new Response("Network unavailable", { status: 503, statusText: "Service Unavailable" });
      })
  );
});
