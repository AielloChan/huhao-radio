// Generated from the complete application content.
const CACHE = 'radio-a-7cc91ca1da82';
const ASSETS = ["./","./index.html","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./manifest.webmanifest","./question-images/LK0497.png","./question-images/LK0498.png","./question-images/LK0499.png","./question-images/LK0500.png","./question-images/LK0501.png","./question-images/LK0502.png","./question-images/LK0503.png","./question-images/LK0504.png","./question-images/LK0505.png","./question-images/LK0506.png","./question-images/LK0507.png","./question-images/LK0508.png","./question-images/LK0509.png","./question-images/LK0510.png","./question-images/LK0511.png","./question-images/LK0594.png","./question-images/LK0595.png","./question-images/LK0596.png","./question-images/LK0597.png","./question-images/LK0598.png","./question-images/LK0599.png","./question-images/LK0600.png","./question-images/LK0601.png","./question-images/LK0602.png","./question-images/LK0603.png","./question-images/LK0604.png","./question-images/LK0605.png","./question-images/LK0606.png","./question-images/LK0607.png","./question-images/LK0608.png","./question-images/LK0609.png","./question-images/LK0610.png","./question-images/LK0611.png","./question-images/LK0612.png","./question-images/LK0613.png","./question-images/LK0614.png","./question-images/LK0734.png","./question-images/LK0735.png","./question-images/LK0736.png","./question-images/LK0740.png","./question-images/LK0741.png","./question-images/LK0742.png","./question-images/LK0743.png","./question-images/LK0744.png","./question-images/LK0745.png","./question-images/LK0927.png","./question-images/LK0928.png","./question-images/LK0938.png","./question-images/LK0941.png","./question-images/LK0942.png","./question-images/LK0943.png","./question-images/LK0944.png","./question-images/LK0945.png","./assets/7cc91ca1da82/app.js","./assets/7cc91ca1da82/catalog.js","./assets/7cc91ca1da82/core.js","./assets/7cc91ca1da82/pwa.js","./assets/7cc91ca1da82/site-info.js","./assets/7cc91ca1da82/storage.js","./assets/7cc91ca1da82/styles.css","./assets/7cc91ca1da82/ui.js","./assets/7cc91ca1da82/views.js","./assets/7cc91ca1da82/questions.json","./assets/7cc91ca1da82/questions-b.json","./assets/7cc91ca1da82/questions-c.json","./assets/7cc91ca1da82/version.json","./assets/7cc91ca1da82/apple-touch-icon.png"];
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
