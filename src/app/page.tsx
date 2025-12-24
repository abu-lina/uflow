import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getFeatureFlag } from '@/config/feature-flags';
import { AboutSection } from '@/components/shared/AboutSection';
import { DesktopWaitlistSection } from '@/components/shared/DesktopWaitlistSection';
import { ExploreSection } from '@/components/shared/ExploreSection';
import { LandingHero } from '@/components/shared/LandingHero';
import { MobileSplashScreen } from '@/components/shared/MobileSplashScreen';

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
  
  // Check if user has waitlist token (completed waitlist)
  const cookieStore = await cookies();
  const waitlistToken = cookieStore.get('waitlist_token')?.value;
  
  // If coming from early access or has token, show welcome page for PWA install
  if (!isAppLaunched && (fromEarlyAccess || waitlistToken)) {
    // Check if early access was completed (set by useWaitlistFlow)
    // Note: This check happens on server, so we rely on query param primarily
    redirect('/welcome');
  }
  
  if (isAppLaunched) {
    // App launched - redirect to main app (providers page)
    redirect('/providers');
  }
  
  // App not launched - show waitlist content directly on root
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"></div>}>
      {/* Mobile Content */}
      <div className="md:hidden">
        <MobileSplashScreen />
      </div>

      {/* Desktop Landing Content */}
      <div className="relative z-10 hidden md:block">
        <LandingHero />
        <AboutSection />
        <DesktopWaitlistSection />
        <ExploreSection />
      </div>
    </Suspense>
  );
}
