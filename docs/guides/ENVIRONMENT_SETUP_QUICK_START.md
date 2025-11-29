# Environment Setup - Quick Start

## ✅ What's Been Set Up

I've created the following files for you:

### Template Files (for reference)
- `env.local.template` - Template for local development
- `env.uat.template` - Template for UAT testing
- `env.production.template` - Template for production

### Environment Files (need your credentials)
- `.env.local` - Already exists (your current dev setup)
- `.env.uat` - Already exists (needs UAT/PROD credentials)
- `.env.production` - Just created (needs UAT/PROD credentials)

### Scripts
- `scripts/setup-environments.sh` - Interactive setup script
- `scripts/verify-environments.sh` - Verify all environments
- `scripts/switch-env.sh` - Switch between environments (already existed)

---

## 🚀 Next Steps

### 1. Update .env.uat

Edit `.env.uat` and replace placeholders with your **UAT/PROD Supabase project** credentials:

```bash
nano .env.uat
# or use your preferred editor
```

Replace:
- `https://your-uat-prod-project-ref.supabase.co` → Your actual UAT/PROD project URL
- `your-uat-prod-anon-key-here` → Your actual anon key
- `your-uat-prod-service-role-key-here` → Your actual service role key

### 2. Update .env.production

Edit `.env.production` and use the **SAME UAT/PROD Supabase project** credentials:

```bash
nano .env.production
```

**Important**: Use the SAME Supabase project as `.env.uat`, but:
- Set `NEXT_PUBLIC_SITE_URL=https://ummahflow.com` (production URL)
- Set `NODE_ENV=production`
- Disable debug feature flags

### 3. Verify Setup

```bash
./scripts/verify-environments.sh
```

This will check:
- ✅ All files exist
- ✅ No placeholder values
- ✅ Valid Supabase URLs
- ✅ Correct project mapping

---

## 📋 Environment Summary

| Environment | Supabase Project | File | Usage |
|------------|-----------------|------|-------|
| **Local** | DEV | `.env.local` | `npm run dev` |
| **UAT** | UAT/PROD | `.env.uat` | `npm run dev:uat` |
| **Production** | UAT/PROD | `.env.production` | `npm run build:prod` |

---

## 🎯 Usage Examples

### Local Development
```bash
npm run dev
# Uses .env.local → DEV Supabase project
```

### UAT Testing
```bash
npm run dev:uat
# Uses .env.uat → UAT/PROD Supabase project
```

### Production Build
```bash
npm run build:prod
# Uses .env.production → UAT/PROD Supabase project
```

### Manual Switch
```bash
# Switch to UAT
./scripts/switch-env.sh uat
npm run dev

# Switch to Production
./scripts/switch-env.sh prod
npm run build

# Switch back to Local
./scripts/switch-env.sh dev
npm run dev
```

---

## 🔑 Getting Supabase Credentials

For each Supabase project:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

---

## ⚠️ Important Notes

1. **UAT and Production share the same Supabase project**
   - This is intentional to save on Supabase projects
   - They're differentiated by environment variables (site URL, feature flags)

2. **Local uses a different Supabase project**
   - Your personal DEV project
   - Safe to experiment

3. **Feature Flags**
   - Local/UAT: Debug features enabled
   - Production: Debug features disabled

---

## 📚 Full Documentation

See `docs/guides/ENVIRONMENT_SETUP.md` for complete documentation.

---

## ✅ Checklist

- [ ] Update `.env.uat` with UAT/PROD Supabase credentials
- [ ] Update `.env.production` with UAT/PROD Supabase credentials (same project)
- [ ] Run `./scripts/verify-environments.sh` to verify
- [ ] Test local: `npm run dev`
- [ ] Test UAT: `npm run dev:uat`
- [ ] Apply schema to both Supabase projects (DEV and UAT/PROD)

---

**You're all set!** Just fill in the credentials and you'll have 3 environments working with 2 Supabase projects.

