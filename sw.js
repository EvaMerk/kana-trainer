/* Service Worker: legt die App lokal ab, damit sie auch ohne Netz läuft
 * (U-Bahn, Flugzeug, schlechtes Handynetz). */

const CACHE = 'kana-trainer-v1';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './kana-data.js',
  './srs.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* Alte Caches aufräumen, wenn eine neue Version ausgeliefert wird */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Netz zuerst, Cache als Rückfallebene.
 *
 * Umgekehrt (Cache zuerst) wäre einen Tick schneller, aber dann liefe immer
 * die vorletzte Version — nach einem Update säßen alte und neue Dateien
 * gemischt in der App. Die paar Kilobyte hier laden schnell genug. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        // offline: aus dem Cache bedienen, für Seitenaufrufe notfalls index.html
        caches.match(e.request).then(hit =>
          hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
