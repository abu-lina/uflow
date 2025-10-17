# Debug: 400 Bad Request on Email Confirmation

## 🔍 Current Issue

Email confirmation failing with:
```
POST /api/confirm-email
[HTTP/1.1 400 Bad Request]
```

---

## 🎯 Common Causes of 400 Error

### **1. Token Not in Database**

The token in the URL doesn't match any token in the database.

**Check:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM public.email_confirmation_tokens 
WHERE email = 'YOUR_EMAIL_HERE'
ORDER BY created_at DESC;
```

**Expected:** At least 1 row with matching token

**If no rows:** Token wasn't created during signup
- Check server logs for `[SIGNUP API]` messages
- Verify `/api/auth/signup` ran successfully

---

### **2. Token Already Used**

The confirmation link was already clicked.

**Check:**
```sql
SELECT token, used, created_at 
FROM public.email_confirmation_tokens 
WHERE email = 'YOUR_EMAIL_HERE'
ORDER BY created_at DESC 
LIMIT 1;
```

**If `used = true`:** Email already confirmed!
- User can just log in
- No need to confirm again

---

### **3. Token Expired**

Token is older than 24 hours.

**Check:**
```sql
SELECT 
  token,
  expires_at,
  expires_at > NOW() as is_valid,
  NOW() - created_at as age
FROM public.email_confirmation_tokens 
WHERE email = 'YOUR_EMAIL_HERE'
ORDER BY created_at DESC 
LIMIT 1;
```

**If `is_valid = false`:** Token expired
- User needs to request new confirmation email
- Login page has "Resend" button

---

### **4. Email Mismatch**

Email in URL doesn't match email in database.

**Check URL:**
```
/auth/confirm?token=...&email=localhost.monsoon893%40passfwd.com
```

Email should be URL-encoded (`%40` = `@`)

**Check database:**
```sql
SELECT email, token FROM public.email_confirmation_tokens 
WHERE token = 'YOUR_TOKEN_HERE';
```

Emails must match exactly (case-sensitive).

---

### **5. Token Format Invalid**

Token in URL is corrupted or incomplete.

**Check:**
- Token should be exactly 64 characters
- Should be hexadecimal (0-9, a-f)

**URL Example:**
```
token=deaf69b340259e3b7500bd2943913783f0fe532774d53eb40bb323edd26f3b3f
      └─────────────────────────────────────────────────────────┘
                           64 characters
```

---

## 🔍 How to Debug

### **Step 1: Check Browser Console**

Look for:
```javascript
[CONFIRM PAGE] Confirming email: {
  email: "...",
  tokenLength: 64,
  tokenPreview: "..."
}

[CONFIRM PAGE] Email confirmation failed: {
  status: 400,
  errorMessage: "Invalid or expired confirmation link",
  errorDetails: "Token not found",
  fullError: { ... }
}
```

The `errorMessage` and `errorDetails` will tell you exactly what's wrong.

---

### **Step 2: Check Server Console**

Look for:
```
[SECURITY] Email confirmation attempt for: ... from IP: ...
[CONFIRM] Validating token for email: ...
[CONFIRM] Token validation failed: {
  email: "...",
  tokenError: { message: "...", code: "..." }
}
```

The `tokenError` will show the database error.

---

### **Step 3: Verify Token in Database**

Run:
```sql
SELECT 
  email,
  token,
  type,
  expires_at > NOW() as is_valid,
  used,
  created_at
FROM public.email_confirmation_tokens 
WHERE email = 'YOUR_EMAIL@HERE.com'
ORDER BY created_at DESC;
```

**Expected:**
- `is_valid = true` ✅
- `used = false` ✅
- `type = 'signup'` ✅
- `created_at` is recent (< 24 hours) ✅

---

## 🆘 Quick Fixes

### **If Token Not Found:**
Sign up again with a NEW email - fresh start.

### **If Token Expired:**
Login page → Try to login → Get error → Click "Resend email"

### **If Token Used:**
Just go to login page and log in (email already confirmed).

### **If User Not Found:**
Check:
```sql
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'YOUR_EMAIL@HERE.com';
```

If no user, something went wrong during signup.

---

## 📋 Debug Checklist

Run through these:

- [ ] Browser console shows `[CONFIRM PAGE]` logs with details
- [ ] Server console shows `[CONFIRM]` or `[SECURITY]` logs
- [ ] Token exists in database (`email_confirmation_tokens` table)
- [ ] Token length is exactly 64 characters
- [ ] Email matches exactly (check for %40 encoding)
- [ ] Token is not expired (`expires_at > NOW()`)
- [ ] Token is not used (`used = false`)
- [ ] User exists in `auth.users` table

---

## 🎯 Most Likely Issues

Based on the error:

1. **Token doesn't exist in DB** (most common)
   - Signup didn't complete fully
   - Token generation failed silently
   
2. **Token already used**
   - Clicked link twice
   - Email already confirmed

3. **Wrong database**
   - Testing localhost but token in production DB
   - Or vice versa

---

**Next step: Copy the detailed error logs from your browser console and server terminal!** 🔍

