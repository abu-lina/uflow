'use client';

/**
 * Service Worker Cleanup Utility
 * Unregisters broken service workers and clears caches
 * Runs once per session to fix network errors caused by outdated SW
 */
export async function cleanupServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    // Check if we've already cleaned up this session
    const hasCleanedUp = sessionStorage.getItem('sw-cleaned-up');
    if (hasCleanedUp) {
      return;
    }

    console.log('[SW Cleanup] Starting service worker cleanup...');

    // Get all registered service workers
    const registrations = await navigator.serviceWorker.getRegistrations();

    if (registrations.length === 0) {
      console.log('[SW Cleanup] No service workers found');
      sessionStorage.setItem('sw-cleaned-up', 'true');
      return;
    }

    console.log(`[SW Cleanup] Found ${registrations.length} service worker(s)`);

    // Unregister all service workers
    await Promise.all(
      registrations.map(async (registration) => {
        console.log('[SW Cleanup] Unregistering:', registration.active?.scriptURL);
        await registration.unregister();
      })
    );

    console.log('[SW Cleanup] All service workers unregistered');

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`[SW Cleanup] Found ${cacheNames.length} cache(s)`);

      await Promise.all(
        cacheNames.map(async (cacheName) => {
          console.log('[SW Cleanup] Deleting cache:', cacheName);
          await caches.delete(cacheName);
        })
      );

      console.log('[SW Cleanup] All caches cleared');
    }

    // Mark as cleaned up
    sessionStorage.setItem('sw-cleaned-up', 'true');

    // Reload page to apply changes (only if we actually cleaned something)
    if (registrations.length > 0) {
      console.log('[SW Cleanup] Reloading page to apply changes...');
      window.location.reload();
    }
  } catch (error) {
    console.error('[SW Cleanup] Error during cleanup:', error);
    // Don't throw - allow app to continue even if cleanup fails
  }
}
