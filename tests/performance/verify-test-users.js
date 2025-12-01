/**
 * Verify Test Users Script
 * 
 * Checks if test users exist and are properly configured for performance tests.
 * 
 * Usage:
 *   node tests/performance/verify-test-users.js
 * 
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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
  console.error('   Error:', result.error.message);
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_EMAIL_PREFIX = 'test-user';
const NUM_TEST_USERS = 100;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  console.error(`\nPlease set these in ${envFile}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Generate test user email
 */
function generateTestEmail(index) {
  return `${TEST_EMAIL_PREFIX}-${index}@example.com`;
}

/**
 * Find all test users
 */
async function findTestUsers() {
  console.log('🔍 Searching for test users...\n');
  
  const testUsers = [];
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
    
    const found = data.users.filter(u => 
      u.email && u.email.startsWith(`${TEST_EMAIL_PREFIX}-`) && u.email.endsWith('@example.com')
    );
    
    testUsers.push(...found);
    
    if (data.users.length < perPage) {
      break;
    }
    
    page++;
  }
  
  return testUsers;
}

/**
 * Test login for a specific user
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
 * Main verification function
 */
async function verifyTestUsers() {
  console.log('🔍 Verifying Test Users for Performance Tests\n');
  console.log(`Environment: ${SUPABASE_URL}\n`);
  
  // Find all test users
  const allTestUsers = await findTestUsers();
  console.log(`   Found ${allTestUsers.length} test users in database\n`);
  
  // Check for expected users (0-99)
  const expectedEmails = Array.from({ length: NUM_TEST_USERS }, (_, i) => generateTestEmail(i));
  const foundEmails = new Set(allTestUsers.map(u => u.email));
  
  const missing = expectedEmails.filter(email => !foundEmails.has(email));
  const found = expectedEmails.filter(email => foundEmails.has(email));
  
  console.log(`   ✅ Found: ${found.length}/${NUM_TEST_USERS} expected users`);
  console.log(`   ❌ Missing: ${missing.length}/${NUM_TEST_USERS} expected users`);
  
  if (missing.length > 0) {
    console.log(`\n   Missing users (first 10):`);
    missing.slice(0, 10).forEach(email => console.log(`     - ${email}`));
    if (missing.length > 10) {
      console.log(`     ... and ${missing.length - 10} more`);
    }
  }
  
  // Check confirmation status
  console.log(`\n   Checking confirmation status...`);
  const confirmed = allTestUsers.filter(u => u.email_confirmed_at || u.user_metadata?.email_confirmed === true);
  const unconfirmed = allTestUsers.filter(u => !u.email_confirmed_at && u.user_metadata?.email_confirmed !== true);
  
  console.log(`   ✅ Confirmed: ${confirmed.length}`);
  console.log(`   ❌ Unconfirmed: ${unconfirmed.length}`);
  
  if (unconfirmed.length > 0) {
    console.log(`\n   Unconfirmed users (first 10):`);
    unconfirmed.slice(0, 10).forEach(u => console.log(`     - ${u.email}`));
    if (unconfirmed.length > 10) {
      console.log(`     ... and ${unconfirmed.length - 10} more`);
    }
  }
  
  // Test login for a sample of users
  console.log(`\n   Testing login for sample users...`);
  const sampleUsers = allTestUsers.slice(0, Math.min(5, allTestUsers.length));
  const loginResults = [];
  
  for (const user of sampleUsers) {
    const result = await testLogin(user.email, TEST_PASSWORD);
    loginResults.push({ email: user.email, ...result });
    
    if (result.success) {
      console.log(`     ✅ ${user.email}: Login successful`);
    } else {
      console.log(`     ❌ ${user.email}: Login failed - ${result.error}`);
    }
  }
  
  const successfulLogins = loginResults.filter(r => r.success).length;
  console.log(`\n   Login test results: ${successfulLogins}/${sampleUsers.length} successful`);
  
  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total test users found: ${allTestUsers.length}`);
  console.log(`   Expected users found: ${found.length}/${NUM_TEST_USERS}`);
  console.log(`   Confirmed users: ${confirmed.length}`);
  console.log(`   Login test success: ${successfulLogins}/${sampleUsers.length}`);
  
  if (found.length < NUM_TEST_USERS * 0.9) {
    console.log(`\n⚠️  WARNING: Less than 90% of expected users found.`);
    console.log(`   Run: node tests/performance/setup-test-users.js`);
  }
  
  if (unconfirmed.length > 0) {
    console.log(`\n⚠️  WARNING: ${unconfirmed.length} users are not confirmed.`);
    console.log(`   Run: node tests/performance/setup-test-users.js`);
  }
  
  if (successfulLogins < sampleUsers.length) {
    console.log(`\n⚠️  WARNING: Some users cannot login.`);
    console.log(`   This may indicate password mismatch or confirmation issues.`);
  }
  
  if (found.length >= NUM_TEST_USERS * 0.9 && unconfirmed.length === 0 && successfulLogins === sampleUsers.length) {
    console.log(`\n✅ All checks passed! Test users are ready for performance testing.`);
  } else {
    console.log(`\n❌ Some issues detected. Please run setup-test-users.js to fix.`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('verify-test-users.js')) {
  verifyTestUsers().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { verifyTestUsers, findTestUsers, testLogin };
