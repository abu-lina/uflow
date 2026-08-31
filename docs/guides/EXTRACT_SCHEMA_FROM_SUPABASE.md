# How to Extract Schema from Supabase

Since direct `pg_dump` connections often timeout, here are reliable methods:

## Method 1: Supabase Dashboard SQL Editor (Easiest)

### Step 1: Get Schema via SQL Queries

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the queries from `scripts/extract-schema-sql-editor.sql`
4. Copy each result set
5. Combine them into a single SQL file

### Step 2: Use Supabase CLI (If Available)

If you have Supabase CLI linked:

```bash
# Make sure you're linked
supabase link --project-ref YOUR_PROJECT_REF

# Try to dump (may still have connection issues)
supabase db dump --schema public --schema auth -f schema.sql
```

## Method 2: Use Supabase Migrations (Recommended)

Since you already have all migrations in `supabase/migrations/`, the **best approach** is:

### Apply Migrations to UAT in Order

1. **In UAT Supabase Dashboard → SQL Editor**, run migrations in this order:

```
1. supabase-schema.sql (base schema)
2. 001_create_offers_and_needs_tables.sql
3. 002_create_provider_community_services_relationship.sql
4. 003_create_category_suggestions_tables.sql
5. 004_add_created_by_to_offers_needs.sql
6. 005_add_category_to_offers_needs.sql
7. 006_fill_missing_categories.sql
8. 007_categorize_existing_offers.sql
9. 008_fix_offer_categorizations.sql
10. 009_merge_synonym_offers_needs.sql
11. 010_create_push_subscriptions.sql
12. 011_add_providers_performance_indexes.sql
13. 012_create_consent_logs.sql
14. 20251120_admin_audit_logs.sql
15. 20251120_providers_indexes.sql
16. sql/migrations/create-email-confirmation-tokens-table.sql
```

This ensures you get the exact same schema as production.

## Method 3: Manual Schema Collection

If you need to extract from production:

1. **Tables**: Go to Table Editor → See all tables
2. **For each table**: Click "..." → "View table definition"
3. **Copy the SQL** for each table
4. **Combine** into one file

## Method 4: Use Supabase Backup Feature

1. Go to Supabase Dashboard
2. Settings → Database
3. Create a backup
4. Download the backup file
5. Extract schema from backup (it's a SQL dump)

## Recommended Approach for UAT Setup

**Use Method 2** - Apply migrations in order. This is:
- ✅ Most reliable
- ✅ Ensures consistency
- ✅ Already tested
- ✅ Version controlled

### Quick Setup Script

Create a script that applies all migrations:

```bash
#!/bin/bash
# Apply all migrations to UAT

MIGRATIONS=(
  "sql/queries/supabase-schema.sql"
  "supabase/migrations/archive/001_create_offers_and_needs_tables.sql"
  "supabase/migrations/archive/002_create_provider_community_services_relationship.sql"
  # ... etc
)

for migration in "${MIGRATIONS[@]}"; do
  echo "Applying: $migration"
  # Copy contents and paste in UAT SQL Editor
done
```

## Troubleshooting Connection Issues

If `pg_dump` times out:

1. **Check IP Whitelist**: Supabase Dashboard → Settings → Database → Connection Pooling
2. **Use Connection Pooler**: Port 6543 instead of 5432
3. **Use Supabase CLI**: May handle connections better
4. **Use Dashboard**: Most reliable method

## Next Steps After Schema Extraction

1. ✅ Apply schema to UAT
2. ✅ Create test user accounts
3. ✅ Seed test data
4. ✅ Configure environment variables
5. ✅ Run performance tests














