// ============================================================
// Linkmate Service Worker — Push + Notification Click
// ============================================================

self.addEventListener('install', function (event) {
  // Force the new SW to activate immediately, don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Take control of all open clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.warn('[SW] Push event received but no data.');
    event.waitUntil(
      self.registration.showNotification('Linkmate Update', {
        body: 'You have a new Linkmate update.',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: 'linkmate-empty-push',
        data: {
          url: '/dashboard',
          timestamp: new Date().toISOString(),
        },
      })
    );
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW] Failed to parse push payload as JSON:', e);
    // Fallback: show a generic notification so the push isn't silently dropped
    event.waitUntil(
      self.registration.showNotification('Linkmate Update', {
        body: event.data.text(),
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: 'linkmate-fallback',
        data: {
          url: '/dashboard',
          timestamp: new Date().toISOString(),
        },
      })
    );
    return;
  }

  const notificationData = data.data || {};
  const targetUrl = notificationData.url || data.url || '/dashboard';
  const timestamp = notificationData.timestamp || data.timestamp || new Date().toISOString();
  const tag = data.tag || data.type || 'linkmate-notification';

  console.log(`[TRACE_NOTIFICATION] service_worker_receive_event | tag=${tag} | sw_receive_timestamp=${timestamp}`);

  const options = {
    body: data.body || '',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    tag: tag,
    renotify: true,
    data: {
      ...notificationData,
      url: targetUrl,
      timestamp,
    },
    actions: data.actions || [],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Linkmate', options)
      .then(() => {
        console.log('[SW] showNotification called successfully for:', data.type);
        console.log(`[TRACE_NOTIFICATION] notification_display_event | tag=${tag}`);
      })
      .catch(async (err) => {
        console.error('[SW] showNotification failed, attempting fallback:', err);
        // Fallback for strict browsers (e.g. Safari) that might throw on renotify or actions
        const fallbackOptions = {
          body: data.body || '',
          icon: data.icon || '/android-chrome-192x192.png',
          data: { url: targetUrl, timestamp }
        };
        try {
          await self.registration.showNotification(data.title || 'Linkmate', fallbackOptions);
          console.log(`[TRACE_NOTIFICATION] notification_display_event_fallback | tag=${tag}`);
        } catch (fallbackErr) {
          console.error('[SW] Fallback showNotification also failed:', fallbackErr);
        }
      })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/dashboard';
  // Build absolute URL so client.url comparison works cross-origin
  const urlToOpen = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // BUG FIX #4: Use startsWith instead of strict equality.
        // Handles cases where the client has query params or hash appended.
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.startsWith(new URL(rawUrl, self.location.origin).origin) && 'focus' in client) {
            // Navigate the existing tab to the target URL, then focus it
            return client.navigate(urlToOpen).then((c) => c && c.focus());
          }
        }
        // No existing window found — open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
