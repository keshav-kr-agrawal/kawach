// Cache version MUST change whenever this file or the caching strategy
// changes — a stale CACHE_NAME means old cached HTML/assets never get
// evicted for returning users, which was the root cause of "fixes never
// show up" (the cached index.html kept pointing at an old hashed JS
// bundle no matter how many times the site was redeployed).
const CACHE_NAME = 'sentinel-cache-v2';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-caching asset list failed:', err);
      });
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first for navigation/HTML so a returning browser always gets the
// current build's index.html (and therefore the current hashed JS bundle);
// falls back to cache only when offline. Everything else (hashed JS/CSS,
// images) is safe to try cache-first since Vite's content-hash filenames
// change whenever the content does.
self.addEventListener('fetch', (e) => {
  const isNavigation = e.request.mode === 'navigate' ||
    (e.request.method === 'GET' && e.request.headers.get('accept')?.includes('text/html'));

  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {});
    })
  );
});
