/**
 * Push Notification Handler for Service Worker
 * 
 * This file handles push events and notification clicks.
 * It will be imported/merged with the main service worker.
 */

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'UFLOW',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default',
    data: {},
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        image: data.image,
        tag: data.tag || notificationData.tag,
        data: data.data || notificationData.data,
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        vibrate: data.vibrate || [200, 100, 200],
        silent: data.silent || false,
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      // Fall back to text if JSON parsing fails
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      vibrate: notificationData.vibrate,
      silent: notificationData.silent,
      // iOS-specific options
      ...(notificationData.data?.url && {
        // Add URL to data for click handling
        data: {
          ...notificationData.data,
          url: notificationData.data.url,
        },
      }),
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Get URL from notification data or default to home
  const urlToOpen = event.notification.data?.url || '/';

  // Handle action buttons
  if (event.action) {
    // Handle specific actions if needed
    console.log('Notification action clicked:', event.action);
    
    // You can add custom logic for different actions here
    // For example, opening a specific page based on action
    const actionUrl = event.notification.data?.actions?.[event.action]?.url;
    if (actionUrl) {
      event.waitUntil(clients.openWindow(actionUrl));
      return;
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open with this URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close (optional)
self.addEventListener('notificationclose', (event) => {
  // You can track notification dismissals here if needed
  console.log('Notification closed:', event.notification.tag);
});

