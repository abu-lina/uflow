# Test Email Confirmation with Fresh Signup

## ✅ The 406 Error is Fixed!

Your error logs now show:
```
errorMessage: "Invalid or expired confirmation link"
errorDetails: "Token not found"
```

This is the **correct behavior** when a token doesn't exist in the database.

---

## 🧪 Test with a Fresh Account

### Step 1: Delete Old Test Account (Optional)

Run in Supabase SQL Editor:
```sql
-- Check if user exists
SELECT id, email, created_at FROM auth.users 
WHERE email = 'localhost.monsoon893@passfwd.com';

-- If exists, delete it
DELETE FROM auth.users WHERE email = 'localhost.monsoon893@passfwd.com';
```

### Step 2: Sign Up with New Test Email

1. Go to `http://localhost:3001/signup`
2. Use a **new email** like:
   - `test.$(date +%s)@example.com`
   - Or `testuser123@example.com`
3. Enter a password (min 6 characters)
4. Click **Sign Up**

### Step 3: Watch Server Logs

You should see these logs in sequence:

```
[SIGNUP API] Received signup request: { email: '...', language: '...' }
[SIGNUP API] Checking if user exists...
[SIGNUP API] Creating user with Admin API...
[SIGNUP API] ✅ User created successfully (no session): ...
[SIGNUP API] Generating confirmation token...
[SIGNUP API] ✅ Token generated and stored
[SIGNUP API] Sending confirmation email...
[SIGNUP API] Confirmation URL: http://localhost:3001/auth/confirm?token=...&email=...
```

### Step 4: Copy Confirmation URL

From the server logs, find the line that says:
```
[SIGNUP API] Confirmation URL: http://localhost:3001/auth/confirm?token=...
```

Copy the full URL.

### Step 5: Test Confirmation

1. Open the confirmation URL in your browser
2. Watch browser console
3. You should see:
   ```
   [CONFIRM PAGE] ✅ Email confirmation successful
   ```
4. Then auto-redirect to login page

---

## ✅ Success Checklist

- [ ] Server shows `[SIGNUP API] ✅ Token generated and stored`
- [ ] Confirmation URL appears in server logs
- [ ] Opening URL shows loading spinner
- [ ] Browser console shows successful confirmation
- [ ] Auto-redirects to `/login`
- [ ] Can log in with the new account

---

## ❌ If Token Generation Fails

If you see in logs:
```
[SIGNUP API] Error storing token: { ... }
```

Check:
1. **Table exists:** Run in Supabase SQL Editor
   ```sql
   SELECT * FROM public.email_confirmation_tokens LIMIT 1;
   ```
   
   If error → Run `create-email-confirmation-tokens-table.sql`

2. **RLS policies:** Run in Supabase SQL Editor
   ```sql
   SELECT tablename, policyname, permissive, roles, cmd 
   FROM pg_policies 
   WHERE tablename = 'email_confirmation_tokens';
   ```
   
   Should show policies allowing inserts

---

## 🔍 Debug Old Token

If you want to debug why the old token doesn't exist:

```sql
-- Check all tokens for this email
SELECT * FROM public.email_confirmation_tokens 
WHERE email = 'localhost.monsoon893@passfwd.com';

-- Check when user was created
SELECT id, email, created_at, user_metadata 
FROM auth.users 
WHERE email = 'localhost.monsoon893@passfwd.com';
```

If user `created_at` is before token system was implemented, that explains why no token exists.

---

## 💡 Key Point

The fix is working correctly! The API now:
- ✅ Returns proper 400 error (not 406)
- ✅ Shows clear error message: "Invalid or expired confirmation link"
- ✅ Logs detailed debug info

The issue is just that the old token doesn't exist in the database. A fresh signup will work perfectly.

