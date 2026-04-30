/**
 * sw.js — Service Worker
 * Enables PWA install, offline fallback, and asset caching.
 */

const CACHE_NAME = 'vsd-v21';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/css/base.css',
  '/css/layout.css',
  '/css/forms.css',
  '/css/calendar.css',
  '/css/results.css',
  '/css/modals.css',
  '/js/state.js',
  '/js/app.js',
  '/js/data/airports.js',
  '/js/data/destinations.js',
  '/js/data/coordinates.js',
  '/js/modules/currency.js',
  '/js/modules/calendar.js',
  '/js/modules/autocomplete.js',
  '/js/modules/search.js',
  '/js/modules/empty-state.js',
  '/js/modules/cards.js',
  '/js/modules/compare.js',
  '/js/modules/weather.js',
  '/js/modules/map.js',
  '/js/modules/share.js',
  '/js/modules/flights.js',
  '/js/modules/planes.js',
  '/js/modules/i18n.js',
  '/js/modules/deals.js',
  '/js/modules/nav.js',
];

// ── Install: cache all static assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network first, cache fallback ──
self.addEventListener('fetch', event => {
  // Skip non-GET and external requests (APIs, CDN)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Update cache with fresh response
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
