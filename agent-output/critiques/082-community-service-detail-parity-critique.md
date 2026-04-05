---
ID: 082
Origin: 081
UUID: b4e91f3a
Status: Resolved
---

# Critique 082 — Community Service Detail Page: Architectural + Design System Parity

**Artifact**: `agent-output/planning/082-community-service-detail-parity-plan.md`
**Analysis**: `agent-output/analysis/closed/082-community-service-detail-parity-analysis.md`
**Date**: 2026-04-05T18:58Z
**Status**: Initial Review

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|------------|---------|---------|---------|
| 2026-04-05T18:58Z | Planner → Critic | Review Plan 082 before implementation | Initial review; 0 critical, 2 medium, 3 low findings |

---

## Value Statement Assessment

**Present**: Yes — clear user story format: "As a community service owner or visitor, I want to open a community service detail page and see the same quality of presentation, loading behaviour, and design system compliance as the provider detail page, so that community services are treated as first-class entities with consistent UX."

**Quality**: Strong. Directly addresses the UAT failure from Plan 081 (user explicitly said "it should actually show the community service similar to how a provider would be shown in detail view" + "follow our design system"). The value statement captures both the architectural parity (loading behaviour) and the design system compliance, which are the two core gaps identified in Analysis 082.

**Direct value delivery**: Yes — no deferrals of the core ask. The only deferral (D8: recommendation-mode RLS) is a data-layer edge case correctly out of scope for presentation-layer parity.

---

## Overview

Plan 082 is a well-structured 7-milestone plan that coherently addresses all 6 findings (F1–F6) and 4 of the 5 system weaknesses (W1–W4) from Analysis 082. The plan correctly retains the v0.10.9 import fix and extends it to achieve full architectural parity with the provider detail page. The milestone dependency graph is sound: M1+M2 in parallel → M3 → M4+M5 → M6 → M7. Decision D4 (reuse `ProviderDetailModal` for desktop) is the right call — it eliminates the dual-modal maintenance burden and guarantees design system alignment by construction.

The plan stays within WHAT/WHY boundaries and gives the implementer appropriate freedom on HOW.

---

## Architectural Alignment

**Fits architecture**: Yes. The plan adopts the proven SSR → nullable initialData → React Query → graceful loading/error pattern already established by the provider detail page. This is the canonical UFlow pattern for entity detail pages.

**Consistency**: D4 (reuse `ProviderDetailModal`) aligns with the existing mobile approach where `ProviderDetailPage` already handles community services via `isCommunityService` checks. Extending this to desktop creates a single rendering path for both entity types.

**Risk noted**: `ProviderDetailModal` currently accepts `provider: Provider` typed interface and hardcodes `bookmarkableType: 'provider'` (verified at line 57). The plan's Risk #1 covers this generally, but the specific adaptation gaps should be surfaced to the implementer. See F1 below.

---

## Scope Assessment

**Appropriate**: The 7 milestones cover the complete gap identified in Analysis 082 without overreaching. M5 (deprecate, don't delete) is prudent scoping — deletion requires a separate import-site audit.

**Sequencing**: Correct. M1 and M2 are independent and parallelizable. M3 is the integration point. M4 and M5 are M3-dependent but independent of each other.

**Release strategy**: Standalone, building on v0.10.9. No bundling conflicts identified.

---

## Technical Debt Risks

- D9 creates intentional tech debt (deprecated but not deleted component). This is correctly scoped and tracked.
- D8 defers the RLS recommendation-mode edge case. This is appropriate — it's a data-layer issue, not a presentation concern.
- The existing `CommunityServiceDetailModal` may still be imported by other parts of the codebase (search results, lists). The plan acknowledges this in M5 and limits the scope to the detail page import only.

---

## Findings

### MEDIUM

#### F1 — ProviderDetailModal Interface Adaptation Not Specific Enough
**Status**: OPEN
**Description**: Plan correctly identifies Risk #1 ("ProviderDetailModal needs non-trivial changes") and M3 mentions "Transform community service data into provider-compatible shape and render through ProviderDetailModal." However, code verification reveals two specific adaptation points that the implementer needs to address:

1. **Hardcoded `bookmarkableType: 'provider'`** at line 57 of `ProviderDetailModal.tsx` — community services need `bookmarkableType: 'community_service'` for correct bookmark persistence. M3's acceptance criteria includes "Bookmark functionality works correctly with `community_service` type" but the plan doesn't surface the specific line/mechanism that needs changing.

2. **Typed interface `provider: Provider`** — `ProviderDetailModal` accepts `Provider` type, not a union. The transformed community-service-as-provider data will need either (a) a type assertion, (b) the `Provider` type to accommodate community services, or (c) a type union at the interface level.

**Impact**: Without attention to #1, bookmarks would silently save under `'provider'` type in the database — a data integrity issue not immediately visible in UAT. Item #2 is a TypeScript compilation issue the implementer will discover, but surfacing it in the plan saves investigation time.

**Recommendation**: Add a note in M3 or M4 "What" section calling out: (a) `ProviderDetailModal` hardcodes `bookmarkableType: 'provider'` at line 57 — implementer must make this dynamic based on `community_service_id` presence, (b) the `provider: Provider` typed prop will need adaptation for the transformed community service shape.

---

#### F2 — D8 (Deferred) Missing Required Fields
**Status**: OPEN
**Description**: Decision D8 is marked `[DEFERRED: User — requires DB-level investigation...]` but lacks the required fields for a deferred finding per process rules:
- **Downstream owner**: "User" ✓
- **Target artifact**: Not specified (says "tracked for future plan" but doesn't name a plan ID or open-actions file) ✗
- **Trigger**: Not specified ✗

**Impact**: Process — the deferral is well-reasoned but doesn't meet the documentation bar for tracking.

**Recommendation**: Update D8 to include: Target artifact: `agent-output/planning/082-open-actions.md` (or the next plan ID allocated for RLS investigation). Trigger: "After Plan 082 UAT confirms parity, or if UAT re-surfaces 'Service nicht gefunden' for recommendation-mode services."

---

### LOW

#### F3 — ImagePreloader Handling After M1 Refactor
**Status**: OPEN
**Description**: The current server component uses `<ImagePreloader imageUrl={firstImageUrl} />` for SSR image preloading. When M1 removes the hard `notFound()` and passes nullable `initialData`, the `getFirstImageUrl()` helper and `ImagePreloader` component call need to gracefully handle the `null` case. This is implicit in "follow the exact pattern used in providers/[provider_id]/page.tsx" (which has no ImagePreloader), but it's a detail unique to the community service page.

**Impact**: Low — implementer will likely notice the compilation error, but it's worth calling out since the community service page has infrastructure (ImagePreloader) that the provider page doesn't.

**Recommendation**: Mention in M1 that `ImagePreloader` usage should be conditioned on non-null `initialData`, or removed if the provider pattern doesn't use it.

---

#### F4 — CommunityService Type Lacks `social_facebook`
**Status**: OPEN
**Description**: M4 mentions "Map social media links (Facebook, Instagram) if present in community service data." Code verification shows the `CommunityService` interface has `social_website` and `social_instagram` but no `social_facebook` field. The plan's "if present" qualifier covers this, but it may set an implicit expectation of Facebook support.

**Impact**: Negligible — the "if present" qualifier is protective, and Instagram + website are the primary social links.

**Recommendation**: No action required. Informational only.

---

#### F5 — Planner Chatmode File Not Found
**Status**: OPEN
**Description**: `.github/chatmodes/planner.chatmode.md` does not exist in the workspace. Process note only.

**Impact**: None — does not affect plan quality.

**Recommendation**: No action required.

---

## Unresolved Open Questions

None. All decisions in the Decision Record are `[RESOLVED]` or `[DEFERRED]`. No `OPEN QUESTION` items found in the plan text.

---

## Decision Record Check

- No decisions marked `[OPEN]`. ✓
- D8 marked `[DEFERRED]` — requires user acknowledgement (see F2 above for missing fields). The deferral rationale is sound.

---

## Duration Estimates Check

**Present**: Yes. Implementation (M1-M5): 2–4 hours, Testing (M6): 1–2 hours, QA/UAT: 1–2 hours, DevOps: 30–60 min. Total: 4.5–9 hours.

**Assessment**: Reasonable given the scope. The key uncertainty ("depends on ProviderDetailModal community service support") is correctly identified and matches F1 above. The wide range (4.5–9h) appropriately reflects this uncertainty.

---

## Hotfix Scenario Analysis

**"How will this plan result in a hotfix after deployment?"**

1. **Transform field regression**: If the community-service-to-provider transform misses a field that `ProviderDetailModal` renders unconditionally (e.g., tries to call `.toString()` on `provider_description` when it's undefined), it would crash at runtime on the detail page. **Mitigation in plan**: M4 is a dedicated milestone for field mapping, and M6 includes transform coverage tests. **Residual risk**: Low — test coverage + UAT should catch.

2. **Bookmark data integrity**: If `bookmarkableType` remains hardcoded as `'provider'`, community service bookmarks would persist under the wrong type. This wouldn't crash but would mean bookmark lookups by type fail silently. **Mitigation in plan**: M3 acceptance criteria includes bookmark correctness, but the specific mechanism isn't documented (see F1). **Residual risk**: Medium if F1 is not addressed.

3. **Other import sites for CommunityServiceDetailModal**: If another component dynamically imports `CommunityServiceDetailModal` and the deprecated component's interface drifts, it could break. **Mitigation in plan**: M5 limits scope to one import site, deferring deletion. **Residual risk**: Low — deprecation without deletion is safe.

---

## Risk Assessment

| Category | Level | Notes |
|----------|-------|-------|
| Architectural fit | Low | Adopts established provider detail pattern |
| Scope creep | Low | Clear boundaries, D8 correctly deferred |
| Implementation risk | Medium | `ProviderDetailModal` adaptation scope (F1) |
| Technical debt | Low | D9 intentional, tracked |
| Hotfix probability | Low–Medium | Transform correctness is primary vector (mitigated by M4+M6) |

---

## Recommendations

1. **Address F1** (MEDIUM): Add specific notes in M3/M4 about `bookmarkableType` hardcoding and `Provider` type interface. This is the highest-value pre-implementation guidance.
2. **Address F2** (MEDIUM): Complete D8's deferral fields (target artifact + trigger) per process requirements.
3. **F3/F4** (LOW): Optional. Implementer will likely handle organically.

---

## Verdict

**APPROVED WITH CONDITIONS**

Conditions (both MEDIUM findings):
1. F1: Surface the `bookmarkableType: 'provider'` hardcoding and `Provider` typed interface gap in M3 or M4 so the implementer doesn't have to independently discover them.
2. F2: Complete D8's deferral documentation with target artifact and trigger.

Once these two items are addressed, the plan is ready for implementation handoff without re-review.

---

## Revision History

| # | Date | Changes |
|---|------|---------|
| Initial | 2026-04-05T18:58Z | First review of Plan 082. 0 critical, 2 medium, 3 low findings. Verdict: APPROVED WITH CONDITIONS. |
| Resolved | 2026-04-05T19:05Z | Planner addressed F1 (M3/M4 implementation notes) and F2 (D8 target artifact + trigger). No re-review required. |
