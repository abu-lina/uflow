---
ID: 172
Origin: 172
UUID: c4d8f2a1
Status: Active
---

# QA Report: Search Location Filter Persistence Bugfix (Plan 172)

**Date**: 2026-06-13
**QA Agent**: Automated

---

## 1. QA Verdict

**APPROVED** — ready for deployment.

All 18 tests pass, TypeScript compiles cleanly, all acceptance criteria are met, and bugfix handoff completeness requirements are satisfied.

---

## 2. Test Results

| File | Tests | Status |
|------|-------|--------|
| `providers-content-location-resolution.test.tsx` | 6 | ✅ All pass |
| `search-page-storage.test.tsx` | 3 | ✅ All pass |
| `plan172-location-persistence.test.tsx` | 3 | ✅ All pass |
| `providers-content.layout-regression.test.tsx` | 1 | ✅ Pass |
| `providers-page-location.test.tsx` | 5 | ✅ All pass |
| **Total** | **18** | **✅ 18/18 pass** |

```bash
npx vitest run ... --reporter=verbose
# Test Files  5 passed (5)
#      Tests  18 passed (18)
```

**TypeScript**: `npx tsc --noEmit` → clean (no output)

---

## 3. Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| AC1 | User can remove location filter and search nationwide | ✅ **Pass** | Fix A: no location param → `LOCATION_ALL` (`''`) instead of falling through to stale context. Test: `providers-content-location-resolution.test.tsx:174` — stale context "Stuttgart" ignored. |
| AC2 | Removing a filter value clears it from URL and state | ✅ **Pass** | Fix A: `rawLocationParam === null → LOCATION_ALL`. Fix C: `handleWoClearSelection` and "Clear all" clear both localStorage and sessionStorage. Tests: `search-page-storage.test.tsx` — storage cleaned + flag set. |
| AC3 | Going back to filters shows cleared state, not stale values | ✅ **Pass** | Fix B: session guard (`uflow:wo-cleared-this-session`) prevents re-hydration on remount. Test: `plan172-location-persistence.test.tsx:155` — remount with flag does not re-hydrate. |
| AC4 | Tests cover the filter-clearing regression path | ✅ **Pass** | Regression test at `plan172-location-persistence.test.tsx` explicitly simulates the bug path: hydrate → clear → remount → verify no re-hydration. Test name follows `[pre-fix FAILS, post-fix PASSES]` convention. |

---

## 4. Bugfix Handoff Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Implementation doc present and populated | ✅ | `agent-output/implementation/172-search-location-filter-persistence-fix.md` |
| TDD Compliance table completed | ✅ | 12 test cases, 12 rows, all ✅ Pass |
| Regression tests for actual bug path | ✅ | `plan172-location-persistence.test.tsx` — tests the exact stale-context regression path |
| Test evidence recorded (vitest, tsc) | ✅ | Both vitest output and tsc clean compile recorded in implementation doc |

---

## 5. Manual Test Plan Review

The plan (Section "Manual QA Steps") defines 5 test scenarios:

| Test | What it covers | Adequate? |
|------|---------------|-----------|
| Test 1 | Primary bug — location filter persistence | ✅ Covers the full regression path: search with location → clear → search without location → results show all → back to search shows empty Wo |
| Test 2 | Secondary bug — storage re-hydration on return | ✅ Verifies session guard prevents re-hydration on back-nav, but new page refresh re-hydrates correctly |
| Test 3 | Onboarding city next session | ✅ Verifies onboarding data survives across sessions and clear+refresh behavior |
| Test 4 | "Clear all" button regression | ✅ Verifies Wo is empty after clear all and stays empty on return |
| Test 5 | Normal location filter still works | ✅ Verifies `?location=München`, `?location=Everywhere`, and no-location all work |

**Assessment**: The 5 test scenarios cover all edge cases. No gaps identified. Consider adding a note in Test 3 step 4b to clarify that localStorage was cleared in step 3, so the city will be empty (this is already correct in the table).

---

## 6. Findings

### From Code Review (LOW findings)

| Finding | Severity | Status | QA Assessment |
|---------|----------|--------|---------------|
| LOW-1: Missing `defaultLocation` test case | LOW | **Defer** | The `defaultLocation` branch (`defaultLocation ?? normalizedUrlLocation`) is the simplest logic path — `defaultLocation` is first in `??` and trivially correct. Unlikely to break. Not a release blocker. |
| LOW-2: Mock missing `LOCATION_ALL` export | LOW | **Defer** | The layout regression test URL always has `location=Berlin`, so `LOCATION_ALL` is never hit. Fragile but not currently broken. Not a release blocker. |
| INFO-1: Redundant `cleanup()` + `unmount()` | INFO | **Defer** | No functional impact. Cosmetic. |
| INFO-2: Missing final `?? LOCATION_ALL` fallback | INFO | **Defer** | `normalizedUrlLocation` always resolves to a string (either `LOCATION_ALL` or a city name). Theoretical `undefined` impossible in practice. |

**Decision**: All 4 findings are non-blocking. Code reviewer already classified these as LOW/INFO and approved. No changes required before deployment.

### QA-Identified Findings

None.

---

## 7. Overall Assessment

**Verdict**: APPROVED

The implementation correctly fixes all three root causes identified in the analysis:

1. **Fix A** (ProvidersContent.tsx:131-137) — Removes stale context fallback from location resolution chain. URL is now the sole source of truth. When no `location` param is present, resolves to `LOCATION_ALL` (`''`).

2. **Fix B** (search/page.tsx:351-362) — Adds session guard to prevent re-hydration of cleared location on remount. Onboarding data preserved for future sessions.

3. **Fix C** (search/page.tsx:504-507, 736-748) — Clears persistent storage and sets session flag on both `handleWoClearSelection` and "Clear all".

Three new test files (18 tests total) cover all specified cases including the exact bug regression path. TypeScript compiles clean. No HIGH or CRITICAL findings. Manual QA plan is comprehensive with 5 test scenarios covering all edge cases.

**This is ready for deployment.**
