import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Only use this on the server! Never expose the service role key to the client.
export const createServerSideClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ); 