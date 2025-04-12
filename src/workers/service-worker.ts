/// <reference lib="webworker" />

interface FormData {
  id: string;
  url: string;
  method: string;
  headers: HeadersInit;
  body: string;
}

interface IDBDatabaseWithStore extends IDBDatabase {
  getAll: (storeName: string) => Promise<FormData[]>;
  delete: (storeName: string, key: string) => Promise<void>;
}

const CACHE_NAME = `app-cache-v${process.env.APP_VERSION || '1.0.0'}`;

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline',
        '/404',
        '/500',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - handle offline requests
self.addEventListener('fetch', (event: FetchEvent) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }

      // Clone the request because it can only be used once
      const fetchRequest = event.request.clone();

      // Try network request
      return fetch(fetchRequest).then((response) => {
        // Check if response is valid
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response because it can only be used once
        const responseToCache = response.clone();

        // Cache the response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If offline and request is for a page, return offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/offline') || new Response('Offline');
        }
      });
    })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event: Event & { tag: string }) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncForms());
  }
});

// Push notification handling
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json();
  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: data.url,
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});

// Helper function to sync forms
async function syncForms() {
  const db = await openIndexedDB();
  const forms = await db.getAll('offline-forms');

  for (const form of forms) {
    try {
      const response = await fetch(form.url, {
        method: form.method,
        headers: form.headers,
        body: form.body,
      });

      if (response.ok) {
        await db.delete('offline-forms', form.id);
      }
    } catch (error) {
      console.error('Failed to sync form:', error);
    }
  }
}

// IndexedDB helper
function openIndexedDB(): Promise<IDBDatabaseWithStore> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('offline-forms', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result as IDBDatabaseWithStore;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offline-forms')) {
        db.createObjectStore('offline-forms', { keyPath: 'id' });
      }
    };
  });
} 