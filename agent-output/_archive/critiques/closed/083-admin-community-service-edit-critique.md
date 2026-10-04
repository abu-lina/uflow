---
ID: 083
Origin: 082
UUID: d7f2a41c
Status: Resolved
---

# Critique 083 — Admin Community Service Edit Page

**Artifact**: `agent-output/planning/083-admin-community-service-edit-plan.md`
**Analysis**: `agent-output/analysis/closed/083-uat-profile-rls-admin-cs-edit-analysis.md`
**Date**: 2026-04-06T07:29Z
**Status**: Initial Review

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|------------|---------|---------|---------|
| 2026-04-06T07:29Z | Planner → Critic | Review Plan 083 before implementation | Initial review; 0 critical, 1 medium, 2 low findings |

---

## Value Statement Assessment

**Present**: Yes — clear user story format: "As an admin or moderator, I want to view, edit, and review (approve/reject) community services from the admin dashboard, so that I can moderate community service content without direct database access — the same capability I already have for providers."

**Quality**: Strong. Concretely measurable ("same capability I already have for providers") and directly addresses the Analysis 083 F2 gap. The "so that" outcome is clear: admins currently cannot moderate CS content without database access.

**Alignment**: Directly supports platform operational capability. As CS content grows, admin moderation is essential.

**Direct value delivery**: Yes — all 10 milestones contribute directly. No deferrals of the core ask.

---

## Overview

Plan 083 is a well-structured 10-milestone plan that creates a complete admin CRUD surface for community services by mirroring the proven provider admin edit architecture. The plan correctly leverages existing infrastructure: `getSupabaseAdmin()` for RLS bypass, `logAdminAction` for audit, `rateLimiters.adminReview` for rate limiting, `ProviderEditForm` for form rendering, and `RejectModal` for rejection workflow.

The dependency graph is sound: read path (M1→M2) and write path (M3+M4→M5/M6) proceed in parallel, converging at M7 (dashboard page). M8 (sub-pages) depends on M7. M9 validates everything. M10 is final.

All 8 decisions are RESOLVED. No OPEN decisions, no DEFERRED decisions, no OPEN QUESTION items.

The plan stays within WHAT/WHY boundaries. D2 appropriately gives the implementer a fallback ("if CS-specific fields don't fit, a dedicated form is acceptable").

---

## Architectural Alignment

**Fits architecture**: Yes. The plan explicitly mirrors the existing admin provider edit architecture:
- `services/admin/providers.ts` → `services/admin/communityServiceEdit.ts`
- `api/admin/providers/[id]` → `api/admin/community-services/[id]`
- `api/admin/edit-provider` → `api/admin/edit-community-service`
- `api/admin/review-provider` → `api/admin/review-community-service`
- `AdminProviderEditPage` → new CS edit page

**Consistency**: Each new component has a direct provider equivalent. The auth, audit, rate limiting, and validation patterns are identical. This reduces cognitive load for future maintainers.

**Inter-plan coherence**: Plan 082's `AdminCommunityServiceDetailButtons` routes to `/dashboard/community-services/${id}/edit` — Plan 083 builds exactly that target. The dependency is clean and well-documented in Related Issues.

---

## Scope Assessment

**Appropriate**: 10 milestones for a full CRUD surface with sub-pages is proportionate. The plan doesn't over-scope (no new DB schema, no new auth patterns) and doesn't under-scope (includes sub-pages, audit logging, rate limiting).

**Sequencing**: Correct. M1+M3/M4 parallelisable. M7 is the integration point. M8 extends M7. Linear path to M9→M10.

**Release strategy**: Standalone, after Plan 082 ships. No bundling conflicts.

---

## Technical Debt Risks

- No new tech debt introduced. All patterns mirror existing provider admin code.
- Slight duplication risk: provider admin and CS admin routes will have near-identical auth/rate-limit/audit boilerplate. Acceptable at current scale (per project philosophy: "Start with Postgres. Don't add abstractions prematurely"). A shared admin route middleware could be considered later if a third entity type needs the same pattern.

---

## Findings

### MEDIUM

#### F1 — Reverse Transform Not Documented (Form→API Field Name Mapping)
**Status**: OPEN
**Description**: M7 describes the forward direction: "Transform CS data into Provider-shape for form rendering (reuse or adapt `buildProviderShapeFromCommunityService` from Plan 082)." This handles the READ path (CS→Provider shape for display in `ProviderEditForm`).

However, the WRITE path requires a **reverse transform**: `ProviderEditFormData` emits fields like `providerName`, `providerDescription`, `street`, etc. The `onSubmitForm` handler in M7 must map these to the CS edit API's expected field names (`communityServiceName`, `communityServiceDescription`, etc.) before calling `PATCH /api/admin/edit-community-service`.

Verified by inspecting the existing `AdminProviderEditPage` at line 58–120: it builds a `requestBody` with `providerName`, `providerDescription`, etc. — all provider-prefixed. The CS equivalent needs `communityService*`-prefixed fields per M4's Zod schema (`communityServiceEditUpdateSchema`).

This reverse mapping is not mentioned in M7's "What" or acceptance criteria.

**Impact**: The implementer will discover this during M7 when wiring `onSubmitForm`. Without advance notice, this could cause confusion or silent save failures if provider-prefixed field names are sent to the CS edit API (Zod validation would reject them — failing safely, but causing debugging time).

**Recommendation**: Add a note in M7 "What" section: "The `onSubmitForm` handler must reverse-map `ProviderEditFormData` field names (provider-prefixed) to community-service-prefixed field names matching `communityServiceEditUpdateSchema` before calling the edit API. See `AdminProviderEditPage.saveProviderEdits` for the provider equivalent pattern."

---

### LOW

#### F2 — Review Service Function Milestone Traceability
**Status**: OPEN
**Description**: M6 creates a review API route that needs a service function to update `review_status` and `review_feedback` on the `community_services` table. M1 defines `getCommunityServiceForAdmin` (read) and M3 defines `updateCommunityServiceFields` (edit), but neither explicitly mentions a review-specific function (e.g., `updateCommunityServiceReview`). The review operation has different semantics: it only updates `review_status` and optionally `review_feedback`, with different validation rules (rejection requires feedback).

**Impact**: Low — the implementer will naturally add this to the admin CS service module during M6 implementation. The gap is in milestone traceability, not in technical feasibility.

**Recommendation**: Either add a note in M3 that the write module also includes the review operation, or add a brief M3.5 item. Alternatively, accept as-is — the implementer has enough context from the provider equivalent.

---

#### F3 — `removed_by_owner` Status Edge Case
**Status**: OPEN
**Description**: Assumption 1 states the `community_services` table has `review_status` with enum values `pending`, `approved`, `rejected`, `needs_revision`, `removed_by_owner`. The review schemas (M4/M6) only accept `approved`, `rejected`, `needs_revision` as valid transitions. If an admin fetches a `removed_by_owner` CS via the GET route (M2), the edit page will render it — but attempting to change its review status is undefined behaviour. Should an admin be able to "un-remove" an owner-removed CS?

**Impact**: Low — edge case unlikely to occur in practice. The `removed_by_owner` status is set by the owner, not the admin. If an admin encounters it, they'll see the form but review actions may not apply cleanly.

**Recommendation**: No plan change needed. The implementer should handle this as a UI state: if `review_status === 'removed_by_owner'`, optionally disable review actions or show a status indicator. This is a HOW decision appropriately left to implementation.

---

## Unresolved Open Questions

None. All decisions in the Decision Record are `[RESOLVED]`. No `OPEN QUESTION` items found in the plan text.

---

## Decision Record Check

- D1–D8 all `[RESOLVED]`. ✓
- No decisions marked `[OPEN]`. ✓
- No decisions marked `[DEFERRED]`. ✓

---

## Duration Estimates Check

**Present**: Yes. Implementation: 2–3 days, QA: 0.5–1 day, UAT: 0.5 day, DevOps: 0.5 day. Total: 3–5 days.

**Assessment**: Reasonable. The primary uncertainty (M7+M8 complexity from form reuse and sub-page adaptation) is correctly identified. The 2–3 day implementation estimate accounts for the multiple API routes, service functions, schemas, and page components. The wide range appropriately reflects the R1/R2 risks.

---

## Hotfix Scenario Analysis

**"How will this plan result in a hotfix after deployment?"**

1. **Reverse-transform field mapping error** (F1): If the `onSubmitForm` handler sends `providerName` to the CS edit API instead of `communityServiceName`, Zod validation at the API layer will reject it — failing safely with a 400 error. The user sees an error toast. Not data corruption, but broken save flow. **Mitigation**: M4 Zod schemas + M9 tests. **Residual risk**: Medium if F1 not addressed; Low if noted.

2. **Partial update null overwrite**: If the CS→Provider forward transform doesn't populate all `ProviderEditFormData` fields (e.g., `street` is undefined when CS has no address), and the reverse transform maps `undefined` → `null`, the save could null out existing CS fields. **Mitigation**: M3 acceptance criteria says "only update fields that are provided." The `AdminProviderEditPage` pattern uses explicit checks (`formData.street || null`). **Residual risk**: Low — pattern is established.

3. **Sub-page component provider_id reference**: If a sub-page component (e.g., category selector) internally references `provider_id` for its API calls, it would fail for CS entities. **Mitigation**: R2 identified. Implementer traces deps in M8. **Residual risk**: Medium — sub-page internals not audited in the plan.

---

## Risk Assessment

| Category | Level | Notes |
|----------|-------|-------|
| Architectural fit | Low | Exact mirror of proven provider admin pattern |
| Scope creep | Low | 10 well-bounded milestones, clear deliverables |
| Implementation risk | Medium | Form reuse (R1) + sub-page adaptation (R2) |
| Technical debt | Low | No new debt; slight duplication acceptable |
| Hotfix probability | Low | Zod validation catches field mapping errors; save path mirrors provider |

---

## Recommendations

1. **Address F1** (MEDIUM): Add reverse-transform note in M7. This is the highest-value pre-implementation guidance — saves debugging time on the write path.
2. **F2/F3** (LOW): Optional. Implementer will handle naturally.

---

## Verdict

**APPROVED**

F1 (reverse-transform gap) is a documentation improvement, not a plan defect. The Zod validation layer ensures safe failure if field names mismatch, and the implementer has the provider admin page as a direct reference. The plan is complete, well-scoped, architecturally sound, and ready for implementation.

**Note for implementer**: When wiring M7's `onSubmitForm`, the `ProviderEditFormData` fields are provider-prefixed (`providerName`, `providerDescription`, etc.). The CS edit API (M5) expects community-service-prefixed fields per M4's schema. Build a reverse-map in the `onSubmitForm` handler — see `AdminProviderEditPage.saveProviderEdits` for the pattern.

---

## Revision History

| # | Date | Changes |
|---|------|---------|
| Initial | 2026-04-06T07:29Z | First review of Plan 083. 0 critical, 1 medium, 2 low findings. Verdict: APPROVED. |
