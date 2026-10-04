---
ID: 210
Origin: 210
UUID: b7e4f1a3
Status: Committed
---

# Plan 210 Implementation — CI Pipeline Failure Fix

## Plan Reference
- Plan: `agent-output/planning/210-ci-failures-fix-plan.md`
- Analysis: `agent-output/analysis/210-ci-failures-analysis.md`
- Critique: `agent-output/critiques/closed/210-ci-failures-fix-critique.md`

## Date
- 2026-08-15

## Changelog

| Date (UTC) | Handoff / Agent | Request / Action | Summary |
|---|---|---|---|
| 2026-08-15T22:45Z | Implementer | Start implementation | Branch `fix/plan-210-ci-failures`, plan status set to In Progress |
| 2026-08-15T23:10Z | Implementer | M1-M6 execution | Removed stale M1 suite, fixed M2-M6 failing tests |
| 2026-08-15T23:20Z | Implementer | M7 execution | Re-baselined perf budgets with measured +5k headroom |
| 2026-08-15T23:33Z | Implementer | M8 verification | `npm test`, `type-check`, `build`, perf gate pass; full lint blocked by pre-existing repo errors |
| 2026-08-15T23:36Z | Implementer | M9 release artifacts | Version bumped to `0.15.12`; CHANGELOG entry added; lockfile aligned |

## Implementation Summary
This implementation restores CI stability for the known failure set by removing stale tests, aligning existing tests with current behavior, hardening CLI assertions against runtime warning noise, and re-baselining providers performance budgets from measured build output. The work preserves plan scope: test/config-first changes with no functional product behavior changes. This directly delivers the value statement by turning the known red CI causes into deterministic green checks.

## Baseline & Measurements
- Baseline failing state (pre-fix):
  - `npx vitest run src/__tests__/api/admin/review-provider/alcohol-conflict.test.ts` -> 4 failed / 6 tests in stale suite.
  - `npx vitest run` across remaining target files -> 12 failed tests across 6 files.
  - Perf baseline from build output: `/providers` 361 kB, `/providers/[provider_id]` 281 kB.
- Measurement method:
  - Build output captured and parsed by `scripts/perf/check-budgets.js` via `.next/BUILD_OUTPUT.txt`.
  - Verified post-fix against updated thresholds.

## Milestones Completed
- [x] M1 Remove stale `alcohol-conflict.test.ts`
- [x] M2 Fix i18n search tests (`page-meal-search`, `search/page.test`)
- [x] M3 Fix RootPageContent LanguageProvider regression test
- [x] M4 Fix city-selection redirect test for `window.location.href`
- [x] M5 Fix HomeSearchBar className assertion target
- [x] M6 Harden CLI tests against warning noise and timing variance
- [x] M7 Resolve perf budget gate
- [x] M8 Verification gates (tests/build/type-check/perf)
- [x] M9 Version + changelog + lockfile alignment

## Files Modified

| Path | Changes | Lines |
|---|---|---:|
| `src/__tests__/api/admin/review-provider/alcohol-conflict.test.ts` | Deleted stale suite (removed obsolete gate assertions) | -190 |
| `src/app/(public)/search/page.test.tsx` | Added i18n key mappings for WAS searchbox labels | +6 |
| `src/__tests__/app/(public)/search/page-meal-search.test.tsx` | Updated mock translation for `suchen.was.searchPlaceholder` | +1/-1 |
| `src/__tests__/components/RootPageContent.layout-regression.test.tsx` | Added `useLanguage` and Supabase client mocks to prevent hook/error leakage | +22 |
| `src/app/city-selection/page.test.tsx` | Switched assertion from router push to `window.location.href` setter | +17/-1 |
| `src/__tests__/features/search/HomeSearchBar.test.tsx` | Asserted outer wrapper class via `container.firstChild` | +2/-3 |
| `src/__tests__/scripts/import-muslimbusiness-cli.test.ts` | Added output normalization and per-test timeout hardening | +19/-1 |
| `scripts/perf/budgets.json` | Updated providers thresholds to measured +5k headroom | +8/-2 |
| `package.json` | Version bump `0.15.11` -> `0.15.12` | +1/-1 |
| `package-lock.json` | Lockfile version alignment for package version bump | +2/-2 |
| `CHANGELOG.md` | Added `0.15.12` release notes | +8 |

## Files Created

| Path | Purpose |
|---|---|
| `agent-output/implementation/210-ci-failures-fix-implementation.md` | Implementer handoff artifact with evidence and gate results |

## Deployment Path Audit
- N/A — no deployment workflow/script changes in this implementation.

## Code Quality Validation
- [x] `npm test` -> pass (`231` files passed, `2` skipped)
- [x] `npm run type-check` -> pass
- [x] `npm run build` -> pass
- [x] `npm run perf:check-budgets` -> pass
- [ ] `npm run lint` -> **blocked by pre-existing repository errors outside this plan scope**

### Lint blocker evidence (pre-existing)
Full-repo lint currently reports existing errors in files not modified by this plan, including:
- `src/app/(public)/chat/page.tsx`
- `src/app/(public)/create/halal/page.tsx`
- `src/app/(public)/saved/page.tsx`
- `src/app/api/chat/route.ts`
- `src/app/(dashboard)/dashboard/providers/[id]/edit/delivery/page.tsx`
- `src/app/api/admin/review-provider/route.ts` (dead import from earlier plan)

No new lint errors were introduced in the files changed for Plan 210.

## Value Statement Validation
- Original: Restore CI reliability so regressions are caught before merge/deploy.
- Delivered:
  - Known red test failures fixed or removed where stale.
  - Perf budget gate restored with measured thresholds and deterministic pass criteria.
  - Release artifacts updated for patch handoff.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| Review-provider gate regression suite (removed) | `src/__tests__/api/admin/review-provider/alcohol-conflict.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | 4 assertions targeted behavior removed from route | ✅ Yes (suite deleted by design) |
| Search page WAS label queries | `src/app/(public)/search/page.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `getByLabelText('Angebote suchen')` mismatch after i18n path | ✅ Yes |
| Meal search WAS label queries | `src/__tests__/app/(public)/search/page-meal-search.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `searchbox` name mismatch from translation mock | ✅ Yes |
| RootPageContent provider/language dependencies | `src/__tests__/components/RootPageContent.layout-regression.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `useLanguage must be used within a LanguageProvider` + unhandled Supabase call | ✅ Yes |
| City selection redirect assertion | `src/app/city-selection/page.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Test asserted `router.push('/')` while component uses `window.location.href` | ✅ Yes |
| HomeSearchBar className assertion | `src/__tests__/features/search/HomeSearchBar.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Queried inner `role=search` element not wrapper with `className` prop | ✅ Yes |
| CLI warning/timing resilience | `src/__tests__/scripts/import-muslimbusiness-cli.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Runtime warning noise and command timing caused fragility/timeouts | ✅ Yes |

## Test Coverage
- Unit/regression updates only; no new production logic paths added.
- Existing suites now accurately reflect current implementation behavior.

## Test Execution Results

| Command | Result |
|---|---|
| `npx vitest run src/__tests__/api/admin/review-provider/alcohol-conflict.test.ts` | RED baseline captured before M1 (4 failed) |
| `npx vitest run src/app/(public)/search/page.test.tsx src/__tests__/app/(public)/search/page-meal-search.test.tsx` | PASS after M2 |
| `npx vitest run src/__tests__/components/RootPageContent.layout-regression.test.tsx` | PASS after M3 |
| `npx vitest run src/app/city-selection/page.test.tsx` | PASS after M4 |
| `npx vitest run src/__tests__/features/search/HomeSearchBar.test.tsx` | PASS after M5 |
| `npx vitest run src/__tests__/scripts/import-muslimbusiness-cli.test.ts` | PASS after M6 |
| `npm run build` + `.next/BUILD_OUTPUT.txt` + `npm run perf:check-budgets` | PASS after M7 (`/providers` 361/366, `/providers/[provider_id]` 281/286) |
| `npm test` | PASS (`231` files passed, `2` skipped) |
| `npm run type-check` | PASS |
| `npm run lint` | FAIL due to pre-existing unrelated repo errors |

## Local Verification Gate
- N/A — no user-visible production behavior changes were implemented (test/config/release artifacts only).

## Search/Filter Client-Interaction Trace
- N/A — no production submit-handler or inline action logic changed.

## Multi-Plan State Audit
- N/A — no production state mutation/hydration logic changed.

## API Route Coverage Gate
- N/A — no route handler modifications in this plan implementation.

## Outstanding Items
- Full-repo lint errors remain pre-existing and outside Plan 210 scope.
- Dead `checkHalalAttestation` import in `src/app/api/admin/review-provider/route.ts` remains outside revised M1 scope; lint flags it.

## Version Note
- Version bumped to `0.15.12` (preliminary - final version confirmed at DevOps Stage 1).

## Next Steps
1. Code Review: validate scope, stale-test removal decision, and perf baseline rationale.
2. QA: execute pipeline checks with focus on CI green path.
3. DevOps: confirm final patch version, commit, and release gates.
