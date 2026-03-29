---
ID: 070
Origin: 070
UUID: 6c2f91ab
Status: Active
---

# Process Improvement Analysis 070: Plan 065 Retrospective Follow-Through

**Source Retrospective**: `agent-output/retrospectives/closed/065-provider-enrichment-pipeline-retrospective.md`
**Date**: 2026-03-29T17:25Z
**Scope**: Validate Retrospective 065 recommendations P1–P3 against current agent instructions and define low-risk instruction updates for user approval.

> **NO-MEMORY MODE**: Flowbaby retrieval is unavailable in the current tool surface. Proceeding artifact-first per mode requirements.

> **Status**: Instructions updated 2026-03-29T17:35Z. See `070-agent-instruction-updates.md`.

## Executive Summary

- **Recommendations analyzed**: 3
- **Validated as real instruction gaps**: 3
- **Already partially covered**: 1
- **Primary systemic issues**:
  - Critique lifecycle rules allow deferred findings to keep critiques permanently OPEN, even when they have a named downstream owner.
  - Planner instructions do not require an explicit ownership-scope decision when plans touch existing `providers` rows.
  - Implementer instructions require tests and type-safety but do not explicitly require a lint-clean handoff before QA.
- **Overall risk**: **LOW-MEDIUM**
- **Recommendation**:
  - Implement now: P2 and P3.
  - Implement now with careful wording: P1.
  - Do not widen scope beyond these three items in this pass.

## Changelog Pattern Analysis

### Documents reviewed

- `agent-output/retrospectives/closed/065-provider-enrichment-pipeline-retrospective.md`
- `agent-output/planning/closed/065-provider-enrichment-pipeline.md`
- `agent-output/critiques/065-provider-enrichment-pipeline-critique.md`
- `agent-output/implementation/closed/065-provider-enrichment-pipeline.md`
- `agent-output/code-review/closed/065-provider-enrichment-pipeline-code-review.md`
- `agent-output/qa/closed/065-provider-enrichment-pipeline-qa.md`
- `agent-output/uat/closed/065-provider-enrichment-pipeline-uat.md`
- `agent-output/deployment/v0.10.0.md`
- Current instruction sources:
  - `.github/agents/critic.agent.md`
  - `.github/agents/planner.agent.md`
  - `.github/agents/implementer.agent.md`
  - `.github/copilot-instructions.md`
  - `.github/skills/document-lifecycle/SKILL.md`

### Handoff patterns

| Pattern | Frequency | Root cause | Impact | Recommendation |
|---|---:|---|---|---|
| Deferred critique findings remain OPEN indefinitely | 1 strong instance | Critic lifecycle supports `DEFERRED` status in prose, but closure rule only triggers when no OPEN findings remain and there is no per-finding deferred ownership rule | Critique 065 stays active even though some items are intentionally carried to M4 | P1 |
| Ownership scope discovered after planning | 1 strong instance | Planner has no explicit ownership-scope checkpoint for existing provider entities | Two critique passes, two implementation passes, two QA passes | P2 |
| QA catches IDE-level lint issues | 1 strong instance | Implementer lacks explicit pre-QA lint gate | QA reset with no meaningful product validation | P3 |
| Lint/type-check already present at repo level but not handoff-enforced | Recurring baseline | General repo docs list commands, but no agent-level handoff rule binds them | Inconsistent execution by implementers | P3 |

### Efficiency metrics

| Metric | Value | Observation |
|---|---:|---|
| Total plan-chain handoffs | 13 | Normal for a greenfield feature, but inflated by one scope revision and one QA reset |
| Critique passes | 2 | Second pass driven by missing ownership scope at planning time |
| QA passes | 2 | First pass failed in ~4 minutes on lint only |
| Code review passes | 2 | Second pass was appropriate delta review, not waste |
| Deferred critique items without closure path | 2 clear items | C-6 and C-8 are intentionally future-owned but keep critique active |

## Recommendation Analysis

### P1: Add deferred-finding closure semantics to critique workflow

- **Source**: Retrospective 065 P1
- **Current state**:
  - `.github/agents/critic.agent.md` says critique status must track `OPEN/ADDRESSED/RESOLVED/DEFERRED`.
  - The same file also says: `If the plan is now APPROVED and there are no OPEN findings remaining, you MUST ... move the critique to closed/`.
  - There is no rule for when a specific finding may be marked deferred, what ownership evidence is required, or how deferred findings affect critique closure.
  - `.github/skills/document-lifecycle/SKILL.md` only treats critique closure as `Resolved`, with no distinction between resolved-now and deferred-with-owner findings.
- **Proposed change**:
  - Define a finding-level `Deferred` state in `critic.agent.md` with mandatory downstream owner evidence.
  - Clarify that a critique may close as `Resolved` when all remaining non-resolved findings are explicitly `Deferred` with named owner/artifact, and no unowned OPEN findings remain.
  - Keep document-level terminal status as `Resolved`; do not introduce a new terminal critique document status.
- **Alignment**: High. This preserves the existing document lifecycle while removing the deadlock.
- **Affected agents/files**:
  - `.github/agents/critic.agent.md`
  - Optional clarification only: `.github/skills/document-lifecycle/SKILL.md`
- **Implementation template**:
  - Add a `Deferred Findings Rule` section requiring `Deferred → owner + target artifact + trigger/next milestone`.
  - Amend closure rule text to allow closure when all remaining findings are either `RESOLVED` or `DEFERRED` with explicit downstream ownership.
- **Risk**: **MEDIUM**
- **Rationale**: Helpful, but wording must avoid making it too easy to defer substantive critique findings without accountability.

### P2: Add ownership-scope checkpoint to Planner instructions

- **Source**: Retrospective 065 P2
- **Current state**:
  - `.github/agents/planner.agent.md` includes strong guidance on value, release, open questions, shared actionability, and third-party verification.
  - It does not include any explicit check for entity ownership when plans modify existing `providers` rows.
  - The closest current rule is Shared Results Actionability, which is about multi-entity lists, not ownership semantics.
- **Proposed change**:
  - Add a short `Entity Ownership Check` under Planner requirements or process.
  - Trigger condition: plans that create, modify, enrich, moderate, or batch-update existing provider data.
  - Required answer shape: whether the plan applies to claimed providers, unclaimed providers, or both; where the ownership gate is enforced; and whether any fail-closed behavior is required for transitions during review.
- **Alignment**: Very high. This is a narrow extension of existing plan-risk checks.
- **Affected agents/files**:
  - `.github/agents/planner.agent.md`
- **Implementation template**:
  - Add a subsection near `Shared Results Actionability Check` or `Process`: `If a plan modifies existing providers, explicitly state whether claimed/unclaimed providers are in scope and where ownership filtering is enforced.`
- **Risk**: **LOW**
- **Rationale**: Additive and targeted. It does not expand planner scope beyond documenting a decision already needed downstream.

### P3: Require lint-clean Implementer handoff before QA

- **Source**: Retrospective 065 P3
- **Current state**:
  - `.github/agents/implementer.agent.md` requires tests, type-safety, and value delivery.
  - It does not explicitly say `npm run lint` must pass before QA handoff.
  - `.github/copilot-instructions.md` lists `npm run lint` and `npm run lint:fix`, but only as environment workflow commands, not as a mandatory handoff gate.
- **Proposed change**:
  - Add a hard pre-handoff rule in `implementer.agent.md`: before handing off to Code Review or QA, run `npm run lint` and `npm run type-check`; if either fails, fix or escalate before handoff.
  - Keep QA as the authoritative validation gate; this is only a self-check requirement.
- **Alignment**: High. Fits current quality philosophy and handoff completeness rules.
- **Affected agents/files**:
  - `.github/agents/implementer.agent.md`
  - Optional consistency sync: `.github/copilot-instructions.md`
- **Implementation template**:
  - Add a `Pre-QA Static Gate` block under Core Responsibilities or Constraints.
- **Risk**: **LOW**
- **Rationale**: Very narrow. The commands already exist; the change is only binding them to a handoff gate.

## Conflict Analysis

### Conflict 1

- **Recommendation**: P1 deferred-finding state for critiques
- **Conflicting instruction**:
  - `.github/agents/critic.agent.md`: `If the plan is now APPROVED and there are no OPEN findings remaining, you MUST ... move the critique to agent-output/critiques/closed/`
- **Nature of conflict**: Logical inconsistency
- **Impact if implemented naively**: If `DEFERRED` is added informally without explicit closure semantics, critiques still remain active forever.
- **Proposed resolution**: Keep critique document closure status as `Resolved`, but define that `DEFERRED` findings must be owned and do not count as unresolved blockers.
- **Resolved status**: Resolvable with wording update

### Conflict 2

- **Recommendation**: P1 optional document-lifecycle clarification
- **Conflicting instruction**:
  - `.github/skills/document-lifecycle/SKILL.md`: `Resolved | All findings addressed (critiques only)`
- **Nature of conflict**: Terminology ambiguity
- **Impact if implemented naively**: Readers may interpret `Deferred` findings as "not addressed," even if they are explicitly carried forward.
- **Proposed resolution**: Clarify in the skill or leave the skill unchanged and define in `critic.agent.md` that `addressed` includes `Deferred with downstream owner`.
- **Resolved status**: Resolvable either in Critic only or Critic + lifecycle skill

### Conflict 3

- **Recommendation**: P3 lint gate before QA
- **Conflicting instruction**:
  - None direct; only absence of explicit rule
- **Nature of conflict**: Missing gate, not contradiction
- **Impact if implemented**: None negative beyond slightly stricter implementer checklist
- **Proposed resolution**: Add rule without changing QA authority
- **Resolved status**: No real conflict

## Logical Challenges

### Challenge 1

- **Issue**: P1 can be abused if `Deferred` becomes a generic escape hatch for unresolved critique findings.
- **Affected recommendations**: P1
- **Clarification needed**: What minimum evidence is required before a finding is eligible for `Deferred`?
- **Proposed solution**: Require all deferred findings to include:
  - downstream owner/agent
  - target artifact or plan/open-action file
  - trigger milestone or release
  - explicit non-blocking rationale

### Challenge 2

- **Issue**: P2 could overgeneralize beyond providers and become vague.
- **Affected recommendations**: P2
- **Clarification needed**: Should the rule be provider-specific or generic to all owned entities?
- **Proposed solution**: Implement provider-specific wording now, because the observed failure mode was provider ownership. Generalize later only if repeated across other domains.

### Challenge 3

- **Issue**: P3 should not be read as replacing Code Review or QA responsibility.
- **Affected recommendations**: P3
- **Clarification needed**: Where should the rule sit?
- **Proposed solution**: Place it in Implementer as a self-check gate before handoff. Keep QA docs and QA authority unchanged.

## Risk Assessment

| Recommendation | Risk Level | Rationale | Mitigation |
|---|---|---|---|
| P1 | MEDIUM | Changes critique closure semantics; could weaken review discipline if under-specified | Require owner + downstream artifact + non-blocking rationale for every deferred finding |
| P2 | LOW | Adds one explicit plan decision checkpoint | Keep wording narrowly scoped to existing provider modifications |
| P3 | LOW | Tightens pre-handoff discipline only | Phrase as self-check; preserve QA as authority |

## Implementation Recommendations

### High-Impact, Low-Risk

1. P2 — Add provider ownership check to Planner instructions
2. P3 — Add explicit lint + type-check pre-handoff gate to Implementer instructions

### Medium-Impact or Medium-Risk

1. P1 — Add deferred-finding closure semantics to Critic instructions

### Low-Impact or High-Risk (defer)

1. Generalizing P2 from providers to all owned entities in this same pass
2. Introducing a new document-level critique terminal status instead of clarifying `Resolved`

## Suggested Agent Instruction Updates

### Files likely to update

- `.github/agents/critic.agent.md`
- `.github/agents/planner.agent.md`
- `.github/agents/implementer.agent.md`
- Optional: `.github/copilot-instructions.md`
- Optional: `.github/skills/document-lifecycle/SKILL.md`

### Implementation approach options

1. **Minimal**
   - Update only `critic.agent.md`, `planner.agent.md`, and `implementer.agent.md`
   - Lowest change surface; enough to codify P1–P3
2. **Aligned**
   - Do the minimal set plus a brief lifecycle clarification in `document-lifecycle/SKILL.md`
   - Best balance of clarity and low risk
3. **Broad**
   - Also sync wording into `.github/copilot-instructions.md`
   - More consistent, but slightly higher maintenance surface

### Validation plan

- Re-read changed instruction files for contradiction checks
- Verify P1 still preserves critique closure discipline and does not create a bypass
- Verify P2 language is triggered only when relevant
- Verify P3 clearly states self-check before QA/Code Review handoff and does not dilute QA authority

## User Decision Required

1. **Update now**: Apply the minimal or aligned instruction updates immediately
2. **Review first**: Review this analysis, then approve a specific update set
3. **Phase rollout**: Implement P2 + P3 now, defer P1 until after one more retrospective confirms the pattern
4. **Defer**: Keep as analysis only; no instruction changes yet

## Related Artifacts

- `agent-output/retrospectives/065-provider-enrichment-pipeline-retrospective.md`
- `agent-output/planning/closed/065-provider-enrichment-pipeline.md`
- `agent-output/critiques/065-provider-enrichment-pipeline-critique.md`
- `agent-output/deployment/v0.10.0.md`
- `.github/agents/critic.agent.md`
- `.github/agents/planner.agent.md`
- `.github/agents/implementer.agent.md`
