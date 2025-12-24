# iOS Standalone Mode Troubleshooting

## Issue
PWA added to home screen on iPhone still shows browser UI instead of standalone mode.

## Critical iOS Safari Requirements

iOS Safari has **strict requirements** for standalone mode:

1. **Service Worker MUST be ACTIVE** (not just registered) when adding to home screen
2. **Manifest MUST be accessible** and valid
3. **Meta tags MUST be present** in HTML head
4. **HTTPS required** (already satisfied)

## Root Cause Analysis

### Most Common Issue: Service Worker Not Active When Added

**Problem**: If you add the PWA to home screen BEFORE the service worker is fully active, iOS will cache it as a "web bookmark" instead of a PWA, and it will always show the browser UI.

**Solution**: The service worker must be in "activated" state before adding to home screen.

## Step-by-Step iOS Installation Process

### Correct Installation Steps:

1. **Open Safari** on iPhone
2. **Navigate to** `https://uat.ummahflow.com` (or production)
3. **Wait 10-15 seconds** for page to fully load
4. **Verify service worker is active**:
   - Open Safari DevTools (if available)
   - Or check console for "Service Worker registered" message
   - Service worker should be in "activated" state
5. **THEN add to home screen**:
   - Tap Share button (square with arrow)
   - Select "Add to Home Screen"
   - Confirm

### If Already Added Incorrectly:

1. **Remove from home screen**: Long press icon → Remove App
2. **Clear Safari cache**: Settings → Safari → Clear History and Website Data
3. **Wait 5 minutes** (iOS caches PWA state)
4. **Follow correct installation steps above**

## Verification Checklist

### Before Adding to Home Screen:

- [ ] Page fully loaded (wait 10-15 seconds)
- [ ] Service worker registered (check DevTools)
- [ ] Service worker in "activated" state (not "installing" or "waiting")
- [ ] Manifest accessible: `https://uat.ummahflow.com/api/manifest` returns 200
- [ ] HTTPS enabled (green lock icon)

### After Adding to Home Screen:

- [ ] Icon appears on home screen
- [ ] Launching from icon opens in standalone mode (no browser UI)
- [ ] No Safari address bar visible
- [ ] No Safari navigation buttons visible

## Technical Verification

### Check Manifest is Accessible:

```bash
curl -I https://uat.ummahflow.com/api/manifest
# Should return: HTTP/1.1 200 OK
```

### Check Meta Tags in HTML:

```bash
curl https://uat.ummahflow.com | grep -i "apple-mobile-web-app"
# Should show:
# <meta name="apple-mobile-web-app-capable" content="yes">
# <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
# <meta name="apple-mobile-web-app-title" content="Ummah Flow">
```

### Check Service Worker:

```bash
curl -I https://uat.ummahflow.com/sw.js
# Should return: HTTP/1.1 200 OK
```

## Common Issues and Fixes

### Issue 1: Service Worker Not Active

**Symptom**: Service worker shows as "installing" or "waiting" in DevTools

**Fix**: 
- Wait for service worker to activate (usually 5-10 seconds)
- Check console for errors
- Verify `skipWaiting: true` in `next.config.js`

### Issue 2: Manifest Not Accessible

**Symptom**: `curl https://uat.ummahflow.com/api/manifest` returns 404 or 403

**Fix**:
- Check Nginx configuration allows `/api/manifest`
- Verify Cloudflare isn't blocking it
- Check container logs for errors

### Issue 3: Meta Tags Missing

**Symptom**: HTML doesn't contain `apple-mobile-web-app-capable` meta tag

**Fix**:
- Verify `appleWebApp` in `metadataUtils.ts`
- Rebuild and redeploy
- Check Next.js is generating meta tags correctly

### Issue 4: iOS Cached Old Version

**Symptom**: Even after fixes, still shows browser UI

**Fix**:
- Remove from home screen
- Clear Safari cache completely
- Wait 5-10 minutes (iOS cache TTL)
- Re-add following correct steps

## Testing on iPhone

### Proper Test Procedure:

1. **Fresh start**:
   - Clear Safari cache
   - Remove any existing home screen icon
   - Wait 5 minutes

2. **Visit site**:
   - Open Safari
   - Go to `https://uat.ummahflow.com`
   - **Wait 15 seconds** (critical!)

3. **Verify service worker**:
   - Open Safari DevTools (Settings → Advanced → Web Inspector)
   - Check Application → Service Workers
   - Must show "activated and is running"

4. **Add to home screen**:
   - Tap Share → Add to Home Screen
   - Confirm

5. **Test standalone mode**:
   - Close Safari completely
   - Launch from home screen icon
   - Should open without browser UI

## Debugging Commands

### On Server (Hetzner):

```bash
# Check service worker file exists
docker exec uflow-uat ls -lh /app/public/sw.js

# Check manifest API works
docker exec uflow-uat curl -I http://localhost:3000/api/manifest

# Check container logs
docker logs uflow-uat --tail 50 | grep -iE "(service|worker|manifest)"
```

### In Browser Console:

```javascript
// Check service worker registration
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service workers:', regs.length);
  regs.forEach(reg => {
    console.log('State:', reg.active?.state);
    console.log('Scope:', reg.scope);
  });
});

// Check manifest
fetch('/api/manifest')
  .then(r => r.json())
  .then(m => console.log('Manifest:', m));
```

## Next Steps

1. **Verify all requirements are met** (checklist above)
2. **Follow correct installation steps** (wait for service worker)
3. **Test on fresh iPhone** (clear cache, remove old icon)
4. **If still not working**, check:
   - Manifest accessibility
   - Meta tags in HTML
   - Service worker activation
   - iOS cache (wait 5-10 minutes)

## Additional Notes

- iOS Safari doesn't show install prompts like Android
- Users must manually add via Share menu
- Service worker MUST be active before adding
- iOS caches PWA state aggressively (5-10 minute TTL)
- Removing and re-adding requires cache clear + wait time

