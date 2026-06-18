# Analysis: Search Location Filter Persistence Bug

**ID**: 172  
**Date**: 2026-06-13  
**Severity**: HIGH — user cannot remove location filter from search

---

## Root Cause

**Primary bug**: `src/app/(public)/providers/ProvidersContent.tsx:136`

The location resolution chain falls through to the shared `SearchContext` state (`selectedLocation`) when the URL has no `location` param. This stale context value overrides the user's intent to search everywhere.

```typescript
// line 136 — the bug
const location = defaultLocation ?? normalizedUrlLocation ?? selectedLocation ?? '';
```

When `normalizedUrlLocation` is `null` (param absent → user cleared location), it falls through to `selectedLocation` from the search context. This context value is stale — set from a *previous* search that *did* include a location.

**Secondary bug**: `src/app/(public)/search/page.tsx:352-362`

The Wo hydration effect reads from `localStorage/sessionStorage` on every mount, re-hydrating a city that the user already cleared:

```typescript
// lines 352-362 — re-hydrates cleared city
useEffect(() => {
    const storedCity = localStorage.getItem('selectedCity') ?? sessionStorage.getItem('selectedCity');
    if (storedCity) {
      setSelectedWoCity(storedCity);
    }
}, []);
```

Neither `handleWoClearSelection` (line 504) nor the "Clear all" button (line 736) clear this storage, so re-visiting the search page always restores the stored city.

---

## Affected Files

| File | Lines | Role |
|------|-------|------|
| `src/app/(public)/providers/ProvidersContent.tsx` | 128-136 | Primary bug: stale context fallback |
| `src/app/(public)/search/page.tsx` | 352-362 | Secondary bug: hydration from storage on every mount |
| `src/app/(public)/search/page.tsx` | 504-507 | Incomplete: `handleWoClearSelection` doesn't clear storage |
| `src/app/(public)/search/page.tsx` | 736-748 | Incomplete: "Clear all" doesn't clear storage |

---

## Data Flow (Bug Reproduction)

### Prerequisites
- User has `selectedCity = 'Stuttgart'` in localStorage (set from onboarding flow)
- User has never visited results page in this session (context `selectedLocation = ''`)

### Steps

#### Trip 1: Search WITH location (establishes stale context)

| Step | Action | State after step |
|------|--------|-----------------|
| 1 | Visit `/search?section=food` | Hydration effect (L352): `selectedWoCity = 'Stuttgart'` |
| 2 | Hit search (Stuttgart still selected) | `handleSearch()` → `/food?section=food&location=Stuttgart` |
| 3 | Results page renders | `rawLocationParam = 'Stuttgart'`, `normalizedUrlLocation = 'Stuttgart'`, `location = 'Stuttgart'` |
| 4 | Sync effect runs (L358) | `setSelectedLocation('Stuttgart')` → **context now stale** |
| 5 | Click edit filter icon | Navigate to `/search?section=food` (no location param) |

#### Trip 2: Search WITHOUT location (bug manifests)

| Step | Action | State after step |
|------|--------|-----------------|
| 6 | Search page remounts | Hydration effect (L352): `selectedWoCity = 'Stuttgart'` again from localStorage |
| 7 | Clear location (click X) | `selectedWoCity = null` (L506). Storage unchanged. |
| 8 | Select "burgers" in Was section | `selectedWas = { type: 'dish', label: 'burgers' }` |
| 9 | Hit search | `handleSearch()`: no location param → `/food?section=food&q=burgers` |
| 10 | Results page renders | `rawLocationParam = null`, `normalizedUrlLocation = null` |
| 11 | **BUG**: Location resolution (L136) | `location = undefined ?? null ?? 'Stuttgart' ?? ''` → **'Stuttgart'** |
| 12 | Search API called with `location='Stuttgart'` | **Results are Stuttgart-only** |
| 13 | Click edit filter icon | Navigate to `/search?section=food` |
| 14 | Search page remounts | Hydration effect (L352): `selectedWoCity = 'Stuttgart'` → **Stuttgart re-appears** |

---

## Fix Hypotheses

### Fix A (Primary — ProvidersContent.tsx)

**Change**: Remove `selectedLocation` from the fallback chain, or make the fallback explicitly conditional on the URL having a `location` param.

**Option A1**: When URL has no `location` param, treat it as LOCATION_ALL (`''`), never fall through to context:

```typescript
// Before (buggy):
const location = defaultLocation ?? normalizedUrlLocation ?? selectedLocation ?? '';

// After (fix):
// When URL param is absent (null), use LOCATION_ALL — never fall through to context
const location = defaultLocation ?? (rawLocationParam === null ? '' : normalizedUrlLocation);
```

This makes the URL the sole source of truth. When `location` is absent from the URL, results are for all locations (LOCATION_ALL = `''`).

**Risk**: Components that depend on context `selectedLocation` being pre-populated without a URL param (e.g., dashboard pages, profile pages) might break. Audit all consumers of `selectedLocation` before implementing.

### Fix B (Secondary — search page hydration)

**Option B1**: Only hydrate Wo from storage if there's no URL `location` param:

```typescript
useEffect(() => {
    const urlLocation = searchParams.get('location');
    if (urlLocation) {
      setSelectedWoCity(urlLocation);
      return;
    }
    // Only fall back to storage if URL has no location
    const storedCity = localStorage.getItem('selectedCity') ?? sessionStorage.getItem('selectedCity');
    if (storedCity) {
      setSelectedWoCity(storedCity);
    }
}, [searchParams]);
```

**Option B2**: Clear the storage when user clears Wo selection:

```typescript
const handleWoClearSelection = () => {
    setSelectedWoCity(null);
    setWoInputQuery('');
    localStorage.removeItem('selectedCity');
    sessionStorage.removeItem('selectedCity');
};
```

**Option B3**: Don't hydrate from storage at all — let the URL param be the only source of truth. Users who land on `/search?section=food` without a location param get an empty location field.

### Recommended approach

Both bugs must be fixed for full resolution:

1. **Fix A** in `ProvidersContent.tsx:136` — removes the stale context fallback (primary root cause)
2. **Fix B (Option B1)** in `page.tsx:352-362` — prevents re-hydration from storage when user has already cleared (secondary root cause, prevents re-appearance on back-navigation)

Fix B1 is preferred over B2 because it doesn't destroy onboarding data — it just doesn't re-apply it when the user has already opted to clear.

---

## Related Retrospective Context

- **Plan 089** (`089-three-section-search-retrospective.md`): PI-1 identified client-state trace gaps. CR-H1 (URL param drop on submit) was the same class of bug — client-state precedence over URL params. The location persistence bug is a direct recurrence of the same pattern: **stale client state overriding URL-intended behavior**.

- **Plan 124** (`124-remove-everywhere-location-retrospective.md`): Removed the global location selector from the header search bar. This created the current architecture where the search page (non-context-aware) and the results page (context-aware) have independent location state management with no sync mechanism.

- **Plan 129** (`129-food-search-rpc-column-retrospective.md`): Not directly relevant (hotfix for DB migration drift).

---

## Test Coverage Gap

No existing test covers:
- Search results page when `location` URL param is absent but context has a stale value
- Search page re-rendering after user cleared Wo selection and navigated back
- Server-side vs client-side location resolution consistency (the server correctly resolves `''` when param absent, but the client uses a different chain)
