/**
 * Advanced Service Worker for Data Parse Desk 2.0
 * Features:
 * - Background Sync for failed requests
 * - Push Notifications
 * - Advanced caching strategies
 * - Periodic Background Sync
 * - Share Target API
 */

const CACHE_VERSION = 'v2.0.0';
const CACHE_NAMES = {
  STATIC: `static-${CACHE_VERSION}`,
  DYNAMIC: `dynamic-${CACHE_VERSION}`,
  API: `api-${CACHE_VERSION}`,
  IMAGES: `images-${CACHE_VERSION}`,
};

const OFFLINE_PAGE = '/offline.html';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
];

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing advanced service worker...');

  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC).then((cache) => {
      console.log('[SW] Precaching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating advanced service worker...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const validCacheNames = Object.values(CACHE_NAMES);

      await Promise.all(
        cacheNames.map((cacheName) => {
          if (!validCacheNames.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      // Enable navigation preload if available
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
        console.log('[SW] Navigation preload enabled');
      }

      // Claim all clients
      await self.clients.claim();
      console.log('[SW] Service worker activated and claimed clients');
    })()
  );
});

// ============================================================================
// FETCH EVENT - Advanced Caching Strategies
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network First with Background Sync fallback
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Static assets - Cache First
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // HTML pages - Network First with offline fallback
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }

  // Default - Network First
  event.respondWith(handleDefaultRequest(request));
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Network First strategy for API requests
 * Falls back to cache if offline, queues for background sync if failed
 */
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.API);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] API request failed, trying cache:', request.url);

    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Queue for background sync if it's a mutation request
    if (request.method !== 'GET') {
      await queueRequestForBackgroundSync(request);
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Request queued for background sync',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Cache First strategy for static assets
 */
async function handleStaticAsset(request) {
  const cacheName =
    request.destination === 'image' ? CACHE_NAMES.IMAGES : CACHE_NAMES.STATIC;

  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return placeholder if available
    if (request.destination === 'image') {
      return caches.match('/placeholder.svg');
    }
    throw error;
  }
}

/**
 * Network First strategy for HTML documents
 */
async function handleDocumentRequest(request) {
  try {
    // Try navigation preload first
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) {
      return preloadResponse;
    }

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Document request failed, trying cache or offline page');

    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    return caches.match(OFFLINE_PAGE);
  }
}

/**
 * Default Network First strategy
 */
async function handleDefaultRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

/**
 * Queue failed requests for background sync
 */
async function queueRequestForBackgroundSync(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.clone().text(),
      timestamp: Date.now(),
    };

    // Store in IndexedDB
    const db = await openSyncDB();
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    await store.add(requestData);

    console.log('[SW] Request queued for background sync:', request.url);

    // Register background sync
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-requests');
      console.log('[SW] Background sync registered');
    }
  } catch (error) {
    console.error('[SW] Failed to queue request for background sync:', error);
  }
}

/**
 * Handle background sync event
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-requests') {
    event.waitUntil(syncQueuedRequests());
  }
});

/**
 * Sync all queued requests
 */
async function syncQueuedRequests() {
  try {
    const db = await openSyncDB();
    const transaction = db.transaction(['sync-queue'], 'readonly');
    const store = transaction.objectStore('sync-queue');
    const requests = await store.getAll();

    console.log(`[SW] Syncing ${requests.length} queued requests`);

    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body || undefined,
        });

        if (response.ok) {
          // Remove from queue
          const deleteTransaction = db.transaction(['sync-queue'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('sync-queue');
          await deleteStore.delete(requestData.id);
          console.log('[SW] Successfully synced request:', requestData.url);

          // Notify clients
          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              url: requestData.url,
            });
          });
        }
      } catch (error) {
        console.error('[SW] Failed to sync request:', requestData.url, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Open IndexedDB for sync queue
 */
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ServiceWorkerSync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        const store = db.createObjectStore('sync-queue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'Data Parse Desk',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'default',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions || [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Close' },
      ],
    })
  );
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: 'window' });

        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return clients.openWindow(url);
        }
      })()
    );
  }
});

// ============================================================================
// PERIODIC BACKGROUND SYNC
// ============================================================================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(performPeriodicSync());
  }
});

/**
 * Perform periodic data sync
 */
async function performPeriodicSync() {
  try {
    console.log('[SW] Performing periodic sync...');

    // Sync pending changes
    await syncQueuedRequests();

    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'PERIODIC_SYNC_COMPLETE',
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log('[SW] All caches cleared');
      })()
    );
  }

  if (event.data.type === 'PREFETCH_URLS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAMES.DYNAMIC);
        await cache.addAll(event.data.urls || []);
        console.log('[SW] URLs prefetched');
      })()
    );
  }
});

// ============================================================================
// SHARE TARGET API
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle share target
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const title = formData.get('title');
        const text = formData.get('text');
        const url = formData.get('url');

        // Store shared data
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'SHARE_TARGET',
            data: { title, text, url },
          });
        });

        // Redirect to app
        return Response.redirect('/', 303);
      })()
    );
  }
});

console.log('[SW] Advanced Service Worker loaded');
