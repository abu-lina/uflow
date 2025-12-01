/**
 * Test Data Setup Script
 * 
 * Prepares UAT environment for performance testing:
 * - Create test users (for auth tests)
 * - Seed provider data (for browsing tests)
 * - Set up admin accounts
 * - Clean up after tests (optional)
 * 
 * This is a Node.js script (not k6) that should be run before performance tests
 * 
 * Usage:
 *   node tests/performance/setup-test-data.js [--cleanup]
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
dotenv.config({ path: envFile });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  console.error('\nPlease set these in .env.uat file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test user configuration
const TEST_USERS = [
  {
    email: 'perf-test-1@ummahflow.com',
    password: 'PerfTest123!',
    role: 'user',
  },
  {
    email: 'perf-test-2@ummahflow.com',
    password: 'PerfTest123!',
    role: 'user',
  },
  {
    email: 'perf-test-3@ummahflow.com',
    password: 'PerfTest123!',
    role: 'user',
  },
  {
    email: 'perf-admin@ummahflow.com',
    password: 'PerfAdmin123!',
    role: 'admin',
  },
];

/**
 * Create test users
 */
async function createTestUsers() {
  console.log('📝 Creating test users...');
  const createdUsers = [];

  for (const user of TEST_USERS) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`   ⚠️  User ${user.email} already exists, skipping`);
          continue;
        }
        throw error;
      }

      createdUsers.push({ ...user, id: data.user.id });
      console.log(`   ✅ Created user: ${user.email}`);
    } catch (error) {
      console.error(`   ❌ Failed to create user ${user.email}:`, error.message);
    }
  }

  // Set admin role if needed
  for (const user of createdUsers) {
    if (user.role === 'admin') {
      try {
        // Update user metadata to mark as admin
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { role: 'admin' },
        });
        console.log(`   ✅ Set admin role for: ${user.email}`);
      } catch (error) {
        console.error(`   ⚠️  Failed to set admin role:`, error.message);
      }
    }
  }

  return createdUsers;
}

/**
 * Seed provider data for browsing tests
 */
async function seedProviderData() {
  console.log('📦 Seeding provider data...');
  
  // Check if providers already exist
  const { data: existingProviders, error: checkError } = await supabase
    .from('providers')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('   ❌ Failed to check existing providers:', checkError.message);
    return;
  }

  if (existingProviders && existingProviders.length > 0) {
    console.log('   ℹ️  Provider data already exists, skipping seed');
    return;
  }

  // Create sample providers
  const sampleProviders = [
    {
      name_de: 'Test Moschee 1',
      name_en: 'Test Mosque 1',
      description_de: 'Test description for performance testing',
      description_en: 'Test description for performance testing',
      category_id: 1, // Adjust based on your categories
      city: 'Frankfurt',
      review_status: 'approved',
    },
    {
      name_de: 'Test Moschee 2',
      name_en: 'Test Mosque 2',
      description_de: 'Test description for performance testing',
      description_en: 'Test description for performance testing',
      category_id: 1,
      city: 'Berlin',
      review_status: 'approved',
    },
  ];

  try {
    const { data, error } = await supabase
      .from('providers')
      .insert(sampleProviders)
      .select();

    if (error) throw error;

    console.log(`   ✅ Created ${data.length} test providers`);
    return data;
  } catch (error) {
    console.error('   ❌ Failed to seed provider data:', error.message);
    return null;
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  // Delete test users
  for (const user of TEST_USERS) {
    try {
      // First, get user by email
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error(`   ⚠️  Failed to list users:`, listError.message);
        continue;
      }

      const testUser = users.users.find(u => u.email === user.email);
      if (testUser) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(testUser.id);
        if (deleteError) {
          console.error(`   ⚠️  Failed to delete user ${user.email}:`, deleteError.message);
        } else {
          console.log(`   ✅ Deleted user: ${user.email}`);
        }
      }
    } catch (error) {
      console.error(`   ⚠️  Error cleaning up user ${user.email}:`, error.message);
    }
  }

  // Delete test providers (optional - be careful in production!)
  try {
    const { error } = await supabase
      .from('providers')
      .delete()
      .like('name_de', 'Test%');

    if (error) {
      console.error('   ⚠️  Failed to delete test providers:', error.message);
    } else {
      console.log('   ✅ Deleted test providers');
    }
  } catch (error) {
    console.error('   ⚠️  Error cleaning up providers:', error.message);
  }
}

/**
 * Verify setup
 */
async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  let allGood = true;

  // Check users
  for (const user of TEST_USERS) {
    try {
      const { data: users, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      
      const exists = users.users.some(u => u.email === user.email);
      if (exists) {
        console.log(`   ✅ User exists: ${user.email}`);
      } else {
        console.log(`   ❌ User missing: ${user.email}`);
        allGood = false;
      }
    } catch (error) {
      console.error(`   ❌ Failed to verify user ${user.email}:`, error.message);
      allGood = false;
    }
  }

  // Check providers
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('id')
      .limit(1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('   ✅ Provider data exists');
    } else {
      console.log('   ⚠️  No provider data found (this is OK if you plan to seed)');
    }
  } catch (error) {
    console.error('   ⚠️  Failed to verify providers:', error.message);
  }

  return allGood;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup');
  const shouldVerify = args.includes('--verify') || !shouldCleanup;

  console.log('🚀 Test Data Setup for UAT Performance Testing\n');
  console.log(`Environment: ${SUPABASE_URL}\n`);

  if (shouldCleanup) {
    await cleanupTestData();
    console.log('\n✅ Cleanup completed');
    return;
  }

  // Create test users
  const users = await createTestUsers();
  console.log('');

  // Seed provider data
  await seedProviderData();
  console.log('');

  // Verify setup
  if (shouldVerify) {
    const verified = await verifySetup();
    console.log('');
    
    if (verified) {
      console.log('✅ Setup completed successfully!');
      console.log('\nTest users created:');
      TEST_USERS.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    } else {
      console.log('⚠️  Setup completed with warnings');
      process.exit(1);
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { createTestUsers, seedProviderData, cleanupTestData, verifySetup };




