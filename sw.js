const CACHE_NAME = 'kinobaza-cache-v1';

// Файли, які зберігаємо в пам'ять телефону одразу при першому заході
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/404.html',
  '/manifest.json'
];

// 1. Встановлення Service Worker (завантажуємо файли в кеш)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Кешування файлів оболонки');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting(); // Змушуємо SW активуватися негайно
});

// 2. Активація (очищаємо старий кеш, якщо ви оновили версію CACHE_NAME)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Очищення старого кешу', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Беремо під контроль усі відкриті вкладки сайту
});

// 3. Перехоплення запитів (Fetch)
self.addEventListener('fetch', event => {
  // Пропускаємо POST-запити та запити до інших доменів (API TMDB, Firebase, відео-плеєри)
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Якщо файл є в кеші — віддаємо його миттєво
        if (cachedResponse) {
          return cachedResponse;
        }

        // Якщо немає — йдемо в інтернет
        return fetch(event.request).catch(() => {
          // Якщо інтернету немає і користувач намагається відкрити якусь сторінку (наприклад /movie/123)
          // Віддаємо йому закешований index.html, щоб він побачив хоча б інтерфейс сайту
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
