// PaxFlow PWA Service Worker for Web Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Escuta o evento push enviado em segundo plano pelo sistema operacional
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = { title: 'PaxFlow', body: 'Nova notificação recebida', url: '/#inbox' };
  try {
    payload = event.data.json();
  } catch (e) {
    payload.body = event.data.text();
  }

  const options = {
    body: payload.body || 'Nova mensagem no PaxFlow',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/#inbox'
    },
    actions: [
      { action: 'open', title: 'Abrir no PaxFlow' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'PaxFlow', options)
  );
});

// Responde ao clique na notificação nativa da tela de bloqueio do celular
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/#inbox';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
