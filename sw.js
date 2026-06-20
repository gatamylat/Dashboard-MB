// ════════════════════════════════════════════════════════════
//  Service Worker · Massivburg Dashboard
//  
//  ВАЖНО ПРИ ОБНОВЛЕНИИ:
//  Меняй CACHE_VERSION при каждом деплое — старый кэш
//  автоматически сбросится у всех пользователей.
//  Формат: ‘mb-dash-YYYYMMDDHHММ’
// ════════════════════════════════════════════════════════════

const CACHE_VERSION = ‘mb-dash-202606201326’;  // ← менять при каждом деплое

const SHELL = [
‘./’,
‘./index.html’,
‘./manifest.json’,
];

// ── INSTALL: кэшируем оболочку ────────────────────────────
self.addEventListener(‘install’, event => {
console.log(’[SW] install’, CACHE_VERSION);
event.waitUntil(
caches.open(CACHE_VERSION)
.then(cache => cache.addAll(SHELL))
.then(() => self.skipWaiting())  // активируемся немедленно
);
});

// ── ACTIVATE: удаляем ВСЕ старые кэши ────────────────────
self.addEventListener(‘activate’, event => {
console.log(’[SW] activate’, CACHE_VERSION);
event.waitUntil(
caches.keys()
.then(keys => Promise.all(
keys
.filter(k => k !== CACHE_VERSION)  // всё кроме текущего — удалить
.map(k => {
console.log(’[SW] delete old cache:’, k);
return caches.delete(k);
})
))
.then(() => self.clients.claim())  // берём контроль над всеми вкладками
);
});

// ── FETCH: стратегии по типу запроса ─────────────────────
self.addEventListener(‘fetch’, event => {
const url = event.request.url;

// ① API запросы — НИКОГДА не кэшировать
if (url.includes(‘planfix.ru/rest’) || url.includes(‘api.anthropic.com’)) {
return; // браузер сам делает fetch
}

// ② Google Fonts — cache-first (шрифты стабильны)
if (url.includes(‘fonts.googleapis.com’) || url.includes(‘fonts.gstatic.com’)) {
event.respondWith(
caches.match(event.request).then(cached => {
if (cached) return cached;
return fetch(event.request).then(res => {
if (res && res.status === 200) {
const clone = res.clone();
caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
}
return res;
});
})
);
return;
}

// ③ Оболочка приложения — network-first с fallback на кэш
//    Network-first гарантирует что новый index.html загрузится сразу после деплоя
if (event.request.method !== ‘GET’) return;

event.respondWith(
fetch(event.request)
.then(res => {
// Успешный сетевой ответ — обновляем кэш
if (res && res.status === 200) {
const clone = res.clone();
caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
}
return res;
})
.catch(() => {
// Офлайн — отдаём из кэша
return caches.match(event.request)
.then(cached => cached || caches.match(’./index.html’));
})
);
});
