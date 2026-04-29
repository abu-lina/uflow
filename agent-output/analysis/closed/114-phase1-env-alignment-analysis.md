---
ID: 114
Origin: 114
UUID: f2c8a71e
Status: Planned
---

# Analysis 114 — Phase 1 Environment Alignment (F-9) Technical Unknowns

## Changelog

| Date | Agent | Change |
|---|---|---|
| 2026-04-29 | analyst | Created. Investigated DR#8 unknowns: consent_logs / deletion_logs intent, codebase usage, cross-environment state. |

## Value Statement and Business Objective

Phase 1 (F-9) resolves cross-environment schema divergence for GDPR-relevant tables. Before writing the `004_phase1_environment_alignment.sql` migration, Decision Record #8 requires operator confirmation on two tables that serve different compliance purposes. This analysis converts unknowns to knowns so the operator can make an informed decision.

## Context

- **Plan**: 114-db-schema-staged-refactor-plan.md (Phase 1 milestone)
- **Architecture**: 114-db-schema-architecture-review.md (F-9 finding)
- **Prior work**: Phase 0′ baseline squash complete; Phase 0 hygiene applied to prod
- **Baseline**: `001_baseline.sql` is prod-derived (v0.11.1); local matches prod after `supabase db reset`

## Methodology

- **Component Isolation**: Queried local Postgres directly via `psql` to verify table/enum presence
- **Upstream Tracing**: Traced both tables through archived migrations, baseline DDL, and application code paths
- **Code Audit**: Comprehensive `grep` across all `.ts`/`.tsx`/`.js` files for table references
- **DDL Inspection**: Read full table definitions from baseline and archived migration 012

---

## Findings

### F1 · L1 Proven — `consent_logs` is actively written to by application code

**Evidence**: Three API routes reference `consent_logs`:

| File | Lines | Operation | Client |
|---|---|---|---|
| `src/app/api/auth/signup/route.ts` | 223–245 | INSERT (terms_of_service + privacy_policy) | `getSupabaseAdmin()` (service_role) |
| `src/app/api/auth/magic-link/route.ts` | 247–264 | INSERT (terms_of_service + privacy_policy) | `supabaseAdmin` (service_role) |
| `src/app/api/user/export-data/route.ts` | 82–89 | SELECT (user's consent history) | user-context client |

Both signup flows insert two rows per new user (ToS + Privacy Policy consent events). The export-data route reads consent history for GDPR data export.

**Critical implication**: On prod, where `consent_logs` does not exist, these INSERT operations are **silently failing**. The code handles this gracefully (`if (consentError) { console.error(...); }` — continues without failing signup), but **no GDPR consent audit trail is being recorded for any user created on prod**.

### F2 · L1 Proven — `consent_logs` and `consent_type` are absent from prod and local

**Evidence**: Direct `psql` query against local database (prod-derived baseline):

```
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('consent_logs', 'deletion_logs');
→ deletion_logs (only)

SELECT typname FROM pg_type WHERE typname = 'consent_type' AND typtype = 'e';
→ 0 rows
```

The `001_baseline.sql` (generated from prod) contains zero references to `consent_logs` or `consent_type`. This confirms they were never applied to prod.

### F3 · L1 Proven — `consent_logs` was created in archived migration 012 but never reached prod

**Evidence**: `supabase/migrations/archive/012_create_consent_logs.sql` contains the full DDL:

- `consent_type` enum: `('terms_of_service', 'privacy_policy')`
- `consent_logs` table: `id UUID PK`, `user_id UUID → auth.users CASCADE`, `consent_type consent_type NOT NULL`, `accepted BOOLEAN`, `accepted_at TIMESTAMPTZ`, `ip_address TEXT`, `user_agent TEXT`, `revoked_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ`
- 3 indexes: `user_id`, `consent_type`, `accepted_at DESC`
- RLS enabled with 4 policies: users SELECT/INSERT/UPDATE own rows; admins SELECT all
- Table comments for GDPR audit context

This migration existed in the local chain but was never applied to prod (prod had no migration tracking — F-11).

### F4 · L1 Proven — `deletion_logs` exists on prod+local via baseline, referenced by `delete_user_account()` RPC

**Evidence**: `001_baseline.sql` line 1992 defines the table:

```sql
CREATE TABLE IF NOT EXISTS "public"."deletion_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "deleted_at" timestamp with time zone DEFAULT now(),
    "reason" text,
    "created_at" timestamp with time zone DEFAULT now()
);
```

The `delete_user_account()` function (line 231) conditionally inserts into `deletion_logs`:
```sql
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deletion_logs') THEN
    INSERT INTO public.deletion_logs (user_id, deleted_at, reason)
    VALUES (delete_user_account.user_id, NOW(), 'User requested account deletion');
END IF;
```

The conditional check (`IF EXISTS`) confirms this was added as an optional feature — the function works whether or not the table exists.

**Application usage**: `src/services/account.ts` calls `supabase.rpc('delete_user_account', ...)` in two code paths (primary deletion and RPC fallback).

### F5 · L1 Proven — `deletion_logs` has no migration file, was a manual prod addition

**Evidence**: No migration file in the archived chain creates `deletion_logs`. It appears only in the full prod data dumps (`archive/002_seed_full_public.sql`, `archive/002_seed_full_public_inserts.sql`) and in the baseline generated from prod. The `delete_user_account()` function's conditional check (`IF EXISTS`) further confirms this was designed to be optional/additive.

### F6 · L1 Proven — `deletion_logs` RLS is admin-read-only; writes are via SECURITY DEFINER function

**Evidence from baseline**:
- RLS enabled: `ALTER TABLE "public"."deletion_logs" ENABLE ROW LEVEL SECURITY;`
- Single policy: `"Only admins can read deletion logs"` — SELECT only, JWT role = 'admin'
- No INSERT/UPDATE/DELETE policies
- The only write path is `delete_user_account()` which is `SECURITY DEFINER` (runs as owner, bypasses RLS)

This is correctly designed — deletion audit logs should not be user-writable.

### F7 · L1 Proven — Neither table has TypeScript type definitions

**Evidence**: `grep -rn "consent_logs\|deletion_logs" src/types/` returned zero results. Both tables are accessed via untyped Supabase client calls (`.from('consent_logs').insert(...)`, `.rpc('delete_user_account', ...)`).

### F8 · L1 Proven — Current local+prod structural baseline is 29 tables, 9 enums

**Evidence**: Direct `psql` query:
```
table_count: 29
enum_count: 9
```

After Phase 1, with both tables present, the target would be **30 tables, 10 enums** (adding `consent_logs` + `consent_type` enum). `deletion_logs` is already counted in the 29.

---

## Determination: DR#8 Intent Resolution

Based on L1-proven evidence:

### `consent_logs` (Q1)

**Determination: Must be added to prod+local (option a).**

Rationale:
1. Active application code (signup + magic-link) writes to this table on every new user creation
2. On prod, these writes silently fail — **zero GDPR consent records exist for any prod user**
3. The GDPR data export route (`/api/user/export-data`) queries this table — it returns empty results on prod
4. The table was designed, indexed, RLS-protected, and commented for GDPR compliance
5. There is no replacement mechanism — `deletion_logs` serves a completely different purpose (deletion audit, not consent tracking)

### `deletion_logs` (Q2)

**Determination: Must be codified as a forward migration for dev (option a).**

Rationale:
1. The table exists on prod (captured in baseline) and serves an active deletion audit function
2. `delete_user_account()` RPC already conditionally writes to it
3. `src/services/account.ts` calls this RPC in two code paths
4. Dev is the only environment missing this table
5. The conditional `IF EXISTS` check in the function means dev works without it, but the audit trail is lost

### Both tables together

These tables are **not duplicates** — they serve complementary GDPR compliance purposes:
- `consent_logs`: Records when users consent to ToS/Privacy Policy (required for GDPR Art. 7 proof of consent)
- `deletion_logs`: Records when user accounts are deleted (required for GDPR Art. 17 right to erasure audit)

The most correct state is **both tables on all three environments**.

---

## Post-Phase-1 Target State

| Object | Local | Dev | Prod |
|---|---|---|---|
| `consent_logs` | ✅ (add via 004) | ✅ (add via 004) | ✅ (add via 004) |
| `consent_type` enum | ✅ (add via 004) | ✅ (add via 004) | ✅ (add via 004) |
| `deletion_logs` | ✅ (in baseline) | ✅ (add via 004) | ✅ (in baseline) |
| Tables | 30 | 30 | 30 |
| Enums | 10 | 10 | 10 |

---

## Migration Scope for `004_phase1_environment_alignment.sql`

The forward migration must:

1. **Create `consent_type` enum** (IF NOT EXISTS) — needed by `consent_logs`
2. **Create `consent_logs` table** (IF NOT EXISTS) — with full DDL from archived migration 012
3. **Create `deletion_logs` table** (IF NOT EXISTS) — with DDL matching baseline/prod
4. **Create indexes** on `consent_logs` (user_id, consent_type, accepted_at)
5. **Enable RLS + create policies** on `consent_logs` (4 policies from migration 012)
6. **RLS on `deletion_logs`** is already configured via baseline (prod/local); need to add for dev:
   - Enable RLS
   - Admin-read policy
7. **Grant permissions** matching baseline patterns

All DDL must be idempotent (`IF NOT EXISTS`, `CREATE POLICY ... IF NOT EXISTS` or `DO $$ ... $$` guards).

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner | Status |
|---|---|---|---|---|---|
| G-1 | Dev environment current state for both tables | Need MCP verification | Query dev via `supabase-dev/execute_sql` for table+enum presence | Implementer | Open |
| G-2 | Prod state post-003 for deletion_logs data | Low priority | Check if any rows exist in prod `deletion_logs` | Implementer | Open |
| G-3 | consent_logs INSERT may fail on dev (table exists but migration 012 RLS policies may differ from baseline expectations) | Verify after apply | Compare dev `consent_logs` structure against archived 012 DDL | Implementer | Open |
| G-4 | `078_provider_opening_hours.sql` applied to prod/dev? | Needed for full structural parity beyond F-9 scope | Verify via MCP | Implementer | Deferred (not Phase 1 scope) |

---

## Analysis Recommendations

1. **Operator should confirm both tables on all environments** — the evidence strongly supports option (a) for both Q1 and Q2. No alternative mechanism exists.
2. **After operator confirmation, Implementer creates `004_phase1_environment_alignment.sql`** with idempotent DDL for both tables + enum + RLS + indexes.
3. **Implementer should verify dev state via MCP** (G-1) before applying migration — dev may already have `consent_logs` from the old migration chain, requiring the migration to be purely additive for `deletion_logs` only on dev.
4. **Implementer should verify prod state via MCP** (G-2) to confirm `deletion_logs` structure matches baseline expectation post-003.
5. **Post-migration structural verification**: All three environments must show 30 tables, 10 enums.

---

## Open Questions

None remaining for the Analyst. All unknowns have been converted to L1-proven findings. The remaining gaps (G-1 through G-4) are implementation-phase verification tasks, not analysis unknowns.
