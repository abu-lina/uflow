import { Suspense } from 'react';

import { LandingLayout } from '@/components/layout/LandingLayout';
import { AboutSection } from '@/components/shared/AboutSection';
import { CategoryGallerySection } from '@/components/shared/CategoryGallerySection';
import { ExploreSection } from '@/components/shared/ExploreSection';
import { LandingHero } from '@/components/shared/LandingHero';
import { MobileGreeting } from '@/components/shared/MobileGreeting';

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center">Sabr...</div>}>
      <LandingLayout>
        {/* Mobile Greeting for first-time users */}
        <div className="md:hidden">
          <MobileGreeting />
        </div>

        {/* Desktop Landing Content */}
        <div className="relative z-10 hidden md:block">
          <LandingHero />
          <AboutSection />
          <ExploreSection />
          <CategoryGallerySection />
        </div>
      </LandingLayout>
    </Suspense>
  );
}
