# Advanced Debugging for Error 600010 (When Everything Seems Correct)

## Situation: All Configuration Appears Correct But Error Persists

If you've verified:
- ✅ Site key matches
- ✅ Hostname is added
- ✅ Widget mode is "Managed"

But error 600010 still appears, try these advanced debugging steps.

---

## Advanced Debugging Steps

### Step 1: Verify Production Environment Variable

**The site key in production might be different from what's in GitHub Secrets.**

**Check via SSH:**
```bash
ssh root@YOUR_HETZNER_IP

# Check the actual environment variable
docker exec uflow-app env | grep NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Should show:
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAACAqOzp-Vvpm5W5a
```

**Compare with:**
- Browser console: `0x4AAAAAACAqOzp-Vvpm5W5a`
- Cloudflare widget: Should match exactly
- GitHub Secret: Should match exactly

**If they don't all match:**
1. Update GitHub Secret with the correct value
2. Redeploy (the container needs to restart to pick up new env vars)

---

### Step 2: Check for Multiple Widgets

**You might have multiple Turnstile widgets, and the wrong one is configured.**

1. Go to Cloudflare Turnstile dashboard
2. List ALL widgets
3. For each widget:
   - Check the site key
   - Check if `ummahflow.com` is in hostnames
   - Note which widget has the correct configuration

**If multiple widgets exist:**
- Use the widget that has BOTH:
  - Site key: `0x4AAAAAACAqOzp-Vvpm5W5a`
  - Hostname: `ummahflow.com`

**If no widget has both:**
- Create a new widget with both
- Update GitHub Secrets with the new site key
- Redeploy

---

### Step 3: Verify Widget is Active/Enabled

**The widget might be disabled or inactive.**

1. In Cloudflare, check the widget status
2. Make sure it's **Active/Enabled**
3. If it's disabled, enable it
4. Save and wait 2 minutes

---

### Step 4: Check Cloudflare Account/Zone

**The domain might be in a different Cloudflare account or zone.**

1. Verify `ummahflow.com` is in your Cloudflare account
2. Check which Cloudflare account you're logged into
3. Make sure you're checking Turnstile widgets in the SAME account where `ummahflow.com` is managed

**If domain is in different account:**
- Either move the domain, OR
- Create widget in the correct account

---

### Step 5: Remove and Re-Add Hostname

**Sometimes Cloudflare needs a "refresh" of the configuration.**

1. In Cloudflare widget:
   - Remove `ummahflow.com` from hostnames
   - Save
   - Wait 2 minutes
2. Re-add `ummahflow.com`:
   - Add it back
   - Save
   - Wait 10 minutes (longer wait for re-add)
3. Test again

---

### Step 6: Check for www Redirect

**If your site redirects between www and non-www, Cloudflare might see a different hostname.**

1. Check if `ummahflow.com` redirects to `www.ummahflow.com` (or vice versa)
2. Add BOTH hostnames to Cloudflare:
   - `ummahflow.com`
   - `www.ummahflow.com`
3. Save and wait 10 minutes

**To check redirect:**
```bash
curl -I https://ummahflow.com
# Look for "Location:" header
```

---

### Step 7: Verify Secret Key (Server-Side)

**The secret key might be wrong, causing server-side verification to fail.**

1. Check GitHub Secret: `TURNSTILE_SECRET_KEY`
2. In Cloudflare widget, copy the Secret Key
3. Compare - they must match exactly
4. If different, update GitHub Secret and redeploy

**Note:** Error 600010 is client-side, but wrong secret key can cause issues too.

---

### Step 8: Create Fresh Widget (Nuclear Option)

**If nothing works, create a completely new widget.**

1. In Cloudflare, create NEW widget:
   - Name: "uflow-production-fresh"
   - Hostname: `ummahflow.com`
   - Mode: "Managed"
2. Copy the NEW site key and secret key
3. Update GitHub Secrets:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = new site key
   - `TURNSTILE_SECRET_KEY` = new secret key
4. Redeploy
5. Test

This eliminates any potential configuration corruption.

---

### Step 9: Check Browser/Network Issues

**Sometimes it's a browser or network issue, not configuration.**

1. **Try different browser:**
   - Chrome
   - Firefox
   - Safari
   - Incognito/Private mode

2. **Check network requests:**
   - Open DevTools → Network tab
   - Filter: "challenge-platform"
   - Look for requests to `challenges.cloudflare.com`
   - Check response status:
     - **401** = Hostname mismatch (error 600010)
     - **200** = Success

3. **Clear browser cache:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear all cache

4. **Try different network:**
   - Mobile data
   - Different WiFi
   - VPN off/on

---

### Step 10: Contact Cloudflare Support

**If all else fails, contact Cloudflare support.**

Provide them with:
- Site key: `0x4AAAAAACAqOzp-Vvpm5W5a`
- Hostname: `ummahflow.com`
- Error code: 600010
- Screenshot of widget configuration
- Timeline of when you added hostname

They can check their internal logs to see why the verification is failing.

---

## Quick Verification Checklist

Run through this checklist systematically:

- [ ] **Production env var matches:**
  ```bash
  docker exec uflow-app env | grep TURNSTILE
  # Compare with browser console and Cloudflare
  ```

- [ ] **Only ONE widget has this site key:**
  - Check all widgets in Cloudflare
  - Only one should have: `0x4AAAAAACAqOzp-Vvpm5W5a`

- [ ] **Widget is Active:**
  - Widget status is "Active" or "Enabled"

- [ ] **Hostname format is exact:**
  - `ummahflow.com` (not `https://ummahflow.com`, not `ummahflow.com/`)

- [ ] **Both www and non-www added:**
  - `ummahflow.com`
  - `www.ummahflow.com`

- [ ] **Waited long enough:**
  - 10+ minutes after adding hostname
  - Cleared browser cache
  - Tried incognito mode

- [ ] **Secret key matches:**
  - GitHub Secret matches Cloudflare widget secret key

- [ ] **Cloudflare account is correct:**
  - Widget is in same account as `ummahflow.com` domain

---

## Most Likely Causes (When Everything Seems Correct)

1. **Production env var is stale** (container wasn't restarted after secret update)
2. **Multiple widgets** (wrong widget is configured)
3. **Widget is disabled** (not active)
4. **www redirect issue** (need both hostnames)
5. **Cloudflare propagation** (needs more than 10 minutes)

---

## Nuclear Option: Fresh Start

If nothing works, start completely fresh:

1. Create new widget in Cloudflare
2. Add hostname: `ummahflow.com`
3. Set mode: "Managed"
4. Copy new site key and secret key
5. Update BOTH GitHub Secrets
6. Redeploy
7. Test

This eliminates any possibility of configuration corruption or mismatch.

---

## Still Not Working?

If you've tried everything and it still fails:

1. **Double-check production env var:**
   ```bash
   ssh root@YOUR_HETZNER_IP
   docker exec uflow-app env | grep TURNSTILE
   ```

2. **Check Cloudflare widget status:**
   - Is it active?
   - Are there any warnings or errors shown?

3. **Contact Cloudflare support:**
   - They can check internal logs
   - They might see something we can't

---

## Summary

When everything seems correct but error 600010 persists, the issue is usually:
- Production environment variable mismatch
- Multiple widgets confusion
- Widget disabled/inactive
- www redirect requiring both hostnames
- Cloudflare propagation delay (needs 15+ minutes)

**Most common:** Production env var doesn't match because container wasn't restarted after secret update.



