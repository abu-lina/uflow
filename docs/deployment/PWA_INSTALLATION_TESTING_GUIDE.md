# PWA Installation Flow - Testing Guide

## Overview

This guide provides step-by-step testing instructions for the iOS PWA installation flow after implementing the welcome page and /pwa-start entry point.

## Testing Prerequisites

- iPhone with Safari (iOS 15.4 or later recommended)
- Access to UAT environment: `https://uat.ummahflow.com`
- Clear Safari cache before testing

## Complete Test Flow

### Step 1: Clear Safari Cache
1. On iPhone, go to **Settings → Safari**
2. Scroll down and tap **Clear History and Website Data**
3. Confirm the action
4. Wait 1 minute for cache to clear completely

### Step 2: Visit Site and Join Waitlist
1. Open Safari on iPhone
2. Navigate to `https://uat.ummahflow.com`
3. **Expected**: Site redirects to `/waitlist`
4. Fill out waitlist form with email
5. Select provider type (if prompted)
6. Submit form
7. **Expected**: See waitlist success screen

### Step 3: Complete Early Access Onboarding
1. **Expected**: See early access screen with options:
   - Suggest Provider
   - Select City
   - Learn More
   - Skip
2. Either complete an action (suggest provider/select city) OR click **Skip**
3. **Expected**: Page redirects to `/?from=early-access`
4. **Expected**: Redirect happens to `/welcome` page

### Step 4: Welcome Page - Service Worker Activation
1. **Expected**: See welcome page with:
   - "Willkommen in der Ummah Flow Community" (or translated title)
   - Loading spinner with "Installation wird vorbereitet..." text
2. Wait 5-10 seconds for service worker to activate
3. **Expected**: Loading spinner disappears
4. **Expected**: PWA install prompt appears

### Step 5: PWA Install Prompt
1. **Expected**: See install prompt with:
   - App icon
   - "Installiere U-Flow" title
   - Instructions for iOS installation
   - Share icon indicator
   - "Zum Homebildschirm" button reference
2. **Optional**: Can click "Im Browser fortfahren" to skip installation

### Step 6: Add to Home Screen
1. Tap Safari's **Share** button (square with arrow pointing up)
2. Scroll down and tap **Add to Home Screen**
3. **Expected**: Icon preview shows UFLOW icon
4. **Expected**: Name shows "UFLOW"
5. Tap **Add** in top right
6. **Expected**: Icon appears on home screen

### Step 7: Launch PWA
1. Tap the UFLOW icon on home screen
2. **Expected**: App launches via `/pwa-start`
3. **Expected**: Brief "Launching..." screen appears
4. **Expected**: App detects standalone mode
5. **Expected**: App redirects to `/waitlist`
6. **Expected**: NO browser UI visible (no address bar, no Safari buttons)
7. **Expected**: App runs in standalone mode

### Step 8: PWA Navigation Test
1. Navigate within the app (if possible based on app launch status)
2. Close the PWA (swipe up from bottom)
3. Reopen PWA from home screen
4. **Expected**: Launches via `/pwa-start` again
5. **Expected**: Still in standalone mode

## Expected Results Summary

| Step | Expected Behavior | Status |
|------|------------------|--------|
| 1. Visit site | Redirects to `/waitlist` | ⏳ |
| 2. Join waitlist | Shows success screen | ⏳ |
| 3. Early access | Shows early access options | ⏳ |
| 4. Complete onboarding | Redirects to `/welcome` | ⏳ |
| 5. Service worker | Activates within 10 seconds | ⏳ |
| 6. Install prompt | Shows iOS instructions | ⏳ |
| 7. Add to home | Icon appears on home screen | ⏳ |
| 8. Launch PWA | Opens in standalone mode | ⏳ |
| 9. No browser UI | Address bar hidden | ⏳ |
| 10. PWA navigation | Works correctly | ⏳ |

## Troubleshooting

### Issue: Welcome page doesn't show
**Possible causes:**
- Early access redirect not working
- Root page routing logic issue
- Middleware blocking `/welcome`

**Check:**
```bash
# On server
docker exec uflow-uat curl -I http://localhost:3000/welcome
# Should return 200 OK
```

### Issue: Service worker not activating
**Possible causes:**
- Service worker file not accessible
- Service worker registration failed
- Network issues

**Check in browser console:**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registrations:', regs.length);
  regs.forEach(r => console.log('State:', r.active?.state));
});
```

### Issue: PWA shows browser UI
**Possible causes:**
- Added from wrong URL (not from `/welcome` or root)
- Manifest `start_url` not set to `/pwa-start`
- iOS cached old PWA state

**Solution:**
1. Remove PWA from home screen
2. Clear Safari cache completely
3. Wait 5 minutes
4. Follow test flow from Step 1

### Issue: PWA redirects to wrong page
**Possible causes:**
- `/pwa-start` detection logic issue
- Feature flag `isAppLaunched` not set correctly

**Check:**
```bash
# On server
docker exec uflow-uat env | grep -E "(NODE_ENV|NEXT_PUBLIC_SITE_URL)"
```

## Verification Checklist

Before marking testing complete, verify:

- [ ] Waitlist flow works (join → success → early access)
- [ ] Early access completion redirects to `/welcome`
- [ ] Service worker activates within 10 seconds
- [ ] PWA install prompt shows on welcome page
- [ ] "Continue in Browser" option works
- [ ] Add to home screen creates icon
- [ ] PWA launches in standalone mode (no browser UI)
- [ ] PWA navigation works correctly
- [ ] Closing and reopening PWA works
- [ ] No redirect loops or errors

## Success Criteria

✅ **Test is successful when:**
1. User can complete full flow from waitlist to PWA installation
2. PWA launches in standalone mode without browser UI
3. No errors in browser console
4. Service worker is active before installation
5. PWA navigation works as expected

## Deployment Verification

After deploying to UAT, verify:

```bash
# 1. Check manifest start_url
curl https://uat.ummahflow.com/api/manifest | jq '.start_url'
# Should return: "/pwa-start"

# 2. Check /pwa-start is accessible
curl -I https://uat.ummahflow.com/pwa-start
# Should return: 200 OK

# 3. Check /welcome is accessible
curl -I https://uat.ummahflow.com/welcome
# Should return: 200 OK

# 4. Check service worker
curl -I https://uat.ummahflow.com/sw.js
# Should return: 200 OK
```

## Notes for Tester

- **Patience**: Service worker activation can take 5-10 seconds
- **Clean state**: Always start with cleared Safari cache
- **iOS version**: Behavior may vary slightly between iOS versions
- **Network**: Ensure stable internet connection during testing
- **Timing**: Wait for each step to complete before proceeding

## Reporting Issues

If any step fails, report:
1. Which step failed
2. Expected vs actual behavior
3. Browser console errors (if accessible)
4. Screenshots (if possible)
5. iOS version
6. Whether service worker was active (check DevTools)




