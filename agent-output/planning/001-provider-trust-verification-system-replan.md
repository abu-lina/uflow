---
ID: 001
Origin: 001
UUID: 3f8b1c2a
Status: UAT Approved
---

# Implementation Plan (Replan): Provider Trust & Verification System

**Plan ID**: 001  
**Epic Alignment**: 2.1 — Provider Trust & Verification System  
**Target Release**: v0.3.0  
**Priority**: P0  
**Replan Date**: 2026-02-21

## Change Log

| Date       | Agent   | Change                          | Rationale                                                                        |
| ---------- | ------- | ------------------------------- | -------------------------------------------------------------------------------- |
| 2026-01-27 | planner | Initial plan created            | Epic 2.1 delivery plan authored and validated                                    |
| 2026-01-27 | planner | Added architecture gates F1–F4  | Required privacy/role/ranking constraints                                        |
| 2026-02-21 | planner | Replan for deployment readiness | Convert plan into “remaining work” checklist + update target release per roadmap |
| 2026-02-21 | planner | Quick revisions after critique  | Added architecture link + dependencies; resolved versioning question             |
| 2026-02-22 | qa      | QA complete                     | All QA gates passed; see agent-output/qa/001-provider-trust-verification-system-qa.md |
| 2026-02-22 | planner | Scope locked (Option A)         | UAT failed due to missing UI; user approved completing UI trust signals + endorsements for v0.3.0 |
| 2026-02-22 | qa      | QA refresh after trust UI work  | Re-validated tests/type-check/build for v0.3.0 trust UI + endorsements; updated QA report evidence |
| 2026-02-22 | uat     | UAT approved for release        | All UAT scenarios PASS; value statement delivered; trust badges + endorsement UI complete; APPROVED FOR RELEASE |

## Value Statement and Business Objective

As a **service seeker**, I want to **instantly recognize trustworthy, verified providers via privacy-safe community endorsements**, so that **I confidently choose services on UFlow and trust becomes a durable differentiator**.

## Objective

Deliver the **user-visible trust system** end-to-end:

- Trust badges show on provider pages and provider cards.
- Authenticated users can endorse/unendorse badges.
- Search ranking reliably benefits trusted providers.
- Privacy posture stays strong: no public exposure of confirmer identities.

## Scope Lock (Approved)

UAT validation for Plan 001 failed because the **user-visible UI work** was not implemented (badges not shown on provider pages/cards; endorsement controls missing). The user approved **Option A**: complete the UI trust system and re-run UAT for **Target Release v0.3.0**.

This plan is therefore explicitly responsible for delivering:

- **Provider profile trust section** (badges + aggregate confirmation counts)
- **Provider cards/search indicators** (compact trust signal)
- **Endorse / unendorse interaction** for authenticated users

Out of scope remains unchanged (admin verification UI, scholar processes, gamification).

## Non-Goals (Defer if needed)

- Admin verification workflow UI (UMMAH_FLOW_VERIFIED operational tooling)
- Scholar-led halal certification processes
- Rich gamification (user “contributor” rewards)
- User endorsement history page (nice-to-have; not required for Epic AC)

## Current State (Already Implemented)

Based on the implementation notes in agent-output/implementation/001-provider-trust-verification-system.md:

- **Architecture gates F1–F3 completed**
  - F1: Privacy-safe endorsement reads (no public access to confirmer identities)
  - F2: Unified role authority via DB helper
  - F3: DB-side ranking for stable pagination via enhanced unified search RPC
- **Services work completed** to support public-safe reads and DB-ranked search.
- **Service-layer tests added** for the new search/badge privacy flows.

Architecture constraints to preserve throughout UI work:

- agent-output/architecture/001-provider-trust-verification-architecture-findings.md

## Dependencies

- Provider profile page exists and can render a “Trust & Verification” section without violating server/client boundaries (Next.js 15).
- Search results / provider card component can display a compact trust indicator without layout regression.
- Authentication context is available to determine whether the current user can endorse and whether “you confirmed this” should render.
- Supabase RLS remains the enforcement layer for confirmer identity privacy.

## Remaining Scope to Reach “Deployable”

### A) UI: Badge display everywhere it matters

1. **Provider profile page** shows a “Trust & Verification” section:
   - Render provider badges with trust level indicators.
   - Show confirmation counts as **aggregates only**.
   - Empty state when no badges.
2. **Provider cards / search results** show a compact trust indicator:
   - Prioritize highest trust levels.
   - Keep layout stable on mobile.

### B) UI: Endorsement interaction (authenticated)

3. Add an endorsement control:
   - Logged-in users can confirm/unconfirm.
   - UI updates quickly, and errors are clearly shown.
   - Unauthenticated users see a clear “login required” path.
4. Ensure endorsement reads remain privacy-safe:
   - UI can show “you confirmed this” for the current user.
   - UI must never reveal other confirmers.

### C) Data contract + performance

5. Ensure search result hydration does not introduce N+1 patterns for badges:
   - Prefer DB-provided trust aggregates for card display.
   - Fetch full badge details only on provider detail pages.

### D) Product rollout safety

6. Confirm the feature is “safe to ship” even if partially adopted:
   - Pages render gracefully when providers have 0 badges.
   - Badges cannot break provider listing/search.

### E) Release gates (QA/UAT/DevOps)

7. Codebase gates:
   - Typecheck passes
   - Lint passes
   - Unit/integration tests pass
8. UAT gates:
   - Validate endorsements on UAT
   - Validate search ranking stability on UAT
9. Production readiness:
   - Rollout/rollback plan agreed (flag or quick revert)

## Milestones (Implementation-Ready)

1. **Wire badge display components into UI**

- Objective: user can see trust signals on provider pages + cards.
- Acceptance:
  - Badges render with clear trust level distinction.
  - Confirmation counts shown only as aggregates.
  - Loading/empty/error states exist.

  - Acceptance must be validated on:
    - Provider detail page (trust section present)
    - Any provider card/listing surfaces used for search results (compact indicator present)

2. **Implement endorsement UX (confirm/unconfirm)**

- Objective: authenticated users can endorse badges.
- Acceptance:
  - Confirm/unconfirm works end-to-end.
  - “Login required” behavior is clear.
  - No public leakage of confirmer identities.

  - Acceptance must include:
    - Authenticated happy path (confirm + revoke)
    - Unauthenticated path (clear login requirement)

3. **Verify search ranking + pagination stability**

- Objective: trusted providers surface higher without pagination instability.
- Acceptance:
  - Ordering is deterministic across pages.
  - Ranking remains explainable and consistent.

  - Note: Ranking is already DB-side (F3). This milestone focuses on ensuring the UI experience matches that contract and does not re-sort client-side.

4. **Deploy-readiness hardening**

- Objective: feature is stable under real use.
- Acceptance:
  - No new console errors on key flows.
  - Performance remains acceptable (no obvious regressions).

  - Explicitly confirm:
    - No new N+1 badge fetch patterns introduced for card surfaces
    - Public views only use aggregate badge data (F1 privacy posture preserved)

5. **Version Management and Release Artifacts**

- Objective: align versioning + changelog with the roadmap release.
- Tasks:
  - Update `package.json` version to match target release.
  - Add CHANGELOG entry for Plan 001.
- Acceptance:
  - Version artifacts are consistent.
  - Release notes clearly describe the user-visible trust system.

## Testing Strategy (High-Level)

- **Unit tests**: badge service helpers, search hydration helpers.
- **Integration tests**: endorsement flow service calls (confirm/unconfirm) and public-safe badge reads.
- **Smoke checks** (manual, in UAT): provider page badges, card indicators, confirm/unconfirm.

## Validation Commands (Expected)

- `npm run type-check`
- `npm run lint:check`
- `npm test`
- `npm run build` (or `npm run build:uat` for UAT parity)

## Risks and Mitigations

- **Privacy regression risk (HIGH)**: accidental exposure of confirmer identity.
  - Mitigation: keep public reads aggregate-only; review endpoints and UI props for user identifiers.
- **UX confusion (MED)**: users misunderstand trust levels.
  - Mitigation: minimal inline explanations/tooltips; keep copy short.
- **Performance regression (MED)**: badge joins slow down listings.
  - Mitigation: avoid N+1; keep card display to aggregates.

- **Scope creep risk (MED)**: adding UI embellishments not required for Epic AC.
  - Mitigation: ship the smallest UI that satisfies AC1–AC4; defer tooltips/gamification/admin UX.

## Duration Estimates (Rough)

- Analysis: 0.5–1h (confirm current UI integration points)
- Planning (this doc): 1–2h
- Implementation: 1–3 days (depending on existing provider card/profile structures)
- QA: 0.5–1 day
- UAT: 0.5–1 day
- DevOps: 1–3h (deployment + rollback readiness)

Uncertainty drivers: how provider profile and search card components are currently structured; whether any additional server/client boundary refactors are needed for Next.js 15.

## Open Questions

**OPEN QUESTION [RESOLVED]**: Roadmap header says “Current Version v0.2.0” but repo `package.json` is `0.2.1`. Should Plan 001 ship as **v0.3.0** per Active Release Tracker?

Decision:

- Plan 001 targets **v0.3.0** (matches the roadmap’s “Current Working Release”).
- The roadmap header “Current Version” should be updated to **v0.2.1** in a separate roadmap housekeeping change to match the repository version.

## Handoff Notes

- Implementer should work on a dedicated feature branch (recommended) and update agent-output/implementation/001-provider-trust-verification-system.md as milestones complete.
- If using `git worktree`, note that untracked folders like `agent-output/` may not appear by default; copy or symlink `agent-output/` into the worktree so the workflow artifacts remain available.
- After implementation is green, hand to Critic/Code Review, then QA → UAT → DevOps.
