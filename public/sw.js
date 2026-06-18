// Service Worker para Jalapa Reporta (Caché Offline y Notificaciones Push)

const CACHE_NAME = 'jalapa-reporta-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Evento de instalación (precargar recursos indispensables)
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Evento de activación (eliminar cachés antiguas)
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia de Fetch (Manejo de peticiones offline)
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Evitar interceptar peticiones de método POST, endpoints de la API o del servidor de Supabase
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.host.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Estrategia Stale-While-Revalidate: servir desde caché y actualizar la caché en segundo plano
        fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Si no está en caché, intentar obtener de la red
      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Almacenar el recurso obtenido dinámicamente en la caché para el futuro
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(function() {
        // Fallback offline para navegación de páginas
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// 4. Captura de Notificaciones Push
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: {
          url: payload.url
        },
        vibrate: [100, 50, 100],
        actions: [
          { action: 'open', title: 'Ver Reporte' }
        ]
      };
      
      event.waitUntil(
        self.registration.showNotification(payload.title, options)
      );
    } catch (err) {
      console.error('Error al procesar datos del push:', err);
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Jalapa Reporta', {
          body: text,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png'
        })
      );
    }
  }
});

// 5. Clics de Notificaciones Push
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.indexOf(urlToOpen) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
