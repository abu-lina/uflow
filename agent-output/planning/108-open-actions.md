---
ID: 108
Origin: 108
UUID: a2e8f6d3
Status: Active
---

# Open Actions 108: Admin Listing Type Edit — Deferred Quality Improvements

## Summary

Plan 108 released two deferred quality improvements identified during code review (APPROVED_WITH_COMMENTS, 2 MEDIUM non-blocking findings). These items are not blocking for v0.10.38 release; English-language functional correctness is unaffected. Follow-up sprint work should address both.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| **DF-1: i18n Translation Keys** — New Section field labels ("Section (listing_type)", "Unclassified", "Food", "Business") in `ProviderEditForm.tsx` are hardcoded English strings. Should use LanguageProvider `t()` keys for multilingual consistency with the rest of the form. | Implementation Team | Next sprint / localization pass | Translation keys added to language provider for Section field labels; no hardcoded strings remain in `ProviderEditForm.tsx` lines 445-465 | Open |
| **DF-2: Route Test Schema Mock Fidelity** — Route-level tests for `/api/admin/edit-provider` mock `providerEditUpdateSchema` with loose validation (UUID-only). New `listingType` contract not validated at route level. Service-level tests compensate but route-level regression gap exists. | QA Team | Next sprint / test hardening PR | Route test enhanced to validate `listingType` enum: accepts 'food', 'business', null; rejects invalid values like 'other' | Open |

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
