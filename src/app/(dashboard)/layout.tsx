import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Only protect admin routes
  if (!session) {
    return null;
  }

  return <>{children}</>;
}
