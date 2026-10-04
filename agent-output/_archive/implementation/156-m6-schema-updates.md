---
ID: 156
Origin: 156
UUID: 81297601
Status: Active
---

# M6: Schema Updates — Implementation

## Migration File

**Path**: `supabase/migrations/101_plan_156_auto_enrichment.sql`

### Changes

1. **`pending_enrichments` table** — New queue table for on-creation trigger. Includes `source` column per architect LOW-1 recommendation. Partial index on `(status, created_at)` for efficient polling. RLS enabled with service-role-only grant.

2. **`food_menu.image_url`** — Added nullable `TEXT` column for menu item images from delivery platforms.

3. **`enrichment_run_logs.auto_applied_fields`** — Added `JSONB` column to track field names that were auto-applied during auto-apply mode runs.

4. **`enrichment_run_logs.source_stats`** — Added `JSONB` column for per-source enrichment statistics (per architect recommendation).

### Idempotency

All additions use `IF NOT EXISTS` / `IF NOT EXISTS` patterns so the migration can be re-applied safely.

## Script Changes

**File**: `scripts/enrich-providers.ts`

- `RunStats.sourceStats` field added to interface — builds per-source stats from run metrics at log-write time.
- `writeRunLog()` now includes `auto_applied_fields` (JSON array of field names) and `source_stats` (JSON object with per-source counts) in the insert payload.

## Verification

- Migration number `101` is the next available (after `100_plan_150_category_redesign.sql`).
- All changes are additive (no column drops, no type changes) — no TypeScript type updates needed.
- Migration follows the project naming convention: `NNN_description.sql`.
