// Dynamic cache version - this will be updated automatically on each build
const CACHE_VERSION = 'v2025-10-12-2233'; // Will be replaced by build process
const STATIC_CACHE = `namaaz-tracker-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `namaaz-tracker-dynamic-${CACHE_VERSION}`;
const RUNTIME_CACHE = `namaaz-tracker-runtime-${CACHE_VERSION}`;

// Core files to precache
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
  // HTML: Network first (always get latest), fallback to cache
  html: 'network-first',
  // JS/CSS: Cache first (with version check)
  static: 'cache-first',
  // Images: Cache first with fallback
  images: 'cache-first',
  // API calls: Network first with cache fallback
  api: 'network-first'
};

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log(`SW installing version ${CACHE_VERSION}...`);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Precaching core resources...');
        return cache.addAll(PRECACHE_URLS);
      })
      .catch((error) => {
        console.error('Cache install failed:', error);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip cross-origin requests (unless it's Google Fonts)
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) return;

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // HTML files: Network first, cache fallback
    if (request.mode === 'navigate' || request.destination === 'document') {
      return await networkFirst(request, STATIC_CACHE);
    }
    
    // Static assets (JS, CSS with hash): Cache first
    if (url.pathname.match(/\.(js|css)$/) && url.pathname.includes('.')) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // Images: Cache first
    if (request.destination === 'image') {
      return await cacheFirst(request, DYNAMIC_CACHE);
    }
    
    // API calls to Firebase: Network first
    if (url.hostname.includes('firebase') || url.pathname.startsWith('/api')) {
      return await networkFirst(request, RUNTIME_CACHE);
    }
    
    // Fonts: Cache first
    if (url.hostname.includes('fonts.g')) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // Default: Network first
    return await networkFirst(request, RUNTIME_CACHE);
    
  } catch (error) {
    console.error('Fetch failed:', error);
    
    // Fallback for navigation requests
    if (request.mode === 'navigate') {
      const cachedResponse = await caches.match('/');
      return cachedResponse || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || Promise.reject(error);
  }
}

// Cache first strategy
async function cacheFirst(request, cacheName) {
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
    return Promise.reject(error);
  }
}

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log(`SW activating version ${CACHE_VERSION}...`);
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, RUNTIME_CACHE];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle offline prayer data sync when back online
      console.log('Background sync triggered')
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW received SKIP_WAITING message');
    self.skipWaiting();
  }
});

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('Namaaz Tracker', options)
    );
  }
});
