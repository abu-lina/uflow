---
ID: 038
Origin: 038
UUID: a8d0f3c1
Status: Active
---

# Process Improvement Analysis 038: Cross-Layer Integration Wiring + Data-Flow Review Checklist

**Source Retrospective**: `agent-output/retrospectives/038-provider-owner-outreach-claim-system-retrospective.md`  
**Date**: 2026-03-13  
**Scope**: Convert Retrospective 038 recommendations (PI-1..PI-6) into consistent agent-instruction updates (pending user approval).

> **NO-MEMORY MODE**: Flowbaby retrieval/store tools are not available in this environment; proceeding artifact-first.

## Executive Summary

- **Recommendations analyzed**: 6 (PI-1..PI-6)
- **High-impact, low-risk updates proposed now**:
  - **PI-1 (Implementer)**: Add a mandatory “caller exists / end-to-end wiring” self-check for new API routes and URL params.
  - **PI-2 (Code Reviewer)**: Add a mandatory outbound data-flow cross-trace checklist (redirect/query params must be consumed downstream).
- **Medium-priority updates** (optional): DevOps changelog-date validation + `npm audit` gate; pre-operation item tracking; UAT “remediation fix inspected” note.
- **Overall risk**: **LOW** (instruction-only; additive checklists)

## Changelog Pattern Analysis

### Documents reviewed (Plan 038 chain)

- Retrospective: `agent-output/retrospectives/038-provider-owner-outreach-claim-system-retrospective.md`
- Deployment: `agent-output/deployment/v0.8.0.md`
- Current agent instructions:
  - `.github/agents/implementer.agent.md`
  - `.github/agents/code-reviewer.agent.md`
  - `.github/agents/devops.agent.md`
  - `.github/agents/uat.agent.md`

### Handoff pattern / failure signature

| Pattern | Frequency | Root cause | Impact | Recommendation |
|---|---:|---|---|---|
| New API exists but no production caller | Occurred in 038 | Missing “caller exists” self-check in Implementer | QA failure + round-trip cycle time | PI-1 (Implementer wiring check) |
| Redirect emits query params but reviewer doesn’t verify downstream consumption | Occurred in 038 | Code review checklist focuses on per-file quality, not cross-file data-flow | Missed integration defect before QA | PI-2 (Reviewer cross-trace) |
| Release checklist validates version strings but not “semantic correctness” (CHANGELOG date) | Occurred in 038 | Checklist doesn’t force date sanity-check | Incorrect release record | PI-3 (DevOps changelog-date gate) |

## Recommendation Analysis

### PI-1 — Implementer self-review: “caller exists / end-to-end wiring” (HIGH)

- **Source**: Retrospective 038 — L1 “Add ‘caller exists’ check to self-review before handoff.”
- **Current state**:
  - Implementer has strong TDD gates and a schema verification gate, but there is **no explicit cross-layer wiring verification**.
  - Relevant existing text (from `.github/agents/implementer.agent.md`):
    - “Read complete plan AND analysis… Validate implementation delivers value statement before complete.”
    - TDD gate is defined per function/class, but does not cover multi-file user journeys.
- **Gap observed in 038** (as described in retrospective):
  - Decision page redirected to signup with a `claim` token.
  - API route `/api/outreach/claim` existed.
  - Signup page didn’t read/act on `claim`, so the endpoint had no effective caller in the intended journey.
- **Proposed change**: Add a mandatory **Cross-Layer Integration Self-Check** section to Implementer instructions.
- **Affected agent**: Implementer
- **Risk level**: LOW (checklist only; no behavior change)

**Implementation template (exact text to add)**

Add to `.github/agents/implementer.agent.md` under **Core Responsibilities** (near items 10–12) or under **Workflow**:

```
### Cross-Layer Integration Self-Check (MANDATORY)

When you add or modify ANY of the following:
- a new API route (`src/app/api/**/route.ts`)
- a new RPC/service function intended to be called by UI
- a redirect/link that includes query params (e.g., `?token=...`, `?claim=...`)

You MUST verify “caller exists” and “parameter is consumed” before handing off:

- For each new API route: identify at least one production call site (UI, server action, cron, or another route) and trace the path end-to-end.
- For each emitted query param: open the receiving page/component and confirm it reads AND acts on the param.

If the caller is intentionally deferred (rare):
- Document the deferral explicitly in the Implementation doc (owner + trigger + evidence to close).
- Do NOT claim the milestone is complete unless the plan explicitly allows deferral.
```

---

### PI-2 — Code Reviewer checklist: outbound data-flow cross-trace (HIGH)

- **Source**: Retrospective 038 — L2 “Cross-trace outbound data flows.”
- **Current state**:
  - Code Reviewer instructions emphasize reviewing all changed files and applying checklist skills.
  - There is no explicit rule to cross-trace query params / redirects.
  - Relevant existing text (from `.github/agents/code-reviewer.agent.md`):
    - “Review ALL modified/created files listed in the Implementation doc”
    - “Provide actionable findings with severity, location, and fix suggestion”
- **Gap observed in 038**:
  - The reviewer saw a redirect to signup with a token, but did not verify the receiving signup page consumes the parameter.
- **Proposed change**: Add an explicit **Outbound Data-Flow Cross-Trace Checklist (MANDATORY when applicable)**.
- **Affected agent**: Code Reviewer
- **Risk level**: LOW

**Implementation template (exact text to add)**

Add to `.github/agents/code-reviewer.agent.md` under **Core Responsibilities** after step 6 (review files) as a new 6e:

```
6e. **Outbound Data-Flow Cross-Trace Checklist (MANDATORY when applicable)**:

Trigger when the implementation includes:
- `router.push(...)` / `router.replace(...)` with query params
- `Link href` / anchor href that includes query params
- new API routes intended to be called by UI (`src/app/api/**/route.ts`)

For each outbound param (e.g., `?claim=TOKEN`, `?token=...`, `?returnUrl=...`):
- Locate the receiving page/component.
- Confirm it reads the param and applies the intended behavior.
- If not, record a finding (usually MEDIUM, sometimes HIGH if it breaks a core journey).
```

---

### PI-3 — DevOps Stage 1: CHANGELOG date sanity-check (MEDIUM)

- **Source**: Retrospective 038 — L4.
- **Current state**:
  - Deployment doc’s “Version Consistency” table marked the changelog date as ✅ even though it was incorrect (`2026-06-08` vs March 2026 release day).
  - DevOps instructions require version consistency checks but do not require date validation.
- **Proposed change** (optional): Add a single-line gate: compare CHANGELOG latest entry date to current UTC date (or explicitly record mismatch rationale).
- **Affected agent**: DevOps
- **Risk**: LOW

---

### PI-4 — DevOps Stage 2: add `npm audit` pre-push evidence (MEDIUM)

- **Source**: Retrospective 038 — Dependabot delta during push.
- **Current state**:
  - DevOps instructions do not require `npm audit` or recording “vulns delta” before/after.
- **Proposed change** (optional): Add `npm audit --omit=dev` (or equivalent) to evidence block + note delta.
- **Risk**: LOW–MEDIUM (may create noise; recommend recording rather than blocking release)

---

### PI-5 — Pre-operation items: must create an explicit tracker (MEDIUM)

- **Source**: Retrospective 038 — L3.
- **Current state**:
  - DevOps has `8b` “Deferred post-deploy tracker” but it’s scoped to plan/UAT deferred validations.
  - “Known Limitations (pre-operation)” in deployment docs can still ship without an owner/deadline.
- **Proposed change** (optional): Extend `8b` to also trigger on “Known Limitations (pre-operation)” items.
- **Risk**: LOW

---

### PI-6 — UAT: remediation inspection note (LOW)

- **Source**: Retrospective 038 — UAT should note it reviewed the fix, not just relied on tests.
- **Proposed change** (optional): Add a 1–2 line requirement in UAT doc template: “Remediation reviewed: YES/NO (if NO, rely on QA evidence).”
- **Risk**: LOW

---

### PI-7 — DevOps: prevent committing temp commit-message files (LOW)

- **Source**: Follow-up improvement from PI 038 implementation work (observed failure mode: staging the temp message file).
- **Current state**: DevOps requires `git commit -F <path>`, but does not explicitly prevent the commit-message file from being staged/committed.
- **Proposed change**: Add a mandatory safety rule:
  - Prefer `/tmp/...` message files.
  - If message file is inside repo, use `git diff --cached --name-only` to verify it is not staged.
- **Affected agent**: DevOps
- **Risk level**: LOW

## Conflict Analysis

| Conflict | Recommendation | Conflicting instruction | Nature | Impact | Proposed resolution | Resolved? |
|---|---|---|---|---|---|---|
| C1 | PI-1 | No direct conflict; Implementer guidance is silent on “caller exists” checks | Gap, not contradiction | Integration misses can reach QA | Add explicit checklist section (additive) | ✅ |
| C2 | PI-2 | No direct conflict; Code Reviewer guidance is silent on cross-trace | Gap, not contradiction | Missed cross-file defects before QA | Add 6e checklist (additive) | ✅ |
| C3 | PI-3 | DevOps “Version Consistency” does not validate date correctness | Gap | Incorrect changelog history can ship | Add date sanity-check line | ⏸️ Optional |

## Logical Challenges

1. **Avoid turning PI-1 into a “manual QA” requirement.**
   - Solution: keep it a *traceability* check (“find the production caller”) rather than requiring manual browser testing.
2. **PI-2 must be scoped to high-signal triggers.**
   - Solution: only trigger when query params or new UI-facing routes exist; not for every review.

## Risk Assessment

| Recommendation | Risk level | Rationale | Mitigation |
|---|---|---|---|
| PI-1 | LOW | Additive checklist; prevents a common integration miss | Keep concise; require “one caller path” only |
| PI-2 | LOW | Additive checklist; minimal time cost | Trigger-based; not global |
| PI-3 | LOW | Doc hygiene; no runtime impact | Allow explicit “date differs because…” note |
| PI-4 | LOW–MEDIUM | Audit output can be noisy; can block releases unnecessarily | Require recording, not blocking (unless new CRITICAL) |
| PI-5 | LOW | Tracker creation only | Reuse existing open-actions tracker template |
| PI-6 | LOW | Documentation clarity | Keep as optional note when relevant |

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

- **PI-1**: Update `.github/agents/implementer.agent.md` (add Cross-Layer Integration Self-Check)
- **PI-2**: Update `.github/agents/code-reviewer.agent.md` (add outbound data-flow cross-trace checklist)

### Medium-Impact or Medium-Risk

- **PI-3 / PI-4**: Update `.github/agents/devops.agent.md` (date sanity-check + audit evidence)
- **PI-5**: Update `.github/agents/devops.agent.md` (extend open-actions tracker trigger)

### Low-Impact, Low-Risk

- **PI-6**: Update `.github/agents/uat.agent.md` (add remediation inspection note)

## Suggested Agent Instruction Updates (pending approval)

**Primary**:
- `.github/agents/implementer.agent.md` (PI-1)
- `.github/agents/code-reviewer.agent.md` (PI-2)

**Optional**:
- `.github/agents/devops.agent.md` (PI-3, PI-4, PI-5)
- `.github/agents/uat.agent.md` (PI-6)

## User Decision Required

Choose one:

1. **Update now (PI-1 + PI-2 only)** — highest ROI, lowest scope
2. **Review-first** — I’ll draft exact patches, but not apply them
3. **Phase rollout** — PI-1/PI-2 now, PI-3..PI-6 later
4. **Defer** — keep current workflow

## Related Artifacts

- Retrospective: `agent-output/retrospectives/038-provider-owner-outreach-claim-system-retrospective.md`
- Deployment: `agent-output/deployment/v0.8.0.md`
- Implementer instructions: `.github/agents/implementer.agent.md`
- Code Reviewer instructions: `.github/agents/code-reviewer.agent.md`
- DevOps instructions: `.github/agents/devops.agent.md`
- UAT instructions: `.github/agents/uat.agent.md`
