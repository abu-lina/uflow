---
ID: 204
Origin: 204
UUID: f3a8c1e2
Status: Committed
---

# Analysis 204 — Category Label "unnamed" on Near-Me Filter Active

| Field     | Value                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| Session   | S204-category-unnamed-near-filter                                                                             |
| Branch    | session/204-category-unnamed-near-filter                                                                      |
| Repro URL | https://uat.ummahflow.com/providers?near_lat=48.79715464344648&near_lon=9.176673559780046&near_radius=5       |
| Platform  | Mobile (but see Mobile-Only Qualifier below)                                                                  |
| Symptom   | Every provider card displays "unnamed" (or its locale equivalent) as the category badge                       |
| Trigger   | `near_lat` + `near_lon` + `near_radius` query params present                                                  |

## Changelog

| Date (UTC) | Agent   | Change                                                                  |
| ---------- | ------- | ----------------------------------------------------------------------- |
| 2026-08-09 | Analyst | Investigation complete; root cause proven at L1 across three code layers |

---

## Value Statement and Business Objective

The "Near Me" feature helps Muslim users find halal food nearby. A card-level UI regression that replaces every restaurant's cuisine/category name with "unnamed" erodes trust and brand quality at the moment of highest user intent (geo-located food search). Fixing this restores accurate category context for all near-me results.

---

## Objective

Identify the exact code path and data gap that causes the category badge on `ProviderCard` to show `t('search.unnamed')` when the near-me filter is active, despite category names displaying correctly without it.

---

## Context

The providers page has two distinct rendering paths:

| Path          | Trigger                                   | Query mechanism                                         |
| ------------- | ----------------------------------------- | ------------------------------------------------------- |
| **Standard**  | No `near_lat`/`near_lon` params           | `useInfiniteQuery` → `/api/providers/search`            |
| **Near-me**   | `near_lat` + `near_lon` params present    | `useNearMeSearch` → `search_food_near_me` RPC           |

These paths are mutually exclusive. When `nearMeSearch.isNearMeMode === true`, the standard paginated query is **disabled** (`enabled: !nearMeSearch.isNearMeMode`).

---

## Methodology

1. Traced the category label through the UI call stack: `ProvidersContent` → `NearMeResultsGrid` → `ProviderCard`
2. Inspected the `NearMeFoodResult` type and `searchFoodNearMe` service function
3. Read the `search_food_near_me` SQL function (migration 120) directly
4. Compared the SQL join set against the standard search query
5. Verified test coverage for category propagation in the near-me path

---

## Findings

### Finding 1 — SQL RPC returns no category data (L1 Proven)

**File**: `supabase/migrations/120_plan_196_search_food_near_me.sql`

The `search_food_near_me` function joins `public.providers` but NOT `public.categories`. The complete `RETURNS TABLE` declaration is:

```sql
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  provider_images JSONB,
  address_city TEXT,
  opening_hours JSONB,
  location_latitude NUMERIC,
  location_longitude NUMERIC,
  distance_km NUMERIC
)
```

No `category_id`, `category_name_de`, `category_name_en`, or any category join output is present. The `SELECT` in the body sources from `public.locations l JOIN public.providers p` — `public.categories` is never touched.

**Contrast — standard search** (`src/services/providers.ts` line 540–541):
```typescript
'*, category:categories(name_de, name_en, category_images)'
```
The standard Supabase query explicitly joins `categories` and hydrates the `category` field.

---

### Finding 2 — TypeScript interface has no category field (L1 Proven)

**File**: `src/services/providers.ts` lines 27–35

```typescript
export interface NearMeFoodResult {
  provider_id: string;
  provider_name: string;
  provider_images: string | { urls?: string[] } | null;
  address_city: string | null;
  opening_hours: OpeningHours | null;
  location_latitude: number | null;
  location_longitude: number | null;
  distance_km: number;
}
```

No `category`, `category_id`, or any category-related field. The interface faithfully mirrors the RPC output.

---

### Finding 3 — NearMeResultsGrid hardcodes category_id={null} (L1 Proven)

**File**: `src/features/search/components/NearMeResultsGrid.tsx`

The grid iterates `NearMeFoodResult[]` and creates a `ProviderCard` for each entry:

```tsx
<ProviderCard
  address_city={result.address_city}
  ...
  category_id={null}          // hardcoded null — no category_id in NearMeFoodResult
  // no `category` prop passed — undefined at runtime
  ...
  provider_id={result.provider_id}
  provider_name={result.provider_name}
  ...
/>
```

`category_id` is explicitly set to `null`. The `category` prop (the joined object `{ name_de, name_en, category_images }`) is never passed because it does not exist on `NearMeFoodResult`.

---

### Finding 4 — ProviderCard.getCategoryName() falls back to "unnamed" (L1 Proven)

**File**: `src/components/providers/ProviderCard.tsx` lines 180–196

```typescript
const getCategoryName = () => {
  if (!category) return t('search.unnamed');   // ← category is undefined → always hits here
  if (language === 'en') {
    return category.name_en || category.name_de || t('search.unnamed');
  }
  return category.name_de || category.name_en || t('search.unnamed');
};
const categoryName = getCategoryName();
```

Because `category` is `undefined` (not passed by `NearMeResultsGrid`), `!category` is `true` on every near-me result card, and `t('search.unnamed')` is rendered as the badge text.

Translations (`src/translations/`):
- `en.ts` → `"Unnamed"`
- `de.ts` → `"Unbenannt"`
- `ar.ts` → `"بدون اسم"`
- `tr.ts` → `"İsimsiz"`
- `ur.ts` → `"بے نام"`
- `ps.ts` → `"بې نومه"`

---

### Finding 5 — Standard path is unaffected (L1 Proven)

Without near-me params, `ProvidersContent` uses the paginated infinite query which calls `/api/providers/search`. That route ultimately calls `searchProvidersOnly`, which selects:
```
*, category:categories(name_de, name_en, category_images)
```
The joined `category` object is populated on every result, so `getCategoryName()` resolves the correct locale name.

---

### Finding 6 — "Mobile only" qualifier (L2 Observed)

The `category` badge rendered by `ProviderCard` is present on all viewport sizes. The category badge is rendered unconditionally in both `NearMeResultsGrid` and `SearchResultsList`. The "mobile only" qualifier in the bug report most likely reflects where the reporter observed the issue (mobile PWA), not a CSS media-query gate. However:

- The mobile fixed header (`ProvidersPageHeader`, `sm:hidden`) passes `categoryLabel={selectedCategoryLabel}` to `SearchContextBar`
- When near-me is active, `searchResults` is `[]` (standard query disabled), so the first resolution path in `selectedCategoryLabel` finds nothing
- The second path (`categories` query, enabled when `!!category`) only fires if a `?category=` URL param or `selectedCategory` context is set — absent in the reproduction URL
- `SearchContextBar.resolvedSearchTerm` falls back to `sectionLabel` (e.g. "Restaurants"), NOT "unnamed", when `categoryLabel` is null/undefined

Therefore the page-level mobile header is **not** showing "unnamed"; that label is correct. The "unnamed" appears exclusively on the individual card badges — visible on both mobile and desktop.

---

### Finding 7 — No test coverage for category propagation in near-me path (L1 Proven)

**File**: `src/features/search/components/NearMeResultsGrid.test.tsx`

The test file mocks `ProviderCard` entirely and only asserts `provider_name` and `distanceKm`:

```typescript
vi.mock('@/components/providers/ProviderCard', () => ({
  ProviderCard: ({ provider_name, distanceKm }) => (
    <div>{provider_name} — {distanceKm} km</div>
  ),
}));
```

No test verifies that the `category` prop is passed (or absent). The category badge rendering path has zero test coverage for the near-me flow.

---

## Root Cause (L1 Proven)

The `search_food_near_me` SQL RPC was designed to return only the fields needed for distance-ordered results (Plan 196 scope: location, distance, opening hours). It does not join `public.categories`, so no category data flows into `NearMeFoodResult`. `NearMeResultsGrid` cannot pass what it does not have, so every `ProviderCard` receives `category_id={null}` and no `category` prop — triggering the "unnamed" fallback in `getCategoryName()`.

The gap exists at three levels simultaneously:
1. **SQL**: `search_food_near_me` has no `categories` join
2. **Type**: `NearMeFoodResult` has no category fields
3. **Component**: `NearMeResultsGrid` passes `category_id={null}` and omits `category`

---

## System Weaknesses

| # | Layer | Weakness | Risk mechanism |
| - | ----- | -------- | -------------- |
| 1 | SQL | `search_food_near_me` returns a partial provider shape that does not satisfy the full `ProviderCard` rendering contract | Adding new display fields to `ProviderCard` will silently omit them in the near-me path |
| 2 | Type | `NearMeFoodResult` is a disjoint type from `Provider` / `SearchResult` — no shared base type enforces field parity | Compiler cannot warn that `ProviderCard` expected a `category` field that `NearMeFoodResult` lacks |
| 3 | Component | `NearMeResultsGrid` hardcodes `category_id={null}` and leaves optional props absent rather than mapping from enriched results | Any future `ProviderCard` field addition requires a manual audit of `NearMeResultsGrid` |
| 4 | Test | `NearMeResultsGrid.test.tsx` mocks `ProviderCard` to a minimal stub — no assertion that props are correctly forwarded | Category regression could ship undetected again |

---

## Instrumentation Gaps

| # | Gap | Telemetry needed | Level |
| - | --- | ---------------- | ----- |
| 1 | No structured log when `category` prop is absent at render | Log warning when `ProviderCard` renders with `category === undefined` and a non-null `category_id` | Debug (opt-in) |
| 2 | No RPC field coverage assertion | Integration test that verifies `NearMeFoodResult` satisfies a subset type compatible with `ProviderCard` props | Normal (CI gate) |

---

## Analysis Recommendations (Next Steps)

1. **Verify in UAT** that the category badge on near-me cards shows "unnamed" across all supported locales (confirms Finding 4 is the only symptom path).
2. **Trace `search_food_near_me` output** against the `categories` table to confirm a simple join on `p.category_id = c.category_id` is feasible — no NULL-heavy category_id concern on `providers` table should block this.
3. **Assess type strategy**: determine whether to extend `NearMeFoodResult` in-place or introduce a shared base type with `SearchResult` so `ProviderCard` prop satisfaction is compiler-enforced going forward.
4. **Review test strategy**: decide whether `NearMeResultsGrid.test.tsx` should test actual `ProviderCard` prop forwarding (integration) or add a prop-snapshot assertion.

---

## Open Questions

None. Root cause is L1 Proven across SQL, type, and component layers. No hypothesis remains unverified.

---

## Remaining Gaps

| # | Unknown | Status |
| - | ------- | ------ |
| — | — | No unresolved gaps |

All investigation questions raised by the task description are resolved.
