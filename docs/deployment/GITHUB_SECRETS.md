# GitHub Secrets Configuration

Complete guide for setting up GitHub Secrets for automated Hetzner deployment.

## Overview

GitHub Secrets are encrypted environment variables that are available during GitHub Actions workflow runs. They allow you to securely store sensitive information like API keys and credentials without committing them to your repository.

---

## Required Secrets

### Supabase Secrets

- [ ] **`NEXT_PUBLIC_SUPABASE_URL`**
  - **Value:** Your Supabase project URL (e.g., `https://rdtdtcfntopcxcigkqoq.supabase.co`)
  - **Used for:** Build time (Next.js public variables)
  - **Example:** `https://your-project.supabase.co`

- [ ] **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
  - **Value:** Your Supabase anonymous/public key
  - **Used for:** Build time (Next.js public variables)
  - **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

- [ ] **`SUPABASE_SERVICE_ROLE_KEY`**
  - **Value:** Your Supabase service role key (keep secret!)
  - **Used for:** Runtime (passed to container)
  - **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - **⚠️ Warning:** Never expose this key publicly!

### Email Service

- [ ] **`RESEND_API_KEY`**
  - **Value:** Your Resend API key (starts with `re_`)
  - **Used for:** Runtime (email sending)
  - **Example:** `re_4m8Qc9hr_C9b2hRuL3dYDPnRu6mxwTLyL`

### Hetzner Deployment

- [ ] **`HETZNER_HOST`**
  - **Value:** Your Hetzner server IP address
  - **Used for:** SSH connection during deployment
  - **Example:** `91.98.207.106`

- [ ] **`HETZNER_SSH_KEY`**
  - **Value:** Your private SSH key for Hetzner server
  - **Used for:** SSH authentication during deployment
  - **Format:** Full private key (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

### Cloudflare Turnstile (Optional)

- [ ] **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`**
  - **Value:** Your Cloudflare Turnstile site key (starts with `0x4AAAAAAC...`)
  - **Used for:** Build time (Next.js public variable)
  - **Example:** `0x4AAAAAACAqOzp-Vvpm5W5a`

- [ ] **`TURNSTILE_SECRET_KEY`**
  - **Value:** Your Cloudflare Turnstile secret key
  - **Used for:** Runtime (server-side verification)
  - **⚠️ Warning:** Keep this secret!

---

## How to Add Secrets

### Step 1: Navigate to Secrets Page

1. Go to your GitHub repository: `https://github.com/abu-lina/uflow`
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"**

### Step 2: Add Each Secret

For each secret above:

1. **Name:** Enter the exact secret name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
2. **Secret:** Paste the secret value
3. Click **"Add secret"**

**Repeat for all required secrets.**

---

## Quick Setup Checklist

Use this checklist to ensure all secrets are configured:

### Essential Secrets (Required)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `HETZNER_HOST`
- [ ] `HETZNER_SSH_KEY`

### Optional Secrets (If Using)

- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- [ ] `TURNSTILE_SECRET_KEY`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Any other API keys your app uses

---

## Verifying Secrets

### Check Secrets Are Added

1. Go to: `https://github.com/abu-lina/uflow/settings/secrets/actions`
2. You should see all your secrets listed (values are hidden)
3. Verify all required secrets are present

### Test Deployment

After adding secrets, trigger a deployment:

```bash
# Push to main (auto-deploys)
git push origin main
```

Or manually trigger:

1. Go to **Actions** tab
2. Click **"Deploy to Hetzner"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

---

## Finding Secret Values

### From Local Environment

```bash
# View your local environment variables
cat .env.local

# Copy values to GitHub Secrets
# Make sure names match exactly!
```

### From Service Dashboards

- **Supabase:** Dashboard → Project Settings → API
- **Resend:** Dashboard → API Keys
- **Cloudflare Turnstile:** Dashboard → Turnstile → Your Widget
- **Hetzner:** Cloud Console → Your Server → IP Address

---

## Security Best Practices

### ✅ Do

- ✅ Use GitHub Secrets for all sensitive data
- ✅ Never commit secrets to git
- ✅ Use different secrets for production and UAT
- ✅ Rotate secrets regularly
- ✅ Use least privilege (only grant necessary access)

### ❌ Don't

- ❌ Never commit `.env.local` to git
- ❌ Never share secrets in chat/email
- ❌ Never hardcode secrets in code
- ❌ Never expose secrets in logs
- ❌ Never use production secrets in development

---

## Troubleshooting

### Secret Not Found Error

**Error:** `Secret 'SECRET_NAME' not found`

**Solution:**
1. Verify secret name is spelled correctly
2. Check it's added in the correct repository
3. Ensure it's added under "Actions" secrets (not "Dependabot")

### Secret Value Incorrect

**Error:** Deployment fails with authentication errors

**Solution:**
1. Verify secret value is correct (no extra spaces)
2. Check if secret needs to be updated
3. Re-add the secret with correct value

### SSH Key Issues

**Error:** `Permission denied (publickey)`

**Solution:**
1. Verify `HETZNER_SSH_KEY` includes full private key
2. Ensure key has proper format (includes BEGIN/END lines)
3. Verify key matches the public key on Hetzner server

---

## After Adding Secrets

Once all secrets are configured:

1. **Deployment will automatically retry** (if a workflow failed)
2. **Or trigger manually:**
   - Go to **Actions** tab
   - Click on failed workflow
   - Click **"Re-run all jobs"**

---

## Related Documentation

- [Hetzner Deployment](./HETZNER_DEPLOYMENT.md) - Full deployment guide
- [Turnstile Setup](./TURNSTILE_SETUP_HETZNER.md) - Turnstile configuration
- [UAT Deployment](./UAT_DEPLOYMENT.md) - UAT environment setup

---

## Quick Reference

| Secret | Type | Used For | Example |
|--------|------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Build | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Build | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Runtime | `eyJhbGci...` |
| `RESEND_API_KEY` | Secret | Runtime | `re_xxx...` |
| `HETZNER_HOST` | Public | Deployment | `91.98.207.106` |
| `HETZNER_SSH_KEY` | Secret | Deployment | `-----BEGIN...` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Build | `0x4AAAAAAC...` |
| `TURNSTILE_SECRET_KEY` | Secret | Runtime | `0x4AAAAAAC...` |

---

## Summary

**What you've accomplished:**
- ✅ All required secrets added to GitHub
- ✅ Secrets encrypted and secure
- ✅ Ready for automated deployment
- ✅ CI/CD pipeline configured

**Next Steps:**
1. Verify all secrets are added
2. Test deployment workflow
3. Monitor deployment logs
4. Set up alerts for failed deployments

**Your deployment is now automated!** 🚀



