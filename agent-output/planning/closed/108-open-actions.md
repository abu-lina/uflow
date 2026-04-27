---
ID: 108
Origin: 108
UUID: a2e8f6d3
Status: Committed
---

# Open Actions 108: Admin Listing Type Edit — Deferred Quality Improvements

## Summary

Plan 108 released two deferred quality improvements identified during code review (APPROVED_WITH_COMMENTS, 2 MEDIUM non-blocking findings). These items are not blocking for v0.10.38 release; English-language functional correctness is unaffected. Follow-up sprint work should address both.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| **DF-1: i18n Translation Keys** — New Section field labels ("Section (listing_type)", "Unclassified", "Food", "Business") in `ProviderEditForm.tsx` were hardcoded English strings. | Implementation Team | 2026-04-27 | Added `editProvider.sectionFieldLabel`, `editProvider.sectionUnclassified`, `editProvider.sectionFood`, `editProvider.sectionBusiness` across locale files and switched `ProviderEditForm.tsx` to `t()` for label/options/read-only value | Closed |
| **DF-2: Route Test Schema Mock Fidelity** — Route-level tests for `/api/admin/edit-provider` mocked `providerEditUpdateSchema` with UUID-only validation. | QA Team | 2026-04-27 | Enhanced mocked `providerEditUpdateSchema.parse` in route test to validate `listingType` enum (`food`, `business`, `null`) and added regression test for invalid value (`other`) returning HTTP 400 | Closed |

## Context

**Release**: v0.10.38 (2026-04-27)

**Code review verdict**: APPROVED_WITH_COMMENTS

**Finding severity**: MEDIUM — Quality, not correctness or security

**Why deferred**: 
- DF-1: i18n keys are an enhancement for multilingual UX; English-only test flows are unaffected; localization work requires coordinated translation update across multiple locale files
- DF-2: Service-layer tests already validate the full data flow; route-level test enhancement is test infrastructure improvement, not functional gap

**Release impact**: None — Functional correctness and security confirmed; English users unaffected; 19/19 regression tests pass

## Changelog

| Date (UTC) | Agent | Change |
|-----------|-------|--------|
| 2026-04-27 | devops | Created tracker from Plan 108 code review DF-1 (i18n) and DF-2 (route test) deferred findings |
| 2026-04-27 | implementer | Closed DF-1 and DF-2 with i18n key migration in `ProviderEditForm` and route schema mock fidelity regression hardening |
| 2026-04-27 | code-reviewer | Reviewed deferred-fix implementation; verdict APPROVED_WITH_COMMENTS; advanced plan status to Code Review Approved |
| 2026-04-27 | qa | Executed QA testing for DF-1 and DF-2; verified all test gates pass (1144 tests, 0 failures); regression tests confirmed passing; appended re-test section to QA doc; status advanced to QA Complete |
| 2026-04-27 | devops | Stage 1 commit for v0.10.40; status advanced to Committed; all lifecycle docs moved to closed/ |
