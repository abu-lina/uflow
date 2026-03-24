---
ID: 058
Origin: 058
UUID: 3c0c8f41
Status: Implemented
---

# Process Improvement Analysis 058: Admin Review Inside Providers Discovery

**Source Retrospective**: `agent-output/retrospectives/058-admin-review-in-providers-discovery-retrospective.md`
**Date**: 2026-03-23
**Scope**: Convert Retrospective 058 recommendations (R1–R5) into scoped, conflict-checked agent-instruction updates.

> **NO-MEMORY MODE**: Flowbaby retrieval/store tools are unavailable in this environment; proceeding artifact-first.

## Executive Summary

- **Recommendations analyzed**: 5 (R1–R5)
- **Validated as instruction gaps**: 3 (R1, R2, R3)
- **Already partially covered**: 2 (R4, R5)
- **Primary systemic issues**:
  - UAT can approve role-dependent and RLS-dependent features without live validation of the auth/RLS path, allowing production-path bugs to survive to manual testing.
  - Plans that introduce inline actions on shared multi-entity lists do not require an explicit actionability check, allowing wrong-entity moderation bugs.
  - Release version numbers are still treated as stable in UAT/CHANGELOG before DevOps confirms tag availability, causing late version bumps.
  - Post-UAT code deltas are already gated by DevOps and documented by the implementer, but the implementation doc does not itself record a summary of changes made after UAT, only the deployment doc does.
  - Timestamp discipline is already mandated by PI-056 across most agents, so the timestamp sanity-check recommendation is already implemented.
- **Overall risk**: **LOW-MEDIUM**
- **Recommendation**: Implement R1, R2, and R3 now. Defer R4 and R5 as already sufficiently covered.

---

## Changelog Pattern Analysis

### Documents Reviewed

- `agent-output/retrospectives/058-admin-review-in-providers-discovery-retrospective.md`
- `agent-output/planning/closed/058-admin-review-in-providers-discovery-plan.md`
- `agent-output/implementation/closed/058-admin-review-in-providers-discovery-impl.md`
- `agent-output/code-review/closed/058-admin-review-in-providers-discovery-code-review.md`
- `agent-output/qa/closed/058-admin-review-in-providers-discovery-qa.md`
- `agent-output/uat/closed/058-admin-review-in-providers-discovery-uat.md`
- `agent-output/deployment/058-stage1-v0.8.21.md`
- Current agent instructions: `.github/agents/{uat,planner,code-reviewer,implementer,devops}.agent.md`
- Prior PI analyses: 044, 050, 056 (checked for overlap)

### Handoff Patterns

| Pattern | Frequency | Root Cause | Impact | Recommendation |
|---------|-----------|------------|--------|----------------|
| Post-UAT bug discovery during manual local testing | 1 (3 bugs) | UAT validated artifacts, not live admin+RLS behavior | 3 production-path bugs survived to post-UAT phase | R1 |
| Community service cards receiving provider moderation actions | 1 | No explicit shared-list actionability check in plan or review | Wrong UUIDs sent to provider UPDATE query | R2 |
| UAT recommended v0.8.20 but tag existed; DevOps bumped to v0.8.21 | 1 | Version number treated as stable before DevOps tag check | Late version rework in docs and artifacts | R3 |
| Post-UAT code changes documented only in deployment doc | 1 | Implementer Post-UAT Delta Protocol records in deployment, not implementation doc | Implementation chain incomplete | R4 |
| Implementation doc timestamp off by one day | 1 | Clock/date error not caught before closeout | Weakens timeline reasoning | R5 |

### Efficiency Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Total handoffs | 10 | Linear + user local testing loop |
| Handoff loops | 0 before UAT; 1 post-UAT (3 bugs) | Well below threshold |
| Post-UAT rework | ~3h | Significant share of total delivery time |
| Release version changes | 1 (v0.8.20 → v0.8.21) | Caught by DevOps Stage 1 |

---

## Recommendation Analysis

### R1 — Admin Runtime Smoke Gate Before UAT

**Source**: Retrospective §Repeatable Process Improvements #1
**Priority**: HIGH IMPACT, LOW RISK

**Current state**: UAT instructions contain no role-based or RLS-aware live validation requirement. UAT validates value delivery against documentation evidence. The Design-Review UAT section requires local verification evidence for CSS-only changes, but no equivalent exists for auth/RLS-dependent features.

**Proposed change**: Add a conditional gate to UAT instructions requiring live admin-session validation before issuing "APPROVED FOR RELEASE" for any feature that depends on role metadata, Supabase RLS, or service-role client behavior.

**Affected agents**: UAT (`.github/agents/uat.agent.md`)

**Alignment**: Consistent with existing UAT conditional gates (Design-Review, Performance Timing, Focus/Scroll). Follows the same "WHEN APPLICABLE" structure.

**Conflict check**: No conflict found. The existing UAT doc already has conditional gates. This adds another in the same pattern.

**Risk**: LOW — Additive, scoped to admin/RLS features only. Does not change the default UAT behavior for public-only features.

**Implementation template**:

```markdown
### Admin Runtime Smoke Gate (MANDATORY when applicable)

If the feature depends on **admin/moderator role metadata**, **Supabase RLS visibility boundaries**, or **service-role client fallbacks**, UAT MUST NOT issue "APPROVED FOR RELEASE" without evidence that the feature was validated in a live session with correct role configuration.

Minimum checks:
- Admin role is present in `auth.users.raw_user_meta_data` (not just `public.users`)
- The feature's primary admin path returns expected data (e.g., pending-status filter returns non-empty results)
- At least one mutation path (approve, reject, or equivalent) completes without error

If live validation is infeasible at UAT time, UAT MUST:
- Record the gap as a **DEFERRED** finding with severity, owner, and trigger
- Downgrade the release decision to **CONDITIONAL APPROVAL** with explicit next actions
- NOT issue an unqualified "APPROVED FOR RELEASE"
```

---

### R2 — Shared Results Actionability Checklist

**Source**: Retrospective §Repeatable Process Improvements #2
**Priority**: MEDIUM IMPACT, LOW RISK

**Current state**: Neither the Planner nor Code Reviewer instructions require an explicit check for whether all result types on a shared list can legally receive inline actions. The Code Reviewer has an "Outbound Data-Flow Cross-Trace" checklist but it covers query params, not entity-type filtering.

**Proposed change**: Add a checklist item to Planner (plan-level) and Code Reviewer (review-level) for any list that can return multiple entity types and receives inline actions.

**Affected agents**: Planner (`.github/agents/planner.agent.md`), Code Reviewer (`.github/agents/code-reviewer.agent.md`)

**Alignment**: Follows the same "MANDATORY when applicable" pattern as existing checklists (Deployment Path Audit, Outbound Data-Flow, Interaction-Layer Audit).

**Conflict check**: No conflict found. Purely additive.

**Risk**: LOW — Narrow trigger condition. Only applies when a shared list renders multiple entity types with inline actions.

**Implementation template — Planner**:

```markdown
### Shared Results Actionability Check (MANDATORY when applicable)

If a plan introduces **inline actions** (approve, reject, delete, edit, etc.) on a **list that can return multiple entity types** (e.g., providers + community services), the plan MUST include an explicit statement about:
- Which result types may legally receive each action
- Where entity-type filtering occurs (service layer, API route, or UI)
- What happens if the wrong entity type receives the action (error handling, not silent failure)

If the plan scopes out certain entity types (e.g., "community services are out of scope"), it MUST note that the shared list may still return those types and specify how they are excluded from the action surface.
```

**Implementation template — Code Reviewer**:

```markdown
  6g. **Shared Results Actionability Checklist (MANDATORY when applicable)**:

- Trigger when the implementation adds inline actions (approve, reject, delete, etc.) to a list that can return **multiple entity types** (e.g., providers + community services in the same search results).
- For each inline action:
  - Verify the action is only wired to the correct entity type.
  - Verify the result set is filtered (or the UI conditionally renders actions) so that wrong-type entities cannot trigger the action.
  - If the plan explicitly scoped out certain entity types, verify those types are excluded from the action surface, not just from the plan text.
- If you find an entity type that can receive an action it shouldn't, record a MEDIUM or HIGH finding.
```

---

### R3 — Release Number Lock Before UAT

**Source**: Retrospective §Repeatable Process Improvements #3
**Priority**: MEDIUM IMPACT, LOW RISK

**Current state**: The Planner instructions (Core Responsibility 5e) already say: "State the target version as: _next available patch after current origin/main version; confirm at DevOps Stage 1_." However, UAT still recommends a concrete version number (e.g., "Recommended Version: v0.8.20") without performing tag verification. This creates a documented version that DevOps may need to override.

**Proposed change**: Add a note to UAT instructions clarifying that "Recommended Version" should reference the plan's conservative version language rather than hard-coding a specific number that hasn't been verified against origin tags.

**Affected agents**: UAT (`.github/agents/uat.agent.md`)

**Alignment**: Consistent with Planner 5e. Reduces late-stage rework in deployment docs.

**Conflict check**: No conflict. The current UAT doc says "Recommend versioning" but doesn't require tag verification. This adds a soft reminder to reference the plan's version language.

**Risk**: LOW — Guidance-only change. Does not add gates or block UAT.

**Implementation template**:

```markdown
### Release Version Discipline (SHOULD)

When recommending a version in the release decision, reference the plan's version language (e.g., "next available patch after current origin/main") rather than hard-coding a specific version number. The authoritative version is confirmed only at DevOps Stage 1 after `git fetch --tags`. Hard-coding a version in the UAT doc that DevOps later overrides creates unnecessary doc churn.

Exception: If DevOps Stage 1 has already run and confirmed the version (e.g., the plan's Target Release field has been updated with a confirmed version), UAT may reference that confirmed version.
```

---

### R4 — Post-UAT Code Delta Summary in Implementation Doc

**Source**: Retrospective §Repeatable Process Improvements #4
**Priority**: LOW — Already partially covered

**Current state**: The Implementer's `Post-UAT Delta Protocol (MANDATORY when applicable)` already requires recording a `Post-UAT Delta Review` section in the Implementation doc. The DevOps `Post-UAT delta check (MANDATORY)` independently verifies this. The retrospective notes that "the implementation artifact should record the delta summary directly" — but this is already the rule.

**Assessment**: The protocol worked correctly in Plan 058. The Implementer was operating ad hoc (user was manually testing), so the delta was recorded in the DevOps deployment doc rather than the implementation doc. This is an execution gap, not an instruction gap. The existing rule is sufficient.

**Recommendation**: DEFER — No instruction change needed. The existing protocol is adequate.

---

### R5 — Timestamp Sanity Check Before Closing Implementation Artifacts

**Source**: Retrospective §Repeatable Process Improvements #5
**Priority**: LOW — Already partially covered

**Current state**: PI-056 added mandatory timestamp discipline to most agent instructions and DevOps added a chain timestamp sanity-check. The specific anomaly in Plan 058 (implementation doc dated 2026-03-24 while everything else was 2026-03-23) was caught by DevOps Stage 1 and documented.

**Assessment**: The existing DevOps chain timestamp sanity-check (Core Responsibility 4c) already covers this. Adding a redundant check to the Implementer would be over-engineering:
- The Implementer records timestamps at write time, when clock errors are invisible to the writer.
- The DevOps sanity-check reviews timestamps cross-document, where anomalies become visible.

**Recommendation**: DEFER — The existing DevOps gate is the correct checkpoint for this.

---

## Conflict Analysis

### C1 — R1 vs UAT "document-based review" framing

**Conflicting instruction**: UAT instructions line 1: "Act as Product Owner conducting UAT—a quick, high-level sanity check ensuring delivered value aligns with the plan's objective and value statement. This is a document-based review, not a code inspection."

**Nature of conflict**: R1 requires live session validation for admin/RLS features, which goes beyond "document-based review." However, the UAT doc already contains conditional exceptions to this framing (Design-Review UAT, Performance Timing Gate, Focus/Scroll Scenarios) that require non-document evidence.

**Impact if implemented**: Minor framing tension with the opening paragraph, but consistent with the established exception pattern.

**Proposed resolution**: Add R1 as another conditional gate following the same "WHEN APPLICABLE" pattern. Do NOT change the opening framing paragraph — the exceptions are already understood to override the default when applicable.

**Resolved**: ✅ Yes — R1 follows the existing exception pattern.

---

### C2 — R3 vs UAT release decision format

**Conflicting instruction**: UAT Document Format includes "**Recommended Version**: [patch/minor/major bump with justification]". This template implies a concrete version number.

**Nature of conflict**: R3 suggests referencing conservative version language instead of a hard number. However, the template is guidance, not a constraint.

**Impact if implemented**: Minimal. The template is illustrative. Adding a SHOULD-level note clarifies intent without changing the template.

**Proposed resolution**: Add the Release Version Discipline note under the Release Decision section description. Do NOT change the template — just add guidance above it.

**Resolved**: ✅ Yes — Guidance addition, not template change.

---

## Risk Assessment

| Recommendation | Risk Level | Rationale | Mitigation |
|----------------|------------|-----------|------------|
| R1 — Admin Runtime Smoke Gate | LOW | Additive conditional gate; follows existing UAT exception pattern; scoped to admin/RLS features | Only triggers for role/RLS-dependent features |
| R2 — Shared Results Actionability | LOW | Additive checklist; narrow trigger condition; follows existing checklist pattern | Only triggers for multi-entity lists with inline actions |
| R3 — Release Number Lock | LOW | Guidance-only SHOULD-level note; does not add gates | No behavioral change for non-version-sensitive UATs |
| R4 — Post-UAT Delta in Implementation | NONE | No change — existing rule is adequate | N/A |
| R5 — Timestamp Sanity Check | NONE | No change — existing DevOps gate covers this | N/A |

---

## Implementation Recommendations

### High-Impact, Low-Risk (implement now)

1. **R1**: Add Admin Runtime Smoke Gate to `.github/agents/uat.agent.md`
2. **R2**: Add Shared Results Actionability Checklist to `.github/agents/planner.agent.md` and `.github/agents/code-reviewer.agent.md`
3. **R3**: Add Release Version Discipline note to `.github/agents/uat.agent.md`

### Deferred (already covered)

4. **R4**: Post-UAT Delta Summary in Implementation — already mandated by existing protocol
5. **R5**: Timestamp Sanity Check — already mandated by DevOps chain sanity-check

---

## Suggested Agent Instruction Updates

### Files to update

1. `.github/agents/uat.agent.md` — Add R1 (Admin Runtime Smoke Gate) and R3 (Release Version Discipline)
2. `.github/agents/planner.agent.md` — Add R2 (Shared Results Actionability Check)
3. `.github/agents/code-reviewer.agent.md` — Add R2 (Shared Results Actionability Checklist as 6g)

### Validation plan

After implementation:
- Read each modified file and verify the new sections are syntactically correct and positioned consistently with existing conditional gates
- Verify no existing sections were accidentally modified or removed
- Confirm the implementation templates match the analysis doc exactly

---

## User Decision Required

1. ✅ **Update now**: Apply R1, R2, R3 to agent instructions
2. 🔍 **Review first**: Present exact diffs before applying
3. 📋 **Phase rollout**: Apply one recommendation at a time
4. ⏸️ **Defer all**: No changes now

---

## Related Artifacts

| Artifact | Location |
|----------|----------|
| Source Retrospective | `agent-output/retrospectives/058-admin-review-in-providers-discovery-retrospective.md` |
| Plan 058 | `agent-output/planning/closed/058-admin-review-in-providers-discovery-plan.md` |
| Deployment 058 | `agent-output/deployment/058-stage1-v0.8.21.md` |
| UAT Instructions | `.github/agents/uat.agent.md` |
| Planner Instructions | `.github/agents/planner.agent.md` |
| Code Reviewer Instructions | `.github/agents/code-reviewer.agent.md` |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-03-23T21:10Z | ProcessImprovement | Analysis created; R1–R3 validated as instruction gaps; R4–R5 deferred as already covered |
