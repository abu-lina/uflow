# RLS Testing Script

This script helps you test Row Level Security (RLS) policies for your Supabase database outside of the SQL Editor.

## Prerequisites

1. Make sure you have Node.js installed
2. Install the required dependencies:
   ```
   npm install @supabase/supabase-js dotenv
   ```

## Configuration

1. Create a `.env` file in your project root with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. Edit the `test-rls.js` file to update the test user credentials:
   ```javascript
   const EMAIL = 'test@example.com'; // Change to a real user email
   const PASSWORD = 'test-password'; // Change to the real password
   ```

## Running the Test

Run the script with:

```
node src/script/test-rls.js
```

## What This Tests

The script performs the following tests:

1. **Anonymous Read Access**: Tests if anonymous users can read profiles
2. **Anonymous Update Restriction**: Tests if anonymous users are blocked from updating profiles
3. **Authentication**: Logs in with a test user
4. **Self-Update Permission**: Tests if an authenticated user can update their own profile
5. **Cross-User Update Restriction**: Tests if an authenticated user is blocked from updating someone else's profile

## Expected Results

If your RLS policies are working correctly:

- Test 1 (Anonymous Read): ✅ Success
- Test 2 (Anonymous Update): ✅ Failure with permission error
- Test 3 (Authentication): ✅ Success
- Test 4 (Self-Update): ✅ Success
- Test 5 (Cross-User Update): ✅ Failure with permission error

## Troubleshooting

If tests aren't behaving as expected:

1. Make sure you've run the `FIX-RLS.sql` script to strengthen your RLS policies
2. Check if RLS is enabled on your tables: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
3. Verify your policies exist by checking the `pg_policies` table in Supabase SQL Editor

## Next Steps

After confirming your RLS policies work correctly:

1. Apply these same principles to any other tables in your database
2. Always test through your application's API to ensure security works as expected 