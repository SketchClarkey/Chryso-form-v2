// Service Worker for Chryso Forms PWA
const CACHE_NAME = 'chryso-forms-v2';
const API_CACHE_NAME = 'chryso-forms-api-v2';
const STATIC_CACHE_NAME = 'chryso-forms-static-v2';
const IMAGES_CACHE_NAME = 'chryso-forms-images-v2';
const MOBILE_CACHE_NAME = 'chryso-forms-mobile-v2';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  // Icons for PWA
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Mobile-specific assets
  '/mobile-fallback.html',
  // Add other static assets
];

// Mobile-optimized assets (smaller versions)
const MOBILE_ASSETS = [
  '/mobile/icons/icon-72x72.png',
  '/mobile/icons/icon-96x96.png',
  '/mobile/icons/icon-128x128.png',
];

// Image optimization patterns
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
const isImageRequest = url => {
  return IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().includes(ext));
};

// Check if device is mobile
const isMobileUserAgent = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    self.navigator.userAgent
  );
};

// API endpoints to cache
const API_ENDPOINTS = ['/api/auth/me', '/api/forms', '/api/worksites', '/api/templates'];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        const currentCaches = [
          CACHE_NAME,
          API_CACHE_NAME,
          STATIC_CACHE_NAME,
          IMAGES_CACHE_NAME,
          MOBILE_CACHE_NAME,
        ];

        return Promise.all(
          cacheNames.map(cacheName => {
            if (!currentCaches.includes(cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  const isMobile = isMobileUserAgent();

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Handle image requests with mobile optimization
  else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request, isMobile));
  }
  // Handle static assets
  else if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(handleStaticRequest(request));
  }
  // Handle navigation requests
  else if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request, isMobile));
  }
  // Default: network first with offline fallback
  else {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});

// Handle API requests with cache-first or network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cache = await caches.open(API_CACHE_NAME);

  // GET requests - cache first for better offline experience
  if (request.method === 'GET') {
    // Check if it's a read-only endpoint that can be cached
    const cachableEndpoints = ['/api/forms', '/api/templates', '/api/worksites', '/api/auth/me'];
    const isCachable = cachableEndpoints.some(endpoint => url.pathname.startsWith(endpoint));

    if (isCachable) {
      try {
        // Try network first for fresh data
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          // Clone and cache the response
          cache.put(request, networkResponse.clone());
          return networkResponse;
        }
      } catch (error) {
        console.log('Service Worker: Network failed, trying cache');
      }

      // Fallback to cache
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
  }

  // POST/PUT/DELETE requests - network only with offline handling
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Store failed requests for later sync
    if (request.method !== 'GET') {
      await storeFailedRequest(request);
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Request failed - saved for offline sync',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Try network and cache
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return fallback for critical assets
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Handle navigation requests (SPA routing) with mobile optimization
async function handleNavigationRequest(request, isMobile = false) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fallback to appropriate cached page
    const cache = await caches.open(STATIC_CACHE_NAME);

    // Try mobile-specific fallback first if mobile
    if (isMobile) {
      const mobileFallback = await cache.match('/mobile-fallback.html');
      if (mobileFallback) return mobileFallback;
    }

    // Fallback to main index
    const cachedIndex = await cache.match('/');
    return cachedIndex || new Response('Offline page not available', { status: 404 });
  }
}

// Handle image requests with mobile optimization
async function handleImageRequest(request, isMobile = false) {
  const cache = await caches.open(IMAGES_CACHE_NAME);

  // Try cache first for images
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // For mobile devices, only cache smaller images to save space
      if (isMobile) {
        const contentLength = networkResponse.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 500000) {
          // > 500KB
          console.log('Skipping cache for large image on mobile:', request.url);
          return networkResponse;
        }
      }

      // Cache the response
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    return networkResponse;
  } catch (error) {
    // Return placeholder for failed image loads
    return new Response('Image not available offline', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Store failed requests for background sync
async function storeFailedRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now(),
    };

    // Store in IndexedDB for later sync
    const db = await openDB();
    const transaction = db.transaction(['pendingRequests'], 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    await store.add(requestData);

    console.log('Service Worker: Stored failed request for sync:', request.url);
  } catch (error) {
    console.error('Service Worker: Failed to store request:', error);
  }
}

// Open IndexedDB for offline data storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChrysoPWADB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      // Create object stores
      if (!db.objectStoreNames.contains('pendingRequests')) {
        const store = db.createObjectStore('pendingRequests', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains('offlineData')) {
        const store = db.createObjectStore('offlineData', {
          keyPath: 'key',
        });
        store.createIndex('type', 'type');
        store.createIndex('lastUpdated', 'lastUpdated');
      }
    };
  });
}

// Background sync event
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered:', event.tag);

  if (event.tag === 'chryso-forms-sync') {
    event.waitUntil(syncPendingRequests());
  }
});

// Sync pending requests when online
async function syncPendingRequests() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingRequests'], 'readonly');
    const store = transaction.objectStore('pendingRequests');
    const requests = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`Service Worker: Syncing ${requests.length} pending requests`);

    for (const requestData of requests) {
      try {
        // Reconstruct the request
        const request = new Request(requestData.url, {
          method: requestData.method,
          headers: new Headers(requestData.headers),
          body: requestData.body,
        });

        // Try to send the request
        const response = await fetch(request);

        if (response.ok) {
          // Remove from pending requests
          const deleteTransaction = db.transaction(['pendingRequests'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('pendingRequests');
          await new Promise((resolve, reject) => {
            const deleteRequest = deleteStore.delete(requestData.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });

          console.log('Service Worker: Synced request:', requestData.url);

          // Notify the main thread
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                url: requestData.url,
                method: requestData.method,
              });
            });
          });
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync request:', requestData.url, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Push notification event
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2',
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icon-192x192.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification('Chryso Forms', options));
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(clients.openWindow('/'));
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ cacheSize: size });
    });
  }
});

// Get cache size for monitoring
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}
