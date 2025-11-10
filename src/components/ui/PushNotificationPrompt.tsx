'use client';

import { useState, useEffect } from 'react';

import { Bell, X } from 'lucide-react';

import { toast } from 'sonner';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/providers/auth-provider';
import { getVapidPublicKeySafe } from '@/config/env';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface PushNotificationPromptProps {
  /**
   * Custom className for the prompt container
   */
  className?: string;
  /**
   * Whether to show the prompt automatically
   * @default true
   */
  autoShow?: boolean;
  /**
   * Delay before showing (in milliseconds)
   * @default 3000
   */
  showDelay?: number;
  /**
   * Callback when user subscribes
   */
  onSubscribe?: () => void;
  /**
   * Callback when user dismisses
   */
  onDismiss?: () => void;
}

/**
 * Push Notification Prompt Component
 * 
 * Displays a prompt to request push notification permission
 * Only shows if:
 * - Push notifications are supported
 * - Permission is not already granted
 * - User is authenticated
 * 
 * @example
 * ```tsx
 * <PushNotificationPrompt
 *   autoShow={true}
 *   showDelay={5000}
 *   onSubscribe={() => console.log('User subscribed')}
 * />
 * ```
 */
export function PushNotificationPrompt({
  className = '',
  autoShow = true,
  showDelay = 3000,
  onSubscribe,
  onDismiss,
}: PushNotificationPromptProps) {
  const { user } = useAuth();
  const {
    permission,
    isSupported,
    isSubscribed,
    subscribe,
  } = usePushNotifications();

  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Debug: Log VAPID key availability (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const key = getVapidPublicKeySafe();
      const rawEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        console.warn(
          '⚠️ VAPID Public Key not found. Push notifications will be disabled.'
        );
        console.warn('Raw env value:', rawEnv);
        console.warn('Make sure NEXT_PUBLIC_VAPID_PUBLIC_KEY is in .env.local (no quotes) and restart the dev server.');
      } else {
        console.log('✅ VAPID Public Key is configured');
        console.log('Key length:', key.length);
        console.log('Key preview:', key.substring(0, 20) + '...');
      }
    }
  }, []);

  // Check if prompt should be shown
  useEffect(() => {
    if (!autoShow || isDismissed) {
      return;
    }

    // Don't show if:
    // - Not supported
    // - Already granted/subscribed
    // - User not authenticated
    // - Permission denied (user explicitly rejected)
    // - VAPID key not configured (push notifications won't work)
    if (
      !isSupported ||
      permission === 'granted' ||
      isSubscribed ||
      !user ||
      permission === 'denied' ||
      !getVapidPublicKeySafe()
    ) {
      setIsVisible(false);
      return;
    }

    // Check if user previously dismissed
    const dismissedKey = `pushNotificationPromptDismissed_${user.id}`;
    const lastDismissed = localStorage.getItem(dismissedKey);
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed, 10);
      // Don't show again for 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsVisible(false);
        return;
      }
    }

    // Show after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, showDelay);

    return () => clearTimeout(timer);
  }, [
    autoShow,
    isDismissed,
    isSupported,
    permission,
    isSubscribed,
    user,
    showDelay,
  ]);

  const handleSubscribe = async () => {
    if (!user) return;

    setIsSubscribing(true);
    try {
      // Access VAPID key from environment
      const vapidPublicKey = getVapidPublicKeySafe();
      if (!vapidPublicKey) {
        // This shouldn't happen if the prompt is shown (we check above),
        // but handle it gracefully just in case
        toast.error('Push notifications are not available', {
          description: 'Push notifications are not configured. Please contact support.',
        });
        setIsSubscribing(false);
        return;
      }

      // Subscribe to push notifications
      const subscription = await subscribe(vapidPublicKey);

      // Save subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(
                subscription.getKey('p256dh') as ArrayBuffer
              ),
              auth: arrayBufferToBase64(
                subscription.getKey('auth') as ArrayBuffer
              ),
            },
          },
          userId: user.id,
          userAgent: navigator.userAgent,
          deviceInfo: {
            platform: navigator.platform,
            language: navigator.language,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsVisible(false);
      onSubscribe?.();
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      // Don't hide on error - let user try again
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);

    // Remember dismissal for this user
    if (user) {
      const dismissedKey = `pushNotificationPromptDismissed_${user.id}`;
      localStorage.setItem(dismissedKey, Date.now().toString());
    }

    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 left-0 right-0 z-50 mx-auto max-w-md px-4',
        className
      )}
    >
      <div className="rounded-xl bg-white p-4 shadow-lg border border-gray-200">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-content-heading mb-1">
              Enable Notifications
            </h3>
            <p className="text-xs text-content leading-relaxed mb-3">
              Get notified about important updates, new messages, and more.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={isSubscribing}
                size="sm"
                variant="primary"
                onClick={handleSubscribe}
              >
                {isSubscribing ? 'Enabling...' : 'Enable'}
              </Button>
              <Button
                aria-label="Dismiss"
                className="px-3"
                size="sm"
                variant="secondary"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert ArrayBuffer to base64 URL-safe string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

