# 🧪 Test Signup Without Auth Hook

## 🎯 Goal
Isolate whether the issue is with the auth hook or with basic Supabase signup.

## 📋 Step-by-Step Test

### Step 1: Temporarily Disable Auth Hook

1. **Go to:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/hooks
2. **Find** the `send-confirmation-email` hook
3. **Disable** it (toggle off)
4. **Save** the changes

### Step 2: Test Basic Signup

1. **Go to:** https://ummahflow.com/signup
2. **Try signing up** with a test email
3. **Check what happens:**
   - ✅ **Success:** Signup works, user created
   - ❌ **Still 500:** Issue is with Supabase auth settings, not the hook

### Step 3A: If Signup Works (Hook Issue)

**The problem is with the auth hook configuration.**

**Next steps:**
1. **Deploy Edge Function:**
   ```bash
   ./deploy-auth-hooks.sh
   ```

2. **Check function logs:**
   ```bash
   supabase functions logs send-confirmation-email --project-ref rdtdtcfntopcxcigkqoq
   ```

3. **Re-enable hook** and test again

### Step 3B: If Signup Still Fails (Auth Settings Issue)

**The problem is with Supabase auth configuration.**

**Try these fixes:**

#### Option 1: Disable Email Confirmation Temporarily
1. **Go to:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/providers
2. **Disable** "Confirm email"
3. **Test signup** - should work immediately
4. **Re-enable** after fixing

#### Option 2: Check SMTP Settings
1. **Go to:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/settings/auth
2. **Disable** "Enable Custom SMTP"
3. **Test signup** - should work

#### Option 3: Check Site URL Configuration
1. **Go to:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/settings/auth
2. **Find** "Site URL" setting
3. **Set it to:** `https://ummahflow.com`
4. **Save** and test

---

## 🔍 Expected Results

### If Hook is the Problem:
- ✅ Signup works without hook
- ❌ Signup fails with hook enabled
- **Solution:** Fix Edge Function deployment/configuration

### If Auth Settings are the Problem:
- ❌ Signup fails even without hook
- **Solution:** Fix Supabase auth configuration

---

## 🚀 Quick Test Sequence

1. **Disable auth hook** → Test signup
2. **If still fails:** Disable email confirmation → Test signup  
3. **If still fails:** Check SMTP settings → Test signup
4. **If still fails:** Check Site URL → Test signup

---

## 📝 Report Back

After testing, let me know:

1. **Does signup work with hook disabled?**
2. **Does signup work with email confirmation disabled?**
3. **What error messages do you see?**

This will help me identify the exact issue and provide the right solution.

---

## 🎯 Most Likely Scenarios

### Scenario 1: Hook Not Deployed
- **Symptom:** Signup works without hook, fails with hook
- **Solution:** Deploy Edge Function with `./deploy-auth-hooks.sh`

### Scenario 2: SMTP Conflict
- **Symptom:** Signup fails regardless of hook
- **Solution:** Disable custom SMTP in Supabase settings

### Scenario 3: Site URL Mismatch
- **Symptom:** Signup fails with redirect errors
- **Solution:** Set correct Site URL in Supabase settings

---

**Start with disabling the auth hook and testing signup. Let me know what happens!**
