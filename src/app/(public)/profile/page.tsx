// Server Component
import { redirect } from 'next/navigation';

import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';

import { ProfileContent } from './ProfileContent';

export default async function ProfilePage() {
  const user = await getUserFromCookie();
  if (!user) {
    redirect('/?auth=required');
  }
  return <ProfileContent user={user} />;
}
