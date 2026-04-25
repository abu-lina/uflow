---
ID: 101
Origin: 101
UUID: 3f8a2c7d
Status: Active
---

# Agent Instruction Updates 101: Plans 101+102 Process Improvements (PI-1–PI-5)

**Source Analysis**: `agent-output/process-improvement/101-process-improvement-analysis.md`
**Source Retrospective**: `agent-output/retrospectives/101-wo-location-default-redesign-retrospective.md`
**Date**: 2026-04-25T05:30Z
**Implementer**: process-improvement

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-25T05:30Z | pi | Created — instruction updates for PI-1, PI-2, PI-3, PI-5 |

## Summary

4 recommendations from Retrospective 101+102 implemented across 3 agent instruction files. PI-4 was already codified as `planner.agent.md` 5e. All changes are additive — no existing rules removed or weakened.

## Files Updated

| File | Recommendations | Kind |
|---|---|---|
| `.github/agents/uat.agent.md` | PI-1 — Accordion / Typeahead Idle-State Scenarios | New conditional section after Focus/Scroll |
| `.github/agents/qa.agent.md` | PI-2 — Accordion / Controlled-Open Mock Fidelity | New conditional section after Focus/Scroll |
| `.github/agents/qa.agent.md` | PI-5 — Post-UAT Re-Test Section Pattern | New conditional section after PI-2 |
| `.github/agents/implementer.agent.md` | PI-3 — Multi-Plan State Extension Audit | New mandatory-when-applicable section after Search/Filter Trace |
| `.github/agents/planner.agent.md` | PI-4 | No change — already codified in 5e |

---

## Changes by Recommendation

### PI-1 — Accordion / Typeahead Idle-State Scenarios (`.github/agents/uat.agent.md`)

**Status**: ✅ Implemented

**Insertion point**: After line 141 (end of `### Focus/Scroll Side-Effects Scenarios` section); before `### Design-Review UAT for CSS/Layout-Only Changes`

**Before**: No guidance on idle-state scenarios for accordion/typeahead components with pre-selected values.

**After**: Added `### Accordion / Typeahead Idle-State Scenarios (WHEN APPLICABLE)` conditional section requiring UAT to include a page-load-with-pre-selected-value scenario and a no-selection idle-state scenario. Applies to Was, Wo, Wer, Filter, and future accordion/typeahead components.

**Text inserted** (insert between "...fallback execution path." and "### Design-Review UAT..."):

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

### PI-2 — Accordion / Controlled-Open Mock Fidelity (`.github/agents/qa.agent.md`)

**Status**: ✅ Implemented

**Insertion point**: After line 83 (end of `### Focus/Scroll Side-Effects Checklist` section); before `### CSS/Layout-Only Changes`

**Before**: No guidance on verifying whether accordion/controlled-open component mocks respect the `isOpen` prop. Unconditional mocks could mask idle-state bugs.

**After**: Added `### Accordion / Controlled-Open Mock Fidelity (WHEN APPLICABLE)` conditional section. QA must audit whether the mock gates children on `isOpen`. Provides before/after mock patterns and an explicit coverage limitation note.

**Text inserted** (insert between "...fallback execution path." and "### CSS/Layout-Only Changes..."):

```markdown

### Accordion / Controlled-Open Mock Fidelity (WHEN APPLICABLE)

**Trigger**: When the plan adds or modifies a component rendered inside a controlled-open container (accordion, modal, collapsible, or any component with an `isOpen` / `open` / `expanded` prop that gates child visibility).

QA MUST audit whether the test mock for the container respects the `isOpen` prop:

**Failing pattern** (unconditional — masks idle-state bugs):
\`\`\`tsx
vi.mock('@/components/ui/ExpandSection', () => ({
  ExpandSection: ({ title, children }) => <section><h3>{title}</h3><div>{children}</div></section>,
}));
\`\`\`

**Correct pattern** (conditional — gates children on isOpen):
\`\`\`tsx
vi.mock('@/components/ui/ExpandSection', () => ({
  ExpandSection: ({ title, isOpen, children }) => (
    <section>
      <h3>{title}</h3>
      {isOpen !== false && <div>{children}</div>}
    </section>
  ),
}));
\`\`\`

**If the test uses the unconditional pattern**:
- Flag as QA finding (INFO/LOW) and document
- Add at least one test asserting that children are hidden when `isOpen=false`
- Tests using the unconditional mock cannot validate idle-state correctness — record this as a coverage limitation explicitly

**Evidence to record**: State in the QA report which mock pattern is in use and whether idle-state (`isOpen=false`) coverage exists.

```

---

### PI-5 — Post-UAT Re-Test Section Pattern (`.github/agents/qa.agent.md`)

**Status**: ✅ Implemented

**Insertion point**: After PI-2 section; before `### CSS/Layout-Only Changes`

**Before**: No protocol for post-UAT minor QA re-validation. Practice in Plan 102 was to create a separate QA doc, fragmenting the audit trail.

**After**: Added `### Post-UAT Re-Test Section Pattern (WHEN APPLICABLE)` section directing QA to append a `## Re-test:` section to the existing QA doc rather than creating a new file. Includes exception clause for substantial scope changes.

**Text inserted** (insert after PI-2 section and before `### CSS/Layout-Only Changes`):

```markdown

### Post-UAT Re-Test Section Pattern (WHEN APPLICABLE)

**Trigger**: When a post-UAT fix (code correction made after UAT approval, due to user-reported UX issues or delta-CR findings) requires QA re-validation of the **same plan** that already has a QA doc.

**PREFERRED approach**: Append a `## Re-test: [short description]` section to the **existing QA doc** for that plan rather than creating a new QA document.

\`\`\`markdown
## Re-test: [Short description of post-UAT fix]

**Date**: YYYY-MM-DDTHH:MMZ
**Trigger**: Post-UAT [issue list]
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
\`\`\`

**Exception**: If the post-UAT fix is substantial enough to require a full strategy re-run (new feature scope, not just a UX correction), creating a new QA doc is appropriate. Record the reason for the new doc in the original QA doc's changelog.

**Benefits**: Single source of truth per plan; simpler audit trail; delta-CR can reference re-test evidence in the same document.

```

---

### PI-3 — Multi-Plan State Extension Audit (`.github/agents/implementer.agent.md`)

**Status**: ✅ Implemented

**Insertion point**: After line 404 (end of `### Search/Filter Client-Interaction Trace` section, after the "If the trigger does not apply..." line); before `### API Route Coverage Gate`

**Before**: No checklist for auditing semantic compatibility when Plan B extends Plan A's state model. The Search/Filter Trace covers URL/entity-type patterns but not cross-plan state coupling.

**After**: Added `### Multi-Plan State Extension Audit (MANDATORY when applicable)` section requiring implementers to review prior-plan state mutations for semantic compatibility when building on existing state. Includes evidence recording template and N/A escape clause.

**Text inserted** (insert between "...Search/Filter Client-Interaction Trace: N/A — [reason]`." and "### API Route Coverage Gate"):

```markdown

### Multi-Plan State Extension Audit (MANDATORY when applicable)

**Trigger**: When the current plan extends, depends on, or builds on top of state introduced or modified by a **prior plan** — including state set in `useEffect` hooks, `useState` initializers, localStorage hydration effects, or derived/computed state expressions.

Before starting implementation, read all `useEffect`, `useState`, and localStorage hydration code that was introduced or modified by prior plans in the same component or hook. For each state mutation from prior plans, explicitly verify:

1. **Semantic compatibility**: Does the current plan's new state semantics (e.g., new derived expressions, new idle/results/empty states) still work correctly when the prior plan's mutation runs? Example: if a prior plan sets `someQuery = city` during hydration and the current plan's idle state requires `someQuery = ''`, the mutation must be updated.

2. **Derived state review**: If the current plan introduces a new computed/derived expression (e.g., `displayQuery = selected ? '' : inputQuery`), verify every upstream mutation that affects the inputs to that expression.

3. **Idle-state compatibility**: If the current plan adds an idle state (i.e., a value is selected but no user input has occurred), verify that prior plan initialization does not bypass the idle state by setting both "selected" and "input" state simultaneously.

**Evidence**: Record in the implementation doc:
```
Multi-Plan State Audit: Plan [prior IDs] mutations reviewed.
- [mutation line/file]: compatible ✅ / updated [description] ✅ / incompatible ⚠️ [description]
```

If the trigger does not apply, write: `Multi-Plan State Audit: N/A — no prior-plan state mutations in scope`.

```

---

### PI-4 — Version Pre-Flight (`.github/agents/planner.agent.md`)

**Status**: ⏸️ Already codified — no change

**Finding**: Section 5e already mandates `git fetch origin --tags && git tag --list "v*" | sort -V | tail -5` before specifying a target version. This was added in retrospective 070 (PI-2). PI-4 is satisfied.

---

## Validation

| Check | Result |
|---|---|
| PI-1 (Accordion idle-state) present in uat.agent.md (after Focus/Scroll section) | ✅ Inserted |
| PI-2 (Mock fidelity) present in qa.agent.md (after Focus/Scroll section) | ✅ Inserted |
| PI-5 (Re-test pattern) present in qa.agent.md (after PI-2) | ✅ Inserted |
| PI-3 (Cross-plan state audit) present in implementer.agent.md (after Search/Filter Trace) | ✅ Inserted |
| PI-4 in planner.agent.md — already codified (5e) | ✅ Verified no change needed |
| No existing rules removed or weakened | ✅ All changes are additive |
| All sections include N/A or WHEN APPLICABLE escape clauses | ✅ Confirmed |
| QA gate authority preserved (PI-5) | ✅ Exception clause for substantial changes |

## Related Artifacts

- `agent-output/process-improvement/101-process-improvement-analysis.md`
- `agent-output/retrospectives/101-wo-location-default-redesign-retrospective.md`
- `.github/agents/uat.agent.md` (PI-1 added)
- `.github/agents/qa.agent.md` (PI-2, PI-5 added)
- `.github/agents/implementer.agent.md` (PI-3 added)
- `.github/agents/planner.agent.md` (PI-4: verified, no change)
