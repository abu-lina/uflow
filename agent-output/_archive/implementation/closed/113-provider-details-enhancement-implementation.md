---
ID: 113
Origin: 113
UUID: 7e2f4a91
Status: Committed
---

# Implementation 113 — Provider Details Page Full UI Enhancement

## Plan Reference

- Plan: `agent-output/planning/113-provider-details-enhancement.md`
- Classification: Feature
- Value statement: richer provider details with open status, structured sections, and halal trust UI across both mobile and desktop paths.

## Date

- 2026-04-28

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-04-28T21:52Z | Planner -> Implementer | Execute approved Plan 113 | Started implementation with TDD-first cycle for opening status + provider detail enhancement coverage |
| 2026-04-28T22:01Z | Implementer | Static gates rerun after TS fix | Type-check green; build now fails only on missing Supabase env var during Next page-data collection |
| 2026-04-28T22:10Z | Code Reviewer -> Implementer | Address rejected review findings | Fixed overnight status carry-over logic, added popup focus trap, and added nearby-loading state with regression tests |
| 2026-04-28T23:21Z | Code Reviewer -> Implementer | Address interaction-layer scroll findings before QA | Restored swipe drag-session gating with regression test and removed desktop `touchAction: 'pan-x'` on provider hero to preserve vertical scroll |
| 2026-04-28T23:29Z | Code Reviewer -> Implementer | Address pre-QA quality blocker in badges fallback | Fixed 42703 compatibility fallback in server badge query with independent builder paths and added regression coverage |

## Implementation Summary

Implemented all core Plan 113 feature work in both provider detail render paths:

- Added new `opening_hours` schema support and TypeScript model.
- Added open/closed status computation utility with defensive parsing.
- Added reusable provider-detail feature components:
  - open status line
  - accordion sections (values, offers, opening hours, feedback placeholder, proofs, nearby city providers)
  - halal trust banner
  - halal trust popup with global localStorage view counter (first 10 opens)
- Integrated all new components in both:
  - `src/components/providers/ProviderDetailPage.tsx`
  - `src/components/providers/ProviderDetailModal.tsx`
- Added targeted regression tests covering open status behavior and UI enhancement rendering/popup persistence.

This delivers the plan value by increasing information density and trust signals while preserving existing provider detail functionality.

Code-review remediation completed for all raised findings:
- Fixed overnight post-midnight open-state carry-over in `getOpenStatus()`.
- Implemented keyboard focus trap in `HalalTrustPopup` (Tab/Shift+Tab cycle + initial focus).
- Added loading state for nearby providers section to prevent premature empty-state messaging.
- Restored active drag-session gating in `useImageSwipe` so move handlers do not call `preventDefault()` outside a real drag.
- Removed desktop provider hero horizontal-only `touchAction` policy to keep touch vertical panning available.
- Fixed `getBadgesForEntityServer()` fallback path so missing `provider_badges.is_active` cleanly retries with a fresh query that excludes the invalid filter.

## Baseline & Measurements

- Baseline bundle/LCP measurements: deferred.
- Reason: no measurement run was part of this implementation pass; owner should capture in QA/UAT/DevOps verification lane.
- Follow-up owner: DevOps + QA.

## Milestones Completed

- [x] M1 Database schema + types
- [x] M2 Open status logic + UI line
- [x] M3 Six accordion sections
- [x] M4 Halal trust banner
- [x] M5 Halal trust popup + persistence
- [x] M6 Integration/regression checks
- [ ] M7 Version management (not executed in this pass)

## Files Modified

| Path | Changes | Approx. lines |
| --- | --- | --- |
| `src/components/providers/ProviderDetailPage.tsx` | Integrated open status, sections, banner, popup lifecycle and dismissal persistence | +~90 |
| `src/components/providers/ProviderDetailModal.tsx` | Integrated open status, sections, banner, popup lifecycle and dismissal persistence | +~80 |
| `src/hooks/useImageSwipe.ts` | Restored active drag-session ref gating for move handlers to prevent non-drag scroll suppression | +~20 |
| `src/services/badges.server.ts` | Reworked 42703 fallback to use independent query builders (prevents stale invalid filter reuse) | +~10 |
| `src/services/providers.ts` | Extended `Provider` type with `opening_hours` | +2 |
| `src/utils/openStatus.ts` | Added defensive status derivation logic; patched strict return typing | +175 |
| `src/features/providers/components/HalalTrustPopup.tsx` | Added focus trapping + initial focus behavior for popup accessibility contract | +~40 |
| `src/features/providers/components/ProviderDetailSections.tsx` | Added nearby query loading-state rendering to avoid false empty-state | +~5 |

## Files Created

| Path | Purpose |
| --- | --- |
| `supabase/migrations/078_provider_opening_hours.sql` | Adds nullable `opening_hours JSONB` column to `public.providers` |
| `src/types/openingHours.ts` | Opening-hours and open-status type contracts |
| `src/features/providers/components/OpenStatusLine.tsx` | Renders open/closed status and next-change copy |
| `src/features/providers/components/ProviderDetailSections.tsx` | Renders six accordion sections and nearby-city query |
| `src/features/providers/components/HalalTrustBanner.tsx` | Static halal trust section with `/halal` link |
| `src/features/providers/components/HalalTrustPopup.tsx` | First-open popup with dismiss/ESC/click-outside behavior |
| `src/__tests__/utils/openStatus.test.ts` | Unit tests for open-status utility |
| `src/__tests__/components/ProviderDetailEnhancements.test.tsx` | Integration-level regression coverage for plan 113 UI features |
| `src/__tests__/components/HalalTrustPopup.test.tsx` | Popup focus-trap accessibility regression coverage |
| `src/__tests__/features/providers/ProviderDetailSections.test.tsx` | Nearby loading-state regression coverage |
| `src/__tests__/hooks/useImageSwipe.test.tsx` | Regression guard: touch move without active drag must not block native scrolling |
| `src/__tests__/services/badges.server.test.ts` | Regression coverage: 42703 fallback must retry without `is_active` filter |

## Deployment Path Audit

- N/A — no deployment surface files were modified (no workflows, deploy scripts, Dockerfile, or infra config changes).

## Schema Verification Gate (DB Migrations)

- Migration touches existing table `public.providers`.
- Direct schema verification SQL evidence: deferred.
- Blocker: Supabase environment variables are not configured in this worktree, so runtime DB-backed checks are unavailable.
- Risk note: low-to-medium; migration uses additive nullable column with `IF NOT EXISTS`.
- Follow-up owner: QA/DevOps to validate against target Supabase project before release.

## DB Plan Evidence Gate (Search)

- N/A — no search index/RPC/query-plan changes were introduced.

## Local Verification Gate

- Local verification: ⚠️ Blocked.
- Blocker: build/runtime environment missing required `NEXT_PUBLIC_SUPABASE_URL`, preventing full app bootstrapping for browser validation in this worktree.

## Interaction-Layer Audit Checklist

- Intended interactive element: halal popup close button + click-outside dismissal.
- Ancestor interception review: overlay root uses click handler for dismiss, inner dialog stops propagation.
- Fixed-position child behavior: popup overlay uses fixed positioning and no conflicting pointer-event suppression.
- Document-flow impact: fixed overlay does not reserve layout height.
- Result: ✅ no hit-testing/interception regressions identified from implementation.

## Search/Filter Client-Interaction Trace

- N/A — no search submit handlers, URL-param builders, or mixed-entity inline actions were changed.

## Multi-Plan State Audit

- Reviewed existing `useEffect` and local state flows in `ProviderDetailPage` and `ProviderDetailModal` where new popup state was added.
- New state (`showHalalPopup`) is isolated to trust-popup visibility and does not alter prior search/filter/selection state semantics.
- Result: compatible ✅

## API Route Coverage Gate

- N/A — no `src/app/api/**/route.ts` files were added or modified.

## Code Quality Validation

- [x] `npm run lint` -> pass (warnings only, no errors)
- [x] `npm run type-check` -> pass
- [x] `npx vitest run` -> pass (`137 passed`, `1 skipped`; `1154 passed`, `18 skipped`)
- [ ] `npm run build` -> blocked by missing env: `NEXT_PUBLIC_SUPABASE_URL`
- [x] Compatibility check: additive schema + defensive parsing for malformed opening-hours payloads

## Value Statement Validation

- Original value: provide complete, trustworthy, structured provider details.
- Delivery evidence:
  - Open status now displayed when valid hours exist.
  - Six structured sections added with empty states.
  - Halal trust banner and first-open popup implemented.
  - Mobile and desktop detail paths both updated.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `getOpenStatus()` | `src/__tests__/utils/openStatus.test.ts` | ✅ Yes | ✅ Yes | AssertionError (expected closed/next-opening contract during RED) | ✅ Yes |
| `OpenStatusLine` (component behavior via integration) | `src/__tests__/components/ProviderDetailEnhancements.test.tsx` | ✅ Yes | ✅ Yes | AssertionError (status line not present before integration) | ✅ Yes |
| `ProviderDetailSections` (accordion headings render) | `src/__tests__/components/ProviderDetailEnhancements.test.tsx` | ✅ Yes | ✅ Yes | AssertionError (new section headings absent before implementation) | ✅ Yes |
| `HalalTrustPopup` (first-10-opens view-count policy) | `src/__tests__/components/ProviderDetailEnhancements.test.tsx` | ✅ Yes | ✅ Yes | AssertionError (`uf_halal_popup_view_count` threshold behavior missing pre-fix) | ✅ Yes |
| `getOpenStatus()` overnight carry-over | `src/__tests__/utils/openStatus.test.ts` | ✅ Yes | ✅ Yes | AssertionError (was incorrectly closed after midnight) | ✅ Yes |
| `HalalTrustPopup` focus trap | `src/__tests__/components/HalalTrustPopup.test.tsx` | ✅ Yes | ✅ Yes | AssertionError (Tab/Shift+Tab did not wrap focus) | ✅ Yes |
| `ProviderDetailSections` nearby loading state | `src/__tests__/features/providers/ProviderDetailSections.test.tsx` | ✅ Yes | ✅ Yes | AssertionError (loading showed empty-state text) | ✅ Yes |
| `useImageSwipe` move-before-drag guard (bugfix regression) | `src/__tests__/hooks/useImageSwipe.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Pre-fix behavior would call `preventDefault()` on move without active drag and suppress native scroll | ✅ Yes |
| `getBadgesForEntityServer` 42703 fallback (bugfix regression) | `src/__tests__/services/badges.server.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Pre-fix fallback could reuse invalid `is_active` filter and still return empty result | ✅ Yes |

## Test Coverage

- Unit coverage:
  - `getOpenStatus` null/malformed/closed-next-open scenarios.
  - `getOpenStatus` overnight carry-over after midnight.
- Integration/component coverage:
  - New status line presence.
  - New section headings rendering.
  - Halal popup first-open visibility and localStorage view-count persistence.
  - Halal popup focus-trap keyboard loop behavior.
  - Nearby section loading-state rendering while query is in-flight.

## Test Execution Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | ✅ Pass | Existing warnings remain; no errors introduced |
| `npm run type-check` | ✅ Pass | Fixed strict typing mismatch in `getDayWindow` return type |
| `npm test -- --run src/__tests__/hooks/useImageSwipe.test.tsx src/__tests__/hooks/useScrollLock.test.ts` | ✅ Pass | Targeted interaction-layer regressions: `10 passed` |
| `npm test -- --run src/__tests__/services/badges.server.test.ts` | ✅ Pass | Targeted badges fallback regression: `1 passed` |
| `npm test -- --run` | ✅ Pass | Full suite green after latest remediation (`1162 passed`, `18 skipped`) |
| `npm run build` | ⚠️ Blocked | Build currently fails on existing dynamic server usage for `/city/[cityName]` (`headers`/`cookies` static render conflict), not from Plan 113 delta |

## Outstanding Items

1. Build gate needs env setup (`NEXT_PUBLIC_SUPABASE_URL`) to complete mandatory pre-handoff build verification.
2. Schema verification SQL evidence for migration remains deferred to QA/DevOps environment.
3. Baseline performance metrics (bundle/LCP) remain deferred.
4. M7 version bump/changelog release work not executed in this pass.

## Next Steps

1. Configure Supabase env vars locally and re-run `npm run build`.
2. Run migration verification queries in target Supabase project.
3. Re-run Code Review gate for fresh verdict after these remediation commits, then proceed to QA -> UAT when approved.
