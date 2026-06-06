---
ID: 150
Origin: 150
Status: Committed
---

# Architecture Review — Plan 150

**Reviewer**: Architect
**Date**: 2026-06-06
**Plan**: `agent-output/planning/150-category-redesign-plan.md`

---

## Changelog
| Date | Agent | Description |
|------|-------|-------------|
| 2026-06-06 | DevOps | Document closed | Status: Committed |

## Verdict: APPROVED_WITH_CHANGES

1 HIGH and 3 MEDIUM items must be resolved before implementation.

---

## Summary

The plan is well-structured and the core approach (additive categories, flat taxonomy with `category_type` enum, idempotent INSERTs) is architecturally sound. However, the plan contains a factual error about the current `applicable_section` CHECK constraint — Migration 083 (M5a) already replaced `'business'` with `'store'`. The constraint widening step in Migration 1 needs adjustment. Additionally, Migration 5 omits `category_type` for rescoped rows, and the TypeScript service layer isn't prepared for the new column.

---

## Design Review

| Aspect | Verdict |
|--------|---------|
| Schema change (new enum + column) | Sound |
| Flat taxonomy vs hierarchy | Correct choice for current scope |
| `category_type` enum values | Complete coverage of planned taxonomy |
| Additive-only approach | Correct — zero breakage for existing providers |
| Legacy NULL-section preservation | Correct |

The `category_type` enum column is the right approach. Adding a separate metadata column to the flat category model is simpler than adding hierarchy support (`parent_id`, recursive CTEs, adjacency lists) and fully sufficient for the stated goals: UI grouping, search filtering, and future sort ordering. The enum values (`cuisine`, `dish_type`, `dietary`, `meal`, `store_type`) cover the taxonomy cleanly with room for future additions via `ALTER TYPE ... ADD VALUE`.

The decision to keep legacy NULL-section categories (Bildung & Lernen, Sonstiges, etc.) unchanged is correct — they remain accessible to existing providers via `getCategoryById()` and `getCategories()` but won't appear in section-scoped UI dropdowns because `getCategoriesForSection` filters by `applicable_section IN (...)` which excludes NULL.

The additive INSERT pattern (no DELETE, no rename of existing IDs, no provider `category_id` remapping) eliminates the highest-risk category of migration failure: orphaned FK references.

---

## Migration Review

### HIGH-1: Constraint state mismatch with M5a

| | |
|---|---|
| **Severity** | HIGH |
| **Plan ref** | Migration 1, step 3 (lines 88-98) |
| **File** | `supabase/migrations/083_m5a_supertype_unification.sql` (lines 41, 64-65, 70-72) |

**Issue**: The plan assumes the current `applicable_section` CHECK constraint is:

```sql
CHECK (applicable_section IN ('food', 'business', 'ummah', 'all'))
```

This was the **original** constraint from Migration 001. Migration 083 (M5a) already:

1. Dropped this constraint (line 41)
2. Updated all rows from `'business'` → `'store'` (lines 64-65)
3. Recreated the constraint as `('food', 'store', 'ummah', 'all')` (lines 70-72)

The current DB constraint is `('food', 'store', 'ummah', 'all')`, **not** `('food', 'business', 'ummah', 'all')`.

The plan proposes widening to `('food', 'store', 'business', 'ummah', 'all')` — but `'store'` is already present and `'business'` is a dead value (zero rows). The DROP/ADD in Migration 1 step 3 would be a no-op in terms of effective constraint behavior, but the dead `'business'` value adds confusion.

**Recommended fix**: Replace Migration 1 step 3 with either:

Option A (preferred — no-op, declarative intent): Remove the constraint change entirely. The current constraint already allows `'store'`. Add a comment explaining this.

Option B (defensive — re-declare with correct values): Keep the DROP/ADD but use the correct current value set:

```sql
ALTER TABLE public.categories
DROP CONSTRAINT IF EXISTS categories_applicable_section_check;

ALTER TABLE public.categories
ADD CONSTRAINT categories_applicable_section_check
CHECK (applicable_section IN ('food', 'store', 'ummah', 'all'));
```

Do NOT add `'business'` back — it has no rows and no purpose.

---

### MEDIUM-2: Migration 5 omits `category_type` for rescoped rows

| | |
|---|---|
| **Severity** | MEDIUM |
| **Plan ref** | Migration 5 (lines 244-251) |
| **File** | Plan section "Store — Store Types" table (lines 164-166) |

**Issue**: Migration 5 rescopes Gesundheit & Sport and Kleidung & Mode from `applicable_section = NULL` to `'store'`. The plan's own taxonomy table assigns these categories `category_type = 'store_type'`, but the UPDATE statement only sets `applicable_section` and `updated_at`. After this migration, these categories will have NULL `category_type` despite clearly being store-type categories.

**Recommended fix**: Add `category_type = 'store_type'` to the UPDATE:

```sql
UPDATE public.categories
SET applicable_section = 'store',
    category_type = 'store_type'::public.category_type_enum,
    updated_at = now()
WHERE category_id IN ('df8e549d-54c4-48ef-8e0b-c5a6646fcb7d'::uuid, '49563bf0-6962-4fd8-9147-5e68e9310eb1'::uuid);
```

---

### MEDIUM-3: TypeScript `Category` interface missing `category_type`

| | |
|---|---|
| **Severity** | MEDIUM |
| **Plan ref** | Phase 2 — UI Grouping (lines 258-277) |
| **File** | `src/services/categories.ts` (lines 3-14) |

**Issue**: The `Category` interface in the service layer has no `category_type` field. The plan defers this to Phase 2 (UI grouping), but the new column will exist in the DB the moment Migration 1 runs in Phase 1. All `supabase.from('categories').select('*')` queries will start returning `category_type` in the response, but TypeScript won't know about it. This means:

- Phase 1 migrations will be applied to a live DB with an untyped column
- Any TS code accessing category data between Phase 1 and Phase 2 will have `category_type: undefined` in the type
- The `getCategoriesForSection`, `getProviderCategories`, and `fetchCategoriesBySection` functions all return `Category[]` — they'll silently drop the new column from the type

**Recommended fix**: Add `category_type` to the `Category` interface in Phase 1, not Phase 2. The type is already imported in `categories.ts`:

```typescript
export interface Category {
  id: string;
  category_id: string;
  name_de: string;
  name_en?: string;
  description_de?: string;
  description_en?: string;
  category_images?: Record<string, unknown>;
  applicable_section: 'food' | 'store' | 'business' | 'ummah' | 'all';
  category_type?: 'cuisine' | 'dish_type' | 'dietary' | 'meal' | 'store_type';
  created_at: string;
  updated_at: string;
}
```

---

### MEDIUM-4: `PROVIDER_CATEGORY_SECTION_SCOPES` still references `'business'`

| | |
|---|---|
| **Severity** | MEDIUM |
| **Plan ref** | No mention |
| **File** | `src/services/categories.ts` (line 16) |

**Issue**: The constant `PROVIDER_CATEGORY_SECTION_SCOPES = ['food', 'store', 'business', 'all']` includes `'business'`, which after M5a no longer exists as a valid `applicable_section` value in the DB. The `getCategoriesForSection` function normalizes `'business'` → `'store'`, so runtime behavior is correct. But:

- The constant is misleading — `'business'` will never match any row
- If new code uses this constant without going through `getCategoriesForSection`, it will silently include a dead filter value
- TypeScript can't catch this because the type union still includes `'business'`

**Recommended fix**: Clean up the constant to remove `'business'`:

```typescript
export const PROVIDER_CATEGORY_SECTION_SCOPES = ['food', 'store', 'all'] as const;
```

Also, the `Category.applicable_section` type can be narrowed to `'food' | 'store' | 'ummah' | 'all' | null` (removing `'business'`). Keep `null` for legacy unscoped categories.

---

## Potential Issues

### UUID generation for 46 new categories

38 + 8 = 46 new UUIDs need to be hardcoded in the migration INSERTs. The plan says "generate fresh UUIDs" but doesn't specify the mechanism. Using `gen_random_uuid()` in the INSERT means the IDs are non-deterministic across environments. The existing pattern (Migration 097) uses hardcoded UUIDs, which is the right approach for migration idempotency. **Recommendation**: Generate all 46 UUIDs offline (e.g., `uuidgen` or `gen_random_uuid()`) and hardcode them in the migration, with a comment block listing them for traceability.

### `Indisch-Pakistanisch` split — no migration action needed

The plan correctly keeps the legacy merged category and adds two new ones. No provider loses its current category. Editors reassign manually. This is the right approach — automatic remapping would risk wrong assignments (a Pakistani restaurant could be assigned "Indisch" by an imperfect heuristic).

### Category images for new categories

The existing pattern stores images in `category_images` JSONB. The plan notes new categories can be added without images initially. This is fine — the column is nullable and the UI handles missing images gracefully.

### No index concerns

The `category_type` column is on a table with ~60 rows. No index is needed. The existing partial index `idx_categories_applicable_section` (on `applicable_section WHERE NOT NULL`) remains sufficient for the primary query pattern (filtering by section). The new column is queried only for GROUP BY / display ordering in UI dropdowns, which operates on in-memory result sets.

### `'business'` in existing TypeScript types is harmless but stale

Several functions in `categories.ts` (and likely consumer components) reference `'business'` in the `applicable_section` union type. This is technically wider than the DB constraint allows, but since no row has `applicable_section = 'business'` and the type narrowing is more permissive than reality, no runtime code path can produce a value that violates the DB constraint. Safe to leave, but MEDIUM-4 recommends cleanup.

---

## Recommendations

### Required before implementation

1. **HIGH-1: Fix Migration 1 constraint to match current schema** — The current constraint already has `'store'`. Either remove the constraint change entirely (it's a no-op), or re-declare it with the correct values excluding dead `'business'`.

2. **MEDIUM-2: Add `category_type` to Migration 5 UPDATE** — Gesundheit & Sport and Kleidung & Mode should get `category_type = 'store_type'` when rescoped.

3. **MEDIUM-3: Add `category_type` to TypeScript `Category` interface** — Do this in Phase 1, not Phase 2. The column exists in the DB from the moment Migration 1 runs.

4. **MEDIUM-4: Clean up `PROVIDER_CATEGORY_SECTION_SCOPES`** — Remove the stale `'business'` value and narrow the `applicable_section` type.

### Nice-to-have

5. **Generate and track all 46 UUIDs upfront** — Hardcode in the migration with a comment block. Use deterministic UUIDs (v4) generated offline.
6. **Remove `'business'` from the constraint entirely if Option B is chosen** — Dead values in CHECK constraints add long-term confusion.
7. **Verify `getCategoriesForSection` handles `'store'` correctly** — The function maps `'business'` → `'store'`, which is a stale normalization path from M5a. After the cleanup, `'business'` will never be passed as input, so the normalization is dead code — can be removed.

---

## Positive Observations

1. **Correct additive approach** — No DELETE, no provider `category_id` remapping. Zero FK breakage risk.
2. **Proven idempotent INSERT pattern** — Following Migration 097's `WHERE NOT EXISTS` pattern with UUID + name dedup guards.
3. **Correct legacy preservation** — NULL-section categories (Bildung & Lernen, Sonstiges, etc.) unchanged. Existing providers unaffected.
4. **No premature multi-category** — Deferring `provider_categories` junction table to a follow-up avoids scope creep and a larger migration.
5. **No index needed** — Correctly omitted. Categories table is micro-sized (~60 rows).
6. **Balkan rename is safe** — Single-row UPDATE by UUID, no cascade.
