# iOS PWA Installation Testing Checklist

## Current Status Summary

Based on automated checks performed:

### ✅ Server-Side (All Working)
- ✅ Service worker file exists at `/sw.js` (24KB)
- ✅ Service worker has correct headers (`application/javascript; charset=utf-8`)
- ✅ Service worker has `no-cache` headers
- ✅ Cloudflare is NOT caching service worker (`cf-cache-status: DYNAMIC`)
- ✅ Manifest API accessible at `/api/manifest`
- ✅ Manifest has `display: "standalone"`
- ✅ Manifest has 180x180 icon for iOS
- ✅ Manifest returns proper `Content-Type: application/manifest+json`

### 🔍 Needs Manual Verification

The following items require manual testing since server-side checks all pass:

## Step 1: Verify Container Configuration

**Run on Hetzner server:**
```bash
# SSH to server
ssh root@91.98.207.106

# Run diagnostic script
cd /var/www/uflow  # or wherever your project is
./scripts/check-uat-pwa-config.sh
```

**Expected output:**
- ✅ UAT container is running
- ✅ PWA is enabled (DISABLE_PWA=false)
- ✅ Service worker exists in container (~24KB)
- ✅ Correct UAT site URL (uat.ummahflow.com)

If any checks fail, the script will indicate what needs fixing.

---

## Step 2: Cloudflare Configuration Verification

Since `cf-cache-status: DYNAMIC` is already showing, Cloudflare configuration appears correct. However, verify these settings in the Cloudflare dashboard:

### 2a. Check Service Worker Page Rule

**Location:** Rules → Page Rules

**Look for:**
- URL Pattern: `https://uat.ummahflow.com/sw.js*`
- Settings: Cache Level = Bypass

**If it doesn't exist:**
1. Create new Page Rule
2. URL Pattern: `https://uat.ummahflow.com/sw.js*`
3. Add Setting: Cache Level → Bypass
4. Add Setting: Browser Cache TTL → Respect Existing Headers
5. Save and Deploy

### 2b. Check Browser Integrity Check Exception

**Location:** Security → Settings → Configuration Rules

**Look for:**
- Rule name: "Skip Browser Integrity Check" (or similar)
- Field: URI Path equals `/api/manifest`
- Action: Skip Browser Integrity Check

**If it doesn't exist:**
1. Go to Security → Settings
2. Find Browser Integrity Check section
3. Create Configuration Rule
4. Name: "Allow PWA Manifest"
5. When: URI Path equals `/api/manifest`
6. Then: Skip Browser Integrity Check
7. Deploy

### 2c. Purge Cloudflare Cache (Just to be safe)

**Location:** Caching → Purge Cache

1. Choose "Custom Purge"
2. Enter URLs:
   - `https://uat.ummahflow.com/sw.js`
   - `https://uat.ummahflow.com/api/manifest`
   - `https://uat.ummahflow.com/_next/static/*`
3. Purge
4. Wait 2 minutes before testing

---

## Step 3: iOS Safari Testing

### 3a. Complete Cache Clear (Critical!)

**On your iPhone:**
1. **Remove existing PWA from home screen** (long press → Remove)
2. **Settings → Safari → Clear History and Website Data**
3. Tap "Clear History and Data" and confirm
4. **Force close Safari** (swipe up from bottom, swipe Safari away)
5. **Wait 2 full minutes** (this is important for cache clearing)

### 3b. Service Worker Registration Test

1. Open Safari on iPhone
2. Navigate to: `https://uat.ummahflow.com`
3. Wait for page to fully load (count to 10)

**On Mac (with iPhone connected):**
1. Safari → Develop → [Your iPhone] → [uat.ummahflow.com]
2. Open Console tab
3. Paste and run:

```javascript
// Check service worker registration
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log(`Found ${regs.length} service worker(s)`);
  if (regs.length > 0) {
    console.log('State:', regs[0].active?.state);
    console.log('Scope:', regs[0].scope);
    console.log('✅ Service worker is registered');
  } else {
    console.error('❌ No service worker registered - PWA will NOT work');
  }
});

// Check if page is controlled by service worker
if (navigator.serviceWorker.controller) {
  console.log('✅ Page is controlled by service worker');
} else {
  console.warn('⚠️  Page not yet controlled - refresh might be needed');
}
```

**Expected output:**
- Found 1 service worker(s)
- State: activated
- ✅ Service worker is registered
- ✅ Page is controlled by service worker

**If no service worker found:**
- Check browser console for errors
- Verify service worker file is accessible: `curl https://uat.ummahflow.com/sw.js`
- Container might need rebuild with `DISABLE_PWA=false`

### 3c. PWA Metadata Test

**In Mac Safari console (connected to iPhone):**
```javascript
// Check PWA metadata
const checks = {
  'Manifest link': document.querySelector('link[rel="manifest"]')?.href,
  'Apple PWA capable': document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
  'Apple status bar': document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content,
  'Theme color': document.querySelector('meta[name="theme-color"]')?.content
};

console.table(checks);

// Verify manifest content
fetch('/api/manifest')
  .then(r => r.json())
  .then(m => {
    console.log('Manifest display:', m.display); // Should be "standalone"
    console.log('Has 180x180 icon:', m.icons.some(i => i.sizes === '180x180'));
  });
```

**Expected output:**
- Manifest link: /api/manifest
- Apple PWA capable: yes
- Manifest display: standalone
- Has 180x180 icon: true

### 3d. PWA Installation Test

**On iPhone (after confirming service worker is registered):**

1. Tap the **Share button** (square with arrow pointing up)
2. Scroll down and look for **"Add to Home Screen"**
3. Tap "Add to Home Screen"
4. Customize name if desired, tap "Add"
5. **Return to home screen** - you should see the UFLOW icon

### 3e. Standalone Mode Verification

1. **Launch the app from home screen** (tap the UFLOW icon)
2. **Observe the UI:**
   - ✅ **PWA Mode**: No Safari UI visible (no address bar, no bottom toolbar)
   - ❌ **Bookmark Mode**: Safari UI still visible (address bar at top, toolbar at bottom)

**If in PWA mode, test in console:**
```javascript
// Connect via Mac Safari → Develop → [iPhone] → [uat.ummahflow.com]
console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches);
// Should be: true

console.log('iOS standalone:', navigator.standalone);
// Should be: true (on iOS)

console.log('Is PWA:', window.matchMedia('(display-mode: standalone)').matches);
// Should be: true
```

---

## Troubleshooting

### Issue: Still shows Safari UI (bookmark mode)

**Possible causes:**
1. Service worker registered AFTER adding to home screen
2. iOS cached the "not a PWA" state
3. Old PWA installation not fully removed

**Solution:**
1. Remove PWA from home screen completely
2. Settings → Safari → Clear History and Website Data
3. **Restart iPhone** (power off, power on)
4. Wait 5 minutes
5. Follow Step 3 again, waiting full 10 seconds before adding to home screen

### Issue: No service worker in console

**Possible causes:**
1. Container has `DISABLE_PWA=true`
2. Service worker file not built into container
3. Service worker registration error

**Solution:**
1. Run container diagnostic script on server
2. Check Docker container environment: `docker exec uflow-uat env | grep DISABLE_PWA`
3. If wrong, rebuild: `./scripts/deploy-uat.sh`
4. Check container logs: `docker logs uflow-uat --tail 100`

### Issue: 403 error on manifest

**Possible causes:**
1. Cloudflare Browser Integrity Check blocking API request
2. CORS issue

**Solution:**
1. Add Browser Integrity Check exception (see Step 2b)
2. Purge Cloudflare cache
3. Test with: `curl -I https://uat.ummahflow.com/api/manifest` (should be 200)

---

## Success Criteria

### Must All Be True:
- ✅ Service worker registered and active in iOS Safari console
- ✅ PWA launches from home screen WITHOUT Safari UI
- ✅ App shows in standalone mode (window.matchMedia check)
- ✅ Navigation within app works correctly
- ✅ Closing and reopening app maintains standalone mode

---

## Quick Reference: JavaScript Checks

**Paste these in Mac Safari console (connected to iPhone) to check everything at once:**

```javascript
// Comprehensive PWA Status Check
async function checkPWAStatus() {
  console.log('=== PWA Status Check ===\n');
  
  // 1. Service Worker
  const regs = await navigator.serviceWorker.getRegistrations();
  console.log('1. Service Worker:', regs.length > 0 ? '✅ Registered' : '❌ Not registered');
  if (regs.length > 0) {
    console.log('   State:', regs[0].active?.state);
  }
  
  // 2. Page Control
  console.log('2. Page controlled:', navigator.serviceWorker.controller ? '✅ Yes' : '❌ No');
  
  // 3. Display Mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  console.log('3. Display mode:', isStandalone ? '✅ Standalone (PWA)' : '❌ Browser');
  
  // 4. iOS Standalone
  console.log('4. iOS standalone:', navigator.standalone ? '✅ Yes' : '❌ No');
  
  // 5. Manifest
  try {
    const manifest = await fetch('/api/manifest').then(r => r.json());
    console.log('5. Manifest:', manifest.display === 'standalone' ? '✅ Correct' : '❌ Wrong');
    console.log('   Has 180x180 icon:', manifest.icons.some(i => i.sizes === '180x180') ? '✅ Yes' : '❌ No');
  } catch (e) {
    console.log('5. Manifest: ❌ Error loading');
  }
  
  // 6. Metadata
  const capable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
  console.log('6. Apple PWA capable:', capable?.content === 'yes' ? '✅ Yes' : '❌ No');
  
  console.log('\n=== End Check ===');
}

checkPWAStatus();
```

---

## Next Steps

1. ✅ Run container diagnostic script on server
2. ✅ Verify/create Cloudflare Page Rule
3. ✅ Verify/create Browser Integrity Check exception
4. ✅ Purge Cloudflare cache
5. ✅ Complete iOS cache clear
6. ✅ Test service worker registration
7. ✅ Test PWA installation
8. ✅ Verify standalone mode

If all checks pass but PWA still installs as bookmark, the issue is likely iOS Safari caching. A complete device restart and waiting period usually resolves this.

