// Generated from the complete application content.
const CACHE = 'radio-a-da68d0a679b4';
const ASSETS = ["./","./index.html","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./manifest.webmanifest","./question-images/LK0944.png","./assets/da68d0a679b4/app.js","./assets/da68d0a679b4/core.js","./assets/da68d0a679b4/pwa.js","./assets/da68d0a679b4/storage.js","./assets/da68d0a679b4/styles.css","./assets/da68d0a679b4/ui.js","./assets/da68d0a679b4/views.js","./assets/da68d0a679b4/questions.json","./assets/da68d0a679b4/version.json"];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Retain the previous release for tabs that have not yet reloaded.
    const keys = (await caches.keys()).filter(key => key.startsWith('radio-a-') && key !== CACHE);
    await Promise.all(keys.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || (await caches.match(event.request)) || fetch(event.request);
  })());
});
