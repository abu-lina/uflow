import { offlineMetadata } from '@/config/metadata';

export const metadata = offlineMetadata;

'use client';

import { APP_CONFIG } from '@/config/constants/app';
import { FilledButton } from '@/components/ui/button/filled';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card/card';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";

/**
 * Offline Page Component
 * 
 * This page is shown when the user is offline and attempts to access
 * a page that requires an internet connection.
 */
export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // When coming back online, refresh the current page
      router.refresh();
    };
    const handleOffline = () => setIsOnline(false);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    setIsOnline(navigator.onLine);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  const handleRetry = () => {
    if (navigator.onLine) {
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-center">You&apos;re Offline</CardTitle>
          <CardDescription className="text-center">
            {APP_CONFIG.name} requires an internet connection to function properly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FilledButton
            onClick={handleRetry}
            disabled={!isOnline}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </FilledButton>
          <Link href="/" className="w-full">
            <FilledButton variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </FilledButton>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
} 