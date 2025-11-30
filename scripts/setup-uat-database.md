# Setup UAT Database - Step by Step Guide

## ✅ RECOMMENDED: Use Consolidated Schema (One-Step Setup)

1. Go to **UAT Supabase Dashboard** → **SQL Editor**
2. Copy contents of `sql/queries/supabase-schema-consolidated.sql`
3. Paste and click **Run**
4. Done! All tables, indexes, policies, and functions are created.

This consolidated file includes everything from base schema + all migrations with duplicates removed.

---

## Alternative: Apply Migrations Individually

If you prefer to apply migrations one by one, follow this order:

### Migration Order:

1. ✅ `sql/queries/supabase-schema.sql` (base schema - already done in Step 1)

2. ✅ `supabase/migrations/000_create_offers_needs_tables.sql`
   - Creates `offers` and `needs` tables (required before migration 001)

3. ✅ `supabase/migrations/001_create_offers_and_needs_tables.sql`
   - Creates `offers` and `needs` tables
   - Adds `offers_ids` and `needs_ids` to providers

4. ✅ `supabase/migrations/002_create_provider_community_services_relationship.sql`
   - Creates `provider_community_services` junction table

5. ✅ `supabase/migrations/003_create_category_suggestions_tables.sql`
   - Creates `category_suggested_offers` and `category_suggested_needs` tables

6. ✅ `supabase/migrations/004_add_created_by_to_offers_needs.sql`
   - Adds `created_by` column to offers and needs

7. ✅ `supabase/migrations/005_add_category_to_offers_needs.sql`
   - Adds `category_id` to offers and needs

8. ✅ `supabase/migrations/006_fill_missing_categories.sql`
   - Data migration (can skip if no data needed)

9. ✅ `supabase/migrations/007_categorize_existing_offers.sql`
   - Data migration (can skip if no data needed)

10. ✅ `supabase/migrations/008_fix_offer_categorizations.sql`
    - Data migration (can skip if no data needed)

11. ✅ `supabase/migrations/009_merge_synonym_offers_needs.sql`
    - Data migration (can skip if no data needed)

12. ✅ `supabase/migrations/010_create_push_subscriptions.sql`
    - Creates `push_subscriptions` table

13. ✅ `supabase/migrations/011_add_providers_performance_indexes.sql`
    - Adds performance indexes

14. ✅ `supabase/migrations/012_create_consent_logs.sql`
    - Creates `consent_logs` table

15. ✅ `supabase/migrations/20251120_admin_audit_logs.sql`
    - Creates `admin_audit_logs` table

16. ✅ `supabase/migrations/20251120_providers_indexes.sql`
    - Additional provider indexes

17. ✅ `sql/migrations/create-email-confirmation-tokens-table.sql`
    - Creates `email_confirmation_tokens` table (REQUIRED for signup)

## Step 2: Verify Schema

After running the consolidated schema, verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- ✅ admin_audit_logs
- ✅ bookmarks
- ✅ categories
- ✅ category_suggested_needs
- ✅ category_suggested_offers
- ✅ community_services
- ✅ consent_logs
- ✅ email_confirmation_tokens
- ✅ needs
- ✅ offers
- ✅ provider_community_services
- ✅ providers
- ✅ push_subscriptions
- ✅ users

## Step 3: Create Test Users

### Create Regular Test User

```sql
-- This will be created via signup API, or manually:
INSERT INTO auth.users (email, encrypted_password, email_confirmed)
VALUES ('test@example.com', crypt('TestPassword123!', gen_salt('bf')), false);

-- Then create user profile
INSERT INTO public.users (user_id, email, role)
SELECT id, email, 'user'::user_role
FROM auth.users
WHERE email = 'test@example.com';
```

### Create Admin Test User

```sql
-- Create admin user
INSERT INTO auth.users (email, encrypted_password, email_confirmed)
VALUES ('admin-test@example.com', crypt('AdminPassword123!', gen_salt('bf')), true);

-- Create admin profile
INSERT INTO public.users (user_id, email, role)
SELECT id, email, 'admin'::user_role
FROM auth.users
WHERE email = 'admin-test@example.com';
```

## Step 4: Seed Test Data (Optional)

Create some sample providers and categories for testing:

```sql
-- Add sample providers (adjust as needed)
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
FROM generate_series(1, 10);
```

## Step 5: Update Environment Variables

Update your `.env.uat` or test environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[UAT_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[UAT_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[UAT_SERVICE_ROLE_KEY]
```

## Quick Checklist

- [ ] Base schema applied
- [ ] All 16 migrations applied
- [ ] All tables verified
- [ ] Test users created
- [ ] Test data seeded (optional)
- [ ] Environment variables configured
- [ ] Ready for performance testing!
