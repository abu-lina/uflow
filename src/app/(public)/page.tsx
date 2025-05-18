import { Suspense } from 'react';

import { createSupabaseServerClient } from '@/lib/supabase/server';

import { LandingContent } from './LandingContent';

// Server Component for initial auth check
async function AuthCheck() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export default async function LandingPage({ searchParams }: { searchParams: { auth?: string } }) {
  const session = await AuthCheck();

  // If auth is required and user is not logged in, show sign-in modal
  if (searchParams.auth === 'required' && !session) {
    // The client component will handle showing the modal
    return (
      <Suspense fallback={<div className="flex h-64 items-center justify-center">Loading...</div>}>
        <LandingContent showSignInModal={true} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center">Loading...</div>}>
      <LandingContent showSignInModal={false} />
    </Suspense>
  );
}
