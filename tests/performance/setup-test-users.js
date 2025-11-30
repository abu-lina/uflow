/**
 * Test User Setup Script for Performance Tests
 * 
 * Creates 100 confirmed test users for authentication performance testing.
 * These users are used by the auth-flow.js test script.
 * 
 * Usage:
 *   node tests/performance/setup-test-users.js
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

// Number of test users to create
const NUM_TEST_USERS = 100;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_EMAIL_PREFIX = 'test-user';

/**
 * Generate test user email
 */
function generateTestEmail(index) {
  return `${TEST_EMAIL_PREFIX}-${index}@example.com`;
}

/**
 * Create a single test user
 */
async function createTestUser(index) {
  const email = generateTestEmail(index);
  
  try {
    // Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      // User exists, ensure it's confirmed
      if (!existingUser.email_confirmed_at || existingUser.user_metadata?.email_confirmed !== true) {
        await supabase.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
          user_metadata: {
            email_confirmed: true,
            language: 'en',
            preferred_language: 'en'
          }
        });
        return { email, id: existingUser.id, created: false, confirmed: true };
      }
      return { email, id: existingUser.id, created: false, confirmed: false };
    }
    
    // Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: {
        language: 'en',
        preferred_language: 'en',
        email_confirmed: true
      }
    });
    
    if (error) {
      throw error;
    }
    
    return { email, id: data.user.id, created: true, confirmed: true };
  } catch (error) {
    console.error(`   ❌ Failed to create user ${email}:`, error.message);
    return { email, id: null, created: false, confirmed: false, error: error.message };
  }
}

/**
 * Create all test users
 */
async function createAllTestUsers() {
  console.log(`📝 Creating ${NUM_TEST_USERS} test users...\n`);
  
  const results = [];
  let created = 0;
  let existing = 0;
  let failed = 0;
  
  // Create users in batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  for (let i = 0; i < NUM_TEST_USERS; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && (i + j) < NUM_TEST_USERS; j++) {
      batch.push(createTestUser(i + j));
    }
    
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    // Update counters
    batchResults.forEach(result => {
      if (result.error) {
        failed++;
      } else if (result.created) {
        created++;
      } else {
        existing++;
      }
    });
    
    // Progress indicator
    const progress = Math.min(i + BATCH_SIZE, NUM_TEST_USERS);
    process.stdout.write(`\r   Progress: ${progress}/${NUM_TEST_USERS} users processed...`);
  }
  
  console.log('\n');
  console.log(`   ✅ Created: ${created} users`);
  console.log(`   ℹ️  Existing: ${existing} users`);
  console.log(`   ❌ Failed: ${failed} users`);
  
  return results;
}

/**
 * Clean up old test users
 */
async function cleanupOldTestUsers() {
  console.log('🧹 Cleaning up old test users...\n');
  
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      throw error;
    }
    
    const testUsers = users.filter(u => 
      u.email && u.email.startsWith(`${TEST_EMAIL_PREFIX}-`) && u.email.endsWith('@example.com')
    );
    
    let deleted = 0;
    for (const user of testUsers) {
      try {
        await supabase.auth.admin.deleteUser(user.id);
        deleted++;
      } catch (error) {
        console.error(`   ⚠️  Failed to delete ${user.email}:`, error.message);
      }
    }
    
    console.log(`   ✅ Deleted ${deleted} old test users\n`);
  } catch (error) {
    console.error('   ❌ Failed to cleanup:', error.message);
  }
}

/**
 * Export test user credentials for use in tests
 */
function exportTestUsers(results) {
  const validUsers = results.filter(r => r.id && !r.error);
  
  const credentials = validUsers.map((r, index) => ({
    email: r.email,
    password: TEST_PASSWORD,
    index: index
  }));
  
  console.log('📋 Test User Credentials:');
  console.log(`   Total valid users: ${validUsers.length}`);
  console.log(`   Email pattern: ${TEST_EMAIL_PREFIX}-{0-${validUsers.length - 1}}@example.com`);
  console.log(`   Password: ${TEST_PASSWORD}`);
  console.log('\n   First 5 users:');
  credentials.slice(0, 5).forEach(cred => {
    console.log(`     - ${cred.email}`);
  });
  
  return credentials;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup');
  
  console.log('🚀 Test User Setup for Performance Testing\n');
  console.log(`Environment: ${SUPABASE_URL}\n`);
  
  if (shouldCleanup) {
    await cleanupOldTestUsers();
    console.log('✅ Cleanup completed');
    return;
  }
  
  // Create test users
  const results = await createAllTestUsers();
  console.log('');
  
  // Export credentials
  const credentials = exportTestUsers(results);
  console.log('');
  
  // Summary
  const successCount = results.filter(r => r.id && !r.error).length;
  if (successCount >= NUM_TEST_USERS * 0.9) {
    console.log('✅ Setup completed successfully!');
    console.log(`\nYou can now run performance tests with ${successCount} test users available.`);
  } else {
    console.log('⚠️  Setup completed with warnings');
    console.log(`   Only ${successCount}/${NUM_TEST_USERS} users available`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('setup-test-users.js')) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { createAllTestUsers, cleanupOldTestUsers, generateTestEmail, TEST_PASSWORD, TEST_EMAIL_PREFIX };


