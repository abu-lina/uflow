# Troubleshooting: Email Confirmation Failed Error

## 🔍 Issue

Email confirmation is failing with the error:
```
Email confirmation failed
at ConfirmEmail.useEffect.confirmEmail (src/app/auth/confirm/page.tsx:36:19)
```

---

## 🎯 Root Causes & Solutions

### **Cause 1: Database Table Missing** ⚠️ **MOST LIKELY**

The `email_confirmation_tokens` table doesn't exist in Supabase.

#### **How to Check:**
1. Open Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   SELECT * FROM public.email_confirmation_tokens LIMIT 1;
   ```
3. If you see "relation does not exist" → **This is the problem**

#### **Solution:**
Apply the migration (see `FIX_EMAIL_CONFIRMATION_TOKEN_ERROR.md`):

**Quick Fix - Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. SQL Editor
3. Copy contents of `create-email-confirmation-tokens-table.sql`
4. Run the SQL

---

### **Cause 2: No Token in Database**

User was created before the email confirmation system was implemented.

#### **How to Check:**
Run in Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM public.email_confirmation_tokens;
```

If returns 0, no tokens exist yet.

#### **Solution:**
User needs to sign up again OR manually create a token:
```sql
-- Generate a token for an existing user
INSERT INTO public.email_confirmation_tokens (user_id, email, token, type, expires_at, used)
VALUES (
  'USER_ID_HERE',
  'user@example.com',
  encode(gen_random_bytes(32), 'hex'),
  'signup',
  NOW() + INTERVAL '24 hours',
  false
);
```

---

### **Cause 3: Token Expired**

Confirmation tokens expire after 24 hours.

#### **How to Check:**
Look for server logs:
```
[SECURITY] Expired token attempt for: user@example.com from IP: ...
```

Or check in browser console:
```javascript
{
  status: 400,
  error: { error: "Confirmation link has expired" }
}
```

#### **Solution:**
User needs to resend confirmation email:
1. Go to login page
2. Try to log in with unconfirmed email
3. Click "Bestätigungs-E-Mail erneut senden"

---

### **Cause 4: Token Already Used**

The confirmation link has already been clicked.

#### **How to Check:**
Server logs show:
```
[SECURITY] Already used token attempt for: user@example.com
```

Or browser console:
```javascript
{
  status: 400,
  error: { error: "Confirmation link has already been used" }
}
```

#### **Solution:**
User's email is already confirmed - they can just log in!

---

### **Cause 5: Invalid Token Format**

Token or email in URL is corrupted or incorrect.

#### **How to Check:**
Check the URL parameters:
```
/auth/confirm?token=XXXXX&email=user@example.com
```

- Token should be 64 characters (hexadecimal)
- Email should be valid format

#### **Solution:**
User needs a fresh confirmation link - resend the email.

---

### **Cause 6: Rate Limiting**

Too many confirmation attempts (3 per hour limit).

#### **How to Check:**
Browser console shows:
```javascript
{
  status: 429,
  error: { error: "Too many confirmation attempts..." }
}
```

#### **Solution:**
Wait 1 hour, then try again.

---

### **Cause 7: Missing Environment Variables**

Supabase credentials not configured.

#### **How to Check:**
Server logs show:
```
[CONFIRM] Token validation failed: { tokenError: { message: "..." } }
```

Check `.env.local`:
```bash
cat .env.local | grep SUPABASE
```

#### **Solution:**
Ensure these exist in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🔧 Enhanced Logging (Already Applied)

The code now includes detailed logging to help diagnose issues:

### **Frontend Logs (Browser Console):**
```javascript
// On error:
Email confirmation failed: {
  status: 400,
  statusText: "Bad Request",
  error: { error: "Invalid or expired confirmation link", details: "..." }
}

// On success:
Email confirmation successful: { success: true, message: "Email confirmed successfully" }
```

### **Backend Logs (Server Console):**
```
[SECURITY] Email confirmation attempt for: user@example.com from IP: 127.0.0.1
[CONFIRM] Validating token for email: user@example.com
[CONFIRM] Token found, checking expiration and usage status
[SECURITY] Email successfully confirmed for: user@example.com from IP: 127.0.0.1
```

---

## 📋 Step-by-Step Debugging

### **Step 1: Check Browser Console**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error details:
   ```javascript
   Email confirmation failed: { status: XXX, ... }
   ```

### **Step 2: Check Server Logs**

Look at your Next.js terminal for:
- `[CONFIRM]` messages
- `[SECURITY]` messages
- Any error stack traces

### **Step 3: Verify Database**

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'email_confirmation_tokens';

-- Check token exists
SELECT * FROM public.email_confirmation_tokens 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC;

-- Check user metadata
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'user@example.com';
```

### **Step 4: Test Full Flow**

1. **Sign up with new email**
2. **Check logs** - should see:
   ```
   [TOKEN] Generation request: { ... }
   [TOKEN] Token generated successfully
   ```
3. **Check email** - should receive confirmation email
4. **Click link** - should redirect to confirm page
5. **Check logs** - should see:
   ```
   [CONFIRM] Validating token...
   [SECURITY] Email successfully confirmed...
   ```
6. **Check browser** - should see success message
7. **Try to log in** - should work!

---

## 🎯 Quick Diagnostic Checklist

Run through this checklist:

- [ ] Database table `email_confirmation_tokens` exists
- [ ] Token exists in database for this email
- [ ] Token is not expired (< 24 hours old)
- [ ] Token is not used (`used = false`)
- [ ] Environment variables are set correctly
- [ ] Supabase connection is working
- [ ] User exists in `auth.users` table
- [ ] Email address matches exactly
- [ ] Token is 64 characters hexadecimal
- [ ] No rate limiting (< 3 attempts per hour)

---

## 🆘 Common Error Messages Explained

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Missing token or email" | URL params missing | Check confirmation link format |
| "Invalid email format" | Email not valid | User needs fresh confirmation link |
| "Invalid or expired confirmation link" | Token not in DB or expired | Resend confirmation email |
| "Confirmation link has expired" | Token > 24 hours old | Resend confirmation email |
| "Confirmation link has already been used" | Token already confirmed | User can log in directly |
| "Too many confirmation attempts" | Rate limit hit (3/hour) | Wait 1 hour |
| "Failed to process confirmation" | Database update failed | Check server logs |
| "Failed to confirm email" | User update failed | Check Supabase permissions |

---

## 🔄 Test Scenario: New User Signup

### **Expected Flow:**

1. **User signs up** at `/signup`
   ```
   [TOKEN] Generation request: { userId: '...', email: 'test@example.com', type: 'signup' }
   [TOKEN] Attempting to store token in database
   [TOKEN] Token generated successfully
   ```

2. **Email sent** via Resend
   ```
   Subject: Confirm your email address
   Link: http://localhost:3001/auth/confirm?token=XXXX&email=test@example.com
   ```

3. **User redirected** to `/auth/check-email`
   - Shows "Check your email" message

4. **User clicks link** in email
   - Navigates to `/auth/confirm?token=...&email=...`

5. **Confirmation page loads**
   ```
   [SECURITY] Email confirmation attempt for: test@example.com from IP: ...
   [CONFIRM] Validating token for email: test@example.com
   [CONFIRM] Token found, checking expiration and usage status
   [SECURITY] Email successfully confirmed for: test@example.com
   ```

6. **Success message** shown
   - "Email confirmed successfully!"
   - Auto-redirects to `/login` after 3 seconds

7. **User can log in**
   - Email is now confirmed
   - Login works successfully

---

## 🛠️ Manual Fix: Mark Email as Confirmed

If you need to manually confirm a user's email:

```sql
-- 1. Find the user
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'user@example.com';

-- 2. Update user metadata
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || 
  '{"email_confirmed": true, "email_confirmed_at": "' || NOW() || '"}'::jsonb
WHERE email = 'user@example.com';

-- 3. Mark any tokens as used
UPDATE public.email_confirmation_tokens 
SET used = true, updated_at = NOW()
WHERE email = 'user@example.com';
```

---

## 📚 Related Documentation

- **Main Fix Guide**: `FIX_EMAIL_CONFIRMATION_TOKEN_ERROR.md`
- **Migration SQL**: `create-email-confirmation-tokens-table.sql`
- **Migration Script**: `apply-email-tokens-migration.sh`
- **Component Docs**: `EMAIL_VERIFICATION_ALERT_COMPONENT.md`

---

## ✅ Verify Fix Worked

After applying any fixes:

1. **Clear browser cache** (or use incognito)
2. **Sign up with NEW email**
3. **Check all logs** (browser + server)
4. **Click confirmation link**
5. **Verify success**
6. **Try to log in**

All steps should work without errors.

---

**Updated**: October 17, 2025  
**Status**: Enhanced logging added for better debugging  
**Priority**: High (blocks user confirmations)

