# Test Email Confirmation Flow

## 🧪 Complete Test Procedure

Now that enhanced logging is in place, follow these steps to test and verify the entire email confirmation flow.

---

## ✅ Pre-Test Checklist

Before starting the test:

- [ ] Database table `email_confirmation_tokens` exists (you confirmed this ✅)
- [ ] Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
  - `RESEND_API_KEY`
- [ ] Development server running: `npm run dev`
- [ ] Browser DevTools open (Console tab)
- [ ] Terminal visible (for server logs)

---

## 📋 Test Steps

### **Step 1: Start Fresh Signup**

1. Open http://localhost:3001/signup in your browser
2. Use a **NEW email address** you haven't tested with
3. Fill in:
   - Email: `test+confirm@example.com`
   - Password: `Test123!`
   - Confirm Password: `Test123!`
4. Click "Registrieren"

---

### **Step 2: Watch the Logs**

#### **Browser Console (should show):**
```javascript
[SIGNUP] Generating confirmation token for: test+confirm@example.com
[SIGNUP] Token generated successfully, sending email...
[SIGNUP] Confirmation email sent successfully
```

#### **Server Console (should show):**
```
[TOKEN] Generation request: { 
  userId: 'xxx-xxx-xxx', 
  email: 'test+confirm@example.com', 
  type: 'signup' 
}
[TOKEN] Attempting to store token in database
[TOKEN] Token generated successfully
```

#### **❌ If you see errors:**

**Browser Error:**
```javascript
[SIGNUP] Failed to generate token: {
  status: 500,
  error: { error: "...", details: "..." }
}
```
→ Check server logs for the actual error

**Server Error:**
```
[TOKEN] Database error: { message: "...", code: "..." }
```
→ See troubleshooting section below

---

### **Step 3: Check Database**

Open Supabase Dashboard → SQL Editor and run:

```sql
-- Should return 1 row with your token
SELECT * FROM public.email_confirmation_tokens 
WHERE email = 'test+confirm@example.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected result:**
| Column | Value |
|--------|-------|
| id | UUID |
| user_id | User's UUID |
| email | test+confirm@example.com |
| token | 64-character hex string |
| type | 'signup' |
| expires_at | ~24 hours from now |
| used | false |
| created_at | Current timestamp |

**❌ If no rows:**
Token generation failed - check logs from Step 2

---

### **Step 4: Check Email**

1. Check inbox for `test+confirm@example.com`
2. Should receive email with subject like "Confirm your email"
3. Email should contain a link like:
   ```
   http://localhost:3001/auth/confirm?token=XXXXX&email=test%2Bconfirm%40example.com
   ```

**❌ If no email:**
- Check spam folder
- Check Resend dashboard for delivery status
- Check server logs for `[SIGNUP] Failed to send confirmation email`

---

### **Step 5: Click Confirmation Link**

1. Click the link in the email
2. Browser navigates to `/auth/confirm?token=...&email=...`
3. Should see loading spinner briefly

#### **Browser Console (should show):**
```javascript
Email confirmation successful: {
  success: true,
  message: "Email confirmed successfully"
}
```

#### **Server Console (should show):**
```
[SECURITY] Email confirmation attempt for: test+confirm@example.com from IP: 127.0.0.1
[CONFIRM] Validating token for email: test+confirm@example.com
[CONFIRM] Token found, checking expiration and usage status
[SECURITY] Email successfully confirmed for: test+confirm@example.com from IP: 127.0.0.1
```

#### **Visual (should see):**
- ✅ Green checkmark
- "Email confirmed successfully!"
- "Redirecting to your dashboard..."
- Auto-redirect after 3 seconds

---

### **Step 6: Verify Database Updated**

```sql
-- Token should now be marked as used
SELECT * FROM public.email_confirmation_tokens 
WHERE email = 'test+confirm@example.com';
-- used = true ✅

-- User metadata should show confirmation
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'test+confirm@example.com';
-- raw_user_meta_data should include:
-- { "email_confirmed": true, "email_confirmed_at": "..." }
```

---

### **Step 7: Test Login**

1. Navigate to http://localhost:3001/login
2. Enter:
   - Email: `test+confirm@example.com`
   - Password: `Test123!`
3. Click "Anmelden"

**Expected:**
- ✅ Login succeeds
- ✅ Redirected to `/profile` or dashboard
- ✅ No error messages

**❌ If login fails with "EMAIL_NOT_CONFIRMED":**
The metadata wasn't updated - check server logs from Step 5

---

## 🔍 Troubleshooting Common Issues

### **Issue 1: Token Generation Fails (500 Error)**

**Browser shows:**
```javascript
[SIGNUP] Failed to generate token: { status: 500, ... }
```

**Server shows:**
```
[TOKEN] Database error: { 
  message: "permission denied for table email_confirmation_tokens",
  code: "42501"
}
```

**Solution:**
RLS policy issue. Run:
```sql
-- Grant service role full access
CREATE POLICY IF NOT EXISTS "Service role can manage tokens" 
ON public.email_confirmation_tokens
FOR ALL 
USING (auth.role() = 'service_role');
```

---

### **Issue 2: Token Not Saved to Database**

**Logs show success, but no token in DB:**

**Check:**
```sql
-- Verify RLS is not blocking
SET LOCAL role TO service_role;
SELECT * FROM public.email_confirmation_tokens 
WHERE email = 'test+confirm@example.com';
```

**Solution:**
Check the RLS policies:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'email_confirmation_tokens';
```

---

### **Issue 3: Email Not Sent**

**Server shows:**
```
[SIGNUP] Token generated successfully, sending email...
[SIGNUP] Failed to send confirmation email: ...
```

**Check:**
1. Resend API key is valid
2. Resend account is not suspended
3. Email address format is valid
4. Check Resend dashboard for error logs

---

### **Issue 4: Confirmation Fails**

**Browser shows:**
```javascript
Email confirmation failed: {
  status: 400,
  error: { error: "Invalid or expired confirmation link" }
}
```

**Possible causes:**
1. Token expired (>24 hours)
2. Token already used
3. Token not in database
4. Email doesn't match

**Debug:**
```sql
SELECT 
  token,
  email,
  expires_at,
  used,
  (expires_at > NOW()) as is_valid,
  (NOW() - created_at) as age
FROM public.email_confirmation_tokens 
WHERE email = 'test+confirm@example.com'
ORDER BY created_at DESC;
```

---

### **Issue 5: User Can Login Without Confirmation**

**This means the email check is being bypassed.**

**Verify:**
```typescript
// In LoginPageContent.tsx, ensure this is called:
const { error } = await signInWithEmailConfirmation(formData.email, formData.password);
// NOT:
// const { error } = await supabase.auth.signInWithPassword(...);
```

---

## 📊 Success Criteria

✅ All steps completed without errors  
✅ Token appears in database  
✅ Email received  
✅ Confirmation link works  
✅ User metadata updated  
✅ Login works after confirmation  
✅ Login blocked before confirmation  

---

## 🎯 Quick Health Check

Run this to verify everything is set up:

```sql
-- 1. Check table exists and has correct schema
\d public.email_confirmation_tokens

-- 2. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'email_confirmation_tokens';

-- 3. Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'email_confirmation_tokens';

-- 4. Check recent tokens (if any)
SELECT 
  email,
  type,
  used,
  expires_at > NOW() as is_valid,
  created_at
FROM public.email_confirmation_tokens 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check users with confirmed emails
SELECT 
  email,
  raw_user_meta_data->>'email_confirmed' as confirmed,
  raw_user_meta_data->>'email_confirmed_at' as confirmed_at,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🆘 Still Having Issues?

If after following all steps you still have problems:

1. **Collect all logs:**
   - Browser console logs
   - Server console logs
   - Network tab (DevTools → Network)

2. **Check database state:**
   - Run all SQL queries above
   - Take screenshots

3. **Share error details:**
   - Exact error messages
   - Status codes
   - Database query results

---

## ✅ Test Completed Successfully

If all steps passed:

- ✅ Email confirmation system is working
- ✅ Tokens are being generated and stored
- ✅ Emails are being sent
- ✅ Confirmations are being processed
- ✅ User metadata is being updated
- ✅ Login security is enforced

**🎉 Your email confirmation flow is production-ready!**

---

**Test Date**: ___________  
**Tester**: ___________  
**Result**: ⬜ Pass ⬜ Fail  
**Notes**: ___________

