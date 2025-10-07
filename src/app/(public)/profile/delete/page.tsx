import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AccountDeleteContent } from './AccountDeleteContent';
import type { SupabaseUser } from '@/types/supabase-user';

export default async function AccountDeletePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  // Convert Supabase User to SupabaseUser type
  const user: SupabaseUser | null = session?.user ? {
    id: session.user.id,
    email: session.user.email || '',
    user_metadata: session.user.user_metadata,
    app_metadata: session.user.app_metadata,
    aud: session.user.aud,
    created_at: session.user.created_at,
    updated_at: session.user.updated_at,
  } : null;

  return <AccountDeleteContent user={user} />;
}
