---
ID: 085
Origin: 085
UUID: c7b4e2a9
Status: Resolved
---

# Critique: Plan 085 — Restore Resilient Fetch Pattern on CS Detail Page

| Field            | Value                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| Artifact         | `agent-output/planning/085-cs-detail-page-resilient-fetch-plan.md`            |
| Analysis         | `agent-output/analysis/closed/085-cs-detail-page-404-analysis.md`             |
| Date             | 2026-04-07T15:45Z                                                             |
| Status           | Initial — APPROVED                                                            |

## Changelog

| Date              | Handoff       | Request                         | Summary                        |
| ----------------- | ------------- | ------------------------------- | ------------------------------ |
| 2026-04-07T15:45Z | Planner → Critic | Review Plan 085 before implementation | Initial review — APPROVED |

---

## Value Statement Assessment

**Verdict: PASS**

The value statement is in clear user story format with two concrete personas (admin, owner) and a measurable outcome (view CS detail pages regardless of `review_status`). The "so that" clause is verifiable: admins can review/approve/reject, owners can see their submissions. Aligns directly with the platform's core mission of connecting service providers with users. Value is delivered directly, not deferred.

---

## Overview

Plan 085 is a tightly scoped bugfix restoring the resilient fetch pattern that was lost during Plan 083's rebase. The root cause is well-proven via UAT evidence (Analysis 085, F1-F7, all L1 Proven). The fix reuses existing code (`useCommunityService()` hook, Plan 082 M2) and follows the established provider detail page architecture exactly. No Supabase/RLS changes needed.

4 milestones, ~3 files changed, clear reference pattern. Classification as bugfix is correct — this is a regression, not new feature work.

---

## Architectural Alignment

**Verdict: ALIGNED**

The plan restores the exact pattern established by Plan 081 (providers) and Plan 082 (CS — original design). The three-layer resilience pattern (server SSR → nullable initialData → client React Query fallback) is the project's standard for detail pages. This fix closes the divergence between provider and CS architectures introduced during rebase.

No new patterns, no new dependencies, no new abstractions. The `useCommunityService()` hook already exists and mirrors `useProvider()`.

---

## Scope Assessment

**Verdict: WELL-SCOPED**

- **In scope**: CS detail server page, CS detail client page, 1 test file, version artifacts
- **Correctly excluded**: Profile provider pages (D4 — auth-guarded differently), RLS policies (D3 — correct as-is), other detail pages
- **Import footprint verified**: `CommunityServiceDetailPageClient` is imported only by the server page and the transform test (which uses only the exported `buildProviderShapeFromCommunityService` function, not the component)

---

## Technical Debt Risks

**Low**. This fix *reduces* tech debt by closing the provider/CS architecture divergence (Analysis W3). The `useCommunityService()` hook transitions from dead code to active code, which is a positive change.

No new debt introduced.

---

## Findings

### F1 — (LOW) M3 Test Update May Need Client Component Mock

| Field         | Value |
| ------------- | ----- |
| Status        | RESOLVED — advisory note for implementer |
| Severity      | LOW |

**Issue**: The existing test at `community-service-detail-page.server-path.test.tsx` currently relies on `notFound()` throwing before the page returns JSX. After M1 removes `notFound()`, the null-data test case will proceed to return `<CommunityServiceDetailPageClient initialData={null} communityServiceId="..." />`. In a test environment, this JSX return is a React element (not rendered), so the test can inspect its props — but the plan doesn't specify this technique.

**Impact**: Implementer needs to decide: (a) mock `CommunityServiceDetailPageClient` to inspect props, or (b) shallow-check the returned React element. Either works.

**Recommendation**: Advisory — implementer handles this as an implementation detail. Both approaches are standard.

### F2 — (LOW) Branch Strategy Left Open

| Field         | Value |
| ------------- | ----- |
| Status        | RESOLVED — implementer's choice, correctly deferred |
| Severity      | LOW |

**Issue**: Assumption #4 says "This fix ships on the existing `session/83-community-edit-ui` branch (or a new branch from `main` — implementer decides)." The session/83 branch has an open PR mixing Plan 083 changes. Adding Plan 085 to it bundles two plans in one PR.

**Impact**: No functional impact. A separate branch from `main` is cleaner for traceability but either works.

**Recommendation**: Implementer should prefer a new branch from `main` for clean PR isolation, but plan correctly leaves this as implementer's choice.

---

## Unresolved Open Questions

None. All decisions are `[RESOLVED]`. No `OPEN QUESTION` markers found.

---

## Decision Record Check

All 5 decisions (D1-D5) are marked `[RESOLVED]` with evidence. No `[OPEN]` or `[DEFERRED]` decisions.

---

## Duration Estimates Check

Present and reasonable: 2-4 hours total across all phases. Uncertainty rated "Low" for all phases given the clear reference pattern.

---

## Hotfix Risk Assessment

**"How will this plan result in a hotfix after deployment?"**

| Scenario | Likelihood | Impact | Mitigated? |
|----------|-----------|--------|------------|
| `useCommunityService()` hook has untested bug → client fetch fails → CS detail shows "not found" for ALL CS (including approved) | Very Low | HIGH — regression for approved CS pages | Yes — hook mirrors `useProvider()` exactly; proven pattern. Manual UAT validates. |
| React Query loading state renders indefinitely (network issue) | Low | MEDIUM — poor UX but not 404 | Yes — same as provider pages; React Query has `retry: 1` and timeout. |
| Downstream components (`CommunityServiceDetailModal`) receive stale or incorrect data from hook | Very Low | LOW — data is the same CommunityService type | Yes — type system enforces shape. |

**Conclusion**: Low hotfix risk. The pattern is battle-tested on provider pages.

---

## Risk Assessment

Plan risks R1-R3 are well-identified and mitigated. No additional risks identified.

---

## Recommendations

1. Implementer should use `ProviderDetailPageClient` as a line-by-line reference — the less deviation, the better.
2. QA should test the "truly non-existent CS" case (random UUID) → should show "not found" after client-side React Query exhausts its retry.
3. Consider a new branch from `main` for clean PR isolation (F2 advisory).

---

## Revision History

| Revision | Artifact Changes | Findings Addressed | New Findings | Status Changes |
|----------|------------------|--------------------|--------------|----------------|
| Initial  | N/A — first review | N/A               | F1 (LOW), F2 (LOW) — both advisory | Plan APPROVED |
