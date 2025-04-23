// Node.js script to verify RLS policies are working correctly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use environment variables or provide directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pmbatjlosstytdmmqkky.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // shortened for security

console.log('=== TESTING RLS POLICIES DIRECTLY FROM NODE.JS ===');
console.log('This bypasses any browser/Next.js specific issues\n');

async function verifyRlsPolicies() {
  try {
    // Create a fresh anonymous client with no auth
    console.log('1. Creating a fresh anonymous client with explicit headers removal');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: '' // Explicitly empty to ensure anonymity
        }
      }
    });

    // First test anonymous read (should be allowed)
    console.log('\n2. Testing anonymous READ on profiles');
    const { data: readData, error: readError } = await anonClient
      .from('profiles')
      .select('*')
      .limit(1);

    if (readError) {
      console.error('❌ Anonymous READ failed:', readError.message);
    } else {
      console.log('✅ Anonymous READ succeeded:', readData.length > 0 ? 'Found profiles' : 'No profiles found');
    }

    // Test anonymous update (should be blocked)
    console.log('\n3. Testing anonymous UPDATE on profiles');
    console.log('   This should be BLOCKED by RLS and produce a permission denied error');
    
    // Use a non-existent ID to ensure we're not actually changing data
    const testId = '00000000-0000-0000-0000-000000000000';
    
    const { data: updateData, error: updateError } = await anonClient
      .from('profiles')
      .update({ full_name: 'Anonymous Test' })
      .eq('id', testId)
      .select();

    if (updateError) {
      if (updateError.code === 'PGRST301' || updateError.message.includes('permission denied')) {
        console.log('✅ RLS correctly blocked anonymous update with error:');
        console.log(`   Code: ${updateError.code}`);
        console.log(`   Message: ${updateError.message}`);
      } else {
        console.warn('⚠️ Anonymous update failed, but not due to RLS:');
        console.warn(`   Code: ${updateError.code}`);
        console.warn(`   Message: ${updateError.message}`);
      }
    } else {
      console.error('❌ SECURITY ISSUE: Anonymous update did not produce an error!');
      console.error('   Update data:', updateData);
    }

    // Verify RLS is enabled for the table
    console.log('\n4. Verifying RLS is enabled for profiles table');
    const { data: rlsData, error: rlsError } = await anonClient.rpc('admin_check_rls', { table_name: 'profiles' });
    
    if (rlsError) {
      console.log('⚠️ Could not verify RLS status (expected if function doesn\'t exist):', rlsError.message);
    } else if (rlsData) {
      console.log('✅ RLS verification result:', rlsData);
    }

    console.log('\n=== RLS VERIFICATION COMPLETED ===');
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the verification
verifyRlsPolicies(); 