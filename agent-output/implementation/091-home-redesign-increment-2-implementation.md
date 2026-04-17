---
ID: 091
Origin: 091
UUID: b4e8c3f2
Status: Active
---

# Implementation: 091 — Home Redesign Increment 2: SectionSelector Visual + /suchen Stub

## Plan Reference

- **Plan**: [agent-output/planning/091-home-redesign-increment-2-plan.md](../planning/091-home-redesign-increment-2-plan.md)
- **Critique**: [agent-output/critiques/091-home-redesign-increment-2-critique.md](../critiques/091-home-redesign-increment-2-critique.md)
- **GitHub Issue**: https://github.com/abu-lina/uflow/issues/145
- **Implementation Date**: 2026-04-17

---

## Changelog

| Date               | Handoff                      | Request                   | Summary                                                                      |
| ------------------ | ---------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| 2026-04-17T17:00Z  | Planner → Implementer        | TDD-first implementation  | M1-M4 complete; all gates passed (lint, type-check, 1008 tests)             |
| 2026-04-17T17:30Z  | Code Reviewer → Implementer  | Fix blocking findings     | Fixed back-nav fallback + added regression test; 1009 tests pass             |

---

## Implementation Summary

Implemented Plan 091 — Home Redesign Increment 2 per approved plan + Critic revisions (F1/F2/F3).

**Deliverables**:
1. **M1 (SectionSelector restyle)**: Tailwind-only visual update — white rounded container (`bg-background`), teal active tabs (`bg-primary`), Inter Tight font, matching Figma teal-pill design
2. **M2 (/suchen stub page)**: New dedicated search page with `<Suspense>` boundary, back-button home fallback, 4 accordions (Was? open by default), styled bottom bar (no-op)
3. **M3 (HomeSearchBar URL)**: URL changed from `/providers?section=...` to `/suchen?section=...`
4. **M4 (CHANGELOG)**: Amended existing v0.10.19 section with Plan 091 entries

**How this delivers the value statement**: Mobile users now see polished, on-brand teal-pill section tabs (discovery feels complete/professional) and can tap the search bar to land on a dedicated search page (clearly navigable entry point).

**Version**: Bundled with Plan 090 at v0.10.19 (no additional bump per plan).

---

## Milestones Completed

- [x] **M1**: SectionSelector visual redesign (Tailwind classes only)
- [x] **M2**: `/suchen` stub page created (TDD — 6 tests written first, all pass)
- [x] **M3**: HomeSearchBar URL updated (9 tests updated, all pass)
- [x] **M4**: CHANGELOG amended (Plan 091 entries added to v0.10.19 section)

---

## Code Review Iteration

**Review Date**: 2026-04-17T17:30Z  
**Review Artifact**: [agent-output/code-review/091-home-redesign-increment-2-code-review.md](../code-review/091-home-redesign-increment-2-code-review.md)  
**Verdict**: REJECTED → Fixes Applied → Ready for Re-Review

### Findings Addressed

#### HIGH Finding: Back-button fallback blocked by preventDefault

**Issue**: Original implementation wrapped back button in `<Link href="/">` but used `e.preventDefault()` in click handler, which blocked Link's fallback navigation when browser history was empty (direct URL access).

**Location**: `src/app/(public)/suchen/page.tsx` lines 59-67 (original implementation)

**Fix Applied**:
- Removed `Link` wrapper and `preventDefault()` call
- Implemented explicit history-check logic: `window.history.length > 1 ? router.back() : router.push('/')`
- This ensures fallback navigation to `/` always works when history is empty
- Also removed unused `Link` import from file

**Files Modified**:
- `src/app/(public)/suchen/page.tsx` (lines 1-72): Removed Link import, changed header button to use explicit fallback logic

#### MEDIUM Finding: Missing regression test for empty-history fallback

**Issue**: Original test only verified `router.back()` was called; did not test required fallback behavior for direct URL access (empty history).

**Location**: `src/__tests__/app/(public)/suchen/page.test.tsx` lines 80-86 (original test)

**Fix Applied**:
- Split original test into two: one for history-present scenario, one for empty-history scenario
- Added regression test that mocks `window.history.length = 1` (direct URL) and asserts `router.push('/')` is called
- Both tests now pass and guard against future regressions

**Files Modified**:
- `src/__tests__/app/(public)/suchen/page.test.tsx` (lines 80-107): Replaced single test with two comprehensive tests

### Quality Gates Re-Run

✅ **Lint**: Exit 0 (0 errors, 31 warnings pre-existing)  
✅ **Type-check**: Exit 0 (no TypeScript errors)  
✅ **Tests**: **1009 tests passed** | 18 skipped (1027 total) — 1 new regression test added  
✅ **Duration**: ~14s

### Post-Fix Validation

- All Critique F1 acceptance criteria now met (back button works for both in-app nav and direct URL)
- No regressions introduced — all existing 1008 tests still pass
- New test provides permanent coverage for empty-history fallback path

---

## Files Modified

| File Path                                                                             | Changes                                                                                   | Lines Changed |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------- |
| `src/features/search/components/SectionSelector.tsx`                                  | Tailwind classes: container → `bg-background h-14 rounded-2xl border`; tabs → `h-10 rounded-xl font-inter-tight`; active → `bg-primary text-white`; inactive → `text-neutral-500` | ~10           |
| `src/features/search/components/HomeSearchBar.tsx`                                    | URL change: `/providers?section=...` → `/suchen?section=...`; JSDoc updated (D7)         | ~5            |
| `src/__tests__/features/search/HomeSearchBar.test.tsx`                                | Test expectations updated: all `/providers` → `/suchen`                                   | ~10           |
| `src/translations/de.ts`                                                               | Added `suchen.*` i18n keys (title, accordions, clearAll, searchButton)                   | +13           |
| `src/translations/en.ts`                                                               | Added `suchen.*` i18n keys (English)                                                      | +13           |
| `src/translations/ar.ts`                                                               | Added `suchen.*` i18n keys (Arabic)                                                       | +13           |
| `src/translations/tr.ts`                                                               | Added `suchen.*` i18n keys (Turkish)                                                      | +13           |
| `src/translations/ur.ts`                                                               | Added `suchen.*` i18n keys (Urdu)                                                         | +13           |
| `src/translations/ps.ts`                                                               | Added `suchen.*` i18n keys (Pashto)                                                       | +13           |
| `CHANGELOG.md`                                                                         | Added Plan 091 entry under `[0.10.19]` section                                            | +10           |
| `src/config/feature-flags.ts`                                                          | Removed duplicate `forceMobileFooter` key (pre-existing lint error blocking handoff)      | -1            |
| `src/app/(public)/suchen/page.tsx` **(Code Review fix)**                              | Removed Link wrapper + preventDefault; added explicit history-check fallback logic        | ~10           |
| `src/__tests__/app/(public)/suchen/page.test.tsx` **(Code Review fix)**               | Split back-button test into two: history-present + empty-history regression test          | ~25           |

---

## Files Created

| File Path                                                      | Purpose                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/app/(public)/suchen/page.tsx`                             | Dedicated search stub page (client component) with Suspense wrapper, SectionSelector, 4 accordions |
| `src/__tests__/app/(public)/suchen/page.test.tsx`              | TDD tests for /suchen page (6 tests — written before implementation)                             |

---

## Code Quality Validation

- [x] **Compilation**: TypeScript compilation clean (`npm run type-check` — exit 0)
- [x] **Linting**: ESLint clean (`npm run lint` — exit 0; 31 warnings pre-existing)
- [x] **Tests**: All 1009 tests pass (`npx vitest run` — 1 new regression test added in Code Review iteration)
- [x] **Compatibility**: No breaking changes — CategoryGallerySection still navigates to `/providers`
- [x] **Pre-existing issues fixed**: Removed duplicate `forceMobileFooter` key in `feature-flags.ts` to unblock lint gate

---

## Value Statement Validation

**Original Value Statement** (from plan):
> **As a** UFlow mobile user browsing the home screen, **I want** the section tabs (Food / Ummah / Stores) to have a polished, on-brand teal-pill design and be able to tap the search bar to land on a dedicated search page, **so that** the discovery surface feels complete, professional, and clearly navigable — matching the approved Figma design.

**Implementation Delivers**:
- ✅ **Polished teal-pill tabs**: SectionSelector now uses `bg-primary` (teal), `h-10 rounded-xl`, Inter Tight font — matches Figma nodes 209:313/386/454
- ✅ **Dedicated search page**: `/suchen` page exists; HomeSearchBar navigates there on tap
- ✅ **Complete discovery surface**: All 4 planned accordion sections render (Was?/Wo:/Wer:/Filter)
- ✅ **Professional & navigable**: Back button always works (home fallback), section param preserves context

**Verdict**: Value statement fully delivered.

---

## TDD Compliance

**TDD applied to M2 (/suchen page)** — new component requiring TDD.

| Function/Class            | Test File                                          | Test Written First? | Failure Verified? | Failure Reason                                      | Pass After Impl? |
| ------------------------- | -------------------------------------------------- | ------------------- | ----------------- | --------------------------------------------------- | ---------------- |
| `SuchenPage` (M2)         | `src/__tests__/app/(public)/suchen/page.test.tsx` | ✅ Yes              | ✅ Yes            | `Failed to resolve import` (module doesn't exist)  | ✅ Yes           |
| Back fallback (CR fix)    | `src/__tests__/app/(public)/suchen/page.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `expect(mockPush).toHaveBeenCalledWith('/')` failed (fallback not implemented) | ✅ Yes |

**TDD Gate Evidence**:
```
Test fails as expected: "Failed to resolve import @/app/(public)/suchen/page"
Reason: Page component doesn't exist yet (correct TDD red phase)
```

After implementation: All 6 /suchen page tests pass.

**Code Review iteration**: Added regression test for empty-history fallback behavior (test written, confirmed failure reason was fallback not implemented, then fixed implementation to make test pass).

**M1/M3 exceptions**: M1 is a pure CSS refactor of existing component (no new logic). M3 is a 1-line URL change in existing function (tests updated, not new API).

---

## Test Coverage

### New Tests

- **7 new tests** for `/suchen` page:
  1. Renders page with header, section selector, accordions, and bottom bar
  2. Reads section from URL params and initializes SectionSelector
  3. ~~Back button navigates to home on click~~ **(Replaced in Code Review iteration)**
  4. **Back button calls router.back() when history exists** (Code Review fix)
  5. **Back button navigates to home when history is empty (regression test)** (Code Review fix)
  6. Was? accordion is open by default
  7. Clicking an accordion header toggles its visibility
  8. Bottom bar buttons are present but non-functional

### Updated Tests

- **9 HomeSearchBar tests** updated (URL assertions `/providers` → `/suchen`)
- **0 SectionSelector tests** updated (existing tests don't assert on CSS classes)

### Regression Coverage  

- All 1008 existing tests still pass (post Code Review fixes)
- 1 new regression test added for empty-history fallback (total: 1009 tests)
- No test removals or skips

---

## Test Execution Results

### Command

```bash
npx vitest run
npm run lint  
npm run type-check
```

### Results

**Test Suite**:
- Test Files: 108 passed | 1 skipped (109)
- Tests: **1009 passed** | 18 skipped (1027)
- Duration: ~14s (post Code Review fixes)

**Lint**: Exit 0 (0 errors, 31 warnings pre-existing)  
**Type-check**: Exit 0 (no TypeScript errors)

### Issues

None. All gates passed.

### Coverage

New page covered by 6 dedicated tests. HomeSearchBar URL change covered by existing 9 tests (updated). Visual changes (M1) rely on visual QA + existing behavioral tests.

---

## Outstanding Items

~~Code Review findings (2 items):~~
- ~~HIGH: Back-button fallback blocked by preventDefault~~ **✅ FIXED** (2026-04-17T17:45Z)
- ~~MEDIUM: Missing regression test for empty-history fallback~~ **✅ FIXED** (2026-04-17T17:45Z)

**Current status**: All findings resolved. Ready for Code Review re-submission.

---

## Next Steps

1. **⑥ Code Reviewer (Re-Review)**: Code Review findings addressed. Resubmit for re-review.
2. **⑦ QA**: After code review passes, QA to verify:
   - SectionSelector visual appearance matches Figma teal-pill design
   - `/suchen` page renders correctly (4 accordions, bottom bar)
   - HomeSearchBar navigates to `/suchen` (not `/providers`)
   - **Back button navigates home when no history (direct URL access)** ← Code Review fix validation
   - Back button navigates back when history exists (in-app navigation) ← Code Review fix validation
   - CategoryGallerySection still navigates to `/providers` (unchanged)
3. **⑧ UAT**: After QA passes, UAT to approve value delivery
4. **⑨ DevOps**: Merge session branch, confirm v0.10.19 version, deploy

---

## Cross-Layer Integration Self-Check

**New route verification**: `/suchen` page created.
- **Caller exists**: HomeSearchBar navigates to `/suchen?section=...` ✅
- **Parameter consumed**: `/suchen` page reads `?section=` via `useSearchParams()` and initializes SectionSelector ✅

**Evidence**: Test `reads section from URL params and initializes SectionSelector` verifies param is consumed.

---

## Local Verification Gate

**N/A** — This change is primarily Tailwind CSS styling + new stub page with no backend logic. Visual QA by QA agent is the appropriate verification path (not blocked on local dev env).

---

## Search/Filter Client-Interaction Trace

**N/A** — No form submit handlers or mixed-entity result lists modified. SectionSelector tab change updates local state only (no navigation). HomeSearchBar navigates to a fixed route.

---

## API Route Coverage Gate

**N/A** — No new or modified API route handlers in this plan.

---

**Implementation Status**: ✅ COMPLETE  
**Handoff**: Ready for **⑥ Code Reviewer**

