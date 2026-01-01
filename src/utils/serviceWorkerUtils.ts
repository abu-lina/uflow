/**
 * Service Worker Utilities
 * 
 * Utilities for checking and waiting for service worker activation.
 * Used primarily for PWA installation flow to ensure service worker is ready
 * before prompting user to install.
 */

/**
 * Check if a service worker is currently active
 * @returns Promise<boolean> - true if service worker is registered and active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active?.state === 'activated';
  } catch (error) {
    console.error('[ServiceWorker] Error checking activation:', error);
    return false;
  }
}

/**
 * Wait for service worker to activate with timeout
 * Polls every 500ms until service worker is active or timeout is reached
 * 
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise<boolean> - true if service worker activated, false if timeout
 */
export async function waitForServiceWorkerActivation(
  timeout = 10000
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 500; // Check every 500ms
  
  while (Date.now() - startTime < timeout) {
    if (await isServiceWorkerActive()) {
      console.log('[ServiceWorker] Activation confirmed');
      return true;
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  console.warn('[ServiceWorker] Activation timeout reached');
  return false;
}

/**
 * Get service worker registration status
 * @returns Promise<'none' | 'installing' | 'waiting' | 'active'> - Current SW state
 */
export async function getServiceWorkerStatus(): Promise<'none' | 'installing' | 'waiting' | 'active'> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return 'none';
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      return 'none';
    }
    
    if (registration.installing) {
      return 'installing';
    }
    
    if (registration.waiting) {
      return 'waiting';
    }
    
    if (registration.active) {
      return 'active';
    }
    
    return 'none';
  } catch (error) {
    console.error('[ServiceWorker] Error getting status:', error);
    return 'none';
  }
}




