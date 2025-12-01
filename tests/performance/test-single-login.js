/**
 * Test single user login to diagnose issues
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envFile = process.env.ENV_FILE || join(__dirname, '../../.env.uat');
const result = dotenv.config({ path: envFile });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_PASSWORD = 'TestPassword123!';

console.log('Environment:', SUPABASE_URL);
console.log('Testing login for: test-user-11@example.com\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test-user-11@example.com',
  password: TEST_PASSWORD,
});

if (error) {
  console.log('❌ Login failed:', error.message);
  console.log('   Error details:', JSON.stringify(error, null, 2));
} else if (data.session) {
  console.log('✅ Login successful!');
  console.log('   User ID:', data.user.id);
  console.log('   Email:', data.user.email);
  await supabase.auth.signOut();
} else {
  console.log('❌ No session created');
}
