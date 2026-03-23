---
ID: 057
Origin: 057
UUID: 4d2a9c71
Status: Complete
---

# Process Improvement Analysis 057: Plan 052 Import Workflow Gaps

**Source Retrospective**: `agent-output/retrospectives/closed/052-muslimbusiness-import-retrospective.md`
**Date**: 2026-03-23T17:45Z
**Scope**: Convert Retrospective 052 recommendations into scoped, conflict-checked instruction updates for planning, critique, QA, UAT, and DevOps.

> **NO-MEMORY MODE**: Flowbaby memory tools are unavailable in this environment; proceeding artifact-first.

## Executive Summary

- **Recommendations analyzed**: 6
- **Validated as real instruction gaps**: 5
- **Already partially covered**: 2
- **Refinement required before implementation**: 2
- **Overall risk**: **LOW-MEDIUM**
- **Recommendation**:
  - Implement now: live source verification gate, deferred dry-run risk escalation, import-workflow scope guidance, test-health tracking, source-contract risk language in UAT.
  - Refine before implementation: version-number ownership wording, so it strengthens current Planner guidance instead of contradicting it.

### Primary findings

1. The workflow has **no explicit owner** for verifying a third-party import source contract before implementation begins.
2. QA/UAT allow a blocked import dry-run to be recorded as deferred without a strong enough risk classification or closure window.
3. Import plans can omit operator-facing GitHub Actions workflow scope even when an adjacent pipeline already exposes that execution path.
4. DevOps documents pre-existing failing tests at release time, but current instructions do not require turning those failures into visible follow-up work.
5. Planner guidance already says exact semver is confirmed at DevOps Stage 1, so the retrospective recommendation should be narrowed to remove misleading “likely version” wording rather than rewritten as a brand-new rule.

## Changelog Pattern Analysis

### Documents reviewed

- `agent-output/retrospectives/closed/052-muslimbusiness-import-retrospective.md`
- `agent-output/planning/closed/052-muslimbusiness-provider-data-ingestion-plan.md`
- `agent-output/critiques/closed/052-muslimbusiness-provider-data-ingestion-critique.md`
- `agent-output/implementation/closed/052-muslimbusiness-provider-data-ingestion-implementation.md`
- `agent-output/code-review/closed/052-muslimbusiness-provider-data-ingestion-code-review.md`
- `agent-output/qa/closed/052-muslimbusiness-provider-data-ingestion-qa.md`
- `agent-output/uat/closed/052-muslimbusiness-provider-data-ingestion-uat.md`
- `agent-output/deployment/052-stage1-v0.8.19.md`
- `agent-output/deployment/v0.8.20.md`
- `agent-output/planning/052-open-actions.md`
- Current instruction sources:
  - `.github/copilot-instructions.md`
  - `.github/agents/planner.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/uat.agent.md`
  - `.github/agents/devops.agent.md`
  - `.github/README.md`

### Handoff patterns

| Pattern | Frequency | Root cause | Impact | Recommendation |
|---|---:|---|---|---|
| Third-party source assumption accepted without live verification | 1 strong instance | No phase explicitly owns live source contract verification | Post-release hotfix cycle after 0-card run | R1 |
| Blocked dry-run accepted as low-risk residual | 1 strong instance | QA/UAT instructions do not distinguish import dry-run deferrals from ordinary non-blocking follow-ups | Value statement approved before the extraction path was proven | R2, R6 |
| GitHub Actions workflow added only after user asked | 1 strong instance | Planner scope guidance does not mention import workflow parity with existing pipelines | Extra release iteration, delayed operator usability | R4 |
| Version wording in plan drifted into a specific “likely” release | 1 instance | Planner rule is directionally correct, but plan language still invites premature semver anchoring | DevOps had to resolve two collisions and rewrite references | R3 |
| Pre-existing failing test on `origin/main` documented but not tracked forward | 1 strong instance | DevOps instructions require readiness documentation, not visible follow-up tracking | Release proceeds with known CI debt but no explicit owner | R5 |

### Efficiency metrics

| Metric | Value | Observation |
|---|---:|---|
| Planned handoffs before release | 8 | Linear and efficient |
| Unplanned post-release handoffs | 2 | Investigation + hotfix release |
| Same-session releases for same plan | 2 | v0.8.19 then v0.8.20 |
| Root-cause-to-fix cycle | ~60 minutes | Fast remediation once source drift was discovered |
| Preventable hotfix cycles | 1 | Would likely have been caught by a 5-minute live source check |

## Recommendation Analysis

### R1: Add a live source verification gate for third-party import plans

- **Source recommendation**: Planner/Critic must `curl`/fetch the import source and verify the expected data shape before implementation.
- **Current state**:
  - `.github/agents/planner.agent.md` requires repository/context gathering but does not require a live source check.
  - No reviewed instruction explicitly assigns responsibility for validating third-party source shape before implementation.
  - `.github/agents/devops.agent.md` mentions `curl` only for post-release/manual smoke verification.
- **Gap**: The plan assumed server-rendered cards; the first real validation happened only after release.
- **Proposed change**:
  - Add a Planner rule for third-party import/data-source plans: perform a lightweight live source spot-check and record what was verified.
  - Add a Critic review item that rejects or flags plans where the extraction assumption is undocumented or unverified.
- **Alignment**: Strongly aligned with artifact-first and risk-reduction goals.
- **Affected files**:
  - `.github/agents/planner.agent.md`
  - `.github/agents/critic.agent.md`
- **Implementation template**:

```md
### Third-Party Source Verification (MANDATORY for import/data-ingestion plans)

- If the plan depends on a third-party public source, perform a lightweight live spot-check before handoff to Critic.
- Verify and record: reachable URL, server-rendered vs client-rendered shape, pagination/access assumptions, and the minimum fields needed for the import.
- Acceptable evidence: `curl`, page fetch, response snippet inspection, or equivalent read-only verification.
- If the source cannot be verified from the current environment, explicitly mark the assumption as unresolved, document the blocker, and raise the risk level.
```

- **Risk**: LOW

### R2: Escalate blocked import dry-runs from LOW to MEDIUM risk

- **Source recommendation**: A blocked dry-run on an import pipeline should never be treated as LOW risk.
- **Current state**:
  - `.github/agents/qa.agent.md` requires deferred items to record owner/rationale/severity/fallback, but does not special-case import dry-runs.
  - `.github/agents/uat.agent.md` requires deferred follow-ups but does not require higher risk language for import source validation gaps.
- **Gap**: Plan 052’s dry-run deferral remained classified too softly even though it was the only end-to-end extraction proof.
- **Proposed change**:
  - Add QA/UAT language: when the primary import extraction path has not been executed end-to-end, the residual risk is at least MEDIUM and must include an execution window and closure evidence.
- **Alignment**: Directly addresses the release-quality gap without changing code workflow.
- **Affected files**:
  - `.github/agents/qa.agent.md`
  - `.github/agents/uat.agent.md`
- **Implementation template**:

```md
### Import Dry-Run Deferral Rule (MANDATORY when applicable)

If a plan's primary value depends on a third-party import or ingestion dry-run and that dry-run cannot be executed, do not classify the residual risk as LOW.

Minimum handling:
- classify as MEDIUM risk
- assign owner
- assign trigger or due window (preferably before or within 24h of release)
- define exact closure evidence
- state whether release is conditional on that evidence
```

- **Risk**: LOW

### R3: Refine version wording instead of inventing a new ownership rule

- **Source recommendation**: “Version number ownership at DevOps only.”
- **Current state**:
  - `.github/agents/planner.agent.md` already says: _“next available patch after current `origin/main` version; confirm at DevOps Stage 1”_.
  - `.github/agents/devops.agent.md` already treats git tags + `origin/main:package.json` as the source of truth.
- **Conflict**:
  - A literal “DevOps only” rule would contradict the planner’s current responsibility to identify the target release bundle and release strategy.
- **Proposed refinement**:
  - Keep Planner’s release-bundle ownership.
  - Tighten wording so plans never use speculative exact semver such as “likely v0.8.17”; require placeholder phrasing only until Stage 1.
- **Alignment**: Preserves current workflow while removing misleading specificity.
- **Affected files**:
  - `.github/agents/planner.agent.md`
  - Optional: plan template references if present in workflow docs
- **Implementation template**:

```md
When documenting `Target Release`, do not use speculative exact versions such as `likely vX.Y.Z`.
Use one of:
- `next available patch after current origin/main version; confirm at DevOps Stage 1`, or
- a confirmed bundled release version when explicitly provided by roadmap/release coordination.
```

- **Risk**: LOW

### R4: Make GitHub Actions workflow parity explicit for import plans

- **Source recommendation**: If an existing import pipeline has a GitHub Actions workflow, new sibling import pipelines should scope workflow parity by default.
- **Current state**:
  - `.github/README.md` documents the repo’s GitHub Actions workflows.
  - No reviewed agent instruction says import plans should consider a manual `workflow_dispatch` path when similar pipelines already expose one.
- **Logical challenge**:
  - Not every import script belongs in GitHub Actions; some may be one-off, exploratory, or credential-sensitive.
- **Proposed refinement**:
  - Add Planner guidance to evaluate workflow parity when a plan adds a reusable admin/operator import script and a comparable workflow already exists.
  - The rule should be “default consideration” rather than “always build a workflow.”
- **Affected files**:
  - `.github/agents/planner.agent.md`
  - Optional workflow README note in `.github/README.md`
- **Implementation template**:

```md
### Operator Execution Path Parity (WHEN APPLICABLE)

If the plan adds or extends a reusable admin/operator import pipeline and a similar pipeline already supports manual GitHub Actions execution, explicitly decide whether workflow parity is in scope.

Document one of:
- workflow parity included, or
- workflow parity deferred with rationale and operator fallback
```

- **Risk**: LOW-MEDIUM

### R5: Track pre-existing `origin/main` test failures as visible follow-up work

- **Source recommendation**: Don’t let known failing tests on `origin/main` be documented and then forgotten.
- **Current state**:
  - `.github/agents/devops.agent.md` requires release readiness, audit evidence, and smoke checks.
  - It does not require an open tracker or explicit owner when a release proceeds despite a known pre-existing failing test.
- **Gap**: Plan 052’s release doc correctly recorded the failing `AdminProvidersPageContent` test, but no tracker or follow-up handoff was created.
- **Proposed change**:
  - Add a DevOps rule: if release proceeds with a documented pre-existing test failure on `origin/main`, create or update a visible follow-up item with owner and closure evidence.
- **Affected files**:
  - `.github/agents/devops.agent.md`
  - Possibly `.github/agents/qa.agent.md` if we want QA to surface the same pattern earlier
- **Implementation template**:

```md
### Pre-Existing Mainline Test Failures (MANDATORY when applicable)

If release readiness discovers a failing test that reproduces on `origin/main` and is not introduced by the current release work:
- document it in the readiness doc
- assign an owner
- create or update a visible follow-up tracker/open action
- state whether the current release is blocked or conditionally proceeding despite that debt
```

- **Risk**: LOW-MEDIUM

### R6: Add “external source contract stability” as a standard UAT risk category

- **Source recommendation**: UAT should explicitly assess third-party source stability when value depends on an external public dataset.
- **Current state**:
  - `.github/agents/uat.agent.md` requires deferred follow-ups and residual risk documentation.
  - It does not call out third-party source stability as a standard category to assess.
- **Gap**: The most important risk in Plan 052 was present conceptually but not named, which made it easier to underrate.
- **Proposed change**:
  - Add a UAT checklist item for plans depending on third-party public data: assess source contract stability and whether end-to-end extraction proof exists.
- **Affected files**:
  - `.github/agents/uat.agent.md`
- **Implementation template**:

```md
### External Source Contract Stability (WHEN APPLICABLE)

If the plan depends on third-party public data, UAT MUST assess:
- whether the source contract was verified during planning/implementation
- whether end-to-end extraction/import evidence exists
- whether residual release risk depends on the source remaining stable

If evidence is missing, record it explicitly as a value-delivery risk.
```

- **Risk**: LOW

## Conflict Analysis

| Recommendation | Conflicting instruction | Nature of conflict | Impact if implemented naively | Proposed resolution | Resolved? |
|---|---|---|---|---|---|
| R3 version ownership | `.github/agents/planner.agent.md` already requires target release identification and placeholder semver wording | Direct contradiction if “DevOps only” is taken literally | Would remove Planner’s legitimate release-bundle coordination role | Narrow the change to ban speculative exact versions, not planning-level release assignment | Yes |
| R4 workflow parity | No current rule requires every import script to expose GitHub Actions | Scope-creep risk | Could force workflows for one-off or sensitive scripts | Make it conditional on reusable operator pipelines with an existing comparable workflow | Yes |
| R1 live source verification | Some environments may block fetch/curl validation | Logical inconsistency if treated as always executable | Plans could be blocked by environment instead of documenting the uncertainty | Allow explicit blocker path with raised risk and documented assumption | Yes |
| R5 mainline failing test tracking | DevOps currently emphasizes readiness documentation, not debt ownership | Workflow bottleneck risk if every known failure becomes a hard block | Could freeze releases over unrelated legacy failures | Require visible tracking + owner; leave block/conditional-go decision based on severity and user approval | Yes |

## Logical Challenges

### 1. Verification environment may not match source behavior

- **Issue**: A simple `curl` may not fully reveal hydration/runtime behavior for modern client-rendered sources.
- **Affected recommendations**: R1, R6
- **Clarification needed**: The rule must require enough verification to challenge assumptions, not guarantee perfect source modeling.
- **Proposed solution**: Phrase the gate as a lightweight spot-check that verifies the assumed acquisition path or documents that it is uncertain.

### 2. Workflow parity can become boilerplate

- **Issue**: A blanket workflow requirement would over-prescribe solution shape.
- **Affected recommendations**: R4
- **Clarification needed**: Distinguish reusable operator tooling from ad-hoc scripts.
- **Proposed solution**: Scope the rule to reusable admin/operator import pipelines with an existing analogue.

### 3. Mainline failing tests need visibility without making every release impossible

- **Issue**: Requiring a hard block for every pre-existing failure would create frequent workflow deadlocks.
- **Affected recommendations**: R5
- **Clarification needed**: Preserve risk visibility while allowing controlled release decisions.
- **Proposed solution**: Mandate tracker creation and explicit release rationale; only block automatically for severe/test-domain-relevant failures.

## Risk Assessment

| Recommendation | Risk Level | Rationale | Mitigation |
|---|---|---|---|
| R1 live source verification | LOW | Additive check, narrow scope, high value | Allow blocked-environment fallback with explicit risk |
| R2 import dry-run risk escalation | LOW | Clarifies existing deferred-follow-up behavior | Limit to plans whose value depends on import execution |
| R3 version wording refinement | LOW | Mostly wording; aligns with existing rule | Keep Planner release-bundle role intact |
| R4 workflow parity guidance | LOW-MEDIUM | Could widen scope if phrased too strongly | Make it conditional and explicit, not automatic |
| R5 mainline failing test tracking | LOW-MEDIUM | Can add tracking overhead | Require only visible owner + tracker, not universal hard block |
| R6 source-contract risk in UAT | LOW | Additive documentation rule | Scope to third-party public data plans only |

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

1. R1 live source verification gate in Planner + Critic
2. R2 import dry-run risk escalation in QA + UAT
3. R3 version wording refinement in Planner
4. R6 external source contract stability in UAT

### Medium-Impact or Medium-Risk

1. R4 operator workflow parity guidance in Planner
2. R5 mainline failing test tracking in DevOps

### Low-Impact or High-Risk (defer)

1. None from this retrospective if scoped as above

## Suggested Agent Instruction Updates

### Files likely to change after approval

- `.github/agents/planner.agent.md`
- `.github/agents/critic.agent.md`
- `.github/agents/qa.agent.md`
- `.github/agents/uat.agent.md`
- `.github/agents/devops.agent.md`
- Optional: `.github/README.md` if you want the operator workflow expectation reflected in workflow docs rather than only planner guidance

### Implementation approach options

- **Option 1: Minimal targeted updates**
  - Add small, phase-specific subsections for R1, R2, R4, R5, R6
  - Tighten Planner wording for R3 only where semver phrasing appears
  - Lowest risk and fastest rollout

- **Option 2: Import-plan policy bundle**
  - Add a dedicated "Third-Party Import Plans" subsection across Planner, Critic, QA, and UAT
  - Clearer long-term, but larger docs diff and more opportunities for wording drift

### Validation plan

- Verify each inserted rule is conditionally scoped (`when applicable`) where needed
- Confirm no instruction contradicts current DevOps two-stage release model
- Confirm no instruction makes browser automation mandatory for source verification
- Confirm QA/UAT examples and wording stay consistent with existing deferred-follow-up format

## User Decision Required

1. **Update now**: apply the low-risk instruction changes in one pass
2. **Review first**: inspect the proposed file-by-file edits before I modify agent instructions
3. **Phase rollout**: implement only R1, R2, R3, and R6 now; defer R4 and R5
4. **Defer**: keep analysis only, no instruction changes yet

## Related Artifacts

- `agent-output/retrospectives/052-muslimbusiness-import-retrospective.md`
- `agent-output/planning/closed/052-muslimbusiness-provider-data-ingestion-plan.md`
- `agent-output/qa/closed/052-muslimbusiness-provider-data-ingestion-qa.md`
- `agent-output/uat/closed/052-muslimbusiness-provider-data-ingestion-uat.md`
- `agent-output/deployment/v0.8.20.md`
- `.github/agents/planner.agent.md`
- `.github/agents/qa.agent.md`
- `.github/agents/uat.agent.md`
- `.github/agents/devops.agent.md`
