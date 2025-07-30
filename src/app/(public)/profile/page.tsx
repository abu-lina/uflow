// Server Component
import { ErrorBoundary } from '@/components/common/error-boundary/ErrorBoundary';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';

import { ProfileContent } from './ProfileContent';

export default async function ProfilePage() {
  const user = await getUserFromCookie();

  // If no user found server-side, we'll let the client-side handle it
  // instead of immediately redirecting, to prevent logout issues
  if (!user) {
    // Return the profile content with null user, let client-side handle auth
    return (
      <ErrorBoundary>
        <div className="flex w-full flex-col items-center">
          <ProfileContent user={null} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex w-full flex-col items-center">
        <ProfileContent user={user} />
      </div>
    </ErrorBoundary>
  );
}
