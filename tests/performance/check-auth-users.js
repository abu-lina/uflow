/**
 * Check Auth Users Script
 * 
 * Compares users in public.users table with auth.users (Supabase Auth)
 * to identify authentication issues.
 * 
 * Usage:
 *   node tests/performance/check-auth-users.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envFile = process.env.ENV_FILE || join(__dirname, '../../.env.uat');
const result = dotenv.config({ path: envFile });

if (result.error) {
  console.error('❌ Failed to load environment file:', envFile);
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_EMAIL_PREFIX = 'test-user';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Get all test users from public.users table
 */
async function getPublicUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('email, user_id')
    .like('email', `${TEST_EMAIL_PREFIX}-%@example.com`)
    .order('email');
  
  if (error) {
    throw error;
  }
  
  return data || [];
}

/**
 * Get all test users from auth.users (Supabase Auth)
 */
async function getAuthUsers() {
  const authUsers = [];
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });
    
    if (error) {
      throw error;
    }
    
    const testUsers = data.users.filter(u => 
      u.email && u.email.startsWith(`${TEST_EMAIL_PREFIX}-`) && u.email.endsWith('@example.com')
    );
    
    authUsers.push(...testUsers);
    
    if (data.users.length < perPage) {
      break;
    }
    
    page++;
  }
  
  return authUsers;
}

/**
 * Test login for a user
 */
async function testLogin(email, password) {
  const supabaseAnon = createClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  if (data.session) {
    await supabaseAnon.auth.signOut();
    return { success: true };
  }
  
  return { success: false, error: 'No session created' };
}

/**
 * Main check function
 */
async function checkAuthUsers() {
  console.log('🔍 Checking Auth Users vs Public Users\n');
  console.log(`Environment: ${SUPABASE_URL}\n`);
  
  // Get users from both tables
  console.log('📊 Fetching users from public.users table...');
  const publicUsers = await getPublicUsers();
  console.log(`   Found ${publicUsers.length} test users in public.users\n`);
  
  console.log('📊 Fetching users from auth.users (Supabase Auth)...');
  const authUsers = await getAuthUsers();
  console.log(`   Found ${authUsers.length} test users in auth.users\n`);
  
  // Create maps for easy lookup
  const publicUserMap = new Map(publicUsers.map(u => [u.email, u]));
  const authUserMap = new Map(authUsers.map(u => [u.email, u]));
  
  // Find missing users
  const missingInAuth = publicUsers.filter(u => !authUserMap.has(u.email));
  const missingInPublic = authUsers.filter(u => !publicUserMap.has(u.email));
  
  // Check confirmation status
  const unconfirmed = authUsers.filter(u => 
    !u.email_confirmed_at && u.user_metadata?.email_confirmed !== true
  );
  
  // Summary
  console.log('📋 Summary:');
  console.log(`   public.users: ${publicUsers.length} test users`);
  console.log(`   auth.users: ${authUsers.length} test users`);
  console.log(`   Missing in auth.users: ${missingInAuth.length}`);
  console.log(`   Missing in public.users: ${missingInPublic.length}`);
  console.log(`   Unconfirmed in auth.users: ${unconfirmed.length}\n`);
  
  if (missingInAuth.length > 0) {
    console.log('❌ Users in public.users but NOT in auth.users:');
    missingInAuth.slice(0, 10).forEach(u => console.log(`     - ${u.email}`));
    if (missingInAuth.length > 10) {
      console.log(`     ... and ${missingInAuth.length - 10} more`);
    }
    console.log('');
  }
  
  if (unconfirmed.length > 0) {
    console.log('⚠️  Unconfirmed users in auth.users:');
    unconfirmed.slice(0, 10).forEach(u => console.log(`     - ${u.email}`));
    if (unconfirmed.length > 10) {
      console.log(`     ... and ${unconfirmed.length - 10} more`);
    }
    console.log('');
  }
  
  // Test login for a sample
  console.log('🧪 Testing login for sample users...\n');
  const sampleUsers = authUsers.slice(0, Math.min(5, authUsers.length));
  const loginResults = [];
  
  for (const user of sampleUsers) {
    const result = await testLogin(user.email, TEST_PASSWORD);
    loginResults.push({ email: user.email, confirmed: !!user.email_confirmed_at, ...result });
    
    if (result.success) {
      console.log(`   ✅ ${user.email}: Login successful`);
    } else {
      const status = user.email_confirmed_at ? 'confirmed' : 'unconfirmed';
      console.log(`   ❌ ${user.email} (${status}): ${result.error}`);
    }
  }
  
  const successfulLogins = loginResults.filter(r => r.success).length;
  console.log(`\n   Login test: ${successfulLogins}/${sampleUsers.length} successful\n`);
  
  // Recommendations
  if (missingInAuth.length > 0) {
    console.log('💡 Recommendation:');
    console.log('   Users exist in public.users but not in auth.users.');
    console.log('   These users cannot login. Run setup-test-users.js to create them in Auth.\n');
  }
  
  if (unconfirmed.length > 0) {
    console.log('💡 Recommendation:');
    console.log('   Some users are not confirmed. Run setup-test-users.js to confirm them.\n');
  }
  
  if (loginResults.some(r => !r.success && r.confirmed)) {
    console.log('💡 Recommendation:');
    console.log('   Some confirmed users cannot login. Check password mismatch.\n');
  }
  
  // Final status
  if (authUsers.length >= 100 && unconfirmed.length === 0 && successfulLogins === sampleUsers.length) {
    console.log('✅ All checks passed! Test users are ready for performance testing.');
  } else {
    console.log('❌ Issues detected. Please run setup-test-users.js to fix.');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('check-auth-users.js')) {
  checkAuthUsers().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { checkAuthUsers, getPublicUsers, getAuthUsers };
