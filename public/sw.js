
'use strict';

var CACHE_STATIC_NAME = 'static-v10.0.8';
var CACHE_DYNAMIC_NAME = 'dynamic-v10.0.8';

var FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/help.html',
    '/offline.html',
    '/manifest.json',
    '/src/images/icons/app-icon-192x192.png',
    '/src/images/icons/app-icon-512x512.png',
    '/src/js/app.js',
    '/src/js/idb.js',
    '/src/js/feed.js',
    '/src/css/app.css?v=13',
    '/src/css/feed.css?v=13',
    '/src/images/main-image-lg.jpg'
];

// INSTALACIÓN
self.addEventListener('install', function (event) {

    console.log('[Service Worker] Instalando...');

    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(async function (cache) {

                for (var i = 0; i < FILES_TO_CACHE.length; i++) {

                    try {
                        await cache.add(FILES_TO_CACHE[i]);

                        console.log(
                            '[Service Worker] Archivo guardado:',
                            FILES_TO_CACHE[i]
                        );

                    } catch (error) {

                        console.warn(
                            '[Service Worker] No se pudo guardar:',
                            FILES_TO_CACHE[i],
                            error
                        );
                    }
                }

                await self.skipWaiting();

                console.log(
                    '[Service Worker] Instalación completada.'
                );
            })
    );
});

// ACTIVACIÓN
self.addEventListener('activate', function (event) {

    console.log('[Service Worker] Activando...');

    event.waitUntil(
        caches.keys()
            .then(function (keys) {

                return Promise.all(
                    keys.map(function (key) {

                        if (
                            key !== CACHE_STATIC_NAME &&
                            key !== CACHE_DYNAMIC_NAME &&
                            (key.indexOf('static-') === 0 ||
                             key.indexOf('dynamic-') === 0)
                        ) {
                            return caches.delete(key);
                        }

                    })
                );
            })
            .then(function () {

                return self.clients.claim();

            })
            .then(function () {

                console.log(
                    '[Service Worker] Activo correctamente.'
                );

            })
    );
});

// INTERCEPTAR PETICIONES
self.addEventListener('fetch', function (event) {

    if (event.request.method !== 'GET') {
        return;
    }

    var requestUrl = new URL(event.request.url);

    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    event.respondWith(

        caches.match(event.request)
            .then(function (cachedResponse) {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(function (response) {

                        if (response.ok) {

                            var responseCopy = response.clone();

                            event.waitUntil(
                                caches.open(CACHE_DYNAMIC_NAME)
                                    .then(function (cache) {
                                        return cache.put(
                                            event.request,
                                            responseCopy
                                        );
                                    })
                            );
                        }

                        return response;
                    })
                    .catch(function () {

                        if (event.request.mode === 'navigate') {

                            return caches.match('/offline.html')
                                .then(function (offlinePage) {

                                    return offlinePage || new Response(
                                        'No hay conexión a internet.',
                                        {
                                            status: 503,
                                            headers: {
                                                'Content-Type': 'text/plain; charset=utf-8'
                                            }
                                        }
                                    );
                                });
                        }

                        return new Response('', {
                            status: 503,
                            statusText: 'Sin conexión'
                        });
                    });
            })
    );
});
