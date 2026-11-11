/*
 * Sportive Hub service worker.
 *
 * Caches only the app shell (offline page, icons, manifest) and the hashed build
 * assets under /_next/static. Pages and API responses are never cached, so nothing
 * private is kept on a shared device, and signing out really signs out.
 */
const VERSION = "v2"; // bump to make every client drop its old caches
const SHELL_CACHE = `sh-shell-${VERSION}`;
const STATIC_CACHE = `sh-static-${VERSION}`;
const OFFLINE_URL = "/offline";
const SHELL = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("sh-") && key !== SHELL_CACHE && key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build assets never change, so serve them from the cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Page loads always go to the network; the offline page is the fallback.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Shell files: cache first.
  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }

  // Everything else (API calls, photos) is network only and never cached.
});

// --- Push notifications (vouchers, stamp cards, packs running low, campaigns) ---

self.addEventListener("push", (event) => {
  let data = { title: "Sportive Hub", body: "", url: "/portal/wallet", tag: "sportive-hub" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* a push without a JSON body */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/portal/wallet", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
