---
ID: 083
Origin: 082
UUID: d7f2a41c
Status: In Review
---

# Code Review: Plan 083 — Admin Community Service Edit Page

Plan Reference: agent-output/planning/083-admin-community-service-edit-plan.md
Implementation Reference: agent-output/implementation/083-admin-community-service-edit-implementation.md
Architecture Reference: agent-output/architecture/system-architecture.md
Date: 2026-04-06
Reviewer: Code Reviewer

## Changelog

| Date | Agent Handoff | Request | Summary |
|---|---|---|---|
| 2026-04-06 | Implementer -> Code Reviewer | Review implementation before QA | 2 high, 2 medium, 1 low finding; verdict REJECTED |

## Scope & Checklist Applicability

- Path Refactor / File Move Checklist: Applicable (critique file moved to `closed/`).
  - Search terms used: `082-community-service-detail-parity-critique.md`
  - Areas checked: `scripts/**`, `.github/workflows/**`, `deploy/**`, `docs/**`
  - Result: no stale references in high-risk areas.
  - Additional repo-wide check found one stale reference in implementation doc (see Low finding L1).
- Agent Spec / Cross-Workspace Path Checklist: Not applicable.
- Deployment Path Audit Checklist: Not applicable (no deploy surface changes).
- Outbound Data-Flow Cross-Trace Checklist: Not applicable (no query-param contracts introduced).
- Interaction-Layer Audit Checklist: Applicable (`fixed` overlay + `sticky` footer added in edit page).
  - Checked: `fixed inset-0 z-50` modal wrapper and `sticky bottom-0` footer in `src/app/(dashboard)/dashboard/community-services/[id]/edit/page.tsx`.
  - Result: no blocking pointer-event interception found.
- Shared Results Actionability Checklist: Not applicable.
- Deleted-Module Residue Sweep: Not applicable (no module deletions in implementation scope).

## Files Reviewed

- src/app/(public)/profile/providers/[provider_id]/page.tsx
- src/app/(public)/profile/providers/[provider_id]/edit/page.tsx
- src/app/(dashboard)/dashboard/community-services/[id]/edit/page.tsx
- src/app/api/admin/community-services/[id]/route.ts
- src/app/api/admin/edit-community-service/route.ts
- src/app/api/admin/review-community-service/route.ts
- src/services/admin/communityServices.ts
- src/lib/validations/adminSchemas.ts
- src/__tests__/app/profile-providers-server-path.test.tsx
- src/__tests__/services/admin-community-service.test.ts
- src/__tests__/api/admin-get-community-service.test.ts
- src/__tests__/api/admin-edit-community-service.test.ts
- src/__tests__/api/admin-review-community-service.test.ts
- agent-output/implementation/083-admin-community-service-edit-implementation.md
- agent-output/implementation/082-community-service-detail-parity-implementation.md
- package.json
- package-lock.json
- CHANGELOG.md

## Architecture Alignment

Status: MINOR_DEVIATIONS

- Positive: Admin API/service layering aligns with existing provider moderation architecture and role-gated server routes.
- Deviation: Planned scope includes Milestone 8 sub-pages (category/offers/needs/images/social) as in-scope and required in validation, but implementation explicitly defers M8.

## TDD Compliance Check

- TDD table present in implementation doc: Yes
- All rows complete: Yes
- Concerns:
  - Multiple rows are explicitly marked post-fix/retroactive rather than test-first.
  - Schema validation behavior is not directly tested; API tests mock `adminSchemas` parse methods (see M2).

## Findings

### High

1. Planned Milestone 8 scope not implemented (constraint-sensitive)
- Severity: High
- Location:
  - `agent-output/planning/083-admin-community-service-edit-plan.md:189` (M8 declared in-scope)
  - `agent-output/planning/083-admin-community-service-edit-plan.md:295` (Validation requires sub-page navigation functionality)
  - `agent-output/implementation/083-admin-community-service-edit-implementation.md:45` (M8 marked deferred)
  - `agent-output/implementation/083-admin-community-service-edit-implementation.md:189` (Outstanding: M8 deferred)
  - `src/app/(dashboard)/dashboard/community-services/[id]/edit/page.tsx` is the only file under this route; no sub-page files exist.
- Issue: The approved plan defines M8 sub-page routes as in-scope with explicit acceptance criteria and includes them in validation. The implementation defers M8 without an explicit "risk accepted for this release" disposition by an approver.
- Recommendation: Either (a) implement M8 sub-pages before QA, or (b) obtain explicit release-risk acceptance and update plan + implementation + open-actions with approver and rationale.

2. Validation error logging captures raw request body (PII/log-injection risk)
- Severity: High
- Location: `src/app/api/admin/edit-community-service/route.ts:64`
- Issue: On validation failure, logger records `{ body, error }` directly. This can persist unsanitized user input and contact fields (email/phone) to logs. Existing provider review route already avoids raw-body logging and logs whitelisted keys only.
- Recommendation: Replace raw-body logging with whitelisted fields (e.g., `communityServiceId`, `reviewStatus`-style pattern) and never log full request payloads.

### Medium

1. Review feedback can remain stale after approve/needs_revision transitions
- Severity: Medium
- Location: `src/services/admin/communityServices.ts:142`
- Issue: `updateCommunityServiceReview` only sets `review_feedback` when non-null feedback is provided. For approve/needs_revision actions, route passes `null`, but service does not clear existing `review_feedback`, allowing stale rejection text to persist.
- Recommendation: Align with provider semantics: always set `review_feedback` to sanitized value or `null` based on the validated payload.

2. Schema behavior is not truly covered by tests
- Severity: Medium
- Location:
  - `src/__tests__/api/admin-edit-community-service.test.ts:13`
  - `src/__tests__/api/admin-review-community-service.test.ts:13`
- Issue: API tests mock `communityServiceEditUpdateSchema` and `communityServiceReviewUpdateSchema` parse methods, so real schema constraints in `src/lib/validations/adminSchemas.ts` are not validated by tests.
- Recommendation: Add direct schema unit tests for valid/invalid payloads and rejection-feedback requirement; keep route tests focused on route behavior.

### Low / Info

1. Stale document path after critique file move
- Severity: Low
- Location: `agent-output/implementation/082-community-service-detail-parity-implementation.md:21`
- Issue: References `agent-output/critiques/082-community-service-detail-parity-critique.md`, but file was moved to `agent-output/critiques/closed/082-community-service-detail-parity-critique.md`.
- Recommendation: Update the reference path for documentation integrity.

## Positive Observations

- Plan 082 M8 bugfix (server import for profile provider pages) is correctly applied and regression-tested.
- Review route introduces proper auth/role/rate-limit guards and structured error handling.
- New service and route test coverage materially improves confidence in admin CS edit/review flows.

## Verdict

Status: REJECTED

Rationale: Two high-severity issues block QA handoff: (1) plan-constrained in-scope functionality (M8 sub-pages) is deferred without explicit risk acceptance, and (2) raw payload logging in an admin API route introduces avoidable security/privacy risk. Medium issues further indicate correctness and coverage gaps.

## Required Actions Before QA

1. Resolve M8 disposition: implement sub-pages OR obtain explicit release risk acceptance with named approver and synchronized artifact updates.
2. Remove raw request-body logging from `edit-community-service` validation failure path.
3. Ensure review feedback is explicitly cleared when review status is approved/needs_revision.
4. Add real schema unit tests for `communityServiceEditUpdateSchema` and `communityServiceReviewUpdateSchema`.
5. Fix stale critique path reference in Implementation 082 doc.

## Next Step

Handoff back to Implementer for fixes. QA should not start until re-review passes.
