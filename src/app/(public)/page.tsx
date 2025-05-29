import { Suspense } from 'react';

import { LandingLayout } from '@/components/layout/LandingLayout';
import { MobileLanding } from '@/components/layout/MobileLanding';
import { AboutSection } from '@/components/shared/AboutSection';
import { ExploreSection } from '@/components/shared/ExploreSection';
import { LandingHero } from '@/components/shared/LandingHero';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Server Component for initial auth check
async function AuthCheck() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export default async function LandingPage() {
  await AuthCheck(); // We still need to check auth for the header

  return (
    <div className="relative min-h-screen">
      {/* Mobile Landing (hidden on md and up) */}
      <div className="absolute inset-0 block transform transition-all duration-300 ease-in-out md:hidden md:translate-x-full md:opacity-0">
        <MobileLanding />
      </div>

      {/* Desktop Landing (hidden below md) */}
      <div className="absolute inset-0 hidden transform transition-all duration-300 ease-in-out md:block md:translate-x-0 md:opacity-100">
        <Suspense
          fallback={<div className="flex h-64 items-center justify-center">Loading...</div>}
        >
          <LandingLayout>
            <div className="relative z-10">
              <LandingHero />
              <AboutSection />
              <ExploreSection />
            </div>
          </LandingLayout>
        </Suspense>
      </div>
    </div>
  );
}
