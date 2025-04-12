'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <WifiOff className="h-12 w-12 text-gray-400" />
          </div>
          <CardTitle className="text-2xl font-bold">You&apos;re Offline</CardTitle>
          <CardDescription>
            It seems you&apos;ve lost your internet connection. Some features may be limited while offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-500">
            <p>While offline, you can still:</p>
            <ul className="mt-2 list-inside list-disc">
              <li>View cached content</li>
              <li>Access previously loaded pages</li>
              <li>Submit forms (they&apos;ll sync when you&apos;re back online)</li>
            </ul>
          </div>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
            <Link href="/" className="inline-flex">
              <Button>Go Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 