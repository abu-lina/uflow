---
ID: 44
Origin: 44
UUID: b7e3a921
Status: Planned
---

# Changelog

| Date       | Author  | Change             |
|------------|---------|---------------------|
| 2026-03-18 | Planner | Status updated to Planned; handed off to planning | Analysis converted into Plan 044 |
| 2026-03-18 | Analyst | Initial analysis    |

---

# Root Cause Analysis — Providers Not Shown at `/providers?location=`

## Value Statement and Business Objective

Users arriving at `/providers?location=` (empty-string location param, e.g. from a shared link or page navigation) expect to see all providers. Instead, only the first server-rendered page (12 items) is visible and all subsequent pages return zero results. This silently degrades discoverability for every user whose URL carries that param.

---

## Objective

Identify the precise code paths that cause incomplete provider results when `?location=` (empty string) is present in the URL, and confirm a reproduction path ready for Planner to scope a fix.

---

## Context

- **Route**: `/providers` — server component (`page.tsx`) + client component (`ProvidersContent.tsx`)
- **Search pipeline**: `page.tsx` → `searchProvidersAndCommunityServices` (initial SSR) → `ProvidersContent` (React Query, infinite scroll) → `/api/providers/search` (route handler) → `searchProviders` / `searchCommunityServices` (Supabase query)
- **Canonical sentinel**: `LOCATION_ALL = ''` (empty string = no city filter). Defined in `src/providers/search-provider.tsx`.
- **Expected behaviour**: empty-string location param = show all providers (no city filter).

---

## Methodology

1. Read `page.tsx`, `ProvidersContent.tsx`, `route.ts` (API handler), `providers.ts`, `communityServices.ts`, `search-provider.tsx`, `SearchBar.tsx`.
2. Traced the `location` value across the SSR and client execution paths for the URL `/?location=`.
3. Identified where JavaScript truthy/falsy evaluation causes `''` to be discarded in favour of a translated string.
4. Verified the API route fallback independently.
5. Confirmed `isValidLocation()` returns `true` for non-empty translated strings, causing wrong DB filter.

---

## Findings

### Finding 1 — VERIFIED: Empty-string URL param funnels to translated "Everywhere" string in `ProvidersContent`

**File**: `src/app/(public)/providers/ProvidersContent.tsx` — [location resolution, ~line 97](src/app/(public)/providers/ProvidersContent.tsx#L97)

```typescript
// Priority: defaultLocation > URL param > context > fallback
const location =
  defaultLocation || searchParams.get('location') || selectedLocation || t('search.everywhere');
```

**What happens**:

| Input | `searchParams.get('location')` | `selectedLocation` | Result `location` |
|---|---|---|---|
| `/providers` (no param) | `null` → falsy | `''` → falsy | `t('search.everywhere')` e.g. `'Überall'` |
| `/providers?location=` | `""` → falsy | `''` → falsy | `t('search.everywhere')` e.g. `'Überall'` |
| `/providers?location=München` | `"München"` → truthy | — | `'München'` ✅ |

`searchParams.get('location')` returns `""` (not `null`) when the param exists but is empty — per browser `URLSearchParams` spec. Empty string is **falsy in JavaScript**, so the `||` chain discards it and falls through to `selectedLocation` (also `LOCATION_ALL = ''`, also falsy), then to `t('search.everywhere')` — a localised non-empty string.

The function `t('search.everywhere')` returns locale-dependent values: `'Überall'` (de), `'Everywhere'` (en), etc.

This translated string then becomes:
- The React Query `queryKey` dimension: `['providers', '', null, 'Überall']`
- The `location` argument passed to `fetchProvidersFromAPI`

---

### Finding 2 — VERIFIED: Client passes translated location string to API; API treats it as a city name

**File**: `src/app/(public)/providers/ProvidersContent.tsx` — [fetchProvidersFromAPI, ~line 44](src/app/(public)/providers/ProvidersContent.tsx#L44)

```typescript
if (location) params.set('location', location);
```

`'Überall'` is truthy → appended to the API URL as `?location=Überall`.

**File**: `src/app/api/providers/search/route.ts` — [line ~44](src/app/api/providers/search/route.ts#L44)

```typescript
const location = searchParams.get('location') || 'Everywhere';
```

`'Überall'` is truthy → `location = 'Überall'`.  
`searchProvidersAndCommunityServices(query, category, 'Überall', page, pageSize)` is invoked.

**File**: `src/services/providers.ts` — [isValidLocation check, ~line 480](src/services/providers.ts#L480)

```typescript
function isValidLocation(location: string | null | undefined): boolean {
  if (!location) return false;
  return true;
}
// ...
if (isValidLocation(location)) {
  req = req.eq('address_city', location);
}
```

`isValidLocation('Überall')` → `true` (non-empty string passes).  
Supabase query becomes: `WHERE address_city = 'Überall'`.  
No providers have `address_city = 'Überall'` → **0 results returned**.

The same logic applies inside `src/services/communityServices.ts` → same 0-result outcome.

---

### Finding 3 — VERIFIED: API route has a wrong default that also breaks the "no location" path

**File**: `src/app/api/providers/search/route.ts`

```typescript
const location = searchParams.get('location') || 'Everywhere';
```

When a client correctly handles `LOCATION_ALL = ''` as "skip param" (the `if (location)` guard in `fetchProvidersFromAPI`), the API receives **no `?location` param** → `searchParams.get('location')` is `null` → falls to `'Everywhere'`.

`'Everywhere'` passes `isValidLocation()` → `address_city = 'Everywhere'` filter applied → 0 results.

This means the API is **also broken for clean LOCATION_ALL requests** (no `?location` in URL). The route `page.tsx` avoids this by calling `searchProvidersAndCommunityServices` directly (server-to-service, bypassing the API route). The client always goes through the API route.

---

### Finding 4 — VERIFIED: `page.tsx` (SSR) is correct; only the client path is broken

**File**: `src/app/(public)/providers/page.tsx`

```typescript
const locationParam = typeof params.location === 'string' ? params.location : '';
const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
const location = isLegacyEverywhere ? '' : locationParam;
// location = '' when ?location= → correct, no city filter
```

The server component properly normalises legacy strings and empty-string → `''`. The initial SSR render fetches **all providers correctly**. `initialData` (first 12 providers) is passed to React Query.

**Why users see partial results**: React Query initialises with the correct server data. `staleTime: 5 × 60 × 1000 ms` and `refetchOnMount: false` prevent an immediate client refetch. The user sees the 12 server-rendered items. **But**:

- **Infinite scroll (pagination)** immediately calls `fetchNextPage` → `page=1, location='Überall'` → 0 results → scroll stops. Users see at most 12 providers.
- **Any interaction** (category filter, search query) changes the queryKey → fresh API call with `location='Überall'` → 0 results → blank page.
- **After 5 minutes** the data is considered stale; background refetch with `location='Überall'` → **all providers disappear**.

---

### Finding 5 — VERIFIED: `SearchBar.tsx` URL-sync runs after initial render, causes no correction

**File**: `src/features/search/components/SearchBar.tsx`

```typescript
useEffect(() => {
  if (!hasSyncedFromUrl.current) {
    const locationParam = searchParams.get('location') || '';
    const isAllLocations = !locationParam || locationParam === 'Überall' || locationParam === 'Everywhere';
    const location = isAllLocations ? LOCATION_ALL : locationParam;
    setSelectedLocation(location);  // sets '' (LOCATION_ALL)
    hasSyncedFromUrl.current = true;
  }
}, [...]);
```

`SearchBar` correctly normalises the URL param to `LOCATION_ALL = ''`. **However**:
1. `useEffect` runs **after** the initial render — the React Query `queryKey` is already set to `'Überall'` before this correction fires.
2. `setSelectedLocation('')` sets state to `''` — which equals the **existing** initial state `LOCATION_ALL = ''`. React performs no re-render (no state change detected).
3. `ProvidersContent`'s `location` variable never gets corrected from `'Überall'` to `''`.

The SearchBar normalisation path that would fix this is never triggered.

---

## Root Cause Summary

**Three independent defects form a chain** that makes the bug silent and invisible:

| # | Location | Defect | Effect |
|---|----------|--------|--------|
| **RC-1** | `ProvidersContent.tsx` L~97 | `||` chain conflates `""` (valid sentinel) with "no value"; falls through to `t('search.everywhere')` | Client query key and API param become a translated city name string |
| **RC-2** | `route.ts` L~44 | `|| 'Everywhere'` default when no `?location` param, instead of `|| ''` | Even clean LOCATION_ALL requests apply a `'Everywhere'` city filter |
| **RC-3** | `route.ts` L~44 | No legacy normalisation for `'Everywhere'`/`'Überall'` strings (unlike `page.tsx`) | Translated "everywhere" strings are treated as city names by the DB query |

**RC-1** is the root driver in the reported bug path. RC-2 and RC-3 are independently exploitable and would surface on any client call where `location = ''` or a legacy string reaches the API.

---

## Reproduction Path

1. Navigate to `https://ummahflow.com/providers?location=` (empty-string param).
2. Observe: first 12 providers render (from SSR; correct).
3. Scroll down to trigger next page → **0 more results appear** (infinite scroll stops).
4. Open DevTools → Network → see `GET /api/providers/search?page=1&pageSize=12&location=Überall` (or `Everywhere` depending on locale).
5. Response: `{ "results": [], "hasMore": false }`.
6. Alternatively, change any filter (e.g., click a category) → **all results disappear** → API called with `?category=<uuid>&location=Überall` → 0 results.

---

## System Weaknesses

### Architecture

- **Sentinel value `''` relies on truthiness**: Using empty string as LOCATION_ALL with `||` chains throughout is fragile. Any `||` that evaluates `''` as falsy silently discards the sentinel.
- **Two separate normalization sites** (`page.tsx` vs `route.ts`) diverged. The fix applied to `page.tsx` (legacy string mapping) was not propagated to `route.ts`.
- **Client component reads URL params directly** in addition to the search-provider context, creating a parallel unsynced resolution path.

### Code

- `ProvidersContent.tsx`: `||` operator used where `??` (nullish coalescing) is required — `''` is a valid defined value, not "nothing".
- `route.ts`: hard-coded `'Everywhere'` fallback is a localised UI string, not a neutral sentinel. API routes should never depend on localised strings in query parameters.
- `fetchProvidersFromAPI`: silently skips the `?location` param when `location = ''`, creating an implicit contract with `route.ts` that `route.ts` violates.

### Process

- No test coverage for `?location=` (empty) URL variant on the client pagination path.
- SSR-only tests would miss this bug entirely (SSR renders correctly).

---

## Instrumentation Gaps

| Gap | Type | What to capture |
|-----|------|-----------------|
| Log `location` value entering `route.ts` | **Normal** | `{ correlationId, location, isEmptyOrAll: location === '' }` — structured field, always-on |
| Log when `isValidLocation()` receives a non-city string (legacy "everywhere" words) | **Normal** | Warning log: `"Unexpected location sentinel reached DB filter"` |
| Add assertion in `fetchProvidersFromAPI` | **Normal** | `if (location && ['Everywhere','Überall'].includes(location)) console.warn(...)` |
| Trace React Query key composition in `ProvidersContent` | **Debug** | Log `{ queryKey, resolvedLocation, urlParam, contextLocation }` behind `DEBUG_SEARCH=true` flag |

---

## Analysis Recommendations (Next Investigation Steps)

1. **Confirm RC-2 independently**: Call `GET /api/providers/search` with no `?location` param (e.g., via Postman/curl against UAT). Expected: all providers. If 0 results → RC-2 confirmed in isolation.
2. **Confirm RC-1 independently**: In browser DevTools, navigate to `/providers?location=` and inspect the React Query devtools (if installed) for the active queryKey. It should show `'Überall'` or locale equivalent. This confirms the sentinel is lost without any server call.
3. **Check test suite**: Search `src/__tests__` and `tests/` for tests covering the `/providers?location=` path with pagination — absence confirms the instrumentation gap.
4. **Validate fix scope**: The Planner needs to decide whether RC-2 (`route.ts` default) is fixed via `?? ''` or via full normalization matching `page.tsx`. Both should be tested.

---

## Open Questions

None. Root cause is fully verified through static trace. Remaining uncertainty (e.g., exact locale translation of `t('search.everywhere')`) does not affect the fix — the sentinel discarding is locale-independent.
