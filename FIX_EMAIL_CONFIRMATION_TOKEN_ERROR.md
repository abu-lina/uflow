# Fix: Email Confirmation Token 500 Error

## 🔍 Problem

The signup flow is failing with a 500 error when calling `/api/generate-confirmation-token`:

```
POST http://localhost:3001/api/generate-confirmation-token
[HTTP/1.1 500 Internal Server Error]
```

**Root Cause**: The `email_confirmation_tokens` table doesn't exist in the database.

---

## ✅ Solution

Apply the database migration to create the required table.

---

## 📋 Steps to Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration**
   - Copy the contents of `create-email-confirmation-tokens-table.sql`
   - Paste into the SQL editor
   - Click "Run" or press `Cmd/Ctrl + Enter`

4. **Verify Table Creation**
   ```sql
   SELECT * FROM public.email_confirmation_tokens LIMIT 1;
   ```
   - Should return: "No rows found" (table exists but is empty)

---

### Option 2: Using Supabase CLI

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Link to Your Project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Run the Migration**
   ```bash
   supabase db push --include-all
   ```

---

### Option 3: Manual SQL Execution

```sql
-- Create email confirmation tokens table
CREATE TABLE IF NOT EXISTS public.email_confirmation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('signup', 'password_reset')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_token 
  ON public.email_confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_user_id 
  ON public.email_confirmation_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_email 
  ON public.email_confirmation_tokens(email);

-- Enable RLS
ALTER TABLE public.email_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "Service role can manage tokens" 
  ON public.email_confirmation_tokens
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.email_confirmation_tokens 
  WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql;
```

---

## 🧪 Test the Fix

1. **Try to signup with a new email**
   - Go to: http://localhost:3001/signup
   - Fill in the form
   - Click "Registrieren"

2. **Check the logs**
   - You should see in the terminal:
     ```
     [TOKEN] Generation request: { userId: '...', email: '...', type: 'signup' }
     [TOKEN] Attempting to store token in database
     [TOKEN] Token generated successfully
     ```

3. **Verify the token in database**
   ```sql
   SELECT * FROM public.email_confirmation_tokens 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

4. **Check your email**
   - You should receive a confirmation email with a link

---

## 🔍 Debugging

If you still see errors after applying the migration, check the server logs for detailed error messages:

### Expected Log Output (Success):
```
[TOKEN] Generation request: { userId: '68ebf2b9-...', email: 'test@example.com', type: 'signup' }
[TOKEN] Attempting to store token in database
[TOKEN] Token generated successfully
```

### Possible Error Messages:

#### 1. "Missing Supabase credentials"
```
[TOKEN] Missing Supabase credentials
```
**Fix**: Check your `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 2. "relation does not exist"
```
[TOKEN] Database error: { message: 'relation "public.email_confirmation_tokens" does not exist' }
```
**Fix**: Table not created. Re-run the migration SQL.

#### 3. "permission denied"
```
[TOKEN] Database error: { message: 'permission denied for table email_confirmation_tokens' }
```
**Fix**: Check that RLS policy exists and service role has access.

#### 4. "duplicate key value violates unique constraint"
```
[TOKEN] Database error: { message: 'duplicate key value violates unique constraint "email_confirmation_tokens_token_key"' }
```
**Fix**: This is unlikely (token is randomly generated), but if it happens, the user can try again.

---

## 📊 Verify Everything Works

### 1. Test Signup Flow
```bash
# 1. Sign up with new email
# 2. Check console logs - no errors
# 3. Check database - token exists
# 4. Check email - confirmation email received
```

### 2. Verify Database State
```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_confirmation_tokens';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'email_confirmation_tokens';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'email_confirmation_tokens';

-- Check policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'email_confirmation_tokens';
```

### 3. Test Token Cleanup
```sql
-- Manually test cleanup function
SELECT cleanup_expired_tokens();

-- Check expired tokens are deleted
SELECT COUNT(*) 
FROM public.email_confirmation_tokens 
WHERE expires_at < NOW() AND used = FALSE;
-- Should return: 0
```

---

## 🎯 Expected Behavior After Fix

1. ✅ User signs up
2. ✅ Token is generated and stored in database
3. ✅ Confirmation email is sent via Resend
4. ✅ User is redirected to `/auth/check-email` page
5. ✅ User clicks link in email
6. ✅ Token is validated and marked as used
7. ✅ User's `email_confirmed` metadata is set to `true`
8. ✅ User can now log in successfully

---

## 🔐 Security Notes

- ✅ **Tokens are cryptographically secure**: Generated using `crypto.randomBytes(32)`
- ✅ **Tokens expire after 24 hours**: Enforced via `expires_at` timestamp
- ✅ **Tokens are single-use**: Marked as `used` after confirmation
- ✅ **Row Level Security (RLS) enabled**: Only service role can access
- ✅ **Automatic cleanup**: `cleanup_expired_tokens()` function available
- ✅ **Indexed for performance**: Fast lookups by token, user_id, and email

---

## 📝 Related Files

- **Migration**: `create-email-confirmation-tokens-table.sql`
- **API Route**: `src/app/api/generate-confirmation-token/route.ts`
- **Signup Flow**: `src/lib/auth.ts` (signUpWithLanguage)
- **Confirmation**: `src/app/api/confirm-email/route.ts`
- **Check Email Page**: `src/app/auth/check-email/page.tsx`

---

## ✅ Checklist

Before considering the issue fixed:

- [ ] Migration SQL executed successfully
- [ ] Table `email_confirmation_tokens` exists in database
- [ ] Indexes created (check pg_indexes)
- [ ] RLS enabled (check pg_tables)
- [ ] Service role policy exists (check pg_policies)
- [ ] Signup flow works without 500 error
- [ ] Token appears in database after signup
- [ ] Confirmation email is sent
- [ ] Confirmation link works
- [ ] User can log in after confirmation

---

## 🆘 Still Having Issues?

### Check Environment Variables
```bash
# Verify .env.local has correct values
cat .env.local | grep SUPABASE
```

### Check Database Connection
```sql
-- Test if you can connect to the database
SELECT current_user, current_database();
```

### Check Service Role Key
```sql
-- Verify service role has correct permissions
SELECT rolname, rolsuper, rolinherit 
FROM pg_roles 
WHERE rolname = 'service_role';
```

### Enable More Detailed Logging
The API route now has comprehensive logging. Check your server console for:
- `[TOKEN] Generation request:`
- `[TOKEN] Attempting to store token in database`
- `[TOKEN] Database error:` (if error occurs)
- `[TOKEN] Token generated successfully`

---

**Issue**: 500 error on `/api/generate-confirmation-token`  
**Fix**: Apply database migration  
**Status**: ✅ Ready to fix  
**Priority**: High (blocks signup flow)

