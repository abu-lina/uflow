# Push Notifications - Quick Start

## 1. Generate VAPID Keys

```bash
./scripts/generate-vapid-keys.sh
# or
npx web-push generate-vapid-keys
```

## 2. Add to .env.local

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_EMAIL=your-email@example.com
```

## 3. Run Migration

Apply the database migration:
```sql
-- Run: supabase/migrations/archive/010_create_push_subscriptions.sql
```

## 4. Test It

The `PushNotificationPrompt` is already added to `RootClientLayout` and will show automatically after 5 seconds for authenticated users.

## 5. Send a Notification

```tsx
import { sendPushNotification } from '@/services/pushNotificationService';

await sendPushNotification({
  userIds: 'user-id',
  title: 'Hello!',
  body: 'This is a test notification',
  url: '/',
});
```

## That's It! 🎉

See `PUSH_NOTIFICATIONS_SETUP.md` for detailed documentation.

