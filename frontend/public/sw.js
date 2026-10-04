// Bump CACHE_NAME on every behavior change — activate purges old caches,
// including entries where a missing chunk was once cached as HTML.
const CACHE_NAME = 'msabato-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png'
];

// Never cache auth, financial, or member-data endpoints
const NEVER_CACHE = [
  '/api/auth/', '/api/settings/bulk', '/api/users',
  '/api/payments', '/api/mpesa', '/api/treasury', '/api/members',
  '/api/collections', '/api/reconciliations', '/api/obligations',
  '/api/platform', '/api/audit-logs'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Cache each URL independently — one missing file (e.g. a renamed
      // icon) must not sink the whole precache, or the offline shell
      // silently never installs.
      .then((cache) => Promise.allSettled(urlsToCache.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests for our own origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (NEVER_CACHE.some((path) => url.pathname.startsWith(path))) return;

  // Network-first for API calls so data is fresh, fall back to cache offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for built static assets (hashed filenames = safe to cache hard).
  // Only cache responses that are actually code — a misconfigured SPA fallback
  // can answer a missing chunk with text/html, and caching THAT poisons the
  // entry until the next cache bump.
  if (url.pathname.startsWith('/assets/') || /\.(js|css|png|jpe?g|svg|woff2?|ttf|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const type = response.headers.get('content-type') || '';
        const isCode = type.includes('javascript') || type.includes('css') || type.startsWith('image/') || type.includes('font');
        if (response.ok && isCode) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }))
    );
    return;
  }

  // Network-first for HTML navigation with offline fallback to cached shell.
  // Always resolve to a real Response — a failed fetch + empty cache must not
  // leave respondWith() holding undefined (that's the "network error" blank page).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/index.html'))
        .then((response) => response || caches.match('/'))
        .then((response) => response || new Response(
          '<!doctype html><title>Offline</title><h1>You are offline</h1><p>The app could not be loaded. Check your connection and retry.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        ))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => response || fetch(request))
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
