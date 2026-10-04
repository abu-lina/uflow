---
ID: 059
Origin: 059
UUID: 6f5d2b19
Status: Implemented
---

# Process Improvement Analysis 059: Remove Legacy Admin Panel

**Source Retrospective**: `agent-output/retrospectives/closed/054-remove-admin-panel-retrospective.md`
**Date**: 2026-03-24
**Scope**: Convert Retrospective 054 recommendations into scoped, conflict-checked agent-instruction updates, separating true instruction gaps from recommendations already covered by prior process-improvement work.

> **NO-MEMORY MODE**: Flowbaby retrieval/store tools are unavailable in this environment; proceeding artifact-first.

## Executive Summary

- **Recommendations analyzed**: 6
- **Validated as instruction gaps**: 3
- **Already covered or substantially covered**: 3
- **Overall risk**: **LOW-MEDIUM**
- **Recommendation**: Implement the three narrow gap fixes now:
  - removal-surface enumeration at planning time
  - removal-surface validation at QA/UAT time
  - deleted-module residue sweeps during review/QA

The retrospective surfaced real workflow failures, but several proposed remedies were already added by prior PI work. Reapplying them would duplicate existing rules without improving execution. The remaining gaps are all about deletion completeness: knowing every user-visible surface that points at a removed feature, validating those surfaces at runtime, and sweeping obsolete tests/imports that still reference deleted modules.

---

## Changelog Pattern Analysis

### Documents Reviewed

- `agent-output/retrospectives/closed/054-remove-admin-panel-retrospective.md`
- `agent-output/implementation/closed/054-remove-admin-panel-impl.md`
- `agent-output/code-review/closed/054-remove-admin-panel-code-review.md`
- `agent-output/qa/closed/054-remove-admin-panel-qa.md`
- `agent-output/uat/closed/054-remove-admin-panel-uat.md`
- `agent-output/deployment/closed/v0.8.24.md`
- `agent-output/roadmap/product-roadmap.md`
- Current agent instructions:
  - `.github/agents/planner.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/uat.agent.md`
  - `.github/agents/code-reviewer.agent.md`
  - `.github/agents/devops.agent.md`
  - `.github/agents/roadmap.agent.md`
- Prior PI overlap checks:
  - `agent-output/process-improvement/closed/058-process-improvement-analysis.md`
  - `agent-output/process-improvement/056-process-improvement-analysis.md`
  - `agent-output/process-improvement/050-process-improvement-analysis.md`

### Handoff Patterns

| Pattern | Frequency | Root Cause | Impact | Recommendation |
| --- | ---: | --- | --- | --- |
| Feature removed structurally but surviving UI entry points remained | 1 clear instance | No explicit removal-surface inventory in plan or validation gates | User found stale Admin Panel links after release | R1, R2 |
| QA/UAT relied on artifact completeness more than rendered discoverability surfaces | 1 clear instance | Validation centered on route/API deletion and policy preservation | Release approved before desktop/mobile menu cleanup | R2 |
| Deleted legacy modules left behind obsolete tests/imports | 1 clear instance | No mandatory residue sweep tied to file deletion | `tsc --noEmit` failed during follow-up validation | R3 |
| Timestamp inconsistency in deployment chain | 1 clear instance | Manual timestamp handling | Auditability weakened, but not release correctness | Covered already |
| Roadmap current-version field lagged release state | 1 clear instance | Workflow had not yet completed Roadmap phase and release tracking relies on follow-through | State drift in docs | Covered already |
| UAT suggested outdated version before DevOps tag check | 1 historical class, not unique here | Version authority belonged to DevOps | Doc churn risk | Covered already |

### Efficiency Metrics

| Metric | Value | Notes |
| --- | ---: | --- |
| Total major phases completed | 7 | Architecture, Implementation, Code Review, QA, UAT, DevOps, Retrospective |
| Post-release fix loops | 1 | Menu removal + obsolete test cleanup |
| User-visible misses after UAT | 2 | Desktop header and mobile profile surfaces |
| Obsolete test files found after release | 2 | Both referenced removed admin modules |
| Recommendations already implemented by prior PI work | 3 | Version discipline, timestamp sanity, roadmap/version authority |

---

## Recommendation Analysis

### R1: Removal-Surface Enumeration Gate

**Source**: Retrospective findings on missed `Header` and `MobileProfileScreen` entry points
**Priority**: HIGH IMPACT, LOW RISK

**Current state**:
- Planner has strong version discipline and actionability guidance, but no deletion-specific checklist for user-visible surface inventory.
- The Plan 054 chain had architecture and implementation artifacts but no explicit planning artifact that enumerated runtime entry points for the removed feature.

**Observed gap**:
Removing a feature is not complete when routes/APIs are deleted if surviving menus, shortcuts, manifests, debug links, deep links, or mobile surfaces still expose it. Current planning guidance does not force that inventory.

**Proposed change**:
Add a conditional Planner checklist for feature removals/deprecations that affect user-visible or privileged surfaces.

**Affected agents**:
- `.github/agents/planner.agent.md`

**Alignment**:
Fits the existing `MANDATORY when applicable` pattern and keeps scope narrow: only removal/deprecation work that affects user discovery surfaces.

**Risk**: LOW

**Implementation template**:

```markdown
### Removal Surface Enumeration (MANDATORY when applicable)

If a plan removes, deprecates, or hides a user-visible capability, route, or privileged workflow, the plan MUST enumerate all known discovery and entry surfaces for that capability, including when applicable:
- direct routes/pages
- desktop/mobile navigation
- profile/account menus
- manifest/PWA shortcuts
- debug/dev-only links
- deep links or redirects
- automated tests/imports tied to the removed modules

For each surface, state one of:
- removed in this plan
- intentionally retained with rationale
- out of scope with owner and follow-up plan

Do not treat route deletion alone as proof that the feature is no longer discoverable.
```

---

### R2: Removal-Surface Validation Gate

**Source**: Retrospective findings that QA/UAT approved release while stale menu entry points remained
**Priority**: HIGH IMPACT, LOW RISK

**Current state**:
- QA already emphasizes user-facing validation and real scenarios.
- UAT already has conditional runtime gates for admin/RLS flows and other special cases.
- Neither QA nor UAT has a dedicated gate for validating that removed user-visible functionality is no longer discoverable through actual rendered surfaces.

**Observed gap**:
Deletion work passed structural checks but not rendered discoverability checks. This is distinct from admin-runtime validation: the failure was not role logic, it was leftover navigation.

**Proposed change**:
Add a conditional removal-validation gate to both QA and UAT. QA should execute the technical smoke checks; UAT should refuse unconditional release approval if removed functionality remains discoverable in primary user surfaces.

**Affected agents**:
- `.github/agents/qa.agent.md`
- `.github/agents/uat.agent.md`

**Alignment**:
Consistent with both agents' existing conditional-gate structure. This does not require E2E infrastructure; it requires explicit evidence of surface checks.

**Risk**: LOW

**Implementation template — QA**:

```markdown
### Removal Surface Validation (MANDATORY when applicable)

If the change removes, deprecates, or hides a user-visible capability, QA MUST validate that the capability is no longer discoverable through the primary rendered surfaces listed in the plan.

Minimum checks:
- verify each enumerated navigation/shortcut/debug surface is removed, redirected, or intentionally retained as documented
- verify desktop and mobile variants when both exist
- verify any replacement flow still exposes the intended value without the removed entry point
- document the exact surfaces checked and the evidence used

If a listed surface cannot be validated, record it as DEFERRED with owner, risk, and closure evidence.
```

**Implementation template — UAT**:

```markdown
### Removed Capability Discoverability Gate (MANDATORY when applicable)

If the release removes or hides a user-visible capability, UAT MUST NOT issue an unqualified "APPROVED FOR RELEASE" unless there is evidence that the capability is no longer discoverable in the primary user-facing surfaces identified by the plan/QA report.

Minimum evidence:
- QA lists the surfaces checked
- any still-visible entry point is either intentional and documented, or treated as a release-blocking discrepancy

If discoverability validation is incomplete, UAT must downgrade the decision to CONDITIONAL APPROVAL or REJECTED, with explicit next actions.
```

---

### R3: Deleted-Module Residue Sweep

**Source**: Retrospective findings that obsolete tests referencing deleted admin modules survived until post-release validation
**Priority**: MEDIUM IMPACT, LOW RISK

**Current state**:
- Code Reviewer already checks shared-list actionability and constraint-sensitive findings.
- QA already audits tests skeptically and runs technical gates.
- No instruction explicitly says that when files/modules are deleted, the chain must search for stale imports/tests/fixtures/docs that still reference those deleted paths.

**Observed gap**:
A feature-removal change can be logically correct yet still leave the repository broken because deleted modules remain referenced by tests or support files.

**Proposed change**:
Add a narrow deleted-module residue sweep to Code Reviewer and QA, triggered only when implementation deletes or renames modules.

**Affected agents**:
- `.github/agents/code-reviewer.agent.md`
- `.github/agents/qa.agent.md`

**Alignment**:
This is a verification rule, not a style rule. It complements existing grep/search-based review behavior without duplicating general lint/test gates.

**Risk**: LOW

**Implementation template — Code Reviewer**:

```markdown
### Deleted-Module Residue Sweep (MANDATORY when applicable)

Trigger when the implementation deletes, renames, or fully replaces modules/files.

Review checklist:
- search for remaining imports or references to deleted paths/modules
- check tests, fixtures, mocks, scripts, manifests, and docs that commonly retain stale references
- if deleted modules were part of a user-visible feature, verify no obvious entry-point references remain in navigation or account/profile surfaces

If stale references remain, record at least a MEDIUM finding unless the plan explicitly documents them as intentional follow-up work.
```

**Implementation template — QA**:

```markdown
### Deleted-Module Residue Check (MANDATORY when applicable)

If the implementation deletes or renames modules, QA MUST verify that technical gates and structured searches do not reveal stale references to the removed modules.

Minimum evidence:
- note the key deleted paths/modules reviewed
- document the search terms used
- document whether stale references remained in tests, mocks, scripts, manifests, or docs

If residue remains, QA cannot classify the implementation as QA Complete.
```

---

### R4: Lightweight Plan Artifact Requirement For Privileged-Surface Removals

**Source**: Retrospective note that the chain lacked a dedicated planning artifact
**Priority**: MEDIUM IMPACT, HIGH RISK

**Current state**:
- The workflow strongly prefers planning, but the broader coding-agent defaults outside the orchestrated chain allow direct implementation for straightforward tasks.
- This case shows that even “simple deletion” work can hide meaningful user-facing scope.

**Assessment**:
This is a plausible improvement, but the recommendation is broader than the evidence. A blanket requirement for plans on every deletion/refactor would increase workflow overhead and could conflict with existing expectations for smaller tasks.

**Conflict check**:
There is tension with the repo’s pragmatic default that not every small task requires a full planning loop.

**Proposed resolution**:
Defer for now. If adopted later, scope it narrowly to removals that affect routes, auth/privileged surfaces, or cross-platform navigation.

**Recommendation**: DEFER — capture as a workflow consideration, not an immediate instruction change.

---

### R5: Deployment Timestamp Integrity

**Source**: Retrospective note on inconsistent Stage 1/Stage 2 timestamps
**Priority**: LOW — already covered

**Current state**:
- DevOps already includes `Chain timestamp sanity-check (MANDATORY)`.
- DevOps also includes mandatory timestamp-discipline rules.

**Assessment**:
The failure is execution drift, not a missing instruction. Re-adding another timestamp rule would duplicate PI-056 coverage.

**Recommendation**: DEFER — no instruction change needed.

---

### R6: Roadmap Sync Gate

**Source**: Retrospective note that roadmap current-version state lagged release state
**Priority**: LOW — already covered

**Current state**:
- Roadmap already owns release tracking and current working release state.
- DevOps already hands off to Roadmap after release.
- Orchestrator already includes the `⑬ Roadmap` phase.

**Assessment**:
This is primarily a workflow follow-through issue. The session had not yet completed the Roadmap phase, so stale roadmap state is not strong evidence of an instruction gap.

**Recommendation**: DEFER — no instruction change needed.

---

## Conflict Analysis

### C1: Removal-Surface Enumeration vs lightweight-plan pragmatism

**Recommendation**: R1
**Conflicting instruction**: Existing workflow norms allow direct implementation for simple tasks without forcing a planning artifact in every case.
**Nature of conflict**: Over-broad wording could turn all deletions into heavyweight planning work.
**Impact if implemented poorly**: Slower cycle time and unnecessary process overhead.
**Proposed resolution**: Trigger only when removing or hiding user-visible, privileged, routed, or multi-surface capabilities.
**Resolved**: ✅ Yes

### C2: UAT removal validation vs UAT "quick, high-level" framing

**Recommendation**: R2
**Conflicting instruction**: UAT is framed primarily as a quick value-delivery review.
**Nature of conflict**: Discoverability validation adds concrete evidence requirements.
**Impact if implemented poorly**: UAT could become a second QA pass on all work.
**Proposed resolution**: Keep the rule conditional and limited to removal/hide/deprecation work affecting user-visible capabilities.
**Resolved**: ✅ Yes

### C3: Deleted-module residue sweep vs role separation between review and QA

**Recommendation**: R3
**Conflicting instruction**: Code Reviewer should not become a full QA executor; QA should not become a style reviewer.
**Nature of conflict**: Residue sweeping could drift into unbounded repo cleanup.
**Impact if implemented poorly**: Review scope creep and inconsistent enforcement.
**Proposed resolution**: Limit the sweep to deleted/renamed modules in the current change and require only targeted searches plus gate outcome documentation.
**Resolved**: ✅ Yes

### C4: Mandatory plan artifact for privileged-surface removals vs pragmatic workflow defaults

**Recommendation**: R4
**Conflicting instruction**: Repo-level agent behavior defaults to implementation for straightforward requests unless planning is explicitly needed.
**Nature of conflict**: Could contradict fast-path execution norms.
**Impact if implemented**: Potential workflow bottleneck and user friction.
**Proposed resolution**: Defer pending more evidence or a narrower orchestrator-level rule.
**Resolved**: ⚠️ Deferred

---

## Logical Challenges

### Challenge 1: "Removed" does not mean "undiscoverable"

**Affected recommendations**: R1, R2
**Clarification needed**: A capability can be removed from its canonical route while still being visible through legacy menus, mobile-only UI, PWA shortcuts, or debug affordances.
**Proposed solution**: Define removal completeness around discoverability surfaces, not route deletion alone.

### Challenge 2: Runtime validation without mandating full browser automation

**Affected recommendations**: R2
**Clarification needed**: The gap is real, but a requirement for E2E tooling would be disproportionate.
**Proposed solution**: Require explicit evidence of surface checks, not a specific automation stack.

### Challenge 3: Residue sweeps can become unbounded cleanup

**Affected recommendations**: R3
**Clarification needed**: Deleted-module checks should not turn every removal into a repo-wide janitorial pass.
**Proposed solution**: Limit search scope to deleted/renamed modules in the current change and high-probability residue locations.

### Challenge 4: Missing plan artifact is a symptom, not always the root cause

**Affected recommendations**: R4
**Clarification needed**: The missed menu entries were caused more directly by incomplete surface enumeration than by the mere absence of a plan file.
**Proposed solution**: Prioritize R1-R3 first; defer any broader plan-artifact policy change.

---

## Risk Assessment

| Recommendation | Risk Level | Rationale | Mitigation |
| --- | --- | --- | --- |
| R1 Removal-Surface Enumeration | LOW | Narrow, additive checklist for removal/deprecation work only | Trigger only for user-visible, privileged, routed, or multi-surface removals |
| R2 Removal-Surface Validation | LOW | Extends existing QA/UAT conditional-gate pattern | Require evidence of checks, not specific automation tooling |
| R3 Deleted-Module Residue Sweep | LOW | Targeted search-based verification with clear trigger | Limit scope to deleted/renamed modules in current change |
| R4 Lightweight Plan Artifact Requirement | HIGH | Workflow-wide behavior change with limited evidence base | Defer or pilot only for privileged-surface removals |
| R5 Deployment Timestamp Integrity | LOW | Already covered by DevOps | No change |
| R6 Roadmap Sync Gate | LOW | Already covered by Roadmap/DevOps/Orchestrator | No change |

---

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

- R1: add removal-surface enumeration to Planner
- R2: add removal-surface validation to QA and UAT
- R3: add deleted-module residue sweeps to Code Reviewer and QA

### Medium-Impact or Medium-Risk

- None beyond the above once scoped narrowly

### Low-Impact or High-Risk (defer)

- R4: broader plan-artifact requirement for privileged-surface removals
- R5: additional timestamp rules
- R6: additional roadmap-sync rules

---

## Suggested Agent Instruction Updates

**Files likely to change if approved**:
- `.github/agents/planner.agent.md`
- `.github/agents/qa.agent.md`
- `.github/agents/uat.agent.md`
- `.github/agents/code-reviewer.agent.md`

**Files reviewed but not recommended for change**:
- `.github/agents/devops.agent.md`
- `.github/agents/roadmap.agent.md`
- `.github/agents/orchestrator.agent.md`

**Implementation approach options**:
- **Option A**: Apply only R1-R3 now as narrowly scoped conditional gates.
- **Option B**: Apply R1-R3 now and open a follow-up observation period before considering R4.
- **Option C**: Defer all changes and rely on existing instructions plus manual discipline.

**Validation plan if approved**:
- verify each updated agent file remains internally consistent with existing `MANDATORY when applicable` patterns
- confirm no duplicate or contradictory gate language is introduced
- update any mirrored generic-workflow agent exports if the repo requires parity
- create `059-agent-instruction-updates.md` summarizing exact edits and rationale

---

## User Decision Required

1. **Update now**: apply the narrow R1-R3 agent-instruction changes immediately
2. **Review exact diffs first**: I prepare the exact text changes before editing agent files
3. **Phase rollout**: apply Planner + QA/UAT now, defer Code Reviewer residue sweep
4. **Defer**: keep analysis only and revisit after another retrospective confirms the pattern

---

## Related Artifacts

- `agent-output/retrospectives/closed/054-remove-admin-panel-retrospective.md`
- `agent-output/implementation/closed/054-remove-admin-panel-impl.md`
- `agent-output/code-review/closed/054-remove-admin-panel-code-review.md`
- `agent-output/qa/closed/054-remove-admin-panel-qa.md`
- `agent-output/uat/closed/054-remove-admin-panel-uat.md`
- `agent-output/deployment/closed/v0.8.24.md`
- `.github/agents/planner.agent.md`
- `.github/agents/qa.agent.md`
- `.github/agents/uat.agent.md`
- `.github/agents/code-reviewer.agent.md`
- `.github/agents/devops.agent.md`
- `.github/agents/roadmap.agent.md`

---

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-03-24T14:20Z | ProcessImprovement | Analysis created; R1–R3 validated as instruction gaps; R4–R6 deferred |
| 2026-03-24T14:30Z | ProcessImprovement | Instruction updates applied; update summary created (`059-agent-instruction-updates.md`) |
