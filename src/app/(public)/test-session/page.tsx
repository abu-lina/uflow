import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function TestSessionPage() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();

  return <pre>{JSON.stringify({ session: data.session, error }, null, 2)}</pre>;
}
