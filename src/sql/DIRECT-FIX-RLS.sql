// Improved RLS testing script with better error handling and logging
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Replace with your Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create anonymous client
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
let authClient;

async function testRLS() {
  console.log('=== TESTING RLS POLICIES ===');
  console.log(`Using Supabase URL: ${supabaseUrl}`);
  
  try {
    // Test 1: Anonymous read
    console.log('\n1. Testing anonymous READ on profiles:');
    const { data: profilesData, error: profilesError } = await anonClient
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Anonymous READ failed:', profilesError.message);
      console.error('Error details:', JSON.stringify(profilesError));
    } else if (!profilesData || profilesData.length === 0) {
      console.warn('⚠️ Anonymous READ returned no results. Check if table has data.');
    } else {
      console.log(`✅ Anonymous READ succeeded. Found ${profilesData.length} profiles.`);
      console.log('First profile:', JSON.stringify(profilesData[0], null, 2));
    }
    
    // Get a profile ID for testing
    const testProfileId = profilesData && profilesData.length > 0 
      ? profilesData[0].id 
      : null;
    
    if (!testProfileId) {
      console.error('❌ Cannot proceed with further tests: No profile ID found');
      return;
    }
    
    // Test 2: Anonymous update (should fail according to RLS)
    console.log('\n2. Testing anonymous UPDATE on profiles:');
    console.log(`   Attempting to update profile with ID: ${testProfileId}`);
    
    const updateTimestamp = new Date().toISOString();
    const { data: updateData, error: updateError } = await anonClient
      .from('profiles')
      .update({ 
        bio: `Anonymous test at ${updateTimestamp}` 
      })
      .eq('id', testProfileId)
      .select();
    
    if (updateError) {
      console.log('✅ Anonymous UPDATE correctly failed:', updateError.message);
      console.log('Error code:', updateError.code);
    } else {
      console.error('❌ SECURITY ISSUE: Anonymous UPDATE succeeded!');
      console.error('Updated data:', JSON.stringify(updateData, null, 2));
    }

    // Test 3: Login and authenticate
    console.log('\n3. Attempting to log in with test user:');
    // Replace with real credentials
    const EMAIL = 'naveedinho@icloud.com'; 
    const PASSWORD = '1234567';
    
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.error('Error details:', JSON.stringify(authError, null, 2));
      console.log('Please verify the test user credentials.');
      return;
    }
    
    if (!authData || !authData.user || !authData.session) {
      console.error('❌ Authentication returned unexpected response format');
      console.log('Auth data:', JSON.stringify(authData, null, 2));
      return;
    }
    
    console.log('✅ Authentication succeeded for user:', authData.user.id);
    console.log('Session expires at:', new Date(authData.session.expires_at * 1000).toLocaleString());
    
    // Create authenticated client - simpler approach
    authClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Set the session
    const { error: sessionError } = await authClient.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    });
    
    if (sessionError) {
      console.error('❌ Failed to set session:', sessionError.message);
      return;
    }
    
    // Verify the session is active
    const { data: sessionData } = await authClient.auth.getSession();
    if (!sessionData || !sessionData.session) {
      console.error('❌ Session verification failed');
      return;
    }
    console.log('✅ Session successfully verified');
    
    // Test 4: Authenticated read of profiles
    console.log('\n4. Testing authenticated READ on profiles:');
    const { data: authProfilesData, error: authProfilesError } = await authClient
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (authProfilesError) {
      console.error('❌ Authenticated READ failed:', authProfilesError.message);
    } else {
      console.log(`✅ Authenticated READ succeeded. Found ${authProfilesData.length} profiles.`);
    }
    
    // Test 5: Authenticated update of own profile (should work)
    console.log('\n5. Testing authenticated UPDATE on own profile:');
    const userId = authData.user.id;
    
    // First, check if user has a profile
    const { data: userProfile, error: userProfileError } = await authClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userProfileError) {
      console.error('❌ Could not find profile for authenticated user:', userProfileError.message);
      
      // Try to create a profile
      console.log('   Attempting to create profile for user...');
      const { data: newProfile, error: createError } = await authClient
        .from('profiles')
        .insert([{ id: userId, bio: 'New test user' }])
        .select();
      
      if (createError) {
        console.error('❌ Profile creation failed:', createError.message);
        return;
      } else {
        console.log('✅ Profile created for authenticated user');
      }
    } else {
      console.log('✅ Found existing profile for authenticated user:', userProfile.id);
    }
    
    // Now try to update the profile
    const selfUpdateTimestamp = new Date().toISOString();
    const { data: ownUpdateData, error: ownUpdateError } = await authClient
      .from('profiles')
      .update({ 
        bio: `Self update test at ${selfUpdateTimestamp}` 
      })
      .eq('id', userId)
      .select();
    
    if (ownUpdateError) {
      console.error('❌ Authenticated self-UPDATE failed:', ownUpdateError.message);
      console.error('Error details:', JSON.stringify(ownUpdateError, null, 2));
    } else {
      console.log('✅ Authenticated self-UPDATE succeeded');
      console.log('Updated profile:', JSON.stringify(ownUpdateData, null, 2));
    }
    
    // Test 6: Authenticated update of another profile (should fail)
    console.log('\n6. Testing authenticated UPDATE on another profile:');
    // Find a profile that's not the authenticated user
    let otherProfileId = null;
    
    if (profilesData && profilesData.length > 0) {
      for (const profile of profilesData) {
        if (profile.id !== userId) {
          otherProfileId = profile.id;
          break;
        }
      }
    }
    
    if (!otherProfileId) {
      console.log('⚠️ Could not find another profile to test UPDATE on');
    } else {
      console.log(`   Attempting to update profile with ID: ${otherProfileId}`);
      
      const otherUpdateTimestamp = new Date().toISOString();
      const { data: otherUpdateData, error: otherUpdateError } = await authClient
        .from('profiles')
        .update({ 
          bio: `Other update test at ${otherUpdateTimestamp}` 
        })
        .eq('id', otherProfileId)
        .select();
      
      if (otherUpdateError) {
        console.log('✅ Authenticated UPDATE of another profile correctly failed:', otherUpdateError.message);
      } else {
        console.error('❌ SECURITY ISSUE: Authenticated UPDATE of another profile succeeded!');
        console.error('Updated data:', JSON.stringify(otherUpdateData, null, 2));
      }
    }
    
    // Test 7: Verify RLS is actually enabled
    console.log('\n7. Testing if RLS is enabled on the profiles table:');
    try {
      // This is a direct SQL query that will fail if RLS is enabled
      // and succeed if RLS is disabled
      const { data: rlsData, error: rlsError } = await authClient.rpc('check_rls_enabled', { table_name: 'profiles' });
      
      if (rlsError) {
        console.error('❌ RLS check failed:', rlsError.message);
        console.log('Note: This could be because the check_rls_enabled function is not defined.');
      } else if (rlsData === true) {
        console.log('✅ RLS is enabled on the profiles table');
      } else {
        console.error('❌ SECURITY ISSUE: RLS appears to be disabled on the profiles table!');
      }
    } catch (err) {
      console.log('ℹ️ Could not perform RLS check, function may not exist:', err.message);
      console.log('   You can create this function in SQL:');
      console.log(`
      create or replace function check_rls_enabled(table_name text)
      returns boolean as $$
      declare
        policies int;
      begin
        select count(*) into policies from pg_policies where schemaname = 'public' and tablename = table_name;
        return policies > 0;
      end;
      $$ language plpgsql security definer;
      `);
    }
    
    // Logout test
    console.log('\n8. Testing logout:');
    const { error: logoutError } = await authClient.auth.signOut();
    
    if (logoutError) {
      console.error('❌ Logout failed:', logoutError.message);
    } else {
      console.log('✅ Logout succeeded');
      
      // Verify we can't perform authenticated operations after logout
      const { data: postLogoutData, error: postLogoutError } = await authClient
        .from('profiles')
        .update({ bio: 'Post-logout test' })
        .eq('id', userId)
        .select();
      
      if (postLogoutError) {
        console.log('✅ Post-logout update correctly failed:', postLogoutError.message);
      } else {
        console.error('❌ SECURITY ISSUE: Update succeeded after logout!');
        console.error('Updated data:', JSON.stringify(postLogoutData, null, 2));
      }
    }
    
  } catch (error) {
    console.error('\n❌ Unexpected error during tests:', error.message);
    console.error(error);
  }
  
  console.log('\n=== RLS TESTING COMPLETE ===');
}

// Function to create the check_rls_enabled function if needed
async function setupHelperFunctions() {
  try {
    console.log('Setting up helper functions...');
    
    // Create an admin client (use service role key for this - be careful!)
    // Note: This should be used only in development environments
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminKey) {
      console.log('No service role key found. Skipping helper function setup.');
      return;
    }
    
    const adminClient = createClient(supabaseUrl, adminKey);
    
    // Login first to get admin privileges
    const { error: authError } = await adminClient.auth.signInWithPassword({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    if (authError) {
      console.error('Admin authentication failed:', authError.message);
      return;
    }
    
    // Create the RLS check function
    const { error } = await adminClient.rpc('create_rls_check_function');
    
    if (error) {
      console.error('Failed to create helper function:', error.message);
    } else {
      console.log('Helper functions created successfully.');
    }
  } catch (error) {
    console.error('Error setting up helper functions:', error.message);
  }
}

// Uncomment to setup helper functions
// setupHelperFunctions().then(() => {
//   testRLS().catch(error => {
//     console.error('Test failed with error:', error);
//   });
// });

// Run the tests
testRLS().catch(error => {
  console.error('Test failed with error:', error);
});