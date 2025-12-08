# UAT MIME Type Issue - Diagnosis Complete

**Date:** December 7, 2025  
**Issue:** Resources blocked due to empty MIME type with `X-Content-Type-Options: nosniff`

## Root Cause: Cloudflare Cache

The issue is **Cloudflare caching old responses** with empty MIME types. The UAT server and application are working correctly.

## Diagnosis Results

### ✅ Step 1: Container Static Files
- **Status:** PASS
- **File count:** 183 static files found
- **Confirmation:** All CSS and JS files exist in container
- **Example files:**
  - `.next/static/css/8333b52689569ac6.css` ✅
  - `.next/static/chunks/vendors-*.js` ✅

### ✅ Step 2: Next.js Server (Direct Container Access)
- **Status:** PASS
- **Test command:** `curl -I http://localhost:3001/_next/static/css/8333b52689569ac6.css`
- **Result:** Correct Content-Type headers are present
  ```
  Content-Type: text/css; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable
  ```

### ✅ Step 3: Nginx Configuration
- **Status:** PASS
- **Config file:** `/etc/nginx/sites-available/uat-ummahflow`
- **Symlink:** Active in `/etc/nginx/sites-enabled/`
- **MIME type rules:** Correctly configured
  ```nginx
  location ~* ^/_next/static/.*\.js$ {
      proxy_hide_header Content-Type;
      add_header Content-Type "application/javascript; charset=utf-8" always;
  }
  
  location ~* ^/_next/static/.*\.css$ {
      proxy_hide_header Content-Type;
      add_header Content-Type "text/css; charset=utf-8" always;
  }
  ```

### ✅ Step 4: Public URL (Through Nginx)
- **Status:** PASS
- **Test command:** `curl -I https://uat.ummahflow.com/_next/static/css/8333b52689569ac6.css`
- **Result (from server):** Correct Content-Type headers are present
  ```
  content-type: text/css; charset=utf-8
  cache-control: public, max-age=31536000, immutable
  server: cloudflare
  ```

## The Problem

When tested from the **Hetzner server**, the Content-Type headers are correct. However, users are still seeing empty MIME types in their browsers. This indicates **Cloudflare is serving cached responses** from before the nginx configuration was fixed.

## Solution: Purge Cloudflare Cache

### Option 1: Manual Purge (Dashboard)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select `ummahflow.com` zone
3. Navigate to: **Caching** → **Configuration**
4. Click **Purge Everything** or use **Custom Purge**
5. For custom purge, add:
   - `https://uat.ummahflow.com/_next/static/*`

### Option 2: Automated Purge (Requires API Token)
If you have a Cloudflare API token:

```bash
export CLOUDFLARE_API_TOKEN='your-token-here'
./scripts/purge-cloudflare-quick.sh
```

To create an API token:
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Create token with **Zone.Cache Purge** permission
3. Copy the token

### Option 3: Purge via cURL (Manual)
```bash
# Get zone ID
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=ummahflow.com" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" | \
    grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Purge cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}'
```

## After Purging Cache

1. **Wait:** 10-30 seconds for Cloudflare to propagate changes
2. **Clear browser cache:** 
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Firefox: `Ctrl+Shift+Delete`
3. **Hard refresh:** `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
4. **Test:** Visit `https://uat.ummahflow.com` and check DevTools Console

## Expected Result

After purging cache and hard refresh:
- ✅ No MIME type errors in console
- ✅ CSS files load with `Content-Type: text/css; charset=utf-8`
- ✅ JS files load with `Content-Type: application/javascript; charset=utf-8`
- ✅ Page renders correctly with all styles applied

## Summary

| Component | Status | Issue |
|-----------|--------|-------|
| Static Files | ✅ Present | 183 files in container |
| Next.js Server | ✅ Working | Serves files with correct Content-Type |
| Nginx Config | ✅ Correct | Properly sets MIME types |
| Server Response | ✅ Working | Headers correct when tested from server |
| Cloudflare Cache | ❌ **Stale** | Serving old responses with empty MIME types |

**Action Required:** Purge Cloudflare cache for UAT subdomain.

## Verification Commands

Test these after purging cache:

```bash
# Test from your browser or command line
curl -I https://uat.ummahflow.com/_next/static/css/8333b52689569ac6.css

# Should show:
# content-type: text/css; charset=utf-8
```

## No Deployment Needed

✅ The UAT application is **working correctly**  
✅ The nginx configuration is **already applied**  
✅ The Docker container has **all static files**  

**Only cache purge is needed.**



