// SECiD Platform Service Worker
// Provides offline functionality, caching strategies, and background sync

const CACHE_NAME = 'secid-platform-v1';
const STATIC_CACHE = 'secid-static-v1';
const DYNAMIC_CACHE = 'secid-dynamic-v1';
const API_CACHE = 'secid-api-v1';

// Assets to cache immediately when SW is installed
const PRECACHE_ASSETS = [
  '/',
  '/en/',
  '/es/',
  '/offline.html',
  '/manifest.json',
  '/assets/css/main.css',
  '/assets/js/main.js',
  '/images/logo.png',
  '/images/icon.png',
  '/images/favicon.ico',
];

// Routes that should work offline
const OFFLINE_PAGES = [
  '/en/jobs',
  '/es/empleos',
  '/en/events',
  '/es/eventos',
  '/en/members',
  '/es/miembros',
  '/en/dashboard',
  '/es/dashboard',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/jobs',
  '/api/events',
  '/api/members',
  '/api/user/profile',
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle different types of requests
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request));
  } else if (request.method === 'POST') {
    event.respondWith(handlePostRequest(request));
  }
});

// Handle GET requests with appropriate caching strategy
async function handleGetRequest(request) {
  const url = new URL(request.url);
  
  // Static assets - Cache First
  if (isStaticAsset(url.pathname)) {
    return handleCacheFirst(request, STATIC_CACHE);
  }
  
  // API requests - Network First with fallback
  if (isApiRequest(url.pathname)) {
    return handleApiRequest(request);
  }
  
  // HTML pages - Network First with offline fallback
  if (isHtmlPage(request)) {
    return handlePageRequest(request);
  }
  
  // Default strategy - Network First
  return handleNetworkFirst(request, DYNAMIC_CACHE);
}

// Handle POST requests with background sync
async function handlePostRequest(request) {
  try {
    // Try to send request immediately
    const response = await fetch(request.clone());
    
    if (response.ok) {
      return response;
    }
    
    // If request fails, queue for background sync
    await queueBackgroundSync(request);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Request queued for retry when online',
        queued: true 
      }),
      { 
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    // Network error - queue for background sync
    await queueBackgroundSync(request);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Offline - request will be retried when online',
        queued: true 
      }),
      { 
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache First strategy
async function handleCacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {});
      
      return cachedResponse;
    }
    
    // Not in cache - fetch and cache
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    // Return cached version or fallback
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return getOfflineFallback(request);
  }
}

// Network First strategy
async function handleNetworkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    // Network failed - try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return getOfflineFallback(request);
  }
}

// Handle API requests with specific caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Always try network first for API requests
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(API_CACHE);
      
      // Only cache GET requests for certain endpoints
      if (shouldCacheApiResponse(url.pathname)) {
        cache.put(request, response.clone());
      }
    }
    
    return response;
    
  } catch (error) {
    // Network failed - try cached API response
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add offline indicator to cached response
      const data = await cachedResponse.json();
      const offlineResponse = new Response(
        JSON.stringify({ ...data, _offline: true }),
        {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: cachedResponse.headers
        }
      );
      
      return offlineResponse;
    }
    
    // Return offline API response
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Offline - no cached data available',
        offline: true 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle HTML page requests
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful page responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    // Try cached version
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return getOfflinePage();
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(processQueuedRequests());
  }
});

// Queue request for background sync
async function queueBackgroundSync(request) {
  try {
    // Store request in IndexedDB for retry
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    // Open IndexedDB to store queued requests
    const db = await openDB();
    const transaction = db.transaction(['requests'], 'readwrite');
    const store = transaction.objectStore('requests');
    
    await store.add(requestData);
    
    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register('background-sync');
    }
    
  } catch (error) {
    console.error('[SW] Failed to queue request for background sync:', error);
  }
}

// Process queued requests during background sync
async function processQueuedRequests() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['requests'], 'readwrite');
    const store = transaction.objectStore('requests');
    
    const requests = await store.getAll();
    
    for (const requestData of requests) {
      try {
        const request = new Request(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        const response = await fetch(request);
        
        if (response.ok) {
          // Request succeeded - remove from queue
          await store.delete(requestData.id);
          console.log('[SW] Successfully synced queued request:', requestData.url);
        }
        
      } catch (error) {
        console.warn('[SW] Failed to sync request:', requestData.url, error);
        // Keep request in queue for next sync attempt
      }
    }
    
  } catch (error) {
    console.error('[SW] Failed to process queued requests:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/images/icon.png',
    badge: '/images/badge.png',
    data: data.data,
    actions: data.actions,
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'default'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  const action = event.action;
  
  if (action === 'view' || !action) {
    // Open the app to specific page
    const urlToOpen = data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(location.origin) && 'focus' in client) {
              client.navigate(urlToOpen);
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Utility functions
function isStaticAsset(pathname) {
  return pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isApiRequest(pathname) {
  return pathname.startsWith('/api/');
}

function isHtmlPage(request) {
  return request.headers.get('accept')?.includes('text/html');
}

function shouldCacheApiResponse(pathname) {
  const cacheableEndpoints = [
    '/api/jobs',
    '/api/events',
    '/api/members',
    '/api/user/profile'
  ];
  
  return cacheableEndpoints.some(endpoint => pathname.startsWith(endpoint));
}

async function getOfflinePage() {
  const cache = await caches.open(STATIC_CACHE);
  const offlinePage = await cache.match('/offline.html');
  
  if (offlinePage) {
    return offlinePage;
  }
  
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <title>Offline - SECiD Platform</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
               text-align: center; padding: 2rem; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; 
                    padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #333; margin-bottom: 1rem; }
        p { color: #666; line-height: 1.6; }
        .retry-btn { background: #007bff; color: white; border: none; 
                    padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>It looks like you're not connected to the internet. Some features may not be available, but you can still browse cached content.</p>
        <button class="retry-btn" onclick="location.reload()">Try Again</button>
      </div>
    </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

async function getOfflineFallback(request) {
  if (isHtmlPage(request)) {
    return getOfflinePage();
  }
  
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// IndexedDB helper for storing queued requests
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('secid-sw-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

// Log service worker events
console.log('[SW] Service Worker script loaded');

// Periodic sync for background tasks
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldCaches());
  }
});

// Clean up old cached data
async function cleanupOldCaches() {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        const dateHeader = response.headers.get('date');
        
        if (dateHeader) {
          const cacheDate = new Date(dateHeader).getTime();
          
          if (now - cacheDate > maxAge) {
            await cache.delete(request);
            console.log('[SW] Cleaned up old cache entry:', request.url);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}