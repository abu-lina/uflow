# Plan: Search Location Filter Persistence Bug

**Plan ID**: 172  
**Inherited from**: Analysis 172  
**Date**: 2026-06-13  
**Severity**: HIGH  

---

## Overview

Two bugs combine to make location filters persist when the user has explicitly cleared them:

1. **Primary** (`ProvidersContent.tsx:136`): Location fallback chain falls through to stale `SearchContext` state when URL has no `location` param.
2. **Secondary** (`search/page.tsx:352-362`): Hydration effect re-populates Wo city from `localStorage`/`sessionStorage` on every mount.
3. **Incomplete clear handlers** (lines 504, 736): Neither `handleWoClearSelection` nor "Clear all" clear persistent storage.

---

## Fix A — Primary Bug (ProvidersContent.tsx:128-136)

### Root Cause

The `normalizedUrlLocation` returns `null` when the URL has no `location` param. The `??` chain then falls through to `selectedLocation` (stale context value from a previous search):

```typescript
// Lines 128-136 — Current (buggy)
const rawLocationParam = searchParams.get('location'); // null | string
const normalizedUrlLocation =
    rawLocationParam === null
      ? null // param absent — fall through to context
      : rawLocationParam === 'Everywhere' || rawLocationParam === 'Überall'
        ? '' // legacy all-locations labels → LOCATION_ALL sentinel
        : rawLocationParam; // real city name or '' (LOCATION_ALL)
// Priority: defaultLocation > URL param ('' preserved) > context > LOCATION_ALL ('')
const location = defaultLocation ?? normalizedUrlLocation ?? selectedLocation ?? '';
```

### Fix

Change the normalization so that `null` (URL param absent) resolves to `''` (LOCATION_ALL) instead of `null`. Remove `selectedLocation` from the fallback chain entirely. The URL is the sole source of truth for location filter.

```typescript
// Lines 128-136 — After fix
const rawLocationParam = searchParams.get('location'); // null | string
const normalizedUrlLocation =
    rawLocationParam === null
      ? LOCATION_ALL  // param absent → all locations (never fall through to context)
      : rawLocationParam === 'Everywhere' || rawLocationParam === 'Überall'
        ? LOCATION_ALL  // legacy all-locations labels → LOCATION_ALL sentinel
        : rawLocationParam;  // real city name or '' (LOCATION_ALL)
// Priority: defaultLocation > URL param ('' preserved) > LOCATION_ALL ('')
// URL is sole source of truth. Context is never used as fallback for location.
const location = defaultLocation ?? normalizedUrlLocation;
```

This also requires importing `LOCATION_ALL` from `@/providers/search-provider` if not already imported (it is not — currently uses raw `''` literal).

### Why this fixes the primary bug

When the user navigates to a results URL without `?location=`, `rawLocationParam` is `null` → `normalizedUrlLocation` is `''` (LOCATION_ALL) → `location` is `''`. The stale `selectedLocation` context value is never consulted.

The sync effect at line 358 (`if (location !== selectedLocation) setSelectedLocation(location)`) will then overwrite the stale context with `''`, preventing it from polluting subsequent interactions.

---

## Fix B — Hydration Effect (search/page.tsx:352-362)

### Root Cause

The hydration effect runs on every mount and reads `selectedCity` from storage without any guard for "user has already cleared location this session":

```typescript
// Lines 352-362 — Current (buggy)
useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedCity = localStorage.getItem('selectedCity') ?? sessionStorage.getItem('selectedCity');
    if (storedCity) {
      setSelectedWoCity(storedCity);
      setWoInputQuery('');
    }
}, []);
```

### Fix

Add a session guard. When the user explicitly clears Wo selection, set a session flag. The hydration effect skips hydration if this flag is present. Additionally, clear the persistent storage on clear actions (Fix C).

```typescript
// Lines 352-362 — After fix
useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // Skip hydration if user explicitly cleared Wo this session
    const clearedThisSession = sessionStorage.getItem('uflow:wo-cleared-this-session');
    if (clearedThisSession) {
      return;
    }
    const storedCity = localStorage.getItem('selectedCity') ?? sessionStorage.getItem('selectedCity');
    if (storedCity) {
      setSelectedWoCity(storedCity);
      setWoInputQuery('');
    }
}, []);
```

**Why session flag instead of clearing storage**: Preserves `selectedCity` in `localStorage` (set by onboarding flow) so it's available on the next page refresh / new session. The session flag is ephemeral — it resets when the tab is closed.

---

## Fix C — Storage Cleanup in Clear Handlers (search/page.tsx:504,736)

### `handleWoClearSelection` (line 504)

```typescript
// Lines 504-507 — After fix
const handleWoClearSelection = () => {
    setSelectedWoCity(null);
    setWoInputQuery('');
    localStorage.removeItem('selectedCity');
    sessionStorage.removeItem('selectedCity');
    // Mark that user explicitly cleared — prevents re-hydration on remount
    sessionStorage.setItem('uflow:wo-cleared-this-session', 'true');
};
```

### "Clear all" handler (line 736)

Add storage cleanup and session flag to the onClick handler:

```typescript
// Line 736, around line 748 — Add these lines to the onClick
localStorage.removeItem('selectedCity');
sessionStorage.removeItem('selectedCity');
sessionStorage.setItem('uflow:wo-cleared-this-session', 'true');
```

The full handler after fix:

```typescript
onClick={() => {
    setWasQuery('');
    setWasResults([]);
    setIsLoadingWas(false);
    setIsErrorWas(false);
    setSelectedWas({ type: 'all-restaurants' as const, label: t('suchen.was.everything') });
    setOpenAccordion('was');
    setWoInputQuery('');
    setSelectedWoCity(null);
    setWerSelection(null);
    setWerResetSignal((prev) => prev + 1);
    setSelectedFilters([]);
    handleSectionChange('food');
    localStorage.removeItem('selectedCity');
    sessionStorage.removeItem('selectedCity');
    sessionStorage.setItem('uflow:wo-cleared-this-session', 'true');
}}
```

---

## Risk Assessment

### Consumers of `selectedLocation` from SearchContext

| Consumer | File | Dependency | Risk |
|----------|------|------------|------|
| **Header SearchBar** | `features/search/components/SearchBar.tsx:43` | Reads `selectedLocation` for display + submission | Low — will now get `''` from context when no URL param, which the UI renders as "Everywhere" |
| **FigmaSearchBar** | `features/search/components/FigmaSearchBar.tsx:29` | Reads `selectedLocation` for display + submission | Low — same as above |
| **Results page sync** | `ProvidersContent.tsx:358` | Writes resolved `location` back to context | Low — Fix A changes the source value but the sync still works correctly |
| **Saved page** | `saved/page.tsx:43,122` | Reads `selectedLocation` for client-side filter | Low — context will be `''` when navigating from results page without location, which shows all saved items (correct) |
| **Categories service** | `services/categories.ts:141` | Receives `selectedLocation` as param | Low — called from `ProvidersContent` with the already-resolved `location`, not context directly |

### Risk: Fix A breaks a page that depends on context pre-population

No page currently depends on `selectedLocation` being pre-populated without a URL param. The context is always synced from the URL by `ProvidersContent`'s sync effect. Pages that read `selectedLocation` without a corresponding URL param (like `/saved`) use it as a client-side filter — getting `''` (show all) when the user last navigated without a location is correct behavior.

### Risk: defaultLocation prop

The `defaultLocation` prop (Stage 2 city filter on root URL) is unaffected. It sits first in the `??` chain and is non-null when provided.

### Regression: ProvidersContent tests

The existing test `providers-page-location.test.tsx` tests the **server-side** of `ProvidersPage` (the parent page component), not `ProvidersContent` directly. It calls `searchProvidersAndCommunityServices` with the resolved location. The test at line 27 passes `''` when no `location` param — this matches Fix A's behavior and will not break.

The test `providers-content.layout-regression.test.tsx` mocks `useSearchParams` with `"section=food&q=Indigo&location=Berlin"` (has a location param) — so `rawLocationParam` is not null. Unaffected.

---

## Test Strategy

### Existing tests

| File | What it covers | Affected by Fix A? |
|------|---------------|-------------------|
| `__tests__/app/providers-page-location.test.tsx` | SSR location normalization | No — tests server-side resolution, not `ProvidersContent` client-side |
| `__tests__/app/providers-content.layout-regression.test.tsx` | Layout regression, mock has `location=Berlin` | No |
| `__tests__/regression/plan017-i18n-location-sentinel.test.tsx` | i18n location sentinel handling | Maybe — verifies context. Update mock expectation if behavior changes |
| `__tests__/regression/plan082-saved-searchbar-no-results.test.tsx` | Saved page with mock context | No — saved page tests its own client-side filtering |

### Tests to add

#### 1. Unit test for location resolution logic

File: `src/__tests__/app/providers-content-location-resolution.test.tsx`

Cover these cases:
- URL has `location=Berlin` → resolves to `Berlin`
- URL has `location=Everywhere` → resolves to `''` (LOCATION_ALL)
- URL has `location=Überall` → resolves to `''` (LOCATION_ALL)
- URL has `location=` (empty) → resolves to `''` (LOCATION_ALL)
- URL has **no** `location` param + context is `Stuttgart` → resolves to `''` (LOCATION_ALL) — **this is the regression test for the bug**
- URL has no `location` param + context is `''` → resolves to `''` (LOCATION_ALL)
- `defaultLocation` is provided → resolves to defaultLocation regardless of URL

This test renders `ProvidersContent` with mocked `useSearchParams` and `useSearch` (context), then reads the internal resolution via the API call args or a data attribute.

#### 2. Integration test for clear-location flow

File: `src/__tests__/app/search-page-storage.test.tsx`

Test that:
- Wo selection clears storage on `handleWoClearSelection`
- Wo selection clears storage on "Clear all"
- Session flag `uflow:wo-cleared-this-session` is set after clear
- Hydration effect skips when session flag is present
- Storage is preserved when Wo selection is changed (not cleared)

#### 3. Regression test for the full bug path

File: `src/__tests__/regression/plan172-location-persistence.test.tsx`

Test:
- Mock location in storage
- Mount search page → verifies Wo is hydrated
- Simulate clear → verifies Wo is null
- Remount (simulate navigation back) → verifies Wo is still null (not re-hydrated) — **this is the regression test for the bug**
- Full page refresh (module reset) → verifies hydration works again

---

## Manual QA Steps

### Prerequisites
- Ensure `localStorage.setItem('selectedCity', 'Stuttgart')` is set (run in console or via onboarding)
- Clear `sessionStorage` before starting

### Test 1: Primary bug — location filter persists when it shouldn't

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Visit `/search?section=food` | Wo field shows "Stuttgart" (hydrated from localStorage) |
| 2 | Click X on Stuttgart to clear it | Wo field is empty, "Wo" section shows placeholder |
| 3 | Type "burgers" in Was section, press Search | Navigates to results page with no location in URL |
| 4 | Observe `?q=burgers` in URL — should NOT have `location=Stuttgart` | URL is `/food?section=food&q=burgers` |
| 5 | Results should show providers from ALL cities | Not filtered to Stuttgart only |
| 6 | Click edit filter icon | Navigates to `/search?section=food` |
| 7 | Wo field should be **empty** (not re-hydrated) | Wo section shows placeholder, not "Stuttgart" |

### Test 2: Secondary bug — storage re-hydration on return

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Follow Test 1 steps 1-6 | Storage is cleared |
| 2 | Refresh page (full reload) | Wo field shows "Stuttgart" (new session, hydration works again) |
| 3 | Clear Wo, search, return to search | Wo stays empty (session guard active) |

### Test 3: Onboarding city still works on next session

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set `localStorage.setItem('selectedCity', 'Berlin')` | Simulates onboarding |
| 2 | Close tab, open new tab, visit `/search?section=food` | Wo field shows "Berlin" |
| 3 | Clear Wo | Storage is cleared, `wo-cleared-this-session` flag set |
| 4 | Close tab, open new tab, visit `/search?section=food` | Wo field shows... depends on localStorage |
| 4a | If localStorage still has `selectedCity` from step 1 | Shows "Berlin" (won't happen since step 3 cleared it) |
| 4b | If localStorage was cleared | Wo is empty — user must type city |

### Test 4: Regression — "Clear all" button

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Visit search with Stuttgart hydrated | Wo shows "Stuttgart" |
| 2 | Fill some Was/Wer/Filter fields | Fields are populated |
| 3 | Tap "Clear all" | All fields reset. Wo is empty. |
| 4 | Navigate to results page and back | Wo stays empty |

### Test 5: Normal location filter still works

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Visit `/food?section=food&location=München` | Results filtered to München |
| 2 | Visit `/food?section=food&location=Everywhere` | Results from all cities |
| 3 | Visit `/food?section=food` (no location) | Results from all cities |
