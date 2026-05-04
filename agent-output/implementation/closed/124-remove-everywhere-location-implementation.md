---
ID: 124
Origin: 124
UUID: 7f6a8e3b
Status: Released
---

# Implementation: Remove Everywhere Option from Providers Location Selector

## Plan Reference

- Session: S124-remove-everywhere-location
- Request source: User task summary in session header (no dedicated `agent-output/planning/124-*.md` artifact found in this worktree)

## Date

- 2026-05-04

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-05-04T10:41Z | User -> Implementer | Remove "Everywhere" from `/providers` location selector | Added regression-first test, removed all-locations option from `SearchContextBar`, kept canonical filtering behavior for real locations |

## Implementation Summary

The `/providers` location selector no longer exposes an all-locations option labeled "Everywhere" (or equivalent localized label) as a selectable value.

What changed:

1. Removed the `search.everywhere` usage and fallback string path from `SearchContextBar`.
2. Reworked empty-location display state to a neutral, non-selectable placeholder (`suchen.accordions.woEmpty`) in the select when there is no concrete city.
3. Kept existing provider filtering logic unchanged for real city values and URL navigation behavior.
4. Added/updated regression tests to assert that "Everywhere" is not present as an option and that empty-location UI is disabled/non-selectable.

How this delivers value:

- Users on `/providers` cannot select "Everywhere" from the location selector anymore.
- City-based filtering still works for real locations (e.g., Berlin).
- Existing legacy normalization (`Everywhere`/`Überall` in URL input) remains intact in SSR/API routes to avoid breaking old links.

## Baseline & Measurements

N/A — no performance/index/RPC changes in this scope.

## Milestones Completed

- [x] Add failing regression for `/providers` selector behavior (red phase)
- [x] Remove "Everywhere" selector option in providers header context bar
- [x] Keep city filtering behavior intact
- [x] Validate via targeted tests and repo gates
- [x] Produce implementation artifact

## Files Modified

| File Path | Changes | Lines |
| --- | --- | --- |
| `src/features/search/components/SearchContextBar.tsx` | Removed all-locations option/fallback label; added disabled empty placeholder behavior; guarded no-op placeholder changes | ~20 |
| `src/features/search/components/SearchContextBar.test.tsx` | Added regression assertion that no Everywhere option is exposed; updated empty-location expectations | ~15 |
| `src/components/providers/ProvidersPageHeader.test.tsx` | Removed no-longer-used `search.everywhere` mock key | 1 |

## Files Created

| File Path | Purpose |
| --- | --- |
| `agent-output/implementation/124-remove-everywhere-location-implementation.md` | Implementation artifact for Session 124 |

## Deployment Path Audit

N/A — no deployment surface changed.

## Code Quality Validation

- [x] Lint: `npm run lint` (pass; warnings only, no errors)
- [x] Type-check: `npm run type-check` (pass)
- [x] Tests: `npm test -- --run` (pass)
- [x] Targeted regression tests:
  - `npx vitest run src/features/search/components/SearchContextBar.test.tsx src/components/providers/ProvidersPageHeader.test.tsx src/__tests__/app/providers-page-location.test.tsx` (pass)
- [ ] Build: `npm run build` (blocked by missing `NEXT_PUBLIC_SUPABASE_URL` in this worktree environment during page-data collection for badge routes)

## Local Verification

- Local verification: ⚠️ Blocked
- Blocker: No browser-flow execution recorded in this session; only automated tests were executed.

## Value Statement Validation

Original requested outcome:

- "The 'Everywhere' location value must not appear as a selectable option on /providers"
- "Any hardcoded string 'Everywhere' or equivalent translation keys for it should be removed"
- "Existing provider filtering logic must still work correctly for other locations"

Validation:

- `/providers` selector no longer renders "Everywhere" / "Überall" option entries.
- `SearchContextBar` no longer depends on `search.everywhere` for `/providers` selector rendering.
- Existing real-city filtering path remains unchanged and covered by existing providers-page tests.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `SearchContextBar` (providers location selector behavior) | `src/features/search/components/SearchContextBar.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Expected failure: `Everywhere` option still present in DOM before fix | ✅ Yes |

## Test Coverage

- Regression coverage for `/providers` location selector option list behavior (`SearchContextBar.test.tsx`)
- Providers SSR normalization coverage remains passing (`providers-page-location.test.tsx`)
- Providers header composition coverage remains passing (`ProvidersPageHeader.test.tsx`)

## Test Execution Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx vitest run src/features/search/components/SearchContextBar.test.tsx` (red phase) | ❌ Failed as expected | `Everywhere` option was found in DOM |
| `npx vitest run src/features/search/components/SearchContextBar.test.tsx src/components/providers/ProvidersPageHeader.test.tsx` | ✅ Pass | 10/10 tests passed |
| `npx vitest run src/features/search/components/SearchContextBar.test.tsx src/components/providers/ProvidersPageHeader.test.tsx src/__tests__/app/providers-page-location.test.tsx` | ✅ Pass | 15/15 tests passed |
| `npm run lint` | ✅ Pass | 58 pre-existing warnings, 0 errors |
| `npm run type-check` | ✅ Pass | No type errors |
| `npm test -- --run` | ✅ Pass | 155 files passed, 2 skipped; 1236 tests passed |
| `npm run build` | ⚠️ Blocked | Missing `NEXT_PUBLIC_SUPABASE_URL` in environment |

## Search/Filter Client-Interaction Trace

- URL lifecycle: selector still preserves section and writes/removes only `location` via existing `handleLocationChange` logic — ✅
- Inline action entity-type guard: N/A — no mixed-entity inline action changes in this scope.

## Multi-Plan State Audit

N/A — no prior-plan state hydration or derived-state mutation logic was altered in this change.

## Outstanding Items

- Full production build gate is environment-blocked in this local worktree due missing Supabase URL variable for unrelated badge route page-data collection.

## Next Steps

1. Push branch `session/124-remove-everywhere-location` for PR creation.
2. QA/UAT should run browser verification on `/providers` to confirm no all-locations selector option appears and city filtering still behaves as expected.
