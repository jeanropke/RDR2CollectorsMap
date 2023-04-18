// Establish a cache name
const cacheName = 'RDO_CACHE_V1';

// Listen for fetch events
self.addEventListener('fetch', (event) => {
  // Check if the request is for an image
  if (event.request.destination === 'image') {
    // Respond to the fetch event with a cached response, if available, or a network response
    event.respondWith(caches.open(cacheName).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          // Cache the network response for future use
          cache.put(event.request, networkResponse.clone());

          return networkResponse;
        });

        return cachedResponse || fetchedResponse;
      });
    }));
  } else {
    // Do nothing if the request is not for an image
    return;
  }
});