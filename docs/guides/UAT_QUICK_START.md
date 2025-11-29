# UAT Quick Start

Quick reference for setting up UAT environment.

## 🚀 Quick Setup (5 minutes)

### 1. Create Supabase UAT Project
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Click **"New Project"**
- Name: `uflow-uat`
- Save the database password

### 2. Get Credentials
- **Settings** → **API**: Copy URL, anon key, service_role key
- **Settings** → **Database**: Copy database password

### 3. Apply Schema
- Go to **SQL Editor** in UAT dashboard
- Copy contents of `sql/queries/supabase-schema-consolidated.sql`
- Paste and click **Run**

### 4. Create Environment File
```bash
cp env.template .env.uat
# Edit .env.uat with your UAT credentials
```

### 5. Run with UAT
```bash
# Option 1: Use the switch script
npm run dev:uat

# Option 2: Manual switch
./scripts/switch-env.sh uat
npm run dev
```

## 📋 Environment Variables

Your `.env.uat` should have:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-uat-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-uat-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-uat-service-role-key]
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=[your-resend-key]
```

## ✅ Verify Setup

1. Start dev server: `npm run dev:uat`
2. Open `http://localhost:3000`
3. Check browser console for errors
4. Try signing up with a test email

## 📚 Full Guide

See `docs/guides/UAT_SETUP_GUIDE.md` for complete instructions.

## 🔧 Useful Commands

```bash
# Switch to UAT
npm run dev:uat

# Switch to development
./scripts/switch-env.sh dev
npm run dev

# Apply schema to UAT (if you have psql)
./scripts/apply-schema-to-uat.sh sql/queries/supabase-schema-consolidated.sql
```

