import { createClient } from '@supabase/supabase-js';

import { type Database } from '@/types/supabase';

// Only use this on the server! Never expose the service role key to the client.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

export const createServerSideClient = () => createClient<Database>(url, serviceRoleKey);
