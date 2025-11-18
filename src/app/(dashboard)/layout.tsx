import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminOrModerator } from '@/lib/auth/roles';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check authentication
  if (!user) {
    redirect('/');
  }

  // Check authorization - only admin and moderator can access dashboard
  const hasAccess = await isAdminOrModerator(user.id);
  if (!hasAccess) {
    redirect('/');
  }

  return <>{children}</>;
}
