---
ID: 055
Origin: 055
UUID: b7e4a3f1
Status: OPEN
---

# Critique 055 — Plan 055: Home page category gallery image HTTP 400 bugfix

**Artifact**: `agent-output/planning/055-category-image-400-plan.md`
**Analysis**: `agent-output/analysis/closed/055-category-image-400-analysis.md`
**Date**: 2026-03-24
**Status**: Initial review
**Verdict**: APPROVED

## Changelog

| Date (UTC)        | Handoff          | Request                    | Summary                                                    |
| ----------------- | ---------------- | -------------------------- | ---------------------------------------------------------- |
| 2026-03-24T11:53Z | Planner → Critic | Initial review of Plan 055 | Full critique completed; plan APPROVED with advisory notes |

## Value Statement Assessment

**PASS** — The value statement follows the correct user story format ("As a home page visitor, I want every category gallery to load real images or a graceful fallback, so that UFlow feels trustworthy…"). It directly ties to the Master Product Objective ("first thought when any Muslim seeks a service") because a broken landing page erodes the trust foundation that drives repeat visits.

The value is concrete, user-facing, and measurable: the HTTP 400 disappears and the visual breakage is resolved.

## Overview

Plan 055 addresses a verified production bug where the Clothing & Fashion category gallery on the home page shows broken image placeholders because the upstream Supabase Storage object does not exist. The plan scopes three deliverables:

1. Correct the broken data reference
2. Harden the gallery component with a client-side `onError` fallback
3. Add regression test coverage for the bug path

This is a well-scoped bugfix plan with clear analysis backing (Analysis 055, verified via curl against production). The plan correctly identifies both the immediate data defect and the systemic UI weakness, and addresses both.

## Architectural Alignment

**PASS** — The plan stays within the established architecture:

- Media in Supabase Storage (no new storage service)
- Next.js image optimization as delivery path (no CDN change)
- Standard GitHub Actions/Docker/Hetzner deployment pipeline
- No new external dependencies or services introduced
- Consistent with Postgres-first philosophy — the data correction is tracked in repo-managed artifacts

The plan explicitly avoids `next.config.js` changes, which is correct per the analysis findings.

## Scope Assessment

**PASS** — The scope is appropriately tight for a production bugfix:

- In-scope items directly resolve the reported issue and add defense-in-depth
- Out-of-scope items are reasonable exclusions (no gallery redesign, no media admin UI)
- The handoff note to fix the reported issue first before considering broader cleanup is a good prioritization call

## Technical Debt Risks

**LOW** — The plan actively reduces existing technical debt:

- Adding `onError` handling to `UnifiedGallery` eliminates a known failure mode that could recur with any future stale URL
- Requiring tracked data artifacts for the category image correction addresses the existing schema drift noted in Analysis 055

One latent debt item the plan acknowledges but defers: the `category_images` column still lacks a formal Supabase migration. The plan says "capture the relevant schema/data correction in `supabase/migrations/` or another tracked, reproducible database artifact." This is adequate for the bugfix scope — a full schema migration for the column is separate work.

## Findings

### MEDIUM — M1: Deferred asset decision creates implementation ambiguity

**Status**: OPEN (advisory)
**Description**: The Decision Record includes `[DEFERRED: product owner + source asset unknown]` for whether the Clothing & Fashion image is the original file re-uploaded or a different replacement. Plan Step 1 also defers this to implementation.
**Impact**: The implementer must make a content/product decision (which image to use) that is normally a product owner responsibility. This could cause implementation to stall waiting for direction, or the implementer could pick an arbitrary image.
**Recommendation**: Acceptable for a bugfix plan — the plan explicitly allows the implementer to use any approved replacement. However, the implementer should record their choice in the implementation notes so it can be reviewed post-hoc. No plan revision needed; this is advisory for the implementer handoff.

### LOW — L1: Missing `.github/chatmodes/planner.chatmode.md`

**Status**: OPEN (process)
**Description**: The planner chatmode file does not exist in the repository.
**Impact**: No functional impact on this plan. Critic mode instructions require checking for it.
**Recommendation**: Note for future process improvement; not blocking for Plan 055.

### LOW — L2: Flowbaby memory unavailable during critique

**Status**: OPEN (process)
**Description**: Flowbaby retrieval tool was disabled during this review session. Operating in no-memory mode.
**Impact**: No cross-session context was available to inform review. Mitigated by reading the analysis and plan artifacts directly.
**Recommendation**: No action needed for this plan.

## Unresolved Open Questions

The plan itself contains no `OPEN QUESTION` items. The analysis had three open questions, but the plan appropriately addressed them:

1. "Was the file ever uploaded?" → Plan defers source asset decision to implementation with explicit fallback permission
2. "Is the original image in version control?" → Plan allows any approved replacement
3. "Are NULL category_images intentional?" → Plan scopes only the reported broken reference, not NULL entries (which already fall through to placeholder safely)

## Decision Record Check

All decisions are marked `[RESOLVED]` except one `[DEFERRED]` item:

- `[DEFERRED: product owner + source asset unknown + validate during implementation/release v0.8.24]` — Acknowledged in Finding M1 above. The deferral is reasonable because the implementer has explicit permission to proceed with any valid image, and the exact asset is a product taste decision, not a technical blocker.

**User acknowledgement requested**: This plan proceeds with the deferred asset selection decision delegated to the implementer. Please confirm this is acceptable.

## Risk Assessment

The identified risks are well-matched to the problem space:

- Source image unavailability → mitigation (replacement asset) is practical
- Manual production drift → mitigation (tracked artifacts) aligns with repo conventions
- Fallback behavior change → mitigation (regression tests) is appropriate
- CI-only verification gap → mitigation (post-deploy smoke check) matches prior release practice

No additional risks identified.

## Recommendations

1. **Implementer handoff**: The implementer should treat the deferred asset decision as a "pick any valid, appropriate image" delegation and document their choice.
2. **Regression test naming**: Follow the project convention from `.github/copilot-instructions.md` — name tests with `[pre-fix FAILS]` and `[post-fix PASSES]` patterns to make the bug visible.
3. **Broader category audit**: After this fix ships, consider a follow-up sweep of all `category_images` references against live storage to catch any other stale URLs. This is explicitly out of scope for this plan but worth tracking.

## Revision History

_Initial review — no revisions yet._
