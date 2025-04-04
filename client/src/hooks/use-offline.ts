import { useState, useEffect } from 'react';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineMode, setOfflineMode] = useState<'unavailable' | 'ready' | 'syncing'>('unavailable');
  
  useEffect(() => {
    // Check if IndexedDB is supported
    const checkOfflineSupport = async () => {
      if (typeof indexedDB === 'undefined') {
        setOfflineMode('unavailable');
        return;
      }
      
      try {
        // Check if we can open our offline database
        const request = indexedDB.open('kanban-offline-db', 1);
        
        request.onerror = () => {
          setOfflineMode('unavailable');
        };
        
        request.onsuccess = () => {
          setOfflineMode(isOffline ? 'ready' : 'syncing');
        };
        
        request.onupgradeneeded = (event) => {
          const db = request.result;
          
          // Check if we need to create our object stores
          if (!db.objectStoreNames.contains('pendingTasks')) {
            db.createObjectStore('pendingTasks', { keyPath: 'id', autoIncrement: true });
          }
          
          if (!db.objectStoreNames.contains('pendingBoards')) {
            db.createObjectStore('pendingBoards', { keyPath: 'id', autoIncrement: true });
          }
        };
      } catch (error) {
        console.error('Error checking offline support:', error);
        setOfflineMode('unavailable');
      }
    };
    
    checkOfflineSupport();
  }, []);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setOfflineMode('syncing');
      
      // Trigger sync if service worker is available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('sync-tasks');
          registration.sync.register('sync-boards');
        });
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setOfflineMode('ready');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Function to save an operation for later syncing
  const saveOfflineOperation = async (storeName: 'pendingTasks' | 'pendingBoards', operation: any): Promise<boolean> => {
    if (offlineMode === 'unavailable') {
      return false;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('kanban-offline-db', 1);
      
      request.onerror = () => {
        reject(false);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const addRequest = store.add(operation);
        
        addRequest.onsuccess = () => {
          resolve(true);
        };
        
        addRequest.onerror = () => {
          reject(false);
        };
      };
    });
  };
  
  // Save task operation offline
  const saveTaskOperation = async (operation: {
    url: string;
    method: string;
    data: any;
  }) => {
    return saveOfflineOperation('pendingTasks', operation);
  };
  
  // Save board operation offline
  const saveBoardOperation = async (operation: {
    url: string;
    method: string;
    data: any;
  }) => {
    return saveOfflineOperation('pendingBoards', operation);
  };
  
  return {
    isOffline,
    offlineMode,
    saveTaskOperation,
    saveBoardOperation
  };
}
