---
ID: 108
Origin: 108
UUID: b7e3a91f
Status: Committed
---

# Implementation — Plan 108: Hide Wer Accordion for Stores Section on /search

## Plan Reference

- Plan: `agent-output/planning/108-stores-search-hide-wer-accordion.md`
- Critique: `agent-output/critiques/108-stores-search-hide-wer-accordion-critique.md` (APPROVED)
- GitHub Issue: https://github.com/abu-lina/uflow/issues/174

## Date

- 2026-04-27T17:30Z

## Changelog

| Date | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-04-27T17:30Z | Planner/Critic -> Implementer | Implement approved Plan 108 | Implemented Wer hide-for-business + accordion reset behavior, added regression tests, bumped version/changelog |

## Implementation Summary

Implemented the approved stores-search UX fix on `/search` by conditionally removing the `Wer` accordion when `selectedSection === 'business'`, and by resetting `openAccordion` to `was` when switching from an open `wer` panel into business.

This directly delivers the value statement: store-search users no longer see irrelevant Männer/Frauen/Kinder audience controls, and section switching avoids the confusing all-collapsed state.

## Baseline & Measurements

- Not applicable for this bugfix (no performance baseline target in the plan).

## Milestones Completed

- [x] Milestone 1: Conditionally hide Wer accordion for business section
- [x] Milestone 2: Regression tests for business Wer behavior and section-switch reset
- [x] Milestone 3: Version management (`CHANGELOG.md`, `package.json`, `package-lock.json`)

## Files Modified

| Path | Changes | Lines (approx) |
| --- | --- | --- |
| `src/app/(public)/search/page.tsx` | Added `openAccordion` section-switch reset guard and conditional rendering to hide Wer for `business` | +12 / -1 |
| `src/app/(public)/search/page.test.tsx` | Added configurable section mock + 2 regression tests (business hides Wer; food->business resets to Was) | +40 / -3 |
| `CHANGELOG.md` | Added `0.10.35` release notes for Plan 108 fix | +12 |
| `package.json` | Bumped version `0.10.34 -> 0.10.35` | 1 line |
| `package-lock.json` | Lockfile version alignment after bump | generated diff |
| `src/components/providers/ProvidersPageHeader.tsx` | Renamed unused destructured prop to `_onCategoryChange` to satisfy lint gate | 1 line |
| `src/features/search/components/FigmaSearchBar.tsx` | Reordered JSX props to satisfy `react/jsx-sort-props` lint gate | small reorder |
| `agent-output/planning/108-stores-search-hide-wer-accordion.md` | Status set to `In Progress` and implementation-start changelog entry added | doc metadata update |

## Files Created

| Path | Purpose |
| --- | --- |
| `agent-output/implementation/108-stores-search-hide-wer-accordion-implementation.md` | Implementation handoff artifact for Plan 108 |

## Deployment Path Audit

- Not applicable: no deployment surface files changed (`Dockerfile`, deploy scripts, workflows, ports, mounts unchanged).

## Code Quality Validation

- [x] `npx vitest run src/app/(public)/search/page.test.tsx src/features/search/components/FigmaSearchBar.test.tsx` (pass)
- [x] `npx vitest run` (full suite pass: 131 passed, 1 skipped)
- [x] `npm run lint` (pass with warnings only; 0 errors)
- [x] `npm run type-check` (pass; exit 0)
- [ ] `npm run build` (blocked by required valid Supabase runtime key format in env)

### Build Blocker Detail

`npm run build` fails during page-data collection because runtime environment validation requires a real-format Supabase anon key (JWT starting `eyJ...` or valid publishable key format). This worktree does not have valid project credentials available.

Evidence (last run):
- Error: `Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format`
- Failing route collection path: `/api/admin/badges/unverify`

## Value Statement Validation

- Original value statement: hide irrelevant Wer filter for Stores on `/search`.
- Implementation result:
  - `selectedSection === 'business'` no longer renders Wer accordion
  - `selectedSection === 'food'` and `selectedSection === 'ummah'` remain unchanged
  - Switching food Wer-open -> business now resets visible open accordion to Was

Result: value statement fully delivered.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `SearchPage` Wer/business behavior (bugfix regression) | `src/app/(public)/search/page.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Assertion failed: expected `Wer: For me` not to be in DOM for business flow | ✅ Yes |

### TDD Gate Evidence

Red step executed first by adding regression tests before `page.tsx` changes:
- Failing assertion captured in test run:
  - `Error: expect(element).not.toBeInTheDocument()`
  - Found unexpected `Wer: For me` button after switching to business.

Green step:
- After implementation in `page.tsx`, targeted and full test runs passed.

## Test Coverage

- Regression coverage added for:
  - business initial section hides Wer accordion
  - section switch from Wer-open food to business resets to Was open state
- Existing search page behavioral tests preserved and passing.

## Test Execution Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx vitest run src/app/(public)/search/page.test.tsx` | PASS | 8/8 tests passed |
| `npx vitest run src/features/search/components/FigmaSearchBar.test.tsx` | PASS | 3/3 tests passed |
| `npx vitest run` | PASS | 131 files passed, 1 skipped |
| `npm run lint` | PASS with warnings | 0 errors, 58 warnings (pre-existing warnings) |
| `npm run type-check` | PASS | `TYPECHECK_EXIT:0` |
| `npm run build` | FAIL (env blocker) | Invalid Supabase anon key format; requires valid project credentials |

## Interaction-Layer Audit Checklist

Trigger applicability: **No** (no pointer-events/visibility/overlay/hit-testing changes).

## Search/Filter Client-Interaction Trace

Trigger applicability: **N/A** — no submit handler URL-param builder or inline mixed-entity list action logic was modified in this plan.

## Multi-Plan State Audit

Multi-Plan State Audit: Plan 089/090/107-era search page state mutations reviewed.
- `src/app/(public)/search/page.tsx` section-switch effect: updated to include `openAccordion` compatibility reset for business when prior state is `wer` — updated ✅
- Existing selectedSection resets (`setWasQuery`, `setSelectedWas`, `setSelectedFilters`) remain semantically compatible ✅

## Local Verification Gate

Local verification: ⚠️ Blocked
- Blocker: Missing valid project Supabase credentials in local env for full production build/runtime validation (`NEXT_PUBLIC_SUPABASE_ANON_KEY` format enforcement).
- Mitigation: Automated regression tests + lint + type-check + full vitest suite executed successfully.

## Versioning

- Version bumped to `0.10.35` (preliminary - final version confirmed at DevOps Stage 1).
- Lockfile alignment executed per policy:
  - `npm install --package-lock-only`
  - Verified `package-lock.json` top-level and package node both `0.10.35`.

## Outstanding Items

1. Build gate requires valid Supabase environment credentials in the execution environment.
2. Follow-up (out-of-scope, from plan): stores-specific `Was?` results component should be planned separately.

## Next Steps

1. Code Review (focus: SearchPage conditional rendering + regression tests)
2. QA validation (with environment that has valid Supabase credentials for build/runtime check)
3. UAT verification on `/search` stores section behavior
