# 🚀 Deploy Supabase Auth Hooks - Step by Step Guide

## ✅ What We're Doing

Setting up server-side email sending using Supabase Edge Functions. This ensures:
- ✅ Email confirmation is required (security)
- ✅ Custom multilingual emails via Resend
- ✅ No duplicate emails
- ✅ Proper production architecture

---

## 📋 Prerequisites

- Supabase CLI installed
- Access to your Supabase project
- Resend API key

---

## 🔧 Step 1: Install Supabase CLI

```bash
# Install globally
npm install -g supabase

# Verify installation
supabase --version
```

---

## 🔐 Step 2: Login to Supabase

```bash
# This will open a browser window to authenticate
supabase login
```

---

## 🔗 Step 3: Link Your Project

```bash
# Link to your Supabase project
supabase link --project-ref rdtdtcfntopcxcigkqoq

# You'll be prompted for your database password
# Find it in: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/settings/database
```

---

## 📦 Step 4: Deploy the Edge Function

```bash
# Deploy the function
supabase functions deploy send-confirmation-email

# If you get SSL/certificate errors, use:
supabase functions deploy send-confirmation-email --no-verify-jwt
```

---

## 🔑 Step 5: Set Environment Variables (Secrets)

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=$RESEND_API_KEY

# Set your site URL
supabase secrets set SITE_URL=https://ummahflow.com

# Verify secrets were set
supabase secrets list
```

---

## 🎯 Step 6: Configure Auth Hook in Supabase Dashboard

### Option A: Using Dashboard UI

1. **Go to:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/hooks

2. **Click:** "Create a new hook" or "Add hook"

3. **Configure:**
   - **Hook name:** `send-confirmation-email`
   - **Hook type:** Select **"Send Email"**
   - **Events:** Check **"User confirmed"** or **"User created"**
   - **Function URL:** 
     ```
     https://rdtdtcfntopcxcigkqoq.supabase.co/functions/v1/send-confirmation-email
     ```
   - **HTTP Method:** `POST`
   - **Enabled:** ✅ (toggle on)

4. **Click:** "Create hook" or "Save"

### Option B: Using SQL (Alternative)

Run this in the Supabase SQL Editor:

```sql
-- Enable the auth hook
INSERT INTO auth.hooks (
  hook_name,
  hook_table_name,
  event,
  function_name,
  function_args,
  enabled
) VALUES (
  'send-confirmation-email',
  'users',
  'user.created',
  'send-confirmation-email',
  '{}',
  true
);
```

---

## ⚙️ Step 7: Update Supabase Email Settings

1. **Go to:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/providers

2. **Find:** Email provider settings

3. **Configure:**
   - ✅ **Keep "Confirm email" ENABLED** (this is important!)
   - ✅ **Enable "Secure email change"** (recommended)
   - ✅ **Double confirm email changes** (recommended)

4. **Go to:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/settings/auth

5. **Scroll to:** SMTP Settings

6. **Option A - Recommended:** Leave SMTP disabled
   - Supabase will use the auth hook instead of SMTP

   **Option B - Extra Safe:** Set invalid SMTP as backup
   - This ensures Supabase never sends emails even if hook fails
   - Enable "Custom SMTP"
   - Use dummy values:
     ```
     Host: localhost
     Port: 25
     User: noreply@localhost
     Password: disabled
     ```

---

## 🧪 Step 8: Test the Setup

### Test 1: Sign Up a New User

```bash
# In your browser:
# 1. Go to https://ummahflow.com/signup
# 2. Sign up with a test email
# 3. Check your inbox - you should receive the Resend email
# 4. Click the confirmation link
# 5. Verify you can log in
```

### Test 2: Check Edge Function Logs

```bash
# View logs from your Edge Function
supabase functions logs send-confirmation-email

# Or in the dashboard:
# https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/logs/edge-functions
```

### Test 3: Check Supabase Auth Logs

```bash
# View auth logs
# https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/logs/auth-logs
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Edge Function is deployed: `supabase functions list`
- [ ] Secrets are set: `supabase secrets list`
- [ ] Auth hook is configured in dashboard
- [ ] Email confirmation is ENABLED in auth settings
- [ ] Test signup sends Resend email (check inbox)
- [ ] Only ONE email received (not two)
- [ ] Email is in correct language (German/English)
- [ ] Confirmation link works
- [ ] User can log in after confirming

---

## 🐛 Troubleshooting

### Issue: "Function not found"
```bash
# Redeploy the function
supabase functions deploy send-confirmation-email
```

### Issue: "Secrets not found"
```bash
# Re-set the secrets
supabase secrets set RESEND_API_KEY=$RESEND_API_KEY
supabase secrets set SITE_URL=https://ummahflow.com
```

### Issue: "Still receiving Supabase emails"
- Check auth hook is enabled in dashboard
- Verify function URL is correct
- Check Edge Function logs for errors
- Set invalid SMTP as backup (Step 7, Option B)

### Issue: "No email received"
```bash
# Check function logs
supabase functions logs send-confirmation-email

# Common causes:
# - Resend API key incorrect
# - Function has errors
# - Hook not triggered
# - Email went to spam
```

### Issue: "Confirmation link doesn't work"
- Check `SITE_URL` secret is set correctly
- Verify `/auth/confirm` page exists in your app
- Check token_hash is being passed correctly

---

## 🔄 Update/Redeploy

If you make changes to the Edge Function:

```bash
# Redeploy
supabase functions deploy send-confirmation-email

# No need to re-set secrets or re-configure hooks
```

---

## 📝 What Happens Now?

1. User signs up on `ummahflow.com/signup`
2. Supabase creates user (unconfirmed)
3. Supabase triggers your Edge Function
4. Edge Function sends Resend email in user's language
5. User clicks confirmation link
6. Supabase marks user as confirmed
7. User can now log in ✅

**No client-side email sending, all server-side!**

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Only ONE email is sent per signup
- ✅ Email is from Resend (not Supabase)
- ✅ Email is in German or English based on user's preference
- ✅ Users MUST confirm before they can use the app
- ✅ No spam/fake accounts possible

---

## 📞 Need Help?

If you encounter issues:
1. Check Edge Function logs
2. Check Auth logs in Supabase dashboard
3. Verify all configuration steps above
4. Check Resend dashboard for email delivery status

