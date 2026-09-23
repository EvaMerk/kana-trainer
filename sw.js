/* Service Worker: legt die App lokal ab, damit sie auch ohne Netz läuft
 * (U-Bahn, Flugzeug, schlechtes Handynetz). */

/* Die Zahl bei jeder Inhaltsänderung hochzählen.
 *
 * Der activate-Handler löscht alle Caches, die anders heißen als dieser hier.
 * Solange der Name gleich bleibt, findet er nichts zum Aufräumen und ein
 * einmal abgelegter Stand kann beliebig lange überleben — genau so hing die
 * alte Wortliste mit 108 Einträgen fest, während die Datei längst 140 hatte. */
const CACHE = 'kana-trainer-v11';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './kana-data.js',
  './kurs.js',
  './woerter.js',
  './vokabeln.js',
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

  // cache: 'no-cache' erzwingt eine Rückfrage beim Server. Ohne das darf der
  // Browser-Cache hier eine alte Datei liefern — dann läuft trotz "Netz
  // zuerst" veralteter Code.
  e.respondWith(
    fetch(new Request(e.request, { cache: 'no-cache' }))
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
