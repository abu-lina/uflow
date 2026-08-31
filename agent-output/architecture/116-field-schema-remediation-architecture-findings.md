---
ID: 116
Origin: 118
UUID: e7a3f1c9
Status: RESOLVED
---

# Architecture Findings — Plan 116: Field-Level Schema Remediation

**Artifact**: `agent-output/planning/116-field-schema-remediation-plan.md`
**Source**: `agent-output/architecture/118-field-level-schema-review.md`
**Date**: 2026-05-01T23:00Z

## Changelog

| Date              | Context                        | Summary                                                                                   |
| ----------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| 2026-05-01T23:00Z | Pre-implementation audit       | Full cross-reference of Plan 116 (7 milestones, 28 findings) against actual migration chain (001–078). 7 conflicts identified: 1 CRITICAL, 3 HIGH, 2 MEDIUM, 1 LOW. |
| 2026-05-01T23:30Z | Planner R2 revision            | All 7 findings addressed in Plan 116 R2 revision. Status → RESOLVED. |

---

## Trigger

Implementer began M-1 and immediately discovered FL-1 and FL-2 UNIQUE indexes already exist in migration 006. Owner requested full architect review for additional conflicts before implementation proceeds.

---

## Methodology

Systematic cross-reference of every Plan 116 task against:
- All 12 migration files (`001_baseline.sql` through `078_provider_opening_hours.sql`)
- Baseline schema objects (CHECK constraints, partial indexes, RLS policies, function bodies)
- Architecture doc 118 changelog and finding specifications

---

## Findings

### AF-1 · CRITICAL — M-5 Enum Rename Breaks Live CHECK Constraints + Partial Index

| Field | Value |
|---|---|
| Milestone | M-5 (Supertype Unification + Enum Rename) |
| Issue | `ALTER TYPE listing_type_enum RENAME VALUE 'business' TO 'store'` will break **3 live schema objects** that reference `'business'::listing_type_enum` in their expression text. PostgreSQL stores CHECK constraint and partial index predicate text as strings. After RENAME VALUE, `'business'` is no longer a valid enum label, causing parse failures on any subsequent row validation or index maintenance. |
| Affected objects | 1. `providers_listing_type_business_only_ck` CHECK — `listing_type = 'business'::listing_type_enum OR (no_gambling = FALSE AND solidarity_pricing = FALSE)` (migration 0061) |
| | 2. `idx_providers_business_muslim_owned` partial index — `WHERE listing_type = 'business'::listing_type_enum` (baseline) |
| | 3. `categories_applicable_section_check` CHECK — `applicable_section IN ('food', 'business', 'ummah', 'all')` (baseline; TEXT not enum, but values still need updating for semantic consistency) |
| Impact | **CRITICAL** — After `RENAME VALUE`, any INSERT/UPDATE to `providers` that triggers CHECK re-evaluation will fail. The partial index becomes invalid. This is a **production-breaking** migration if not handled in the correct order. |
| Root cause | Plan M-5 only addresses enum ALTER and app code. It does not enumerate dependent schema objects that embed the old enum label in expression text. |
| Required fix | M-5 migration must: (1) DROP `providers_listing_type_business_only_ck`, (2) DROP INDEX `idx_providers_business_muslim_owned`, (3) perform `ALTER TYPE RENAME VALUE`, (4) recreate CHECK as `listing_type = 'store'::listing_type_enum OR ...`, (5) recreate index as `WHERE listing_type = 'store'::listing_type_enum`, (6) UPDATE `categories SET applicable_section = 'store' WHERE applicable_section = 'business'`, (7) DROP and recreate `categories_applicable_section_check` with `'store'` replacing `'business'`. All within a single transaction (except `CREATE INDEX CONCURRENTLY` which cannot run in a transaction). |
| Cross-milestone interaction | M-3 plans to drop and recreate `providers_listing_type_business_only_ck` (with modified column list). If M-3 runs first, the recreated CHECK **still references `'business'::listing_type_enum`** and will break in M-5. M-5 must explicitly handle whatever CHECK exists at that point — not assume M-3 left it clean. |

---

### AF-2 · HIGH — M-1 Task 1 (FL-1 + FL-2) Already Implemented

| Field | Value |
|---|---|
| Milestone | M-1 (Quick Wins) |
| Issue | FL-1 and FL-2 UNIQUE partial indexes on `bookmarks` and `provider_badges` **already exist** in migration `006_phase3_referential_integrity.sql`. |
| Evidence | Migration 006 creates: `idx_bookmarks_user_provider_unique`, `idx_bookmarks_user_community_service_unique`, `idx_provider_badges_provider_badge_type_unique`, `idx_provider_badges_community_service_badge_type_unique` — matching exactly the FL-1 and FL-2 specifications. |
| Impact | M-1 Task 1 would fail at runtime with "index already exists" (unless using `IF NOT EXISTS`). The dedup query is also unnecessary if the indexes have been enforcing uniqueness since migration 006. |
| Required fix | Remove FL-1 + FL-2 from M-1 entirely. They are **already resolved**. Verify no duplicates exist in prod (they can't, since the UNIQUE indexes enforce this). |

---

### AF-3 · HIGH — M-3 CHECK Constraint Conflict with M-5 Column Drops

| Field | Value |
|---|---|
| Milestone | M-3 → M-5 interaction |
| Issue | M-3 replaces `providers_listing_type_business_only_ck` with `CHECK (listing_type = 'business' OR no_gambling = FALSE)`. M-5 then: (a) renames `'business'` → `'store'` (breaking the CHECK per AF-1), and (b) drops `no_gambling` from `providers` into `store_providers` extension table. The M-3-created CHECK references BOTH a soon-to-be-renamed enum value AND a soon-to-be-dropped column. |
| Impact | M-5 migration will fail when trying to drop `no_gambling` because the CHECK constraint still references it. Even if the column drop is ordered after the enum rename, the CHECK is invalid at that point anyway (AF-1). |
| Required fix | Two options: (a) M-3 should NOT recreate the business_only CHECK — just drop it. M-5 creates the correct store-scoped CHECK on `store_providers` extension table. Or (b) M-5 explicitly drops whatever business_only CHECK exists before proceeding. Option (a) is cleaner — the section-scoped CHECKs should move to extension tables in M-5, not live on the `providers` supertype. |
| Architectural recommendation | **Section-scoped CHECK constraints belong on extension tables, not the supertype.** After M-5, the `providers` table is a supertype with shared columns. `no_gambling` belongs exclusively on `store_providers`. The CHECK guarding it belongs there too. The food_only CHECK (`no_alcohol`, `no_pork`, `halal_level`) should move to `food_providers`. This is a design improvement, not just a conflict fix. |

---

### AF-4 · MEDIUM — FL-3 (`applicable_to` Column Drop) Missing from Plan

| Field | Value |
|---|---|
| Milestone | None (missing from all milestones) |
| Issue | The architecture doc 118 changelog says "FL-3 implemented" (2026-05-01). App code is clean — no references to `applicable_to` remain in `src/`. However, **no migration drops the column**. The `applicable_to TEXT[]` column and its GIN index (`idx_categories_applicable_to`) still exist in the schema. The plan does not address this. |
| Evidence | `grep -rn "applicable_to" src/` returns no results. `grep "applicable_to" supabase/migrations/001_baseline.sql` still shows the column definition and index. No migration in 002–078 drops it. |
| Impact | Dead column in schema. Not blocking but violates the "schema should be self-documenting" principle stated in the plan's value statement. |
| Required fix | Add a task (fits in M-1 or M-2): `ALTER TABLE categories DROP COLUMN applicable_to; DROP INDEX IF EXISTS idx_categories_applicable_to;` |

---

### AF-5 · MEDIUM — FL-17 (`cities.trust_level`) Range Mismatch: Plan Says 0-10, Baseline Says 0-100

| Field | Value |
|---|---|
| Milestone | M-1 Task 4 |
| Issue | The plan specifies `CHECK (trust_level >= 0 AND trust_level <= 10)`. The baseline schema comment says: `'Calculated trust level (0-100) based on reviews and verification'`. The FL-17 finding in architecture doc 118 hedges: "CHECK (trust_level >= 0 AND trust_level <= 10) (or whatever the actual range should be)." |
| Impact | If the actual range is 0-100 and the CHECK enforces 0-10, existing rows or future calculations exceeding 10 would violate the constraint. The migration would fail on existing data if any `trust_level > 10`. |
| Required fix | Implementer MUST audit live `cities.trust_level` values before adding the CHECK. Use `SELECT MIN(trust_level), MAX(trust_level) FROM cities;` to determine the actual range. Set the CHECK to match actual semantics (likely 0-100 per the baseline comment). |

---

### AF-6 · LOW — Architecture Doc 118 Claims FL-3 "Implemented" but Schema Column Persists

| Field | Value |
|---|---|
| Document | `118-field-level-schema-review.md` changelog row "2026-05-01: FL-3 implemented" |
| Issue | FL-3 was partially implemented (app code cleaned) but the schema migration was never created. The architecture doc's changelog overstates the status. |
| Impact | Documentation inaccuracy. Future readers may assume the column is gone. |
| Required fix | Update 118 changelog to: "FL-3 app code implemented; schema migration (DROP COLUMN) pending in Plan 116 M-1." |

---

## Summary of Plan 116 M-1 Task Correctness

| M-1 Task | Plan Says | Actual Status | Verdict |
|---|---|---|---|
| Task 1: FL-1 + FL-2 (4 partial UNIQUE indexes) | Create indexes + dedup | **Already exist** (migration 006) | ❌ REMOVE — already done |
| Task 2: FL-15 (Drop 3 UNIQUE constraints) | Drop 3 constraints | Constraints still exist; plan correctly excludes CS one | ✅ Correct |
| Task 3: FL-14 (enrichment FK) | Add FK | No FK exists | ✅ Correct |
| Task 4: FL-17 (cities.trust_level CHECK) | CHECK 0-10 | Comment says 0-100; no CHECK exists | ⚠️ Range needs audit |
| Task 4: FL-22 (price_currency CHECK) | CHECK IN ('EUR') | No CHECK exists | ✅ Correct |
| Task 5: FL-18 (waitlist.is_provider NOT NULL) | Backfill + NOT NULL | Column is nullable, no default | ✅ Correct |
| — | — | `applicable_to` column still exists | ❌ MISSING — add DROP COLUMN |

---

## Cross-Milestone Dependency Issues

| Interaction | Risk | Recommendation |
|---|---|---|
| M-3 creates CHECK with `'business'` → M-5 renames enum | CHECK breaks | M-3 should only DROP the old CHECK, not recreate it. Section-scoped CHECKs move to extension tables in M-5. |
| M-3 creates CHECK referencing `no_gambling` → M-5 drops `no_gambling` from `providers` | Column-reference breaks | Same fix: M-3 drops CHECK, M-5 creates new CHECK on `store_providers`. |
| M-5 renames enum → `idx_providers_business_muslim_owned` predicate invalid | Index breaks | M-5 must DROP + recreate the index. |
| M-5 renames enum → `categories_applicable_section_check` stale | Semantic inconsistency | M-5 must DROP + recreate the CHECK with `'store'`. |

---

## Verdict

**APPROVED_WITH_CHANGES** — Plan 116 is architecturally sound in structure and intent. However, 1 CRITICAL and 3 HIGH findings must be addressed before implementation proceeds. The CRITICAL finding (AF-1) would cause a production-breaking migration.

### Required Changes Before Implementation

1. **AF-1 (CRITICAL)**: M-5 must explicitly enumerate and handle all schema objects referencing `'business'` enum label — DROP before RENAME, recreate after.
2. **AF-2 (HIGH)**: Remove FL-1 + FL-2 from M-1. Already implemented.
3. **AF-3 (HIGH)**: Revise M-3 to only DROP section-scoped CHECKs, not recreate them. Section-scoped constraints belong on extension tables in M-5.
4. **AF-7 (HIGH)**: Update M-5 `'business'` → `'store'` inventory: 33 unique files (not ~30), 5 schema objects, 6 translation key references, URL backward-compat mapping needed (`?section=business` → `'store'`).
5. **AF-4 (MEDIUM)**: Add `DROP COLUMN applicable_to` + `DROP INDEX idx_categories_applicable_to` to M-1.
6. **AF-5 (MEDIUM)**: Audit live `cities.trust_level` values before committing to CHECK range.

---

## Architectural Recommendation: Section-Scoped CHECKs on Extension Tables

Post-M-5, the correct design is:

```
providers (supertype)
  ├── food_providers (1:1)
  │     CHECK: halal_level IS NOT NULL (if food requires halal classification)
  │     Columns: no_alcohol, no_pork, halal_level
  │
  ├── store_providers (1:1)
  │     CHECK: (no_gambling is valid boolean)
  │     Columns: no_gambling
  │
  └── ummah_providers (1:1)
        Columns: (TBD from community_services migration)
```

The current `providers_listing_type_food_only_ck`, `business_only_ck`, `ummah_only_ck` constraints are workarounds for the monolithic table design. Once extension tables exist, these constraints become structural enforcement via FK + column placement, not CHECK constraints on a supertype.

**Action**: M-5 should DROP all three section-scoped CHECKs from `providers` (not just the business one). The extension table design replaces them structurally.

---

## AF-7 · HIGH — M-5 `'business'` → `'store'` Rename Inventory Incomplete

The plan (M-5 tasks 11 + 14) estimates "~30 files" for the `'business'` → `'store'` app code rename. The actual inventory is larger and spans more layers than documented.

### Complete `'business'` → `'store'` Rename Inventory

#### Schema Layer (M-5 migration must handle)

| # | Object | Type | Current | Required |
|---|--------|------|---------|----------|
| 1 | `listing_type_enum` | ENUM value | `'business'` | `ALTER TYPE RENAME VALUE 'business' TO 'store'` |
| 2 | `providers_listing_type_business_only_ck` | CHECK constraint | `listing_type = 'business'::listing_type_enum OR ...` | DROP before RENAME, recreate on `store_providers` extension table (see AF-1/AF-3) |
| 3 | `idx_providers_business_muslim_owned` | Partial index | `WHERE listing_type = 'business'::listing_type_enum` | DROP before RENAME, recreate as `idx_providers_store_muslim_owned WHERE listing_type = 'store'::listing_type_enum` |
| 4 | `categories_applicable_section_check` | CHECK constraint (TEXT) | `'business'::text` in array | DROP, UPDATE data (`'business'` → `'store'`), recreate CHECK with `'store'` |
| 5 | `categories.applicable_section` | Row data | 3 rows with `'business'` | `UPDATE categories SET applicable_section = 'store' WHERE applicable_section = 'business'` |

#### App Code Layer — 33 Unique Files

**Type definitions** (2 files — both must change simultaneously):
- `src/config/sectionFilters.ts` line 14: `type Section = 'food' | 'ummah' | 'business'` → `'store'`
- `src/providers/search-provider.tsx` line 6: `type Section = 'food' | 'ummah' | 'business'` → `'store'`
- `src/types/supabase.ts` line 11: `applicable_section: 'food' | 'business' | 'ummah' | 'all'` → `'store'`
- `src/components/providers/ProviderEditForm.tsx` line 55: `listingType: 'food' | 'business' | 'ummah'` → `'store'`

**Config / filter logic** (4 files):
- `src/config/sectionFilters.ts`: `SECTION_FILTER_CONFIG.business` key → `.store`, `inferSectionFromCategory()` returns, `resolveSectionFromSearchParams()` validation, `getResultsPathForSection()` mapping
- `src/features/search/constants/sectionIconRenderers.tsx`: `SECTION_ORDER` array
- `src/lib/validations/adminSchemas.ts`
- `src/services/admin/providerEdit.ts`

**Route pages** (5 files):
- `src/app/(public)/stores/page.tsx` line 11: `section: 'business'` → `'store'`
- `src/app/(public)/providers/page.tsx` line 41: `sectionParam === 'business'` → `'store'`
- `src/app/(public)/search/page.tsx`: section validation
- `src/app/api/providers/search/route.ts` line 74: `sectionParam === 'business'` → `'store'`
- Category edit pages (2 files): `.in('applicable_section', ['food', 'business', 'all'])` → `'store'`

**Components** (4 files):
- `SectionSelector.tsx`, `FilterSection.tsx`, `SearchContextBar.tsx`, `HomeSearchBar.tsx`
- `ProviderEditForm.tsx`: `<option value="business">` → `<option value="store">`

**Services** (4 files):
- `src/services/providers.ts`, `src/services/provider-catalog.ts`, `src/services/categories.ts`, `src/providers/search-provider.tsx`

**Translation keys** (5 language files):
- `src/translations/{de,en,ar,ps,tr,ur}.ts`: `sectionBusiness` key — the key NAME doesn't need changing (it's a translation key, not a value), but the display text may need updating (currently shows "Business" in English; should be "Stores" — which `sections.stores` already provides). Consider deprecating `sectionBusiness` in favor of `sections.stores` for consistency.

**Test files** (11 files):
- Tests reference `'business'` in mock data, assertions, type parameters, and URL expectations
- Critical: tests asserting `section=business` in URLs must update to `section=store`

#### NOT in scope (keep as-is)

| Item | Reason |
|---|---|
| `public/manifest.json` `"business"` | W3C PWA manifest category — standard vocabulary, not our domain |
| `src/app/api/manifest/route.ts` `'business'` | Same — W3C manifest category |
| `src/translations/*.ts` `"onlineBusiness"` key | UI label "Online business" — natural language, not an enum value |
| `providers.provider_owner_id` comment "business owner" | Natural language comment |

#### URL Backward Compatibility Concern

The plan does NOT address URL backward compatibility. Currently:
- `/search?section=business` is a valid URL
- After rename, `?section=store` will be the canonical value
- Old URLs with `?section=business` will hit the `else` branch in `resolveSectionFromSearchParams()` and fall through to category-based inference or default

**Recommendation**: Add a backward-compat mapping in `resolveSectionFromSearchParams()`: `if (sectionParam === 'business') return 'store';` — ensures bookmarked/shared URLs continue working.

---

## Updated Findings Count

| # | Severity | Finding |
|---|----------|---------|
| AF-1 | CRITICAL | M-5 enum RENAME breaks live CHECK + index |
| AF-2 | HIGH | FL-1 + FL-2 already implemented |
| AF-3 | HIGH | M-3 CHECK conflicts with M-5 column drops |
| AF-7 | HIGH | `'business'` → `'store'` rename inventory incomplete (33 files, 5 schema objects, URL compat gap) |
| AF-4 | MEDIUM | `applicable_to` column DROP missing |
| AF-5 | MEDIUM | `cities.trust_level` range mismatch |
| AF-6 | LOW | Architecture doc 118 claims FL-3 "implemented" |
