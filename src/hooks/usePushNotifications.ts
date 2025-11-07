'use client';

import { useState, useEffect, useCallback } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface UsePushNotificationsReturn {
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  isSupported: boolean;
  isSubscribed: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: (vapidPublicKey: string) => Promise<PushSubscription>;
  unsubscribe: () => Promise<void>;
  getSubscription: () => Promise<PushSubscription | null>;
}

/**
 * Hook for managing push notifications in PWA
 * 
 * Features:
 * - Checks browser support for push notifications
 * - Manages notification permission state
 * - Handles subscription/unsubscription
 * - Provides subscription status
 * 
 * @example
 * ```tsx
 * const { permission, subscribe, isSupported } = usePushNotifications();
 * 
 * const handleSubscribe = async () => {
 *   const subscription = await subscribe(VAPID_PUBLIC_KEY);
 *   // Send subscription to backend
 * };
 * ```
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Check support and get initial state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission as NotificationPermission);

        // Get existing subscription
        navigator.serviceWorker.ready
          .then((registration) => {
            return registration.pushManager.getSubscription();
          })
          .then((sub) => {
            setSubscription(sub);
          })
          .catch((error) => {
            console.error('Error getting push subscription:', error);
          });
      }
    };

    checkSupport();

    // Listen for permission changes
    if ('Notification' in window) {
      // Note: There's no direct event for permission changes,
      // but we can check periodically or on focus
      const handleFocus = () => {
        if (Notification.permission !== permission) {
          setPermission(Notification.permission as NotificationPermission);
        }
      };

      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [permission]);

  /**
   * Request notification permission from the user
   * Must be called from a user gesture (button click, etc.)
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      setPermission('denied');
      throw new Error('Notification permission was previously denied. Please enable it in browser settings.');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result as NotificationPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }, [isSupported]);

  /**
   * Subscribe to push notifications
   * Requires notification permission to be granted
   */
  const subscribe = useCallback(
    async (vapidPublicKey: string): Promise<PushSubscription> => {
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      // Ensure permission is granted
      let currentPermission = Notification.permission;
      if (currentPermission !== 'granted') {
        currentPermission = await requestPermission();
        if (currentPermission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }

      try {
        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          setSubscription(existingSubscription);
          return existingSubscription;
        }

        // Convert VAPID key to Uint8Array
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push service
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true, // Required for all browsers
          applicationServerKey,
        });

        setSubscription(newSubscription);
        return newSubscription;
      } catch (error) {
        console.error('Error subscribing to push notifications:', error);
        throw error;
      }
    },
    [isSupported, requestPermission]
  );

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!subscription) {
      return;
    }

    try {
      const success = await subscription.unsubscribe();
      if (success) {
        setSubscription(null);
      } else {
        console.warn('Failed to unsubscribe from push notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }, [subscription]);

  /**
   * Get current subscription without subscribing
   */
  const getSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (!isSupported) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      return sub;
    } catch (error) {
      console.error('Error getting push subscription:', error);
      return null;
    }
  }, [isSupported]);

  return {
    permission,
    subscription,
    isSupported,
    isSubscribed: subscription !== null,
    requestPermission,
    subscribe,
    unsubscribe,
    getSubscription,
  };
}

/**
 * Convert VAPID public key from base64 URL-safe format to Uint8Array
 * Required for Web Push API
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Decode base64
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  // Convert to Uint8Array
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}


