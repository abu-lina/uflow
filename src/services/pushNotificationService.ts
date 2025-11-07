/**
 * Push Notification Service
 * 
 * Service for sending push notifications to users
 * Provides a clean API for sending notifications from server-side code
 */

interface SendNotificationOptions {
  userIds: string | string[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  vibrate?: number[];
  url?: string;
}

interface SendNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  message?: string;
}

/**
 * Send push notification to one or more users
 * 
 * @param options - Notification options
 * @returns Promise with send result
 * 
 * @example
 * ```ts
 * await sendPushNotification({
 *   userIds: 'user-id-123',
 *   title: 'New Message',
 *   body: 'You have a new message',
 *   url: '/messages',
 * });
 * ```
 */
export async function sendPushNotification(
  options: SendNotificationOptions
): Promise<SendNotificationResult> {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds: options.userIds,
        title: options.title,
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        image: options.image,
        tag: options.tag,
        data: {
          ...options.data,
          url: options.url,
        },
        requireInteraction: options.requireInteraction,
        actions: options.actions,
        vibrate: options.vibrate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send push notification from server-side code
 * 
 * @param options - Notification options
 * @param apiUrl - Base API URL (defaults to process.env.NEXT_PUBLIC_SITE_URL)
 * @returns Promise with send result
 * 
 * @example
 * ```ts
 * // In API route or server component
 * await sendPushNotificationServer({
 *   userIds: ['user-id-1', 'user-id-2'],
 *   title: 'New Update',
 *   body: 'Check out the latest updates',
 * });
 * ```
 */
export async function sendPushNotificationServer(
  options: SendNotificationOptions,
  apiUrl?: string
): Promise<SendNotificationResult> {
  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/push/send`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds: options.userIds,
        title: options.title,
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        image: options.image,
        tag: options.tag,
        data: {
          ...options.data,
          url: options.url,
        },
        requireInteraction: options.requireInteraction,
        actions: options.actions,
        vibrate: options.vibrate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending push notification from server:', error);
    throw error;
  }
}

