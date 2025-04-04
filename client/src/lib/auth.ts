import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  email: string;
  username: string;
  avatar?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

// Register a new user
export async function register(credentials: RegisterCredentials): Promise<{ user: User, defaultBoardId: number }> {
  const response = await apiRequest('POST', '/api/auth/register', credentials);
  return await response.json();
}

// Login with email and password
export async function login(credentials: LoginCredentials): Promise<{ user: User }> {
  const response = await apiRequest('POST', '/api/auth/login', credentials);
  return await response.json();
}

// Logout current user
export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
}

// Get current authenticated user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/user', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error('Failed to fetch user');
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Initialize Google authentication
export function initiateGoogleLogin(): void {
  window.location.href = '/api/auth/google';
}

// Setup for PWA
export function setupPushNotifications(): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      // Check for service worker and push manager support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return resolve(false);
      }
      
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
        return resolve(false);
      }
      
      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service worker registered');
      
      // Wait for the service worker to be active
      await navigator.serviceWorker.ready;
      
      // Check if we already have a subscription
      let subscription = await registration.pushManager.getSubscription();
      
      // If no subscription, create one
      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }
      
      // Save subscription to server
      await apiRequest('POST', '/api/push/subscribe', subscription);
      return resolve(true);
    } catch (error) {
      console.error('Error setting up push notifications:', error);
      return resolve(false);
    }
  });
}

// Helper to convert base64 to Uint8Array for VAPID key
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
