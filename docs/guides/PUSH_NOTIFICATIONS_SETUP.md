# Push Notifications Setup Guide

This guide explains how to set up and use push notifications for the PWA on both iOS and Android devices.

## Overview

Push notifications allow the app to send notifications to users even when the app is not open. This implementation supports:
- ✅ **iOS 16.4+** (Safari and PWAs)
- ✅ **Android** (Chrome/Edge)
- ✅ Multiple devices per user
- ✅ Automatic cleanup of invalid subscriptions

## Prerequisites

1. **HTTPS Required**: Push notifications only work over HTTPS (or localhost for development)
2. **Service Worker**: Already configured via `next-pwa`
3. **VAPID Keys**: Required for authentication with push services

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are used to authenticate your server with push services.

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: <your-public-key>
Private Key: <your-private-key>
```

## Step 2: Configure Environment Variables

Add the VAPID keys to your `.env.local` file:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=your-email@example.com
```

**Important:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is exposed to the client (safe to expose)
- `VAPID_PRIVATE_KEY` is server-only (keep secret!)
- `VAPID_EMAIL` is used as the contact email for push services

## Step 3: Run Database Migration

Apply the push subscriptions migration:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase dashboard
# Run: supabase/migrations/010_create_push_subscriptions.sql
```

This creates the `push_subscriptions` table with:
- User subscriptions
- Endpoint and encryption keys
- Device information
- RLS policies for security

## Step 4: Add Push Notification Prompt

Add the `PushNotificationPrompt` component to your layout or a key page:

```tsx
import { PushNotificationPrompt } from '@/components/ui';

export default function MyPage() {
  return (
    <>
      {/* Your page content */}
      <PushNotificationPrompt 
        autoShow={true}
        showDelay={3000}
        onSubscribe={() => console.log('User subscribed')}
      />
    </>
  );
}
```

## Step 5: Send Notifications

### From Client-Side Code

```tsx
import { sendPushNotification } from '@/services/pushNotificationService';

// Send to single user
await sendPushNotification({
  userIds: 'user-id-123',
  title: 'New Message',
  body: 'You have a new message',
  url: '/messages',
});

// Send to multiple users
await sendPushNotification({
  userIds: ['user-id-1', 'user-id-2'],
  title: 'New Update',
  body: 'Check out the latest updates',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-72x72.png',
});
```

### From Server-Side Code (API Routes)

```tsx
import { sendPushNotificationServer } from '@/services/pushNotificationService';

// In an API route
export async function POST(request: NextRequest) {
  // ... your logic ...
  
  await sendPushNotificationServer({
    userIds: user.id,
    title: 'Welcome!',
    body: 'Thanks for joining UFLOW',
    url: '/welcome',
  });
  
  return NextResponse.json({ success: true });
}
```

## Advanced Usage

### Custom Notification Options

```tsx
await sendPushNotification({
  userIds: 'user-id',
  title: 'Action Required',
  body: 'Please review this item',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-72x72.png',
  image: '/images/notification-image.jpg',
  tag: 'review-required',
  requireInteraction: true,
  actions: [
    {
      action: 'review',
      title: 'Review',
      icon: '/icons/review.png',
    },
    {
      action: 'dismiss',
      title: 'Dismiss',
    },
  ],
  vibrate: [200, 100, 200],
  data: {
    customData: 'value',
    url: '/review',
  },
});
```

### Manual Subscription Management

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { 
    permission, 
    subscribe, 
    unsubscribe, 
    isSubscribed 
  } = usePushNotifications();

  const handleSubscribe = async () => {
    try {
      const subscription = await subscribe(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      );
      
      // Save to backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: /* convert to base64 */,
              auth: /* convert to base64 */,
            },
          },
          userId: user.id,
        }),
      });
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  return (
    <button onClick={handleSubscribe}>
      {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
    </button>
  );
}
```

## Testing

### 1. Test Permission Request

1. Open your PWA in a supported browser
2. The prompt should appear after the delay
3. Click "Enable" to grant permission
4. Check browser console for any errors

### 2. Test Notification Delivery

Use the API route directly:

```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": "your-user-id",
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

### 3. Test on Real Devices

- **iOS**: Requires iOS 16.4+ and Safari
- **Android**: Works in Chrome/Edge
- Both require HTTPS (except localhost)

## Troubleshooting

### Notifications Not Appearing

1. **Check Permission**: Ensure user granted permission
2. **Check Service Worker**: Verify service worker is registered
3. **Check VAPID Keys**: Ensure keys are correctly configured
4. **Check Browser Console**: Look for errors in console
5. **Check Network**: Verify API calls are successful

### Invalid Subscription Errors

The system automatically removes invalid subscriptions (410/404 errors). Check your database to see if subscriptions are being cleaned up.

### iOS-Specific Issues

- iOS 16.4+ required
- Must request permission from user gesture (button click)
- Works in Safari and PWAs
- Some features (like action buttons) may have limited support

## Security Considerations

1. **RLS Policies**: Only users can manage their own subscriptions
2. **VAPID Keys**: Private key must never be exposed to client
3. **User Verification**: API routes verify user authentication
4. **HTTPS Required**: Push notifications require secure connection

## Best Practices

1. **Request Permission Contextually**: Don't ask immediately on page load
2. **Provide Value**: Explain why notifications are useful
3. **Respect User Choice**: Don't repeatedly prompt if denied
4. **Clean Up**: System automatically removes invalid subscriptions
5. **Test Thoroughly**: Test on both iOS and Android devices
6. **Monitor**: Track subscription rates and notification delivery

## API Reference

### Hook: `usePushNotifications`

```tsx
const {
  permission,        // 'default' | 'granted' | 'denied'
  subscription,      // PushSubscription | null
  isSupported,       // boolean
  isSubscribed,      // boolean
  requestPermission, // () => Promise<NotificationPermission>
  subscribe,         // (vapidKey: string) => Promise<PushSubscription>
  unsubscribe,       // () => Promise<void>
  getSubscription,   // () => Promise<PushSubscription | null>
} = usePushNotifications();
```

### API Routes

- `POST /api/push/subscribe` - Save subscription
- `DELETE /api/push/subscribe` - Remove subscription
- `POST /api/push/send` - Send notification

## Resources

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [iOS Push Notifications](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [web-push Library](https://github.com/web-push-libs/web-push)

