import { Suspense } from 'react';

import { AboutSection } from '@/components/shared/AboutSection';
import { DesktopWaitlistSection } from '@/components/shared/DesktopWaitlistSection';
import { ExploreSection } from '@/components/shared/ExploreSection';
import { LandingHero } from '@/components/shared/LandingHero';
import { MobileSplashScreen } from '@/components/shared/MobileSplashScreen';

/**
 * Waitlist landing page
 * This is the dedicated waitlist route that users see when the app is not launched.
 * When isAppLaunched is false, all app routes redirect here.
 * 
 * Note: LandingLayout is provided by waitlist/layout.tsx
 */
export const dynamic = 'auto';
export const revalidate = 60; // Revalidate every 60 seconds for fresh content

export default function WaitlistPage() {
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
