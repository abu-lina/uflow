import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { ProfileEditContent } from './ProfileEditContent';

export default async function ProfileEditPage() {
  const user = await getUserFromCookie();

  return <ProfileEditContent user={user} />;
}
