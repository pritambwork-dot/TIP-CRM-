/**
 * TIP CRM - Static Application Shell Service Worker
 *
 * Performance and Offline Resilience Rules:
 * 1. Caches static assets (HTML, JS, CSS, SVG, fonts, manifest) for offline boot.
 * 2. STRICT SECURITY EXCLUSION: NEVER caches private / authenticated /api/* requests.
 * 3. STRICT SECURITY EXCLUSION: NEVER caches Supabase API/Auth network requests.
 * 4. All non-GET requests bypass the service worker cache entirely (Network-Only).
 */

const CACHE_NAME = 'tip-crm-shell-v1';

const STATIC_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/tip-emblem.svg',
  '/tip-logo.svg'
];

/**
 * Pure evaluation function to determine if a request may be cached.
 * Exported to global scope for automated security & regression testing.
 */
function isCacheableRequest(urlStr, method = 'GET') {
  if (method !== 'GET') {
    return false;
  }

  // Reject non-http(s) schemes (e.g. chrome-extension://)
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    return false;
  }

  try {
    const url = new URL(urlStr);

    // SECURITY: Disallow all internal API endpoints (/api/*)
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      return false;
    }

    // SECURITY: Disallow all Supabase requests
    if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Expose on globalThis for testing environments
if (typeof self !== 'undefined') {
  (self).isCacheableRequest = isCacheableRequest;
}

// Install Event: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE_URLS).catch(() => {
        // Individual missing asset during dev shouldn't abort SW installation
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up stale legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-First for navigation, Cache-First for static assets, Network-Only for API
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Rule 1: Non-cacheable (APIs, Supabase, POST/PUT/DELETE) -> Network Only
  if (!isCacheableRequest(url, request.method)) {
    return;
  }

  // Rule 2: HTML Page Navigation -> Network First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Rule 3: Static Assets (JS, CSS, Images, Fonts) -> Cache First with Network Fallback & Update
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Asynchronously update cache in the background (stale-while-revalidate)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
