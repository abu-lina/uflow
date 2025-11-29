# API Keys Setup - Quick Reference

## ✅ What's Been Updated

### .env.local (DEV)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` → `https://qrekonfhaenjdnjhwdum.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Updated from MCP
- ⏳ `SUPABASE_SERVICE_ROLE_KEY` → **Need to add manually**

### .env.uat (UAT)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` → `https://rdtdtcfntopcxcigkqoq.supabase.co`
- ⏳ `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Need to add manually**
- ⏳ `SUPABASE_SERVICE_ROLE_KEY` → **Need to add manually**

### .env.production (Production)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` → `https://rdtdtcfntopcxcigkqoq.supabase.co`
- ⏳ `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Need to add manually** (same as UAT)
- ⏳ `SUPABASE_SERVICE_ROLE_KEY` → **Need to add manually** (same as UAT)

---

## 🔑 Get Missing API Keys

### DEV Project Service Role Key

1. Go to: **https://supabase.com/dashboard/project/qrekonfhaenjdnjhwdum/settings/api**
2. Scroll to **"service_role"** key section
3. Click **"Reveal"** or **"Copy"**
4. Add to `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=[paste-service-role-key-here]
   ```

### UAT Project API Keys

1. Go to: **https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/settings/api**
2. Copy:
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
3. Add to both `.env.uat` and `.env.production`:
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[paste-anon-key-here]
   SUPABASE_SERVICE_ROLE_KEY=[paste-service-role-key-here]
   ```

---

## 📝 Quick Edit Commands

```bash
# Edit .env.local (add service_role key)
nano .env.local

# Edit .env.uat (add anon and service_role keys)
nano .env.uat

# Edit .env.production (add anon and service_role keys)
nano .env.production
```

---

## ✅ Verify After Adding Keys

```bash
./scripts/verify-environments.sh
```

This will check:
- All files have real credentials (no placeholders)
- URLs match expected projects
- All required keys are present

---

## 🎯 Summary

**What's Done:**
- ✅ DEV URL and anon key added to `.env.local`
- ✅ UAT URL added to `.env.uat` and `.env.production`

**What's Left:**
- ⏳ DEV service_role key → Add to `.env.local`
- ⏳ UAT anon key → Add to `.env.uat` and `.env.production`
- ⏳ UAT service_role key → Add to `.env.uat` and `.env.production`

**Time to Complete:** ~2 minutes (just copy-paste from dashboard)

---

## 🚀 After Adding Keys

Once all keys are added:

```bash
# Verify setup
./scripts/verify-environments.sh

# Test local dev
npm run dev

# Test UAT
npm run dev:uat
```

