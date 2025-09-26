// Service Worker para la App de Medición de Alturas Forestal
// Versión: 1.0

const CACHE_NAME = 'alturas-forestal-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('SW: Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('SW: Archivos cacheados exitosamente');
                // Forzar activación inmediata
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('SW: Error durante la instalación:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('SW: Activando Service Worker...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Eliminar caches antiguos
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('SW: Service Worker activado');
            // Tomar control inmediato de todas las páginas
            return self.clients.claim();
        })
    );
});

// Interceptar requests (estrategia Cache First para archivos estáticos)
self.addEventListener('fetch', event => {
    // Solo cachear requests GET
    if (event.request.method !== 'GET') {
        return;
    }

    // No cachear requests de API de medios (getUserMedia, etc.)
    if (event.request.url.includes('mediaDevices') || 
        event.request.url.includes('blob:') ||
        event.request.url.includes('chrome-extension:')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si está en cache, devolverlo
                if (response) {
                    console.log('SW: Sirviendo desde cache:', event.request.url);
                    return response;
                }

                // Si no está en cache, hacer fetch
                console.log('SW: Fetch desde red:', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Verificar si es una respuesta válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clonar la respuesta porque es un stream
                        const responseToCache = response.clone();

                        // Agregar al cache solo recursos de la misma origin
                        if (event.request.url.startsWith(self.location.origin)) {
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                    console.log('SW: Recurso agregado al cache:', event.request.url);
                                });
                        }

                        return response;
                    })
                    .catch(error => {
                        console.error('SW: Error en fetch:', error);
                        
                        // Si es una página HTML y no hay conexión, devolver página offline
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                        
                        throw error;
                    });
            })
            .catch(error => {
                console.error('SW: Error en respuesta:', error);
            })
    );
});

// Manejar mensajes del cliente
self.addEventListener('message', event => {
    console.log('SW: Mensaje recibido:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME
        });
    }
});

// Manejar actualizaciones en background
self.addEventListener('sync', event => {
    console.log('SW: Background sync:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Aquí puedes implementar sincronización de datos
            // Por ejemplo, enviar mediciones guardadas cuando hay conexión
            console.log('SW: Ejecutando sincronización en background')
        );
    }
});

// Manejar notificaciones push (opcional para futuras implementaciones)
self.addEventListener('push', event => {
    console.log('SW: Push notification recibida:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación',
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Abrir App',
                icon: './icons/icon-96.png'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: './icons/icon-96.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Medición de Alturas', options)
    );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
    console.log('SW: Click en notificación:', event);
    
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// Logging de errores
self.addEventListener('error', event => {
    console.error('SW: Error global:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('SW: Promise rechazada:', event.reason);
});

console.log('SW: Service Worker cargado');