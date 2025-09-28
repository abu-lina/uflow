import { Suspense } from 'react';

import { LandingLayout } from '@/components/layout/LandingLayout';
import { AboutSection } from '@/components/shared/AboutSection';
import { CategoryGallerySection } from '@/components/shared/CategoryGallerySection';
import { ExploreSection } from '@/components/shared/ExploreSection';
import { LandingHero } from '@/components/shared/LandingHero';
import { MobileSplashScreen } from '@/components/shared/MobileSplashScreen';

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center">Sabr...</div>}>
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
          <CategoryGallerySection />
        </div>
      </LandingLayout>
    </Suspense>
  );
}
