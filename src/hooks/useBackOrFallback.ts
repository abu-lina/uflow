'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Set once the app has done a client-side navigation in this tab. A direct link,
// a new tab or an external referrer leaves it false, so router.back() would be a no-op.
// shortcut: stays true after the user pops back to the entry page; track history depth if that matters.
let hasInAppHistory = false;

/** Mount once in the root layout so useBackOrFallback knows whether history is ours. */
export function useTrackInAppNavigation() {
  const pathname = usePathname();
  const firstPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== firstPathname.current) hasInAppHistory = true;
  }, [pathname]);
}

/** Close/back handler: go back inside uFlow, otherwise navigate to `fallback`. */
export function useBackOrFallback(fallback = '/food') {
  const router = useRouter();

  return useCallback(() => {
    if (hasInAppHistory) router.back();
    else router.push(fallback);
  }, [router, fallback]);
}
