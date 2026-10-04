---
ID: 126
Origin: 126
UUID: a3f2c891
Status: Resolved
---

# Critique — Plan 126: Nachweise Attestation Display

| Field         | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Artifact      | `agent-output/planning/126-nachweise-attestation-plan.md`                |
| Date          | 2026-05-12T12:37Z                                                        |
| Status        | Resolved                                                                 |
| Verdict       | **APPROVED**                                                             |

## Changelog

| Date              | Handoff        | Request                        | Summary                                        |
| ----------------- | -------------- | ------------------------------ | ----------------------------------------------- |
| 2026-05-12T12:37Z | Planner→Critic | Initial review of Plan 126     | 1 CRITICAL, 2 MEDIUM, 1 LOW finding identified  |
| 2026-05-12T12:45Z | Planner        | Revision submitted             | All 4 findings addressed; M0 milestone added; awaiting Critic re-review |
| 2026-05-12T12:46Z | Critic→Approved | Re-review of revised Plan 126  | All 4 findings verified RESOLVED; Plan approved for implementation; critique closed |

---

## Value Statement Assessment

**PASS.** The value statement follows the standard user-story format ("As a … I want … so that …") and is directly tied to the product's halal transparency pillar. The North-Star Metric ("identify three commitments within 3 seconds, no interaction, all 6 locales") is observable, testable, and scope-appropriate.

---

## Overview

Plan 126 is a well-scoped, display-only feature adding a halal attestation card to the provider detail Nachweise section. The plan correctly identifies:
- The 6-locale custom TS translation system (not `next-intl`)
- Appropriate component placement alongside existing `HalalTrustBanner.tsx`
- Clean milestone sequencing (M1→M2→M3→M4)
- Client component decision justified by `useLanguage()` hook dependency

The plan is strong on structure and clarity. However, codebase verification uncovered one **critical data flow gap** that must be resolved before implementation can proceed.

---

## Architectural Alignment

**PARTIAL PASS.** The plan aligns with the features/providers domain structure and follows the server/client component separation pattern. However, Assumption #1 (data availability) is materially incorrect, creating a downstream implementation blocker — see Finding F-1.

---

## Scope Assessment

**PASS.** Five clear out-of-scope boundaries. The `no_gambling` amenity key gap (D7) is correctly isolated. Ummah providers excluded. The feature is additive with clean rollback (no migrations).

---

## Technical Debt Risks

No new debt introduced. The plan is purely additive and avoids coupling to existing surfaces. The decision to create a separate `providerDetail.attestation.*` namespace (D1) instead of reusing `providerDetail.amenities.*` keys is the right separation choice.

---

## Findings

### F-1 — Data Flow Gap: Extension Table Booleans Not Joined by `getProviderById()`

| Field         | Value       |
| ------------- | ----------- |
| Severity      | **CRITICAL** |
| Status        | RESOLVED     |

**Issue**: The plan's Assumption #1 states: *"The three booleans (`no_alcohol`, `no_pork`, `no_gambling`) are already populated in the `Provider` object returned to `ProviderDetailSections`"* — citing `buildAmenityLabels()` as evidence.

This assumption is **incorrect in production**. Migration `083_m5a_supertype_unification.sql` (applied 2026-05-01) **dropped** `no_alcohol`, `no_pork`, `no_gambling` from the `providers` table and migrated them to extension tables:
- `no_alcohol`, `no_pork` → `food_providers`
- `no_gambling` → `store_providers`

Both `getProviderById()` functions (client in `src/services/providers.ts` L379 and server in `src/services/providers.server.ts` L22) use `SELECT * FROM providers` — which **does not join** `food_providers` or `store_providers`. After migration 083, these booleans are always `undefined` on the returned `Provider` object.

The existing `buildAmenityLabels()` references to `provider.no_alcohol` and `provider.no_pork` in `ProviderDetailSections.tsx` are therefore **dead code** — they never evaluate to `true` in production because the values are never populated.

**Impact**: If the plan proceeds as-is, the `AttestationCard` will **never render** in production. The component's `null` guard (all booleans falsy) will always trigger. The feature would ship but be invisible.

**Recommendation**: The plan must acknowledge this data gap and either:
1. **Expand scope** to include a query change in `getProviderById()` (both client and server variants) to LEFT JOIN `food_providers` and `store_providers` and map the extension columns back onto the `Provider` object. This is the minimum viable fix.
2. **Defer the feature** until a separate plan addresses the query gap.

Option 1 is preferred (small, self-contained query change). This would add:
- A new M0 milestone before M1 for the query change
- A new test case verifying the joined data is populated
- A scope expansion note in the plan

The Planner must decide which option to take.

---

### F-2 — M3 Test Cases Reference Unit Tests, Not QA — Clarification Needed

| Field         | Value       |
| ------------- | ----------- |
| Severity      | **LOW**     |
| Status        | RESOLVED    |

**Issue**: The gate checklist item "No test cases defined (QA's domain)" flags M3's test case table. However, M3's test cases define **unit test acceptance criteria** (what the Implementer must cover in Vitest), not QA test procedures. The plan correctly delegates visual/RTL/responsive testing to QA in the Testing Strategy section.

**Impact**: Minimal — no action needed if the distinction is understood.

**Recommendation**: Add a brief clarifying note in M3: *"These are unit test acceptance criteria for the Implementer, not QA test procedures."* This avoids future ambiguity for downstream agents.

---

### F-3 — `no_gambling` Not in `buildAmenityLabels()` — Pre-existing Gap Underspecified

| Field         | Value       |
| ------------- | ----------- |
| Severity      | **MEDIUM**  |
| Status        | RESOLVED    |

**Issue**: The plan documents that `noGambling` is missing from `providerDetail.amenities.*` and from `buildAmenityLabels()` (Assumption 7, Out of Scope item 2, Decision D7). The plan correctly marks this out of scope. However, the plan does not note that `buildAmenityLabels()` also does not reference `provider.no_gambling` at all — it's not just a missing translation key, it's a missing entry in the amenity label array.

When F-1 is addressed and the extension table join is implemented, `no_gambling` will appear on the `Provider` object for the first time. The amenities section will **still** not display it (no entry in `buildAmenityLabels()`). This creates a user-visible inconsistency: the attestation card shows "no gambling" but the amenities section does not list it.

**Impact**: Users may notice the discrepancy between the attestation card and the amenities section. While out of scope for Plan 126, it should be tracked.

**Recommendation**: Add a risk entry or handoff note calling this out explicitly: *"After F-1 is resolved, `no_gambling` will be visible in the attestation card but absent from the amenities section. A follow-up plan should add the `noGambling` entry to `buildAmenityLabels()` and the `providerDetail.amenities.noGambling` translation keys."* Consider filing a GitHub issue.

---

### F-4 — Version Target Assumes No Concurrent Plans

| Field         | Value       |
| ------------- | ----------- |
| Severity      | **MEDIUM**  |
| Status        | RESOLVED    |

**Issue**: The plan targets v0.12.11 based on origin/main being v0.12.10. The Release Strategy section acknowledges potential collision ("If another plan is assigned to v0.12.11 before DevOps Stage 1, a bundled release note must be added"). However, the plan does not document a **version pre-flight check** procedure for the Implementer to run at implementation start.

Between plan creation and implementation start, another plan may have already claimed v0.12.11.

**Impact**: Version collision would cause merge conflict in `package.json` and `CHANGELOG.md`. Minor, but avoidable.

**Recommendation**: Add an Implementer handoff note: *"Before starting M4, re-verify the latest tag and origin/main version. If v0.12.11 is already taken, increment to the next available patch."* This is standard practice and a one-line note.

---

## Unresolved Open Questions

The plan states "All decisions are RESOLVED. No open questions remain at handoff." — **confirmed**. No `OPEN QUESTION` items found. All 8 Decision Record entries are `[RESOLVED]`.

---

## Decision Record Check

All 8 decisions are `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` entries. **PASS.**

---

## Duration Estimates Check

Duration estimates section is present with per-phase breakdown and uncertainty drivers. **PASS.**

---

## Gate Checklist

| Gate Item | Status | Note |
|---|---|---|
| Plan has acceptance criteria for each milestone | **PASS** | All 4 milestones have explicit AC |
| Scope boundaries documented | **PASS** | 5 out-of-scope items |
| Component placement decision made and justified | **PASS** | D4 with rationale |
| All Decision Record items are RESOLVED | **PASS** | 8/8 RESOLVED |
| Version pre-flight documented with evidence | **PASS** | Evidence present; re-verification command added to Implementer handoff (F-4 resolved) |
| Release strategy present | **PASS** | Standalone with collision note |
| Testing strategy present | **PASS** | Unit test scope, coverage expectations, QA delegation |
| Duration estimates present | **PASS** | Per-phase with uncertainty drivers |
| No implementation code in the plan | **PASS** | Interface marked ILLUSTRATIVE ONLY |
| No test cases defined (QA's domain) | **PASS** | M3 defines unit test AC for Implementer; QA owns visual/RTL (F-2 LOW clarification) |

---

## Risk Assessment

All 4 findings are **RESOLVED** in the revised plan. The critical blocker (F-1 extension join gap) is fully addressed by the new M0 milestone with clear acceptance criteria, correct file references, and documented side effects. Non-blocking findings F-2, F-3, F-4 are addressed with targeted, proportionate additions.

---

## Recommendations

All prior recommendations have been addressed. Plan 126 is **APPROVED** for implementation.

Implementer attention points (surfaced by critique process):
1. **Start with M0** — extension join in both `getProviderById()` variants before any UI work.
2. **M0 side effect** — after the join, `buildAmenityLabels()` will surface `no_alcohol`/`no_pork` in amenities for the first time. Verify this does not cause regressions.
3. **Version re-verify** before M4 — `no_gambling` amenity gap requires a follow-up issue post-implementation.

---

## Revision History

| Revision   | Date              | Findings Addressed    | New Findings | Status Changes |
| ---------- | ----------------- | --------------------- | ------------ | -------------- |
| Initial    | 2026-05-12T12:37Z | —                     | F-1 through F-4 added | Verdict: REVISION REQUESTED |
| Revision 1 | 2026-05-12T12:46Z | F-1, F-2, F-3, F-4 all RESOLVED | None | Verdict: APPROVED; Status: Resolved; all finding rows updated to RESOLVED; gate checklist PARTIAL → PASS |
