# Debugging Turnstile Error 600010 - Complete Guide

## Error 600010: "Invalid site key for this hostname"

This error means Cloudflare Turnstile is rejecting the request because the site key doesn't match the configured hostname.

---

## Enhanced Debugging (Now Available)

After the latest update, the browser console will show detailed debugging information:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SIGNUP] CAPTCHA VERIFICATION ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Code: 600010
Site Key (full): 0x4AAAAAAC...
Current Hostname: ummahflow.com
Current Origin: https://ummahflow.com
```

---

## Step-by-Step Debugging Process

### Step 1: Check Browser Console

1. Visit: `https://ummahflow.com/signup`
2. Open browser console (F12)
3. Look for the detailed error output
4. Note the **exact site key** and **hostname** shown

### Step 2: Verify Site Key in Cloudflare

1. Go to: https://dash.cloudflare.com/?to=/:account/turnstile
2. Find the widget with the site key shown in console
3. Click on it to view details
4. **Compare the site key EXACTLY** (should match character-for-character)

**If they don't match:**
- Update GitHub Secret: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Redeploy to production

### Step 3: Check Hostname Configuration

In the Cloudflare widget you found:

1. Scroll to "Hostname Management"
2. Check what hostnames are listed
3. **Should include:**
   - `ummahflow.com` (exact match, no protocol, no trailing slash)
   - `www.ummahflow.com` (if you use www subdomain)

**If missing:**
- Click "Add Hostnames"
- Add: `ummahflow.com`
- If you use www: Add `www.ummahflow.com`
- Save
- Wait 5-10 minutes for propagation

### Step 4: Verify Widget Mode

1. In the same widget, check "Widget Mode"
2. Should be: **"Managed"**
3. If it's "Non-interactive" or "Invisible", switch to "Managed"
4. Save and wait 2 minutes

### Step 5: Verify Production Environment

Check if the site key in production matches:

**Option A: SSH into Hetzner**
```bash
ssh root@YOUR_HETZNER_IP

# Check environment variables
docker exec uflow-app env | grep TURNSTILE

# Should show:
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAC...
```

**Option B: Check Browser Console**
- The console now shows the full site key
- Compare with Cloudflare widget

---

## Common Scenarios & Fixes

### Scenario 1: Site Key Mismatch

**Symptoms:**
- Site key in console doesn't match Cloudflare widget
- Error 600010 appears

**Fix:**
1. Find the correct widget in Cloudflare
2. Copy the site key
3. Update GitHub Secret: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
4. Redeploy

### Scenario 2: Hostname Not Added

**Symptoms:**
- Site keys match
- But `ummahflow.com` not in Cloudflare hostnames

**Fix:**
1. Add `ummahflow.com` to Cloudflare Turnstile
2. If you use www: Add `www.ummahflow.com` too
3. Save
4. Wait 10 minutes
5. Test again

### Scenario 3: www Subdomain Issue

**Symptoms:**
- `ummahflow.com` is configured
- But users access via `www.ummahflow.com`

**Fix:**
1. Add `www.ummahflow.com` to Cloudflare hostnames
2. Save
3. Test via both URLs

### Scenario 4: Propagation Delay

**Symptoms:**
- Just added hostname
- Error still appears

**Fix:**
1. Wait 10 minutes
2. Clear browser cache
3. Try incognito mode
4. Test again

### Scenario 5: Widget Mode Mismatch

**Symptoms:**
- Site key and hostname correct
- But widget is in wrong mode

**Fix:**
1. Switch widget to "Managed" mode
2. Save
3. Wait 2 minutes
4. Test again

---

## Quick Verification Checklist

Use this checklist to verify everything:

- [ ] **Site Key Match**
  - [ ] Site key in browser console matches Cloudflare widget
  - [ ] Site key in GitHub Secrets matches Cloudflare widget
  - [ ] Site key in production (via SSH) matches Cloudflare widget

- [ ] **Hostname Configuration**
  - [ ] `ummahflow.com` is in Cloudflare hostnames
  - [ ] `www.ummahflow.com` is in Cloudflare hostnames (if you use www)
  - [ ] Hostname format is correct (no `https://`, no trailing `/`)

- [ ] **Widget Settings**
  - [ ] Widget mode is "Managed"
  - [ ] Widget is active/enabled

- [ ] **Timing**
  - [ ] Waited 10 minutes after adding hostname
  - [ ] Cleared browser cache
  - [ ] Tried incognito mode

---

## Advanced Debugging

### Check Network Requests

1. Open browser DevTools → Network tab
2. Filter by "challenge-platform"
3. Look for requests to `challenges.cloudflare.com`
4. Check the response:
   - **401** = Hostname mismatch (error 600010)
   - **200** = Success

### Verify Site Key in Multiple Places

```bash
# 1. GitHub Secrets
# Go to: https://github.com/abu-lina/uflow/settings/secrets/actions
# Check: NEXT_PUBLIC_TURNSTILE_SITE_KEY

# 2. Production Container
ssh root@YOUR_HETZNER_IP
docker exec uflow-app env | grep TURNSTILE

# 3. Browser Console
# Visit: https://ummahflow.com/signup
# Open console (F12)
# Look for: [SIGNUP] Site Key (full): ...

# 4. Cloudflare Dashboard
# Go to: https://dash.cloudflare.com/?to=/:account/turnstile
# Click widget → View site key

# All 4 should match EXACTLY!
```

---

## Still Not Working?

If all checks pass but error 600010 persists:

1. **Create a new widget:**
   - Create fresh widget in Cloudflare
   - Name: "uflow-production-v2"
   - Add hostname: `ummahflow.com`
   - Set mode: "Managed"
   - Copy NEW site key
   - Update GitHub Secrets
   - Redeploy

2. **Check Cloudflare Zone:**
   - Make sure you're in the correct Cloudflare account
   - Verify the domain `ummahflow.com` is in your Cloudflare account
   - Check if there are multiple Cloudflare accounts

3. **Contact Cloudflare Support:**
   - If everything is correct but still failing
   - Provide them with:
     - Site key
     - Hostname
     - Error code 600010
     - Screenshot of widget configuration

---

## Debugging Output Format

After the latest update, you'll see this in the browser console:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SIGNUP] CAPTCHA VERIFICATION ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Code: 600010
Site Key (full): 0x4AAAAAAC...
Current Hostname: ummahflow.com
Current Origin: https://ummahflow.com
Widget ID: cf-chl-widget-rew2t

✅ VERIFICATION CHECKLIST:
1. Go to: https://dash.cloudflare.com/?to=/:account/turnstile
2. Find widget with site key: 0x4AAAAAAC...
3. Check hostnames configured:
   - Should include: ummahflow.com
   - Should include: www.ummahflow.com (if you use www)
...
```

Use this information to verify your Cloudflare configuration!

---

## Summary

**Most Common Cause:** Hostname not added or site key mismatch

**Quick Fix:**
1. Check browser console for exact site key and hostname
2. Verify in Cloudflare that hostname matches
3. Add missing hostname if needed
4. Wait 10 minutes
5. Test again

**Full debugging info is now in the browser console!** 🎉

