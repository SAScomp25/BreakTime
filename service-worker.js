const CACHE_NAME = "coffee-house-final-v1";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./menu.json",
  "./manifest.json",
  "./images/logo-192.png",
  "./images/logo-512.png",
  "./images/bg.jpg",
  "./images/espresso.jpg",
  "./images/cappuccino.jpg",
  "./images/iced-latte.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
