# UAT PWA Deployment Checklist

## Issue
PWA is not working in standalone mode on UAT after code fix.

## Root Cause
The fix requires a **rebuild and redeployment** because:
1. `next.config.js` is evaluated at **build time**, not runtime
2. The service worker file (`sw.js`) is generated during build
3. The PWA disable condition needs to be evaluated during Docker build

## Deployment Steps

### Step 1: Verify Environment Variables on Hetzner

SSH into Hetzner server and check `.env.uat`:

```bash
ssh root@91.98.207.106
cd /var/www/uflow  # or wherever your project is
cat .env.uat | grep NEXT_PUBLIC_SITE_URL
```

**Expected output:**
```
NEXT_PUBLIC_SITE_URL=https://uat.ummahflow.com
```

If it's missing or wrong, fix it:
```bash
nano .env.uat
# Add or update: NEXT_PUBLIC_SITE_URL=https://uat.ummahflow.com
```

### Step 2: Pull Latest Code

On Hetzner server:
```bash
cd /var/www/uflow  # or your project directory
git pull origin main
```

Verify the fix is in `next.config.js`:
```bash
grep -A 3 "Disable PWA only in local development" next.config.js
```

Should show:
```javascript
// Disable PWA only in local development (localhost), not in UAT
// UAT uses NODE_ENV=development but should still have PWA enabled
disable: process.env.NODE_ENV === 'development' && 
```

### Step 3: Rebuild and Redeploy UAT

On Hetzner server:
```bash
cd /var/www/uflow  # or your project directory
./scripts/deploy-uat.sh
```

This will:
1. ✅ Load environment variables from `.env.uat`
2. ✅ Pass `NEXT_PUBLIC_SITE_URL` as build arg
3. ✅ Build Docker image with new config
4. ✅ Generate service worker with PWA enabled
5. ✅ Deploy new container

### Step 4: Verify Service Worker Exists

After deployment, check:
```bash
curl -I https://uat.ummahflow.com/sw.js
```

Should return:
- HTTP 200
- `content-type: application/javascript`

### Step 5: Clear Browser Cache and Test

1. **On your device:**
   - Clear Safari/Chrome cache
   - Or use private/incognito mode

2. **Visit UAT:**
   - Go to `https://uat.ummahflow.com`
   - Wait for page to fully load

3. **Check Service Worker:**
   - Open DevTools → Application → Service Workers
   - Should see service worker registered

4. **Add to Home Screen:**
   - Safari: Share → Add to Home Screen
   - Chrome: Menu → Install App / Add to Home Screen

5. **Launch from Home Screen:**
   - Should open in standalone mode (no browser UI)

## Troubleshooting

### Service Worker Not Registering

Check browser console for errors:
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(console.log)
```

Should show at least one registration.

### Still Shows Browser UI

1. **Verify manifest:**
   ```bash
   curl https://uat.ummahflow.com/api/manifest | jq '.display'
   ```
   Should return: `"standalone"`

2. **Check service worker file:**
   ```bash
   curl -I https://uat.ummahflow.com/sw.js
   ```
   Should return HTTP 200

3. **Verify build used correct config:**
   - Check Docker build logs for any errors
   - Verify `NEXT_PUBLIC_SITE_URL` was passed as build arg

### GitHub Actions Deployment

If using GitHub Actions, ensure:
1. ✅ `.env.uat` exists in repository (or use secrets)
2. ✅ Workflow passes `NEXT_PUBLIC_SITE_URL` as build arg
3. ✅ Workflow runs `deploy-uat.sh` script

Check `.github/workflows/deploy-uat.yml` if it exists.

## Quick Verification Commands

```bash
# On Hetzner server, after deployment:

# 1. Check service worker exists
curl -I https://uat.ummahflow.com/sw.js

# 2. Check manifest
curl https://uat.ummahflow.com/api/manifest | jq '{display, start_url, scope}'

# 3. Check container logs
docker logs uflow-uat | tail -50

# 4. Verify environment variable
docker exec uflow-uat env | grep NEXT_PUBLIC_SITE_URL
```

## Expected Results

After successful deployment:
- ✅ Service worker accessible at `/sw.js`
- ✅ Manifest shows `display: "standalone"`
- ✅ PWA installs and runs in standalone mode
- ✅ No browser UI visible when launched from home screen

