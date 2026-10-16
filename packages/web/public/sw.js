/**
 * TILO Service Worker
 *
 * Security (Docs/ENGINEERING-RULES.md F4): API responses are private, per-user data and
 * are NEVER cached here — /api/* and /socket.io/* always go straight to the network.
 * Offline POS works from the app's own storage (sync queue, cached shift), not from here.
 *
 * Strategies:
 * - Cache-first for static assets (Vite emits content-hashed file names)
 * - Network-first for navigations, falling back to the cached app shell (index.html)
 */

// Bump on every release that changes caching behaviour; old caches are deleted on activate.
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `tilopos-static-${CACHE_VERSION}`;
const SHELL_URL = '/index.html';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [SHELL_URL, '/manifest.json', OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  // Do not skipWaiting automatically: the app asks the user and posts SKIP_WAITING.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== STATIC_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Private data: never cache, never serve from cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503, headers: { 'X-Tilo-Offline': '1' } });
  }
}

/** Network-first; only the app shell (index.html) is cached, never per-URL pages */
async function navigationHandler(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    const contentType = response.headers.get('Content-Type') || '';
    if (response.ok && contentType.includes('text/html')) {
      cache.put(SHELL_URL, response.clone());
    }
    return response;
  } catch {
    const shell = await cache.match(SHELL_URL);
    if (shell) return shell;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response('Offline', { status: 503, headers: { 'X-Tilo-Offline': '1' } });
  }
}

function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp',
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Sent on logout: drop everything except the static cache
  if (event.data.type === 'CLEAR_PRIVATE_CACHES') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.filter((n) => n !== STATIC_CACHE).map((n) => caches.delete(n)))),
    );
  }
});
