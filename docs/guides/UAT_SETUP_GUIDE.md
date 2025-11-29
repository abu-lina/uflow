# UAT Environment Setup Guide

Complete guide for setting up a Supabase UAT (User Acceptance Testing) database and environment for Ummah Flow.

## Overview

This guide covers:
1. Creating a new Supabase project for UAT
2. Applying the complete database schema
3. Configuring environment variables
4. Setting up test data
5. Running the app with UAT configuration

---

## Step 1: Create UAT Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in project details:
   - **Name:** `uflow-uat` (or your preferred name)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users
   - **Pricing Plan:** Free tier is fine for UAT
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize

---

## Step 2: Get UAT Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL:** `https://[your-project-ref].supabase.co`
   - **anon public key:** `sb_publishable_...`
   - **service_role key:** `sb_secret_...` (keep this secret!)

3. Go to **Settings** → **Database**
4. Copy the **Database password** (or reset it if needed)

---

## Step 3: Apply Database Schema

You have two options:

### Option A: Quick Setup (Recommended)

Use the consolidated schema file for one-step setup:

1. Go to your UAT Supabase Dashboard → **SQL Editor**
2. Open `sql/queries/supabase-schema-consolidated.sql` in your editor
3. Copy the entire file contents
4. Paste into Supabase SQL Editor
5. Click **Run** (or press `Cmd/Ctrl + Enter`)
6. Wait for execution to complete (should take 10-30 seconds)

This creates all tables, indexes, policies, functions, and storage buckets.

### Option B: Use Complete UAT Schema

Alternative using the complete UAT schema:

1. Go to **SQL Editor** in UAT dashboard
2. Open `sql/uat-complete-schema.sql` in your editor
3. Copy the entire file contents
4. Paste and click **Run**

### Option C: Automated Script

Use the provided script for command-line setup:

```bash
# Make script executable
chmod +x scripts/apply-schema-to-uat.sh

# Run the script
./scripts/apply-schema-to-uat.sh sql/queries/supabase-schema-consolidated.sql
```

The script will prompt you for:
- UAT Project Reference (from your Supabase URL)
- Database Password

---

## Step 4: Verify Schema

After applying the schema, verify all tables exist:

1. Go to **SQL Editor** in UAT dashboard
2. Run this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables (16 total):
- ✅ `admin_audit_logs`
- ✅ `bookmarks`
- ✅ `categories`
- ✅ `category_suggested_needs`
- ✅ `category_suggested_offers`
- ✅ `community_services`
- ✅ `consent_logs`
- ✅ `email_confirmation_tokens`
- ✅ `needs`
- ✅ `offers`
- ✅ `provider_community_services`
- ✅ `providers`
- ✅ `push_subscriptions`
- ✅ `users`

---

## Step 5: Create Environment File

Create a `.env.uat` file in your project root:

```bash
# Copy the template
cp env.template .env.uat
```

Then edit `.env.uat` with your UAT credentials:

```bash
# UAT Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-uat-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-uat-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-uat-service-role-key]

# Environment
NODE_ENV=development

# Site URL (adjust if you have a UAT domain)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Resend API Key (use same as dev, or create UAT key)
RESEND_API_KEY=[your-resend-api-key]

# Optional: Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[your-google-maps-key]

# Optional: Push Notifications (VAPID Keys)
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=[your-vapid-public-key]
# VAPID_PRIVATE_KEY=[your-vapid-private-key]
# VAPID_EMAIL=your-email@example.com
```

**Important:** Add `.env.uat` to `.gitignore` if it's not already there.

---

## Step 6: Create Test Users

### Create Regular Test User

You can create users via the signup API, or manually:

```sql
-- Create auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  true,
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;

-- Create user profile
INSERT INTO public.users (user_id, email, role)
SELECT id, email, 'user'::user_role
FROM auth.users
WHERE email = 'test@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

### Create Admin Test User

```sql
-- Create admin auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin-test@example.com',
  crypt('AdminPassword123!', gen_salt('bf')),
  true,
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;

-- Create admin profile
INSERT INTO public.users (user_id, email, role)
SELECT id, email, 'admin'::user_role
FROM auth.users
WHERE email = 'admin-test@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

**Note:** For easier testing, you can also use the signup flow in the app with these emails.

---

## Step 7: Seed Test Data (Optional)

Create sample providers and categories for testing:

```sql
-- Add sample providers
INSERT INTO public.providers (
  provider_name,
  provider_description,
  category_id,
  address_city,
  review_status
)
SELECT 
  'Test Provider ' || generate_series,
  'Test description for provider ' || generate_series,
  (SELECT category_id FROM public.categories LIMIT 1),
  'Berlin',
  'approved'::review_status
FROM generate_series(1, 10)
ON CONFLICT DO NOTHING;
```

---

## Step 8: Deploy UAT to Server (Production Deployment)

For deploying UAT to `uat.ummahflow.com` on Hetzner, see:
- **[UAT Deployment Guide](../../deployment/UAT_DEPLOYMENT.md)** - Complete deployment instructions

Quick deployment:
```bash
# On Hetzner server
./scripts/setup-uat-ssl.sh  # Set up SSL certificate
./scripts/deploy-uat.sh     # Deploy UAT container
```

---

## Step 9: Run App with UAT Environment (Local Development)

### Option A: Using .env.uat file

Next.js doesn't automatically load `.env.uat`. You have a few options:

**Option 1: Rename temporarily**
```bash
# Backup your current .env.local
mv .env.local .env.local.backup

# Use UAT env
cp .env.uat .env.local

# Run dev server
npm run dev

# Restore when done
mv .env.local.backup .env.local
```

**Option 2: Use dotenv-cli**
```bash
# Install dotenv-cli
npm install --save-dev dotenv-cli

# Run with UAT env
npx dotenv -e .env.uat -- npm run dev
```

**Option 3: Export variables manually**
```bash
# Load UAT env vars
export $(cat .env.uat | xargs)

# Run dev server
npm run dev
```

### Option B: Create npm script

Add to `package.json`:

```json
{
  "scripts": {
    "dev:uat": "dotenv -e .env.uat -- npm run dev",
    "build:uat": "dotenv -e .env.uat -- npm run build"
  }
}
```

Then run:
```bash
npm run dev:uat
```

---

## Step 10: Verify UAT Connection

1. Start the dev server with UAT environment
2. Open browser to `http://localhost:3000`
3. Open browser DevTools → Console
4. Check for any Supabase connection errors
5. Try signing up or logging in with test credentials

---

## Step 11: Configure GitHub Actions (Optional)

If you want to run performance tests against UAT, add these secrets to GitHub:

1. Go to **Repository Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `UAT_SUPABASE_URL` - Your UAT project URL
   - `UAT_SUPABASE_ANON_KEY` - Your UAT anon key
   - `UAT_SUPABASE_SERVICE_ROLE_KEY` - Your UAT service role key
   - `UAT_TEST_USER_EMAIL` - Test user email
   - `UAT_TEST_USER_PASSWORD` - Test user password

Then update `.github/workflows/performance-test.yml` to use UAT secrets when `environment: uat` is selected.

---

## Quick Reference

### UAT Database Connection String

Format:
```
postgresql://postgres.[project-ref]:[password]@[project-ref].supabase.co:5432/postgres
```

Example:
```
postgresql://postgres.abcdefghijklmnop:your-password@abcdefghijklmnop.supabase.co:5432/postgres
```

### Useful SQL Queries

**Check all tables:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

**Check RLS policies:**
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

**Check indexes:**
```sql
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

**Count records per table:**
```sql
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Troubleshooting

### Schema application fails

- Check for duplicate table errors (tables might already exist)
- Verify you're using the correct Supabase project
- Check SQL Editor for specific error messages

### Connection errors

- Verify `NEXT_PUBLIC_SUPABASE_URL` matches your UAT project
- Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Ensure CORS is enabled in Supabase (Settings → API)

### Authentication issues

- Verify test users were created correctly
- Check `email_confirmed` is `true` for test users
- Ensure RLS policies allow access

### Missing tables

- Re-run the schema file
- Check SQL Editor execution logs
- Verify you're looking at the correct database

---

## Next Steps

After UAT is set up:

1. ✅ Run performance tests: `npm run perf:test`
2. ✅ Test all features end-to-end
3. ✅ Verify email sending works (if configured)
4. ✅ Test push notifications (if configured)
5. ✅ Run security scans
6. ✅ Document any issues found

---

## Checklist

- [ ] UAT Supabase project created
- [ ] Credentials saved securely
- [ ] Database schema applied
- [ ] All tables verified
- [ ] Test users created
- [ ] `.env.uat` file created
- [ ] App runs with UAT environment
- [ ] Connection verified
- [ ] Test data seeded (optional)
- [ ] GitHub secrets added (optional)
- [ ] Ready for testing!

---

## Related Files

- `sql/queries/supabase-schema-consolidated.sql` - Consolidated schema
- `sql/uat-complete-schema.sql` - Complete UAT schema
- `scripts/apply-schema-to-uat.sh` - Automated schema application
- `scripts/setup-uat-database.md` - Alternative setup guide
- `env.uat.template` - UAT environment variable template
- `docs/deployment/UAT_DEPLOYMENT.md` - **UAT deployment guide (Hetzner)**
- `scripts/deploy-uat.sh` - UAT deployment script
- `scripts/setup-uat-ssl.sh` - SSL certificate setup for UAT

