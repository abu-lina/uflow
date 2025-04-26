/**
 * @fileoverview Service worker implementation
 * @module lib/service-worker
 */

import type {
  ExtendableEvent,
  FetchEvent,
  SyncEvent,
  PushEvent,
  NotificationEvent,
  NotificationOptions,
  IDBDatabaseWithStore,
  ServiceWorkerGlobalScope,
  Client
} from './types';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'uflow-cache-v1';
const OFFLINE_FORMS_STORE = 'offline-forms';

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/offline.html'
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

// Fetch event - handle network requests
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Sync event - handle background sync
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-offline-forms') {
    event.waitUntil(syncOfflineForms());
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event: PushEvent) => {
  const options: NotificationOptions = {
    body: event.data?.text() || 'New notification',
    icon: '/icon.png',
    badge: '/badge.png'
  };

  event.waitUntil(
    self.registration.showNotification('UFlow', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList: Client[]) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// Helper function to sync offline forms
async function syncOfflineForms(): Promise<void> {
  const db = await openIndexedDB();
  const forms = await db.getAll(OFFLINE_FORMS_STORE);

  for (const form of forms) {
    try {
      const response = await fetch(form.url, {
        method: form.method,
        headers: form.headers,
        body: form.body
      });

      if (response.ok) {
        await db.delete(OFFLINE_FORMS_STORE, form.id);
      }
    } catch (error) {
      console.error('Failed to sync form:', error);
    }
  }
}

// Helper function to open IndexedDB
function openIndexedDB(): Promise<IDBDatabaseWithStore> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('uflow-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as IDBDatabaseWithStore);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(OFFLINE_FORMS_STORE)) {
        db.createObjectStore(OFFLINE_FORMS_STORE, { keyPath: 'id' });
      }
    };
  });
} 