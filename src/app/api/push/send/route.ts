import { NextRequest, NextResponse } from 'next/server';

import * as webpush from 'web-push';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { isAdminOrModerator } from '@/lib/auth/roles';
import {
  validateNotificationTitle,
  validateNotificationBody,
  validateUserIds,
  validateNotificationUrl,
  validateNotificationTag,
  validateNotificationImageUrl,
} from '@/lib/validations/push-notifications';

// Configure web-push with VAPID keys
// These should be set in environment variables
const vapidEmail = process.env.VAPID_EMAIL || 'noreply@ummahflow.com';
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);
}

interface PushNotificationPayload {
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
}

/**
 * @swagger
 * /api/push/send:
 *   post:
 *     summary: Send push notification
 *     description: Sends push notifications to one or more users
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - title
 *               - body
 *             properties:
 *               userIds:
 *                 oneOf:
 *                   - type: string
 *                     example: "user-id-123"
 *                   - type: array
 *                     items:
 *                       type: string
 *                     example: ["user-id-1", "user-id-2"]
 *               title:
 *                 type: string
 *                 example: "New Message"
 *               body:
 *                 type: string
 *                 example: "You have a new message"
 *               icon:
 *                 type: string
 *                 example: "/icons/icon-192x192.png"
 *               badge:
 *                 type: string
 *                 example: "/icons/icon-72x72.png"
 *               image:
 *                 type: string
 *                 example: "/images/notification-image.jpg"
 *               tag:
 *                 type: string
 *                 example: "message-notification"
 *               data:
 *                 type: object
 *                 additionalProperties: true
 *                 example:
 *                   url: "/messages"
 *                   customData: "value"
 *               requireInteraction:
 *                 type: boolean
 *                 example: false
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       example: "view"
 *                     title:
 *                       type: string
 *                       example: "View"
 *                     icon:
 *                       type: string
 *                       example: "/icons/view.png"
 *               vibrate:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [200, 100, 200]
 *               url:
 *                 type: string
 *                 example: "/messages"
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sent:
 *                   type: number
 *                   example: 5
 *                 failed:
 *                   type: number
 *                   example: 0
 *                 total:
 *                   type: number
 *                   example: 5
 *                 message:
 *                   type: string
 *                   example: "Notifications sent: 5 successful, 0 failed"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields: title and body are required"
 *       500:
 *         description: Server error or VAPID keys not configured
 */
export async function POST(request: NextRequest) {
  try {
    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        {
          error: 'Push notifications are not configured. VAPID keys are missing.',
        },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get authenticated user (for authorization checks)
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to send notifications.' },
        { status: 401 }
      );
    }

    // Rate limiting
    const identifier = getClientIdentifier(request, authUser.id);
    const isAllowedMinute = rateLimiters.pushSend.perMinute(identifier);
    const isAllowedHour = rateLimiters.pushSend.perHour(identifier);

    if (!isAllowedMinute || !isAllowedHour) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60, // seconds
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      userIds: rawUserIds,
      title: rawTitle,
      body: rawNotificationBody,
      icon: rawIcon,
      badge: rawBadge,
      image: rawImage,
      tag: rawTag,
      data: rawData,
      requireInteraction,
      actions,
      vibrate,
      url: rawUrl,
    } = body;

    // Validate and sanitize inputs
    let title: string;
    let notificationBody: string;
    let userIdArray: string[];
    let icon: string | undefined;
    let badge: string | undefined;
    let image: string | undefined;
    let tag: string | undefined;
    let url: string | undefined;

    try {
      title = validateNotificationTitle(rawTitle);
      notificationBody = validateNotificationBody(rawNotificationBody);
      userIdArray = validateUserIds(rawUserIds);
      icon = validateNotificationImageUrl(rawIcon);
      badge = validateNotificationImageUrl(rawBadge);
      image = validateNotificationImageUrl(rawImage);
      tag = validateNotificationTag(rawTag);
      url = validateNotificationUrl(rawUrl);
    } catch (validationError) {
      return NextResponse.json(
        {
          error: validationError instanceof Error ? validationError.message : 'Invalid input',
        },
        { status: 400 }
      );
    }

    // F-049-05: Authorization uses DB-backed role check, not client-mutable metadata
    const isAdmin = await isAdminOrModerator(authUser.id);
    const isSelfOnly = userIdArray.every((id) => id === authUser.id);

    if (!isAdmin && !isSelfOnly) {
      return NextResponse.json(
        {
          error: 'Forbidden. You can only send notifications to yourself.',
        },
        { status: 403 }
      );
    }

    // Get push subscriptions for all target users
    // Process in batches to avoid query size limits
    const BATCH_SIZE = 100;
    const subscriptions: Array<{
      endpoint: string;
      keys: { p256dh: string; auth: string };
      user_id: string;
    }> = [];

    for (let i = 0; i < userIdArray.length; i += BATCH_SIZE) {
      const batch = userIdArray.slice(i, i + BATCH_SIZE);
      const { data: batchSubscriptions, error: fetchError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', batch);

      if (fetchError) {
        console.error('Error fetching push subscriptions:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch user subscriptions' },
          { status: 500 }
        );
      }

      if (batchSubscriptions) {
        subscriptions.push(
          ...batchSubscriptions.map((sub) => ({
            endpoint: sub.endpoint,
            keys: sub.keys as { p256dh: string; auth: string },
            user_id: sub.user_id,
          }))
        );
      }
    }

    if (subscriptions.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No active subscriptions found for the specified users',
          sent: 0,
          failed: 0,
          total: 0,
        },
        { status: 200 }
      );
    }

    // Prepare notification payload
    const payload: PushNotificationPayload = {
      title,
      body: notificationBody,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      image,
      tag: tag || 'default',
      data: {
        ...(rawData && typeof rawData === 'object' ? rawData : {}),
        url: url,
      },
      requireInteraction: requireInteraction || false,
      actions: Array.isArray(actions) ? actions : [],
      vibrate: Array.isArray(vibrate) ? vibrate : [200, 100, 200],
    };

    // Send notifications in batches to avoid overwhelming the system
    const CHUNK_SIZE = 50;
    const results: Array<{ success: boolean; endpoint: string; error?: number | string }> = [];

    for (let i = 0; i < subscriptions.length; i += CHUNK_SIZE) {
      const chunk = subscriptions.slice(i, i + CHUNK_SIZE);
      
      const chunkResults = await Promise.allSettled(
        chunk.map(async (sub) => {
          try {
            const subscription = {
              endpoint: sub.endpoint,
              keys: sub.keys,
            };

            await webpush.sendNotification(
              subscription,
              JSON.stringify(payload)
            );

            return { success: true, endpoint: sub.endpoint };
          } catch (error: unknown) {
            const webPushError = error as { statusCode?: number };
            
            // If subscription is invalid (410 Gone or 404 Not Found), remove it
            if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
              console.log(`Removing invalid subscription: ${sub.endpoint}`);
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', sub.endpoint);
            }

            return {
              success: false,
              endpoint: sub.endpoint,
              error: webPushError.statusCode || 'Unknown error',
            };
          }
        })
      );

      // Process chunk results
      chunkResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            endpoint: 'unknown',
            error: result.reason?.message || 'Unknown error',
          });
        }
      });
    }

    // Count successes and failures
    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;

    return NextResponse.json(
      {
        success: true,
        message: `Notifications sent: ${sent} successful, ${failed} failed`,
        sent,
        failed,
        total: subscriptions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

