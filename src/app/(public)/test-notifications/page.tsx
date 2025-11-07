'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { Button } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { sendPushNotification } from '@/services/pushNotificationService';

export default function TestNotificationsPage() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleTest = async () => {
    if (!user) {
      toast.error('Please log in first', {
        description: 'You need to be logged in to test push notifications.',
      });
      return;
    }

    setSending(true);
    setLastResult(null);
    try {
      const result = await sendPushNotification({
        userIds: user.id,
        title: 'Test Notification 🎉',
        body: 'This is a test notification from UFLOW! If you see this, push notifications are working.',
        url: '/',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'test-notification',
        data: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      });

      setLastResult(JSON.stringify(result, null, 2));
      toast.success('Notification sent!', {
        description: `Sent: ${result.sent}, Failed: ${result.failed}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`Error: ${errorMessage}`);
      toast.error('Failed to send notification', {
        description: errorMessage,
      });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Test Push Notifications" variant="back-and-title" onBack="/" />
        <HeaderSpacer />
        <div className="container mx-auto p-8">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold mb-4">Login Required</h2>
            <p className="text-gray-600 mb-4">
              Please log in to test push notifications.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Test Push Notifications" variant="back-and-title" onBack="/" />
      <HeaderSpacer />
      <div className="container mx-auto p-8 max-w-2xl">
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Send Test Notification</h2>
            <p className="text-gray-600 mb-4">
              Click the button below to send a test push notification to your device.
              Make sure you&apos;ve enabled push notifications first!
            </p>
            <Button
              className="w-full sm:w-auto"
              disabled={sending}
              variant="primary"
              onClick={handleTest}
            >
              {sending ? 'Sending...' : 'Send Test Notification'}
            </Button>
          </div>

          {lastResult && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Last Result:</h3>
              <pre className="bg-gray-50 p-4 rounded border border-gray-200 overflow-auto text-sm">
                {lastResult}
              </pre>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Testing Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Make sure you&apos;re logged in</li>
              <li>Enable push notifications when prompted (or in browser settings)</li>
              <li>Click &quot;Send Test Notification&quot; above</li>
              <li>Check your device for the notification</li>
              <li>If on mobile, make sure the app is installed as PWA</li>
            </ol>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">User Info:</h3>
            <div className="text-sm space-y-1">
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

