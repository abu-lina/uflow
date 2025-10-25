// Server Component
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';

import { ProfileContent } from './ProfileContent';

export default async function ProfilePage() {
  const user = await getUserFromCookie();

  // If no user found server-side, we'll let the client-side handle it
  // instead of immediately redirecting, to prevent logout issues
  return <ProfileContent user={user} />;
}
