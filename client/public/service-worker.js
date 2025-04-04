
// Kanban PWA Service Worker
const CACHE_NAME = 'kanban-pwa-v1-1743784894663';
const CACHE_STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_STATIC_RESOURCES);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => {
          return name.startsWith('kanban-pwa-') && name !== CACHE_NAME;
        }).map((name) => {
          return caches.delete(name);
        })
      );
    })
  );
});

// Fetch event - respond with cached resources or fetch and cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For API requests, use network first with offline fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET responses
          if (event.request.method === 'GET' && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // If offline, try to serve from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // If no cached response and it's a GET request for a board or task,
              // return a fallback response with offline data
              if (event.request.method === 'GET') {
                if (event.request.url.includes('/api/boards')) {
                  return new Response(
                    JSON.stringify({ error: 'You are offline. Board data not available.' }),
                    { headers: { 'Content-Type': 'application/json' } }
                  );
                }
                if (event.request.url.includes('/api/tasks')) {
                  return new Response(
                    JSON.stringify({ error: 'You are offline. Task data not available.' }),
                    { headers: { 'Content-Type': 'application/json' } }
                  );
                }
              }
              
              // For other API requests, return a generic error
              return new Response(
                JSON.stringify({ error: 'You are offline. Please check your connection.' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }

  // For non-API requests, use cache first with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Cache the fetched response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // For navigation fallbacks
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          // No response in cache and network failed
          return new Response('Offline content not available');
        });
    })
  );
});

// Listen for push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data || {},
      vibrate: [100, 50, 100],
      actions: []
    };
    
    // Add actions based on notification type
    if (data.data && data.data.type === 'task-assigned') {
      options.actions = [
        {
          action: 'view',
          title: 'View Task'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ];
    } else if (data.data && data.data.type === 'board-invite') {
      options.actions = [
        {
          action: 'accept',
          title: 'Accept'
        },
        {
          action: 'decline',
          title: 'Decline'
        }
      ];
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error displaying push notification:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  let url = '/';
  const data = event.notification.data;
  
  if (data) {
    if (data.type === 'task-assigned' || data.type === 'task-due') {
      if (data.boardId && data.taskId) {
        url = `/board/${data.boardId}?task=${data.taskId}`;
      }
    } else if (data.type === 'board-invite') {
      if (data.boardId) {
        url = `/board/${data.boardId}`;
      }
    }
  }
  
  if (event.action === 'accept' && data.type === 'board-invite') {
    // For accepting board invites, we need to hit the API
    event.waitUntil(
      fetch(`/api/boards/${data.boardId}/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }).then(() => {
        return clients.openWindow(url);
      })
    );
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // If a window with that URL already exists, focus it
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  } else if (event.tag === 'sync-boards') {
    event.waitUntil(syncBoards());
  }
});

// Sync pending tasks when back online
async function syncTasks() {
  try {
    const db = await openDB();
    const pendingTasks = await db.getAll('pendingTasks');
    
    for (const task of pendingTasks) {
      try {
        const response = await fetch(task.url, {
          method: task.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(task.data)
        });
        
        if (response.ok) {
          await db.delete('pendingTasks', task.id);
        }
      } catch (error) {
        console.error('Error syncing task:', error);
      }
    }
  } catch (error) {
    console.error('Failed to sync tasks:', error);
  }
}

// Sync pending board changes when back online
async function syncBoards() {
  try {
    const db = await openDB();
    const pendingBoards = await db.getAll('pendingBoards');
    
    for (const board of pendingBoards) {
      try {
        const response = await fetch(board.url, {
          method: board.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(board.data)
        });
        
        if (response.ok) {
          await db.delete('pendingBoards', board.id);
        }
      } catch (error) {
        console.error('Error syncing board:', error);
      }
    }
  } catch (error) {
    console.error('Failed to sync boards:', error);
  }
}

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kanban-offline-db', 1);
    
    request.onerror = (event) => {
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pendingTasks')) {
        db.createObjectStore('pendingTasks', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingBoards')) {
        db.createObjectStore('pendingBoards', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
