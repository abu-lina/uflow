import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     description: Saves or updates a push notification subscription for a user
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
 *               - subscription
 *             properties:
 *               subscription:
 *                 type: object
 *                 required:
 *                   - endpoint
 *                   - keys
 *                 properties:
 *                   endpoint:
 *                     type: string
 *                     example: "https://fcm.googleapis.com/fcm/send/..."
 *                   keys:
 *                     type: object
 *                     properties:
 *                       p256dh:
 *                         type: string
 *                         example: "base64-encoded-key"
 *                       auth:
 *                         type: string
 *                         example: "base64-encoded-key"
 *               userId:
 *                 type: string
 *                 description: User ID (optional, uses auth user if not provided)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               userAgent:
 *                 type: string
 *                 example: "Mozilla/5.0..."
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   platform:
 *                     type: string
 *                   language:
 *                     type: string
 *     responses:
 *       200:
 *         description: Subscription saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 subscription:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Push notifications enabled successfully"
 *       400:
 *         description: Invalid subscription data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid subscription data. Missing endpoint or keys."
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only subscribe for own account
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get authenticated user first (for rate limiting)
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to enable push notifications.' },
        { status: 401 }
      );
    }

    // Rate limiting
    const identifier = getClientIdentifier(request, authUser.id);
    const isAllowed = rateLimiters.pushSubscribe.perHour(identifier);

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 3600, // seconds
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { subscription, userId: providedUserId, userAgent, deviceInfo } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data. Missing endpoint or keys.' },
        { status: 400 }
      );
    }

    // Validate subscription keys
    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data. Missing p256dh or auth key.' },
        { status: 400 }
      );
    }

    // Use provided userId or authenticated user's ID
    const userId = providedUserId || authUser.id;

    // Verify user can only subscribe for themselves
    if (userId !== authUser.id) {
      return NextResponse.json(
        { error: 'Forbidden. You can only subscribe for your own account.' },
        { status: 403 }
      );
    }

    // Prepare subscription data
    const subscriptionData = {
      user_id: userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      user_agent: userAgent || request.headers.get('user-agent') || null,
      device_info: deviceInfo || null,
    };

    // Upsert subscription (insert or update if exists)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        subscriptionData,
        {
          onConflict: 'user_id,endpoint',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving push subscription:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        subscription: data,
        message: 'Push notifications enabled successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/push/subscribe:
 *   delete:
 *     summary: Unsubscribe from push notifications
 *     description: Removes a push notification subscription
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
 *               - endpoint
 *             properties:
 *               endpoint:
 *                 type: string
 *                 example: "https://fcm.googleapis.com/fcm/send/..."
 *     responses:
 *       200:
 *         description: Unsubscribed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Push notifications disabled successfully"
 *       400:
 *         description: Missing endpoint
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', authUser.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Error deleting push subscription:', error);
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Push notifications disabled successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

