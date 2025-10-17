# 🐛 Debug Supabase 500 Error

## 🔍 Current Status

✅ **Fixed:** `redirect_to=undefined` → Now shows correct URL  
❌ **Still failing:** 500 error with `x_sb_error_code: "unexpected_failure"`

## 🎯 Root Cause Analysis

The 500 error suggests one of these issues:

1. **Auth Hook is configured but Edge Function isn't deployed**
2. **Auth Hook is misconfigured**
3. **Edge Function has errors**
4. **Supabase auth settings conflict**

---

## 🔧 Step-by-Step Debugging

### Step 1: Check if Edge Function is Deployed

```bash
# Check if function exists
supabase functions list --project-ref rdtdtcfntopcxcigkqoq

# Check function logs
supabase functions logs send-confirmation-email --project-ref rdtdtcfntopcxcigkqoq
```

### Step 2: Check Auth Hook Configuration

Go to: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/hooks

**Verify:**
- ✅ Hook is **enabled**
- ✅ Hook type is **"Send Email"**
- ✅ Events include **"User created"**
- ✅ Function URL is correct: `https://rdtdtcfntopcxcigkqoq.supabase.co/functions/v1/send-confirmation-email`

### Step 3: Check Supabase Auth Settings

Go to: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/providers

**Verify:**
- ✅ **"Confirm email"** is **ENABLED**
- ✅ **"Enable email confirmations"** is **ENABLED**

### Step 4: Check SMTP Settings

Go to: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/settings/auth

**Option A - Disable SMTP (Recommended):**
- ❌ **"Enable Custom SMTP"** should be **DISABLED**
- This lets Supabase use the auth hook instead

**Option B - Use Invalid SMTP (Backup):**
- ✅ **"Enable Custom SMTP"** should be **ENABLED**
- Use dummy values:
  ```
  Host: localhost
  Port: 25
  User: noreply@localhost
  Password: disabled
  ```

---

## 🚀 Quick Fix Options

### Option 1: Deploy Edge Function (If Not Done)

```bash
# Deploy the function
./deploy-auth-hooks.sh

# Or manually:
supabase functions deploy send-confirmation-email --project-ref rdtdtcfntopcxcigkqoq
```

### Option 2: Temporarily Disable Auth Hook

If you want to test signup without the hook:

1. Go to: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/hooks
2. **Disable** the auth hook temporarily
3. Test signup - should work but will send Supabase's default email
4. Re-enable hook after fixing

### Option 3: Use Simple Signup (No Email Confirmation)

Temporarily disable email confirmation:

1. Go to: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/providers
2. **Disable** "Confirm email"
3. Test signup - should work immediately
4. Re-enable after fixing hook

---

## 🧪 Testing Steps

### Test 1: Basic Signup (No Hook)

1. **Disable auth hook** in dashboard
2. **Disable email confirmation** in auth providers
3. Try signup - should work
4. Re-enable both

### Test 2: With Hook (No SMTP)

1. **Enable auth hook** in dashboard
2. **Disable custom SMTP** in settings
3. **Enable email confirmation** in auth providers
4. Try signup - should work with your Resend email

### Test 3: With Hook (Invalid SMTP)

1. **Enable auth hook** in dashboard
2. **Enable custom SMTP** with dummy values
3. **Enable email confirmation** in auth providers
4. Try signup - should work with your Resend email

---

## 🔍 Common Issues & Solutions

### Issue: "Function not found"
```bash
# Deploy the function
supabase functions deploy send-confirmation-email --project-ref rdtdtcfntopcxcigkqoq
```

### Issue: "Hook not triggering"
- Check hook is enabled in dashboard
- Verify function URL is correct
- Check function logs for errors

### Issue: "Still getting Supabase emails"
- Disable custom SMTP in settings
- Or use invalid SMTP values

### Issue: "No email received"
- Check Resend API key is set
- Check function logs
- Check Resend dashboard for delivery status

---

## 📋 Debugging Checklist

- [ ] Edge Function is deployed
- [ ] Auth hook is enabled
- [ ] Function URL is correct
- [ ] Email confirmation is enabled
- [ ] SMTP is disabled OR set to invalid values
- [ ] RESEND_API_KEY secret is set
- [ ] SITE_URL secret is set
- [ ] Function logs show no errors

---

## 🎯 Most Likely Solution

Based on the error, try this sequence:

1. **Deploy Edge Function:**
   ```bash
   ./deploy-auth-hooks.sh
   ```

2. **Disable Custom SMTP:**
   - Go to Supabase Settings → Auth
   - Disable "Enable Custom SMTP"

3. **Test signup again**

If it still fails, temporarily disable the auth hook and test basic signup first.

---

## 📞 Next Steps

1. Try the debugging steps above
2. Check the function logs
3. Let me know what you find
4. We can adjust the approach based on the results

The key is to isolate whether it's:
- Edge Function issue
- Auth hook configuration issue  
- Supabase settings conflict
