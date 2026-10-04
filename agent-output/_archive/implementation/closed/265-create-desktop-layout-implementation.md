---
ID: 265
Origin: 265
UUID: 7c4e91a3
Status: Committed
---

# Implementation 265: Desktop Create Flow Layout

## Plan Reference

[265-create-desktop-layout-plan.md](../planning/265-create-desktop-layout-plan.md) (R2, Critic APPROVED [2026-09-26T20:09Z](../critiques/closed/265-create-desktop-layout-plan-critique.md)). Analysis: [265-create-desktop-layout-analysis.md](../analysis/265-create-desktop-layout-analysis.md).

## Date

2026-09-26

## Changelog

| Date              | Handoff/Request                 | Summary                                                                                                                                                                                             |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-26T20:11Z | Critic -> Implementer; APPROVED | Execution gate and issue #430 moved to ready; critique link repaired in the plan.                                                                                                                   |
| 2026-09-26T20:13Z | Implementer                     | Implementation started. Source review confirmed the shared PageContent offset and repeated fixed PageHeader across all 16 routes.                                                                   |
| 2026-09-26T21:05Z | Implementer                     | All 16 routes, shared layout primitives, and LoginGate repaired; regression suite, full test suite, lint, type-check, and production build all pass; browser-verified at desktop and mobile widths. |

## Implementation Summary

The user story: a desktop contributor must be able to complete adding or recommending a provider without an overlapping header or hidden content. All 16 `/create` and `/create/*` routes rendered their own fixed `PageHeader` on top of the global desktop `Header`, and `PageContent` offset content by an assumption of an 80px header instead of the actual global header (up to 193px), so text and cards were hidden or overlapping on desktop.

The fix follows the existing #396 pattern already used on the provider edit pages, adapted as a **default-off** context (`createDesktopLayout`) on `ScrollablePageLayout` so unrelated consumers of `PageHeader`/`PageContent` are unaffected:

- `ScrollablePageLayout` accepts `createDesktopLayout` and provides it via a new `CreateDesktopLayoutContext`.
- `PageHeader`, when the context is on, becomes `md:static` (in normal flow instead of fixed), uses the existing `--desktop-header-height` CSS variable for its top offset (+16px gap), and is centered in a 672px column (`md:!mx-auto` overrides the component's existing inline `-1px` margin hack).
- `PageContent`, when the context is on, drops the old 80px/104px assumptions and vertical-centering branch in favor of a top-aligned `md:pt-4` offset and the same 672px centered column.
- `LoginGate` (shared by `basics`, `recommend`, `import-osm`) takes a `createDesktopLayout` prop and forwards it to its own `ScrollablePageLayout`/content.
- Every one of the 16 route files opts in by adding `createDesktopLayout` to `<ScrollablePageLayout>`, including bare early-return branches (`isLoading`, `isRecommendationMode` redirect, unauthenticated screens) that previously rendered outside any shell, and the `recommend`/`import-osm` success-state header (previously hidden by `{!showSuccessScreen && (...)}`, now `hidden md:block` so mobile behavior is unchanged but desktop keeps the title/back control visible).

This delivers the value statement: on desktop, every visible state (loading, login, form, success) of all 16 routes keeps the route title/back action in flow, clear of the global header, in a centered 672px column, with mobile (<768px, including 640-767px) completely unchanged.

## Milestones Completed

- [x] M1: Desktop layout contract established (`CreateDesktopLayoutContext`, `PageHeader`, `PageContent`).
- [x] M2: Contract applied to all 16 routes and their loading/login/redirect/success branches; `LoginGate` callers included.
- [x] M3: Delivery evidence recorded below (route/state disposition, static gates, browser verification, AC evidence).
- [ ] M4: Version/release artifacts — owned by DevOps at Stage 1 per plan; not performed here.

## Files Modified

| Path                                                                                                               | Changes                                                                                                                | Lines |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----- |
| [src/components/layout/ScrollablePageLayout.tsx](../../src/components/layout/ScrollablePageLayout.tsx)             | Added `createDesktopLayout` prop and `CreateDesktopLayoutContext` (default `false`).                                   | ~15   |
| [src/components/layout/PageHeader.tsx](../../src/components/layout/PageHeader.tsx)                                 | Consumes the context; when on, header becomes `md:static`, uses `--desktop-header-height`, centered 672px column.      | ~5    |
| [src/components/layout/PageContent.tsx](../../src/components/layout/PageContent.tsx)                               | Consumes the context; when on, replaces the 80px/104px/centered branches with a top-aligned `md:pt-4` + 672px column.  | ~10   |
| [src/components/shared/LoginGate.tsx](../../src/components/shared/LoginGate.tsx)                                   | Added `createDesktopLayout` prop, forwarded to its `ScrollablePageLayout`.                                             | ~6    |
| [src/app/(public)/create/page.tsx](<../../src/app/(public)/create/page.tsx>)                                       | Opt-in.                                                                                                                | 1     |
| [src/app/(public)/create/basics/page.tsx](<../../src/app/(public)/create/basics/page.tsx>)                         | Opt-in on `LoginGate` and shell; wrapped bare `isLoading` return in the desktop shell with a `hidden md:block` header. | ~15   |
| [src/app/(public)/create/basics/category/page.tsx](<../../src/app/(public)/create/basics/category/page.tsx>)       | Opt-in.                                                                                                                | 1     |
| [src/app/(public)/create/basics/offers/page.tsx](<../../src/app/(public)/create/basics/offers/page.tsx>)           | Opt-in.                                                                                                                | 1     |
| [src/app/(public)/create/basics/needs/page.tsx](<../../src/app/(public)/create/basics/needs/page.tsx>)             | Opt-in.                                                                                                                | 1     |
| [src/app/(public)/create/contact/page.tsx](<../../src/app/(public)/create/contact/page.tsx>)                       | Opt-in on both shells; wrapped bare `isLoading` and `isRecommendationMode` redirect returns in the desktop shell.      | ~30   |
| [src/app/(public)/create/halal/page.tsx](<../../src/app/(public)/create/halal/page.tsx>)                           | Opt-in; wrapped bare `isLoading` return.                                                                               | ~15   |
| [src/app/(public)/create/import-osm/page.tsx](<../../src/app/(public)/create/import-osm/page.tsx>)                 | Opt-in on `LoginGate` and shell; success-state header changed from conditional render to `hidden md:block`.            | ~5    |
| [src/app/(public)/create/location/page.tsx](<../../src/app/(public)/create/location/page.tsx>)                     | Opt-in on both shells; wrapped bare `isLoading` return.                                                                | ~15   |
| [src/app/(public)/create/media/page.tsx](<../../src/app/(public)/create/media/page.tsx>)                           | Opt-in; wrapped bare `isLoading` return (previously a raw centered spinner outside any shell).                         | ~15   |
| [src/app/(public)/create/media/images/page.tsx](<../../src/app/(public)/create/media/images/page.tsx>)             | Opt-in.                                                                                                                | 1     |
| [src/app/(public)/create/media/social/page.tsx](<../../src/app/(public)/create/media/social/page.tsx>)             | Opt-in.                                                                                                                | 1     |
| [src/app/(public)/create/recommend/page.tsx](<../../src/app/(public)/create/recommend/page.tsx>)                   | Opt-in on `LoginGate` and shell; success-state header changed to `hidden md:block`.                                    | ~5    |
| [src/app/(public)/create/recommend/category/page.tsx](<../../src/app/(public)/create/recommend/category/page.tsx>) | Opt-in.                                                                                                                | 1     |
| [src/app/(public)/create/recommend/offers/page.tsx](<../../src/app/(public)/create/recommend/offers/page.tsx>)     | Opt-in.                                                                                                                | 1     |
| [src/app/(public)/create/social-category/page.tsx](<../../src/app/(public)/create/social-category/page.tsx>)       | Opt-in.                                                                                                                | 1     |

## Files Created

| Path                                                                                                                             | Purpose                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/**tests**/regression/265-create-desktop-layout.test.tsx](../../src/__tests__/regression/265-create-desktop-layout.test.tsx) | Plan 265 regression: shared opt-in contract, default-off compatibility, all 16 route opt-ins, bare loading/redirect branches wrapped, success-state header retained, `LoginGate` opt-in. |
| This implementation doc                                                                                                          | Bugfix handoff record per repository requirements.                                                                                                                                       |

## Deployment Path Audit

Not applicable — this is a UI-only frontend change with no deployment, Docker, workflow, env var, port, or volume changes.

## Code Quality Validation

- [x] `npm run type-check` — 0 errors.
- [x] `npm run lint` — 0 errors (pre-existing warnings only, none introduced by this change).
- [x] `npm test` — 2604 passed, 28 skipped, 286 files passed, 2 skipped (full suite).
- [x] `npm run build` — compiled successfully in 21.2s; 102/102 static pages generated. (Required non-secret placeholder `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars in this worktree, which has no `.env.local`; same placeholders used for local browser verification below. No real credentials used or exposed.)
- [x] Backward compatibility: `plan250-mobile-ui-jank-fixes.test.tsx` (64 tests), `255-create-entry.test.tsx` (12 tests), `255-i18n-extraction.test.tsx` (32 tests) all pass unchanged.

## Value Statement Validation

Original: "As a desktop contributor, I want every step of adding or recommending a provider to remain readable and usable below the global navigation, so that I can complete my contribution without overlapping headers or obscured controls."

Delivered: all 16 routes, browser-verified at 1440px, show the route title/back action in normal flow, 25px below the actual measured 193px global header, in a centered 672px column, with no console/page errors. Mobile (640px) is unchanged: the original fixed `PageHeader` and global header both remain visible exactly as before.

## TDD Compliance

| Function/Class                                                                | Test File                            | Test Written First? | Failure Verified?                                 | Failure Reason                                                                                                               | Pass After Impl? |
| ----------------------------------------------------------------------------- | ------------------------------------ | ------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `ScrollablePageLayout` `createDesktopLayout` context                          | `265-create-desktop-layout.test.tsx` | ✅ Yes              | ✅ Yes                                            | `toHaveClass('md:static')` failed against a `fixed` header (element had no `createDesktopLayout` support yet)                | ✅ Yes           |
| `PageHeader` desktop opt-in classes                                           | `265-create-desktop-layout.test.tsx` | ✅ Yes              | ✅ Yes                                            | Same as above; header remained `fixed`/off-column before the context existed                                                 | ✅ Yes           |
| `PageContent` desktop opt-in classes                                          | `265-create-desktop-layout.test.tsx` | ✅ Yes              | ✅ Yes                                            | `main` had the old `md:pt-[calc(env(safe-area-inset-top)+104px)]` class, not `md:pt-4`                                       | ✅ Yes           |
| `LoginGate` `createDesktopLayout` prop                                        | `265-create-desktop-layout.test.tsx` | ✅ Yes              | ✅ Yes                                            | Source did not contain `createDesktopLayout?: boolean` or the forwarding call                                                | ✅ Yes           |
| 16 route `ScrollablePageLayout` opt-ins                                       | `265-create-desktop-layout.test.tsx` | ✅ Yes              | ✅ Yes                                            | `<ScrollablePageLayout>` tag did not contain `createDesktopLayout`                                                           | ✅ Yes           |
| 5 bare loading/redirect branches (basics, contact x2, halal, location, media) | `265-create-desktop-layout.test.tsx` | ✅ Yes              | ✅ Yes                                            | Branch source was a raw `<div>`, not wrapped in `<ScrollablePageLayout createDesktopLayout>` with a `hidden md:block` header | ✅ Yes           |
| `recommend`/`import-osm` success-state header                                 | `265-create-desktop-layout.test.tsx` | ✅ Yes              | ✅ Yes                                            | Source still contained `{!showSuccessScreen && (` (header fully unmounted in success state)                                  | ✅ Yes           |
| Shared-default compatibility (context omitted)                                | `265-create-desktop-layout.test.tsx` | ✅ Yes              | N/A (regression-only, asserts unchanged behavior) | N/A                                                                                                                          | ✅ Yes           |

All rows: test written first, run and observed failing for the stated reason, then made to pass by the minimal implementation described above. Full failure transcripts were captured during the session (three iterations as the contract was refined from "hide header" to "in-flow static header", and one iteration fixing a JSX-formatting-sensitive matcher and a header-centering regression discovered via browser screenshot).

## Test Coverage

- Unit/regression: 27 tests in `265-create-desktop-layout.test.tsx` covering the shared context contract, all 16 route opt-ins, all bare early-return branches, both success-state headers, `LoginGate`, and shared-default non-regression.
- Compatibility: 108 pre-existing tests re-verified unchanged (`plan250-mobile-ui-jank-fixes` 64, `255-create-entry` 12, `255-i18n-extraction` 32).
- Full suite: 2604 passed / 28 skipped across 286 files (2 skipped files) — no new failures introduced.

## Test Execution Results

| Command                                                                      | Result                                                |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| `npx vitest run src/__tests__/regression/265-create-desktop-layout.test.tsx` | 27/27 passed                                          |
| `npx vitest run` (targeted + Plan 250/255)                                   | 134/134 passed                                        |
| `npm run type-check`                                                         | 0 errors                                              |
| `npm run lint`                                                               | 0 errors (warnings pre-existing, unrelated files)     |
| `npm test` (full suite)                                                      | 2604 passed, 28 skipped, 286 files passed (2 skipped) |
| `npm run build` (with placeholder Supabase env)                              | Compiled successfully; 102/102 static pages generated |

### Browser Verification (Local, Headless Playwright)

Local verification: ✅ Executed. Dev server had no `.env.local` in this worktree (repository-wide, not Plan 265-specific); non-secret placeholder `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` values were used to allow the app to render (real credentials never used or exposed). Checked all 16 routes as a guest at 1440x900 after CSS/hydration settled:

- All 16 routes: HTTP 200, no `pageerror` events, page title present, `pageHeaderPosition: static`, title 25px below the measured 193px global header (`--desktop-header-height: 193px`), content column exactly 672px wide, header and content columns share the same left edge (384px) after fixing an initial off-center regression caught via screenshot (inline `-1px` margin from the existing scroll-blur styling was overriding centering; resolved with `md:!mx-auto`).
- Mobile spot-check at 640px (`/create`, `/create/basics/category`, `/create/recommend/category`): original fixed `PageHeader` remains `position: fixed`, `display: block`, global header unchanged — mobile presentation is untouched.
- Screenshots captured: `/tmp/plan265-create-1440x900.png`, `/tmp/plan265-create-640x800.png`, `/tmp/plan265-create-settled-1440x900.png`, `/tmp/plan265-create-settled-640x800.png`, `/tmp/plan265-create-final-1440x900.png` (not committed; local artifacts only).

### AC Evidence Disposition (per Release and UAT Sequencing)

- AC1, AC2, AC4: verified pre-merge via the 16-route browser matrix above (guest only).
- AC3: verified pre-merge for the settled-measurement state (25px gap after `--desktop-header-height` resolves) and for the "no transient overlap" contract via the `md:static`/in-flow assertion (header can never overlay content because it participates in normal flow, not `fixed`, once the opt-in is active — this holds before, during, and after measurement, since the fallback `256px` value is used until the CSS variable resolves). **Conditional pending post-merge UAT**: authenticated-user header height and the exact visual sequence on the deployed environment (per plan Decision 3 / Deferred Evidence table) were not verified here — no authenticated environment or deployed SHA available in this worktree.
- AC5: verified structurally (top-aligned scrollable `main`, `overflow-y-auto` retained); not evidenced against exceptionally long content.
- AC6: verified via the 640px spot-check above and the unchanged `plan250-mobile-ui-jank-fixes` (64 tests) and `255-*` (44 tests) suites.
- AC7: verified via full test suite pass (2604/2604 non-skipped) with no changes to form logic, routing callbacks, creationMode ordering, halal semantics, or validation/submission code — only layout/JSX wrapper changes.
- Authenticated-route visual confirmation remains carried as conditional per the plan's Release and UAT Sequencing (owner: UAT, post-merge on uat.ummahflow.com).

## Outstanding Items

- Authenticated-user desktop header height/visual confirmation is deferred to post-merge UAT per the approved plan sequencing (not a defect; this worktree has no authenticated test environment).
- AC5 (long-content scroll reachability) was verified structurally, not against an artificially long form; no known risk identified, not blocking.
- M4 (version/release artifacts) is explicitly owned by DevOps at Stage 1 per the plan; not performed here.
- No missing test coverage identified for the in-scope layout change; no deferred hard tests.

## Next Steps

Code Reviewer, then QA (per Bugfix pipeline: Critic -> Implementer -> Code Reviewer -> QA -> UAT pre-merge conditional -> DevOps Stage 1 + merge -> UAT post-merge confirmation -> production dispatch).
