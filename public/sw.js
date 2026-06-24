// ============================================================
// Linkmate Service Worker — Push + Notification Click
// ============================================================

async function reportTrace(traceId, eventType, metadata = {}) {
  if (!traceId) return;
  try {
    const metaString = Object.entries(metadata).map(([k,v]) => `${k}=${v}`).join(' | ');
    console.log(`[TRACE_NOTIFICATION] ${eventType} | traceId=${traceId} ${metaString ? '| ' + metaString : ''}`);
    await fetch('/api/notifications/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traceId, eventType, metadata })
    });
  } catch (err) {
    console.error('[SW] Failed to report trace:', err);
  }
}

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
  const traceId = data.traceId || notificationData.traceId || null;
  const subscriptionId = data.subscriptionId || notificationData.subscriptionId || null;

  if (traceId) {
    // NOTE: Do NOT call event.waitUntil() here.
    // All async work is merged into the single waitUntil below.
    // Having two separate waitUntil calls risks SW termination between them on mobile.
    reportTrace(traceId, 'SW_RECEIVED', { tag, subscriptionId, sw_receive_timestamp: new Date().toISOString() });
  } else {
    console.log(`[TRACE_NOTIFICATION] sw_received (legacy/no traceId) | tag=${tag}`);
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    tag: tag,
    // REMOVED: renotify: true
    // renotify:true is only valid when a prior notification with the SAME tag is
    // already visible in the notification tray. When no prior notification exists,
    // mobile browsers (Chrome Android, Samsung Internet) silently swallow the
    // showNotification() call entirely — no error, no notification. Removing this
    // lets the browser always show the notification freshly.
    data: {
      ...notificationData,
      traceId,
      subscriptionId,
      url: targetUrl,
      timestamp,
    },
    requireInteraction: false,
  };

  // CRITICAL FIX: Only ONE event.waitUntil() call.
  // Calling event.waitUntil() twice is valid per spec but on mobile (iOS Safari,
  // Android Chrome with battery optimization) the SW may be killed after the
  // FIRST promise resolves. By merging trace reporting + showNotification into a
  // single async IIFE passed to a single waitUntil(), we guarantee the SW stays
  // alive for the entire operation.
  event.waitUntil(
    (async () => {
      // Trace: received + parsed
      if (traceId) {
        await reportTrace(traceId, 'SW_RECEIVED', { tag, subscriptionId, sw_receive_timestamp: new Date().toISOString() });
        await reportTrace(traceId, 'PAYLOAD_PARSED', { tag, subscriptionId, type: data.type });
      }

      // Show notification
      if (traceId) await reportTrace(traceId, 'SHOW_NOTIFICATION_STARTED', { tag, subscriptionId });
      try {
        await self.registration.showNotification(data.title || 'Linkmate', options);
        console.log('[SW] showNotification succeeded for:', data.type);
        if (traceId) await reportTrace(traceId, 'SHOW_NOTIFICATION_SUCCESS', { tag, subscriptionId });
      } catch (err) {
        console.error('[SW] showNotification failed, attempting fallback:', err);
        if (traceId) await reportTrace(traceId, 'DISPLAY_FAILURE', { error: err.message, tag, subscriptionId });
        // Fallback: minimal options for strict browsers (e.g. Safari)
        const fallbackOptions = {
          body: data.body || '',
          icon: data.icon || '/android-chrome-192x192.png',
          data: { traceId, subscriptionId, url: targetUrl, timestamp },
        };
        try {
          await self.registration.showNotification(data.title || 'Linkmate', fallbackOptions);
          if (traceId) await reportTrace(traceId, 'SHOW_NOTIFICATION_SUCCESS', { tag, subscriptionId, fallback: true });
        } catch (fallbackErr) {
          console.error('[SW] Fallback showNotification also failed:', fallbackErr);
          if (traceId) await reportTrace(traceId, 'DISPLAY_FAILURE', { error: fallbackErr.message, fallback: true, tag, subscriptionId });
        }
      }
    })()
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/dashboard';
  const traceId = event.notification.data?.traceId || null;
  const subscriptionId = event.notification.data?.subscriptionId || null;

  if (traceId) {
    event.waitUntil(reportTrace(traceId, 'NOTIFICATION_CLICKED', { url: rawUrl, subscriptionId }));
  }

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
