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
        icon: '/logo.png',
        badge: '/badge-72x72.png',
        tag: 'linkmate-fallback',
      })
    );
    return;
  }

  // BUG FIX #2: badge must be a small monochrome icon, NOT the full logo.
  // Make sure /badge-72x72.png exists in your /public folder.
  // It should be a 72x72 white-on-transparent monochrome version of your logo.
  const options = {
    body: data.body || '',
    icon: '/logo.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    // tag: prevents duplicate notifications for the same type.
    // If you want one notification per post, use the postId in the tag.
    tag: data.tag || data.type || 'linkmate-notification',
    // renotify: true means even if tag already exists, re-vibrate/re-alert
    renotify: true,
    data: {
      url: data.url || '/dashboard',
    },
    // actions are only shown on some platforms (Android Chrome, not iOS Safari)
    actions: data.actions || [],
    // requireInteraction: keeps notification visible until user taps (Android)
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Linkmate', options)
      .then(() => {
        console.log('[SW] showNotification called successfully for:', data.type);
      })
      .catch((err) => {
        console.error('[SW] showNotification failed:', err);
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