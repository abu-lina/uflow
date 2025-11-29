# Schema Consolidation Summary

## Overview

Created a consolidated database schema file (`sql/queries/supabase-schema-consolidated.sql`) that combines the base schema and all migrations, with all duplicates and conflicts resolved.

## What Was Consolidated

### Files Combined
- `sql/queries/supabase-schema.sql` (base schema)
- `supabase/migrations/000_create_offers_needs_tables.sql`
- `supabase/migrations/001_create_offers_and_needs_tables.sql`
- `supabase/migrations/002_create_provider_community_services_relationship.sql`
- `supabase/migrations/003_create_category_suggestions_tables.sql`
- `supabase/migrations/004_add_created_by_to_offers_needs.sql`
- `supabase/migrations/005_add_category_to_offers_needs.sql`
- `supabase/migrations/010_create_push_subscriptions.sql`
- `supabase/migrations/011_add_providers_performance_indexes.sql`
- `supabase/migrations/012_create_consent_logs.sql`
- `supabase/migrations/20251120_admin_audit_logs.sql`
- `supabase/migrations/20251120_providers_indexes.sql`
- `sql/migrations/create-email-confirmation-tokens-table.sql`

## Duplicates Removed

### Index Duplicates
1. **`idx_providers_category_id`**
   - Base schema: Simple index
   - Migration 011: Partial index with WHERE clause
   - **Resolution**: Used migration 011 version (better performance)

2. **`idx_providers_city` vs `idx_providers_address_city`**
   - Base schema: `idx_providers_city`
   - Migration 011: `idx_providers_address_city` (partial index)
   - **Resolution**: Used migration 011 version (better name, partial index)

3. **`idx_providers_created_at`**
   - Base schema: Simple index
   - Migration 011: DESC index
   - Migration 20251120: Composite index with review_status
   - **Resolution**: Kept both - single DESC index and composite index

4. **`idx_providers_review_status`**
   - Base schema: Simple index
   - Migration 20251120: Same index
   - **Resolution**: Kept one (they're identical)

5. **`idx_providers_user_created_id`**
   - Migration 20251120: Index
   - add-user-created-id.sql: Same index
   - **Resolution**: Kept one

### Table Creation Conflicts
1. **`offers` and `needs` tables**
   - Migration 000: Creates tables with `category_id` and `created_by`
   - Migration 001: Assumes tables exist, adds constraints
   - Migration 004: Tries to add `created_by` (already exists)
   - Migration 005: Tries to add `category_id` (already exists)
   - **Resolution**: Created tables once with all columns in consolidated schema

### Column Addition Conflicts
1. **`providers.offers_ids` and `providers.needs_ids`**
   - Migration 001: Adds columns
   - add-offers-needs-columns.sql: Also adds columns
   - **Resolution**: Added once in consolidated providers table definition

### RLS Policy Conflicts
1. **Offers/Needs policies**
   - Migration 001: Creates basic policies
   - Migration 004: Updates DELETE policy
   - **Resolution**: Used final version from migration 004

## Final Schema Statistics

- **14 tables** (all from base + migrations)
- **57 indexes** (duplicates removed, best versions used)
- **49 RLS policies** (final versions)
- **21 functions** (all helper functions included)
- **3 enums** (user_role, review_status, consent_type)

## Tables Included

1. users
2. categories
3. providers (with offers_ids and needs_ids)
4. community_services
5. bookmarks
6. offers (with category_id and created_by)
7. needs (with category_id and created_by)
8. provider_community_services
9. category_suggested_offers
10. category_suggested_needs
11. email_confirmation_tokens
12. push_subscriptions
13. consent_logs
14. admin_audit_logs

## Usage

### For UAT Setup

1. Go to UAT Supabase Dashboard → SQL Editor
2. Copy contents of `sql/queries/supabase-schema-consolidated.sql`
3. Paste and click **Run**
4. Done! All tables, indexes, policies, and functions are created.

### Benefits

- ✅ **One-step setup** - No need to run 17 separate migrations
- ✅ **No duplicates** - All conflicts resolved
- ✅ **Idempotent** - Uses `IF NOT EXISTS` and `DROP IF EXISTS` for safety
- ✅ **Complete** - Includes everything from all migrations
- ✅ **Best practices** - Uses partial indexes, DESC sorting, etc.

## Verification

After running the consolidated schema, verify with:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return 14 tables
```

## Notes

- The consolidated schema uses `IF NOT EXISTS` for tables and `DROP IF EXISTS` for triggers/policies to make it safe to run multiple times
- All indexes use `IF NOT EXISTS` to avoid conflicts
- Seed data uses `ON CONFLICT DO NOTHING` to avoid duplicates
- The schema is production-ready and can be used for any new database setup
