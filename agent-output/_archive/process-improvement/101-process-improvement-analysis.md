---
ID: 101
Origin: 101
UUID: 3f8a2c7d
Status: Active
---

# Process Improvement Analysis 101: Wo Location Default + City Results Retrospective

**Source Retrospective**: `agent-output/retrospectives/101-wo-location-default-redesign-retrospective.md`
**Date**: 2026-04-25T05:30Z
**Analyst**: pi

---

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-25T05:30Z | pi | Created — initial analysis from Retrospective 101+102 |

---

## Executive Summary

- **Total recommendations extracted**: 5 (PI-1 through PI-5)
- **PI-4 status**: Already codified — `planner.agent.md` 5e (Version Pre-Flight) covers this exactly; no file change needed
- **Remaining changes**: 4 (PI-1, PI-2, PI-3, PI-5) across 3 agent instruction files
- **High-impact**: 1 (PI-3)
- **Medium-impact**: 2 (PI-1, PI-2)
- **Low-impact**: 1 (PI-5)
- **Files affected**: 3 agent instruction files (`uat.agent.md`, `qa.agent.md`, `implementer.agent.md`)
- **Overall risk**: LOW — all changes are additive; no existing instructions removed or contradicted
- **Recommendation**: Implement all four in a single pass (ordered by priority: PI-3 → PI-2 → PI-1 → PI-5)

**Root-cause pattern**: PI-1, PI-2, and PI-3 all trace to the same underlying gap — the idle state of accordion/typeahead components was not explicitly validated from a user-simulation perspective. PI-1 adds the UAT scenario trigger; PI-2 ensures the underlying tests can actually observe the idle state; PI-3 closes the cross-plan state semantic gap that caused the idle state to be broken in the first place.

---

## Changelog Pattern Analysis

### Documents Reviewed

| Document | Status at Review | Handoffs | Notable Issues |
|---|---|---|---|
| `planning/closed/101-search-location-default.md` | Released | 1 (clean) | Plan targeted v0.10.25 (already taken) — corrected at DevOps Stage 1 |
| `planning/closed/102-wo-city-results-redesign.md` | Released | 1 (clean) | Critique timestamps predate plan creation (session ordering artifact) |
| `critiques/closed/101-search-location-default-critique.md` | Resolved | 1 | F-MED-1 (state naming), F-MED-2 (hydration ambiguity) — both addressed inline |
| `critiques/closed/102-wo-city-results-redesign-critique.md` | Resolved | 1 | F-MED-1 (GROUP BY ambiguity), F-LOW-2 (type shape) — all addressed |
| `implementation/closed/101-search-location-default.md` | Released | 1 (clean) | State split implemented correctly; hydration useEffect pattern |
| `implementation/closed/102-wo-city-results-redesign.md` | Released | 1 (clean) | Plan 101 hydration not re-audited; woInputQuery=city retained from Plan 101 |
| `qa/closed/102-wo-ux-fixes.md` | Released | 1 | Post-UAT QA doc created as new file instead of re-test section |
| `deployment/v0.10.26-stage1.md` | Released | 2 stages | Clean; timestamp anomaly documented and accepted |

### Handoff Patterns

**12-handoff chain**: planner → critic → implementer → code-reviewer → qa → uat (Plan 101) → planner → critic → implementer → code-reviewer → qa → uat → [post-UAT loop: fix → qa → delta-CR] → devops

| Pattern | Frequency | Root Cause | Impact | Recommendation |
|---|---|---|---|---|
| Post-UAT rework loop | 1 (Plans 101+102) | Idle state (pre-selected value, no user typing) not in UAT checklist | +1 QA doc, +1 CR delta, ~20min delay | PI-1: Add idle-state scenario to UAT |
| ExpandSection mock masks idle bugs | 1 (Plan 102) | Mock renders children unconditionally regardless of isOpen | Post-UAT bugs invisible to tests | PI-2: Fix ExpandSection mock in QA checklist |
| Plan B broke Plan A state semantics | 1 (Plans 101→102) | Plan 102 implementer did not audit Plan 101 hydration mutations | woInputQuery=city conflicted with Plan 102 idle state | PI-3: Cross-plan state audit checklist |
| Plan version pre-check absent | 1 (Plan 101) | Planner specified v0.10.25 (already tagged) | Minor correction at DevOps Stage 1 | PI-4: Already codified in 5e — no action |
| Separate QA doc for post-UAT fixes | 1 (Plan 102) | No protocol for re-test sections in existing QA docs | Fragmented audit trail | PI-5: Add re-test section pattern to QA |

### Efficiency Metrics

| Metric | Value |
|---|---|
| Total post-UAT rework handoffs | 3 (fix + QA re-run + delta CR) |
| Time cost of post-UAT rework | ~20 min |
| Root cause of all 3 post-UAT bugs | Same: idle-state (pre-selected value, no typing) |
| Tests passing despite idle-state bug | Yes — ExpandSection mock unconditionally renders children |
| Version collision correction time | <5 min at DevOps Stage 1 |
| PI-4 already codified? | Yes — planner.agent.md 5e added in retrospective 070 |

---

## Recommendation Analysis

### PI-1 (MEDIUM): Accordion / Typeahead Idle-State Scenarios — UAT

**Source**: Retrospective 101+102, "Agent Collaboration Gaps — UAT did not simulate idle state with pre-selected city"

**Current state**: `uat.agent.md` has conditional scenario sections (Focus/Scroll, CSS/Layout, Performance Timing, Admin Runtime, Removed Capability). None address the idle state of accordion or typeahead components with a pre-selected value.

**Proposed change**: Add `### Accordion / Typeahead Idle-State Scenarios (WHEN APPLICABLE)` to `uat.agent.md` after the existing `### Focus/Scroll Side-Effects Scenarios` section (line 133).

**Affected agents**: UAT

**Conflict analysis**: None. This is purely additive after an existing conditional section.

**Risk**: LOW — conditional (WHEN APPLICABLE) so it only triggers for relevant plans.

**Implementation template**:

```markdown
### Accordion / Typeahead Idle-State Scenarios (WHEN APPLICABLE)

**Trigger**: When the plan adds or modifies an accordion, typeahead, or controlled-open component that can have a pre-selected or pre-filled value (e.g., from onboarding data, localStorage, URL params, or a prior plan's state).

UAT MUST include an **idle-state scenario** that covers:

1. **Page load with pre-selected value** — Open the accordion/control WITHOUT typing. Verify:
   - The pre-selected value is visually displayed (not empty, not showing a hardcoded default label)
   - Idle content renders correctly (e.g., popular cities, recent searches, or the selection row)
   - The collapsed header shows the dynamic selection (not a hardcoded placeholder)

2. **No-selection idle state** — Open the accordion/control with no prior selection. Verify:
   - Default idle content renders (e.g., popular items, empty state, or placeholder)
   - No stale selection from another session bleeds in

If manual validation is deferred (e.g., DF-N), UAT MUST document: owner, rationale, severity, and fallback execution path with a specific trigger window.

**Applies to**: Was, Wo, Wer, Filter, and any future accordion or typeahead component on `/search` and similar surfaces.
```

---

### PI-2 (MEDIUM): Accordion / Controlled-Open Mock Fidelity — QA

**Source**: Retrospective 101+102, "Quality Gate Failures — QA test for idle state used unconditional mock"

**Current state**: `qa.agent.md` has no guidance on accordion/controlled-open component mock fidelity. The Code Reviewer flagged the `ExpandSection` mock as INFO (unconditionally renders children regardless of `isOpen`), but QA has no instruction to audit this class of mock.

**Proposed change**: Add `### Accordion / Controlled-Open Mock Fidelity (WHEN APPLICABLE)` to `qa.agent.md` after the existing `### Focus/Scroll Side-Effects Checklist` section (line 75).

**Affected agents**: QA

**Conflict analysis**: None. Additive.

**Risk**: LOW — conditional, scoped to component mocks for controlled-open components.

**Implementation template**:

```markdown
### Accordion / Controlled-Open Mock Fidelity (WHEN APPLICABLE)

**Trigger**: When the plan adds or modifies a component that is rendered inside a controlled-open container (accordion, modal, collapsible, or any component with an `isOpen` / `open` / `expanded` prop that gates child visibility).

QA MUST audit whether the test mock for the container respects the `isOpen` prop:

**Failing pattern** (unconditional — masks idle-state bugs):
```tsx
vi.mock('@/components/ui/ExpandSection', () => ({
  ExpandSection: ({ title, children }) => <section><h3>{title}</h3><div>{children}</div></section>,
}));
```

**Correct pattern** (conditional — gates children on isOpen):
```tsx
vi.mock('@/components/ui/ExpandSection', () => ({
  ExpandSection: ({ title, isOpen, children }) => (
    <section>
      <h3>{title}</h3>
      {isOpen !== false && <div>{children}</div>}
    </section>
  ),
}));
```

**If the test uses the unconditional pattern**:
- Flag as QA finding (INFO/LOW) and document
- Add at least one test asserting that children are hidden when `isOpen=false`
- Tests that use the unconditional mock cannot validate idle-state correctness — record this as a coverage limitation explicitly

**Evidence to record**: State in the QA report which mock pattern is in use and whether idle-state (isOpen=false) coverage exists.
```

---

### PI-3 (HIGH): Multi-Plan State Extension Audit — Implementer

**Source**: Retrospective 101+102, "Misalignment Patterns — State coupling introduced during Plan 101 caused Plan 102 post-UAT bug"

**Current state**: `implementer.agent.md` has a `### Search/Filter Client-Interaction Trace (MANDATORY when applicable)` section at line 379. There is no equivalent for cross-plan state semantic compatibility.

**Proposed change**: Add `### Multi-Plan State Extension Audit (MANDATORY when applicable)` to `implementer.agent.md` after the existing `### Search/Filter Client-Interaction Trace` section (after line 404).

**Affected agents**: Implementer

**Conflict analysis**: None. Additive after an existing trace checklist.

**Risk**: LOW — conditional, applies only when a plan extends state from a prior plan.

**Implementation template**:

```markdown
### Multi-Plan State Extension Audit (MANDATORY when applicable)

**Trigger**: When the current plan extends, depends on, or builds on top of state introduced or modified by a **prior plan** — including state set in `useEffect` hooks, `useState` initializers, local storage hydration effects, or derived/computed state expressions.

Before starting implementation, read all `useEffect`, `useState`, and localStorage hydration code that was introduced or modified by prior plans in the same component or hook. For each state mutation from prior plans, explicitly verify:

1. **Semantic compatibility**: Does the current plan's new state semantics (e.g., new derived expressions, new idle/results/empty states) still work correctly when the prior plan's mutation runs? Example: if prior plan sets `someQuery = city` during hydration, and the current plan's idle state requires `someQuery = ''`, the mutation must be updated.

2. **Derived state review**: If the current plan introduces a new computed/derived expression (e.g., `displayQuery = selected ? '' : inputQuery`), verify every upstream mutation that affects the inputs to that expression.

3. **Idle-state compatibility**: If the current plan adds an idle state (i.e., a state where a value is selected but no user input has occurred), verify that prior plan initialization does not bypass the idle state by setting both "selected" and "input" state simultaneously.

**Evidence**: Record in the implementation doc:
```
Multi-Plan State Audit: Plan [prior IDs] mutations reviewed.
- [mutation line/file]: compatible ✅ / updated [description] ✅ / incompatible ⚠️ [description]
```

If the trigger does not apply, write: `Multi-Plan State Audit: N/A — no prior-plan state mutations in scope`.
```

---

### PI-4 (LOW): Planner Version Pre-Flight — Already Codified

**Source**: Retrospective 101+102, "Process Gap — Plan 101 targeted v0.10.25 (already taken)"

**Current state**: `planner.agent.md` section 5e already mandates:

> **5e. Version Pre-Flight (MANDATORY for any release/patch plan)**: Before committing to a specific version number, run:
> ```
> git fetch origin --tags
> git tag --list "v*" | sort -V | tail -5
> git show origin/main:package.json | grep '"version"'
> ```
> State the target version as: _"next available patch after current `origin/main` version; confirm at DevOps Stage 1"_

**Finding**: This exactly covers PI-4. The version pre-flight was codified previously (retrospective 070, PI-2). **No change required.** Document as already implemented.

---

### PI-5 (LOW): Post-UAT Fix Re-Test Section — QA

**Source**: Retrospective 101+102, "Workflow Bottlenecks — Separate QA doc for post-UAT fixes; fragmented audit trail"

**Current state**: `qa.agent.md` has no guidance on handling post-UAT minor fixes. When a plan's post-UAT fix requires re-testing, the current practice (in Plan 102) was to create a separate QA doc (`102-wo-ux-fixes.md`), which fragments the audit trail for a single plan.

**Proposed change**: Add `### Post-UAT Re-Test Section Pattern (WHEN APPLICABLE)` to `qa.agent.md` after the `### Accordion / Controlled-Open Mock Fidelity` section (which is being added by PI-2).

**Affected agents**: QA

**Conflict analysis**: None. Additive.

**Risk**: LOW — guidance only; does not change gate authority.

**Implementation template**:

```markdown
### Post-UAT Re-Test Section Pattern (WHEN APPLICABLE)

**Trigger**: When a post-UAT fix (code correction made after UAT approval, due to user-reported UX issues or delta-CR findings) requires QA re-validation of the **same plan** that already has a QA doc.

**PREFERRED approach**: Append a `## Re-test: [short description]` section to the **existing QA doc** for that plan, rather than creating a new QA document.

```markdown
## Re-test: [Short description of post-UAT fix]

**Date**: YYYY-MM-DDTHH:MMZ
**Trigger**: Post-UAT [issues list]
**Changed files**: [list]
**Changes**: [brief description]

### Re-test Gates

| Gate | Result | Evidence |
|---|---|---|
| npm run type-check | ✅ PASS | [output summary] |
| npm test | ✅ PASS | [N tests, 0 failures] |
| Delta lint | ✅ PASS | [evidence] |

### Re-test Verdict

[PASS / FAIL with rationale]
```

**Exception**: If the post-UAT fix is substantial enough to require a full strategy re-run (new feature scope, not just a UX correction), creating a new QA doc is appropriate. Record the reason for the new doc in the original QA doc's changelog.

**Benefits**: Single source of truth per plan; simpler audit trail; delta-CR can reference the re-test evidence in the same document.
```

---

## Conflict Analysis

| Recommendation | Conflict Type | Conflicting Instruction | Resolution |
|---|---|---|---|
| PI-1 | None | N/A | Purely additive |
| PI-2 | None | N/A | Purely additive |
| PI-3 | None | N/A | Purely additive; consistent with Search/Filter Trace pattern |
| PI-4 | Already codified | `planner.agent.md` 5e (identical requirement) | No change needed |
| PI-5 | None | N/A | Purely additive; exception clause prevents over-restriction |

---

## Risk Assessment

| Recommendation | Risk Level | Rationale | Mitigation |
|---|---|---|---|
| PI-1 (UAT idle-state) | LOW | WHEN APPLICABLE trigger; additive | Condition limits false triggers |
| PI-2 (QA mock fidelity) | LOW | WHEN APPLICABLE trigger; provides both patterns | Explicit exception clause for simple components |
| PI-3 (cross-plan state audit) | LOW | MANDATORY when applicable; N/A escape if no cross-plan state | N/A clause prevents over-application |
| PI-4 (version pre-flight) | N/A | Already codified | No change |
| PI-5 (re-test section) | LOW | Exception clause allows new doc for substantial changes | Exception prevents over-restriction |

---

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

**PI-3**: `implementer.agent.md` — Multi-Plan State Extension Audit
- Insert after `Search/Filter Client-Interaction Trace` section (after line 404)

### Medium-Impact, Low-Risk

**PI-2**: `qa.agent.md` — Accordion / Controlled-Open Mock Fidelity
- Insert after `Focus/Scroll Side-Effects Checklist` section (after line 83)

**PI-1**: `uat.agent.md` — Accordion / Typeahead Idle-State Scenarios
- Insert after `Focus/Scroll Side-Effects Scenarios` section (after line 143)

### Low-Impact, Low-Risk

**PI-5**: `qa.agent.md` — Post-UAT Re-Test Section Pattern
- Insert after the new PI-2 section

### Already Implemented

**PI-4**: `planner.agent.md` — version pre-flight already in 5e; no change

---

## Files to Update

| File | Recommendations | Insertion Point |
|---|---|---|
| `.github/agents/uat.agent.md` | PI-1 | After line 143 (after Focus/Scroll Scenarios section) |
| `.github/agents/qa.agent.md` | PI-2, PI-5 | PI-2: After line 83 (after Focus/Scroll Checklist); PI-5: After PI-2 block |
| `.github/agents/implementer.agent.md` | PI-3 | After line 404 (after Search/Filter Client-Interaction Trace section) |

---

## Related Artifacts

- Retrospective: `agent-output/retrospectives/101-wo-location-default-redesign-retrospective.md`
- Plan 101: `agent-output/planning/closed/101-search-location-default.md`
- Plan 102: `agent-output/planning/closed/102-wo-city-results-redesign.md`
- Agent Instructions:
  - `.github/agents/uat.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/implementer.agent.md`
  - `.github/agents/planner.agent.md` (PI-4: no change)
- Update Summary: `agent-output/process-improvement/101-agent-instruction-updates.md`
