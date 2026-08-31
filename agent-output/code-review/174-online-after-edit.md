---
ID: 174
Origin: 174
Status: Active
---

# Code Review: Fix online-after-edit bug (Plan 174)

## Verdict: APPROVED

## Summary

All four changes match the plan exactly. The operator asymmetry in `syncFromLocalStorage` (Change 1) and the `handleSubmit` guard (Change 2) are the core fixes — both correctly prevent stale `isOnlineBusiness` from corrupting populated address data. The Zod schema addition (Change 3) and the defense-in-depth guard (Change 4) are correctly implemented. Tests cover the stale-localStorage scenario, intentional online save, `showAddress` validation, and `buildBasicFieldsPayload` mapping. No blockers.

## Findings

| # | Severity | File | Issue | Status |
|---|----------|------|-------|--------|
| 1 | NOTE | `ProviderEditForm.tsx:278` | Change 1 recomputes `isOnlineBusiness` from merged address fields. Matches plan. | Closed |
| 2 | NOTE | `ProviderEditForm.tsx:430-434` | Change 2 adds `&& !submitData.<field>` guard for all 5 address fields (street, zip, city, country, show_address). The `show_address` guard uses `!submitData.city` per plan spec — functionally correct (hiding address requires no city) but asymmetrical with the other 4 fields. | Closed |
| 3 | NOTE | `adminSchemas.ts:75` | Change 3 adds `showAddress: z.boolean().optional()` after `addressCountry`. Matches plan. | Closed |
| 4 | NOTE | `ProviderEditForm.tsx:286-289` | Change 4 adds inline guard after the merge block. Checks `parsed.isOnlineBusiness` against `provider.address_city/zip`. Matches plan Option A. No direct test for the guard-only path (overlaps with Change 1 test). | Open |
| 5 | MINOR | `ProviderEditForm.regression.test.tsx` | Guard (Change 4) is only tested implicitly via Change 1's test. A dedicated test for the guard catching edge cases Change 1 misses would be stronger but not required — the guard is defense-in-depth. | Open |

## Recommendations

1. **No action needed** — all changes are correct and match the plan. The only uncovered path (guard-only behavior) overlaps with Change 1's fix and would require a synthetic scenario to isolate.
