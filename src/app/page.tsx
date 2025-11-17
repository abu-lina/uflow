import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { LandingLayout } from '@/components/layout/LandingLayout';

// Lazy load heavy landing page components for better initial load
const MobileSplashScreen = dynamic(() => import('@/components/shared/MobileSplashScreen').then(mod => ({ default: mod.MobileSplashScreen })), {
  loading: () => <div className="flex h-screen items-center justify-center" />,
});

const LandingHero = dynamic(() => import('@/components/shared/LandingHero').then(mod => ({ default: mod.LandingHero })), {
  loading: () => <div className="flex h-screen items-center justify-center" />,
});

const AboutSection = dynamic(() => import('@/components/shared/AboutSection').then(mod => ({ default: mod.AboutSection })), {
  loading: () => null,
});

const ExploreSection = dynamic(() => import('@/components/shared/ExploreSection').then(mod => ({ default: mod.ExploreSection })), {
  loading: () => null,
});

const CategoryGallerySection = dynamic(() => import('@/components/shared/CategoryGallerySection').then(mod => ({ default: mod.CategoryGallerySection })), {
  loading: () => null,
});

// Ensure this page is treated as a client-side route (not statically generated)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
          <CategoryGallerySection />
        </div>
      </LandingLayout>
    </Suspense>
  );
}
