# PWA Fix - Quick Reference

## ✅ What Was Fixed

1. **Nginx Configuration Updated:**
   - Added explicit `/api/manifest` route handling
   - Proper Content-Type headers
   - Security headers maintained
   - Updated for both production and UAT

2. **Files Modified:**
   - `nginx-template.conf` - Production nginx config
   - `nginx-uat-template.conf` - UAT nginx config

---

## 🚀 Next Steps (Do These Now)

### 1. Cloudflare Configuration (5 minutes)

#### A. Create Page Rule for Service Worker
- **Location:** Cloudflare Dashboard → Rules → Page Rules
- **URL:** `*ummahflow.com/sw.js`
- **Settings:**
  - Cache Level: **Bypass**
  - Browser Cache TTL: **Respect Existing Headers**

#### B. Create Browser Integrity Check Exception
- **Location:** Security → Browser integrity check → Create configuration rule
- **Rule:** URI Path equals `/api/manifest`
- **Action:** Skip (Bypass)

#### C. Purge Cache
- **Location:** Caching → Purge Cache → Custom Purge
- **URL:** `https://ummahflow.com/sw.js`

---

### 2. Deploy Nginx Config to Hetzner (2 minutes)

```bash
# SSH into Hetzner
ssh root@91.98.207.106

# Production
sed "s/{{DOMAIN}}/ummahflow.com/g" /tmp/nginx-template.conf > /etc/nginx/sites-available/ummahflow
nginx -t && systemctl reload nginx

# UAT
cp /tmp/nginx-uat-template.conf /etc/nginx/sites-available/uat.ummahflow.com
nginx -t && systemctl reload nginx
```

---

### 3. Verify (1 minute)

```bash
# Test service worker
curl -I https://ummahflow.com/sw.js
# Should show: cache-control: no-cache, no-store, must-revalidate

# Test manifest
curl -I https://ummahflow.com/api/manifest
# Should show: HTTP/2 200, content-type: application/manifest+json
```

---

## 📋 Checklist

- [ ] Cloudflare Page Rule created for `/sw.js`
- [ ] Browser Integrity Check exception created for `/api/manifest`
- [ ] Service worker cache purged
- [ ] Nginx config deployed to production
- [ ] Nginx config deployed to UAT
- [ ] Service worker test passes
- [ ] Manifest route test passes
- [ ] Browser DevTools shows service worker registered
- [ ] PWA install prompt appears

---

## 🔍 Troubleshooting

**Manifest returns 403?**
→ Check Browser Integrity Check exception is active
→ Wait 2-3 minutes for Cloudflare propagation

**Service worker cached?**
→ Verify Page Rule is active
→ Purge cache again

**Nginx errors?**
→ Run `nginx -t` to check syntax
→ Check `/var/log/nginx/error.log`

---

## 📚 Full Documentation

See `docs/fixes/PWA_FIX_IMPLEMENTATION.md` for detailed instructions.

