# 🔧 Stop Supabase From Sending Emails

## The Problem
You're receiving **TWO emails** when signing up:
1. ❌ Supabase's default email (you don't want this)
2. ✅ Your custom Resend email (you want this)

## The Solution

There are **3 ways** to stop Supabase from sending emails. Choose the one that fits best:

---

## ✅ **Option 1: Disable Email Confirmation (Simplest)**

### Steps:
1. Go to: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/providers
2. Scroll to **Email** provider
3. Find **"Confirm email"** toggle
4. **Turn it OFF**
5. Click **Save**

### Result:
- ✅ Users are created immediately (no confirmation needed)
- ❌ Supabase does NOT send any email
- ✅ Your Resend email is still sent
- ⚠️ Users can log in without confirming email (you handle confirmation in your app)

---

## ✅ **Option 2: Use Invalid SMTP (Recommended)**

This prevents Supabase from sending emails while keeping email confirmation enabled.

### Steps:
1. Go to: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/settings/auth
2. Scroll to **SMTP Settings**
3. Enable **"Enable Custom SMTP"**
4. Fill in with **fake/invalid** values:
   ```
   SMTP Host: localhost
   SMTP Port: 25
   SMTP User: noreply@localhost
   SMTP Password: disabled
   Sender Email: noreply@localhost
   Sender Name: Disabled
   ```
5. Click **Save**

### Result:
- ✅ Supabase tries to send email but fails silently
- ✅ Your Resend email is still sent
- ✅ Email confirmation is still "enabled" in Supabase (for security)
- ✅ You control all email sending

---

## ✅ **Option 3: Use Supabase Edge Functions (Advanced)**

Use Supabase's webhook system to intercept auth events and send custom emails.

### This requires:
1. Creating a Supabase Edge Function
2. Setting up auth webhooks
3. More complex setup

**Not recommended** unless you need full control over Supabase's auth flow.

---

## 🎯 **Recommended Approach: Option 2**

Use **Option 2 (Invalid SMTP)** because:
- ✅ Keeps email confirmation enabled (security)
- ✅ Supabase won't send emails (they fail silently)
- ✅ Your Resend emails work perfectly
- ✅ No code changes needed

---

## 🧪 Testing After Fix

1. Sign up with a new email address
2. Check your inbox
3. You should receive **ONLY ONE** email (from Resend)
4. The email should be in German or English based on your browser language

---

## 📝 Current Status

Right now:
- ✅ Supabase connection works
- ✅ Signup creates users
- ✅ Resend emails are sent
- ❌ Supabase is also sending emails (duplicate)

After fix:
- ✅ Supabase connection works
- ✅ Signup creates users
- ✅ Resend emails are sent
- ✅ Supabase emails are blocked

---

## 🆘 Need Help?

If you're not sure which option to choose:
- **Quick fix:** Option 1 (disable confirmation)
- **Best practice:** Option 2 (invalid SMTP)
- **Advanced:** Option 3 (edge functions)

I recommend **Option 2** for production apps.

