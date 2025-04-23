import { createClient } from '@supabase/supabase-js';

// This script is for updating a user's role directly in the database
// Run this with: npx tsx src/scripts/updateUserRole.ts your@email.com service_owner

async function updateUserRole() {
  const email = process.argv[2];
  const role = process.argv[3] || 'service_owner';

  if (!email) {
    console.error('Please provide an email: npx tsx src/scripts/updateUserRole.ts your@email.com');
    process.exit(1);
  }

  // Create supabase client with service role key for admin access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // First, get the auth user ID
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (authError) {
      console.error('Error finding user in auth.users:', authError);
      process.exit(1);
    }
    
    if (!authUser) {
      console.error(`User with email ${email} not found in auth.users`);
      process.exit(1);
    }
    
    const userId = authUser.id;
    
    // Check if user exists in the public.users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing user:', checkError);
      process.exit(1);
    }
    
    // If user exists, update the role
    if (existingUser) {
      const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating user role:', error);
        process.exit(1);
      }
      
      console.log(`Successfully updated role for ${email} to ${role}`);
    } 
    // If user doesn't exist, create a new entry
    else {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            user_id: userId,
            email,
            role,
          }
        ]);
      
      if (error) {
        console.error('Error creating user with role:', error);
        process.exit(1);
      }
      
      console.log(`Successfully created user ${email} with role ${role}`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

updateUserRole(); 