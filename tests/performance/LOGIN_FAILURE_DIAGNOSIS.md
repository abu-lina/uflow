# Performance Test Login Failure Diagnosis

## Problem

The performance tests are failing with:
- **27.78% login success rate** (142 out of 511 attempts)
- **100% auth error rate** (369 errors)
- Error message: "Invalid email or password"

## Root Causes

The login failures are likely due to one or more of these issues:

1. **Users exist in `public.users` but NOT in `auth.users`** - The SQL export shows all 100 test users exist in the `public.users` table, but authentication happens through Supabase Auth (`auth.users`). These are separate systems.
2. **Test users aren't confirmed** - Users exist in Auth but emails aren't confirmed
3. **Password mismatch** - Users were created with different passwords
4. **Pagination bug** - Fixed in login route (auto-confirm now uses pagination)

**Important**: The `users_rows.sql` file shows users in the `public.users` table, but login requires users to exist in Supabase Auth (`auth.users`). These are different tables managed by different systems.

## Solution Steps

### Step 1: Check Auth Users vs Public Users

First, check if users exist in both `public.users` and `auth.users`:

```bash
cd /Users/NARAFIQ/Projects/uflow
node tests/performance/check-auth-users.js
```

This will show:
- How many test users exist in `public.users` (should be 100)
- How many test users exist in `auth.users` (Supabase Auth)
- Which users are missing in Auth
- Confirmation status
- Login test results for sample users

**Note**: The `users_rows.sql` file shows all 100 users exist in `public.users`, but they may not exist in `auth.users` where authentication actually happens.

### Step 2: Verify Test Users (Alternative)

You can also use the general verification script:

```bash
node tests/performance/verify-test-users.js
```

### Step 3: Create/Update Test Users

If users are missing or unconfirmed, run the setup script:

```bash
node tests/performance/setup-test-users.js
```

This will:
- Create 100 test users (test-user-0 through test-user-99)
- Confirm their emails
- Set password to `TestPassword123!`

### Step 4: Verify Again

After setup, verify again:

```bash
node tests/performance/verify-test-users.js
```

You should see:
- ✅ 100/100 users found
- ✅ All users confirmed
- ✅ All login tests passing

### Step 5: Run Performance Tests

Once users are verified, run the tests:

```bash
# Make sure TEST_API_KEY is set
export TEST_API_KEY=perf-test-2024-uat

# Run auth flow tests
k6 run tests/performance/auth-flow.js
```

## Expected Test User Configuration

- **Count**: 100 users
- **Email Pattern**: `test-user-{0-99}@example.com`
- **Password**: `TestPassword123!`
- **Status**: All confirmed and ready for login

## Code Changes Made

1. **Fixed pagination bug in login route** (`src/app/api/auth/login/route.ts`)
   - Auto-confirm logic now uses pagination to find users
   - Handles large user lists correctly

2. **Created verification script** (`tests/performance/verify-test-users.js`)
   - Checks if test users exist
   - Verifies confirmation status
   - Tests login for sample users

## Troubleshooting

### If verification shows users are missing:

```bash
# Clean up and recreate
node tests/performance/setup-test-users.js --cleanup
node tests/performance/setup-test-users.js
```

### If login still fails after setup:

1. Check that TEST_API_KEY is set correctly
2. Verify environment variables are loaded from `.env.uat`
3. Check UAT server logs for errors
4. Ensure Supabase service role key has admin permissions

### If you see "User not found" errors:

The login route's auto-confirm feature should handle this, but if it doesn't:
1. Check that users actually exist in Supabase
2. Verify the email format matches exactly
3. Check Supabase logs for authentication errors

## Next Steps

After fixing the test users:

1. ✅ Run verification script
2. ✅ Create/update test users if needed
3. ✅ Run performance tests
4. ✅ Monitor success rate (should be >98%)
