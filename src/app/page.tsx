import { Suspense } from 'react';

import { LandingLayout } from '@/components/layout/LandingLayout';
import { AboutSection } from '@/components/shared/AboutSection';
import { ExploreSection } from '@/components/shared/ExploreSection';
import { LandingHero } from '@/components/shared/LandingHero';

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center">Loading...</div>}>
      <LandingLayout>
        <div className="relative z-10">
          <LandingHero />
          <AboutSection />
          <ExploreSection />
        </div>
      </LandingLayout>
    </Suspense>
  );
}
