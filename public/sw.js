const CACHE_NAME = 'socialdl-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Poppins:wght@700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css'
];

// Instalar o Service Worker e cachear arquivos
self.addEventListener('install', (event) => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Erro ao cachear:', error);
      })
  );
  self.skipWaiting(); // Ativar imediatamente
});

// Ativar o Service Worker e limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia: Network First (tenta rede, se falhar usa cache)
self.addEventListener('fetch', (event) => {
  // Ignorar requisições para API (não cachear)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Se offline, retornar erro
          return new Response('Offline - API não disponível', { status: 503 });
        })
    );
    return;
  }

  // Para arquivos estáticos: cache first (rápido)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Servindo do cache:', event.request.url);
          return response;
        }

        return fetch(event.request).then((response) => {
          // Não cachear respostas que não sejam sucesso
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clonar a resposta
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Se tudo falhar, tentar retornar index.html
        return caches.match('/index.html');
      })
  );
});

