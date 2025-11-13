# GitHub Secrets Checklist for Auto-Deploy

## ✅ Before You Merge to Main

Your GitHub Actions workflow will **automatically deploy** to Hetzner when you merge to `main`, BUT you need these secrets configured first!

---

## Required GitHub Secrets

Go to: `https://github.com/abu-lina/uflow/settings/secrets/actions`

### 1. Supabase Secrets

- [ ] **`NEXT_PUBLIC_SUPABASE_URL`**
  - Value: `https://rdtdtcfntopcxcigkqoq.supabase.co`
  - Used for: Build time

- [ ] **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
  - Value: `sb_publishable_uBW3lxrnOmqPI047jBmxtg_YFVDsr1q`
  - Used for: Build time

- [ ] **`SUPABASE_SERVICE_ROLE_KEY`**
  - Value: `sb_secret_zz-UfIBWCufSI2rJ90edlw_ZFgj6it7`
  - Used for: Runtime (passed to container)

### 2. Resend API Key

- [ ] **`RESEND_API_KEY`**
  - Value: Your Resend API key (starts with `re_`)
  - Used for: Runtime (email sending)

### 3. Cloudflare Turnstile (CAPTCHA)

- [ ] **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`**
  - Value: Your Turnstile Site Key (starts with `0x4AAAAAAC...`)
  - Get from: https://dash.cloudflare.com/?to=/:account/turnstile
  - Used for: Build time + Runtime (client-side CAPTCHA)

- [ ] **`TURNSTILE_SECRET_KEY`**
  - Value: Your Turnstile Secret Key (hidden, click to reveal)
  - Get from: Same Turnstile widget page
  - Used for: Runtime (server-side verification)

### 4. Hetzner Deployment

- [ ] **`HETZNER_HOST`**
  - Value: `91.98.207.106`
  - Used for: SSH connection

- [ ] **`HETZNER_SSH_KEY`**
  - Value: Your private SSH key for Hetzner
  - Used for: SSH authentication

---

## How to Add Secrets

1. Go to: https://github.com/abu-lina/uflow/settings/secrets/actions

2. Click **"New repository secret"**

3. Add each secret:
   - Name: (exactly as shown above)
   - Value: (paste the value)
   - Click **"Add secret"**

4. Repeat for all 8 secrets

---

## Check If Secrets Exist

You can't view secret values, but you can see if they're set:

1. Go to: https://github.com/abu-lina/uflow/settings/secrets/actions
2. You should see these 8 secrets listed:
   - `HETZNER_HOST`
   - `HETZNER_SSH_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ← NEW
   - `RESEND_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TURNSTILE_SECRET_KEY` ← NEW

---

## ⚠️ Important: RESEND_API_KEY

**You just added your Resend API key to Hetzner!**

Make sure it's also in GitHub Secrets:
1. Go to: https://github.com/abu-lina/uflow/settings/secrets/actions
2. Look for: `RESEND_API_KEY`
3. If missing: Add it with your Resend key (starts with `re_`)

---

## 🚀 Once Secrets Are Set

### Step 1: Commit Your Changes

```bash
cd /Users/NARAFIQ/Projects/uflow

# Check what's changed
git status

# Add all files
git add .

# Commit
git commit -m "Security fix: Remove secrets from Docker build, use lazy init

- Changed API routes to use lazy initialization
- Removed secrets from Dockerfile build args
- Updated GitHub Actions to pass secrets at runtime only
- Fixed email confirmation bugs (406 error, email_confirm)
- Fixed build linting errors"

# Push to GitHub
git push origin main
```

### Step 2: Watch GitHub Actions

1. Go to: https://github.com/abu-lina/uflow/actions
2. You'll see the workflow running
3. It will:
   - ✅ Build Docker image (with public vars only)
   - ✅ Deploy to Hetzner (with secrets at runtime)
   - ✅ Run health checks
   - ✅ Update Nginx

### Step 3: Verify Deployment

After ~5-10 minutes:
- ✅ Visit: https://ummahflow.com
- ✅ Test email confirmation
- ✅ Check everything works

---

## 🎯 Workflow Summary

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │
│  Triggered      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Docker   │
│  (no secrets)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy Hetzner │
│  (with secrets) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Live! 🎉      │
│ ummahflow.com   │
└─────────────────┘
```

---

## ✅ Yes, You're Correct!

After secrets are configured:

1. **Commit & push** → GitHub
2. **Merge to main** (or push directly)
3. **GitHub Actions** automatically:
   - Builds
   - Tests
   - Deploys to Hetzner
4. **Live in ~10 minutes!** 🚀

---

## 🔍 What Happens Behind the Scenes

### On Push to Main:

1. GitHub Actions starts
2. Checks out your code
3. Builds Docker image with public vars only
4. Saves image as `uflow.tar.gz`
5. Uploads to Hetzner via SCP
6. SSHs to Hetzner
7. Stops old container
8. Loads new image
9. Starts container with secrets from GitHub Secrets
10. Health checks
11. Updates Nginx
12. Done! ✅

---

## 📋 Final Checklist

Before you push:

- [ ] GitHub Secrets configured (all 8)
- [ ] Changes committed locally
- [ ] Build works locally (`npm run build`)
- [ ] Ready to push

Then:
```bash
git push origin main
```

And watch the magic happen! ✨

