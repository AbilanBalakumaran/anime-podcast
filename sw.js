const CACHE_NAME = 'anime-podcast-v1.2.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './css/splash.css',
  './css/components.css',
  './css/responsive.css',
  './css/timeline.css',
  './js/app.js',
  './js/pwa.js',
  './js/db.js',
  './js/default-mascots.js',
  './js/mascot-manager.js',
  './js/audio-manager.js',
  './js/speech-analyzer.js',
  './js/canvas-renderer.js',
  './js/video-exporter.js',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

// Installation : mise en cache immédiate et forçage de l'activation
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn('[ServiceWorker] Échec partiel de mise en cache initiale:', err);
    })
  );
});

// Activation : suppression de tous les anciens caches et prise de contrôle immédiate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Stratégie réseau : Network-First systématique pour garantir le code le plus récent
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les schémas spéciaux (data, blob, chrome-extension)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'reload' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Pour les requêtes de navigation, renvoyer index.html si hors-ligne
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Ressource indisponible hors-ligne', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});

// Écoute de messages éventuels depuis les clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
