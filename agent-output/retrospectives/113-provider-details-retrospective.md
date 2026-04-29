---
ID: 113
Origin: 113
UUID: 7e2f4a91
Status: Active
---

# Retrospective 113: Provider Details Page Full UI Enhancement

**Plan Reference**: `agent-output/planning/closed/113-provider-details-enhancement.md`
**Date**: 2026-04-29T12:00Z
**Retrospective Facilitator**: retrospective

---

## Summary

**Value Statement**: As a user browsing provider/restaurant detail pages on UFlow, I want to see comprehensive, well-structured information (open status, menu items, opening hours, trust signals, nearby options, values/amenities, feedback, certifications) with clear visual hierarchy and collapsible sections, so that I can make informed decisions about engaging with a provider.
**Value Delivered**: YES
**Implementation Duration**: ~22 hours (2026-04-28T14:00Z plan created → 2026-04-29T11:40Z Stage 2 released)
**Overall Assessment**: Large feature release (9 user-facing features + DB schema) delivered successfully with two Code Review rejection loops. Interaction-layer bugs (scroll-lock, swipe gesture, overnight hour logic, focus trap) were all caught by Code Review and remediated before QA — a strong signal that the CR checklist is doing its job. DevOps Stage 1 was clean (branch already at origin/main HEAD, no rebase needed). Requirement change mid-cycle (popup policy: one-time dismiss → first-10-opens counter) caused artifact drift that was caught and fixed in-review. All 1161 tests green; zero regressions.
**Focus**: Repeatable process improvements over one-off technical details.

---

## Timeline Analysis

| Phase | Planned Duration | Actual Duration | Variance | Notes |
|-------|-----------------|-----------------|----------|-------|
| Planning | Not estimated | ~30min (2026-04-28T14:00Z → 14:30Z) | — | One revision pass after critique; all 12 decisions resolved before implementation |
| Critique | Not estimated | ~30min (2026-04-28T14:00Z → 14:30Z) | — | 5 findings (2 MEDIUM, 3 LOW), no blocking issues; revised in same session |
| Implementation | Not estimated | ~7.5h (2026-04-28T14:30Z → 21:52Z) | — | TDD-first cycle; all M1–M6 in one pass; M7 deferred to DevOps |
| Code Review Round 1 | Not estimated | ~30min | — | REJECTED: overnight carry-over logic (HIGH), popup focus trap (HIGH), nearby loading state (MEDIUM) |
| Code Review remediation | Not estimated | ~20min | — | Fixed 3 CR findings + pre-QA interaction blocker (swipe drag-session) + badges 42703 fallback |
| Code Review Round 2 | Not estimated | ~20min | — | APPROVED_WITH_COMMENTS; LOW artifact-drift fixed in-review |
| QA Phase 1 (strategy) | Not estimated | ~10min | — | Test strategy written before execution |
| QA Phase 2 (execution) | Not estimated | ~15min | — | 1161 tests run; 2 bugs fixed during testing (JSX lint + closure stale-value) |
| UAT | Not estimated | ~15min | — | All 6 success criteria; 7 workflows validated; APPROVED FOR RELEASE |
| DevOps Stage 1 | Not estimated | ~30min | — | Clean rebase (already at origin/main HEAD); critique closed; version bumped; committed |
| DevOps Stage 2 | Not estimated | ~20min | — | Push, tag, release, issue close, roadmap update |
| **Total** | N/A | **~22 hours** | — | Elapsed time including wait states; active agent work ~3–4 hours |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Decision Record resolved all 12 decisions before implementation**: Every architectural choice — dual-path (D1), JSONB column (D3), popup scope (D4/D12), V1 city-only proximity (D9), semver (D10), link destination (D11) — was locked in the plan before the implementer started. The implementer had unambiguous answers and zero implementation-time decision requests. This compressed the implementation cycle and prevented scope creep.

- **Critique resolved all 5 findings in a single revision pass**: The Critic raised 5 findings (F1–F5) and the Planner addressed all of them in one cycle (plan revised at 14:30Z, same session). No finding required a second round. The MEDIUM findings (F1 "In der Nähe" strategy, F2 semver) were genuinely important catches — without them the implementer would have faced an open architectural question (PostGIS vs. city-filter) during implementation and produced a misnamed patch release.

- **Code Review checklist caught interaction-layer bugs that would have reached UAT**: The interaction-layer audit checklist triggered for `useImageSwipe`, `useScrollLock`, `ProviderDetailPage`, and `ProviderDetailModal`. This caught three blocking issues: (1) overnight window logic that made Mon 22:00–02:00 show closed at Tue 01:00, (2) popup focus trap missing Tab/Shift+Tab cycle, (3) swipe gesture calling `preventDefault()` outside an active drag session. All three are invisible to component-level unit tests but would have been user-visible regressions.

- **Post-UAT code delta was zero**: No code changes were made between UAT approval and the Stage 1 commit. The only changes post-UAT were to agent-output documents (popup policy description alignment). The DevOps delta check confirmed this cleanly. This is the intended behavior — UAT approves a specific code state, and that exact state is what gets committed and released.

- **Stage 1 was clean with no rebase required**: The worktree branch was already at origin/main HEAD (the session started from the latest main). The merge-base ancestor check confirmed no divergence. Compared to Plan 089 (which required rebasing 3 diverged commits at Stage 2), this was a zero-friction release path.

- **QA adopted a test-strategy-first approach**: QA Phase 1 produced a written test strategy before any test execution, documenting 7 critical workflows, the 70/20/10 test pyramid, and specific edge cases (malformed JSONB, midnight boundary, overnight window, first-10-opens popup counter). This gave a clear scope for Phase 2 execution and made it easy to confirm coverage at UAT.

### Agent Collaboration Patterns

- **CR-rejection loops were structured and rapid**: Both rejection rounds followed a consistent pattern: CR identifies root cause, Implementer reproduces the bug with a failing test (RED), then fixes (GREEN). The `[pre-fix FAILS] / [post-fix PASSES]` test naming convention (from PI-045) made the bug path explicit. Each round-trip (CR → Implementer → CR) took under 30 minutes.

- **Memory continuity was maintained across all 10+ phase transitions**: Flowbaby memory was retrieved at each phase boundary. No agent started a phase without prior context. The Code Review rejection record (stored by the CR agent immediately after rejection) was retrievable by subsequent agents, preventing any phase from proceeding under the false assumption that CR was approved.

- **DevOps discovered and documented pre-existing vite vulnerabilities without blocking release**: `npm audit --audit-level=high` returned 11 vulnerabilities (9 moderate, 2 high) in `vite`. DevOps correctly assessed these as pre-existing (Plan 113 adds no new npm packages), documented them as DF-4 in the open-actions tracker, and did not block the release. This is the correct triage pattern for pre-existing security findings.

### Quality Gates

- **Zero regressions across 1161 tests**: Plan 113 is the largest feature addition in recent history (9 features, new DB column, 6 new components, hooks refactored). Zero regressions demonstrates accurate scope isolation and effective regression tests on modified hooks (`useImageSwipe`, `useScrollLock`, `badges.server.ts`).

- **Accessibility tested explicitly, not assumed**: Focus trap behavior (Tab/Shift+Tab cycle, ESC, click-outside, `aria-modal`) was covered by dedicated tests (`HalalTrustPopup.test.tsx`). The Code Review accessibility checklist item was what prompted the initial focus trap finding — the plan acceptance criteria alone would not have caught this.

- **Open-actions tracker created at DevOps Stage 1**: Five deferred items (DF-1 through DF-5) were recorded in `113-open-actions.md` with owners, triggers, and evidence requirements. This prevents deferred items from becoming invisible after the release document is archived.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

- **Code Review required two rejection rounds before passing**: CR Round 1 rejected on three findings — overnight status logic (HIGH), popup focus trap (HIGH), and nearby loading state (MEDIUM). CR Round 2 (post-remediation) surfaced an additional interaction-layer blocker (swipe drag-session) and a separate pre-QA quality blocker (badges 42703 fallback). In total, the implementer returned to remediation twice before CR approval. Root cause: the implementation had no checklist item requiring the implementer to self-audit interaction surfaces (scroll, touch, gesture) before submission. The CR Interaction-Layer Audit checklist covers this for the reviewer, but a symmetric pre-submission checklist for the implementer would catch these bugs before they reach CR.

- **Popup policy changed mid-cycle without artifact synchronization**: The original plan specified one-time dismissal (`uf_halal_popup_dismissed`). During implementation the policy was changed to first-10-opens counter (`uf_halal_popup_view_count`). The code reflected the new policy, but the plan decision records, implementation TDD table, and QA test evidence still described the old policy. The Code Reviewer discovered this drift and fixed it in-review (LOW finding). Root cause: requirement changes during implementation should trigger an immediate artifact update in the same session — not deferred to code review.

- **QA fixed two bugs during test execution** (JSX prop ordering lint error in `HalalTrustPopup.tsx`, stale closure in `useImageSwipe` hook). These should have been caught during implementation before CR submission. The prop ordering issue would have been caught by a pre-submission lint run. The closure issue is more subtle (useState → useRef for drag coordinates), but was an interaction bug that an interaction-layer self-audit would have prompted.

- **Build gate remains deferred to CI**: `npm run build` cannot be executed in the worktree due to missing `NEXT_PUBLIC_SUPABASE_URL`. This has been the accepted constraint for all worktree sessions. It means the actual Next.js production build is never verified locally before release — only in CI on PR merge. If the CI build fails post-release (due to an env-conditional server component error not caught by Vitest), the only recovery path is a hotfix commit. This is a known, accepted risk — but it has been deferred across multiple releases without a resolution plan.

### Agent Collaboration Gaps

- **Implementer lacked an interaction-layer self-audit step**: The plan milestones (M1–M6) include acceptance criteria for functional correctness but no explicit interaction-layer checklist: "Does any new touch handler call preventDefault outside a confirmed gesture? Does the modal lock both body AND html overflow? Does any new popup implement a keyboard focus trap?" These are non-obvious correctness requirements that require explicit enumeration — they are not derivable from "add a popup component." The CR checklist catches them post-submission, but the implementer cannot self-verify without equivalent criteria in the plan.

- **Requirement change (popup policy) had no defined propagation protocol**: When the popup policy was changed from one-time to first-10-opens during implementation, there was no artifact update protocol to follow. The implementer updated the code and moved on. The downstream plan document, TDD table, and QA test evidence were all left describing the old behavior. A simple rule — "any requirement change during implementation must update the relevant plan decision record in the same commit" — would prevent this class of artifact drift entirely.

- **Critique findings retained OPEN status at the row level after document-level resolution**: This is the same issue documented in Retrospective 089. The Critic updated the document verdict to APPROVED and the changelog to record resolution, but individual finding rows retained `Status: OPEN`. DevOps discovered and corrected this during Stage 1 closure. The Critic's close procedure should include a mandatory step: "Update each finding's Status field to RESOLVED before marking the document verdict APPROVED."

### Deployment Patterns

- **Build gate (DF-5) is a recurring deferred item across sessions**: The worktree `npm run build` constraint has appeared in the deferred items of multiple plans (Plan 109, 111, and now 113). The root cause is that Supabase env vars are not included in the worktree `.env.local` template. This is a configuration gap, not a code gap — but it has not been addressed. Recommendation: Add a minimal mock `.env.local` to the worktree setup documentation with placeholder values sufficient to let `npm run build` complete (build-time Next.js page collection can be skipped with `NEXT_SKIP_PRERENDER=1` or equivalent).

---

## Agent Output Analysis

### Changelog Patterns

**Total Phase Transitions**: 10  
**Handoff chain**: Planner → Critic → Planner (revision) → Implementer → Code Reviewer (REJECTED) → Implementer → Code Reviewer (REJECTED, round 2) → Implementer → QA → UAT → DevOps Stage 1 → DevOps Stage 2

| Phase | From → To | Artifact | Key Action | Issues |
|-------|-----------|----------|-----------|--------|
| Plan + Critique | Planner ↔ Critic | Plan + Critique | 5 findings, 1 revision cycle, all resolved | None |
| Implementation | Planner → Implementer | Implementation | TDD RED→GREEN, all M1–M6 | Popup policy changed, not documented |
| CR Round 1 | Implementer → Code Reviewer | Code Review | REJECTED (2H + 1M) | 3 findings missed by implementer |
| CR remediation 1 | Code Reviewer → Implementer | Implementation | Overnight + focus trap + loading state fixed | — |
| CR Round 2 | Implementer → Code Reviewer | Code Review | 2 additional blockers found | Interaction-layer audit surface expanded |
| CR remediation 2 | Code Reviewer → Implementer | Implementation | Swipe gating + badges fallback fixed | — |
| CR final | Implementer → QA | Code Review | APPROVED_WITH_COMMENTS; artifact drift fixed | LOW: artifact drift (fixed in-review) |
| QA | Code Reviewer → QA | QA Report | 2 bugs fixed during execution; 1161 tests pass | Prop ordering, closure stale-value |
| UAT | QA → UAT | UAT Report | All 6 criteria met; APPROVED FOR RELEASE | — |
| DevOps | UAT → DevOps | Deployment + Roadmap | v0.11.0 committed, tagged, released | — |

**Handoff Quality Assessment**:
- CR-rejection handoffs were precise: root cause, reproduction steps, and expected post-fix behavior all documented
- Requirement change (popup policy) was not communicated back to plan document — artifact gap discovered at CR
- QA → UAT handoff was clean; UAT had sufficient context to validate all 7 workflows without returning to QA
- DevOps Stage 1 was exception-free; all pre-commit checks passed first time

### Issues and Blockers

| Issue | Phase Found | Resolution | Escalated? | Pattern |
|-------|-------------|-----------|-----------|---------|
| Overnight carry-over logic | CR Round 1 | Fixed by Implementer with TDD | No | Missing edge-case in acceptance criteria |
| Popup focus trap absent | CR Round 1 | Fixed by Implementer with TDD | No | Accessibility requirement not in plan criteria |
| Nearby loading state | CR Round 1 | Fixed by Implementer with TDD | No | Loading-state pattern not explicit in plan |
| Swipe drag-session gating | CR Round 2 | Fixed by Implementer with TDD | No | Interaction-layer bug, no pre-submission checklist |
| Badges 42703 fallback | CR Round 2 | Fixed by Implementer with TDD | No | Query builder stale-filter — pre-existing pattern |
| Popup policy artifact drift | CR final | Fixed in-review (LOW) | No | Requirement change with no propagation step |
| JSX prop ordering lint | QA Phase 2 | Fixed by QA | No | Pre-submission lint check would have caught this |
| Closure stale-value (useState→useRef) | QA Phase 2 | Fixed by QA | No | Interaction-layer self-audit would have caught this |
| Critique finding OPEN status | DevOps Stage 1 | Normalized by DevOps | No | Recurring pattern (also Retro 089) |
| vite HIGH vulnerabilities | DevOps Stage 1 | Triaged as pre-existing; tracked as DF-4 | No | Pre-existing; not introduced by Plan 113 |
| Build gate env constraint | All phases | Deferred to CI as DF-5 | No | Recurring worktree constraint |

**Most common issue type**: Interaction-layer correctness (scroll, touch, gesture, accessibility) — 4 of 11 issues  
**Early issue prediction**: All CR findings were predictable from plan acceptance criteria gaps — none required novel discovery

---

## Value Statement Fulfillment Analysis

| Business Outcome | Delivered? | Evidence |
|-----------------|------------|---------|
| Comprehensive information display | ✅ | 9 features covering all stated information types |
| Clear visual hierarchy | ✅ | Accordion defaults, status line prominence, banner positioning |
| Informed decision-making support | ✅ | Real-time hours, values, trust signals, nearby alternatives all visible |
| Figma design parity | ✅ | Halal banner matches Figma node 277:876; status line matches 277:804 |
| Trust increase (Halal messaging) | ✅ | Banner + popup reinforce community trust values |
| No regressions | ✅ | 1161 tests, 0 failures |

---

## Process Improvement Recommendations

### PI-1: Implementer Interaction-Layer Self-Audit Checklist

**Problem**: Four of the eleven issues found (swipe drag-session, scroll-lock scope, focus trap, loading state) were interaction-layer correctness bugs that required Code Review to surface. All four are predictable from a checklist.

**Recommendation**: Add a mandatory pre-submission self-audit to the implementer's close procedure for any milestone that touches: modals, popups, drawers, carousels, swipe handlers, scroll locks, or focus management.

**Checklist items (draft)**:
- [ ] Does any new touch handler call `preventDefault()` only inside a confirmed gesture session? (no stale-start gating)
- [ ] Does any new scroll lock apply to BOTH `body` AND `html`? (single-element locks fail in some browsers)
- [ ] Does any new popup/modal implement keyboard focus trap? (Tab/Shift+Tab cycle + ESC + `aria-modal`)
- [ ] Does any new section that loads async data show a loading state, not an empty state, while in-flight?
- [ ] Has pre-submission lint been run and passed? (`npm run lint`)

**Owner**: Implementer instructions  
**Trigger**: Any milestone touching interaction surfaces

---

### PI-2: Requirement Change Propagation Protocol

**Problem**: The popup policy was changed mid-cycle from one-time dismissal to first-10-opens counter. The code was updated, but the plan decision record, TDD table, and QA test evidence were not. The drift was caught at Code Review (LOW finding), but only by chance — the Code Review agent happened to search for the old localStorage key.

**Recommendation**: Add a rule to the implementer's working procedure: "Any change to a plan requirement or design decision during implementation must update the relevant plan Decision Record entry in the same session. The implementation changelog entry must reference the decision number (e.g., 'Updated D4: popup policy changed to first-10-opens')."

**Owner**: Implementer instructions  
**Trigger**: Any mid-implementation requirement change

---

### PI-3: Critic Finding-Level Status Update on Approval

**Problem**: When the Critic document verdict changes to APPROVED, individual finding rows are not updated to `Status: RESOLVED`. This was also found in Retrospective 089 and noted as a gap. It has recurred here for Plan 113, suggesting the Critic's close procedure does not include this step.

**Recommendation**: Add to the Critic's close procedure: "Before writing the document-level verdict to APPROVED, update the Status field of each finding row to RESOLVED (or DEFERRED with owner if applicable). A document that says APPROVED in the header but shows OPEN in each finding row is contradictory."

**Owner**: Critic agent close procedure  
**Trigger**: Every critique approval

---

### PI-4: Worktree Build Gate Resolution

**Problem**: `npm run build` cannot be executed in any worktree session because `NEXT_PUBLIC_SUPABASE_URL` is absent from the worktree `.env.local`. This has appeared as a deferred item in at least three consecutive plans (109, 111, 113). The CI build is the only build gate, which means build failures are only discovered on PR merge — after the Stage 1 commit is already structured.

**Recommendation**: Two options:
1. **Preferred**: Add a worktree `.env.local` setup step with placeholder Supabase values that are sufficient for Next.js to complete build-time page collection without actual DB calls. Document in `START_HERE.md`.
2. **Fallback**: Add `NEXT_TELEMETRY_DISABLED=1 NEXT_SKIP_PRERENDER=1 npm run build` as an alternative DevOps pre-commit step that skips server-side page pre-rendering and only validates the webpack/turbopack compile step.

**Owner**: DevOps instructions + `START_HERE.md`  
**Trigger**: Worktree session setup

---

## Positive Technical Patterns (Document for Reuse)

These patterns worked well and should be carried forward:

1. **Defensive JSONB parsing pattern** (`getOpenStatus()`): Parse, catch on TypeError/unexpected structure, return `{ hidden: true }` fallback. No runtime crash on bad DB data.
2. **DOM-attribute scroll lock counter** (`data-scroll-lock-count`): Enables HMR recovery without requiring a page reload. Pattern is more resilient than module-state-only counters.
3. **Active drag-session ref guard** (`useImageSwipe`): Using `useRef` (not `useState`) for drag coordinates prevents stale-closure bugs. Move handler checks ref before calling `preventDefault()`. Prevents vertical scroll suppression outside genuine swipe gestures.
4. **First-N-opens counter pattern** (Halal popup): Global localStorage counter (`uf_halal_popup_view_count`) is simpler than per-provider dismissal tracking and gives a bounded display window. Useful for any onboarding or educational popup that should phase out naturally.
5. **Independent query builders for fallback paths** (`getBadgesForEntityServer()`): Sharing a query builder between primary and fallback paths risks stale filter propagation. Build independently, not by chaining `.not()` onto a shared ref.

---

## Known Deferred Items

Tracked in `agent-output/planning/113-open-actions.md`:

| Item | Owner | Status |
|------|-------|--------|
| DF-1: Performance baseline (LCP/bundle) | DevOps/Analytics | Open |
| DF-2: Nearby distance V2 (PostGIS) | Planner/Implementer | Open |
| DF-3: `/halal` info page content | Product/Content | Open |
| DF-4: vite HIGH vulnerability remediation | Implementer | Open |
| DF-5: Build gate CI verification on PR merge | CI/DevOps | Open |

---

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-29T12:00Z | Retrospective | Initial retrospective created; 4 process improvement recommendations; 5 positive technical patterns documented |
