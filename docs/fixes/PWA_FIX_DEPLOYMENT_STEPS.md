# PWA Fix - Deployment Steps

## Changes Completed ✅

All code changes have been implemented:

1. ✅ **next.config.js** - Simplified PWA disable logic to use `DISABLE_PWA` env var
2. ✅ **Dockerfile** - Added `DISABLE_PWA` build arg and ENV variable
3. ✅ **deploy-hetzner.yml** - Added `DISABLE_PWA=false` to production workflow
4. ✅ **deploy-uat.sh** - Added `DISABLE_PWA=false` to UAT deployment script
5. ✅ **Environment templates** - Added `DISABLE_PWA` to all templates

## Next Steps - Deployment & Testing

### Step 1: Deploy to UAT

SSH into Hetzner server and deploy:

```bash
# SSH into server
ssh root@91.98.207.106

# Navigate to project
cd /var/www/uflow

# Pull latest changes
git pull origin main

# Deploy UAT
./scripts/deploy-uat.sh
```

**Expected output:**
- Docker build should complete successfully
- Container should start on port 3001
- Health check should pass

### Step 2: Verify UAT Service Worker

After UAT deployment, verify the service worker:

```bash
# Check service worker file exists
curl -I https://uat.ummahflow.com/sw.js

# Should return:
# HTTP/2 200
# content-type: application/javascript; charset=utf-8
# content-length: ~24000 (size of service worker file)

# Check manifest
curl https://uat.ummahflow.com/api/manifest | jq '.display'
# Should return: "standalone"
```

**Test on iPhone:**
1. Open Safari and go to `https://uat.ummahflow.com`
2. Open DevTools → Application → Service Workers
3. Verify service worker is registered and active
4. Remove existing PWA from home screen (if any)
5. Add to home screen again
6. Launch from home screen
7. Verify it opens in standalone mode (no browser UI)

### Step 3: Deploy to Production

Once UAT is verified, deploy to production:

**Option A: GitHub Actions (Recommended)**
1. Go to GitHub repository
2. Actions → "Deploy to Production" workflow
3. Click "Run workflow"
4. Type "deploy" to confirm
5. Wait for deployment to complete

**Option B: Manual SSH Deployment**
```bash
ssh root@91.98.207.106
cd /var/www/uflow

# Create production deployment script if needed
# Or trigger GitHub Actions manually
```

### Step 4: Verify Production Service Worker

After production deployment:

```bash
# Check service worker
curl -I https://ummahflow.com/sw.js

# Check manifest
curl https://ummahflow.com/api/manifest | jq '.display'
```

**Test on iPhone:**
1. Open Safari and go to `https://ummahflow.com`
2. Clear browser cache (Settings → Safari → Clear History and Website Data)
3. Visit site again
4. Check service worker in DevTools (if available)
5. Remove existing PWA from home screen
6. Add to home screen
7. Launch from home screen
8. Verify standalone mode works (no browser UI)

## Troubleshooting

### If service worker still not registering:

1. **Check Docker build logs:**
   ```bash
   docker logs uflow-uat --tail 100
   docker logs uflow-app --tail 100
   ```

2. **Verify environment variable:**
   ```bash
   docker exec uflow-uat env | grep DISABLE_PWA
   # Should show: DISABLE_PWA=false
   
   docker exec uflow-app env | grep DISABLE_PWA
   # Should show: DISABLE_PWA=false
   ```

3. **Check if service worker file exists in container:**
   ```bash
   docker exec uflow-uat ls -lh /app/public/sw.js
   docker exec uflow-app ls -lh /app/public/sw.js
   ```

4. **Force rebuild with no cache:**
   ```bash
   # In deploy-uat.sh, add --no-cache flag:
   docker build --no-cache \
       --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
       --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
       --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
       --build-arg DISABLE_PWA=false \
       -t uflow-uat:latest .
   ```

### If standalone mode still not working:

1. **Clear Cloudflare cache:**
   - Go to Cloudflare dashboard
   - Caching → Purge Cache → Custom Purge
   - Purge: `/sw.js`, `/api/manifest`

2. **Clear iOS Safari cache completely:**
   - Settings → Safari → Clear History and Website Data
   - Then restart Safari

3. **Verify manifest icons include 180x180:**
   ```bash
   curl https://ummahflow.com/api/manifest | jq '.icons'
   ```

## Success Criteria

✅ UAT:
- Service worker accessible at `https://uat.ummahflow.com/sw.js`
- Service worker registered in browser DevTools
- PWA launches in standalone mode (no browser UI)

✅ Production:
- Service worker accessible at `https://ummahflow.com/sw.js`
- Service worker registered in browser DevTools
- PWA launches in standalone mode (no browser UI)

## Rollback Plan

If issues occur:

1. Revert the changes:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. Redeploy:
   ```bash
   ./scripts/deploy-uat.sh
   # And trigger production deployment
   ```

The old logic will be restored and service worker will be disabled (safe state).

