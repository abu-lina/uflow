-- Migration 008: Phase 5 — Dual-PK Consolidation, Table 2: users
-- Plan 114 F-1 · Table order: 2 of 4 (special: auth bridge, requires C-5 check)
--
-- Pre-condition verification:
--   All FKs referencing `public.users` already target `users.user_id`:
--     admin_audit_logs.admin_user_id → users(user_id)
--   The `users.user_id` column has an outgoing FK to auth.users(id) — this FK
--     is from `user_id`, not from `id`, so it is unaffected by this migration.
--   No Supabase Auth mechanism references public.users.id:
--     - auth.users.id is a separate column in auth schema (unaffected)
--     - handle_new_user() trigger inserts `user_id` (= NEW.id from auth.users),
--       not `id` (the vestigial column). Trigger body verified in baseline.
--     - Supabase client .auth.getUser() returns auth.users.id, not public.users.id
--
-- ⚠️  C-5 GATE: After applying this migration to dev, verify:
--     1. Auth login flow returns a valid session
--     2. Auth signup creates a new row in public.users with user_id populated
--     3. GET /api/admin/check-role returns { authenticated: true, databaseRole: ... }
--     4. GET /api/admin/debug-auth returns no column-not-found errors
--     Only promote to prod after dev smoke test passes.
--
-- App code already updated (done before migration):
--     src/lib/auth/roles.ts                    .select('role, user_id, email')
--     src/app/api/admin/check-role/route.ts    .select('user_id, email, role')
--     src/app/api/admin/debug-auth/route.ts    .select('user_id, email, role[, created_at]')
--     src/app/api/admin/set-role/route.ts      .select('user_id, email, role')
--     src/app/api/admin/diagnose/route.ts      .select('user_id, email, role[, created_at]')
--     src/app/api/admin/badges/verify/route.ts .eq('user_id', user.id)
--     src/app/api/admin/badges/unverify/route.ts .eq('user_id', user.id)
--
-- Steps:
--   1. Drop PK constraint on `id`
--   2. Promote `user_id` to PRIMARY KEY while preserving existing UNIQUE
--      (FK-safe cutover: inbound FKs may depend on existing unique constraint)
--   3. Drop explicit btree index on `user_id` (redundant with UNIQUE/PK)
--   4. Drop the vestigial `id` column
--
-- Rollback (before step 5):
--   ALTER TABLE public.users ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
--   ALTER TABLE public.users DROP CONSTRAINT users_pkey;
--   ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
--   CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users USING btree (user_id);
-- ---------------------------------------------------------------------------

BEGIN;

-- Step 1: Drop PK on vestigial id column
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_pkey;

-- Step 2: Promote user_id to PRIMARY KEY
--         Keep users_user_id_key for FK dependency safety.
ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

-- Step 3: Drop now-redundant explicit btree index on user_id
DROP INDEX IF EXISTS public.idx_users_user_id;

-- Step 4: Drop vestigial id column (point of no return for this table)
--         ⚠️  Run C-5 smoke test on dev before running this on prod
ALTER TABLE public.users
  DROP COLUMN IF EXISTS id;

COMMIT;
