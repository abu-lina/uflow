import { Suspense } from 'react';

import { LandingLayout } from '@/components/layout/LandingLayout';
import { AboutSection } from '@/components/shared/AboutSection';
import { ExploreSection } from '@/components/shared/ExploreSection';
import { LandingHero } from '@/components/shared/LandingHero';
import { MobileSplashScreen } from '@/components/shared/MobileSplashScreen';

// Ensure client-side navigation works properly for root route
// No force-dynamic to allow Next.js to optimize client-side navigation

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
          <ExploreSection />
        </div>
      </LandingLayout>
    </Suspense>
  );
}
