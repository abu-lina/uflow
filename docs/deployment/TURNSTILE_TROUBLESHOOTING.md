# Cloudflare Turnstile Troubleshooting Guide

Complete guide for debugging and fixing Turnstile errors, especially Error 600010.

## Table of Contents

1. [Common Errors](#common-errors)
2. [Error 600010: Hostname Mismatch](#error-600010-hostname-mismatch)
3. [Debugging Steps](#debugging-steps)
4. [Advanced Debugging](#advanced-debugging)
5. [Prevention](#prevention)

---

## Common Errors

### Error 600010: Invalid Site Key for Hostname

**Meaning:** The site key doesn't match the configured hostname in Cloudflare.

**Symptoms:**
- CAPTCHA widget doesn't render
- Console shows: `Error 600010`
- Signup form fails silently

**Most Common Causes:**
1. Hostname not added to Cloudflare widget
2. Site key mismatch between production and Cloudflare
3. Widget mode mismatch
4. Cloudflare propagation delay

---

## Error 600010: Hostname Mismatch

### What It Means

Error 600010 = "Invalid site key for this hostname"

Cloudflare Turnstile is rejecting the request because:
- The site key doesn't match the configured hostname, OR
- The hostname isn't properly configured in Cloudflare

### Quick Fix Checklist

- [ ] Verify site key matches exactly
- [ ] Add hostname to Cloudflare widget
- [ ] Check widget mode is "Managed"
- [ ] Wait 5-10 minutes for propagation
- [ ] Verify environment variables are set

---

## Debugging Steps

### Step 1: Check Browser Console

1. Visit: `https://ummahflow.com/signup`
2. Open browser console (F12)
3. Look for detailed error output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SIGNUP] CAPTCHA VERIFICATION ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Code: 600010
Site Key (full): 0x4AAAAAAC...
Current Hostname: ummahflow.com
Current Origin: https://ummahflow.com
```

**Note the exact site key and hostname shown.**

### Step 2: Verify Site Key in Cloudflare

1. Go to: [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Find the widget with the site key shown in console
3. Click on it to view details
4. **Compare the site key EXACTLY** (should match character-for-character)

**If they don't match:**
- Update GitHub Secret: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Redeploy to production

### Step 3: Check Hostname Configuration

In the Cloudflare widget:

1. Scroll to "Hostname Management"
2. Check what hostnames are listed
3. Verify `ummahflow.com` is present
4. If using `www`, also add `www.ummahflow.com`

**Hostname Format:**
- ✅ Correct: `ummahflow.com`
- ❌ Wrong: `https://ummahflow.com` (no protocol)
- ❌ Wrong: `ummahflow.com/` (no trailing slash)

### Step 4: Verify Environment Variables

**Check GitHub Secrets:**
1. Go to: `https://github.com/abu-lina/uflow/settings/secrets/actions`
2. Verify these secrets exist:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`

**Check Production Container:**
```bash
# SSH into Hetzner server
ssh root@YOUR_HETZNER_IP

# Check if environment variables are set
docker exec uflow-app env | grep TURNSTILE
```

**Should show:**
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAC...
TURNSTILE_SECRET_KEY=...
```

---

## Advanced Debugging

### Situation: All Configuration Appears Correct But Error Persists

If you've verified:
- ✅ Site key matches
- ✅ Hostname is added
- ✅ Widget mode is "Managed"

But error 600010 still appears, try these steps.

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

### Step 2: Check for Multiple Widgets

**You might have multiple Turnstile widgets, and the wrong one is configured.**

1. Go to Cloudflare Turnstile dashboard
2. List ALL widgets
3. For each widget:
   - Check the site key
   - Check if `ummahflow.com` is in hostnames
   - Note which one matches your production site key

**If you find multiple widgets:**
- Use the one with `ummahflow.com` in hostnames
- Or delete unused widgets to avoid confusion

### Step 3: Verify Widget Mode

**Widget mode must be "Managed" for production use.**

1. Go to Cloudflare Turnstile dashboard
2. Click on your widget
3. Check "Widget Mode"
4. Should be: **"Managed"** (not "Invisible" or "Non-interactive")

**If it's not "Managed":**
- Change to "Managed"
- Save
- Wait 2-3 minutes
- Test again

### Step 4: Check Hostname Format Issues

**Cloudflare might need exact format.**

**Check in Cloudflare:**
- Is it listed as: `ummahflow.com` (correct)
- Or: `https://ummahflow.com` (wrong - remove protocol)
- Or: `www.ummahflow.com` (might need this too)

**Fix:**
1. Remove `ummahflow.com` from hostnames
2. Save
3. Wait 1 minute
4. Re-add `ummahflow.com` (without protocol, without www)
5. Also add `www.ummahflow.com` (if you use www subdomain)
6. Save
7. Wait 3-5 minutes

### Step 5: Check Propagation Delay

**Cloudflare changes can take 5-10 minutes to propagate.**

After making changes:
1. Wait 5-10 minutes
2. Clear browser cache
3. Test in incognito mode
4. Check again

### Step 6: Verify DNS Resolution

**Ensure your domain resolves correctly.**

```bash
# Check DNS resolution
nslookup ummahflow.com

# Should show your Hetzner server IP
```

**If DNS is wrong:**
- Fix DNS records
- Wait for propagation
- Test again

---

## Common Issues and Solutions

### Issue 1: Site Key Mismatch ⚠️ MOST COMMON

**Problem:** The site key in production doesn't match the widget in Cloudflare.

**Check:**
1. Go to GitHub Secrets: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
2. Go to Cloudflare Turnstile Dashboard
3. Click on your "uflow" widget
4. Compare the Site Key

**They must match EXACTLY!**

**Fix:**
- If they don't match, update GitHub Secret with the correct site key
- Redeploy to production

### Issue 2: Hostname Not Added

**Problem:** Hostname `ummahflow.com` is not in Cloudflare widget hostnames.

**Fix:**
1. Go to Cloudflare Turnstile Dashboard
2. Click on your "uflow" widget
3. Under "Hostname Management", click **"Add Hostnames"**
4. Add: `ummahflow.com`
5. If using www, also add: `www.ummahflow.com`
6. Save and wait 2-3 minutes

### Issue 3: Widget Mode Wrong

**Problem:** Widget mode is not "Managed".

**Fix:**
1. Go to Cloudflare Turnstile Dashboard
2. Click on your widget
3. Change "Widget Mode" to "Managed"
4. Save
5. Wait 2-3 minutes

### Issue 4: Environment Variables Not Set

**Problem:** Turnstile environment variables are missing in production.

**Fix:**
1. Add secrets to GitHub:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
2. Redeploy to production
3. Verify in container:
   ```bash
   docker exec uflow-app env | grep TURNSTILE
   ```

### Issue 5: Propagation Delay

**Problem:** Changes made but error persists.

**Solution:**
- Wait 5-10 minutes after making changes
- Clear browser cache
- Test in incognito mode
- Check again

---

## Prevention

### Best Practices

1. **Always verify site keys match exactly**
   - Compare GitHub Secret with Cloudflare widget
   - Use exact copy-paste (no spaces)

2. **Add all hostnames upfront**
   - Add both `domain.com` and `www.domain.com` if using www
   - Add all subdomains that will use Turnstile

3. **Use "Managed" widget mode**
   - Best for production use
   - Provides better user experience

4. **Test in staging first**
   - Set up Turnstile in UAT environment
   - Test thoroughly before production

5. **Document your configuration**
   - Keep track of which widget is used where
   - Document hostnames and site keys

---

## Quick Reference

### Environment Variables

| Variable | Type | Where Used | Example |
|----------|------|------------|---------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Client-side (browser) | `0x4AAAAAAC...` |
| `TURNSTILE_SECRET_KEY` | Secret | Server-side (API) | `0x4AAAAAAC...` (different key) |

**Note:** `NEXT_PUBLIC_*` variables are embedded in the JavaScript bundle and visible to users. This is safe for Turnstile site keys (they're meant to be public).

### Verification Checklist

Before reporting an issue, verify:

- [ ] Site key in browser console matches Cloudflare widget
- [ ] Site key in GitHub Secrets matches Cloudflare widget
- [ ] Site key in production container matches Cloudflare widget
- [ ] Hostname is added to Cloudflare widget
- [ ] Widget mode is "Managed"
- [ ] Environment variables are set in production
- [ ] Waited 5-10 minutes after making changes
- [ ] Tested in incognito mode

---

## Related Documentation

- [Turnstile Setup](./TURNSTILE_SETUP_HETZNER.md) - Initial setup guide
- [GitHub Secrets](./GITHUB_SECRETS.md) - Configuring secrets
- [Hetzner Deployment](./HETZNER_DEPLOYMENT.md) - Deployment guide

---

## Summary

**Most Common Fix:**
1. Verify site key matches exactly (GitHub Secret = Cloudflare widget)
2. Add hostname to Cloudflare widget (`ummahflow.com`)
3. Wait 5-10 minutes for propagation
4. Test in incognito mode

**If error persists:**
1. Check production container environment variables
2. Verify widget mode is "Managed"
3. Check for multiple widgets
4. Verify DNS resolution

**Your Turnstile should work after these steps!** ✅

