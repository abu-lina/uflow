---
ID: 106
Origin: 106
UUID: d7e3a41f
Status: Resolved
---

# Critique — Plan 106: Badge/Boolean Data Coherence

| Field     | Value                                                                 |
| --------- | --------------------------------------------------------------------- |
| Artifact  | `agent-output/planning/106-badge-boolean-data-coherence-plan.md`      |
| Analysis  | N/A (ADR-105 served as analysis)                                      |
| Date      | 2026-04-27T17:15Z                                                     |
| Status    | Initial                                                               |

## Changelog

| Date              | Handoff   | Request                            | Summary                           |
| ----------------- | --------- | ---------------------------------- | --------------------------------- |
| 2026-04-27T17:15Z | Planner → Critic | Initial review of Plan 106   | First read; 2 MEDIUM, 3 LOW findings |
| 2026-04-27T17:30Z | Critic | Plan revised by Planner; all findings addressed | F-1, F-2, F-3, F-5 RESOLVED; F-4 informational |

---

## Value Statement Assessment

**Verdict: PASS**

The value statement is well-formed ("As a / I want / So that"), directly supports the Master Product Objective (trust-first discovery), and the "so that" outcome is verifiable: create a new provider with attributes → confirm it appears in filtered search results. Value is delivered directly, not deferred.

---

## Overview

Plan 106 closes a genuine data coherence gap identified during Plan 105 post-release review (ADR-105). The problem is real: providers created after migration 067 are invisible to search filters because the creation path writes to `barakah_effects` only — never to boolean columns or badge rows. The plan proposes a clean architectural fix: badges as write model, booleans as read model, with a Postgres trigger for sync.

The plan is well-structured with clear milestones, a dependency graph, decision record, and duration estimates. The scope is appropriate — it fixes the immediate coherence gap without attempting to restructure the entire badge system.

---

## Architectural Alignment

**Verdict: ALIGNED**

- **Postgres-first**: Trigger-based sync is consistent with the platform's Postgres-first philosophy (ADR-105, system-architecture.md). Preferred over application-layer sync.
- **ADR-105 compliance**: All 4 ADR-105 directives are addressed (trigger, creation path, section-aware UI, deprecate barakah_effects).
- **Existing trigger compatibility**: The plan correctly identifies that the new trigger must coexist with `trigger_update_confirmation_count` (on `badge_confirmations`) and `trigger_update_badge_trust_level` (on `provider_badges` UPDATE). The new trigger fires on `provider_badges` INSERT/DELETE — different events from the existing UPDATE trigger, so no conflict.
- **Migration 067 backfill**: Plan correctly identifies this was one-time; no re-backfill needed.

---

## Scope Assessment

**Verdict: APPROPRIATELY SCOPED**

The plan intentionally defers STORES listing invariant enforcement (requiring `muslim_owned = true` for all stores) to a future plan. This is the correct call — enforcing an invariant on existing data is a separate, riskier operation. The plan documents this in the Risks table (Risk 4) with "out of scope" noted.

---

## Technical Debt Risks

- **Low**: `barakah_effects` column is retained for backward compatibility. This adds a small ongoing debt — three systems now exist (badges, booleans, barakah_effects) instead of converging to two. Acceptable since the plan explicitly designates it as "free-form only" and breaks the structured dependency.
- **Low**: The `SUPPORTS_SADAQAH ↔ accepts_donations` mapping is labeled "partial" in the coverage table but not discussed further. Semantic gap is minor (Sadaqah is broader than "donations") and doesn't affect filter correctness.

---

## Findings

### F-1: Trigger must JOIN `badge_types` — handoff note is incorrect

| Field         | Value |
| ------------- | ----- |
| Severity      | **MEDIUM** |
| Status        | RESOLVED |
| Section       | Handoff Notes / M1 Deliverables |

**Issue**: The handoff notes state "Use `NEW.badge_key` in the trigger." However, the `provider_badges` table does NOT have a `badge_key` column. It has `badge_type_id` (UUID FK to `badge_types.id`). The trigger function must JOIN `badge_types` to resolve the `badge_key`:

```sql
SELECT bt.badge_key INTO v_badge_key
FROM badge_types bt WHERE bt.id = NEW.badge_type_id;
```

**Impact**: Implementer following the handoff note verbatim would write a trigger referencing a non-existent column, causing the migration to fail.

**Recommendation**: Correct the handoff note to reference `NEW.badge_type_id` and document the required JOIN to `badge_types`.

---

### F-2: Trigger must filter on `entity_type = 'provider'`

| Field         | Value |
| ------------- | ----- |
| Severity      | **MEDIUM** |
| Status        | RESOLVED |
| Section       | M1 Acceptance Criteria |

**Issue**: The `provider_badges` table is polymorphic — it holds badges for both `entity_type = 'provider'` and `entity_type = 'community_service'`. The trigger function must guard against firing for community service badges, which have no corresponding boolean columns on any table.

M1's deliverables say "Trigger function `sync_badge_to_boolean()` that maps `badge_key` → boolean column" but do not mention the `entity_type` guard. If a community service badge is inserted, the trigger would attempt `UPDATE providers SET ... WHERE provider_id = NEW.entity_id` — this would silently succeed (0 rows updated) but is semantically wrong and could cause confusion in debug scenarios.

**Impact**: No data corruption (UPDATE matches 0 rows), but the trigger should be explicit about its scope for clarity, auditability, and to prevent future issues if `community_services` ever gains boolean columns.

**Recommendation**: Add to M1 acceptance criteria: "Trigger function only fires UPDATE for `entity_type = 'provider'`; exits early for other entity types."

---

### F-3: Transaction scope for badge creation in M2 is unspecified

| Field         | Value |
| ------------- | ----- |
| Severity      | **LOW** |
| Status        | RESOLVED |
| Section       | M2 Deliverables / Risks |

**Issue**: M2 requires badge INSERT after provider INSERT (needs `provider_id`). The Risks table (Risk 2) correctly identifies the partial-state risk and proposes "Wrap badge inserts in the same transaction scope; if badge insert fails, boolean fallback is set directly." However, the Supabase JS client (`supabase.from().insert()`) does NOT support multi-statement transactions. Each call is an independent HTTP request.

The plan doesn't specify how to achieve transactional semantics. Options include: (a) an RPC function that wraps both inserts, (b) a post-insert badge step with direct boolean fallback on failure, or (c) accepting the partial-state risk since the trigger will sync on the next badge insert.

**Impact**: Implementer needs to choose a transaction strategy not specified in the plan. Option (b) is the pragmatic choice — it matches the existing pattern in `providerService.ts` (fire-and-forget relationships after primary insert).

**Recommendation**: Clarify in M2 that the pragmatic approach is: insert provider first, then attempt badge inserts; on badge failure, set booleans directly as fallback. This is not a WHAT/WHY violation — it's a necessary constraint clarification given Supabase client limitations.

---

### F-4: Missing process note — planner chatmode file absent

| Field         | Value |
| ------------- | ----- |
| Severity      | **LOW** |
| Status        | INFORMATIONAL |
| Section       | Process |

**Issue**: `.github/chatmodes/planner.chatmode.md` does not exist. Per Critic instructions, this is recorded as a LOW process note.

**Impact**: None on this plan. Planner constraints verified via `copilot-instructions.md` and session context.

**Recommendation**: No action needed for this plan.

---

### F-5: `SUPPORTS_SADAQAH` ↔ `accepts_donations` semantic gap undocumented in Decision Record

| Field         | Value |
| ------------- | ----- |
| Severity      | **LOW** |
| Status        | RESOLVED |
| Section       | Decision Record |

**Issue**: The coverage table labels `SUPPORTS_SADAQAH` as "partial" equivalent to `accepts_donations`, but no decision record entry explains this mapping. Sadaqah (voluntary charity) is broader than "accepts donations" (a mechanical capability). The plan treats them as equivalent for sync purposes without documenting the semantic trade-off.

**Impact**: Minor. The mapping is pragmatically correct for filter behavior. But future maintainers may question why the badge and boolean don't share a name.

**Recommendation**: Add a brief note to the Decision Record (e.g., D8) acknowledging the semantic gap and confirming the mapping is intentional for filter purposes.

---

## Unresolved Open Questions

None found in the plan document. All decisions are marked `[RESOLVED]`.

---

## Decision Record Check

All 7 decisions are marked `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` decisions found.

---

## Duration Estimates Check

**Present and reasonable.** The plan includes a full Duration Estimates table with per-phase breakdowns and uncertainty drivers. Total estimate of 9–12 hours is appropriate for the scope (1 migration + 1 service file update + 1 UI component change + tests).

---

## Hotfix Prediction ("How will this plan result in a hotfix after deployment?")

**Most likely hotfix scenario**: The trigger function incorrectly resolves `badge_type_id` → `badge_key` due to the JOIN issue (F-1). If the implementer uses a hardcoded UUID mapping instead of a JOIN, a future badge_types seed change would silently break the trigger. Mitigation: use the `badge_key` text lookup, not UUID.

**Second scenario**: Badge INSERT in the creation path fires the trigger synchronously, but the provider row hasn't been committed yet (if using deferred constraints). At current Supabase client patterns (each INSERT is a separate HTTP request → separate transaction), the provider row IS committed before the badge INSERT, so the trigger's UPDATE should find the row. This is safe at current architecture.

---

## Risk Assessment

| Area | Rating | Notes |
|------|--------|-------|
| Value delivery | ✅ Direct | New providers become visible to filters immediately |
| Architectural fit | ✅ Strong | Postgres-first trigger pattern; consistent with ADR-105 |
| Scope risk | ✅ Low | 4 focused milestones; STORES invariant correctly deferred |
| Regression risk | ✅ Low | New trigger fires on different events than existing triggers |
| Implementation complexity | ⚠️ Medium | M2 creation path + transaction semantics need care |

---

## Recommendations

1. **Address F-1 (MEDIUM)**: Correct the handoff note to reference `badge_type_id` and the required JOIN to `badge_types`.
2. **Address F-2 (MEDIUM)**: Add `entity_type = 'provider'` guard to M1 acceptance criteria.
3. **Optionally address F-3, F-5 (LOW)**: Clarify transaction strategy and semantic mapping. These are helpful but not blocking.
4. F-4 is informational only.

---

## Verdict

**APPROVED**

All MEDIUM and LOW findings addressed in plan revision (2026-04-27T17:30Z). Plan is ready for implementation.
