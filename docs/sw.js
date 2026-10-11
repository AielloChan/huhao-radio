// Generated from the complete application content.
const CACHE = 'radio-a-bb8a0a4a77fa';
const ASSETS = ["./","./index.html","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./manifest.webmanifest","./question-images/LK0944.png","./assets/bb8a0a4a77fa/app.js","./assets/bb8a0a4a77fa/core.js","./assets/bb8a0a4a77fa/pwa.js","./assets/bb8a0a4a77fa/storage.js","./assets/bb8a0a4a77fa/styles.css","./assets/bb8a0a4a77fa/ui.js","./assets/bb8a0a4a77fa/views.js","./assets/bb8a0a4a77fa/questions.json","./assets/bb8a0a4a77fa/version.json"];
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
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isAppEntry = url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html';
    if (event.request.mode === 'navigate' && isAppEntry) return (await cache.match('./index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || (await caches.match(event.request)) || fetch(event.request);
  })());
});
