---
ID: 041
Origin: 041
UUID: 91c4b7e2
Status: Resolved
---

# Process Improvement Analysis 041: v0.8.1 Release Workflow Hardening

**Source Retrospective**: `agent-output/retrospectives/closed/040-v0.8.1-outreach-improvements-retrospective.md`
**Date**: 2026-03-13
**Scope**: Convert Retrospective 040 recommendations into targeted instruction updates for DevOps, Critic, and UAT, while rejecting one-off technical debt items that do not belong in agent instructions.

> **NO-MEMORY MODE**: Flowbaby retrieval is unavailable in this session. Analysis is artifact-first.

## Executive Summary

- **Documents reviewed**: 12 lifecycle artifacts from Plans 039 and 040, 1 retrospective, 4 current agent-instruction files
- **Recommendations analyzed**: 5
- **Proposed instruction updates now**: 4
- **Rejected from instruction scope**: 1
- **Primary affected agents**: DevOps, Critic, UAT
- **Overall risk**: LOW-MEDIUM

**Recommendation**: Proceed with a narrowly scoped instruction update set covering:
- DevOps skill-load ordering and skill-path resolution
- DevOps Stage 1 lifecycle-close sequencing
- DevOps, Critic, and UAT timestamp discipline
- UAT deferred-risk forward-tracking, with DevOps tracker trigger clarification

Do **not** encode Dependabot remediation into agent instructions. That belongs in a dedicated security/maintenance plan.

## Changelog Pattern Analysis

### Documents reviewed

- Retrospective: `agent-output/retrospectives/040-v0.8.1-outreach-improvements-retrospective.md`
- Planning:
  - `agent-output/planning/closed/039-outreach-email-provider-name-v0.8.1.md`
  - `agent-output/planning/closed/040-whatsapp-contact-number-config-v0.8.1.md`
- Critiques:
  - `agent-output/critiques/closed/039-outreach-email-provider-name-critique.md`
  - `agent-output/critiques/closed/040-whatsapp-contact-number-config-critique.md`
- Implementation:
  - `agent-output/implementation/closed/039-outreach-email-provider-name-v0.8.1.md`
  - `agent-output/implementation/closed/040-whatsapp-contact-number-config-v0.8.1.md`
- Code review:
  - `agent-output/code-review/closed/039-outreach-email-provider-name-v0.8.1.md`
  - `agent-output/code-review/closed/040-whatsapp-contact-number-config-v0.8.1.md`
- QA:
  - `agent-output/qa/closed/039-outreach-email-provider-name-v0.8.1-qa.md`
  - `agent-output/qa/closed/040-whatsapp-contact-number-config-v0.8.1.md`
- UAT:
  - `agent-output/uat/closed/039-outreach-email-provider-name-v0.8.1.md`
  - `agent-output/uat/closed/040-whatsapp-contact-number-config-v0.8.1.md`
- Deployment:
  - `agent-output/deployment/0.8.1-stage1-plan039.md`
  - `agent-output/deployment/0.8.1-stage1-plan040.md`
- Current agent instructions:
  - `.github/agents/devops.agent.md`
  - `.github/agents/critic.agent.md`
  - `.github/agents/uat.agent.md`
  - `.github/agents/pi.agent.md`

### Handoff patterns

| Pattern | Frequency | Root cause | Impact | Recommendation |
|---|---:|---|---|---|
| DevOps lost momentum mid-phase after partial skill loading | 1 in this release | Skill loading allowed to occur after work had already started; no explicit first-action batch | Token-budget restart and repeated pre-flight work | PI-041-1 |
| Wrong skill path used for `document-lifecycle` | 1 in this release | Dynamic skill loading describes how to read skills but not how to resolve uncertain paths safely | Tool failure and wasted context budget | PI-041-1 |
| Stage 1 commit omitted lifecycle closure for Plan 039 | 1 in this release | Current DevOps wording closes docs after commit, which permits orphaned doc moves outside the feature commit | Extra docs-only orphan sweep commit | PI-041-2 |
| Impossible timestamp ordering across plan chain | Multiple entries in Plan 040 docs | UTC/ISO guidance is advisory, not operational; no monotonic sanity check | Weak retrospective accuracy | PI-041-3 |
| Deferred UAT risks closed without forward owner/tracker | 2 residual risks in Plan 040 UAT | UAT records residual risk, but general deferred follow-up conversion is not mandatory | Known gaps disappear into closed docs | PI-041-4 |

### Efficiency metrics

| Metric | Observation | Interpretation |
|---|---|---|
| Rework cycles | 1 substantive rework item (`FIND-CR-040-2`) | Healthy; issue closed within same chain |
| DevOps extra commits | 1 orphan-sweep docs commit | Preventable workflow overhead |
| Missing-context incidents | 1 token-budget restart | High-value target for instruction hardening |
| Timestamp anomalies | 2+ | Indicates systematic doc hygiene gap, not one typo |

## Recommendation Analysis

### PI-041-1: Front-load skill loads and resolve skill paths safely

- **Source**: Retrospective 040 P1 findings (`TOKEN-BUDGET`, `SKILL-PATH`)
- **Current state**:
  - DevOps already says `Always load before committing` and has a `Dynamic Skill Loading` section.
  - DevOps also says to skip skills already loaded natively.
- **Gap**:
  - The instruction does **not** require skill loads to be the *first action batch* of the phase.
  - It also does **not** define a safe path-resolution fallback when a skill path is uncertain or copied incorrectly from context.
- **Alignment**: Strong. This is a workflow-hardening change, not scope creep.
- **Affected agents**: DevOps (primary), Critic (secondary if dynamic skill-loading wording is aligned across agents)
- **Proposed change**:
  - Add a `Phase-start skill preflight (MANDATORY)` block in DevOps.
  - Clarify that uncertain skill paths must be resolved before reading, using the known `.github/skills/<name>/SKILL.md` convention for UFlow skills and a search-based fallback when the path is not explicit.
- **Implementation template**:

```md
### Phase-Start Skill Preflight (MANDATORY)

Before any git, deployment, or document work:
- Load all mandatory skills for the phase in the first read-only batch.
- For Stage 1, this means at minimum: `memory-contract`, `document-lifecycle`, and `commit`.
- If a skill path is uncertain or copied from a prior summary, resolve it before reading.
  - Prefer the canonical UFlow path: `.github/skills/<name>/SKILL.md`
  - If still uncertain, locate the file first, then read it.
- Do not defer mandatory skill loads until mid-phase.
```

- **Risk**: LOW

### PI-041-2: Make lifecycle closure sequencing unambiguous in DevOps Stage 1

- **Source**: Retrospective 040 P2 finding (`LIFECYCLE-CLOSE-IN-COMMIT`)
- **Current state**:
  - DevOps instructs: `6. Commit locally ...` then `8. Close committed documents ...`
  - Later it separately says `After successful commit (Stage 1 completion): Update Status to "Committed"...`
- **Conflict**:
  - The current wording creates a logical inconsistency: if docs are closed only *after* the commit, those doc moves cannot be part of the Stage 1 commit.
  - This is exactly what happened in Plan 039.
- **Impact if unchanged**: Continued orphan-sweep commits and fractured release history.
- **Affected agents**: DevOps
- **Proposed resolution**:
  - Rewrite Stage 1 sequencing so the deployment doc and lifecycle status updates are prepared before the final staging/commit step whenever DevOps is doing the Stage 1 commit.
  - Preserve the existing exception for pre-existing orphan cleanup: if the workspace already contains unrelated orphaned docs, keep that as a separate docs-only commit.
- **Implementation template**:

```md
### Stage 1 closure sequencing (MANDATORY)

For the plan currently being committed:
- Prepare the Stage 1 deployment doc before the final `git add` / `git commit` step.
- Update lifecycle statuses and move the plan's docs to `closed/` before the final staged-set verification.
- Verify the staged set includes the plan changes, the deployment doc, and the lifecycle doc moves for that same plan.
- Exception: if you discover unrelated orphaned documents from older plans, keep those in a separate docs-only commit.
```

- **Risk**: MEDIUM
- **Rationale for MEDIUM**: This changes the order of operations in a critical release phase. It is still low-complexity, but it affects how DevOps stages commits.

### PI-041-3: Upgrade timestamp discipline from guidance to operational rule

- **Source**: Retrospective 040 P2 finding (`TIMESTAMP-DISCIPLINE`)
- **Current state**:
  - Critic, UAT, and DevOps all say `Use UTC and ISO-8601` as `SHOULD` guidance.
- **Gap**:
  - The instructions say *format*, but not *capture behavior*.
  - There is no rule to take the actual UTC time at phase start, and no monotonic sanity check before finalizing the doc.
- **Alignment**: Strong. This improves auditability without changing quality gates.
- **Affected agents**: Critic, UAT, DevOps
- **Proposed change**:
  - Add a mandatory timestamp discipline subsection: capture actual UTC timestamp at phase start, use actual event time for each status transition, and mark approximate times explicitly if backfilled.
- **Implementation template**:

```md
### Timestamp Discipline (MANDATORY)

- At phase start, capture the current UTC time and use it as the initial changelog/timeline entry.
- For each later status transition, record the actual event time in UTC ISO-8601 (`YYYY-MM-DDTHH:MMZ`).
- Do not estimate or copy-forward prior timestamps without marking them `approx.`.
- Before finalizing the document, sanity-check that timestamps are chronologically consistent with the documented handoff order.
```

- **Risk**: LOW

### PI-041-4: Require forward-tracking for deferred UAT risks

- **Source**: Retrospective 040 P3 finding (`UAT-DEFERRED-RISK`)
- **Current state**:
  - UAT says to `State residual risks or unverified items explicitly`.
  - UAT has mandatory owner/trigger handling only for some special cases (manual mobile validation, performance timing deferrals).
  - DevOps already has an `open-actions` tracker rule when the plan or UAT report includes deferred post-deploy validation.
- **Gap**:
  - Generic non-blocking residual risks can still be documented without owner, trigger, evidence-to-close, or next-plan recommendation.
  - DevOps can only create a tracker reliably if the UAT report uses explicit deferred structure.
- **Affected agents**: UAT (primary), DevOps (secondary clarification)
- **Proposed change**:
  - Add a mandatory `Deferred Follow-ups` rule to UAT for any residual risk carried post-release.
  - Clarify in DevOps that a UAT residual risk labeled `deferred`, `post-release`, or `follow-up required` triggers the open-actions tracker.
- **Implementation template**:

```md
### Deferred Follow-ups (MANDATORY when applicable)

If UAT approves release with any non-blocking residual risk, you MUST record:
- owner
- trigger/due window
- evidence required to close
- recommended next-plan or tracker destination

If this is not recorded, do not describe the item as merely "post-release" or "future work".
```

- **Risk**: LOW

### PI-041-5: Dependabot findings should create a security plan, not an instruction rule

- **Source**: Retrospective 040 P3 finding (`DEPENDABOT`)
- **Current state**:
  - DevOps already has a Stage 2 security audit evidence gate.
- **Conflict / scope issue**:
  - Converting repository-specific vulnerabilities into standing agent-instruction text would be one-off technical policy, not process improvement.
- **Proposed resolution**:
  - Reject as an instruction update.
  - Recommend a dedicated security/maintenance plan owned by Planning/Security.
- **Affected agents**: None for instruction update
- **Risk**: LOW

## Conflict Analysis

| Recommendation | Conflicting instruction | Nature of conflict | Impact if implemented naively | Proposed resolution | Resolved status |
|---|---|---|---|---|---|
| PI-041-1 | DevOps dynamic skill loading says to read skills when referenced, but not as a phase-start batch | Workflow bottleneck / ambiguity | Agents may continue loading mandatory skills mid-phase | Add explicit first-action preflight wording | ✅ |
| PI-041-2 | DevOps Stage 1 currently places `Commit locally` before `Close committed documents` and separately says `After successful commit` update statuses | Logical inconsistency | Same-plan lifecycle closure cannot land in the same Stage 1 commit | Reorder sequencing; keep unrelated orphan cleanup separate | ✅ |
| PI-041-3 | Critic/UAT/DevOps only say timestamps `SHOULD` use UTC ISO-8601 | Quality gate gap | Format remains correct but chronology remains unreliable | Add mandatory capture + sanity-check rule | ✅ |
| PI-041-4 | UAT says to state residual risks; DevOps expects deferred tracker when applicable | Cross-agent mismatch | Residual risk can be visible in UAT but invisible to DevOps tracker creation | Add structured deferred-follow-up block in UAT and broaden DevOps trigger wording | ✅ |
| PI-041-5 | None | Scope creep risk | Agent files become issue-specific instead of process-specific | Handle via dedicated security plan, not instruction edits | ✅ |

## Logical Challenges

### Challenge 1: Do not over-correct skill-path handling into universal search overhead

- **Issue**: A blanket requirement to always search before every skill read would slow simple flows.
- **Affected recommendations**: PI-041-1
- **Clarification needed**: Search should be a fallback, not a mandatory first step for known canonical paths.
- **Proposed solution**: Prefer known `.github/skills/<name>/SKILL.md` paths for UFlow skills. Only resolve first when the path is uncertain or inherited from potentially stale context.

### Challenge 2: Preserve clean commit boundaries while still closing docs in Stage 1

- **Issue**: Requiring all doc moves in the same commit can conflict with the existing orphan-cleanup rule.
- **Affected recommendations**: PI-041-2
- **Clarification needed**: Same-plan lifecycle closure and unrelated orphan cleanup are different categories.
- **Proposed solution**: Require same-plan closure in the current Stage 1 commit, but keep unrelated historical cleanup in a separate docs-only commit.

### Challenge 3: Timestamp discipline must stay lightweight

- **Issue**: If timestamp capture feels heavy, agents will drift back to approximate times.
- **Affected recommendations**: PI-041-3
- **Clarification needed**: The rule should require one real capture at phase start plus real transition times, not constant clock logging.
- **Proposed solution**: Keep the rule minimal: one capture at phase start, one per status transition, one final chronology sanity check.

## Risk Assessment

| Recommendation | Risk level | Rationale | Mitigation |
|---|---|---|---|
| PI-041-1 | LOW | Additive wording only; reduces repeated failures | Scope to mandatory skills and uncertain paths |
| PI-041-2 | MEDIUM | Reorders a critical DevOps sequence | Keep change narrow; preserve orphan-cleanup exception |
| PI-041-3 | LOW | Documentation hygiene only | Use a short operational checklist |
| PI-041-4 | LOW | Documentation structure only | Reuse existing owner/trigger/evidence pattern already present in UAT special cases |
| PI-041-5 | LOW | Explicit rejection avoids agent-instruction bloat | Route to Planner/Security instead |

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

- **PI-041-1**: Update `.github/agents/devops.agent.md` to add a mandatory phase-start skill preflight and path-resolution fallback.
- **PI-041-3**: Update `.github/agents/devops.agent.md`, `.github/agents/critic.agent.md`, and `.github/agents/uat.agent.md` to make timestamp capture and chronology sanity checks mandatory.
- **PI-041-4**: Update `.github/agents/uat.agent.md` and `.github/agents/devops.agent.md` to turn deferred residual risks into structured follow-ups.

### Medium-Impact or Medium-Risk

- **PI-041-2**: Update `.github/agents/devops.agent.md` to make same-plan lifecycle closure part of Stage 1 commit preparation instead of a post-commit activity.

### Low-Impact or High-Risk (defer)

- **PI-041-5**: Do not edit agent instructions. Create or request a security maintenance plan instead.

## Suggested Agent Instruction Updates

### Files to update

- `.github/agents/devops.agent.md`
- `.github/agents/critic.agent.md`
- `.github/agents/uat.agent.md`

### Implementation approach options

| Option | Scope | Pros | Cons | Recommendation |
|---|---|---|---|---|
| A | DevOps only | Fastest | Misses timestamp and deferred-risk gaps in Critic/UAT | Reject |
| B | DevOps + UAT only | Fixes release and tracker gaps | Leaves timestamp reliability under-enforced in Critic | Reject |
| C | DevOps + Critic + UAT | Matches retrospective and user gate exactly | Slightly larger instruction diff | **Recommended** |
| D | Wider sweep across all agents | Maximum consistency | Unnecessary blast radius for one retrospective | Defer |

### Validation plan

- Confirm DevOps instructions now require mandatory skill loads before git work.
- Confirm DevOps Stage 1 ordering now allows same-plan lifecycle closure in the plan’s Stage 1 commit.
- Confirm Critic/UAT/DevOps all use the same timestamp rule text.
- Confirm UAT now requires owner/trigger/evidence for any deferred residual risk.
- Confirm DevOps open-actions trigger language matches the new UAT deferred-risk structure.

## User Decision Required

1. **Update now**: Apply Option C to DevOps, Critic, and UAT instructions in one pass.
2. **Review first**: I’ll hold on edits and wait for your comments on this analysis.
3. **Phase rollout**: Update DevOps now; defer Critic/UAT until the next PI cycle.
4. **Defer**: Keep analysis only; no instruction changes this cycle.

## Related Artifacts

- Source retrospective: `agent-output/retrospectives/closed/040-v0.8.1-outreach-improvements-retrospective.md`
- New analysis: `agent-output/process-improvement/041-process-improvement-analysis.md`
- Affected instructions:
  - `.github/agents/devops.agent.md`
  - `.github/agents/critic.agent.md`
  - `.github/agents/uat.agent.md`
- Prior PI baseline:
  - `agent-output/process-improvement/038-process-improvement-analysis.md`

**Approval status**: Pending user approval. No agent instructions have been modified.
