// EDUVO Service Worker
// يسمح بتثبيت التطبيق (Add to Home Screen) وبفتح الصفحات اللي زارها الطالب قبل كده حتى بدون إنترنت.
// ملحوظة: البيانات الحيّة (data.json، المساعد الذكي، تسجيل الدخول بجوجل) لازالت تحتاج اتصال إنترنت فعلي.

const CACHE_NAME = 'eduvo-cache-v2';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './screens/auth.html',
  './screens/dashboard.html',
  './screens/subjects.html',
  './screens/subject-detail.html',
  './screens/ai.html',
  './screens/books.html',
  './screens/planner.html',
  './screens/courses.html',
  './screens/lecture.html',
  './screens/profile.html',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // لا تتدخل في طلبات API الخارجية (جوجل، الذكاء الاصطناعي، إلخ) — خليها تروح للإنترنت مباشرة
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // data.json: حاول الشبكة أولاً عشان يجيب آخر تحديث، ولو مفيش نت استخدم النسخة المخزنة
  if (request.url.includes('data.json')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // باقي الملفات: من الكاش أولاً (أسرع)، ولو مش موجودة روح للشبكة وخزّنها
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
