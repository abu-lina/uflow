# UAT-First Deployment Strategy

This document explains how the deployment pipeline ensures UAT always deploys before production.

## Overview

When you push to the `main` branch, the deployment process follows this sequence:

1. **UAT Deployment** runs automatically
2. **Production Deployment** runs only after UAT succeeds

This ensures that every change is tested in UAT before reaching production.

## How It Works

### Deployment Flow

```
Push to main
    ↓
Deploy to UAT workflow triggers automatically
    ↓
UAT deployment completes successfully
    ↓
You manually trigger Production deployment
    ↓
Type "deploy" to confirm
    ↓
Production deployment completes
```

### Workflow Files

- **`.github/workflows/deploy-uat.yml`** - Deploys to UAT environment
  - Triggers on: push to `main`, manual dispatch
  - Deploys to: `https://uat.ummahflow.com` (port 3001)

- **`.github/workflows/deploy-hetzner.yml`** - Deploys to Production
  - Triggers on: manual dispatch only (requires typing "deploy" to confirm)
  - Deploys to: `https://ummahflow.com` (port 3000)

### Key Features

1. **Automatic UAT First**: Every push to `main` triggers UAT deployment automatically
2. **Manual Production Only**: Production deployment is always manual (works on GitHub Free tier)
3. **Confirmation Required**: Production requires typing "deploy" to confirm
4. **Health Checks**: Both deployments include health checks before completion

## Required GitHub Secrets

### Shared Secrets (used by both UAT and Production)
- `HETZNER_HOST` - Your Hetzner server IP
- `HETZNER_SSH_KEY` - SSH private key for Hetzner server

### Production Secrets
- `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Production Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Production service role key
- `RESEND_API_KEY` - Production Resend API key
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Production Turnstile site key
- `TURNSTILE_SECRET_KEY` - Production Turnstile secret key

### UAT Secrets (Optional - falls back to production secrets if not set)
You can optionally create UAT-specific secrets with the `UAT_` prefix:
- `UAT_NEXT_PUBLIC_SUPABASE_URL` (optional)
- `UAT_NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional)
- `UAT_SUPABASE_SERVICE_ROLE_KEY` (optional)
- `UAT_RESEND_API_KEY` (optional)
- `UAT_NEXT_PUBLIC_TURNSTILE_SITE_KEY` (optional)
- `UAT_TURNSTILE_SECRET_KEY` (optional)

If UAT-specific secrets are not set, the workflow will use the production secrets (with `NEXT_PUBLIC_SITE_URL` set to `https://uat.ummahflow.com`).

## Manual Production Deployment

Production deployments are **always manual** and require explicit confirmation. This works on GitHub Free tier with private repositories.

### How to Deploy to Production

1. **Wait for UAT to complete**: After pushing to `main`, UAT will deploy automatically
2. **Review UAT**: Test your changes at `https://uat.ummahflow.com`
3. **Trigger Production**: 
   - Go to **Actions** tab
   - Select **"Deploy to Production"** workflow
   - Click **"Run workflow"** button
   - In the input field, type: `deploy`
   - Click **"Run workflow"** to start
4. **Deployment proceeds**: Once confirmed, production deployment runs automatically

### Why Manual Only?

- **GitHub Free tier limitation**: Environment protection rules with required reviewers are only available for public repos or GitHub Enterprise
- **Safety**: Manual confirmation prevents accidental production deployments
- **Control**: You decide when to deploy after reviewing UAT

## Manual Deployment

### Deploy UAT Only
1. Go to GitHub Actions
2. Select "Deploy to UAT" workflow
3. Click "Run workflow" → "Run workflow"

### Deploy Production
1. Go to GitHub Actions
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. In the input field, type: `deploy`
5. Click "Run workflow" to start

**Note**: Production deployment always requires manual confirmation by typing "deploy". This ensures you have full control over when production updates happen.

## Troubleshooting

### Production Deployment Not Starting

If production deployment doesn't start:

1. **Check confirmation input**: Make sure you typed `deploy` exactly (case-sensitive)
2. **Check workflow dispatch**: Verify you clicked "Run workflow" after entering the confirmation
3. **Check workflow logs**: Look for the "Verify deployment confirmation" step to see what was received

### UAT Deployment Fails

If UAT deployment fails:
- Production will **not** deploy automatically
- Fix the issue in UAT first
- Once UAT succeeds, production will deploy automatically

### Viewing Deployment Logs

1. Go to GitHub Actions tab
2. Click on the workflow run
3. Expand job steps to see detailed logs
4. Check health check results and error messages

## Best Practices

1. **Always test in UAT first**: Let the automatic flow handle UAT deployment
2. **Monitor UAT health**: Check `https://uat.ummahflow.com/api/health` after UAT deployment
3. **Review before deploying**: Test UAT thoroughly before manually triggering production
4. **Use manual confirmation**: The "deploy" confirmation prevents accidental deployments
5. **Follow the flow**: Push → UAT auto-deploys → Review → Manually deploy to production

## Deployment URLs

- **UAT**: https://uat.ummahflow.com
- **Production**: https://ummahflow.com
- **UAT Health Check**: https://uat.ummahflow.com/api/health
- **Production Health Check**: https://ummahflow.com/api/health

