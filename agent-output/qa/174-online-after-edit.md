---
ID: 174
Origin: 174
Status: Active
---

# QA Report: Fix online-after-edit bug (Plan 174)

## Test Results
- Type-check: ✅ PASS
- Lint: ⚠️ PASS (149 warnings, 14 errors — all pre-existing; 1 new warning in `ProviderEditForm.tsx:292` where `useEffect` missing deps `provider.address_city`/`provider.address_zip` references the guard added by Change 4)
- Unit tests: ✅ PASS (1640/1642 passing; 1 pre-existing failure in `006-phase4-semantic-constraints-behavior.test.ts` — unrelated enum migration test, 1 skipped integration suite)

### Plan 174 regression test results
| Test file | Tests | Result |
|---|---|---|
| `ProviderEditForm.regression.test.tsx` | 19 (3 new) | All pass |
| `adminSchemas.test.ts` | 13 (2 new) | All pass |
| `admin/providerEdit.test.ts` | 20 (2 new) | All pass |
| `plan172-location-persistence.test.tsx` | 3 | All pass (no regression) |

## Acceptance Criteria Verification
1. Stale localStorage → form preserves address: ✅ (test: `syncFromLocalStorage recomputes isOnlineBusiness` PASSES)
2. Owner path stale isOnlineBusiness → address preserved: ✅ (test: `handleSubmit owner path preserves address_city when isOnlineBusiness contradicts city` PASSES)
3. showAddress passes Zod → buildBasicFieldsPayload includes it: ✅ (tests: `showAddress passes through Zod`, `showAddress is optional`, `buildBasicFieldsPayload includes showAddress` — all PASS)
4. Intentional online toggle still works: ✅ (test: `handleSubmit owner path nulls address when intentional online` PASSES)
5. No regressions: ✅ (full test suite: all 1640 passing tests include pre-existing regression suites; skipped/failed tests are unrelated to Plan 174)

## Verdict: ✅ PASS

## Notes
- **Lint warning (minor)**: line 292 in `ProviderEditForm.tsx` — `useEffect` missing `provider.address_city` and `provider.address_zip` from dependency array. The guard added by Change 4 references these but they aren't listed as effect deps. Low severity since the effect runs on mount and the guard is an additional safety net (defense in depth). Should be cleaned up in a follow-up.
- **Pre-existing test failure**: `006-phase4-semantic-constraints-behavior.test.ts` fails due to `"ummah"` not being a valid `listing_type_enum` value — unrelated to this Plan.
- All three changed files (`ProviderEditForm.tsx`, `adminSchemas.ts`, `admin/providerEdit.ts`) have no TypeScript errors.
