// Service worker mínimo: permite instalar Wakas: Monster como app (Android: "Añadir a pantalla de inicio").
// No guarda nada en caché: el juego siempre se descarga del servidor (es multijugador en línea).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
