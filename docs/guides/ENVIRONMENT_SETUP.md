# Environment Setup Guide

Complete guide for setting up 3 environments (Local, UAT, Production) with 2 Supabase projects.

## Overview

This setup uses:
- **2 Supabase Projects**: DEV and UAT/PROD
- **3 Environments**: Local, UAT, Production

### Project Mapping

```
Supabase Project 1 (DEV)
└── .env.local → Local Development

Supabase Project 2 (UAT/PROD)
├── .env.uat → UAT Testing (same project, different config)
└── .env.production → Production (same project, different config)
```

---

## Quick Setup

### Step 1: Run Setup Script

```bash
./scripts/setup-environments.sh
```

This creates:
- `.env.local` (from `env.local.template`)
- `.env.uat` (from `env.uat.template`)
- `.env.production` (from `env.production.template`)

### Step 2: Fill in Credentials

Edit each file with your Supabase project credentials:

**1. .env.local** (DEV Supabase Project)
```bash
# Get from: DEV Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
```

**2. .env.uat** (UAT/PROD Supabase Project)
```bash
# Get from: UAT/PROD Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-uat-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-uat-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-uat-prod-service-role-key
```

**3. .env.production** (UAT/PROD Supabase Project - SAME as UAT)
```bash
# Get from: UAT/PROD Supabase Dashboard → Settings → API
# NOTE: Same project as UAT, but with production settings
NEXT_PUBLIC_SUPABASE_URL=https://your-uat-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-uat-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-uat-prod-service-role-key
```

### Step 3: Verify Setup

```bash
./scripts/verify-environments.sh
```

This checks:
- All files exist
- No placeholder values
- Valid Supabase URLs
- Correct project mapping

---

## Usage

### Local Development

```bash
# Uses .env.local → DEV Supabase project
npm run dev
```

### UAT Testing

```bash
# Uses .env.uat → UAT/PROD Supabase project
npm run dev:uat

# Or manually switch
./scripts/switch-env.sh uat
npm run dev
```

### Production Build

```bash
# Uses .env.production → UAT/PROD Supabase project
npm run build:prod

# Or manually switch
./scripts/switch-env.sh prod
npm run build
```

---

## Environment Differences

### Local (.env.local)
- **Supabase Project**: DEV
- **Site URL**: `http://localhost:3000`
- **Node Env**: `development`
- **Feature Flags**: Debug enabled
- **Purpose**: Personal development

### UAT (.env.uat)
- **Supabase Project**: UAT/PROD (same as production)
- **Site URL**: `http://localhost:3000` (or UAT domain)
- **Node Env**: `development`
- **Feature Flags**: Debug enabled (for testing)
- **Purpose**: Team testing, stakeholder demos

### Production (.env.production)
- **Supabase Project**: UAT/PROD (same as UAT)
- **Site URL**: `https://ummahflow.com`
- **Node Env**: `production`
- **Feature Flags**: Debug disabled
- **Purpose**: Live production

---

## Key Points

### Same Database for UAT and Production

UAT and Production use the **same Supabase project**. This means:
- ✅ Realistic testing (same database structure)
- ✅ No extra Supabase cost
- ⚠️  Shared data (be careful with test data)

### Data Management

Since UAT and Production share the same database:
- Use test accounts with identifiable emails (e.g., `test-*@example.com`)
- Consider adding an `environment` column to separate data
- Or use different table prefixes (not recommended)

### Feature Flags

Different feature flags per environment:
- **Local/UAT**: Debug features enabled
- **Production**: Debug features disabled

---

## Troubleshooting

### "Environment file not found"

Run the setup script:
```bash
./scripts/setup-environments.sh
```

### "Placeholder values detected"

Edit the `.env` files and replace placeholders:
```bash
nano .env.local
nano .env.uat
nano .env.production
```

### "Wrong Supabase project"

Verify your credentials match the correct project:
- `.env.local` → DEV project
- `.env.uat` → UAT/PROD project
- `.env.production` → UAT/PROD project (same as UAT)

### Switch Script Not Working

Make sure the script is executable:
```bash
chmod +x scripts/switch-env.sh
```

---

## File Structure

```
.env.local          # Local development (DEV project)
.env.uat            # UAT testing (UAT/PROD project)
.env.production     # Production (UAT/PROD project)
.env.local.backup   # Backup (auto-created by switch script)

env.local.template      # Template for .env.local
env.uat.template        # Template for .env.uat
env.production.template # Template for .env.production
```

---

## Next Steps

1. ✅ Run `./scripts/setup-environments.sh`
2. ✅ Fill in credentials in all 3 `.env` files
3. ✅ Run `./scripts/verify-environments.sh`
4. ✅ Test local: `npm run dev`
5. ✅ Test UAT: `npm run dev:uat`
6. ✅ Apply schema to both Supabase projects

---

## Related Documentation

- [UAT Setup Guide](./UAT_SETUP_GUIDE.md) - Detailed UAT setup
- [Supabase Setup Guide](./SUPABASE_SETUP_GUIDE.md) - Database setup
- [Feature Flags](../QUICK_IMPORT_FEATURE_FLAG.md) - Feature flag usage









