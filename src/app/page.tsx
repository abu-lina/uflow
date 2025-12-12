import { Suspense } from 'react';

import { LandingLayout } from '@/components/layout/LandingLayout';
import { AboutSection } from '@/components/shared/AboutSection';
import { DesktopWaitlistSection } from '@/components/shared/DesktopWaitlistSection';
import { ExploreSection } from '@/components/shared/ExploreSection';
import { LandingHero } from '@/components/shared/LandingHero';
import { MobileSplashScreen } from '@/components/shared/MobileSplashScreen';

// Ensure client-side navigation works properly for root route
// Note: This is the canonical root page. The (public) route group version is kept for organization but this one takes precedence.
// Using 'auto' instead of 'force-dynamic' allows Next.js to optimize rendering
// The page is mostly static content with client-side data fetching
export const dynamic = 'auto';
export const revalidate = 60; // Revalidate every 60 seconds for fresh content

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"></div>}>
      <LandingLayout>
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
      </LandingLayout>
    </Suspense>
  );
}
