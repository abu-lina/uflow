/**
 * Recreate Test Users Script
 * 
 * Completely deletes and recreates all test users to ensure a clean state
 * with correct passwords and confirmation status.
 * 
 * Usage:
 *   node tests/performance/recreate-test-users.js
 * 
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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

if (result.error) {
  console.error('❌ Failed to load environment file:', envFile);
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_EMAIL_PREFIX = 'test-user';
const NUM_TEST_USERS = 100;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
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
 * Find all test users using pagination
 */
async function findAllTestUsers() {
  const testUsers = [];
  let page = 1;
  const perPage = 1000;
  
  console.log('🔍 Finding all test users...');
  
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
  
  console.log(`   Found ${testUsers.length} existing test users\n`);
  return testUsers;
}

/**
 * Delete all test users
 */
async function deleteAllTestUsers(users) {
  if (users.length === 0) {
    console.log('✓ No existing test users to delete\n');
    return;
  }
  
  console.log(`🗑️  Deleting ${users.length} existing test users...`);
  
  let deleted = 0;
  let failed = 0;
  
  for (const user of users) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`   ❌ Failed to delete ${user.email}:`, error.message);
        failed++;
      } else {
        deleted++;
      }
    } catch (error) {
      console.error(`   ❌ Failed to delete ${user.email}:`, error.message);
      failed++;
    }
  }
  
  console.log(`   ✅ Deleted: ${deleted} users`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed} users`);
  }
  console.log('');
}

/**
 * Create a single test user
 */
async function createTestUser(index) {
  const email = `${TEST_EMAIL_PREFIX}-${index}@example.com`;
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        language: 'en',
        preferred_language: 'en',
        email_confirmed: true,
        email_verified: true
      }
    });
    
    if (error) {
      return { email, success: false, error: error.message };
    }
    
    return { email, success: true, id: data.user.id };
  } catch (error) {
    return { email, success: false, error: error.message };
  }
}

/**
 * Create all test users
 */
async function createAllTestUsers() {
  console.log(`👥 Creating ${NUM_TEST_USERS} fresh test users...\n`);
  
  const results = [];
  let created = 0;
  let failed = 0;
  
  // Create in batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  for (let i = 0; i < NUM_TEST_USERS; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && (i + j) < NUM_TEST_USERS; j++) {
      batch.push(createTestUser(i + j));
    }
    
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    batchResults.forEach(result => {
      if (result.success) {
        created++;
      } else {
        failed++;
        console.error(`   ❌ ${result.email}: ${result.error}`);
      }
    });
    
    const progress = Math.min(i + BATCH_SIZE, NUM_TEST_USERS);
    process.stdout.write(`\r   Progress: ${progress}/${NUM_TEST_USERS} users created...`);
    
    // Small delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n');
  console.log(`   ✅ Created: ${created} users`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed} users`);
  }
  console.log('');
  
  return results;
}

/**
 * Verify users can login
 */
async function verifyLogins(sampleSize = 10) {
  console.log(`🧪 Verifying login for ${sampleSize} sample users...\n`);
  
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const results = [];
  const testIndices = Array.from({ length: sampleSize }, (_, i) => 
    Math.floor(Math.random() * NUM_TEST_USERS)
  );
  
  for (const index of testIndices) {
    const email = `${TEST_EMAIL_PREFIX}-${index}@example.com`;
    
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });
    
    if (error) {
      console.log(`   ❌ ${email}: ${error.message}`);
      results.push({ email, success: false, error: error.message });
    } else if (data.session) {
      console.log(`   ✅ ${email}: Login successful`);
      await supabaseAnon.auth.signOut();
      results.push({ email, success: true });
    } else {
      console.log(`   ❌ ${email}: No session created`);
      results.push({ email, success: false, error: 'No session' });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n   Login verification: ${successCount}/${sampleSize} successful\n`);
  
  return successCount === sampleSize;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Recreating Test Users for Performance Testing\n');
  console.log(`Environment: ${SUPABASE_URL}\n`);
  
  try {
    // Step 1: Find existing test users
    const existingUsers = await findAllTestUsers();
    
    // Step 2: Delete all existing test users
    await deleteAllTestUsers(existingUsers);
    
    // Step 3: Wait briefly for deletion to propagate
    console.log('⏳ Waiting 10 seconds for deletion to propagate...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 4: Create fresh test users
    const creationResults = await createAllTestUsers();
    
    const successCount = creationResults.filter(r => r.success).length;
    
    if (successCount < NUM_TEST_USERS * 0.95) {
      console.log('❌ Creation failed for too many users. Aborting.');
      process.exit(1);
    }
    
    // Step 5: Wait for Supabase to fully process new users
    console.log('⏳ Waiting 30 seconds for Supabase to process new users...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Step 6: Verify logins work
    const allLoginsWork = await verifyLogins(10);
    
    if (!allLoginsWork) {
      console.log('⚠️  Some logins failed. Wait 5 minutes and try running verify-test-users.js');
      process.exit(1);
    }
    
    // Success
    console.log('✅ Test users recreated successfully!\n');
    console.log('📋 Test User Information:');
    console.log(`   Count: ${successCount} users`);
    console.log(`   Email pattern: ${TEST_EMAIL_PREFIX}-{0-${NUM_TEST_USERS-1}}@example.com`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log(`   All users are confirmed and ready for testing\n`);
    console.log('🚀 You can now run performance tests:\n');
    console.log('   TEST_API_KEY=perf-test-2024-uat k6 run tests/performance/auth-flow.js');
    console.log('   TEST_API_KEY=perf-test-2024-uat k6 run tests/performance/realistic-load-test.js\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('recreate-test-users.js')) {
  main();
}

export { findAllTestUsers, deleteAllTestUsers, createAllTestUsers, verifyLogins };
