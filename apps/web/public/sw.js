const CACHE = 'ario-shell-v1';
const SHELL = ['/', '/offline', '/manifest.webmanifest', '/branding/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/offline').then((r) => r || caches.match('/'))),
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      if (res.ok && url.pathname.startsWith('/_next/static')) {
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'آریو', body: 'پیام تازه' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'آریو', {
      body: data.body || '',
      icon: '/branding/logo.svg',
      badge: '/branding/logo.svg',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
