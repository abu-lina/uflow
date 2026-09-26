---
ID: 265
Origin: 265
UUID: 7c4e91a3
Status: Active
---

# 265 — /create Desktop Layout Broken — Analysis

## Changelog

| Date       | Agent   | Change                                                                                                         |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| 2026-09-26 | Analyst | Initial analysis (Bugfix pipeline, Phase 1). NO-MEMORY MODE (memory tool returned "No workspace folder open"). |

## Value Statement and Business Objective

`/create` is the entry point for every new provider listing and recommendation. On desktop the page title collides with the global logo and the intro copy is hidden under the global header. That makes the platform look broken at the moment we ask users to contribute content. Aligning `/create` with the desktop layout already used on the provider edit pages restores a trustworthy first step in the contribution funnel.

## Objective

1. List the layout patterns introduced by reference commit `cf79589b` (#394/#395).
2. Show where `/create` diverges from those patterns on desktop (md+ ≥ 768px).
3. Name the files to change.
4. Assess conflict risk with Plan 255 worktrees.

Mobile (< 768px) is out of scope.

## Context

- Worktree: `/Users/NARAFIQ/Projects/uflow-wt/265-create-desktop-layout`, branch `fix/265-create-desktop-layout`, HEAD `b439e8e8` (= tag `v0.15.18`).
- Target route: [src/app/(public)/create/page.tsx](<../../src/app/(public)/create/page.tsx>).
- Desktop shell (root layout): global `Header` fixed at the top (`hidden md:block`) + `RootClientLayout` `<main>` + `DesktopFooter`. The global Header publishes its measured height as `--desktop-header-height` ([Header.tsx](../../src/components/layout/Header.tsx#L186-L197)).

## Methodology

- Commit archaeology: `git show -w` of `cf79589b` and the squash commit that follows it (`e30cca9e`, #396). Noise from reformatting (prettier class reorder) was filtered out.
- Code tracing from `/create` outward: `page.tsx` → `PageContent` → `ScrollablePageLayout` → `PageTransition` → `RootClientLayout` → root `layout.tsx` / `Header`.
- **POC (reproduction):** headless Chromium (Playwright cache, `chrome-headless-shell-1234`) against production `https://ummahflow.com/create/` at 1440×900, 1024×768, 768×1024. Screenshots are in [265-evidence/](265-evidence/). I also dumped the DOM to read the runtime `--desktop-header-height`.
- Prod parity: `git diff v0.15.18 HEAD` shows no changes to `src/app/(public)/create`, `src/components/layout`, or `src/components/create`.

## Findings

### F0 — Reference-commit scope (L1 Proven)

`cf79589b` is **not** a squash of the full desktop restructure. It is the **first sub-commit** of the work later squash-merged as **`e30cca9e` (#396)**. `e30cca9e`'s message has the same first two bullets as `cf79589b`, followed by five more commits, including _"hide sub-page PageHeader on desktop to prevent overlap with global Header"_ and _"standardize all provider edit sub-pages to consistent layout"_.

- Most of `cf79589b`'s 848/588 line churn is reformatting (class reorder, line wrapping) and non-layout logic (Bugs 3 and 4).
- The desktop layout that the provider edit pages use **today (HEAD)** comes from `e30cca9e`, not `cf79589b`. In `e30cca9e`, the `cf79589b` header approach (`PageHeader` visible on desktop + `sm:pt-[calc(env(safe-area-inset-top)+80px)]`) was **replaced**, because it caused the same PageHeader-vs-global-Header overlap that `/create` shows now.

Implication for Planner: copying `cf79589b` literally would reproduce the `/create` defect. The pattern that actually fixed the edit pages on desktop is the HEAD state (C1–C3 + E1–E4 below).

### F1 — Layout patterns in the reference work (L1 Proven, from diffs and HEAD source)

**From `cf79589b` itself:**

| #   | Pattern                                                                                                                                                                                   | Where                                                                                       | Desktop-relevant?             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------- |
| C1  | Replace the hand-rolled fixed `<header>` with the shared `PageHeader` + `HeaderSpacer`                                                                                                    | `edit/social/page.tsx`                                                                      | Yes (superseded by E1 on md+) |
| C2  | Apply the header offset to **every** render state (loading, error, content), not just the happy path                                                                                      | `edit/page.tsx`                                                                             | Yes                           |
| C3  | Breakpoint alignment: `md:` → `sm:` so the content wrapper matches PageHeader's responsive switch → `w-full sm:mx-auto sm:max-w-2xl`                                                      | `edit/page.tsx`                                                                             | Yes (content width)           |
| C4  | Header action buttons moved from separate `absolute` overlays into one flex row (`absolute right-12 top-9 flex items-center gap-2`) next to the close button                              | `ProviderDetailModal.tsx`, `CommunityServiceDetailModal.tsx`                                | Modal only                    |
| —   | `ProofTierCard` returns `null` without a tier; `ProviderDetailSections` renders it conditionally; `type="button"`/`type="submit"` on the form buttons; review-status double-write removed | `ProofTierCard.tsx`, `ProviderDetailSections.tsx`, `ProviderEditForm.tsx`, `halal/page.tsx` | **No** (logic only)           |

**From the follow-up squash `e30cca9e` (#396), i.e. the HEAD state of the edit pages:**

| #   | Pattern                                                                                                                                                                                                                                                    | Evidence (HEAD)                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Mobile-only page header: `<div className="md:hidden"><PageHeader …/><HeaderSpacer/></div>`, so md+ shows only the global Header                                                                                                                            | [edit/page.tsx](<../../src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx#L264-L268>), [EditSubPageLayout.tsx](../../src/components/layout/EditSubPageLayout.tsx#L56-L60) |
| E2  | Desktop top offset driven by the measured global header: `md:pt-[calc(var(--desktop-header-height,153px)+16px)]` (loading/error use it without `+16px`)                                                                                                    | [edit/page.tsx](<../../src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx#L269>)                                                                                          |
| E3  | Content column `w-full sm:mx-auto sm:max-w-2xl` (672px, centered)                                                                                                                                                                                          | [edit/page.tsx](<../../src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx#L270>)                                                                                          |
| E4  | Shell: `h-screen-fix flex flex-col` → `<main className="flex flex-1 flex-col overflow-y-auto px-6 pb-4 …">`, with top-aligned content (no vertical centering). `halal` edit page was moved **off** `ScrollablePageLayout` + `PageContent` onto this shell. | commit message of `e30cca9e`                                                                                                                                                      |
| E5  | `FooterAction` inner wrappers constrained to `sm:max-w-2xl`                                                                                                                                                                                                | [FooterAction.tsx](../../src/components/ui/FooterAction.tsx) (not used on `/create`)                                                                                              |

### F2 — Reproduction on production (L1 Proven)

Screenshots: [prod-create-1440x900.png](265-evidence/prod-create-1440x900.png), [prod-create-1024x768.png](265-evidence/prod-create-1024x768.png), [prod-create-768x1024.png](265-evidence/prod-create-768x1024.png).

| Symptom                                                                                                         | 1440×900        | 1024×768                                    | 768×1024                   |
| --------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------- | -------------------------- |
| S1 — PageHeader `‹ Add Provider` drawn on top of the global `UMMAH FLOW` logo                                   | ✅ reproduced   | ✅                                          | ✅                         |
| S2 — Intro paragraph (`create.description`) hidden under the global header                                      | ✅ fully hidden | ✅ hidden, and the top of card 1 is clipped | ❌ visible (tall viewport) |
| S3 — Content column shrinks to intrinsic width (~500px) instead of the declared `sm:max-w-2xl` / `lg:max-w-4xl` | ✅ (~502px)     | ✅ (~502px)                                 | ✅                         |

Runtime `--desktop-header-height` on `/create` = **193px** at both 1440 and 1024 (read from the `<html style>` in the DOM dump). The Header includes the search bar and filter-chip row.

### F3 — Mechanism per symptom

**S1 — Double header (L1 for the collision, L2 for paint order).**
[create/page.tsx](<../../src/app/(public)/create/page.tsx#L43-L47>) renders `PageHeader` unconditionally. `PageHeader` is `fixed left-0 right-0 top-0 z-50` ([PageHeader.tsx](../../src/components/layout/PageHeader.tsx#L197-L200)), and so is the global `Header` ([Header.tsx](../../src/components/layout/Header.tsx#L203)). No ancestor between them creates a stacking context: `RootClientLayout` div, `main`, `PageTransition` (`relative`, no z) and `ScrollablePageLayout` (`absolute`, no z) all lack one. So both headers sit in the root context at z-50. The PageHeader comes later in the DOM and paints on top. Its background is transparent until the user scrolls. This is the exact defect that E1 fixed on the edit pages.

**S2 — Content under the header (L1).**
`PageContent` with `centerVertically` sets `md:pt-[calc(env(safe-area-inset-top)+80px)] md:pb-[80px] md:h-full md:flex md:items-center md:justify-center` ([PageContent.tsx](../../src/components/layout/PageContent.tsx#L118-L126)). The 80px value assumes the _PageHeader's_ height (24 + 48 + 8). It ignores the 193px global Header. That leaves a deficit of **113px**. With vertical centering, the content's top edge only clears the header when the viewport is tall enough. That explains why 768×1024 looks fine and 1440×900 does not. The PageContent comments also mention a 56px "desktop" PageHeader (`md:pt-…104px`), but PageHeader has no `md` height step: it only has `h-header-height-mobile sm:h-header-height-tablet`. Edit-page reference: E2 (`var(--desktop-header-height)`) plus E4 (no vertical centering).

**S3 — Column width (L1 observed width, L2 mechanism).**
`PageContent` applies `className` to its inner `<div>` when `maxWidth="full"` ([PageContent.tsx](../../src/components/layout/PageContent.tsx#L131-L137)). On md+ the outer `<main>` becomes a row flexbox (`md:flex md:justify-center`), so that inner div is a flex item with no `w-full`. It shrinks to its intrinsic width, and `sm:max-w-2xl lg:max-w-4xl` only act as caps. The declared widths are also inconsistent: `sm:max-w-2xl` → `lg:max-w-4xl`, `sm:px-6 md:px-8`, and `paddingX="px-6 sm:px-0"`. The edit pages use a single `w-full sm:mx-auto sm:max-w-2xl` (C3/E3).

### F4 — Pattern mapping: `/create` vs reference (desktop)

| Ref   | Reference behaviour (edit pages, HEAD)                             | `/create` today                                                                  | Divergent?                 |
| ----- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------- |
| C1    | Shared `PageHeader` (+ `HeaderSpacer`)                             | Shared `PageHeader`; offset comes from `PageContent` padding, not `HeaderSpacer` | Partial (mobile concern)   |
| E1    | `PageHeader` wrapped in `md:hidden`                                | Always rendered → S1                                                             | **Yes**                    |
| C2/E2 | Every state offset by `var(--desktop-header-height,153px)` (+16px) | Hard-coded `md:pt-[…+80px]` from `PageContent` → S2                              | **Yes**                    |
| E4    | Top-aligned `flex flex-1 flex-col overflow-y-auto` main            | `PageContent centerVertically` → `md:h-full md:flex md:items-center`             | **Yes** (drives S2 and S3) |
| C3/E3 | `w-full sm:mx-auto sm:max-w-2xl`                                   | `sm:mx-auto sm:max-w-2xl sm:px-6 md:px-8 lg:max-w-4xl` with no `w-full` → S3     | **Yes**                    |
| C4    | Header actions in a single flex row                                | No header actions on `/create`                                                   | N/A                        |
| E5    | `FooterAction` `sm:max-w-2xl`                                      | No `FooterAction` on `/create`                                                   | N/A                        |
| —     | Logic changes (ProofTierCard, button types)                        | —                                                                                | N/A                        |

### F5 — Conditional-branch enumeration for `/create` (L1)

| Branch                                                                  | Visible on md+?  | Affected by S1–S3?                                                                |
| ----------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| Default chooser (description + 2 × `ProviderOptionCard` + chat hint)    | Yes              | Yes — all three                                                                   |
| `isQuickImportEnabled` Quick-Create card                                | No (`sm:hidden`) | Not reachable on desktop                                                          |
| Global Header right side: guest (Login/Register) vs logged-in (profile) | Yes              | Height measured only as guest (193px). Logged-in height not measured (see Gap 2). |

`/create` has no loading or error state, so C2's "every state" rule applies only to the single content state.

### F6 — Sibling `/create/*` routes share the same structure (L1 static, L3 visual)

All 16 `page.tsx` files under `src/app/(public)/create/` render `PageHeader` with **no** `md:hidden` wrapper, use `ScrollablePageLayout` + `PageContent`, and have **no** `--desktop-header-height` offset (grep count per file: `mdhidden:0 deskvar:0`). They almost certainly show S1 and S2 on desktop too. I did not screenshot them: the task scopes this analysis to `/create`, and several of them require a login.

### F7 — Test constraints Planner must respect (L1)

- [plan250-mobile-ui-jank-fixes.test.tsx](../../src/__tests__/regression/plan250-mobile-ui-jank-fixes.test.tsx#L85-L120): every `create/*` page, including `create/page.tsx`, **must contain `ScrollablePageLayout`** and must not import `DesktopCreateLayout` or `useIsMobile`. So E4's "move off ScrollablePageLayout" step (done for the halal _edit_ page) conflicts with this test as written.
- [255-create-entry.test.tsx](../../src/__tests__/regression/255-create-entry.test.tsx#L110-L127): `create/page.tsx` must keep `setCreationMode(...)` before `router.push(...)`, and must contain `variant="back-and-title"` and `onBack`.
- [255-i18n-extraction.test.tsx](../../src/__tests__/regression/255-i18n-extraction.test.tsx): `create/page.tsx` must not reintroduce hard-coded strings.
- No existing test asserts desktop header offset or `md:hidden` on `/create`.

### F8 — Shared-component blast radius (L1)

`PageContent` is used by all 15 `/create/*` pages and also by `impressum`, `privacy-policy`, `terms`, `profile`, `saved`, `search`, `signup`, `LoginGate` and `FigmaPageContent`. `centerVertically` on `PageContent` is used **only** by `create/page.tsx`. `PageContentWrapper` has its own separate `centerVertically`.

### F9 — Plan 255 worktree conflict risk (L1)

| Worktree / branch                                                                          | Status vs HEAD                                                                                                                                                                                                                     | Touches `/create`? | Risk                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uflow-wt/255-create-recommend-menu-2` (`feature/255-create-recommend-menu-2`, `3a694a14`) | Squash-merged (as #418 + follow-ups). **Zero content diff** vs HEAD for `src/app/(public)/create/**`, `Header.tsx`, `PageContent.tsx`, `PageHeader.tsx`.                                                                           | Yes historically   | **None** as long as no new commits land on it.                                                                                                                                 |
| `uflow-wt/255-create-recommend-menu` (`feature/255-create-recommend-menu`, `64cc2255`)     | Stale: 1 unique commit (#415 content, non-layout, `contact/page.tsx`). It lacks all of #418, so its tree is **behind** HEAD on `create/page.tsx`, `basics`, `halal`, `media`, `location`, `recommend`, `import-osm`, `Header.tsx`. | Yes                | **Low for 265, high if ever merged or rebased.** Any merge would conflict with HEAD in general, not specifically with 265. Its unique commit does not touch layout primitives. |

Other Plan 255 work already on `main` (`643a36e3`) changed `create/page.tsx` (`title-only` → `back-and-title`, added the chat hint). It is already part of the baseline.

### F10 — Out-of-scope observation (L1, pre-existing)

At 1024×768 the global `Header` grid (`grid-cols-[1fr_800px_1fr] px-12`) overflows: the "Stores" tab is clipped and Login/Register are off-screen ([prod-create-1024x768.png](265-evidence/prod-create-1024x768.png)). This affects every desktop page, not only `/create`. It is not caused by `/create` and is not part of the `cf79589b` patterns.

## Root Cause (L1)

On md+, `/create` renders a second fixed header (`PageHeader`) on top of the global desktop `Header`. It then offsets its content by the PageHeader's height (80px) rather than the global Header's measured height (193px), and centres it vertically inside the scroll area. The provider edit pages had the same defect, and `e30cca9e` (#396) fixed it by hiding `PageHeader` on md+ (E1), offsetting by `var(--desktop-header-height)` (E2), and top-aligning a `w-full sm:max-w-2xl` column (E3/E4). `/create` was never migrated to that pattern. The overlap has likely existed since the desktop Header redesign (`5aa6c1e8`); #410 swapped `DesktopCreateLayout` for `ScrollablePageLayout`, and the two are equivalent apart from `z-0` (L2).

## Files to Change

| File                                                                                                                                   | Why                                                                                                                                                                                                                                                                | Maps to                    |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| [src/app/(public)/create/page.tsx](<../../src/app/(public)/create/page.tsx>)                                                           | **Primary.** Owns the unconditional `PageHeader`, the `PageContent centerVertically` usage, and the inconsistent width/padding classes.                                                                                                                            | E1, E2, E4, C3/E3          |
| New regression test, e.g. `src/__tests__/regression/265-create-desktop-layout.test.tsx`                                                | No test currently guards the desktop header offset or `md:hidden` on `/create`.                                                                                                                                                                                    | Bugfix handoff requirement |
| [src/**tests**/regression/plan250-mobile-ui-jank-fixes.test.tsx](../../src/__tests__/regression/plan250-mobile-ui-jank-fixes.test.tsx) | **Only if** Planner chooses to take `create/page.tsx` off `ScrollablePageLayout` (E4 as applied to the halal edit page). Otherwise leave it untouched.                                                                                                             | F7                         |
| [src/components/layout/PageContent.tsx](../../src/components/layout/PageContent.tsx)                                                   | **Candidate only (Planner decision).** The `centerVertically` desktop branch and the 104px `md` offset are wrong against the global Header, but the component is shared with ~9 non-`/create` consumers (F8). `centerVertically` itself is used only by `/create`. | E2/E4                      |

Not needed for the `/create` desktop fix: `ProviderOptionCard.tsx` (renders correctly inside a correct column), `PageHeader.tsx`, `Header.tsx`, `HeaderSpacer.tsx`, and all `cf79589b` logic files (`ProofTierCard`, `ProviderDetailSections`, `ProviderEditForm`, both modals).

Scope decision for Planner: the 15 sibling `/create/*` pages (F6) have the same structure. Whether #265 covers them or only `/create` is a product/scope call.

## System Weaknesses

| Weakness                                                                                                                                                  | Risk mechanism                                                                              | How to detect                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Two independent fixed headers at the same z-index (`PageHeader`, `Header`) with no central rule for which one owns md+                                    | Every page that uses `PageHeader` without `md:hidden` overlaps the global Header on desktop | Grep for `<PageHeader` not wrapped in `md:hidden`, or a source-assertion test like F7 |
| Hard-coded header offsets in `PageContent` / `HeaderSpacer` that model a desktop PageHeader (56px) that does not exist                                    | Desktop content is under-offset by more than 100px                                          | Compare `PageContent` `md:pt-*` with `--desktop-header-height` at runtime             |
| Desktop header offset pattern (`var(--desktop-header-height)`) lives only in page files and `EditSubPageLayout`, not in the shared public-page primitives | Each public page must rediscover the fix                                                    | Grep count of `desktop-header-height` per route group                                 |
| No visual/E2E coverage at desktop viewports for public routes                                                                                             | Layout regressions reach prod unnoticed                                                     | —                                                                                     |

## Instrumentation Gaps

| Signal                                                                                 | Normal/Debug | Purpose                                                  |
| -------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------- |
| Desktop viewport screenshot check (1440×900, 1024×768) of `/create` in CI or UAT smoke | Normal       | Catches header overlap and hidden content before release |
| None needed at runtime                                                                 | —            | The defect is deterministic and CSS-only                 |

## Remaining Gaps

| #   | Unknown                                                                    | Blocker                                      | Required action                                                                                                                                       | Owner                             |
| --- | -------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | Visual state of the 15 sibling `/create/*` pages on desktop                | Out of stated scope; several need a login    | Screenshot them as a logged-in user at 1440×900 if Planner widens scope                                                                               | Planner / QA                      |
| 2   | Global Header height for a logged-in user (profile icon vs Login/Register) | POC ran as guest only                        | Measure `--desktop-header-height` while logged in. The E2 pattern reads the variable at runtime, so a different value should not change the approach. | QA                                |
| 3   | Exact commit that introduced S1 on `/create`                               | Only affects history, not the fix            | Optional: bisect around `5aa6c1e8`                                                                                                                    | Deferred (not needed for the fix) |
| 4   | Whether the user meant literal `cf79589b` or the full #396 pattern         | F0 shows `cf79589b` alone reproduces the bug | User/Planner confirm that the HEAD edit-page pattern (C1–C3 + E1–E4) is the target                                                                    | User / Planner                    |

## Analysis Recommendations (next investigative steps)

1. Confirm Gap 4 with the user before planning. It decides whether the E1/E2 patterns are in scope (the evidence says they must be).
2. When verifying the fix locally, repeat the F2 headless-Chromium POC at 1440×900 and 1024×768. Acceptance: no text overlapping the logo, the `create.description` paragraph visible below 193px, and a column width consistent with `sm:max-w-2xl`.
3. If scope widens to `/create/*`, run the same screenshot matrix as a logged-in user (Gap 1).

## Open Questions

- Q1: Is #265 limited to `/create` (index), or does it include the 15 sibling `/create/*` pages with the same structure (F6)?
- Q2: Can `plan250-mobile-ui-jank-fixes.test.tsx`'s `ScrollablePageLayout` requirement for `create/*` be revisited, or must the fix keep `ScrollablePageLayout` (F7)?
- Q3: Should the stale `feature/255-create-recommend-menu` worktree be retired so it cannot be merged by accident (F9)?
