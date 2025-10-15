# 🚀 Quick Start: Deploy Auth Hooks in 5 Minutes

## TL;DR

Run these 3 commands, then configure in dashboard:

```bash
# 1. Install & login (one-time)
npm install -g supabase && supabase login

# 2. Deploy everything
./deploy-auth-hooks.sh

# 3. Go to dashboard and create hook
# https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/hooks
```

---

## 📋 Step-by-Step (5 Minutes)

### 1️⃣ Install Supabase CLI (1 minute)

```bash
npm install -g supabase
```

### 2️⃣ Login to Supabase (1 minute)

```bash
supabase login
```

*This opens a browser window. Authorize the CLI.*

### 3️⃣ Deploy Edge Function (1 minute)

```bash
./deploy-auth-hooks.sh
```

This automatically:
- ✅ Deploys the Edge Function
- ✅ Sets RESEND_API_KEY
- ✅ Sets SITE_URL
- ✅ Verifies deployment

### 4️⃣ Configure Auth Hook (2 minutes)

**Go to:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/hooks

**Click:** "Create a new hook" or "Enable a hook"

**Fill in:**
```
Hook name: send-confirmation-email
Hook type: Send Email
Events: [✓] User created
Function URL: https://rdtdtcfntopcxcigkqoq.supabase.co/functions/v1/send-confirmation-email
Enabled: [✓] ON
```

**Click:** "Save" or "Create"

**Verify email settings:** https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/providers

- Make sure "Confirm email" is **ENABLED** ✅

### 5️⃣ Test (1 minute)

1. Go to https://ummahflow.com/signup
2. Sign up with a test email
3. Check inbox - you should receive ONE beautiful email
4. Click confirmation link
5. Done! ✅

---

## ✅ Success Checklist

- [ ] Supabase CLI installed
- [ ] Logged in to Supabase
- [ ] Edge Function deployed
- [ ] Auth hook configured
- [ ] Test signup sends Resend email
- [ ] No Supabase email received
- [ ] Email is in German or English
- [ ] Confirmation works

---

## 🐛 If Something Goes Wrong

### "Command not found: supabase"
```bash
npm install -g supabase
```

### "Not logged in"
```bash
supabase login
```

### "Function deployment failed"
Check you're in the project root directory where `supabase/` folder exists.

### "Still receiving Supabase emails"
- Make sure auth hook is **enabled** in dashboard
- Check function URL is correct
- Wait 1 minute for changes to propagate

### "No email received"
```bash
# Check function logs
supabase functions logs send-confirmation-email --project-ref rdtdtcfntopcxcigkqoq

# Check Resend dashboard
# https://resend.com/emails
```

---

## 📖 More Details

- **Full deployment guide:** `DEPLOY_AUTH_HOOKS.md`
- **Complete summary:** `AUTH_HOOKS_SUMMARY.md`
- **Architecture details:** `PROPER_SOLUTION.md`

---

## 🎯 What Happens Next?

From now on, every time a user signs up:

1. Supabase creates account (unconfirmed)
2. Your Edge Function is triggered automatically
3. User receives your beautiful, multilingual Resend email
4. User must confirm email to log in
5. No spam/fake accounts possible! ✅

**All automatic, all secure, all server-side!**

---

## 🎉 That's It!

You now have a production-ready, secure email confirmation system.

Questions? Check the detailed guides or review the Edge Function code.

Ready to deploy? **Run `./deploy-auth-hooks.sh` now!**

