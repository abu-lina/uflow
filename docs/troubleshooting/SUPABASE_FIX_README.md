# Supabase Content Loading Fix - Quick Reference

**Issue**: Supabase content not loading on UAT and production (blank pages)  
**Status**: ✅ Fixed - Ready for deployment  
**Date**: December 5, 2025

---

## TL;DR

Environment variables weren't being embedded in Docker builds. Fixed by updating deployment scripts to pass `--build-arg` flags. Ready to deploy.

---

## 📋 Start Here

**New to this fix?** Read in order:

1. **[ACTION_ITEMS.md](ACTION_ITEMS.md)** ← Start here for quick action checklist
2. **[SUPABASE_FIX_SUMMARY.md](SUPABASE_FIX_SUMMARY.md)** ← Complete technical overview
3. **[VERIFY_HETZNER_ENV.md](VERIFY_HETZNER_ENV.md)** ← Verify server environment files
4. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** ← Deploy to UAT and production

**Optional**: [TEST_LOCAL_BUILD.md](TEST_LOCAL_BUILD.md) - Test locally before deploying

---

## 🚀 Quick Deploy (For the Impatient)

```bash
# SSH to Hetzner
ssh root@91.98.207.106
cd /var/www/uflow || cd /root/uflow

# Verify env files exist (if not, see VERIFY_HETZNER_ENV.md)
ls -la .env.production .env.uat

# Pull changes
git pull origin main

# Deploy UAT
./scripts/deploy-uat.sh

# Test: https://uat.ummahflow.com

# Deploy Production (after UAT verification)
./scripts/deploy-hetzner.sh

# Test: https://ummahflow.com
```

---

## 📚 Documentation Guide

### For Understanding the Problem
- **[SUPABASE_FIX_SUMMARY.md](SUPABASE_FIX_SUMMARY.md)** - What was broken, how it was fixed, technical details

### For Action Steps
- **[ACTION_ITEMS.md](ACTION_ITEMS.md)** - Your checklist of what to do next

### For Setup and Verification
- **[VERIFY_HETZNER_ENV.md](VERIFY_HETZNER_ENV.md)** - How to verify `.env.production` and `.env.uat` on server
- **[TEST_LOCAL_BUILD.md](TEST_LOCAL_BUILD.md)** - How to test Docker builds locally (optional)

### For Deployment
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete step-by-step deployment procedures
- Includes: UAT deployment, production deployment, rollback procedures, troubleshooting

---

## ✅ What Was Fixed

### Modified Files
- `scripts/deploy-hetzner.sh` - Now passes environment variables as build arguments
- `scripts/deploy-uat.sh` - Enhanced with better validation
- `Dockerfile` - Added build-time validation

### Key Changes
- Environment variables now passed via `--build-arg` during Docker build
- Added validation at multiple stages (deployment script, Dockerfile)
- Improved error messages and health checks
- Fixed runtime env file reference (`.env.local` → `.env.production`)

---

## 🎯 Expected Results

### Before Fix
- ❌ Blank white pages
- ❌ Console error: "Missing NEXT_PUBLIC_SUPABASE_URL"
- ❌ No data loading from Supabase

### After Fix
- ✅ Pages load normally
- ✅ Provider listings display correctly
- ✅ Supabase data loads
- ✅ Authentication works
- ✅ No console errors

---

## 🔧 Technical Summary

**Problem**: Next.js requires `NEXT_PUBLIC_*` environment variables at build time to embed them in client-side JavaScript.

**Previous behavior**: 
```bash
docker build -t uflow .  # ❌ No env vars
docker run --env-file .env.local uflow  # ⚠️ Too late - code already compiled
```

**Fixed behavior**:
```bash
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL="..." -t uflow .  # ✅ Embedded at build
docker run --env-file .env.production uflow  # ✅ Runtime vars available
```

---

## 📝 Files Created

All documentation files are in project root:

1. `SUPABASE_FIX_README.md` - This file (quick reference)
2. `SUPABASE_FIX_SUMMARY.md` - Complete technical overview
3. `ACTION_ITEMS.md` - Your action checklist
4. `VERIFY_HETZNER_ENV.md` - Environment file verification
5. `TEST_LOCAL_BUILD.md` - Local testing guide
6. `DEPLOYMENT_GUIDE.md` - Complete deployment procedures

---

## 🚨 Important Notes

1. **Environment files required**: `.env.production` and `.env.uat` must exist on Hetzner server
2. **Deploy UAT first**: Always test on UAT before production
3. **Credentials format**: Supabase URL must be `https://*.supabase.co`, anon key must start with `sb_publishable_` (new) or `eyJ` (legacy)
4. **Rollback available**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) if issues occur

---

## 🆘 Need Help?

### If environment files missing
→ See [VERIFY_HETZNER_ENV.md](VERIFY_HETZNER_ENV.md)

### If deployment fails
→ See "Troubleshooting" in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### If still seeing blank pages
→ Check browser console and container logs:
```bash
docker logs uflow --tail 100
```

### If need to rollback
→ See "Rollback Procedure" in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## Next Steps

1. Read [ACTION_ITEMS.md](ACTION_ITEMS.md) for your checklist
2. Verify environment files exist on Hetzner (see [VERIFY_HETZNER_ENV.md](VERIFY_HETZNER_ENV.md))
3. Deploy to UAT following [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
4. Test UAT at https://uat.ummahflow.com
5. Deploy to production
6. Test production at https://ummahflow.com

---

**Questions?** All answers are in the documentation files above. Start with [ACTION_ITEMS.md](ACTION_ITEMS.md).

