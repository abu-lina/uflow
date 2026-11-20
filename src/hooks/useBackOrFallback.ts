'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Pathname this tab entered the app on (direct link, new tab, external referrer).
// router.back() from there is a no-op or leaves uFlow, so we fall back instead.
// shortcut: a hard reload, a query-only change, or re-entering the entry page in-app falls
// back to /food, and it assumes in-app links push history; move to sessionStorage or
// history.state if those cases matter.
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
