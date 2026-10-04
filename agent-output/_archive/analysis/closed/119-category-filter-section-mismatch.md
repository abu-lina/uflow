---
ID: 119
Origin: 119
UUID: b7c3e2f1
Status: Planned
---

# 119 — Category Filter Shows "Gesundheit & Sport" Under Food Section

## Changelog

| Date       | Agent   | Action                                       |
|------------|---------|----------------------------------------------|
| 2026-05-02 | Analyst | Created. Root cause identified at L1 Proven. |

## Value Statement & Objective

**Business impact**: Users browsing the Food section see an irrelevant category ("Gesundheit & Sport") that belongs to Stores. This degrades trust in category accuracy and can confuse users navigating the platform.

**Objective**: Identify why "Gesundheit & Sport" appears under the Food section tab despite the user confirming it should only belong to Stores in the database.

## Context

- **Reporter**: Product owner via UAT testing on `uat.ummahflow.com`
- **Symptom**: Selecting the "Food" section tab on the home page displays "Gesundheit & Sport" in the category gallery
- **User assertion**: "in the db it is clearly applied to stores"
- **Scope**: Home page category gallery (`CategoryGallerySection`) and results page category display

## Methodology

1. **Upstream Tracing**: Traced the data flow from UI component → service function → database query
2. **Code Inspection**: Read `CategoryGallerySection`, `fetchCategoriesBySection`, `fetchUsedCategories`, `getCategoriesForSection` to understand section-aware category filtering
3. **Live API Verification**: Queried `https://uat.ummahflow.com/api/providers/search?section=food&pageSize=50&page=0` to inspect actual provider data on UAT
4. **Seed Data Cross-reference**: Checked `supabase/migrations/002_seed.sql` for category `applicable_section` values

## Findings

### F1 — Data Integrity Issue (L1 Proven)

**Provider "Natureweg"** (Berlin) has inconsistent `listing_type` / `category_id`:

| Field | Value |
|-------|-------|
| `provider_id` | `93b526cd-84ed-4c88-93fa-432a3e7940ac` |
| `provider_name` | Natureweg |
| `listing_type` | `food` |
| `category_id` | `df8e549d-54c4-48ef-8e0b-c5a6646fcb7d` |
| Category name | **Gesundheit & Sport** (Health & Sports) |

**Evidence**: Live UAT API response (`/api/providers/search?section=food`) returns this provider with `listing_type:"food"` and `category.name_de:"Gesundheit & Sport"`.

This is the direct cause: `fetchCategoriesBySection('food')` queries providers WHERE `listing_type = 'food'`, collects their `category_id`s, and finds `df8e549d-...` (Gesundheit & Sport) because Natureweg is incorrectly classified as a food provider with a store category.

### F2 — Missing `applicable_section` Guardrail in `fetchCategoriesBySection` (L1 Proven)

**File**: `src/services/categories.ts`, lines 80–130

`fetchCategoriesBySection(section)` has a two-step query:
1. Get `category_id`s from providers WHERE `listing_type = section`
2. Fetch categories WHERE `category_id IN (those IDs)`

Step 2 does **NOT** filter by `categories.applicable_section`. This means any category referenced by a provider with the matching `listing_type` will appear, regardless of whether the category is scoped to that section.

**Contrast**: `getCategoriesForSection(section)` (line 237) correctly uses `.in('applicable_section', [section, 'all'])` — but this function is used for provider creation forms, not for the category gallery.

**Pre-fix expression** (step 2 in `fetchCategoriesBySection`):
```typescript
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .in('category_id', categoryIds)         // ← no applicable_section filter
  .returns<Category[]>();
```

**Post-fix expression** (add applicable_section guard):
```typescript
const sectionForDb = section === 'store' ? 'business' : section;
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .in('category_id', categoryIds)
  .in('applicable_section', [sectionForDb, 'all'])  // ← guardrail
  .returns<Category[]>();
```

**Note**: Section type mapping is required — app uses `'store'` but DB CHECK constraint uses `'business'`.

### F3 — `CategoryFilter` Component is Dead Code (L1 Proven)

**File**: `src/components/providers/CategoryFilter.tsx`

This component calls `fetchUsedCategories()` (no section filtering) and has **zero imports** anywhere in the codebase. It is dead code that should be removed to avoid confusion.

### F4 — `applicable_section` Column Status (L1 Proven)

- **Seed data**: All original categories have `applicable_section = NULL`
- **Migration 080_m2**: Backfills NULLs to `'all'`, adds `NOT NULL DEFAULT 'all'`
- **New food categories** (added in seed): Correctly set to `'food'` (Arabisch, Türkisch, Nordafrikanisch, etc.)
- **"Gesundheit & Sport"**: Has `applicable_section = NULL` in seed → backfilled to `'all'` on UAT

This means even with the guardrail fix (F2), "Gesundheit & Sport" would still appear under Food because its `applicable_section` is `'all'` (not `'business'`). **Both the data fix (F1) and the guardrail fix (F2) are needed**, plus updating the `applicable_section` for legacy categories that should be section-specific.

## Root Cause Summary

| # | Cause | Confidence | Fix Required |
|---|-------|------------|--------------|
| RC-1 | Provider "Natureweg" has `listing_type='food'` but `category_id` pointing to "Gesundheit & Sport" (a store category) | L1 Proven | Data fix: correct listing_type or category_id |
| RC-2 | `fetchCategoriesBySection()` does not use `applicable_section` filter | L1 Proven | Code fix: add guardrail filter |
| RC-3 | "Gesundheit & Sport" has `applicable_section='all'` instead of `'business'` | L1 Proven | Data fix: update applicable_section for legacy categories |

**All three must be addressed** for a complete fix. RC-1 alone would fix the immediate symptom. RC-2 + RC-3 prevent recurrence for any future data inconsistencies.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Are there other providers with mismatched `listing_type` / `category_id`? | No DB access from analysis | Run query: `SELECT p.provider_name, p.listing_type, c.name_de, c.applicable_section FROM providers p JOIN categories c ON p.category_id = c.category_id WHERE p.listing_type != c.applicable_section AND c.applicable_section != 'all'` | Planner/Implementer |
| 2 | Which legacy categories need `applicable_section` updated from `'all'` to a specific section? | No DB access | Audit all categories where `applicable_section = 'all'` and determine correct scoping | Planner |
| 3 | Should `CategoryFilter.tsx` (dead code) be removed? | None | Confirm no plans reference it, then delete | Planner |

## Analysis Recommendations

1. **Verify data scope**: Run the query in Gap #1 to identify all providers with section/category mismatches before applying the code fix
2. **Audit `applicable_section` values**: Check which legacy categories (currently `'all'`) should be scoped to a specific section
3. **Test the guardrail**: After adding `applicable_section` filter to `fetchCategoriesBySection`, verify that no valid categories are accidentally hidden (especially categories with `applicable_section = 'all'`)
4. **Remove dead code**: `CategoryFilter.tsx` has zero imports — confirm and remove
