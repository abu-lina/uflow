# UAT PWA Standalone Mode Fix

## Issue
On UAT, the PWA is not running in standalone mode - the browser UI is still visible even after adding to home screen.

## Root Cause

The service worker was disabled on UAT because:

1. **UAT runs with `NODE_ENV=development`** (for debugging purposes)
2. **`next-pwa` was configured to disable PWA when `NODE_ENV === 'development'`**
3. **Without a service worker, the PWA cannot run in standalone mode**

The configuration in `next.config.js` was:
```javascript
disable: process.env.NODE_ENV === 'development',
```

This disabled the service worker on UAT, which prevented the PWA from running in standalone mode.

## Fix Applied

Updated the PWA disable condition to only disable in **local development** (localhost), not in UAT:

```javascript
// Disable PWA only in local development (localhost), not in UAT
// UAT uses NODE_ENV=development but should still have PWA enabled
disable: process.env.NODE_ENV === 'development' && 
         (!process.env.NEXT_PUBLIC_SITE_URL || 
          process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')),
```

## Behavior After Fix

| Environment | NODE_ENV | Site URL | PWA Enabled | Standalone Mode |
|------------|----------|----------|-------------|-----------------|
| Local Dev | `development` | `localhost:3000` | ❌ Disabled | N/A |
| UAT | `development` | `uat.ummahflow.com` | ✅ Enabled | ✅ Works |
| Production | `production` | `ummahflow.com` | ✅ Enabled | ✅ Works |

## Why This Works

- **Local Development**: PWA is disabled because it's running on localhost (no need for PWA during development)
- **UAT**: PWA is enabled because the site URL is `uat.ummahflow.com` (not localhost), allowing proper PWA testing
- **Production**: PWA is enabled because `NODE_ENV=production`

## Testing Steps

1. **Deploy the fix to UAT** (rebuild required)
2. **Clear browser cache** on your device
3. **Visit** `https://uat.ummahflow.com` in Safari/Chrome
4. **Add to Home Screen** (Share → Add to Home Screen)
5. **Launch the app** from home screen
6. **Verify** the app runs in standalone mode (no browser UI visible)

## Files Changed

- `next.config.js` - Updated PWA disable condition to allow PWA on UAT

## Related Issues

- This fix ensures UAT can properly test PWA functionality before production deployment
- UAT and Production now have consistent PWA behavior

