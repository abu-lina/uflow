---
ID: 083
Origin: 083
UUID: f7a2d8c3
Status: Resolved
---

# 083 — Community Services Edit UI — Plan Critique

**Artifact**: `agent-output/planning/083-community-edit-ui-plan.md`
**Analysis**: `agent-output/analysis/083-community-edit-ui-analysis.md`
**Date**: 2026-04-06T11:00Z
**Status**: Resolved (Revision 1 approved)

## Changelog

| Date                | Handoff                | Request                     | Summary                                         |
|---------------------|------------------------|-----------------------------|--------------------------------------------------|
| 2026-04-06T11:00Z   | Planner → Critic       | Initial plan review         | 2 MEDIUM findings, 3 LOW findings; verdict: REVISION REQUESTED |
| 2026-04-06T11:25Z   | Planner → Critic       | Re-review after revision    | All MEDIUM findings ADDRESSED; verdict: APPROVED |

---

## Value Statement Assessment

**Verdict**: CLEAR and well-aligned.

The value statement is a proper user story with role ("admin/moderator"), action ("edit community services using the same rich, sectioned form"), and outcome ("manage content with same quality and consistency"). It directly connects to the Master Product Objective — community services as first-class discoverables. No drift detected.

---

## Overview

Plan 083 proposes building an admin-only community services edit page that reuses the existing `ProviderEditForm` via an adapter pattern. The approach is sound: 5 milestones with clear sequencing, 8 resolved decisions, no open questions, and explicit out-of-scope boundaries. Analysis quality is high (L1 Proven findings).

The plan correctly identifies the adapter pattern as lowest-risk. ~~However, two areas need Planner revision before implementation can proceed safely.~~ **Revision 1 addressed both MEDIUM findings. Plan is now approved for implementation.**

---

## Architectural Alignment

The plan aligns with existing architecture:
- Admin routes under `(dashboard)` route group ✓
- Service-role Supabase client for admin writes (Plan 061 precedent) ✓
- Zod validation + audit logging + rate limiting (established patterns) ✓
- `ProviderEditForm` reuse follows the existing multi-context design of that component ✓

No architectural concerns.

---

## Scope Assessment

Scope is well-bounded. The out-of-scope list is explicit and reasonable (owner edit, deletion, moderation queue, CS-specific metadata fields). Duration estimates are provided and conservatively stated with uncertainty ratings.

---

## Technical Debt Risks

- The adapter approach adds a layer of indirection (CS ↔ Provider type mapping) that accrues mild maintenance cost. This is acceptable given the alternative (form generalization touching all provider flows).
- The plan explicitly notes that owner CS edit is deferred. If implemented later, the sub-page generalization work identified in Finding F1 below would need to happen anyway. Doing it now during M3 reduces total effort across both plans.

---

## Findings

### F1 — Sub-pages have hardcoded `providers` table queries and localStorage prefix (MEDIUM)

| Attribute | Value |
|-----------|-------|
| **Issue Title** | Assumption #2 invalid: sub-pages cannot operate with CS IDs without modification |
| **Status** | ADDRESSED |
| **Description** | Plan Assumption #2 states "The ProviderEditForm sub-pages can operate with community service IDs without modification, since they read/write via localStorage keyed by entity ID." This is **false**. All four admin provider edit sub-pages (category, offers, needs, images) directly query `supabase.from('providers')` to load initial data when no localStorage value exists. They also hardcode the `admin_` localStorage prefix. Evidence: [category/page.tsx](src/app/(dashboard)/dashboard/providers/[id]/edit/category/page.tsx#L55) queries `.from('providers').select('category_id').eq('provider_id', providerId)`, [offers/page.tsx](src/app/(dashboard)/dashboard/providers/[id]/edit/offers/page.tsx#L60) queries `.from('providers').select('offers_ids, category_id')`, [images/page.tsx](src/app/(dashboard)/dashboard/providers/[id]/edit/images/page.tsx#L27) queries `.from('providers').select('provider_images')`, all with `admin_edit_*` localStorage keys. |
| **Impact** | If the implementer copies sub-pages verbatim and only changes the route path and parameter name, the sub-pages will silently query the `providers` table with a community service UUID, find nothing, and show empty/default state. This means the CS edit form's sub-pages would never pre-populate with existing community service data. First admin save after visiting a sub-page could blank out existing category/offers/needs/images. This is a **data loss risk**. |
| **Recommendation** | Update M3 deliverables to explicitly enumerate the adaptations required in each sub-page: (a) query `community_services` table instead of `providers`, using CS column names (`community_service_images` not `provider_images`); (b) use `admin_cs_` localStorage prefix to match the parent form's `localStoragePrefix`; (c) for the images sub-page, handle TEXT array format directly instead of JSON-parsing `provider_images`. Mark Assumption #2 as invalid and replace with the corrected understanding. |

### F2 — Decision D4 (exclude Soziale Initiativen) unimplementable via adapter alone (MEDIUM)

| Attribute | Value |
|-----------|-------|
| **Issue Title** | Soziale Initiativen field unconditionally rendered; adapter cannot hide it |
| **Status** | ADDRESSED |
| **Description** | Decision D4 states "The Media section will show only Bilder, not the social initiatives picker." However, `ProviderEditForm` unconditionally renders the "Soziale Initiativen" button in the Media section ([ProviderEditForm.tsx](src/components/providers/ProviderEditForm.tsx#L725) lines 725–745). There is no prop, flag, or conditional that would allow the adapter to suppress this field. The plan's stated approach is "you're writing a thin wrapper, NOT modifying ProviderEditForm." |
| **Impact** | Without resolution, one of three outcomes occurs: (a) The Soziale Initiativen button appears in the CS edit form and links to `${editBaseUrl}/social`, which would 404 since no social sub-page is planned under the CS route; (b) The implementer adds a `/social` sub-page that shows empty/no-op state — confusing but not broken; (c) The implementer must modify `ProviderEditForm` to accept a prop like `hideSocialInitiatives`, contradicting the plan's adapter-only constraint. |
| **Recommendation** | Either (A) add a `hideSections` or `entityType` prop to `ProviderEditForm` that conditionally renders the Soziale Initiativen field — a minimal, backward-compatible change; or (B) explicitly acknowledge in D4 and M2 that the form WILL be lightly modified for this, updating the "adapter-only" constraint accordingly; or (C) create a stub `/social` sub-page that redirects back to the edit page with a toast explaining this feature is not applicable. State the chosen approach in the plan. |

### F3 — Planner chatmode file missing (LOW, Process)

| Attribute | Value |
|-----------|-------|
| **Issue Title** | `.github/chatmodes/planner.chatmode.md` does not exist |
| **Status** | OPEN (process — not a plan blocker) |
| **Description** | Critic instructions require reading this file at review start. File not found in the workspace. |
| **Impact** | No functional impact on this review. Process note only. |
| **Recommendation** | Create the planner chatmode file or acknowledge its absence in workflow documentation. |

### F4 — localStorage cleanup not addressed (LOW)

| Attribute | Value |
|-----------|-------|
| **Issue Title** | Draft state localStorage keys (`admin_cs_edit_*`) not cleared on save/approve/reject |
| **Status** | ADDRESSED |
| **Description** | Open action 060-OA-1 documents the same issue for provider admin edit: localStorage draft state keys are not cleared after successful save/approve/reject. The CS edit plan will introduce a parallel set of keys (`admin_cs_edit_category_${id}`, etc.) with the same cleanup gap. |
| **Impact** | Stale draft state could pre-populate outdated values if the same CS is edited again. Low severity — same known behavior as provider edit. |
| **Recommendation** | Acknowledge this as a known limitation in the plan's handoff notes, referencing 060-OA-1 as the tracking item. No need to fix in this plan if deferred intentionally. |

### F5 — Version semantics: feature vs patch (LOW)

| Attribute | Value |
|-----------|-------|
| **Issue Title** | Adding a new admin edit flow is arguably MINOR, not PATCH |
| **Status** | OPEN (awareness — not a plan blocker) |
| **Description** | The plan targets "next available patch" but introduces a complete new capability (admin CS editing). Under strict semver this is a minor feature. |
| **Impact** | No functional impact. UFlow is pre-v1.0 where patch/minor distinction is less formal. DevOps Stage 1 will confirm version. |
| **Recommendation** | No action needed; DevOps gate handles this. Note for awareness only. |

---

## Hotfix Risk Assessment

**"How will this plan result in a hotfix after deployment?"**

| Scenario | Likelihood | Prevention |
|----------|-----------|------------|
| Sub-page data loss from querying wrong table | Medium | F1 fix — explicit sub-page adaptation |
| Soziale Initiativen 404 on click | Medium | F2 fix — either hide field or create stub route |
| Image format corruption during round-trip | Low | Plan already mandates unit tests for conversion functions |
| Admin auth bypass | Very Low | Pattern is proven from Plan 061; Zod + `isAdminOrModerator` + service-role |

The two MEDIUM findings (F1, F2) are the primary hotfix vectors. Both are preventable with plan revision.

---

## Unresolved Open Questions

None in the plan. All 8 decisions are [RESOLVED]. No OPEN QUESTION markers found.

---

## Decision Record Check

All decisions are [RESOLVED]. No [OPEN] or [DEFERRED] decisions found. ✓

---

## Duration Estimates Check

Duration estimates section present with per-phase estimates and uncertainty ratings. ✓

---

## Questions for Planner

1. **F1**: Will Assumption #2 be corrected and M3 deliverables updated with explicit sub-page adaptation requirements (table queries, localStorage prefix, image format)?
2. **F2**: Which resolution path for D4 — (A) add prop to ProviderEditForm, (B) acknowledge form modification, or (C) stub sub-page?

---

## Risk Assessment

Overall plan quality: **HIGH**. The adapter pattern is architecturally sound, decisions are well-reasoned, scope is clean, and the analysis backing is thorough. The two MEDIUM findings are addressable with targeted plan revisions — no fundamental redesign needed.

---

## Recommendations

1. ~~**MUST** (F1): Correct Assumption #2 and update M3 deliverables to explicitly enumerate per-sub-page adaptations.~~ **DONE** — Assumption #2 corrected, M3 has per-sub-page adaptation tables.
2. ~~**MUST** (F2): Choose and document a resolution path for D4 (Soziale Initiativen visibility).~~ **DONE** — D9 added: `hideSocialInitiatives` prop.
3. ~~**SHOULD** (F4): Acknowledge localStorage cleanup gap in handoff notes, referencing 060-OA-1.~~ **DONE** — Handoff notes updated with known limitation.
4. **MAY** (F5): Consider MINOR version bump instead of PATCH.

---

## Revision History

### Revision 1 (2026-04-06T11:15Z → re-reviewed 2026-04-06T11:25Z)

**Artifact changes**:
- Assumption #2 struck through and corrected with explicit per-sub-page requirements
- D9 added: `hideSocialInitiatives` boolean prop on `ProviderEditForm`
- D4 updated to reference D9 as implementation mechanism
- M2 deliverables expanded: prop addition listed as first deliverable, `hideSocialInitiatives={true}` in adapter props
- M3 deliverables expanded: per-sub-page adaptation tables (table queries, localStorage prefix, image format)
- M3 acceptance criteria expanded: 3 new criteria (community_services table, admin_cs_edit_ prefix, TEXT array handling)
- Handoff notes updated: implementer guidance for single ProviderEditForm modification, sub-page adaptation emphasis, known limitation for localStorage cleanup referencing 060-OA-1
- Decision record expanded from 8 to 9 decisions, all [RESOLVED]

**Findings addressed**:
- F1 (MEDIUM): OPEN → ADDRESSED
- F2 (MEDIUM): OPEN → ADDRESSED
- F4 (LOW): OPEN → ADDRESSED

**New findings**: None.

**Status changes**: F1 ADDRESSED, F2 ADDRESSED, F4 ADDRESSED; F3 remains OPEN (process, non-blocking); F5 remains OPEN (awareness, non-blocking).
