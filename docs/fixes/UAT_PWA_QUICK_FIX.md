# UAT PWA Quick Fix Guide

## The Problem
The code fix requires a **rebuild** because `next.config.js` is evaluated at **build time**, not runtime.

## What You Need to Do

### Option 1: Manual Deployment (Recommended)

**On Hetzner Server:**

```bash
# 1. SSH into server
ssh root@91.98.207.106

# 2. Navigate to project
cd /var/www/uflow  # or wherever your project is

# 3. Pull latest code (with the fix)
git pull origin main

# 4. Verify .env.uat has NEXT_PUBLIC_SITE_URL
cat .env.uat | grep NEXT_PUBLIC_SITE_URL
# Should show: NEXT_PUBLIC_SITE_URL=https://uat.ummahflow.com

# 5. Rebuild and redeploy
./scripts/deploy-uat.sh
```

This will:
- ✅ Build new Docker image with updated `next.config.js`
- ✅ Generate service worker with PWA enabled
- ✅ Deploy new container

### Option 2: GitHub Actions (If Configured)

If you have GitHub Actions set up:
1. Push your code to `main` branch
2. GitHub Actions will automatically deploy
3. Wait for deployment to complete

## Verify It Worked

After deployment:

```bash
# Check service worker exists
curl -I https://uat.ummahflow.com/sw.js
# Should return HTTP 200

# Check manifest
curl https://uat.ummahflow.com/api/manifest | jq '.display'
# Should return: "standalone"
```

## Test on Your Device

1. **Clear browser cache** (or use private mode)
2. Visit `https://uat.ummahflow.com`
3. **Add to Home Screen**
4. **Launch from home screen** - should open in standalone mode (no browser UI)

## Why Rebuild is Required

- `next.config.js` is read during Docker build
- Service worker (`sw.js`) is generated during build
- Old build = old config = PWA disabled
- New build = new config = PWA enabled

## Troubleshooting

### Still Not Working After Rebuild?

1. **Check build logs:**
   ```bash
   docker logs uflow-uat | grep -i "pwa\|service\|worker"
   ```

2. **Verify environment variable:**
   ```bash
   docker exec uflow-uat env | grep NEXT_PUBLIC_SITE_URL
   # Should show: NEXT_PUBLIC_SITE_URL=https://uat.ummahflow.com
   ```

3. **Clear browser cache completely:**
   - Safari: Settings → Safari → Clear History and Website Data
   - Chrome: Settings → Privacy → Clear browsing data

4. **Check service worker registration:**
   - Open DevTools → Application → Service Workers
   - Should see service worker registered and active

