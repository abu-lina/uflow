# Plan 153: Desktop Header Section Tabs + Filters Button

## Objective

Add section tabs (Food/Ummah/Stores) above the search bar and a SlidersHorizontal filter button inside the search bar in the desktop header (`Header.tsx`). On mobile these exist in `RootPageContent` and `ProvidersContent`; this plan replicates the pattern in the desktop nav so users can switch sections and open the full filter page from the header without scrolling.

## Files to Modify

### 1. `src/components/layout/Header.tsx`

**Add imports** (after line 14):
- `import { SectionSelector } from '@/features/search/components/SectionSelector';`
- `import { useSearch } from '@/providers/search-provider';`

**Add section change handler** (after `handleLocationChange`, before the `useEffect` at line 117):
- `handleSectionChange(section: Section)` — reads current URL search params, sets `section` param, calls `router.push('/search?...)`. Follows same pattern as `search/page.tsx:416-423`.

**Modify JSX** (around line 153-182):
- Wrap the current search bar section in a `<div className="flex flex-col items-center gap-2">` (or similar) so SectionSelector sits above SearchBar.
- Insert `<SectionSelector selectedSection={selectedSection} onSectionChange={handleSectionChange} />` above `SearchBar`.
- Add `selectedSection` / `setSelectedSection` destructured from `useSearch()` (or just `selectedSection` if only reading).

### 2. `src/features/search/components/SearchBar.tsx`

**Add import** (line 8):
- Add `SlidersHorizontal` to the `lucide-react` import.

**Add import** (line 5):
- Add `useRouter` to the `next/navigation` import.

**Destructure `selectedSection`** from `useSearch()` (line 44-51):
- Add `selectedSection` to the existing `useSearch()` destructure.

**Add sliders button** in the Filters Section JSX (after the location dropdown, around line 412):
- Add a divider (`<div className="h-6 border-l border-[#999999]" />`)
- Add a `<button>` with `SlidersHorizontal` icon that calls `router.push(`/search?section=${selectedSection}`)` on click.
- Use aria-label from translation (e.g., `t('home.searchFiltersAriaLabel')` or new key `search.filters`).

### 3. `src/__tests__/components/SearchBar.test.tsx`

**Add to the existing `SearchBar Component` describe block**:

- **"renders sliders filter button"** — assert `SlidersHorizontal` icon button is present.
- **"sliders button navigates to /search?section=..."** — mock `useRouter` push, click sliders button, assert `router.push` called with `/search?section=food` (or current section).
- **"section tabs are rendered in Header"** — new describe block or separate test file for `Header` integration (Header.tsx currently has no tests; create `src/__tests__/components/Header.test.tsx`).
  - Render Header within `SearchProvider` + mock router.
  - Assert `SectionSelector` renders with three tabs.
  - Assert clicking a tab navigates to `/search?section=<section>`.

## Implementation Steps

1. **SearchBar.tsx** — add `SlidersHorizontal` button after location dropdown; wire `useRouter` and `selectedSection` from context.
2. **Header.tsx** — import `SectionSelector` and `useSearch`; add `handleSectionChange` that navigates to `/search?section=...`; insert SectionSelector above SearchBar in a flex-col wrapper.
3. **SearchBar.test.tsx** — add tests for sliders button existence and navigation.
4. **Header.test.tsx** — create new test file with SectionSelector rendering and navigation tests.

## Test Strategy

- Unit test the sliders button in `SearchBar.test.tsx`: render with `SearchProvider`, verify button renders, mock `useRouter`, click, verify navigation.
- Integration test the Header in a new `Header.test.tsx`: render within `SearchProvider` and mocked `next/navigation` (useRouter, usePathname, useSearchParams). Verify SectionSelector renders above SearchBar. Click a tab and verify `router.push` called with `/search?section=<section>`.
- Existing tests must pass unmodified (no regressions).

## Acceptance Criteria

- [ ] Section tabs (Food/Ummah/Stores) render above the search bar in desktop header
- [ ] SlidersHorizontal button renders in the search bar after the location dropdown
- [ ] Clicking a section tab navigates to `/search?section=<section>`
- [ ] Clicking the sliders button navigates to `/search?section=<current_section>`
- [ ] All existing SearchBar tests pass
- [ ] No visual regressions in mobile layout (SectionSelector remains hidden on mobile — already handled by `sm:hidden` classes in RootPageContent/ProvidersContent, and Header is already desktop-only in practice; confirm SectionSelector doesn't break mobile nav)
