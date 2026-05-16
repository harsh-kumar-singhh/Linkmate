self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/logo.png', // Changed from non-existent /icon-192x192.png
        badge: '/logo.png', // Changed from non-existent /badge-72x72.png
        vibrate: [100, 50, 100],
        tag: data.type || 'linkmate-notification', // Prevent duplicates
        data: {
          url: data.url || '/',
        },
        actions: data.actions || [],
      };

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      console.error('Error parsing push data:', e);
      event.waitUntil(
        self.registration.showNotification('Linkmate Update', {
          body: event.data.text(),
          icon: '/logo.png',
          badge: '/logo.png',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  // Ensure the URL is absolute so it matches client.url properly
  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
