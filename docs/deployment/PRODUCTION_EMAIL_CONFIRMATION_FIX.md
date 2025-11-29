# Production Email Confirmation Issue

## 🔍 Problem

Email confirmation is failing on **production** (`https://ummahflow.com`) with error:
```
AuthApiError: Email link is invalid or has expired
```

But it works on **localhost**!

---

## 🎯 Root Causes

### **Issue 1: Production Running Old Code** ⚠️ **Most Likely**

Your production deployment doesn't have the latest code changes.

#### **Symptoms:**
- Works on localhost ✅
- Fails on production ❌
- Error mentions `AuthApiError` (old Supabase code)

#### **Solution:**
Deploy the latest code to production:

```bash
# 1. Commit your changes
git add .
git commit -m "Fix: Update email confirmation system"

# 2. Push to main
git push origin main

# 3. Deploy to Hetzner server
# Use your deployment script to deploy to Hetzner
```

---

### **Issue 2: Production Database Missing Table**

The `email_confirmation_tokens` table exists in local database but not in production.

#### **How to Check:**
1. Go to Supabase Dashboard
2. Make sure you're on the **production project** (not local)
3. SQL Editor → Run:
   ```sql
   SELECT * FROM public.email_confirmation_tokens LIMIT 1;
   ```

#### **Solution:**
If you see "relation does not exist":

1. Open Supabase Dashboard → **Production Project**
2. SQL Editor
3. Copy and run `create-email-confirmation-tokens-table.sql`

---

### **Issue 3: Different Environment Variables**

Production might be using different Supabase credentials.

#### **Check Hetzner Environment Variables:**

1. SSH into your Hetzner server
2. Check environment variables in your deployment configuration
3. Verify these exist:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key
   RESEND_API_KEY=your-resend-api-key
   NEXT_PUBLIC_SITE_URL=https://ummahflow.com
   ```

---

### **Issue 4: Token Generated on Local, Trying to Confirm on Production**

You signed up on localhost, got email with localhost token, but trying to confirm on production URL.

#### **Symptoms:**
- Email has `localhost:3001` in the URL
- But you're on `ummahflow.com`

#### **Solution:**
The databases are separate! You need to:

1. Sign up again on **production**: https://ummahflow.com/signup
2. Use the email confirmation link from that signup

---

## ✅ Step-by-Step Fix

### **Step 1: Deploy Latest Code**

```bash
# From your project directory
git status  # Check what files changed
git add .
git commit -m "feat: Add custom email confirmation system with logging"
git push origin main
```

Deploy to Hetzner server using your deployment script.

---

### **Step 2: Apply Migration to Production Database**

1. **Open Supabase Dashboard**
2. **Select PRODUCTION project** (important!)
3. **SQL Editor** → Run:

```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'email_confirmation_tokens';

-- If not exists, create it:
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

CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_token 
  ON public.email_confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_user_id 
  ON public.email_confirmation_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_email 
  ON public.email_confirmation_tokens(email);

ALTER TABLE public.email_confirmation_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage tokens" 
  ON public.email_confirmation_tokens
  FOR ALL 
  USING (auth.role() = 'service_role');
```

---

### **Step 3: Verify Environment Variables**

On Hetzner server:
1. SSH into your Hetzner server
2. Check environment variables in your deployment configuration
3. If you change anything, **redeploy** using your deployment script

---

### **Step 4: Test on Production**

1. **Clear browser cache** or use incognito
2. **Sign up** on https://ummahflow.com/signup with NEW email
3. **Check email** for confirmation link
4. **Click link** - should work now!

---

## 🔍 Debugging Production

### **Check Server Logs:**

1. SSH into your Hetzner server
2. Check application logs (typically in `/var/log/` or via your process manager)
3. Look for `/api/generate-confirmation-token` and `/api/confirm-email` in the logs

### **Expected Logs:**
```
[TOKEN] Generation request: { ... }
[TOKEN] Attempting to store token in database
[TOKEN] Token generated successfully

[CONFIRM] Validating token for email: ...
[CONFIRM] Token found, checking expiration and usage status
[SECURITY] Email successfully confirmed for: ...
```

### **If you see errors:**
The logs will show exactly what's failing.

---

## 🆘 Emergency Fix: Manual Email Confirmation

If users are stuck and you need to confirm their email manually:

```sql
-- Run in Supabase Dashboard (PRODUCTION)

-- 1. Find the user
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'stuck-user@example.com';

-- 2. Manually confirm their email
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || 
  '{"email_confirmed": true, "email_confirmed_at": "' || NOW() || '"}'::jsonb
WHERE email = 'stuck-user@example.com';

-- 3. Verify it worked
SELECT email, raw_user_meta_data->>'email_confirmed' as confirmed
FROM auth.users 
WHERE email = 'stuck-user@example.com';
```

Now they can log in!

---

## 📋 Production Checklist

Before considering it fixed:

- [ ] Latest code deployed to Hetzner
- [ ] Database migration applied to **production** Supabase
- [ ] Environment variables set on Hetzner server
- [ ] Redeployment triggered after env var changes
- [ ] Test signup on production URL
- [ ] Token appears in production database
- [ ] Confirmation email received
- [ ] Confirmation link works on production
- [ ] User can login after confirmation

---

## 🎯 Common Mistakes

### **❌ Wrong:** Testing localhost signup with production confirmation
- Signup: `localhost:3001/signup`
- Email link: `https://ummahflow.com/auth/confirm?...`
- **Result**: Token doesn't exist in production DB

### **✅ Right:** Test entirely on one environment
- Signup: `https://ummahflow.com/signup`
- Email link: `https://ummahflow.com/auth/confirm?...`
- **Result**: Everything works

---

## 🔄 Deployment Workflow

For future updates:

```bash
# 1. Test locally first
npm run dev
# Test at localhost:3001

# 2. Commit and push
git add .
git commit -m "Your changes"
git push origin main

# 3. Deploy to Hetzner
# Use your deployment script

# 4. Test on production
# https://ummahflow.com

# 5. Check logs if issues
# SSH into Hetzner server and check application logs
```

---

## 💡 Pro Tips

1. **Always test locally first** before deploying
2. **Use staging environment** for testing
3. **Monitor server logs** during production testing
4. **Keep local and production databases separate**
5. **Use staging environment** for major changes

---

**Next Step**: Deploy latest code to production and apply database migration! 🚀

