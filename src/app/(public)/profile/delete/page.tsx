import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AccountDeleteContent } from './AccountDeleteContent';

export default async function AccountDeletePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return <AccountDeleteContent user={user} />;
}
