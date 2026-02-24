# SQL Files

Reference queries, seeds, and one-off scripts for the UFlow project.

> **Authoritative migrations live in `supabase/migrations/`.**
> Files in this folder are **not** applied automatically by CI/CD or any deployment pipeline.
> Use them for manual debugging, data seeding, and historical reference only.
> If you need to change the production schema, create a new migration in `supabase/migrations/`.

## 📁 Directory Structure

```
sql/
├── migrations/      # Historical / manual-only schema scripts (NOT authoritative)
├── queries/         # Utility and fix queries (manual use)
└── debug/           # Debugging and verification queries
```

---

## 🔄 Migrations (Reference Only)

**Location:** `sql/migrations/`
**Status:** Historical — NOT executed in CI/CD. See `supabase/migrations/` for authoritative schema.

Manual schema scripts and seeds:

- **create-email-confirmation-tokens-table.sql** - Email confirmation system
- **create-provider-social-projects-view.sql** - Provider social view
- **create-sample-relationships.sql** - Sample data
- **add-category-types.sql** - Category type additions
- **add-offers-needs-columns.sql** - Offers/needs columns
- **setup-provider-social-relationships.sql** - Social relationships setup

### Running Migrations

```bash
# In Supabase Dashboard → SQL Editor
# Copy and paste the migration file contents
# Run the SQL
```

---

## 🔧 Queries

**Location:** `sql/queries/`

Utility and fix queries:

- **fix-confirmed-user-login.sql** - Fix stuck email confirmation
- **fix-provider-\*.sql** - Provider-related fixes
- **fix-rls-policies.sql** - RLS policy fixes
- **delete-user-account.sql** - User deletion
- **supabase-schema.sql** - Full schema
- **supabase-storage-setup.sql** - Storage configuration

---

## 🐛 Debug

**Location:** `sql/debug/`

Debugging and verification queries:

- **check-specific-token.sql** - Verify email tokens
- **check-token-in-db.sql** - Token existence check
- **verify-provider-creation-fix.sql** - Provider creation verification
- **verify-relationships.sql** - Relationship verification
- **debug-relationships.sql** - Relationship debugging

---

## 📝 Usage Examples

### Check Email Confirmation Token

```sql
-- Use sql/debug/check-specific-token.sql
SELECT * FROM email_confirmation_tokens
WHERE email = 'user@example.com';
```

### Fix Stuck Email Confirmation

```sql
-- Use sql/queries/fix-confirmed-user-login.sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com'
  AND email_confirmed_at IS NULL;
```

### Create Email Token Table

```sql
-- Use sql/migrations/create-email-confirmation-tokens-table.sql
CREATE TABLE IF NOT EXISTS public.email_confirmation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... rest of schema
);
```

---

## ⚠️ Important Notes

1. **Always backup before running queries**
2. **Test in development first**
3. **Review RLS policies** after schema changes
4. **Check migrations** are idempotent (safe to run multiple times)

---

## 🔒 Security

- Never commit `.sql` files with real user data
- Use parameterized queries in application code
- Review RLS policies in `sql/queries/fix-rls-policies.sql`
- Test permissions after migrations

---

Last updated: October 17, 2025
