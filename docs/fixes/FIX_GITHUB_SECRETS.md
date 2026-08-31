# 🔧 Fix GitHub Secrets - Urgent

## 🚨 Problem
Your deployed app is using the **wrong Supabase URL**: `pmbatjlosstytdmmqkky.supabase.co`  
It should be using: `rdtdtcfntopcxcigkqoq.supabase.co`

This is causing all CORS errors and preventing signup from working.

---

## ✅ Solution: Update GitHub Secrets

### Step 1: Go to GitHub Secrets
https://github.com/abu-lina/uflow/settings/secrets/actions

### Step 2: Update/Add These Secrets

Click on each secret name to **edit** (or **New repository secret** if it doesn't exist):

#### 1. `NEXT_PUBLIC_SUPABASE_URL`
```
https://YOUR_PROJECT_REF.supabase.co
```
⚠️ **No quotes, no trailing slash**

#### 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
```
(copy from your .env.local)
```
⚠️ **Copy from your `.env.local` file** (the value after `NEXT_PUBLIC_SUPABASE_ANON_KEY=`)

#### 3. `SUPABASE_SERVICE_ROLE_KEY`
```
(copy from your .env.local)
```
⚠️ **This is the secret key, not the anon key**

#### 4. `RESEND_API_KEY`
```
(copy from your .env.local)
```

#### 5. Verify These Exist:
- ✅ `HETZNER_HOST` (your Hetzner server IP)
- ✅ `HETZNER_SSH_KEY` (your SSH private key)

---

## Step 3: Re-deploy

After updating the secrets:

### Option A: Re-run GitHub Actions (Recommended)
1. Go to: https://github.com/abu-lina/uflow/actions
2. Click on the latest workflow run
3. Click **"Re-run all jobs"**

### Option B: Push a Small Change
```bash
git commit --allow-empty -m "Trigger deployment with updated secrets"
git push origin main
```

---

## Step 4: Verify

After deployment completes (~3-5 minutes):

1. **Check the app:** https://ummahflow.com/signup
2. **Try signing up** with a test email
3. **Check browser console** - CORS errors should be gone
4. **Check Supabase logs** - Should see the signup attempt

---

## 🆘 Quick Command to Get Your Keys

Run this in your terminal:
```bash
cat .env.local | grep -E "(SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY)"
```

Copy the values (without the quotes) into GitHub Secrets.

---

## ⚡ Alternative: Manual Fix via SSH (Advanced)

If you can't wait for GitHub Actions, SSH to your server and restart the container:

```bash
ssh root@YOUR_HETZNER_IP

# Stop old container
docker stop uflow-app
docker rm uflow-app

# Start with correct env vars
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key_here" \
  -e SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here" \
  -e RESEND_API_KEY="your_resend_api_key_here" \
  -e NEXT_PUBLIC_SITE_URL="https://ummahflow.com" \
  --name uflow-app uflow:latest
```

Replace `your_anon_key_here` and `your_service_role_key_here` with actual values from `.env.local`.

