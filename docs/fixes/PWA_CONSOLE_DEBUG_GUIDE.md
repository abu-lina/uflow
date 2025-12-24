# PWA Console Debugging Guide

## Quick Status Check

✅ Service worker files exist on both UAT and production (~24KB)
❓ Need to verify if they're being registered by the browser

## Step-by-Step Console Debugging

### 1. Check Service Worker Registration (iPhone Safari)

**On your iPhone:**

1. Open Safari
2. Go to `https://ummahflow.com` (or `https://uat.ummahflow.com`)
3. Wait for page to fully load
4. Open **DevTools** (if available on iPhone Safari)
   - Or use **Safari on Mac** → Develop → [Your iPhone] → [Page]

**In Console, run:**
```javascript
// Check if service worker is supported
if ('serviceWorker' in navigator) {
  console.log('✅ Service Worker supported');
  
  // Get all registrations
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log(`Found ${registrations.length} service worker(s)`);
    registrations.forEach((reg, i) => {
      console.log(`SW ${i}:`, {
        scope: reg.scope,
        state: reg.active?.state,
        updateFound: reg.installing !== null,
        scriptURL: reg.active?.scriptURL
      });
    });
  });
  
  // Check current controller
  if (navigator.serviceWorker.controller) {
    console.log('✅ Page is controlled by SW:', navigator.serviceWorker.controller.scriptURL);
  } else {
    console.log('❌ No service worker controlling this page');
  }
} else {
  console.log('❌ Service Worker not supported');
}
```

**Expected output if working:**
```
✅ Service Worker supported
Found 1 service worker(s)
SW 0: {scope: "https://ummahflow.com/", state: "activated", ...}
✅ Page is controlled by SW: https://ummahflow.com/sw.js
```

**If you see "0 service workers":** The service worker isn't being registered at all.

---

### 2. Check for Registration Errors

```javascript
// Listen for errors
navigator.serviceWorker.addEventListener('error', (error) => {
  console.error('Service Worker error:', error);
});

// Try to register manually (if not already registered)
navigator.serviceWorker.register('/sw.js').then(
  registration => {
    console.log('✅ Manual registration successful:', registration.scope);
  },
  error => {
    console.error('❌ Manual registration failed:', error);
  }
);
```

---

### 3. Check if PWA Criteria are Met

```javascript
// Check display mode
const displayMode = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
console.log('Display mode:', displayMode);

// Check if already installed
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
const isIOSStandalone = window.navigator.standalone === true;
console.log('Is standalone:', isStandalone);
console.log('Is iOS standalone:', isIOSStandalone);

// Check manifest
fetch('/api/manifest')
  .then(r => r.json())
  .then(manifest => {
    console.log('Manifest:', {
      display: manifest.display,
      start_url: manifest.start_url,
      scope: manifest.scope,
      icons: manifest.icons?.length
    });
  })
  .catch(err => console.error('Manifest error:', err));
```

---

### 4. Check Browser Console for Errors

Look for any errors in the console that mention:
- Service worker
- Registration
- Manifest
- PWA

Common errors:
- `SecurityError`: Must be HTTPS
- `TypeError`: Service worker script not found
- `NetworkError`: Can't fetch service worker

---

### 5. Network Tab Check

1. Open Network tab in DevTools
2. Reload page
3. Filter by "sw.js"
4. Check:
   - Does request happen?
   - What's the status code? (should be 200)
   - What's the response size? (should be ~24KB)
   - Are there any redirects?

---

## Server-Side Debugging

Run this script on your **Hetzner server**:

```bash
# SSH into server first
ssh root@91.98.207.106

# Navigate to project
cd /var/www/uflow

# Run debug script
./debug-pwa.sh
```

This will check:
- Environment variables in containers
- Service worker file existence
- Endpoint accessibility
- Container logs

---

## Common Issues & Solutions

### Issue 1: Service Worker Not Registering

**Symptoms:**
- Console shows "0 service workers"
- Manual registration fails
- No SW controller

**Possible causes:**
1. **Service worker disabled during build**
   - Check: `docker exec uflow-app env | grep DISABLE_PWA`
   - Should be: `DISABLE_PWA=false`
   - If not: Rebuild with correct env var

2. **Service worker file missing**
   - Check: `docker exec uflow-app ls -lh /app/public/sw.js`
   - Should exist with ~24KB size
   - If missing: Rebuild needed

3. **Nginx blocking service worker**
   - Check: `curl -I https://ummahflow.com/sw.js`
   - Should return: `HTTP/2 200`
   - If 404: Check nginx config

### Issue 2: Service Worker Registered But Not Activating

**Symptoms:**
- Service worker found in console
- State is "installing" or "waiting", not "activated"
- Page not controlled

**Solution:**
```javascript
// Force activation
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
});

// Then reload
location.reload();
```

### Issue 3: Standalone Mode Not Working (iOS)

**Symptoms:**
- Service worker registered and active
- Added to home screen
- Still shows Safari browser UI

**Possible causes:**

1. **Need to remove and re-add PWA**
   - Remove from home screen completely
   - Clear Safari cache
   - Visit site in Safari
   - Wait for service worker to register
   - Add to home screen again

2. **Manifest not configured correctly**
   ```javascript
   // Check manifest in console
   fetch('/api/manifest').then(r => r.json()).then(console.log)
   // Verify: display: "standalone", icons include 180x180
   ```

3. **iOS caching old manifest**
   - Force clear: Settings → Safari → Clear History and Website Data
   - Restart device
   - Try again

---

## Debug Checklist

Run through this checklist and report results:

- [ ] Service worker file exists: `curl -I https://ummahflow.com/sw.js` returns 200
- [ ] Environment variable set: `DISABLE_PWA=false` in container
- [ ] Console shows: Service worker supported
- [ ] Console shows: Service worker registered (count > 0)
- [ ] Console shows: Service worker activated
- [ ] Console shows: Page controlled by service worker
- [ ] Manifest accessible: `/api/manifest` returns JSON
- [ ] Manifest has: `display: "standalone"`
- [ ] Manifest has: 180x180 icon
- [ ] No console errors
- [ ] No network errors for sw.js

---

## Next Steps Based on Results

**If service worker NOT registering:**
→ Rebuild containers with `DISABLE_PWA=false`

**If service worker registers but not activating:**
→ Force activation with console commands above

**If everything checks out but standalone mode doesn't work:**
→ iOS-specific issue, need to clear cache and re-add to home screen

**Share the console output and I'll help diagnose further!**

