import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Replace with your Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create clients
const anonClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
let authClient: SupabaseClient<Database>; // Will be initialized after login

async function testRLS() {
  console.log('=== TESTING RLS POLICIES ===');
  
  // Test 1: Anonymous read (should work)
  console.log('\n1. Testing anonymous READ on profiles:');
  const { data: profilesData, error: profilesError } = await anonClient
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profilesError) {
    console.error('❌ Anonymous READ failed:', profilesError.message);
  } else {
    console.log('✅ Anonymous READ succeeded:', profilesData);
  }
  
  // Get a profile ID for testing
  const testProfileId = profilesData && profilesData.length > 0 
    ? profilesData[0].id 
    : 'no-profile-found';
  
  // Test 2: Anonymous update (should fail)
  console.log('\n2. Testing anonymous UPDATE on profiles:');
  const { data: updateData, error: updateError } = await anonClient
    .from('profiles')
    .update({ about: 'Anonymous test' })
    .eq('id', testProfileId)
    .select();
  
  if (updateError) {
    console.log('✅ Anonymous UPDATE correctly failed:', updateError.message);
  } else {
    console.error('❌ Anonymous UPDATE incorrectly succeeded:', updateData);
  }

  // Test 3: Login and authenticate
  console.log('\n3. Attempting to log in with test user:');
  // You'll need to replace these with real credentials
  const EMAIL = 'test@example.com';
  const PASSWORD = 'test-password';
  
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  
  if (authError) {
    console.error('❌ Authentication failed:', authError.message);
    console.log('Please create a test user with the provided credentials first.');
    return;
  }
  
  console.log('✅ Authentication succeeded for user:', authData.user?.id);
  
  // Create authenticated client
  authClient = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`
        }
      }
    }
  );
  
  // Test 4: Authenticated update of own profile (should work)
  console.log('\n4. Testing authenticated UPDATE on own profile:');
  const userId = authData.user?.id;
  
  if (userId) {
    const { data: ownUpdateData, error: ownUpdateError } = await authClient
      .from('profiles')
      .update({ about: 'Self update test' })
      .eq('id', userId)
      .select();
    
    if (ownUpdateError) {
      console.error('❌ Authenticated self-UPDATE failed:', ownUpdateError.message);
    } else {
      console.log('✅ Authenticated self-UPDATE succeeded:', ownUpdateData);
    }
  }
  
  // Test 5: Authenticated update of another profile (should fail)
  console.log('\n5. Testing authenticated UPDATE on another profile:');
  // Find a profile that's not the authenticated user
  const otherProfileId = profilesData && profilesData.length > 0 && profilesData[0].id !== userId
    ? profilesData[0].id
    : 'some-other-id';
  
  if (otherProfileId && otherProfileId !== 'some-other-id') {
    const { data: otherUpdateData, error: otherUpdateError } = await authClient
      .from('profiles')
      .update({ about: 'Other update test' })
      .eq('id', otherProfileId)
      .select();
    
    if (otherUpdateError) {
      console.log('✅ Authenticated UPDATE of another profile correctly failed:', otherUpdateError.message);
    } else {
      console.error('❌ Authenticated UPDATE of another profile incorrectly succeeded:', otherUpdateData);
    }
  } else {
    console.log('⚠️ Could not find another profile to test UPDATE on');
  }
  
  console.log('\n=== RLS TESTING COMPLETE ===');
}

testRLS().catch(error => {
  console.error('Test failed with error:', error);
}); 