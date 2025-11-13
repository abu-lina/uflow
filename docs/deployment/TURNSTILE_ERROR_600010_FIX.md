# Fixing Turnstile Error 600010 (Hostname Mismatch)

## Error 600010: What It Means

Error 600010 = "Invalid site key for this hostname"

This means Cloudflare Turnstile is rejecting the request because:
- The site key doesn't match the configured hostname, OR
- The hostname isn't properly configured in Cloudflare

---

## Even If Hostname Is Added - Common Issues

### 1. Site Key Mismatch ⚠️ MOST COMMON

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

---

### 2. Hostname Format Issue

**Problem:** Cloudflare might need exact format.

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

---

### 3. Propagation Delay

**Problem:** Cloudflare changes can take 2-5 minutes to propagate globally.

**Check:**
- When did you add the hostname?
- If less than 5 minutes ago, wait and retry

**Fix:**
- Wait 5 minutes
- Clear browser cache
- Try in incognito mode
- Test again

---

### 4. Widget Mode Mismatch

**Problem:** The widget mode doesn't match what's expected.

**Check:**
- Your widget should be in "Managed" mode
- Verify in Cloudflare dashboard

**Fix:**
- If it's in a different mode, switch to "Managed"
- Save and wait 2 minutes

---

### 5. Multiple Widgets Confusion

**Problem:** You might have multiple Turnstile widgets, and the wrong site key is deployed.

**Check:**
1. List all Turnstile widgets in Cloudflare
2. Find which one has `ummahflow.com` configured
3. Verify the site key matches GitHub Secrets

**Fix:**
- Use the site key from the widget that has `ummahflow.com`
- Update GitHub Secret if needed
- Redeploy

---

## Step-by-Step Verification

### Step 1: Verify Site Key in Production

SSH into Hetzner and check:

```bash
ssh root@YOUR_HETZNER_IP

# Check environment variables
docker exec uflow-app env | grep TURNSTILE

# Should show:
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAC...
# TURNSTILE_SECRET_KEY=...
```

**Compare with Cloudflare:**
- The site key should match EXACTLY
- If not, update GitHub Secret and redeploy

---

### Step 2: Verify Hostname in Cloudflare

1. Go to: https://dash.cloudflare.com/?to=/:account/turnstile
2. Click on your widget
3. Under "Hostname Management"
4. Verify `ummahflow.com` is listed
5. Check the exact format (should be just `ummahflow.com`, no protocol)

---

### Step 3: Test with Browser Console

1. Visit: https://ummahflow.com/signup
2. Open browser console (F12)
3. Look for:
   ```
   [SIGNUP] Site key used: 0x4AAAAAAC...
   ```
4. Compare this with Cloudflare widget site key

---

## Quick Fix Checklist

- [ ] Site key in GitHub Secrets matches Cloudflare widget
- [ ] Hostname `ummahflow.com` is in Cloudflare (without protocol)
- [ ] Widget is in "Managed" mode
- [ ] Waited 5 minutes after adding hostname
- [ ] Cleared browser cache / tried incognito
- [ ] Verified site key in production matches Cloudflare

---

## If Still Not Working

### Option 1: Create New Widget for Production

1. Create a NEW Turnstile widget in Cloudflare
2. Name it: "uflow-production"
3. Add hostname: `ummahflow.com`
4. Set mode: "Managed"
5. Copy the NEW site key
6. Update GitHub Secret: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
7. Update GitHub Secret: `TURNSTILE_SECRET_KEY`
8. Redeploy

### Option 2: Check Nginx/Proxy Headers

Sometimes proxy headers can affect hostname detection:

```bash
# On Hetzner, check Nginx config
cat /etc/nginx/sites-available/ummahflow | grep -i host
```

Make sure Nginx is passing the correct `Host` header to Next.js.

---

## Most Likely Solution

**90% of the time, it's a site key mismatch.**

1. Verify the site key in GitHub Secrets matches the widget
2. If not, update GitHub Secret
3. Redeploy
4. Test again

---

## Still Stuck?

Check these in order:

1. ✅ Site key matches (most common)
2. ✅ Hostname format is correct (`ummahflow.com`, not `https://ummahflow.com`)
3. ✅ Waited 5 minutes for propagation
4. ✅ Widget mode is "Managed"
5. ✅ Cleared browser cache
6. ✅ Tried incognito mode

If all checked and still failing, the issue might be:
- Cloudflare account/zone configuration
- DNS/proxy settings affecting hostname detection
- Multiple Cloudflare accounts (check you're in the right one)

