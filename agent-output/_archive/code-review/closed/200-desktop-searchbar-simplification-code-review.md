---
ID: 200
Origin: Planner
UUID: b7a2d1f4-3a9f-49b3-8e5a-1d4e7c9a8b3f
Status: Committed
---

# Code Review: Desktop Search Bar Simplification (Plan 200)

**Plan Reference**: `agent-output/planning/200-desktop-searchbar-simplification.md`
**Implementation Reference**: `agent-output/implementation/200-desktop-searchbar-simplification.md`
**Date**: 2026-08-02
**Reviewer**: Code Reviewer

## Changelog

| Date       | Agent Handoff | Request      | Summary                                                                      |
| ---------- | ------------- | ------------ | ---------------------------------------------------------------------------- |
| 2026-08-02 | Implementer   | Code Review  | Implementation complete, M1-M4 done, 2 fix-in-review corrections applied     |

---

## Architecture Alignment

**Alignment Status**: ALIGNED

The implementation follows Direction A as approved in the plan — Google Maps-style primary bar + secondary pill row. All changes are contained in `src/features/search/components/SearchBar.tsx` and supporting locale files, matching the architectural decision to keep this as a view-layer-only change. No state management, API, or service layer was touched.

The `hidden md:flex` guard on the pill row respects the Next.js 15 + Tailwind breakpoint convention used throughout the codebase.

---

## Mandatory Checklist Results

### i18n String Literal Scan (6k — TRIGGERED)

**Scope**: `SearchBar.tsx` modified (UI component with user-visible text)

**Result**: 3 hardcoded strings found in suggestions dropdown type labels:
```tsx
// Pre-existing code, relocated by Plan 200
{item.type === 'provider' ? 'Restaurant' :
 item.type === 'cuisine' ? 'Küche' : 'Menü'}
```

**Assessment**: Pre-existing strings not introduced by Plan 200 (plan constraint: "no logic changes"). The implementer correctly stayed within scope.

**Resolution**: **Fix-in-Review applied** — added `search.suggestions.{provider,cuisine,menuItem}` keys to all 6 locale files and updated SearchBar.tsx to use `t()`.

**i18n scan summary**: 1 component checked — 3 pre-existing hardcoded labels found → fixed-in-review ✅

---

### Interaction-Layer Audit (6f — N/A)

No `pointer-events`, `visibility`, overlay wrappers, or fixed-position containers introduced. N/A.

### Path Refactor / File-Move Checklist (6b — N/A)

No file moves or renames. N/A.

### Deployment Path Audit (6d — N/A)

No deployment surface area touched. Pure UI/layout change. N/A.

### Outbound Data-Flow Cross-Trace (6e — N/A)

No new router.push, query params, or API routes added. N/A.

### Deleted-Module Residue Sweep (6h — N/A)

No modules deleted. N/A.

### Migration SQL Correctness (6j — N/A)

No database migrations. N/A.

---

## TDD Compliance Check

**TDD Table Present**: N/A (pure visual refactor, as documented in implementation doc)
**Existing Test Coverage**: `src/__tests__/components/SearchBar.test.tsx` present

**Pre-existing test broken by Plan 200** (MEDIUM — see M1 below):
- Test `[post-review fix] uses gap-0 in search icon/input row` queries for `.gap-0` CSS class
- Plan 200 M3 changed the search row from `gap-0` to `gap-1` for visual polish
- The implementation doc incorrectly labelled this failure as "pre-existing"
- **Fix-in-Review applied**: Updated selector from `gap-0` to `gap-1`

---

## Findings

### Critical

None.

### High

**[HIGH — Pre-existing — FIR Applied] H1: Hardcoded suggestion type labels**
- **Location**: `src/features/search/components/SearchBar.tsx` (suggestions dropdown)
- **Triggered by**: Mandatory i18n scan (§6k) on modified component
- **Issue**: 'Restaurant', 'Küche', 'Menü' hardcoded German strings in JSX. Pre-existing code not introduced by Plan 200 — the implementer correctly relocated them without change per the "no logic changes" plan constraint.
- **Fix-in-Review applied** (7 files, trivial translation data):
  - Added `search.suggestions.{ provider, cuisine, menuItem }` to `de.ts`, `en.ts`, `ar.ts`, `tr.ts`, `ur.ts`, `ps.ts`
  - Updated SearchBar.tsx: `t('search.suggestions.provider')` / `t('search.suggestions.cuisine')` / `t('search.suggestions.menuItem')`
- **Verification path**: `npm run type-check` passes; `get_errors()` on SearchBar.tsx = no errors

### Medium

**[MEDIUM — FIR Applied] M1: Regression test broken by Plan 200 M3**
- **Location**: `src/__tests__/components/SearchBar.test.tsx:58-63`
- **Issue**: Test queries for `div.relative.flex.flex-1.flex-row.items-center.gap-0` but M3 changed the search row from `gap-0` → `gap-1`. `toBeTruthy()` would fail, causing CI failure. Implementation doc incorrectly labelled this as a pre-existing failure.
- **Fix-in-Review applied**: Updated selector from `gap-0` to `gap-1`, updated test name to reflect current value: `[post-review fix] uses gap-1 in search icon/input row`
- **Verification path**: Test now queries correct class; the `not.toContain('sm:gap-4')` assertion unchanged

### Low

**[LOW] L1: Suspense fallback renders old single-row layout**
- **Location**: `src/features/search/components/SearchBar.tsx:552-568`
- **Issue**: The `Suspense` fallback still shows the original single-row bar without the pill row. During the brief SSR → CSR hydration window, users on desktop will see a visual flash (single bar → bar+pills).
- **Impact**: Minor visual flash, not a functional issue. Pre-existing pattern — fallback has always been a simplified version.
- **Recommendation**: Low priority; if jarring in UAT, update fallback to match new bar-only layout (omit pill row, which is fine since pills are secondary).

**[LOW] L2: Pill row visible on `/saved` page desktop**
- **Location**: `src/app/(public)/saved/page.tsx:520-523`
- **Issue**: The `/saved` page uses `<SearchBar>` without any className. On desktop (≥768px), the new pill row (Wer + Filter) is now visible below the search bar. These filter values are non-functional in the saved-page context (no callbacks connected). This is a pre-existing design issue made more visually prominent by Plan 200.
- **Impact**: Minor UX inconsistency; filters were non-functional before Plan 200 too.
- **Recommendation**: Follow-up ticket to either hide the pill row via `showFilters={false}` prop, or accept as-is since Wer/Filter state doesn't affect saved items.

**[LOW] L3: Pre-existing ILIKE usage in suggestions query**
- **Location**: `src/features/search/components/SearchBar.tsx` (suggestions useEffect)
- **Issue**: Three `.ilike()` queries violate the project constraint "NEVER use ILIKE". Pre-existing code, not introduced by Plan 200.
- **Recommendation**: Follow-up ticket to replace with tsvector RPC calls.

### Info

**[INFO] I1: Suspense fallback has hardcoded English placeholder**
- **Location**: `src/features/search/components/SearchBar.tsx:562`
- **Issue**: `placeholder="Search in your Ummah"` in the fallback doesn't use `t()`. Pre-existing.

---

## Positive Observations

1. **Critic F1 advisory addressed**: `hidden md:flex` on the pill row correctly restricts secondary filters to desktop (≥768px). Mobile behavior unchanged.

2. **Clean unused variable removal**: Removed `router`, `language` variables and `useRouter` import — shows good cleanup discipline.

3. **`shrink-0` on icon + clear button**: Prevents layout collapse when search input is long. Correct defensive CSS.

4. **Submit button accessibility**: Visible text `{t('search.searchButton')}` serves as the accessible label (no redundant aria-label needed). Focus ring `focus:ring-2 focus:ring-primary/50` is appropriate.

5. **`transition-opacity` / `transition-colors`**: Consistent hover state feedback across location button, pill buttons, and submit button.

6. **Dropdown anchor adjustment**: Pill dropdowns correctly use `left-0` (instead of the primary bar's `right-0`), preventing off-screen overflow.

7. **i18n completeness**: All 6 locale files updated with `searchButton` key. Verified before and after fix-in-review.

---

## Fix-in-Review Summary

| Finding | Files Changed | Change Description                                              |
| ------- | ------------- | --------------------------------------------------------------- |
| H1      | 7 (6 locales + SearchBar.tsx) | Added `search.suggestions.*` keys; replaced hardcoded strings with `t()` |
| M1      | 1 (SearchBar.test.tsx) | Updated test selector `gap-0` → `gap-1`, updated test name     |

Both fixes verified with `get_errors()` — no type errors in modified files.

---

## Verdict

**Status**: APPROVED

**Rationale**: The implementation correctly delivers the Google Maps-style search bar layout. Plan requirements M1-M4 are all met. Two blocking issues were resolved via Fix-in-Review (H1 pre-existing i18n hardcodes, M1 test broken by M3 visual polish). The remaining LOW/INFO findings are pre-existing issues outside plan scope.

**Required Actions Before Merging**: None. All blockers resolved in Fix-in-Review.

**Deferred (follow-up tickets recommended)**:
- Replace ILIKE in suggestions with tsvector RPC (L3)
- Decide on Wer/Filter pill visibility on `/saved` page (L2)
- Update Suspense fallback visual to match new bar layout (L1)

---

## Next Steps

Implementation passes code review. Handing off to QA agent for test execution.

**QA focus areas**:
1. Visual: Desktop bar + pill row renders at ≥768px; pills hidden on mobile
2. Functional: Submit button triggers search; location/Wer/Filter dropdowns still work
3. i18n: "Suchen" button label correct in all locales
4. Test suite: Verify `SearchBar.test.tsx` passes (selector updated gap-0 → gap-1)
5. Cross-page: Verify `/saved` page bar renders correctly (pill row visible — LOW L2)
