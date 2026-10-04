---
ID: 265
Origin: 265
UUID: 7c4e91a3
Status: Committed
---

# Code Review: Plan 265 — Desktop Create Flow Layout

**Plan Reference**: `agent-output/planning/265-create-desktop-layout-plan.md`
**Implementation Reference**: `agent-output/implementation/265-create-desktop-layout-implementation.md`
**Date**: 2026-09-26
**Reviewer**: Code Reviewer
**Session**: S265-create-desktop-layout (worker session, branch `fix/265-create-desktop-layout`)
**Memory**: NO-MEMORY MODE (retrieval errored: "No workspace folder open"); artifact-first review.

## Changelog

| Date       | Agent Handoff | Request                                  | Summary                                                                                                                |
| ---------- | ------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2026-09-26 | Implementer   | Review Plan 265 implementation before QA | APPROVED_WITH_COMMENTS; 3 fixes-in-review applied (1 MEDIUM, 1 HIGH pre-existing i18n, 1 LOW); 3 LOW/INFO notes remain |

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md` (no entries for create-flow/desktop header contract); design reference is the #396 `EditSubPageLayout` contract named in plan Decision 3.
**Alignment Status**: ALIGNED

- A default-off `CreateDesktopLayoutContext` is provided by `ScrollablePageLayout` and consumed by `PageHeader` and `PageContent`. This keeps shared-component defaults unchanged (AC6) and avoids prop-drilling through 16 routes.
- It reuses the existing `--desktop-header-height` CSS variable from the global Header's ResizeObserver. No second observer and no hard-coded production height are added, as plan M1 step 3 requires.
- The pre-measurement fallback (256px) exceeds the measured 193px at 1440px, so the whitespace-before-measurement rule in AC3 holds. The changed-height and authenticated timing states stay conditional pending post-merge UAT, as the plan's Release and UAT Sequencing requires.
- No new dependencies, no viewport-dependent mounting, and no duplicate responsive forms.

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes
**Primary behavior regression test**: Present. `[post-fix PASSES] opted-in shell keeps the page header in flow...` renders the real shell and asserts `md:static`, the measured-height padding, the 672px column classes and the absence of `md:items-center`. It fails if the feature is reverted.
**Concerns**: The route-coverage tests are source-text assertions (see L2). They are acceptable here because jsdom does not evaluate responsive CSS, and they guard AC1's "no route/branch deferred" requirement.

## Mandatory Checklists

| Checklist                             | Result                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6b Path refactor / file move          | N/A — no moves/renames                                                                                                                                                                                                                                                                                                                                                                             |
| 6c Agent spec / cross-workspace paths | N/A                                                                                                                                                                                                                                                                                                                                                                                                |
| 6d Deployment path audit              | N/A — no Dockerfile/deploy/workflow/env changes                                                                                                                                                                                                                                                                                                                                                    |
| 6e Outbound data-flow                 | No new outbound params. `LoginGate` `returnUrl` construction is unchanged (`encodeURIComponent(returnPath)`); all three `returnPath` values match their routes.                                                                                                                                                                                                                                    |
| 6f Interaction layer                  | The header becomes `md:static` inside the `absolute inset-0` scroll container. No `pointer-events`/`visibility` changes. `hidden md:block` headers on loading/success branches are display-only and mobile keeps the prior behavior (no header). The global Header remains the only fixed desktop layer, and no wrapper reserves height for fixed children beyond the intended measured offset. ✅ |
| 6g Shared results actionability       | N/A                                                                                                                                                                                                                                                                                                                                                                                                |
| 6h Deleted-module residue             | N/A — nothing deleted                                                                                                                                                                                                                                                                                                                                                                              |
| 6i / 6j Migrations                    | N/A — no migrations                                                                                                                                                                                                                                                                                                                                                                                |
| 6k i18n scan                          | 21 files checked (16 routes + `LoginGate`, `PageHeader`, `PageContent`, `ScrollablePageLayout`, test). 1 hardcoded label found (`social-category` title, pre-existing) and fixed in review (H1). All new loading headers use `t(...)`. The `aria-label="Zurück"` in `PageHeader` is pre-existing and untouched; noted as INFO.                                                                     |

## Findings

### Critical

None.

### High

**[HIGH] i18n**: Hardcoded German page title in a modified route — **FIXED IN REVIEW**

- **Location**: [src/app/(public)/create/social-category/page.tsx](<../../src/app/(public)/create/social-category/page.tsx#L69-L73>)
- **Issue**: `title="Kategorie auswählen"` rendered German in every locale. This predates Plan 265, but the file is modified by this plan and the label is user-visible, and it is now more visible because the desktop header stays in flow.
- **Resolution**: Replaced with `t('providers.selectCategory')`. The key exists in all 6 locales (de/en/ar/ps/tr/ur) and its German value is identical (`'Kategorie auswählen'`), so German copy is unchanged (AC7). No test asserts the literal. This is a one-line change with no new dependency.

### Medium

**[MEDIUM] Layout correctness (AC4)**: Media loading spinner renders at the viewport's left edge on desktop — **FIXED IN REVIEW**

- **Location**: [src/app/(public)/create/media/page.tsx](<../../src/app/(public)/create/media/page.tsx#L72>)
- **Issue**: The wrapper used `md:items-start md:justify-start` on a full-width flex row with no column constraint. The shrink-to-content spinner block was therefore pinned to x≈0, while the header sits in the centered 672px column (x=384 at 1440px). The other 5 loading branches correctly use `md:mx-auto md:w-full md:max-w-2xl`. The browser matrix did not catch this because the loading state is transient.
- **Resolution**: Changed to `h-screen-fix flex items-center justify-center md:mx-auto md:h-auto md:min-h-0 md:max-w-2xl md:items-start md:p-8`. `justify-center` now applies on desktop, inside the 672px column, with the same `p-8` spacing as the sibling loading branches. Mobile classes are unchanged. The existing branch test still applies (it asserts the shell and header, not the spinner classes).

### Low/Info

**[LOW] Formatting**: Mis-indented scroll fallback in `PageHeader` — **FIXED IN REVIEW**

- **Location**: [src/components/layout/PageHeader.tsx](../../src/components/layout/PageHeader.tsx#L132-L134)
- **Issue**: A residue of the earlier accidental edit left the two `Priority 3` lines at 8-space indentation inside a 6-space block. Behavior was correct; the diff read poorly.
- **Resolution**: Whitespace-only re-indent.

**[LOW] DRY**: Duplicated loading-shell JSX (L1)

- **Location**: `basics`, `contact` (×2), `halal`, `location`, `media` loading branches
- **Issue**: Six near-identical `<ScrollablePageLayout createDesktopLayout><PageHeader className="hidden md:block" .../><div ...>` blocks.
- **Recommendation**: Optional follow-up: extract a small `CreateLoadingShell({ title, onBack, children })` in `src/features/create/components/`. Not required for this bugfix, since the plan limits abstraction to "actual repeated layout behavior" and this repetition is small and co-located with each route's own copy.

**[LOW] Testing**: Source-regex tests are coupled to formatting (L2)

- **Location**: [src/**tests**/regression/265-create-desktop-layout.test.tsx](../../src/__tests__/regression/265-create-desktop-layout.test.tsx#L112-L124)
- **Issue**: The branch slice ends at the first `\n  }`, and the markers are literal strings. A formatter or refactor could produce false failures or, less likely, false passes.
- **Recommendation**: Acceptable for now. If the loading shell is extracted (L1), replace these with a rendered test of the shared shell.

**[INFO] `!important` utilities**

- `md:!mx-auto` on the header is required to beat the inline `marginLeft/Right: -1px` style. The `md:!…` utilities in `PageContent`/`LoginGate` beat caller `className` values (`sm:max-w-[640px]`, `min-h-[60vh]`, `items-center`). Each is scoped to `md:` under the opt-in, so the blast radius is limited to create routes. Acceptable.

**[INFO] Pre-existing `aria-label="Zurück"`** in `PageHeader` is not localized. It is out of scope for 265 and was not modified. Suggest a follow-up issue.

## Positive Observations

- The opt-in context pattern is minimal and default-off, and it is verified by a compatibility test (`leaves shared layout defaults unchanged...`).
- The `cn`/`twMerge` ordering is used correctly: the create-layout `md:pt-4` overrides the base `md:pt-[…104px]` without editing the default path.
- The success-state change (`{!showSuccessScreen && …}` → `className={showSuccessScreen ? 'hidden md:block' : ''}`) preserves mobile behavior exactly while keeping the desktop back control.
- Evidence is honest: authenticated visuals and AC3 changed-height states are explicitly marked conditional, not claimed as passes.

## Fix-in-Review Summary (verification path for QA)

| File                                               | Change                                             | Lines                      |
| -------------------------------------------------- | -------------------------------------------------- | -------------------------- |
| `src/app/(public)/create/media/page.tsx`           | Loading wrapper classes (desktop column alignment) | 1                          |
| `src/components/layout/PageHeader.tsx`             | Whitespace re-indent                               | 2                          |
| `src/app/(public)/create/social-category/page.tsx` | `title={t('providers.selectCategory')}`            | 5 (reformatted, 1 logical) |

Editor diagnostics are clean on all three files. The reviewer had no terminal access, so **QA must re-run `npm run lint`, `npm run type-check`, and `npx vitest run src/__tests__/regression/265-create-desktop-layout.test.tsx src/__tests__/regression/plan250-mobile-ui-jank-fixes.test.tsx`**. QA should also spot-check `/create/social-category` (en locale shows "Select category") and the `/create/media` loading state at 1440px.

## Verdict

**Status**: APPROVED_WITH_COMMENTS
**Rationale**: The design aligns with the #396 contract and the plan's constraints. Coverage of the primary behavior is direct. The one AC4 defect and one i18n defect found were small and were fixed in review. The remaining items are LOW/INFO and non-blocking. No constraint-sensitive MEDIUM findings remain open.

## Required Actions

None blocking. Optional: L1/L2 follow-up; open an issue for the `aria-label="Zurück"` localization.

## Next Steps

Hand off to QA for test execution. Note for DevOps/QA: the reviewer could not commit this doc (terminal unavailable). Commit `agent-output/code-review/` before the QA clean-tree gate.
