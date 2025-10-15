# GitHub Secrets Setup Guide

## 🔐 Required Secrets for Deployment

You need to add these secrets to your GitHub repository for the deployment to work.

### How to Add Secrets

1. Go to your GitHub repository: https://github.com/abu-lina/uflow
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** for each secret below

---

## Secrets to Add

### 1. `RESEND_API_KEY`
**Value:** `re_4m8Qc9hr_C9b2hRuL3dYDPnRu6mxwTLyL`
**Description:** API key for sending emails via Resend

### 2. `SUPABASE_SERVICE_ROLE_KEY` (if not already added)
**Value:** Check your `.env.local` file
**Description:** Supabase service role key for admin operations

### 3. Verify These Exist (should already be there):
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `HETZNER_HOST`
- ✅ `HETZNER_SSH_KEY`

---

## Quick Check

Run this command to see what you need:
```bash
cat .env.local
```

Then add each value as a GitHub Secret with the **exact same name**.

---

## After Adding Secrets

The deployment will automatically retry, or you can:
1. Go to **Actions** tab
2. Click on the failed workflow
3. Click **Re-run all jobs**

---

## Security Note

✅ **Never commit `.env.local` to git!**  
✅ GitHub Secrets are encrypted and only available during workflow runs  
✅ They won't appear in logs (shown as `***`)

