import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getFeatureFlag } from '@/config/feature-flags';
import { getHomeRedirectPath } from '@/config/sectionFilters';
import { RootPageContent } from '@/components/shared/RootPageContent';

type RouteSearchParams = { [key: string]: string | string[] | undefined };

function toURLSearchParams(params: RouteSearchParams): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of ([] as Array<string | undefined>).concat(value)) {
      if (item !== undefined) result.append(key, item);
    }
  }
  return result;
}

/**
 * Root page - shows waitlist onboarding or redirects based on app state
 *
 * Browser users:
 *   - When app is not launched: Shows waitlist content directly on root
 *   - When app is launched: Redirects (307) to the active section route,
 *     keeping the query string (#674)
 *
 * Early access users (after completing onboarding):
 *   - Redirects to /welcome for PWA installation
 *   - Welcome page provides proper URL context for iOS PWA
 *
 * PWA users:
 *   - Use manifest start_url: / (root handles routing based on PWA state)
 */
// Page is inherently dynamic because it awaits searchParams.
// Removed force-dynamic — searchParams usage makes it dynamic automatically.
// Plan 010 — P1b: Reduce force-dynamic blast radius

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  const isAppLaunched = getFeatureFlag('isAppLaunched');
  const params = await searchParams;
  const fromEarlyAccess = params.from === 'early-access';

  if (isAppLaunched) {
    redirect(getHomeRedirectPath(toURLSearchParams(params)));
  }

  // Only redirect to /welcome if coming from early access completion (first time)
  // This allows PWA users to see early access page on subsequent visits
  // MobileSplashScreen will detect early access state from localStorage and show it
  if (fromEarlyAccess) {
    // First time after completing early access - redirect to welcome for PWA install
    redirect('/welcome');
  }

  // RootPageContent handles conditional rendering:
  // - If onboarding complete: Shows CityEarlyAccessEmptyState at root
  // - Otherwise: Shows waitlist/onboarding content
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"></div>}>
      <RootPageContent />
    </Suspense>
  );
}
