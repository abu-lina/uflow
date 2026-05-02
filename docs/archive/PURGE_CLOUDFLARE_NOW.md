# Purge Cloudflare Cache - UAT MIME Type Fix

## Quick Action Required

The UAT MIME type issue is caused by **Cloudflare serving stale cached responses**. Everything else is working correctly:

- ✅ Static files exist (183 files)
- ✅ Next.js serves files with Content-Type
- ✅ Nginx config is correct and active
- ✅ Server returns proper headers

**You just need to purge the Cloudflare cache.**

---

## Method 1: Cloudflare Dashboard (Easiest - 2 minutes)

### Step-by-Step:

1. **Login to Cloudflare:**
   - Go to: https://dash.cloudflare.com
   - Login with your account

2. **Select Zone:**
   - Click on `ummahflow.com`

3. **Navigate to Caching:**
   - Left sidebar → Click **Caching**
   - Click **Configuration** tab

4. **Purge Cache:**
   - Scroll down to "Purge Cache" section
   - Click **Purge Everything** button
   - Confirm the purge

5. **Wait:**
   - Wait 10-30 seconds for propagation

6. **Test:**
   - Go to https://uat.ummahflow.com
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
   - Check DevTools Console - MIME errors should be gone

---

## Method 2: Custom Purge (More Targeted)

If you want to purge only UAT static files:

1. In Cloudflare Dashboard → Caching → Configuration
2. Click **Custom Purge**
3. Select **Prefix** tab
4. Enter: `https://uat.ummahflow.com/_next/static/`
5. Click **Purge**

---

## Method 3: API (If You Have Token)

If you have a Cloudflare API token:

```bash
export CLOUDFLARE_API_TOKEN='your-token'
./scripts/purge-cloudflare-quick.sh
```

**Don't have a token?** Create one:
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Cache Purge**
4. Select zone: `ummahflow.com`
5. Copy token and use above command

---

## After Purging

### In Your Browser:

1. **Clear browser cache:**
   - Mac: `Cmd+Shift+Delete`
   - Windows: `Ctrl+Shift+Delete`
   - Select "Cached images and files"
   - Clear data

2. **Hard refresh UAT:**
   - Go to: https://uat.ummahflow.com
   - Mac: `Cmd+Shift+R`
   - Windows: `Ctrl+F5`

3. **Verify in DevTools:**
   - Open Console (F12)
   - Check for MIME type errors
   - They should be gone!

### Test Specific Files:

```bash
# Test CSS file
curl -I https://uat.ummahflow.com/_next/static/css/8333b52689569ac6.css

# Should show:
# content-type: text/css; charset=utf-8

# Test JS file
curl -I https://uat.ummahflow.com/_next/static/chunks/vendors-00833fa6-e59f4a49f0e4d56f.js

# Should show:
# content-type: application/javascript; charset=utf-8
```

---

## Why This Happened

1. **Initial deployment:** UAT was deployed without proper nginx MIME type configuration
2. **Cloudflare cached:** Cloudflare cached the responses with empty Content-Type headers
3. **Config was fixed:** Nginx configuration was updated with correct MIME types
4. **Cache is stale:** Cloudflare is still serving old cached responses
5. **Purge needed:** Cache purge will force Cloudflare to get fresh responses with correct headers

---

## What to Expect

### Before Purge (Current State):
```
Browser: https://uat.ummahflow.com/_next/static/css/8333b52689569ac6.css
    ↓
Cloudflare Cache (stale): Content-Type: ""
    ↓
Browser blocks: MIME type mismatch error ❌
```

### After Purge:
```
Browser: https://uat.ummahflow.com/_next/static/css/8333b52689569ac6.css
    ↓
Cloudflare Cache (empty, fetches from origin)
    ↓
Nginx + Next.js: Content-Type: text/css; charset=utf-8
    ↓
Cloudflare caches fresh response
    ↓
Browser loads successfully ✅
```

---

## Confirmation

Once purged and verified, you should see:

✅ **No MIME type errors** in browser console  
✅ **All CSS files load** with proper styling  
✅ **All JS files load** and execute  
✅ **Page renders correctly** with all functionality  
✅ **DevTools Network tab** shows `content-type: text/css` and `content-type: application/javascript`

---

## Need Help?

If purging doesn't fix it:

1. Check diagnosis file: `UAT_MIME_TYPE_DIAGNOSIS.md`
2. Verify cache is actually purged (wait 30 seconds)
3. Try incognito/private window
4. Check browser console for new errors
5. Test with cURL to confirm headers are correct

---

**Ready?** Go purge that cache! 🚀

The quickest way is **Method 1** - just click "Purge Everything" in Cloudflare dashboard.









