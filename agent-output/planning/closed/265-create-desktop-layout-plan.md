---
ID: 265
Origin: 265
UUID: 7c4e91a3
Status: Released
---

# Plan 265: Desktop Create Flow Layout

## Value Statement and Business Objective

As a desktop contributor, I want every step of adding or recommending a provider to remain readable and usable below the global navigation, so that I can complete my contribution without overlapping headers or obscured controls.

| Field               | Value                                                                                                                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID             | 265                                                                                                                                                                                                                                                                                          |
| Target Release      | next available patch after current origin/main version; confirm at DevOps Stage 1                                                                                                                                                                                                            |
| Baseline            | origin/main version 0.15.18; latest released tag v0.15.18                                                                                                                                                                                                                                    |
| Epic Alignment      | Epic 3.1: Community-Driven Provider Recommendations; supporting owner contribution flow                                                                                                                                                                                                      |
| Related Issues      | User-reported /create desktop defect; reference [#394](https://github.com/abu-lina/uflow/issues/394), [PR #395](https://github.com/abu-lina/uflow/pull/395), [PR #396](https://github.com/abu-lina/uflow/pull/396); compatibility with [PR #418](https://github.com/abu-lina/uflow/pull/418) |
| GitHub Issue        | https://github.com/abu-lina/uflow/issues/430                                                                                                                                                                                                                                                 |
| Classification      | Bugfix                                                                                                                                                                                                                                                                                       |
| Pipeline            | Bugfix; Analyst -> Planner -> Critic approval gate -> Implementer -> QA -> UAT pre-merge (conditional) -> DevOps Stage 1 + merge to main -> UAT on uat.ummahflow.com (confirmation) -> production dispatch                                                                                   |
| Revision            | R2: response to C265-5 (R1 addressed C265-1 through C265-3)                                                                                                                                                                                                                                  |
| Acceptance Approval | AC1-AC7 accepted by user 2026-09-26T20:01Z                                                                                                                                                                                                                                                   |
| Execution Gate      | ready: Critic APPROVED 2026-09-26T20:09Z; implementation may begin                                                                                                                                                                                                                           |
| Created             | 2026-09-26T19:36Z                                                                                                                                                                                                                                                                            |
| Source              | [Analysis 265](../analysis/265-create-desktop-layout-analysis.md), including 265-evidence screenshots                                                                                                                                                                                        |

## Changelog

| UTC Time                  | Agent         | Event                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-26T19:36Z         | Planner       | Planning started following user scope revision: include /create and all /create/* subpages on desktop. Other proposed constraints retained.                                                                                                                                                                                                                                                                                                |
| 2026-09-26T19:39Z         | Planner       | Plan ready for Critic; 16/16 route inventory, inherited ID/Origin/UUID, and local links validated. GitHub issue #430 created after open/closed duplicate checks. Critic verdict remains pending.                                                                                                                                                                                                                                           |
| 2026-09-26T19:52Z         | Planner       | R1 started after REVISION REQUESTED: define the measurement timing contract and propose AC1-AC7 for issue synchronization. User acceptance and release-deferral acknowledgement remain pending; no Critic finding closed by Planner.                                                                                                                                                                                                       |
| 2026-09-26T19:54Z         | Planner       | R1 revisions written and issue #430 synchronized. Read-back confirmed identical AC1-AC7, required issue fields, and draft/blocked state; local checks confirmed 16 routes, inherited identity and links. Await explicit user confirmations, then Critic re-review.                                                                                                                                                                         |
| 2026-09-26T20:06Z         | Planner       | R2 started after Critic REVISION REQUESTED (C265-5). User accepted AC1-AC7 and acknowledged the release deferral at 20:01Z (confirmed 20:04Z), adding that UAT can only be confirmed after deployment to main. R2 adds post-merge UAT sequencing; AC1-AC7 unchanged.                                                                                                                                                                       |
| 2026-09-26T20:07Z         | Planner       | R2 written; issue #430 updated (Status draft -> blocked, acceptance/acknowledgement recorded, Release and UAT Sequencing added). Read-back confirmed AC1-AC7 parity; local checks confirmed 16 routes, 8 decisions with none OPEN, links and chronology. Ready for Critic re-review.                                                                                                                                                       |
| 2026-09-26T20:11Z         | Implementer   | Critic APPROVED R2 at 20:09Z; execution gate and issue #430 moved to ready. Fixed the critique link for its closed/ location. Implementation may begin.                                                                                                                                                                                                                                                                                    |
| 2026-09-26T20:13Z         | Implementer   | Implementation started. Source review confirmed the shared PageContent offset and repeated fixed PageHeader across all 16 routes; regression test is being written first.                                                                                                                                                                                                                                                                  |
| 2026-09-26T20:51Z         | Implementer   | Implementation complete: default-off createDesktopLayout context added to ScrollablePageLayout/PageHeader/PageContent/LoginGate; all 16 routes and their bare loading/redirect/success branches opted in. Full lint, full test suite (2604 passed), type-check, and production build all pass; browser-verified at 1440px and 640px. See agent-output/implementation/265-create-desktop-layout-implementation.md. Ready for Code Reviewer. |
| 2026-09-26 (after 20:51Z) | Code Reviewer | APPROVED_WITH_COMMENTS. Three fixes-in-review applied (media loading spinner column alignment, PageHeader indentation, social-category hardcoded title -> `t('providers.selectCategory')`). QA must re-run lint/tests/type-check on those files. See agent-output/code-review/265-create-desktop-layout-code-review.md.                                                                                                                    |
| 2026-09-26T21:12Z         | QA            | QA Complete: Verified all gates (type-check, delta-lint, full 2604-test suite, 28-test Plan 265 regression suite, production build 102/102 pages). Verified Code Review fixes for social-category translation and media loading spinner column alignment. See agent-output/qa/265-create-desktop-layout-qa.md. Ready for UAT.                                                                                                              |
| 2026-09-26T21:15Z         | UAT           | UAT Complete (Conditional Approval): Pre-merge value assessment confirms desktop create flow layout is restored across all 16 routes, loading states, LoginGate, and success screens without mobile regressions. Post-merge live verification on uat.ummahflow.com tracked as DF-1. See agent-output/uat/265-create-desktop-layout-uat.md. Ready for DevOps.                                                                               |
| 2026-09-26T21:20Z         | DevOps        | Stage 1 complete: Plan committed locally for release v0.15.19. Version pre-flight verified, package bumped, open actions tracker created for DF-1, documents closed.                                                                                                                                                                                                                                                                       |
| 2026-09-26T21:30Z         | DevOps        | Stage 2 released: PR #432 squash-merged into main (5e2f0708), tag v0.15.19 pushed, GitHub Issue #430 closed. Status: Released.                                                                                                                                                                                                                                                                                                             |

## Scope and Alignment

The roadmap's master objective is to make UFlow the first thought when a Muslim seeks a service or business. Removing layout obstacles throughout contribution supports a complete, trusted provider directory and Epic 3.1's existing submission outcome. No leaderboard, moderation, analytics, or acquisition feature is added.

In scope: all 16 existing page routes under src/app/(public)/create, including their loading, login, redirect-pending, selection, form, validation, and submission presentation. Desktop means the global Header breakpoint, md and above (768px). All routes in the inventory below must ship together.

Out of scope: /create-quick and /create-quick/review (separate route tree, not /create subpages); mobile and the 640-767px interval; global Header navigation overflow; unrelated public routes; backend, schema, auth, ownership, validation, submission, and draft-state changes; retiring other worktrees. Preserve existing behavior in each excluded area.

This exceeds the usual ten-file guideline because the same layout defect occurs across one cohesive contribution flow. Splitting by page would leave the next contribution step broken. Expected implementation remains 1-2 working days; Critic must explicitly approve the expanded atomic scope.

## Evidence and Architecture

- Analysis 265 reproduced overlapping headers and obscured chooser content in production. Its 193px header measurement is guest-only evidence, not a fixed layout constant or proof of the deployed revision.
- Reference cf79589be334b5bccae2d574048b49c698b5346f introduced shared header spacing, consistent state offsets, and centered constrained content. Follow-up e30cca9e (#396) supplies the relevant current desktop pattern: mobile-only PageHeader, measured global-header clearance, and top-aligned constrained content. Copying only cf79589's fixed 80px assumption would not address today's global header.
- [EditSubPageLayout](../../src/components/layout/EditSubPageLayout.tsx) and the current provider edit page are reference implementations, not mandates to replace the create shell.
- [System architecture](../architecture/system-architecture.md) requires narrow client/server boundaries and maintainable, focused modules. [Architecture 166](../architecture/166-desktop-admin-edit-layout.md) supports responsive-only layout changes and column/action alignment; its historical hard-coded header estimate is superseded by the measured-height pattern.
- No numbered Section 10 guidance was located in the architecture overview or system architecture. The concrete edit-layout guidance above is the applicable local reference; do not invent an architectural approval.
- PageContent applies className to its inner wrapper when maxWidth is full. A route-level content class does not necessarily change the outer element's padding or height. The implementation must address the element that actually owns each offset and sizing rule.
- LoginGate owns its own PageHeader and PageContent. Updating only the authenticated route JSX would leave unauthenticated creation screens broken.

## Decision Record

1. [RESOLVED] Cover /create plus all 15 descendant pages together, as requested by the user; /create-quick remains outside this route family.
2. [RESOLVED] Preserve everything below 768px, including existing sm-based form/action switches; desktop repairs must not redefine the application's mobile breakpoint behavior.
3. [RESOLVED] Use the current #396 desktop layout contract, with the global Header as the only fixed desktop header. No transient overlap before or during measurement updates, as specified in AC3; the reference 153px fallback is not evidence of safe clearance. User accepted AC1-AC7 on 2026-09-26T20:01Z.
4. [RESOLVED] Retain ScrollablePageLayout and CSS-based responsiveness. Do not restore DesktopCreateLayout, viewport hooks, or parallel mounted copies of stateful forms.
5. [RESOLVED] Keep shared layout behavior backward-compatible by making create-specific behavior opt-in or locally composed. No unconditional changes to PageContent, PageHeader, LoginGate, or FooterAction defaults for unrelated consumers.
6. [RESOLVED] Preserve capability and behavior: route titles and back/close navigation stay available on desktop in normal flow when the overlapping fixed PageHeader is hidden; Plan 255 creationMode selection, return URLs, login gates, tri-state halal values, translations and submission behavior are unchanged. Presentation only; no provider-row mutation and no entry point removed.
7. [RESOLVED] Final UAT confirmation happens after merge to main on uat.ummahflow.com (the only UAT environment; deployed by push to main). Pre-merge UAT is conditional; production deployment of Plan 265 requires recorded post-merge UAT confirmation. See Release and UAT Sequencing. Rationale: user constraint 2026-09-26T20:01Z and repository deploy triggers.
8. [DEFERRED: Roadmap + DevOps; concurrent release coordination; Plan 265 DevOps Stage 1] Confirm the exact patch version and bundling after a fresh tag fetch. Planning does not reserve a version or claim Roadmap approval. User acknowledged this deferral on 2026-09-26T20:01Z (confirmed 20:04Z).

## Release Strategy

Release Strategy: Standalone (no other known plans for this version).

Version pre-flight completed at phase start: git fetch origin --tags succeeded; latest five tags were v0.15.14 through v0.15.18; origin/main package version is 0.15.18. No exact next patch is assigned here.

The non-closed planning directory was scanned for release assignments. Plans 217/218 refer to v0.15.18, which is already released; older next-patch references do not establish a confirmed bundle with 265. Roadmap's active tracker also marks v0.15.18 released. Roadmap/DevOps must reconcile stale assignments before selecting the next release. No Roadmap agent invocation is available in this session.

Lifecycle scan found unrelated terminal-status documents 173, 203, and 219 outside closed/. They were not moved because this worker is restricted to chain 265. Control-window lifecycle cleanup is independent of this fix.

## Route and State Inventory

All paths below are relative to src/app/(public)/create and identify an existing page.tsx. Every listed visible desktop state receives the same header-clearance and width contract. State-selection predicates and data operations remain unchanged.

| Route / Page File                                       | Render Paths and Disposition                                                                                                                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /create: page.tsx                                       | Chooser with two actions and chat link: repair. Quick import flag on/off: mobile-only card remains hidden on desktop and unchanged on mobile.                                                                    |
| /create/basics: basics/page.tsx                         | Auth loading, shared LoginGate, authenticated desktop UnifiedProviderCreateForm: repair. Mobile ProviderCreateForm remains unchanged and hidden at its existing breakpoint.                                      |
| /create/basics/category: basics/category/page.tsx       | Category search/selection, populated or empty result collection, inline desktop continue action: repair shell. Mobile fixed action remains unchanged.                                                            |
| /create/basics/offers: basics/offers/page.tsx           | Loading; selected/suggested/other and empty filtered results; incremental loading; add-item feedback/dialogs; desktop action: repair containment, retain state logic.                                            |
| /create/basics/needs: basics/needs/page.tsx             | Loading; selected/suggested/category-related/unrelated and empty filtered results; add-item feedback/dialogs; desktop action: repair containment, retain state logic.                                            |
| /create/contact: contact/page.tsx                       | Auth loading; recommendation redirect-pending loading; inline login-required screen; owner contact form and footer: repair each visible shell. Redirect destination remains unchanged.                           |
| /create/halal: halal/page.tsx                           | Auth loading; halal choices; conditional certificate upload/present/remove feedback; footer: repair shell and action clearance, preserve tri-state semantics.                                                    |
| /create/import-osm: import-osm/page.tsx                 | Suspense null fallback: intentionally unchanged (no content to overlap). Auth-resolving form branch, shared LoginGate, StreamlinedImportForm and its existing feedback/actions: repair desktop container.        |
| /create/location: location/page.tsx                     | Auth loading; unauthenticated owner login screen; owner/recommendation location form, online/manual/location selection and existing feedback: repair visible shells. Preserve draft-loading and mode precedence. |
| /create/media: media/page.tsx                           | Auth loading; editable media/review content; validation/submitting/feedback and final action: repair presentation, preserve submission/login behavior.                                                           |
| /create/media/images: media/images/page.tsx             | Empty image selection; image previews/upload/remove states; inline desktop save: repair containment. Mobile footer unchanged.                                                                                    |
| /create/media/social: media/social/page.tsx             | Search and selected/unselected services, populated/empty results; desktop save: repair shell, preserve fetching and selection behavior.                                                                          |
| /create/recommend: recommend/page.tsx                   | Suspense null fallback: unchanged. Auth-resolving form branch, shared LoginGate, StreamlinedRecommendForm and its existing feedback/actions: repair desktop container.                                           |
| /create/recommend/category: recommend/category/page.tsx | Category search, populated/empty results, selection and desktop action: repair shell. Mobile footer unchanged.                                                                                                   |
| /create/recommend/offers: recommend/offers/page.tsx     | Loading; selected/suggested/other and empty filtered results; add-item feedback/dialogs; desktop action: repair containment, preserve selection behavior.                                                        |
| /create/social-category: social-category/page.tsx       | Category collection, empty collection and selected/unselected rows, desktop action: repair shell. Mobile footer unchanged.                                                                                       |

Across every row: existing field validation, busy/disabled controls, errors and empty content remain in the corrected container; existing overlays retain their behavior. No new error state or domain behavior is prescribed. Guest, authenticated contributor, and authenticated admin may produce different global-header heights; all consume the live measurement. The root header's own narrow-desktop overflow is a separate known defect, not declared fixed here.

## Acceptance Criteria

These are pass/fail product outcomes, not QA cases or a test strategy. The user accepted AC1-AC7 as written on 2026-09-26T20:01Z. Unchecked boxes represent outcomes not yet implemented or verified, not completed work. Final verification of every AC occurs on uat.ummahflow.com after merge to main (see Release and UAT Sequencing).

- [ ] AC1: All 16 routes in the Route and State Inventory meet the desktop layout contract at viewport widths of 768px and above, including their visible loading, login, redirect-pending, form, empty, error and submission presentation; no listed route or visible branch is deferred.
- [ ] AC2: Only the global Header is fixed at the desktop top edge. Each route's existing title and back/close action remain visible in normal flow without overlapping the global logo or navigation.
- [ ] AC3: At scroll origin, the first visible create-page element, including title/navigation or loading content, remains at least 16px below the actual global Header bottom from first visible paint, before hydration or measurement, while measurement is unavailable, and when header height changes with viewport, locale or auth state. Transient overlap is not permitted. Conservative extra clearance is allowed until measurement is available; after measurement the intended gap is 16px. Ready content must not be hidden or left blank merely to avoid the overlap. Normal user scrolling beneath the fixed header is not a failure of this initial-position criterion.
- [ ] AC4: Desktop content uses a centered, full available-width column capped at 672px with consistent gutters and aligned actions. Neither short content nor nested form widths cause intrinsic shrinkage, horizontal clipping or loss of controls.
- [ ] AC5: Short and long desktop pages remain scrollable as needed; the first content and final actionable control are reachable without forced data-resetting navigation, with sufficient clearance from fixed actions and the root footer.
- [ ] AC6: Presentation and behavior below 768px, including 640-767px, remain unchanged. Unrelated public pages and shared-component defaults remain unchanged, and no new duplicate responsive forms or viewport-dependent mounting are introduced.
- [ ] AC7: Existing owner/recommendation routes, creationMode-before-navigation ordering, login return URLs, authorization gates, translated copy, tri-state halal values, draft persistence, validation and submission semantics remain unchanged. Existing null Suspense fallbacks remain null.

## Header Timing Contract

AC3 applies to visible creation content at the top of its scroll area, not an instruction to keep already-scrolled content permanently below a fixed header. It applies equally to first load, navigation into a create route, and header-height changes while the page is at scroll origin. It must not depend on an assumption that a ResizeObserver callback has already run.

The reference fallback is an unverified estimate: 153px plus the intended 16px gap is 169px, below the analysis's 193px guest-header observation. Neither value is an approved fixed replacement. The implementation must establish adequate pre-measurement clearance for the supported desktop header states and continue to use the existing live measurement when present, without changing the global Header's behavior for unrelated routes or adding another observer.

Extra whitespace before measurement is acceptable; obscured title/navigation, blanking otherwise-ready content, or an overlap that disappears only after hydration is not. If this contract cannot be delivered within the approved layout-only boundaries, Implementer must return the specific constraint to Planner rather than silently relaxing AC3 or expanding the global-header scope.

## Release and UAT Sequencing

Repository facts: pushing to main triggers Deploy to UAT (uat.ummahflow.com); Deploy to Production is a separate manual dispatch. UAT therefore cannot give final confirmation before merge. The sequence below prevents both a deadlock and an unverified production release. It does not prescribe DevOps commands.

1. Pre-merge (worktree branch): Implementer delivers M1-M3 evidence; QA passes. UAT may issue at most CONDITIONAL APPROVAL (design review), listing every AC item that needs deployed verification. At minimum this includes the AC3 timing states and the authenticated routes/branches. Unconditional UAT approval is not expected pre-merge.
2. Merge gate: DevOps Stage 1 and merge to main proceed only after Critic APPROVED, QA pass and the UAT conditional approval. At Stage 1, DevOps creates agent-output/planning/265-open-actions.md (DevOps step 9b) containing the post-merge UAT item (owner UAT, trigger below, closure criterion below).
3. Post-merge UAT confirmation: trigger is a successful Deploy to UAT run containing the Plan 265 merge commit. Owner: UAT. UAT verifies AC1-AC7 on uat.ummahflow.com at desktop widths 768px and above, guest and authenticated, including every AC3 timing state, and records the result with the deployed commit SHA in the UAT artifact for 265. Closure: that record exists and shows pass.
4. Production gate: no Deploy to Production run that includes Plan 265 may occur until step 3 closes with pass. The plan is not marked Released before that. If another plan needs production while 265 is unconfirmed, apply the failure path below rather than shipping 265 unverified.
5. Failure path (main is shared by concurrent plans): production is not deployed with the failing change. Default is fix-forward: the defect returns to Implementer on a Plan 265 branch, then QA, then merge; step 3 repeats. Revert the Plan 265 commit(s) on main (a normal revert, never a force-push, never other plans' commits) when fix-forward cannot land before another plan's production release, or when the defect affects flows beyond /create. DevOps proposes the choice; the user decides. After a revert, 265 re-enters at step 1.

## Milestones

### M1: Establish the Desktop Layout Contract

Owner: Implementer. Dependency: Critic APPROVED.

1. Establish one consistent desktop presentation contract for the route family while retaining ScrollablePageLayout, the scroll context, and the existing mobile DOM/state behavior.
2. Remove the duplicate fixed desktop page header while retaining each existing title and navigation action in an in-flow desktop location. Reuse existing translated labels and icons.
3. Meet AC3's first-paint, unavailable-measurement and changed-height clearance contract, then use the existing live global-header measurement for the 16px content gap. Do not assume the inherited 153px fallback is safe, add a second measurement observer, or hard-code the production snapshot height. Exact layout composition remains an Implementer decision.
4. Use a full-width, centered desktop column capped at the edit-page 672px width, with consistent horizontal gutters. Remove desktop-only intrinsic shrinkage and vertical-centering rules that can place content above the accessible scroll origin.
5. Keep short and long pages scrollable within the available area, with the final field and action reachable above any fixed action or root footer. Avoid duplicate header offsets, nested full-viewport shells, and double-reserved footer space.

Acceptance: AC2-AC6, including no transient overlap at scroll origin before measurement or while the header height changes. A shared abstraction is justified only where it removes actual repeated layout behavior (DRY/SOLID); no new framework or dependencies (KISS/YAGNI).

### M2: Apply to Every Route and State

Owner: Implementer. Dependency: M1.

1. Apply the contract to all 16 routes in the inventory, including early-return loading, login, and redirect-pending branches. Do not treat migration of the chooser or authenticated happy paths as completion.
2. Include LoginGate's create callers and the inline login screens in contact/location. Preserve encoded return URLs and existing permission checks; any shared helper extension defaults to current behavior outside opted-in callers.
3. Align existing desktop continue/save/submit controls to the content column. Preserve which controls are inline versus fixed unless their positioning causes the desktop defect. Retain existing mobile visibility and keyboard behavior.
4. Inspect the embedded unified, recommendation, and import forms for internal widths, viewport heights, and action placement that can override their page wrapper. Only adjust desktop layout where necessary to meet the same contract.
5. Retain all existing form components, routing callbacks, creationMode-before-navigation ordering, halal semantics, storage prefixes, validation and mutation code. Do not duplicate forms to implement responsive layout.

Acceptance: every inventory row has an implementation disposition; all visible branches are inside the corrected desktop layout; null Suspense fallbacks and mobile-only branches explicitly remain unchanged. Embedded controls and feedback do not escape or obstruct the available desktop content area.

### M3: Record Delivery and Compatibility Evidence

Owner: Implementer; QA and UAT independently own their verification artifacts. Dependency: M2.

1. Populate implementation artifact 265 with the route/state completion inventory and repository-required bugfix handoff evidence, including the TDD compliance record. Existing Plan 250 and 255 behavior remains a compatibility requirement, not permission to change their expectations to hide regressions.
2. Run the project's applicable static gates (npm run type-check and focused ESLint for changed files), recording results and pre-existing blockers. Functional regression evidence follows repository requirements; this plan does not define QA cases or strategy.
3. Clearly distinguish analyst evidence from new observations: chooser screenshots exist, but authenticated subpages were not visually demonstrated by analysis. QA/UAT own desktop visual acceptance; items that need the deployed environment are recorded as conditional, with post-merge UAT on uat.ummahflow.com as owner and gate, not represented as a pass.
4. Recheck current committed Plan 255 file overlap before integration. The earlier analysis found no content difference for the relevant files on feature/255-create-recommend-menu-2; that is a timestamped observation, not a permanent no-conflict guarantee. Do not inspect or modify other worktree working directories.
5. Record the implementation's pre-measurement clearance rationale and relevant observations in implementation artifact 265. QA/UAT acceptance evidence must distinguish first visible paint, unavailable measurement, and changed-height behavior from the settled measured layout. A post-hydration screenshot or passing static gate alone does not establish AC3. Concrete test design and evidence collection remain owned by Implementer/QA/UAT.

Acceptance: implementation artifacts identify all delivered routes, meaningful validation results, outstanding environment limitations and their owners; no silent deferral of a create route. AC1-AC7, including all AC3 timing states, have an explicit evidence disposition: verified pre-merge, or conditional pending post-merge UAT. Missing timing evidence blocks unconditional UAT confirmation and production release; before merge it may only be carried as a conditional item, never recorded as a pass or waived. Critic and later gates have enough evidence to assess the complete desktop outcome.

### M4: Update Version and Release Artifacts

Owner: DevOps with Roadmap. Dependency: Critic APPROVED, QA pass and UAT pre-merge conditional approval for Stage 1 and merge to main; recorded post-merge UAT confirmation for any production release (Release and UAT Sequencing steps 2-4).

1. Fetch tags again at DevOps Stage 1 and coordinate the next available patch after current origin/main with Roadmap; record the confirmed assignment and any bundle here with actual UTC time.
2. Update package version and lockfile metadata together at release level, and add the CHANGELOG entry for all 16 desktop routes. Update user-facing documentation only if behavior needs explanation.
3. Reconcile concurrent Plan 255 and release changes without reverting their functionality. Commit and release only through the authorized integration workflow; never deploy from this worker worktree.
4. Create agent-output/planning/265-open-actions.md at Stage 1 with the post-merge UAT item; close it only when post-merge UAT confirmation is recorded. Dispatch production only after that closure.

Acceptance: one coordinated release version, consistent artifacts, complete desktop scope documented, no version collision, and no production deployment of Plan 265 without recorded post-merge UAT confirmation. No deployment configuration changes or deployment-path audit are required by this UI-only plan.

## Change Inventory

| Surface                                                                                                                                                     | Expected Disposition                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All 16 page.tsx files in the route inventory                                                                                                                | Primary edit surface; each desktop shell and early-return branch must be covered.                                                                           |
| src/components/layout/PageContent.tsx                                                                                                                       | Candidate narrow opt-in extension if needed to control outer padding/height and inner width correctly; existing default behavior unchanged.                 |
| src/components/layout/ScrollablePageLayout.tsx and PageHeader.tsx                                                                                           | Reuse existing behavior; do not introduce unconditional route-wide changes. Changes require a demonstrated need within M1 and backward-compatible defaults. |
| src/components/shared/LoginGate.tsx                                                                                                                         | Include its layout boundary for basics/recommend/import-osm; opt-in compatibility or local composition required.                                            |
| src/features/providers/UnifiedProviderCreateForm.tsx, src/features/providers/StreamlinedRecommendForm.tsx, src/features/providers/StreamlinedImportForm.tsx | Inspect desktop containment/action conflicts. Layout-only edits allowed where needed; existing domain placement is retained.                                |
| src/components/ui/FooterAction.tsx                                                                                                                          | Reuse existing constrained width behavior. No unconditional global footer redesign.                                                                         |
| Existing Plan 250/255 regression files and relevant layout coverage                                                                                         | Preserve existing contracts; Implementer/QA own any coverage changes under repository rules.                                                                |
| package.json, package-lock.json, CHANGELOG.md                                                                                                               | Release-level changes by DevOps only.                                                                                                                       |

ProviderOptionCard, provider-edit domain logic, modal verification cards, database services and APIs are not targets. A new narrowly scoped layout helper is permitted only if existing utilities cannot express the shared contract without brittle selector overrides or duplicated logic; exact composition remains an Implementer decision.

## Navigation and Capability Preservation

Direct /create and descendant routes remain available; global desktop/mobile create entries, profile/account entry points, manifest shortcuts, debug links, redirects and deep links are not removed or retargeted. The duplicate fixed desktop PageHeader is replaced as a presentation surface, not a removal of its title/back capability. Keep mobile PageHeader and each existing desktop back/close action available. No route deletion or capability-removal sweep is part of this plan.

## Risks and Boundaries

- Changing shared defaults could regress unrelated public pages. Use opt-in/local composition and retain existing defaults.
- A md-only requirement can accidentally alter 640-767px behavior when copying sm classes from edit pages. Preserve that interval explicitly.
- Early returns and LoginGate can bypass a happy-path repair. The route/state inventory is a delivery checklist, not optional follow-up work.
- The 672px cap could expose nested fixed widths in embedded forms; resolve only demonstrated desktop containment conflicts, without redesigning fields.
- Global header controls already overflow at narrower desktop widths. Record separately; this plan ensures creation content is clear of that header, not that the global navigation itself is repaired.
- No analytics stack, data collection, database workload, API contract or authorization changes. CSS-based responsiveness must not add duplicated forms, viewport polling, or hydration-dependent layout switches.
- Rollback: revert the scoped layout change set through the integration workflow, preserving intervening feature/release commits. No data rollback or migration is needed.

## Deferred Evidence and Coordination

| Item                                                                                              | Owner / Target                                                           | Disposition                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Visual confirmation on authenticated subpages, authenticated header heights and AC3 timing states | UAT, post-merge on uat.ummahflow.com (Release and UAT Sequencing step 3) | Pending evidence, not a scope deferral; tracked in 265-open-actions.md; production release blocked until confirmed.                     |
| Exact historical introduction of the chooser overlap                                              | Analyst, only if later regression history is needed                      | Not required to implement the established layout correction.                                                                            |
| Exact release/bundle assignment                                                                   | Roadmap + DevOps, Plan 265 Stage 1                                       | Deferred until fresh version pre-flight; user acknowledged 2026-09-26T20:01Z.                                                           |
| Analysis lifecycle status/closure                                                                 | Analyst or control window, before implementation handoff                 | Analysis identity inherited unchanged. Planner's allowed write surface is planning only, so analysis status/move is not performed here. |

Product scope remains settled: all /create descendants are included, the current #396 contract is the reference, ScrollablePageLayout remains, and worktree cleanup is excluded. AC1-AC7 acceptance and release-deferral acknowledgement are recorded (2026-09-26T20:01Z). No promise is made to correct unrelated global-header overflow.

## Critic Revision Response

| Finding | R1 Response                                                                                                                                                                                                                                                                                                 | Remaining Gate                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| C265-1  | AC3, Header Timing Contract, M1 and M3 prohibit transient overlap, distinguish all measurement states and identify the acceptance evidence boundary.                                                                                                                                                        | Resolved by Critic 19:58Z.                                                                 |
| C265-2  | Issue #430 mirrors AC1-AC7 with all required gate fields.                                                                                                                                                                                                                                                   | Resolved by Critic 20:01Z after user acceptance; issue moved draft -> blocked in R2.       |
| C265-3  | Decision 8 retains the Roadmap + DevOps Stage 1 deferral.                                                                                                                                                                                                                                                   | Resolved by Critic 20:01Z after user acknowledgement; release obligation remains DEFERRED. |
| C265-5  | R2 adds Release and UAT Sequencing (pre-merge conditional UAT, merge gate, post-merge UAT trigger/owner/closure, production gate, fix-forward vs revert failure path, 265-open-actions.md), Decision 7, and aligns Pipeline, M3, M4, Duration Estimates and issue Dependencies/Blockers. AC1-AC7 unchanged. | Critic re-review. Planner does not close Critic findings.                                  |

### Approval Record

- User acceptance of AC1-AC7: ACCEPTED 2026-09-26T20:01Z ("Yes aggreed").
- User acknowledgement of exact patch-version/bundling deferral to Roadmap + DevOps at Plan 265 DevOps Stage 1: ACKNOWLEDGED 2026-09-26T20:01Z, with the constraint that UAT can only be confirmed after deployment to main; interpretation confirmed 20:04Z.
- Critic re-review of R2: APPROVED 2026-09-26T20:09Z in [Critique 265](../critiques/closed/265-create-desktop-layout-plan-critique.md).
- Issue workflow status: ready; AC1-AC7 accepted and Critic approval recorded. GitHub open/closed state is separate from this workflow status.

No Critic finding or issue checklist outcome is marked complete by this planning revision.

## Duration Estimates

| Phase          | Rough Range                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Analysis       | Existing analysis complete; 1-2 hours for expanded-route confirmation if needed                                      |
| Planning       | 1-2 hours including critique revision                                                                                |
| Implementation | 1-2 working days                                                                                                     |
| QA             | 0.5-1 day, owned by QA                                                                                               |
| UAT            | Pre-merge conditional review 0.5 day; post-merge confirmation 0.5 day after Deploy to UAT, plus account availability |
| DevOps         | 1-2 hours for Stage 1 and merge; production dispatch after post-merge UAT confirmation                               |

Uncertainty drivers: nested form widths, separate authentication branches, available authenticated environment, and concurrent create-flow changes. This is one frontend layer; no backend dependency graph, performance benchmark milestone, or migration inventory applies.

## Handoff

Session: S265-create-desktop-layout
Root: /Users/NARAFIQ/Projects/uflow-wt/265-create-desktop-layout
Workspace: /Users/NARAFIQ/Projects/uflow-wt/265-create-desktop-layout + /Users/NARAFIQ/01 Personal/Projects/.agent
Branch: fix/265-create-desktop-layout
Artifacts: agent-output/<domain>/265-...
Scope: Do not read/write outside this worktree and referenced artifacts.
Lifecycle: Do not allocate new IDs or update agent-output/.next-id outside the control window.

Next: Implementer may begin Plan 265; Critic APPROVED R2 at 2026-09-26T20:09Z. User acceptance of AC1-AC7 and release-deferral acknowledgement are recorded. Final post-merge UAT and production gate remain as specified in Release and UAT Sequencing. Memory is unavailable; this artifact is the decision record.

Implementation complete (2026-09-26T20:51Z): see [agent-output/implementation/265-create-desktop-layout-implementation.md](../implementation/265-create-desktop-layout-implementation.md). Next: Code Reviewer, then QA, then UAT pre-merge conditional approval, per the Release and UAT Sequencing above.
