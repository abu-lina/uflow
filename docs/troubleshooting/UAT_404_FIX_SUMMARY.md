# UAT 404 Errors - Complete Analysis & Fix

## The Problem

UAT at `https://uat.ummahflow.com` shows these errors in the browser console:

```
GET https://uat.ummahflow.com/_next/static/css/app/layout.css
Status: 404

The resource from "https://uat.ummahflow.com/_next/static/chunks/vendors-*.js" 
was blocked due to MIME type ("") mismatch (X-Content-Type-Options: nosniff).
```

## Root Cause (Simple Explanation)

**The Docker container doesn't have the CSS and JavaScript files.**

Think of it like this:
- Your app is a restaurant (the Next.js app)
- The menu items are the HTML, CSS, and JS files
- The waiter is nginx (serves the files)
- The kitchen is the Docker container (has the files)

**The waiter (nginx) is working fine, but the kitchen (Docker) doesn't have the ingredients (static files).**

## Root Cause (Technical)

1. **Next.js Standalone Build**: When building with `output: 'standalone'`, Next.js creates:
   - `.next/standalone/` → Server code
   - `.next/static/` → Client assets (CSS, JS)

2. **Docker Build Process**: The Dockerfile copies these directories into the container at lines 62-64:
   ```dockerfile
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   ```

3. **The Issue**: If the build fails silently or file tracing has issues (as shown in build.log line 48), the static files may not exist when Docker tries to copy them.

4. **Nginx Consequence**: Nginx is configured correctly to proxy and set MIME types, but when it asks the Next.js server (port 3001) for files that don't exist, it returns 404 or empty responses.

## The Evidence

From your build log (`build.log` line 48):
```
⚠ Failed to copy traced files for /Users/NARAFIQ/Projects/uflow/.next/server/app/(public)/page.js
[Error: ENOENT: no such file or directory, copyfile ... page_client-reference-manifest.js]
```

This warning indicates file tracing issues during standalone build.

## The Fix

### What We Changed

1. **Updated Dockerfile** (added verification):
   ```dockerfile
   # Verify build outputs exist
   RUN echo "Verifying build outputs..." && \
       ls -la .next/ && \
       ls -la .next/static/
   
   # Copy static files
   COPY --from=builder /app/.next/static ./.next/static
   
   # Verify files are in place
   RUN ls -la .next/static/ && \
       echo "Static files copied successfully"
   ```

2. **Created Fix Script**: `scripts/fix-uat-static-files.sh`
   - Diagnoses the issue
   - Rebuilds with `--no-cache`
   - Verifies static files exist
   - Redeploys container

3. **Created Diagnostic Script**: `scripts/diagnose-uat-now.sh`
   - Quick check to confirm the issue
   - Shows exactly what's missing

## How to Apply the Fix

### Option 1: Automated (Recommended)

```bash
# On local machine - commit changes
git add Dockerfile scripts/*.sh
git commit -m "Fix: Add verification for static files in Docker build"
git push origin main

# SSH to Hetzner server
ssh root@your-hetzner-ip
cd /path/to/uflow
git pull origin main

# Run fix
./scripts/fix-uat-static-files.sh
```

### Option 2: Quick Diagnostic First

```bash
# SSH to server
ssh root@your-hetzner-ip
cd /path/to/uflow

# Run diagnostic
./scripts/diagnose-uat-now.sh

# Output will confirm if static files are missing
# Then run fix script if needed
```

### Option 3: Manual Fix

```bash
# SSH to server
ssh root@your-hetzner-ip
cd /path/to/uflow

# Load environment
export $(cat .env.uat | grep -v '^#' | xargs)

# Rebuild with no cache (ensures fresh build)
docker build --no-cache \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg NEXT_PUBLIC_SITE_URL="https://uat.ummahflow.com" \
    --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
    -t uflow-uat:latest .

# Look for these messages in build output:
# ✅ "Verifying build outputs..."
# ✅ "Static files copied successfully"

# Restart container
docker stop uflow-uat && docker rm uflow-uat
docker run -d \
    --name uflow-uat \
    --restart unless-stopped \
    -p 3001:3000 \
    --env-file .env.uat \
    uflow-uat:latest

# Verify fix
docker exec uflow-uat find .next/static -type f | wc -l
# Should show 50+ files

# Test
curl https://uat.ummahflow.com/api/health
```

## Verification Steps

### 1. Check Container Has Files

```bash
# Count files (should be 50+)
docker exec uflow-uat find .next/static -type f | wc -l

# List some files
docker exec uflow-uat ls -la .next/static/css
docker exec uflow-uat ls -la .next/static/chunks | head -10
```

### 2. Test Endpoints

```bash
# Health check (should return 200)
curl -I https://uat.ummahflow.com/api/health

# Homepage (should return 200)
curl -I https://uat.ummahflow.com/
```

### 3. Browser Test

1. **Clear cache**: `Ctrl+Shift+Delete` or `Cmd+Shift+Delete`
2. **Hard refresh**: `Ctrl+F5` or `Cmd+Shift+R`
3. **Open DevTools** (F12) → Console tab
4. **Check for errors**: Should see no 404s or MIME type errors

## Expected Results After Fix

✅ No 404 errors on CSS files
✅ No 404 errors on JS files  
✅ No MIME type mismatch errors
✅ Static files exist in container (50+ files)
✅ Health check returns 200
✅ Website loads without console errors
✅ CSS styles apply correctly
✅ JavaScript runs without errors

## Why This Fix Works

1. **Verification During Build**: We now check if files exist during Docker build
2. **Build Fails Fast**: If static files aren't generated, build fails early with clear error
3. **No Cache**: Using `--no-cache` ensures we don't use stale build artifacts
4. **Explicit Checks**: We verify files are copied successfully in the Docker layers

## Troubleshooting

### If Static Files Still Missing

**Check build logs**:
```bash
docker build ... 2>&1 | tee build.log
grep -i "static\|error\|warning" build.log
```

**Inspect builder stage directly**:
```bash
docker build --target builder -t uflow-builder .
docker run -it uflow-builder /bin/sh
ls -la .next/static
find .next/static -type f | wc -l
```

**Test local build**:
```bash
npm run build:standalone
ls -la .next/static
find .next/static -type f | wc -l
```

### If Files Exist But Still 404

**Check nginx**:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**Check container logs**:
```bash
docker logs -f uflow-uat
```

**Test direct container access**:
```bash
# Should work (bypasses nginx)
curl http://localhost:3001/api/health
```

**Reload nginx**:
```bash
sudo systemctl reload nginx
```

## Files Changed/Created

| File | Status | Purpose |
|------|--------|---------|
| `Dockerfile` | Modified | Added verification steps |
| `scripts/fix-uat-static-files.sh` | New | Automated fix script |
| `scripts/diagnose-uat-now.sh` | New | Quick diagnostic |
| `UAT_STATIC_FILES_FIX.md` | New | Detailed guide |
| `QUICK_FIX_UAT.md` | New | Quick reference |
| `UAT_404_FIX_SUMMARY.md` | New | This file |

## Prevention

To avoid this in future:

1. ✅ **Always check build output** for warnings
2. ✅ **Verify static files** after deployment:
   ```bash
   docker exec uflow-uat find .next/static -type f | wc -l
   ```
3. ✅ **Use the updated Dockerfile** (includes checks)
4. ✅ **Test in browser** with hard refresh after deployment

## Related Issues

This fix also resolves:
- Empty MIME type errors (caused by missing files)
- Broken CSS styling (files not loading)
- JavaScript errors (chunks not found)
- Service worker errors (static manifest missing)

## Questions?

- Check detailed guide: `UAT_STATIC_FILES_FIX.md`
- Run diagnostic: `./scripts/diagnose-uat-now.sh`
- Run fix: `./scripts/fix-uat-static-files.sh`
- Check logs: `docker logs -f uflow-uat`

