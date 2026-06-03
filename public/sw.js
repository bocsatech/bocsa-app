/* PWA v5 — kein HTML-Cache; Portal immer frisch */
const CACHE = "bocsa-pwa-v5";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isHtmlNavigation(request) {
  if (request.mode === "navigate") return true;
  if (request.destination === "document") return true;
  return (request.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isHtmlNavigation(event.request) || url.pathname.startsWith("/pkw/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/start").then((r) => r ?? Response.error()))
    );
    return;
  }

  event.respondWith(fetch(event.request).catch(() => Response.error()));
});
