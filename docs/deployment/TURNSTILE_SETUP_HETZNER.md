# Cloudflare Turnstile Setup for Hetzner Deployment

## Quick Fix: Add GitHub Secrets

Your Turnstile environment variables need to be added as GitHub Secrets for the deployment to work.

---

## Step 1: Get Your Turnstile Keys

1. Go to [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Find your widget (named "uflow")
3. Click on it to view details
4. Copy:
   - **Site Key** (starts with `0x4AAAAAAC...`) → This is `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** (hidden, click to reveal) → This is `TURNSTILE_SECRET_KEY`

---

## Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

### Add First Secret: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

- **Name:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- **Value:** Your Turnstile Site Key (e.g., `0x4AAAAAAC...`)
- Click **"Add secret"**

### Add Second Secret: `TURNSTILE_SECRET_KEY`

- **Name:** `TURNSTILE_SECRET_KEY`
- **Value:** Your Turnstile Secret Key (the hidden one)
- Click **"Add secret"**

---

## Step 3: Verify Secrets Are Added

You should now have these secrets in GitHub:

✅ `NEXT_PUBLIC_SUPABASE_URL`  
✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
✅ `SUPABASE_SERVICE_ROLE_KEY`  
✅ `RESEND_API_KEY`  
✅ `HETZNER_HOST`  
✅ `HETZNER_SSH_KEY`  
✅ **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`** ← NEW  
✅ **`TURNSTILE_SECRET_KEY`** ← NEW  

---

## Step 4: Deploy

Once secrets are added, trigger a new deployment:

### Option A: Push to Main (Auto-Deploy)

```bash
git add Dockerfile .github/workflows/deploy-hetzner.yml
git commit -m "Add Turnstile environment variables to Hetzner deployment"
git push origin main
```

This will automatically trigger the GitHub Actions workflow.

### Option B: Manual Deploy via GitHub UI

1. Go to **Actions** tab in GitHub
2. Click **"Deploy to Hetzner"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

---

## Step 5: Verify Deployment

After deployment completes:

1. Visit: `https://ummahflow.com/signup`
2. Open browser console (F12)
3. You should see:
   ```
   ✅ [SIGNUP] Turnstile script loaded successfully
   ✅ [SIGNUP] CAPTCHA widget rendered with ID: cf-chl-widget-...
   ```
4. **No more:** "CAPTCHA not configured" error ❌

---

## Troubleshooting

### Still seeing "CAPTCHA not configured"?

1. **Check GitHub Secrets:**
   - Go to Settings → Secrets → Actions
   - Verify both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` exist

2. **Check Deployment Logs:**
   - Go to Actions tab
   - Click on the latest deployment
   - Check if secrets were passed correctly

3. **Verify Hostname in Cloudflare:**
   - Make sure `ummahflow.com` is added to your Turnstile widget hostnames
   - Wait 2-3 minutes after adding hostname

4. **Check Container Environment:**
   ```bash
   # SSH into Hetzner server
   ssh root@YOUR_HETZNER_IP
   
   # Check if environment variables are set
   docker exec uflow-app env | grep TURNSTILE
   ```
   
   Should show:
   ```
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAC...
   TURNSTILE_SECRET_KEY=...
   ```

### Error 600010 on Production?

This means the hostname `ummahflow.com` is not configured in Cloudflare Turnstile:

1. Go to Cloudflare Turnstile Dashboard
2. Click on your "uflow" widget
3. Under "Hostname Management", click **"Add Hostnames"**
4. Add: `ummahflow.com`
5. Save and wait 2-3 minutes

---

## Quick Reference

| Variable | Type | Where Used | Example |
|----------|------|------------|---------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Client-side (browser) | `0x4AAAAAAC...` |
| `TURNSTILE_SECRET_KEY` | Secret | Server-side (API) | `0x4AAAAAAC...` (different key) |

**Note:** `NEXT_PUBLIC_*` variables are embedded in the JavaScript bundle and visible to users. This is safe for Turnstile site keys (they're meant to be public).

---

## Files Updated

✅ `Dockerfile` - Added `NEXT_PUBLIC_TURNSTILE_SITE_KEY` build arg  
✅ `.github/workflows/deploy-hetzner.yml` - Added Turnstile secrets to build and runtime  

After adding the GitHub secrets, the next deployment will include Turnstile! 🎉

