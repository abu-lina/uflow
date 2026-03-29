---
ID: 064
Origin: 064
UUID: f3a9c2d7
Status: Implemented
---

# Process Improvement Analysis 064: Onboarding Centering Bundle Process Gaps

**Source Retrospective**: `agent-output/retrospectives/060-onboarding-centering-bundle-retrospective.md`
**Date**: 2026-03-29
**Scope**: Convert Retrospective 060 process lessons into conflict-checked workflow instructions covering state-machine scope coverage, deferred evidence quality, post-rebase release integrity, smoke testing discipline, and release-doc hygiene.

> **NO-MEMORY MODE**: Flowbaby retrieval/store tools are unavailable in this environment; proceeding artifact-first.

## Executive Summary

- **Recommendations analyzed**: 8 (R1–R8 from Retrospective 060)
- **Real instruction/workflow gaps confirmed**: 5 (R1, R2, R4, R6–R7)
- **Already substantially covered**: 2 (R3, R5) — minor strengthening only
- **Partially covered, worth strengthening**: 1 (R8)
- **Primary systemic issues**:
  - No analysis or planning instruction requires enumerating all state-machine branches before handoff. A state machine with 7 branches was treated as a 2-branch bug, producing an extra full plan cycle.
  - UAT deferred gate requirements are not scoped to reachable user-flow states. A gate requiring proof for an unreachable screen (waitlist form with feature-flagged default) blocked Stage 2 for nearly 11 hours.
  - DevOps has no post-rebase integrity checklist. After rebasing, merge markers in package files survived undetected until release-readiness revalidation.
  - Smoke tests do not mandate a fresh server instance. A stale local server on port 3000 produced a false 500 error at release time.
  - The deployment doc has no normalization step after release. The doc retained stale `Status: Active`, open blocker language, and "Remaining Work" sections after the release was complete.
  - Roadmap sync guidance in DevOps is a weak handoff step (step 4) without owner, deferment record, or timebox requirement.
- **Overall risk**: **LOW-MEDIUM**
- **Recommendation**: Implement all 6 changes now. They are additive rules against real demonstrated workflow gaps; no conflicts with existing instructions.

## Changelog Pattern Analysis

### Documents reviewed

- `agent-output/retrospectives/060-onboarding-centering-bundle-retrospective.md`
- `agent-output/planning/closed/067-splash-vertical-center.md`
- `agent-output/planning/closed/060-onboarding-remaining-state-centering.md`
- `agent-output/deployment/067-060-stage1-v0.9.8.md`
- `agent-output/qa/closed/060-onboarding-remaining-state-centering-qa.md`
- `agent-output/uat/closed/060-onboarding-remaining-state-centering-uat.md`
- `agent-output/implementation/closed/060-onboarding-remaining-state-centering.md`
- `agent-output/code-review/closed/060-onboarding-remaining-state-centering-code-review.md`
- `.github/agents/analyst.agent.md`
- `.github/agents/planner.agent.md`
- `.github/agents/uat.agent.md`
- `.github/agents/devops.agent.md`
- `agent-output/process-improvement/059-process-improvement-analysis.md`
- `agent-output/process-improvement/059-agent-instruction-updates.md`

### Handoff patterns

| Pattern | Frequency | Root cause | Impact | Recommendation |
|---|---:|---|---|---|
| State-machine bug scoped to a visible subset of states | 1 clear instance | Analysis and planning have no mandatory full-branch enumeration requirement | Extra full plan cycle (analysis → plan → impl → review → QA → UAT) | R1 |
| Deferred gate required evidence for unreachable screen | 1 clear instance | UAT gate wording named a theoretical state rather than the reachable live path | ~11h Stage 2 blocker resolved by user relaxation, not closure | R2 |
| Post-rebase merge markers survived release prep | 1 clear instance | No post-rebase artifact integrity check in DevOps instructions | JSON-corrupt version files detected late; required reactive cleanup | R4 |
| Stale local server produced false negative at smoke time | 1 clear instance | Smoke check does not specify fresh-instance discipline | Misleading 500 from old port 3000 vs passing fresh port 3004 | R6 |
| Deployment doc remained stale after release | 1 clear instance | No normalization step in Phase 2D post-release | Status: Active, open blocker text, stale remaining-work sections persisted | R7 |
| Roadmap not updated after v0.9.8 release | 1 clear instance (recurring) | Step 4 handoff to Roadmap is advisory without enforcement teeth | Repository roadmap remains stale, as in retrospectives 033 and 050 | R8 |

### Efficiency metrics

| Metric | Value | Observation |
|---|---:|---|
| Total handoffs | 14 substantive (including re-work cycle) | Two-plan loop was entirely process-caused |
| Extra full plan cycle cost | 5 phases | Analysis → plan → impl → review → QA → UAT redone for Plan 060 because Plan 067 missed 5 of 7 states |
| Stage 2 elapsed vs active time | ~11h elapsed / low active | Almost all elapsed time was gate resolution and release gating, not code work |
| Blocking issues during implementation | 0 | Technical delivery clean from first commit |
| Deployment doc churn (revisions) | High (10+ changelog entries) | Release artifact carried all coordination cost |

## Recommendation Analysis

### R1 — State-Machine Enumeration Gate

- **Source**: Retrospective 060, "Initial analysis did not enumerate all state-machine branches"
- **Current state**:
  - `analyst.agent.md`: has an "Invisible Interceptor Bug Heuristic" requiring full parent-chain tracing for hit-testing bugs, but no equivalent for conditional render/state-machine bugs.
  - `planner.agent.md`: has milestone dependency and scope guidelines, but no requirement to enumerate all state-machine branches when the bug is in a conditional-render path.
- **Proposed change**: Add a "State-Machine Bug Heuristic" block to `analyst.agent.md` (parallel to the existing Invisible Interceptor section) and a corresponding planner scope note.
- **Alignment**: Additive. No conflict with existing guidance.
- **Affected agents**: `analyst.agent.md`, `planner.agent.md`
- **Implementation template** (`analyst.agent.md`):

  > Add after "Invisible Interceptor Bug Heuristic" section:
  >
  > ```
  > ### State-Machine / Conditional-Render Bug Heuristic (WHEN APPLICABLE)
  >
  > For bugs inside a conditional render block (examples: state machine, AnimatePresence with N branches, tabbed UI, role-gated views), do not limit analysis to the branch currently visible to the reporter.
  >
  > **REQUIRED before handoff to Planner**:
  > 1. Enumerate every reachable branch/state in the component or state machine.
  > 2. Identify which branches were covered by the reported fix and which were not.
  > 3. Explicitly state in the analysis doc which branches are confirmed fixed, which are confirmed broken, and which are unverified.
  >
  > Do not present a partial-branch analysis as a complete RCA unless the unreachable branches are documented with an explicit rationale for exclusion.
  > ```

- **Implementation template** (`planner.agent.md`):

  > Add after "Plan Scope Guidelines" section header and overview text:
  >
  > ```
  > ### State-Machine Coverage Requirement (MANDATORY when applicable)
  >
  > If the plan fixes a bug inside a conditional render block (examples: AnimatePresence with N branches, state machine, tabbed UI, role-gated component), the plan MUST:
  > 1. Include a milestone that explicitly enumerates all state/branch paths in scope.
  > 2. State which paths are being fixed and which are explicitly confirmed not broken.
  > 3. NOT hand off to implementation without the full branch list settled — partial-branch implementation is allowed only when the remaining branches are confirmed unaffected by inspection.
  > ```

- **Risk**: LOW — pure addition; does not limit existing scope guidance.

---

### R2 — Deferred Visual Gate: Reachable Path Scoping

- **Source**: Retrospective 060, "UAT deferred gate required evidence for unreachable screen"
- **Current state**:
  - `uat.agent.md` step 79 "Deferred Follow-ups (MANDATORY when applicable)" and the Design-Review UAT section require documenting deferred gates but say nothing about scoping gate requirements to the reachable live flow.
- **Proposed change**: Add a note to the Deferred Follow-ups section specifying that when a visual deferred gate is written, it MUST scope the required evidence to states actually reachable in the live user flow, and separately denominate unreachable states.
- **Alignment**: Additive to existing deferred documentation requirement.
- **Affected agents**: `uat.agent.md`
- **Implementation template** (`uat.agent.md`):

  > Add after the existing `### Deferred Follow-ups (MANDATORY when applicable)` block:
  >
  > ```
  > **Deferred visual gates: reachable-path scoping (MANDATORY when applicable)**
  >
  > When writing a deferred visual validation gate (DF-N), scope the required evidence to states that are **actually reachable in the current live user flow** (considering active feature flags, user state, and flow routing). Do not require proof for states that cannot be reached by the typical user path in the current deployment.
  >
  > If a state exists in the code but is not reachable in the live flow (examples: feature-flagged component, prerequisite user state not achievable during automated testing), record it separately:
  > - **Reachable states**: include in DF-N required evidence.
  > - **Unreachable states (with reason)**: note as "not in scope for DF-N — [reason]".
  >
  > This prevents a single unreachable screen from blocking an otherwise closed release gate.
  > ```

- **Risk**: LOW — strictly additive. Does not weaken any existing gate requirement.

---

### R3 — Stage 2 Remote Sync Preflight Order

- **Source**: Retrospective 060, "Stage 2 mixed evidence collection and remote-sync diagnosis"
- **Current state**: `.github/agents/devops.agent.md` step 8 (from PI-059) already says "Run `git fetch origin --prune --tags`, then confirm your branch is not behind `origin/main`. If behind, rebase/merge **before** the first Stage 2 push (default) and **before** tagging."
- **Assessment**: **ALREADY COVERED** by PI-059 R2. The hang issue was environment-specific (interactive fetch in non-interactive terminal), not a gap in instructions. No change required.

---

### R4 — Post-Rebase Release Artifact Integrity

- **Source**: Retrospective 060, "Post-rebase merge markers in package files survived release prep"
- **Current state**:
  - `devops.agent.md` step 8 describes rebase procedure and step 8c handles version collision, but neither step includes an explicit "after rebase, verify artifact integrity" gate.
  - Step "8c. Version collision" lists some post-rebase version steps but is only triggered by tag collision.
- **Proposed change**: Add a step 8e "Post-rebase integrity gate" that runs any time a rebase was performed, regardless of trigger.
- **Alignment**: Additive. No conflict with existing steps.
- **Affected agents**: `devops.agent.md`
- **Implementation template** (`devops.agent.md`):

  > Add after step 8d (Long-gap branch preflight) and before step 8c (Version collision), or as a new step 8e that always follows any rebase:
  >
  > ```
  > 8e. **Post-rebase artifact integrity gate (MANDATORY after any rebase)**:
  >
  > After completing a rebase (regardless of cause), before continuing to push or tag:
  > 1. **Reject conflict markers**: run `grep -r "<<<<<<< HEAD" package.json package-lock.json CHANGELOG.md` — any match is a blocker. Do NOT push until resolved.
  > 2. **JSON parse check**: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` and same for `package-lock.json`. Any parse error is a blocker.
  > 3. **Re-run build**: `npm run build` — confirm the build still exits 0 after the rebase.
  > 4. **Re-run audit**: `npm audit --audit-level=high` — confirm no new HIGH/CRITICAL vulnerabilities were introduced by updated dependencies in the rebased commits.
  >
  > Document all four checks in the Stage 2 readiness evidence block before proceeding to push/tag.
  > ```

- **Risk**: LOW — only triggers after a rebase is performed. No impact on releases that don't require rebase.

---

### R5 — Dev-Artifact Protection During Stage 2 Validation

- **Source**: Retrospective 060, "local browser/dev tooling removed tracked fallback asset multiple times during Stage 2"
- **Current state**: `devops.agent.md` step 5b already covers this for Stage 1 ("If `npm run dev` was running during the session, inspect `git status` for unexpected changes under `public/`").
- **Assessment**: **ALREADY COVERED** for Stage 1. The Stage 2 exposure was real but intermittent — the same restore instruction applies. A note referencing Stage 2 validation could help, but the instruction is already present. Minor clarification only: add "and again before any Stage 2 push" to the existing step 5b wording to make scope explicit.

---

### R6 — Fresh-Instance Smoke Rule

- **Source**: Retrospective 060, "Stale local server on port 3000 produced false 500 during smoke check"
- **Current state**: `devops.agent.md` step 3b says to run smoke checks (`/providers` and `/`), but does not specify which server instance to use or that stale instances should be avoided.
- **Proposed change**: Add a server-instance note to the functional smoke check step.
- **Alignment**: Additive. Does not change the smoke targets or pass criteria.
- **Affected agents**: `devops.agent.md`
- **Implementation template** (`devops.agent.md`):

  > Extend step 3b "Functional Smoke Tests" with:
  >
  > ```
  > **Smoke server instance discipline**: If running smoke checks against a local dev server:
  > - Prefer a **fresh server instance** started from the current HEAD (not a server that was running continuously throughout the session).
  > - If you use an existing server, explicitly confirm it is serving the latest committed code (e.g., was started after the final release commit).
  > - If an existing server returns unexpected errors (e.g., 500 on `/`), start a fresh instance before treating it as a release failure.
  > - Record which port/instance was used for smoke checks in the deployment doc.
  > ```

- **Risk**: LOW — purely clarifying guidance. Does not change pass/fail criteria.

---

### R7 — Post-Release Deployment Doc Normalization

- **Source**: Retrospective 060, "Deployment doc retained stale Status, open blocker text, and Remaining Work sections after release"
- **Current state**: Phase 2D of `devops.agent.md` says to update plan statuses to "Released" and record post-release metadata, but does not require normalizing the deployment document itself.
- **Proposed change**: Add a normalization step to Phase 2D.
- **Alignment**: Additive. Does not conflict with existing Phase 2D steps.
- **Affected agents**: `devops.agent.md`
- **Implementation template** (`devops.agent.md`):

  > Add as step 3e in Phase 2D post-release, after step 3d (Release hygiene orphan sweep):
  >
  > ```
  > 3e. **Deployment doc normalization (MANDATORY)**:
  >
  > After release is confirmed complete, normalize the main deployment doc:
  > - Update the frontmatter `Status:` field to `Released`.
  > - If the doc contains a "Remaining Work" or "Stage 2 Blockers" section left over from pre-release gating, update it to reflect the final resolution (e.g., "Cleared by release completion" or "Cleared by user gate relaxation on [date]").
  > - Ensure no open-language blocker text (e.g., "X is still required before push") survives unfalsified after the release is complete.
  > - This normalization may be part of the final release-record commit or a separate docs-only commit.
  > ```

- **Risk**: LOW — purely additive documentation hygiene step.

---

### R8 — Roadmap Sync Gate

- **Source**: Retrospective 060 + recurring pattern from Retrospectives 050 and 033
- **Current state**: `devops.agent.md` Phase 2D step 4 says "Hand off to Roadmap: Release complete, update tracker." This is weak — there is no owner, timebox, or deferment record requirement, and it has been reported as incomplete in three separate retrospectives.
- **Proposed change**: Strengthen step 4 to require either same-window update or named deferment.
- **Alignment**: Strengthens an existing rule. No conflict.
- **Affected agents**: `devops.agent.md`
- **Implementation template** (`devops.agent.md`):

  > Replace step 4 "Hand off to Roadmap: Release complete, update tracker." with:
  >
  > ```
  > 4. **Roadmap sync (MANDATORY in the same release window)**:
  >    Update the product roadmap (`agent-output/roadmap/product-roadmap.md`) with:
  >    - `Current Version` → new released version
  >    - Release table entry for the new version (date, plans, version)
  >    - Active release tracker → mark plans released
  >
  >    If roadmap sync cannot be completed in the same release window (e.g., token budget, session end), record an explicit named deferment in the deployment doc:
  >    - Deferred item: `ROADMAP-SYNC`
  >    - Owner: retrospective agent or next available session
  >    - Due: before next plan's Stage 1 commit
  >    - Evidence to close: `Current Version` field updated to `[released version]` in roadmap doc
  > ```

- **Risk**: LOW — direct enforcement of what step 4 already intends. Recurring failures justify explicit owner/deferment tracking.

---

## Conflict Analysis

| Recommendation | Conflicting instruction | Nature | Proposed resolution | Resolved? |
|---|---|---|---|---|
| R1 vs analyst scope constraint ("read-only on production code/config") | None | No conflict — enumeration is analysis-scope work, not code change | Additive | ✅ |
| R1 vs planner YAGNI/small scope guidance | None | No conflict — only adds enumeration obligation for conditional-render bugs, not scope expansion | Additive | ✅ |
| R2 vs UAT gate authority | None | Additive scoping note; does not reduce gate requirements for reachable states | Additive | ✅ |
| R4 vs devops step 8c version-collision (already has some post-rebase steps) | Step 8c is triggered only by tag collision; R4 step 8e triggers after any rebase | Non-overlapping triggers; complement each other | Position 8e after 8d, before 8c | ✅ |
| R6 vs existing smoke check | None | Clarifying addition; same pass criteria | Additive | ✅ |
| R7 vs Phase 2D structure | None | New step 3e does not conflict with 3b–3d | Position after 3d | ✅ |
| R8 vs current step 4 wording | Current step 4 is being replaced, not augmented | Content-compatible, strength increase | Replace | ✅ |

No unresolvable conflicts found. All 6 changes are low-risk, additive, or strengthening.

## Logical Challenges

| Challenge | Recommendation | Proposed solution |
|---|---|---|
| Step 8e positions after 8d but before 8c (numbered order) | R4 | Number as 8e in list order; clarify trigger: "MANDATORY after any rebase" vs 8c "IF target tag already exists" |
| R2 "unreachable state" definition is subjective | R2 | Scope the definition: unreachable = not reachable by a fresh-user flow with current production feature-flag defaults. This is observable from code. |

## Risk Assessment

| Recommendation | Risk level | Rationale | Mitigation |
|---|---|---|---|
| R1 — State-Machine Enumeration Gate | LOW | Additive rule; does not increase implementation cost, only analysis completeness | Scope heuristic to conditional-render/state-machine bugs specifically |
| R2 — Deferred Gate Reachable Scoping | LOW | Additive note; existing gates for reachable states unchanged | Optional exception language keeps it from over-constraining edge cases |
| R4 — Post-Rebase Integrity Gate | LOW | Runs only after rebase; 4 explicit checks are fast (<2 min) | Clean repos will pass all 4 checks immediately |
| R6 — Fresh Smoke Instance | LOW | Clarifying note; does not change pass criteria | Clear "prefer fresh" framing without hard-blocking on existing server |
| R7 — Deployment Doc Normalization | LOW | Pure docs hygiene; does not affect release execution | Can be part of the final release-record commit |
| R8 — Roadmap Sync Enforcement | LOW | Replaces advisory step with enforceable rule; recurring 3-retrospective gap | Explicit deferment path prevents audit log failure if session ends |

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

1. **R1** — State-Machine Enumeration Gate in `analyst.agent.md` + `planner.agent.md`
2. **R4** — Post-Rebase Integrity Gate in `devops.agent.md`

### Medium-Impact, Low-Risk (implement together)

3. **R2** — Deferred Visual Gate reachable-path scoping in `uat.agent.md`
4. **R8** — Roadmap Sync enforcement in `devops.agent.md`

### Low-Impact, Low-Risk (implement with the above)

5. **R6** — Fresh Smoke Instance in `devops.agent.md`
6. **R7** — Deployment Doc Normalization in `devops.agent.md`

### Already Covered (no change needed)

- **R3** — Remote Sync Preflight: covered by PI-059 R2 (devops step 8)
- **R5** — Dev-Artifact Protection: covered by devops step 5b; scope extends implicitly to Stage 2

## Suggested Agent Instruction Updates

### Files to update

| File | Changes |
|---|---|
| `.github/agents/analyst.agent.md` | Add "State-Machine / Conditional-Render Bug Heuristic" section |
| `.github/agents/planner.agent.md` | Add "State-Machine Coverage Requirement" |
| `.github/agents/uat.agent.md` | Add "Deferred visual gates: reachable-path scoping" note |
| `.github/agents/devops.agent.md` | Add step 8e (post-rebase integrity), extend step 3b (fresh smoke), add step 3e (deployment doc normalization), replace step 4 (roadmap sync enforcement) |

### Validation plan

- Next state-machine UI bug should show "all branches enumerated" in the analysis handoff.
- Next deferred visual gate should show a "reachable states" / "unreachable states" breakdown.
- Next rebase during release should show the 4-check post-rebase gate in the readiness evidence.
- Next release should show either a same-window roadmap update or an explicit named deferment record in the deployment doc.
- Deployment doc Status should read `Released` immediately after release, not remain `Active`.

## User Decision Required

**Option A** — Implement all 6 changes now (R1, R2, R4, R6, R7, R8).
**Option B** — Implement high-impact items only (R1, R4) now; schedule rest for next PI cycle.
**Option C** — Review recommendations further before implementing anything.
**Option D** — Defer all changes to next PI cycle.

## Related Artifacts

| Artifact | Path |
|---|---|
| Source retrospective | `agent-output/retrospectives/060-onboarding-centering-bundle-retrospective.md` |
| Source plan 060 | `agent-output/planning/closed/060-onboarding-remaining-state-centering.md` |
| Source plan 067 | `agent-output/planning/closed/067-splash-vertical-center.md` |
| Deployment record | `agent-output/deployment/067-060-stage1-v0.9.8.md` |
| Prior PI covering release-state gaps | `agent-output/process-improvement/059-process-improvement-analysis.md` |
| Analyst agent | `.github/agents/analyst.agent.md` |
| Planner agent | `.github/agents/planner.agent.md` |
| UAT agent | `.github/agents/uat.agent.md` |
| DevOps agent | `.github/agents/devops.agent.md` |
