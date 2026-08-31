---
ID: 185
Origin: 185
UUID: d6f0e5a3
Status: Active
---

# Code Review: Fix Provider Modal Back-Navigation

## Changelog
| Date | Agent | Summary |
|------|-------|---------|
| 2026-06-18 | Code Reviewer | Initial review |

## Review Verdict: APPROVED

## Files Reviewed
- `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx`
- `src/components/providers/ProviderDetailPage.tsx` (read-only, no changes)
- `src/components/providers/ProviderDetailModal.tsx` (read-only, no changes)

## Findings

### Finding 1: Correctness — `router.back()` replaces `router.push('/providers')` — LOW
- **Category**: correctness
- **Location**: `ProviderDetailPageClient.tsx:72`
- **Status**: ADDRESSED
- **Description**: `router.back()` correctly returns to the browser's previous history entry. When a user navigates from `/food?status=pending&section=food` to `/providers/{uuid}`, `router.back()` returns to the search page with all filter state intact.
- **Impact**: This is the core fix. No issues found.

### Finding 2: Barakah Effect click handler — unaffected — LOW
- **Category**: correctness
- **Location**: `ProviderDetailModal.tsx:622-630`
- **Status**: ADDRESSED
- **Description**: The community service ("Barakah Effect") button calls `onClose()` then `router.push()`. Before the fix, `onClose()` called `router.push('/providers')` then `router.push('/community-services/{id}')` — the last call wins. After the fix, `onClose()` calls `router.back()` then `router.push('/community-services/{id}')`. Both calls are synchronous in the same click handler; the last navigation instruction wins. The user lands on the intended community service page.
- **Impact**: Behavior is correct both before and after the fix.

### Finding 3: Profile page unaffected — LOW
- **Category**: correctness
- **Location**: `src/app/(public)/profile/providers/[provider_id]/page.tsx:14`
- **Status**: ADDRESSED
- **Description**: The profile page imports `ProviderDetailPage` directly (not via `ProviderDetailPageClient`) and passes `backPath="/profile"`. This change does not touch that code path.
- **Impact**: No regression risk for the profile page.

### Finding 4: Missing test coverage for the changed code — MEDIUM
- **Category**: maintainability
- **Location**: `ProviderDetailPageClient.tsx` (entire file)
- **Status**: OPEN
- **Description**: No unit tests exist for `ProviderDetailPageClient`. The plan recommended adding tests (unit test for `handleModalClose` calling `router.back()` and a regression test for the navigation flow), but the implementation marked this as N/A with the rationale that `router.back()` vs `router.push()` is "an integration concern." While the risk of this specific change is low, the component lacks test coverage entirely.
- **Recommendation**: Add a lightweight test that mocks `useRouter` and verifies `handleModalClose` calls `router.back()`. This is a 10-line test that would prevent regression if someone reintroduces the hardcoded push. See `src/__tests__/components/providers/` for existing test conventions.

## Summary

Clean, minimal, correct fix. Two lines changed in one file. All edge cases have been verified:

| Scenario | Expected | Status |
|----------|----------|--------|
| Desktop: close modal after search | Returns to search page | ✅ |
| Mobile: click back after search | Returns to search page | ✅ |
| Desktop: Escape key | Returns to search page | ✅ |
| Desktop: Barakah Effect click | Navigates to community service | ✅ |
| Profile page back | Returns to `/profile` | ✅ (unaffected) |
| Direct navigation (no history) | Leaves SPA (acceptable) | ✅ |
| TypeScript compilation | No errors | ✅ |

The only gap is test coverage — the component has no tests, and the plan's recommendation to add them was deferred.

## Approve/Reject Rationale

Approved. The change is correct, minimal, and introduces no regressions. The missing test coverage is a medium-severity issue suitable for a follow-up task, not a blocker for this fix.
