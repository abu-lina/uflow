---
ID: 45
Origin: 45
UUID: 3f9a2c1d
Status: Released
---

# 045 – Providers Category Filter: Wrong Results for "Gesundheit & Sport"

**Changelog**
| Rev | Date | Author | Notes |
|-----|------|--------|-------|
| 1 | 2026-03-19 | Analyst | Initial investigation |
| 2 | 2026-03-19 | UAT | UAT Approved - implementation delivers stated value; approved for v0.8.4 release |

---

## Value Statement and Business Objective

The `/providers` page category filter is a primary discovery mechanism. When the filter returns wrong results, users cannot find relevant providers. The "Gesundheit & Sport" category (`df8e549d-54c4-48ef-8e0b-c5a6646fcb7d`) is broken for at least some navigation paths, reducing trust and discoverability.

---

## Context

**Bug URL:** `https://uat.ummahflow.com/providers?category=df8e549d-54c4-48ef-8e0b-c5a6646fcb7d`  
**Category:** "Gesundheit & Sport"  
**Symptom:** Wrong results returned when navigating via the URL with the category query param.

---

## Methodology

- Read-only trace of: `ProvidersContent.tsx` → `fetchProvidersFromAPI` → `GET /api/providers/search` → `searchProvidersAndCommunityServices` → `searchProviders`
- Inspected context provider (`SearchProvider`) initialization  
- Verified `getSearchStrategy` handling for all locales  
- Searched all provider-related files for `console.log` and debug artifacts

---

## Findings

### BUG-1 (Verified): Stale Context Overrides URL Param

**File:** `src/app/(public)/providers/ProvidersContent.tsx`

```typescript
// Line ~112
const category = selectedCategory ?? (searchParams.get('category') || null);
```

The `??` (nullish coalescing) operator gives `selectedCategory` from `SearchProvider` context **higher priority** than the URL param. The context persists for the lifetime of the browser session (it lives in the layout, not destroyed on page navigation).

**Reproduction path:**
1. User is on `/providers` and clicks category chip "Bildung" → `setSelectedCategory('bildung-uuid')` is called; URL = `?category=bildung-uuid`
2. User navigates to `/providers?category=df8e549d-...` (Gesundheit & Sport) via a link/bookmark/back-button
3. At this point: `selectedCategory = 'bildung-uuid'` (stale), `searchParams.get('category') = 'df8e549d-...'`
4. `category = 'bildung-uuid' ?? 'df8e549d-...'` = **`'bildung-uuid'`** ← WRONG
5. Query key and query function both use `'bildung-uuid'`; results show Bildung providers, not Gesundheit & Sport

The `useEffect` sync does NOT fix this because:
```typescript
useEffect(() => {
  if (category !== selectedCategory) { setSelectedCategory(category); }
  // category = 'bildung-uuid', selectedCategory = 'bildung-uuid' → no-op
}, [category, ...]);
```
It's a self-reinforcing cycle.

**Confidence: Verified** — deterministic code path, no environmental variable.

---

### BUG-2 (Verified): Localized "All" String Bypasses Strategy Check

**File:** `src/app/(public)/providers/ProvidersContent.tsx`

```typescript
// Line ~120–122
queryKey: ['providers', query, category || t('search.all'), location],
queryFn: ({ pageParam = 0 }) =>
  fetchProvidersFromAPI(query, category || t('search.all'), location, pageParam, PAGE_SIZE),
```

When `category = null` (no filter selected), `t('search.all')` is passed as the category value. Observed locale values:

| Locale | `t('search.all')` |
|--------|-------------------|
| de     | `"Alle"` ✅ handled |
| en     | `"All"` ✅ handled |
| ar     | `"الكل"` ❌ NOT handled |
| tr     | `"Tümü"` ❌ NOT handled |
| ur     | `"سب"` ❌ NOT handled |
| ps     | `"ټول"` ❌ NOT handled |

`getSearchStrategy` in `services/providers.ts` only recognizes `'Alle'` and `'All'`. For Arabic, Turkish, Urdu, and Pashto users:
- `getSearchStrategy('الكل')` → `'providers_only'` (should be `'both'`)
- Community services are hidden on the "all categories" browse view
- Also: different query cache keys per locale for the same data (cache fragmentation)

**Confidence: Verified** — mappings confirmed in translation files.

---

### CLEAN-1 (Verified): Debug `console.log` Artifacts in Provider Components

Files with debug-level `console.log` calls (not error handling):

| File | Line(s) | Content |
|------|---------|---------|
| `src/components/providers/ProviderCardModal.tsx` | 170-175 | `useEffect` "Debug selected image changes" |
| `src/components/providers/ProviderCardModal.tsx` | 181, 189 | `goToNext`/`goToPrevious` button logs |
| `src/components/providers/ProviderDetailModal.tsx` | 142-148 | `useEffect` "Debug selected image changes" |
| `src/components/providers/ProviderDetailModal.tsx` | 413 | `onClick={() => console.log('Image container clicked')}` |
| `src/components/providers/ProviderDetailModal.tsx` | 251 | `console.log('Share cancelled or failed:', error)` |
| `src/components/providers/ProfileProviderDetailPage.tsx` | 64 | `console.log('More actions clicked')` |
| `src/components/providers/ProfileProviderDetailButtons.tsx` | 120 | `console.log('Share cancelled:', error)` |

---

## Root Cause

**Primary (BUG-1):** `selectedCategory ?? searchParams.get('category')` — wrong precedence gives stale React context priority over the URL param (the canonical state source).

**Secondary (BUG-2):** Localized "all" strings are injected into the API's `category` parameter. Only `'Alle'` and `'All'` are recognized; all other locales fall through to `'providers_only'`.

---

## System Weaknesses

1. **Context as quasi-canonical state**: The `SearchProvider` context acts as a mutable cache that can diverge from URL state on SPA navigation. No invalidation is done on route change.
2. **Localized values in API transport layer**: `t()` return values (UI strings) are being used as API parameters. API should only accept UUIDs or `null`; display labels belong only in the UI.
3. **`refetchOnMount: false`** means wrong data can be shown for the entire session without a background correction.

---

## Recommended Fixes (Analysis-scoped)

1. **Invert priority in category resolution** — URL param must be primary; context falls back only when URL is absent:
   ```typescript
   // Before (wrong):
   const category = selectedCategory ?? (searchParams.get('category') || null);
   // After (correct):
   const category = (searchParams.get('category') || null) ?? selectedCategory;
   ```

2. **Remove `|| t('search.all')` from queryKey and queryFn** — pass `null` directly when no category; the API already handles `null` correctly via `getSearchStrategy(null) → 'both'`:
   ```typescript
   // Before:
   queryKey: ['providers', query, category || t('search.all'), location],
   queryFn: …fetchProvidersFromAPI(query, category || t('search.all'), …),
   // After:
   queryKey: ['providers', query, category, location],
   queryFn: …fetchProvidersFromAPI(query, category, …),
   ```

3. **Remove all debug `console.log` calls** from `ProviderCardModal.tsx`, `ProviderDetailModal.tsx`, `ProfileProviderDetailPage.tsx`, `ProfileProviderDetailButtons.tsx` — these are confirmed development artifacts.

---

## Open Questions

None — all unknowns resolved by code inspection.
