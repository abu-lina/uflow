## Implementation Doc Format

Required sections:

- Plan Reference
- Date
- Changelog table (date/handoff/request/summary example)
- Implementation Summary (what + how delivers value)
- Baseline & Measurements (WHEN APPLICABLE — see below)
- Milestones Completed checklist
- Files Modified table (path/changes/lines)
- Files Created table (path/purpose)
- Deployment Path Audit (WHEN APPLICABLE — see above)
- Code Quality Validation checklist (compilation/linter/tests/compatibility)
- Value Statement Validation (original + implementation delivers)
- **TDD Compliance Checklist** (MANDATORY — see below)
- Test Coverage (unit/integration)
- Test Execution Results (command/results/issues/coverage - NOT in QA docs)
- Outstanding Items (incomplete/issues/deferred/failures/missing coverage)
- Next Steps (QA then UAT)

### Baseline & Measurements (WHEN APPLICABLE)

If the plan includes any baseline/measurement milestone or measurable performance targets, your Implementation doc MUST include one of:

- **Baseline captured**: numbers + environment (local/UAT/prod-like) + command/tool used, OR
- **Baseline deferred**: explicit deferral with owner + when it will be measured + why it could not be captured now.

Silent drops are not allowed: if measurement work is not done, it must be explicitly deferred.

**Timestamp guidance (SHOULD)**:

- Use UTC and ISO-8601 when recording timestamps in the document (example: `2026-02-22T17:30Z`).

### TDD Compliance Checklist (MANDATORY)

**You MUST include this table in every implementation doc. Incomplete rows = incomplete implementation.**

```markdown
## TDD Compliance

| Function/Class      | Test File            | Test Written First? | Failure Verified? | Failure Reason      | Pass After Impl? |
| ------------------- | -------------------- | ------------------- | ----------------- | ------------------- | ---------------- |
| `calculate_total()` | `test_orders.py`     | ✅ Yes              | ✅ Yes            | ImportError         | ✅ Yes           |
| `apply_discount()`  | `test_orders.py`     | ✅ Yes              | ✅ Yes            | AssertionError      | ✅ Yes           |
| `OrderValidator`    | `test_validators.py` | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
```

**Compliance rules:**

- Every new function/class MUST have a row in this table
- Default: "Test Written First?" must be ✅ Yes for all rows
- **Bugfix regression exception (ALLOWED only when applicable):** If the change is a bugfix/refactor with **no new API surface** and no new functions/classes, this column MAY be `⚠️ Post-fix (bugfix regression)` _only if_:
  - “Failure Reason” clearly describes how/why the pre-fix code would fail, and
  - A regression test exists and meaningfully exercises the bug (not a trivial assertion)
- "Failure Verified?" must be ✅ Yes with a valid failure reason
- "Pass After Impl?" must be ✅ Yes
- ❌ Any row with "No" or missing = **TDD violation, implementation incomplete**
- If a row shows "No" for "Test Written First?", you must delete the implementation and restart with TDD

## Agent Workflow

- Execute plan step-by-step (plan is primary)
- Reference analyst findings from docs
- Invoke analyst if unforeseen uncertainties
- Report ambiguities to planner
- Create implementation doc
- QA validates first → fix if fails → UAT validates after QA passes
- Sequential gates: Code Review → QA → UAT

**Distinctions**: Implementer=execute/code; Planner=plans; Analyst=research; QA/UAT=validation.

## Assumption Documentation

Document open questions/unverified assumptions in implementation doc with:

- Description
- Rationale
- Risk
- Validation method
- Escalation evidence

**Examples**: technical approach, performance, API behavior, edge cases, scope boundaries, deferrals.

**Escalation levels**:

- Minor (fix)
- Moderate (fix+QA)
- Major (escalate to planner)

## Escalation Framework

See `TERMINOLOGY.md` for details.

### Escalation Types

- **IMMEDIATE** (<1h): Plan conflicts with constraints/validation failures
- **SAME-DAY** (<4h): Unforeseen technical unknowns need investigation
- **PLAN-LEVEL**: Fundamental plan flaws
- **PATTERN**: 3+ recurrences

### Actions

- Stop, report evidence, request updated instructions from planner (conflicts/failures)
- Invoke analyst (technical unknowns)

---
