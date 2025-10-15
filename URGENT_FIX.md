# 🚨 URGENT FIX - Wrong Supabase Project

## 🔍 Root Cause Analysis

**Why dev works but prod doesn't:**

### Dev (Local - ✅ Works)
```
npm run dev
  ↓
Reads .env.local directly
  ↓
Uses: rdtdtcfntopcxcigkqoq.supabase.co ✅
```

### Prod (Docker - ❌ Broken)
```
GitHub Actions builds Docker image
  ↓
Uses GitHub Secret: NEXT_PUBLIC_SUPABASE_URL
  ↓
Currently set to: pmbatjlosstytdmmqkky.supabase.co ❌ (WRONG!)
  ↓
This gets BAKED into the Docker image during build
  ↓
Deployed to Hetzner with wrong URL
  ↓
CORS errors because it's the wrong Supabase project!
```

---

## ✅ The Fix (3 Steps)

### Step 1: Update GitHub Secret

1. Go to: https://github.com/abu-lina/uflow/settings/secrets/actions
2. Find `NEXT_PUBLIC_SUPABASE_URL`
3. Click the **pencil icon** to edit it
4. Change from: `https://pmbatjlosstytdmmqkky.supabase.co`
5. Change to: `https://rdtdtcfntopcxcigkqoq.supabase.co`
6. Click **Update secret**

### Step 2: Also Update the Anon Key

1. Find `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Click the **pencil icon** to edit
3. Update to: `sb_publishable_uBW3lxrnOmqPI047jBmxtg_YFVDsr1q`
4. Click **Update secret**

### Step 3: Add Missing Secrets

#### Add `RESEND_API_KEY`:
- Click **New repository secret**
- Name: `RESEND_API_KEY`
- Value: `re_4m8Qc9hr_C9b2hRuL3dYDPnRu6mxwTLyL`
- Click **Add secret**

#### Add `SUPABASE_SERVICE_ROLE_KEY`:
- Click **New repository secret**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: `sb_secret_zz-UfIBWCufSI2rJ90edlw_ZFgj6it7`
- Click **Add secret**

---

## 🚀 Trigger Rebuild

After updating all secrets, trigger a new build:

```bash
git commit --allow-empty -m "Rebuild with correct Supabase credentials"
git push origin main
```

Or go to: https://github.com/abu-lina/uflow/actions and click "Re-run all jobs"

---

## ⏱️ Timeline

- Update secrets: **2 minutes**
- Rebuild & deploy: **5 minutes**
- **Total: 7 minutes to fix!**

---

## ✅ How to Verify It Worked

After deployment completes:

1. Open: https://ummahflow.com/signup
2. Open browser console (F12)
3. Try to sign up
4. **Before fix:** CORS errors to `pmbatjlosstytdmmqkky.supabase.co` ❌
5. **After fix:** No CORS errors, requests to `rdtdtcfntopcxcigkqoq.supabase.co` ✅

---

## 🤔 Why This Happened

You likely had an old Supabase project (`pmbatjlosstytdmmqkky`) that was set in GitHub Secrets when you first deployed. Your local `.env.local` was updated to the new project (`rdtdtcfntopcxcigkqoq`), but GitHub Secrets weren't updated.

**Key Learning:** GitHub Secrets and `.env.local` must match for prod to work like dev!

