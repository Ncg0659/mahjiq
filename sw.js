// MAHJIQ — Service worker: oyunu çevrimdışı da açılabilir kılar.
// Yeni sürüm yayınlanınca CACHE adı değiştirilmeli (eski önbellek silinir).

const CACHE = 'mahjiq-v0.2.2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './src/main.js',
  './src/engine/board.js',
  './src/engine/game.js',
  './src/engine/generator.js',
  './src/engine/rng.js',
  './src/engine/tiles.js',
  './src/engine/layouts/turtle.js',
  './src/ui/boardView.js',
  './src/ui/faces.js',
  './assets/brand/mahjiq-logo-160.png',
  './assets/brand/mahjiq-logo-600.webp',
  './assets/bg/mahjiq-bg-menu.webp',
  './assets/bg/mahjiq-bg-game.webp',
  './assets/bg/mahjiq-bg-victory.webp',
  './assets/icons/icon-32.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Önce ağ, olmazsa önbellek: internet varken hep en güncel sürüm gelir,
// yoksa önbellekteki sürümle oyun yine açılır.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});
