// Generated from the complete application content.
const CACHE = 'radio-a-03607f45f66c';
const ASSETS = ["./","./index.html","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./manifest.webmanifest","./question-images/LK0944.png","./assets/03607f45f66c/app.js","./assets/03607f45f66c/core.js","./assets/03607f45f66c/pwa.js","./assets/03607f45f66c/storage.js","./assets/03607f45f66c/styles.css","./assets/03607f45f66c/ui.js","./assets/03607f45f66c/views.js","./assets/03607f45f66c/questions.json","./assets/03607f45f66c/version.json"];
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
  // Keep recovery independent of application caches and navigation fallback.
  if (url.pathname === scope.pathname + 'force-update' || url.pathname.startsWith(scope.pathname + 'force-update/')) {
    event.respondWith(fetch(event.request, {cache: 'no-store'}));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isAppEntry = url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html';
    if (event.request.mode === 'navigate' && isAppEntry) return (await cache.match('./index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || (await caches.match(event.request)) || fetch(event.request);
  })());
});
