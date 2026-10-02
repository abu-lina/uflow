import { createClient } from '@supabase/supabase-js';

import { resolveSupabaseEnv, TEST_EMAIL, TEST_PASSWORD } from './fixtures';

export default async function globalSetup(): Promise<void> {
  const { apiUrl, serviceRoleKey } = resolveSupabaseEnv();
  const admin = createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error && !/already (been )?registered|already exists|duplicate/i.test(error.message)) {
    throw new Error(`Failed to provision E2E test user: ${error.message}`);
  }
}
