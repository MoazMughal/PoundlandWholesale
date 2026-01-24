// Service Worker for SPA with proper asset handling
const CACHE_NAME = 'poundland-wholesale-v2' // Updated cache name to force refresh
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - handle SPA routing and assets properly
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return
  
  // Skip API requests
  if (event.request.url.includes('/api/')) return
  
  // Skip chrome-extension requests (causing the console errors)
  if (event.request.url.startsWith('chrome-extension://')) return
  
  const url = new URL(event.request.url)
  
  // Handle static assets (CSS, JS, images) - serve directly, don't cache aggressively
  if (url.pathname.startsWith('/assets/') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.png') || 
      url.pathname.endsWith('.jpg') || 
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico')) {
    
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If asset fails to load, don't serve from cache as it might be stale
          return new Response('Asset not found', { status: 404 })
        })
    )
    return
  }
  
  // Handle SPA routes - serve index.html for navigation requests
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
    
    event.respondWith(
      fetch('/index.html')
        .catch(() => {
          return caches.match('/index.html')
        })
    )
    return
  }
  
  // Default fetch behavior for other requests
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request)
      })
  )
})
