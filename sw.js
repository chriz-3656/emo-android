const CACHE_NAME = "emo-andro-v27";
const APP_ASSETS = [
  "./",
  "index.html",
  "controls.html",
  "dashboard/index.html",
  "dashboard/app.js",
  "dashboard/styles.css",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-192.svg",
  "icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
        return Promise.resolve();
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate";

  if (isNavigation) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put("index.html", responseClone);
        });
        return networkResponse;
      }).catch(() => caches.match("index.html"))
    );
    return;
  }

  if (isSameOrigin) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action || "";
  let actionQuery = "";
  if (action === "sleep") {
    actionQuery = "?action=sleep";
  } else if (action === "wake") {
    actionQuery = "?action=wake";
  } else if (action === "focus") {
    actionQuery = "?action=focus";
  } else if (action === "mute-mic") {
    actionQuery = "?action=mute";
  }
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const activeClient = clientList[0];
        if (actionQuery && "navigate" in activeClient) {
          return activeClient.navigate(`./${actionQuery}`).then(() => activeClient.focus());
        }
        return activeClient.focus();
      }
      return clients.openWindow(`./${actionQuery}`);
    })
  );
});
