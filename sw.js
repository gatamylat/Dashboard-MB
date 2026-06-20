// ╔══════════════════════════════════════════════════════════╗
// ║  Service Worker · Massivburg Dashboard v2               ║
// ║  Стратегия: Cache-first для оболочки,                   ║
// ║             Network-only для Planfix API и Claude API   ║
// ╚══════════════════════════════════════════════════════════╝

const CACHE_NAME = ‘mb-dash-v2’;

const SHELL_FILES = [
‘./’,
‘./index.html’,
‘./manifest.json’,
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener(‘install’, event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => cache.addAll(SHELL_FILES))
.then(() => self.skipWaiting())
);
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener(‘activate’, event => {
event.waitUntil(
caches.keys()
.then(names => Promise.all(
names
.filter(n => n !== CACHE_NAME)
.map(n => caches.delete(n))
))
.then(() => self.clients.claim())
);
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener(‘fetch’, event => {
const url = event.request.url;

// ① Planfix API и Claude API — всегда сеть, никогда кэш
if (url.includes(‘planfix.ru/rest’) || url.includes(‘api.anthropic.com’)) {
return;
}

// ② Google Fonts — cache-first
if (url.includes(‘fonts.googleapis.com’) || url.includes(‘fonts.gstatic.com’)) {
event.respondWith(
caches.match(event.request).then(cached => {
if (cached) return cached;
return fetch(event.request).then(res => {
const clone = res.clone();
caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
return res;
});
})
);
return;
}

// ③ Оболочка приложения — cache-first, фоновое обновление
if (event.request.method !== ‘GET’) return;

event.respondWith(
caches.match(event.request).then(cached => {
const networkFetch = fetch(event.request).then(res => {
if (res && res.status === 200) {
const clone = res.clone();
caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
}
return res;
}).catch(() => null);

```
  return cached || networkFetch || caches.match('./index.html');
})
```

);
});