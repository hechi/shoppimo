/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: { type: string; listId: string; title: string; body: string; url: string };
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const { title, body, url, listId } = payload;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url.includes(`/list/${listId}`) && 'focused' in client && (client as WindowClient).focused) {
          return;
        }
      }

      await self.registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const notifData = event.notification.data as { url?: string } | undefined;
  const targetUrl = notifData?.url ?? '/';

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          await (client as WindowClient).focus();
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});

self.addEventListener('pushsubscriptionchange', (event: Event) => {
  const pushEvent = event as PushSubscriptionChangeEvent;
  pushEvent.waitUntil(
    (async () => {
      const subscription = pushEvent.newSubscription ?? await self.registration.pushManager.getSubscription();
      if (!subscription) return;
      const apiBase = self.location.origin;
      await fetch(`${apiBase}/api/push/resubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: subscription.toJSON().keys?.p256dh,
          auth: subscription.toJSON().keys?.auth,
        }),
      }).catch(() => undefined);
    })()
  );
});
