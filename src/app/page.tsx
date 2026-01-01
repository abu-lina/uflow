import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getFeatureFlag } from '@/config/feature-flags';
import { RootPageContent } from '@/components/shared/RootPageContent';

/**
 * Root page - shows waitlist onboarding or redirects based on app state
 * 
 * Browser users:
 *   - When app is not launched: Shows waitlist content directly on root
 *   - When app is launched: Redirects to /providers
 * 
 * Early access users (after completing onboarding):
 *   - Redirects to /welcome for PWA installation
 *   - Welcome page provides proper URL context for iOS PWA
 * 
 * PWA users:
 *   - Use manifest start_url: / (root handles routing based on PWA state)
 */
export const dynamic = 'force-dynamic'; // Always check feature flag on each request

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const isAppLaunched = getFeatureFlag('isAppLaunched');
  const params = await searchParams;
  const fromEarlyAccess = params.from === 'early-access';
  
  // Only redirect to /welcome if coming from early access completion (first time)
  // This allows PWA users to see early access page on subsequent visits
  // MobileSplashScreen will detect early access state from localStorage and show it
  if (!isAppLaunched && fromEarlyAccess) {
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
