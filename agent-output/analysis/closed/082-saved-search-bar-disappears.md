---
ID: 82
Origin: 82
UUID: d7e3a1f9
Status: Planned
---

# 082 — Saved Page Search Bar Disappears on Empty State

## Changelog

| Date       | Author   | Action                          |
|------------|----------|---------------------------------|
| 2026-04-05 | Analyst  | Initial root cause analysis     |
| 2026-04-05 | Planner  | Status → Planned; plan 082 created |

## Value Statement & Business Objective

Users on the /saved page who search and get no results lose the search bar entirely, leaving them stranded with no way to modify or clear their search. This is a **dead-end UX trap** — the user's only escape is navigating away via the bottom nav. Fixing this restores basic search usability on the saved-items page.

## Context

- **Page**: `/saved` — `src/app/(public)/saved/page.tsx`
- **Component**: `SavedProvidersPage` (client component)
- **Reported on**: UAT mobile
- **Visual evidence**: Screenshot shows "Gespeichert" heading, empty space, "Keine Ergebnisse / Keine Anbieter entsprechen deinen Suchkriterien." text, bottom nav — no search bar visible.
- **Search state management**: `useSearch()` from `@/providers/search-provider` (shared context)
- **SearchBar component**: `@/features/search/components/SearchBar`

## Methodology

- **Upstream Tracing**: Followed the conditional rendering chain in the page component to identify where the SearchBar is included vs excluded.
- **Component Isolation**: Compared against `/providers` page (`ProvidersContent.tsx`) which handles the same pattern correctly.
- **State-Machine Branch Enumeration**: Listed all reachable states in the authenticated render path.

## Findings

### L1 Proven — Root Cause: SearchBar is inside conditional chain, omitted in empty-state branches

**File**: `src/app/(public)/saved/page.tsx`  
**Lines**: 516–590 (authenticated render path inside `<PageContent>`)

The `<SearchBar>` component is rendered **inside** a ternary conditional chain. It only appears in 2 of 5 branches:

```
PageContent children:
  ├── showSkeleton?          → <SearchBar> + <SkeletonCard> grid  ✅ SearchBar shown
  ├── queryError?            → <EmptyState>                       ❌ No SearchBar
  ├── 'no_saved_items'?      → <EmptyState>                       ❌ No SearchBar
  ├── 'no_results'?          → <EmptyState>                       ❌ No SearchBar  ← THE BUG
  └── else (has results)     → <SearchBar> + provider list        ✅ SearchBar shown
```

**The bug**: When `emptyStateType === 'no_results'` (line 545), only `<EmptyState>` is rendered. The `<SearchBar>` is not included. This means once the user types a search term that filters all saved providers out, the search input vanishes and the user cannot modify or clear the term.

### L1 Proven — State determination logic

**File**: `src/app/(public)/saved/page.tsx`, lines 348–362

```typescript
const renderEmptyState = () => {
  if (!user)                        return 'login_required';  // early return, separate layout
  if (providers.length === 0)       return 'no_saved_items';
  if (filteredProviders.length === 0) return 'no_results';    // ← triggers the bug
  return null;
};
```

The `'no_results'` state is reached when:
1. User is authenticated (`user` is truthy)
2. User has saved providers (`providers.length > 0`)
3. Client-side filtering by `searchQuery` and/or `selectedLocation` eliminates all results (`filteredProviders.length === 0`)

### L1 Proven — Secondary concern: PageContent className applies centering on empty states

**File**: `src/app/(public)/saved/page.tsx`, line 516–519

```tsx
<PageContent 
  className={emptyStateType && !showSkeleton ? 'flex items-center justify-center min-h-[60vh]' : ''}
  maxWidth="full"
>
```

When `emptyStateType` is truthy (including `'no_results'`), `PageContent` applies vertical centering with `min-h-[60vh]`. If the SearchBar is added to the `'no_results'` branch, this centering will apply to _both_ the SearchBar and EmptyState together. The fix will need to either:
- Move the SearchBar outside the conditional chain (before it), or
- Adjust the className logic for the `'no_results'` case.

### L2 Observed — Contrast with /providers page (correct pattern)

**File**: `src/app/(public)/providers/ProvidersContent.tsx`, lines 511–519, 541–542

On the `/providers` page, the search header (`ProvidersPageHeader`) is rendered **outside** and **above** the content area:

```tsx
<ProvidersPageHeader ... />    // ← always rendered, not inside renderContent()
<main>
  {renderContent()}            // ← EmptyState or results, SearchBar is independent
</main>
```

This means the search bar on `/providers` is always visible regardless of result count. The `/saved` page does not follow this pattern.

## Branch Coverage Matrix (State-Machine Heuristic)

| # | State                 | Trigger                                    | SearchBar? | EmptyState? | Status          |
|---|-----------------------|--------------------------------------------|------------|-------------|-----------------|
| 1 | `login_required`      | `!user`                                    | N/A        | Login form  | OK (separate layout) |
| 2 | `showSkeleton`        | `isLoading && providers.length === 0`      | ✅ Yes     | No          | OK              |
| 3 | `queryError`          | Query threw error                          | ❌ No      | Yes         | Acceptable*     |
| 4 | `no_saved_items`      | `providers.length === 0`                   | ❌ No      | Yes         | Acceptable*     |
| 5 | `no_results`          | `filteredProviders.length === 0`           | ❌ No      | Yes         | **BUG**         |
| 6 | Has results (default) | `filteredProviders.length > 0`             | ✅ Yes     | No          | OK              |

\* Branches 3 and 4: The absence of SearchBar is debatable but tolerable — in branch 3 there's an error state, and in branch 4 there's nothing to search. However, **branch 5 is unambiguously a bug** because the user actively used the search bar, which then disappeared.

## Root Cause Summary

**Component**: `SavedProvidersPage` in `src/app/(public)/saved/page.tsx`  
**Mechanism**: The `<SearchBar>` is placed inside a mutually exclusive ternary chain (lines 520–590). The `'no_results'` branch (line 545) renders only `<EmptyState>` without `<SearchBar>`, causing the search input to vanish when the client-side filter returns zero matches.  
**Confidence**: L1 Proven — directly verified by reading the conditional logic in source code.

## Reproduction Path

1. Log in as any user with at least one saved provider.
2. Navigate to `/saved`.
3. Observe the SearchBar is visible (branch 6: has results).
4. Type a search term that does not match any saved provider name, address, or category (e.g., "xyznonexistent").
5. The SearchBar disappears. Only the "Keine Ergebnisse" empty state is shown.
6. The user is now stranded — no way to clear/modify the search without leaving the page.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| — | None    | —       | —               | —     |

Root cause is fully determined. No gaps remain.

## Analysis Recommendations

1. **Test**: Verify the fix ensures `SearchBar` renders in the `'no_results'` branch by adding a regression test that asserts the search input is present when `filteredProviders` is empty but `providers` is non-empty.
2. **Test**: Verify the `PageContent` className centering logic is adjusted so the SearchBar is not vertically centred alongside the EmptyState (it should stay at the top).
3. **Trace**: Consider whether `queryError` and `no_saved_items` branches should also show a SearchBar for consistency — this is a product decision, not strictly a bug.
