import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/login');
  }

  const authorized = await isAdminOrModerator(user.id);

  if (!authorized) {
    redirect('/providers');
  }

  return <>{children}</>;
}
