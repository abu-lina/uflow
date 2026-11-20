'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Pathname this tab entered the app on (direct link, new tab, external referrer).
// router.back() from there is a no-op or leaves uFlow, so we fall back instead.
let entryPathname: string | null = null;

/** Mount once in the root layout so useBackOrFallback knows where the tab entered. */
export function useTrackInAppNavigation() {
  const pathname = usePathname();

  useEffect(() => {
    entryPathname ??= pathname;
  }, [pathname]);
}

/** Close/back handler: go back inside uFlow, otherwise navigate to `fallback`. */
export function useBackOrFallback(fallback = '/food') {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    if (entryPathname !== null && pathname !== entryPathname) router.back();
    else router.push(fallback);
  }, [router, pathname, fallback]);
}
