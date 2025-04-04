// Setup PWA Web Push Notifications
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('ServiceWorker registration successful with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
      return null;
    }
  }
  console.warn('Service workers are not supported in this browser');
  return null;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  try {
    // Get VAPID public key
    const response = await fetch('/api/push/vapid-public-key', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }
    
    const { vapidPublicKey } = await response.json();
    
    if (!vapidPublicKey) {
      console.warn('No VAPID public key available');
      return null;
    }
    
    // Convert the vapid public key to the format expected by the browser
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
    
    // Send the subscription to the server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(subscription)
    });
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return true;
    }
    
    // Unsubscribe on the client
    const success = await subscription.unsubscribe();
    
    if (success) {
      // Unsubscribe on the server
      await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
    }
    
    return success;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if the app is installed
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Check for installability
export async function checkInstallability(): Promise<boolean> {
  if ('BeforeInstallPromptEvent' in window) {
    return true;
  }
  return false;
}

// Initialize the PWA
export async function initializePWA(): Promise<{
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
}> {
  let serviceWorkerRegistration = null;
  let notificationsEnabled = false;
  let pushEnabled = false;
  
  try {
    // Register service worker
    serviceWorkerRegistration = await registerServiceWorker();
    
    // Check notification permission
    notificationsEnabled = Notification.permission === 'granted';
    
    // Check for push subscription
    if (serviceWorkerRegistration) {
      const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
      pushEnabled = !!subscription;
    }
    
    // Check installability
    const isInstallable = await checkInstallability();
    
    // Check if already installed
    const isInstalled = isAppInstalled();
    
    return {
      serviceWorkerRegistration,
      notificationsEnabled,
      pushEnabled,
      isInstallable,
      isInstalled
    };
  } catch (error) {
    console.error('Error initializing PWA:', error);
    return {
      serviceWorkerRegistration,
      notificationsEnabled,
      pushEnabled,
      isInstallable: false,
      isInstalled: false
    };
  }
}
