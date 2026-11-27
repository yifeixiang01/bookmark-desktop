/* Pages/APIs stay on the network. Only successfully displayed favicons persist. */
const CACHE_NAME = 'bookmark-pwa-offline-v1';
const OFFLINE_URL = '/offline.html';
const ICON_CACHE = 'bookmark-favicons-v1';
const MAX_ICONS = 128;
// Cross-origin opaque responses have a high storage cost in Chromium.
const MAX_OPAQUE_ICONS = 32;
let iconWrites = Promise.resolve();

self.addEventListener('message', (event) => {
  const { type, url } = event.data || {};
  if (!['CACHE_FAVICON', 'REMOVE_FAVICON'].includes(type) || typeof url !== 'string') return;
  let target;
  try { target = new URL(url); } catch { return; }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) return;
  // A message cannot turn an API response into an image cache entry.
  if (target.origin === self.location.origin && target.pathname.startsWith('/api/')) return;
  iconWrites = iconWrites.catch(() => {}).then(async () => {
    const cache = await caches.open(ICON_CACHE);
    if (type === 'REMOVE_FAVICON') { await cache.delete(target.href); return; }
    if (await cache.match(target.href, { ignoreVary: true })) return;
    let response;
    const options = { credentials: 'omit', cache: 'force-cache', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(8000) };
    try { response = await fetch(target.href, { ...options, mode: 'cors' }); }
    catch { response = await fetch(target.href, { ...options, mode: 'no-cors' }); }
    if (!response.ok && response.type !== 'opaque') return;
    if (response.type !== 'opaque' && !response.headers.get('content-type')?.startsWith('image/')) return;
    // Bound entry count, including the expensive opaque fallback.
    const keys = await cache.keys();
    let opaque = 0;
    for (const key of keys) if ((await cache.match(key))?.type === 'opaque') opaque++;
    if (response.type === 'opaque' && opaque >= MAX_OPAQUE_ICONS) {
      for (const key of keys) {
        if ((await cache.match(key))?.type === 'opaque') { await cache.delete(key); break; }
      }
    }
    await cache.put(target.href, response);
    const updated = await cache.keys();
    for (const key of updated.slice(0, Math.max(0, updated.length - MAX_ICONS))) await cache.delete(key);
  });
  event.waitUntil(iconWrites.catch(() => { /* Quota / offline: preserve normal loading. */ }));
});

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('bookmark-pwa-offline-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && event.request.destination === 'image' &&
    !(url.origin === self.location.origin && url.pathname.startsWith('/api/'))) {
    event.respondWith(
      caches.open(ICON_CACHE).then(cache => cache.match(event.request, { ignoreVary: true })).catch(() => undefined)
        .then(cached => cached || fetch(event.request)),
    );
    return;
  }
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(async () => {
    return (await caches.match(OFFLINE_URL)) || new Response('网络不可用，请联网后重试。', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }));
});
