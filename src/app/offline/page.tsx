'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial state
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (isOnline) {
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <WifiOff className="h-12 w-12 text-gray-400" />
          </div>
          <CardTitle className="text-2xl font-bold">You&apos;re Offline</CardTitle>
          <CardDescription>
            {isOnline 
              ? "You're back online! Click 'Try Again' to refresh the page."
              : "It seems you've lost your internet connection. Some features may be limited while offline."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-500">
            <p>While offline, you can still:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>View cached content and previously loaded pages</li>
              <li>Access your bookmarked souks</li>
              <li>View your profile information</li>
              <li>Submit forms (they&apos;ll sync when you&apos;re back online)</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleRetry}
              disabled={!isOnline}
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Link href="/" className="inline-flex">
              <Button className="flex items-center justify-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
          {!isOnline && (
            <div className="text-center text-xs text-gray-400 mt-4">
              <p>Connection status: Offline</p>
              <p>Last checked: {new Date().toLocaleTimeString()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 