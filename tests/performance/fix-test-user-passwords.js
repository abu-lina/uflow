/**
 * Fix Test User Passwords Script
 * 
 * Resets passwords for all test users to ensure they match the expected password.
 * This fixes password mismatches that cause login failures.
 * 
 * Usage:
 *   node tests/performance/fix-test-user-passwords.js
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
const TEST_PASSWORD = 'TestPassword123!';
const TEST_EMAIL_PREFIX = 'test-user';
const NUM_TEST_USERS = 100;

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
 * Find user by email using pagination
 */
async function findUserByEmail(email) {
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
    
    const user = data.users.find(u => u.email === email);
    if (user) {
      return user;
    }
    
    if (data.users.length < perPage) {
      return null;
    }
    
    page++;
  }
}

/**
 * Reset password for a user
 */
async function resetPassword(email) {
  try {
    const user = await findUserByEmail(email);
    
    if (!user) {
      return { email, success: false, error: 'User not found' };
    }
    
    // Update password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true, // Ensure email is confirmed
      user_metadata: {
        ...(user.user_metadata || {}),
        email_confirmed: true,
        language: 'en',
        preferred_language: 'en'
      }
    });
    
    if (error) {
      return { email, success: false, error: error.message };
    }
    
    return { email, success: true, id: user.id };
  } catch (error) {
    return { email, success: false, error: error.message };
  }
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
 * Main function
 */
async function fixPasswords() {
  console.log('🔧 Fixing Test User Passwords\n');
  console.log(`Environment: ${SUPABASE_URL}\n`);
  
  // Generate all test user emails
  const testEmails = Array.from({ length: NUM_TEST_USERS }, (_, i) => 
    `${TEST_EMAIL_PREFIX}-${i}@example.com`
  );
  
  console.log(`📝 Resetting passwords for ${NUM_TEST_USERS} test users...\n`);
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  for (let i = 0; i < testEmails.length; i += BATCH_SIZE) {
    const batch = testEmails.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(email => resetPassword(email)));
    results.push(...batchResults);
    
    batchResults.forEach(result => {
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`   ❌ ${result.email}: ${result.error}`);
      }
    });
    
    const progress = Math.min(i + BATCH_SIZE, testEmails.length);
    process.stdout.write(`\r   Progress: ${progress}/${testEmails.length} users processed...`);
  }
  
  console.log('\n');
  console.log(`   ✅ Success: ${successCount} users`);
  console.log(`   ❌ Failed: ${failCount} users\n`);
  
  // Test login for a sample
  console.log('🧪 Testing login for sample users...\n');
  const sampleEmails = testEmails.slice(0, Math.min(5, testEmails.length));
  const loginResults = [];
  
  for (const email of sampleEmails) {
    const result = await testLogin(email, TEST_PASSWORD);
    loginResults.push({ email, ...result });
    
    if (result.success) {
      console.log(`   ✅ ${email}: Login successful`);
    } else {
      console.log(`   ❌ ${email}: ${result.error}`);
    }
  }
  
  const successfulLogins = loginResults.filter(r => r.success).length;
  console.log(`\n   Login test: ${successfulLogins}/${sampleEmails.length} successful\n`);
  
  // Summary
  if (successCount >= NUM_TEST_USERS * 0.9 && successfulLogins === sampleEmails.length) {
    console.log('✅ Password reset completed successfully!');
    console.log(`\nAll test users should now be able to login with password: ${TEST_PASSWORD}`);
  } else {
    console.log('⚠️  Password reset completed with warnings');
    if (failCount > 0) {
      console.log(`   ${failCount} users failed to update`);
    }
    if (successfulLogins < sampleEmails.length) {
      console.log(`   Some users still cannot login`);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('fix-test-user-passwords.js')) {
  fixPasswords().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { fixPasswords, resetPassword };
