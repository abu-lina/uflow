import { Suspense } from 'react';

import { LandingLayout } from '@/components/layout/LandingLayout';
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
