# Plan 153 — Desktop Header Section Tabs Implementation

## Summary

Added Food/Ummah/Stores section tabs above the desktop search bar, and a sliders filter button within the search bar.

## Changes

### 1. SearchBar.tsx — SlidersHorizontal button

- Added `SlidersHorizontal` to lucide-react import
- Added `useRouter` from `next/navigation`
- Destructured `selectedSection` from `useSearch()` context
- Added divider + `SlidersHorizontal` button in the filters section (after location dropdown)
- Clicking navigates to `/search?section=${selectedSection}`

### 2. Header.tsx — SectionSelector above SearchBar

- Imported `SectionSelector`, `useSearch`, `Section` type
- Destructured `selectedSection`, `setSelectedSection` from `useSearch()`
- Added `handleSectionChange` that calls `setSelectedSection` + `router.push('/search?section=...')`
- Updated nav layout from single row to `flex-col`:
  - Top row: SectionSelector in a centered `w-[640px]` container
  - Bottom row: existing left/SearchBar/right layout

### 3. test-utils.tsx — Shared router mock (test infrastructure)

- Exported `mockRouterPush` from `test-utils.tsx` so tests can assert on navigation calls without overriding the `next/navigation` mock

### 4. Tests

**`SearchBar.test.tsx`** — new "Sliders Button (Plan 153)" describe block:
- Verifies sliders button renders with aria-label "Open search filters"
- Verifies clicking navigates to `/search?section=food`

**`Header.test.tsx`** — new file with "Header Section Tabs (Plan 153)":
- Verifies SectionSelector renders three tabs (Food, Ummah, Stores)
- Verifies clicking each tab navigates to `/search?section=<section>`

## Verification

| Check | Status |
|-------|--------|
| `tsc --noEmit` | Passes |
| `vitest run` — all SearchBar tests | 18/18 pass |
| `vitest run` — all Header tests | 4/4 pass |
| Pre-existing migration failures | 2 (unrelated) |
