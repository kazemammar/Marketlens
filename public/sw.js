const CACHE_NAME = 'marketlens-v1'

// Assets to pre-cache on install
const PRE_CACHE = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = event.request.url

  // Never intercept API calls — always go to network
  if (url.includes('/api/')) return

  // For navigation requests: network-first, fall back to offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline').then((r) => r ?? new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  // For static assets (_next/static, icons, images): cache-first
  if (
    url.includes('/_next/static/') ||
    url.includes('/icons/') ||
    url.includes('/og-image') ||
    url.includes('/favicon')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Everything else: network-first, silent cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
