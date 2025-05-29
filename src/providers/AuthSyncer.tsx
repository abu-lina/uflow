'use client';

import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';

export function AuthSyncer() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('auth=required')) {
      if (user) {
        signOut();
      }
      // Optionally, remove the query param
      router.replace('/');
    }
  }, [pathname, user, signOut, router]);

  return null;
}
