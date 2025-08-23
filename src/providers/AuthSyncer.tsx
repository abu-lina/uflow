'use client';

import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';

export function AuthSyncer() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only handle auth=required if user is not authenticated
    if (typeof window !== 'undefined' && window.location.search.includes('auth=required')) {
      if (!user) {
        // If no user is authenticated, redirect to home
        router.replace('/');
      } else {
        // If user is authenticated but server-side auth failed,
        // just remove the query param without signing out
        // This prevents the logout issue when clicking profile menu
        router.replace(pathname);
      }
    }
  }, [pathname, user, router]);

  return null;
}
