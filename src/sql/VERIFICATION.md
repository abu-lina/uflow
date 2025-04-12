# Verifying Your uflow Database Schema

This guide will help you verify that your database schema has been set up correctly after running the SQL script.

## Step 1: Run the Schema SQL

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `uflow-schema.sql` into the editor
4. Run the script

## Step 2: Verify Tables

From the Supabase dashboard, go to the Table Editor and confirm the following tables exist:
- profiles
- businesses
- services
- views
- bookmarks

## Step 3: Verify Types

In the SQL Editor, run the following to check that custom types were created:
```sql
SELECT typname, typcategory FROM pg_type WHERE typname IN ('user_role', 'service_status', 'service_category');
```

You should see three rows confirming the custom ENUM types were created.

## Step 4: Test the Trigger Function

1. Create a new user through the Supabase Auth interface
2. Check if a corresponding profile was automatically created:

```sql
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
```

## Step 5: Verify Row Level Security

### IMPORTANT: Using the Correct Auth Mode

To properly test RLS, you need to:
1. In the SQL Editor, find the dropdown in the top-right corner (likely set to "Service Role")
2. Change it to "Anonymous" to test as an anonymous user
3. Change it to "User" and enter a user ID to test as that user

### Test Profile Policies

As an anonymous user (set dropdown to "Anonymous"):
```sql
-- This should work (read is allowed for everyone):
SELECT * FROM profiles LIMIT 1;

-- This should FAIL (anonymous users cannot update):
UPDATE profiles SET bio = 'Test bio' WHERE id = 'any-user-id';
```

As an authenticated user (set dropdown to "User" with a specific user ID):
```sql
-- This should work for your own profile:
UPDATE profiles SET bio = 'Test bio' WHERE id = 'your-user-id-here';

-- This should FAIL for another user's profile:
UPDATE profiles SET bio = 'Test bio' WHERE id = 'different-user-id';
```

### Alternative RLS Testing Method

If the dropdown method doesn't work correctly, you can test RLS with SQL commands:

```sql
-- Test as anonymous user:
SET request.jwt.claim.role = 'anon';
SET request.jwt.claim.sub = '';
UPDATE profiles SET bio = 'Anonymous test' WHERE id = 'any-user-id';
-- This should fail

-- Test as authenticated user:
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = 'your-user-id-here';
UPDATE profiles SET bio = 'Auth test' WHERE id = 'your-user-id-here';
-- This should succeed

-- Test updating another user's profile:
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = 'your-user-id-here';
UPDATE profiles SET bio = 'Auth test other' WHERE id = 'different-user-id';
-- This should fail
```

### Test Business Policies

Create a business as an authenticated user:

```sql
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = 'your-user-id-here';

INSERT INTO businesses (owner_id, name, description) 
VALUES ('your-user-id-here', 'Test Business', 'A test business');
```

This should only work if:
1. You're authenticated
2. The authenticated user has a role of 'business_owner' or 'admin' in the profiles table

## Step 6: Test View Count Mechanism

1. Insert a view for a business:
```sql
INSERT INTO views (user_id, viewable_id, viewable_type) 
VALUES ('your-user-id-here', 'a-business-id', 'business');
```

2. Check if the view_count was incremented:
```sql
SELECT view_count FROM businesses WHERE id = 'a-business-id';
```

The count should have increased by 1.

## Step 7: Test Polymorphic Relationship

Insert a bookmark:
```sql
INSERT INTO bookmarks (user_id, bookmarkable_id, bookmarkable_type)
VALUES ('your-user-id-here', 'a-business-id', 'business');
```

Try inserting a duplicate bookmark (should fail due to unique constraint):
```sql
INSERT INTO bookmarks (user_id, bookmarkable_id, bookmarkable_type)
VALUES ('your-user-id-here', 'a-business-id', 'business');
```

## Checking RLS Policies

To verify what RLS policies are in place:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'profiles';
```

## Common Issues

1. **Permission Denied Errors**: Ensure you've properly set up RLS and are authenticated when running test queries.
2. **Missing Auth Schema**: Make sure you're using Supabase, not a raw PostgreSQL database.
3. **Duplicate Key Violations**: When testing, you might hit unique constraints. Use new UUIDs each time.
4. **Type Doesn't Exist**: If you see this error, some parts of the script failed to run. Check the SQL Editor logs.
5. **RLS Bypass**: The SQL Editor may bypass RLS unless you explicitly set the role as shown above.

## Fixing RLS Issues

If you find that anonymous users can still update profiles, run the `FIX-RLS.sql` script to strengthen the RLS policies.

## Next Steps

After verifying your schema works correctly, you can:
1. Set up initial test data
2. Connect your application to use these tables
3. Implement API endpoints that respect the RLS policies 