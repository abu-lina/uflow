---
ID: 82
Origin: 82
UUID: d7e3a1f9
Status: Applied
---

# Process Improvement Analysis 082

**Derived from**: Retrospective for Plan 082 (Saved Page Search Bar Disappears)  
**Date**: 2026-04-06T11:15Z  
**Author**: retrospective

## Overview

Five process improvement candidates were identified across the Plan 082 pipeline. Two are **CRITICAL/HIGH** environment or communication gaps; two are **MEDIUM** quality and authoring patterns; one is **LOW** structural. All five are systemic — observable in prior retrospectives.

---

## PI-1 (CRITICAL): UAT Version Recommendation Language

**Trigger**: UAT recommended v0.10.9 (hardcoded). DevOps found v0.10.9–v0.10.11 already taken. Three documents required post-collision updates.

**Root Cause**: UAT infers version from package.json at plan time, without consulting git tags on origin.

**Systemic Pattern**: Every worktree session risks version collision because other sessions bump versions independently. UAT can never reliably know the current highest tag without running `git fetch --tags` — which is DevOps's job.

**Proposed Change**: UAT should write "next available patch after `{current version}` — DevOps to confirm at Stage 1 via `git fetch --tags`" instead of a hardcoded version number.

**Affected Agents and Documents**:
- UAT mode instructions: Add under "Release Readiness → Version Recommendation"
- `.github/copilot-instructions.md`: No change needed (version management is DevOps-owned)

**Measurement (if applied)**: Zero version collisions at DevOps Stage 1 across the next 5 plans.

---

## PI-2 (HIGH): DevOps Terminal Pager Pre-Flight

**Trigger**: `git rebase origin/main` was silently swallowed by terminal pager (`less`). No output. ~20 minutes debugging until workaround (switch to merge) was found.

**Root Cause**: VS Code integrated terminal in git sessions may have `PAGER=less` or equivalent configured. Long-output git operations trigger an interactive pager that halts without the agent detecting the pause.

**Systemic Pattern**: This is the second occurrence in documented DevOps sessions. The pattern is: rebase → silent, fallback to merge → 4 merge conflicts that would have been 0 conflicts under rebase.

**Proposed Change**: DevOps Stage 2 environment setup should begin with:
```bash
export GIT_PAGER=''
export GIT_TERMINAL_PROMPT=0
```

Or, per-command:
```bash
git --no-pager rebase origin/main
git --no-pager merge origin/main
git --no-pager log --oneline -5
```

Prefer `--no-pager` flag when only 1–2 commands are affected; prefer `export GIT_PAGER=''` when doing a full Stage 2 execution with multiple git ops.

**Affected Agents and Documents**:
- DevOps mode instructions: Add under "Stage 2 Environment Setup" as mandatory step before any git operation
- Any DevOps cursor rule files (`.cursor/rules/`)

**Measurement (if applied)**: Zero pager-blocked commands across the next 5 DevOps Stage 2 sessions.

---

## PI-3 (MEDIUM): Regression Test Mock Assertion Anti-Pattern

**Trigger**: Plan 082 regression test mocked `SearchBar` and asserted `data-testid="saved-search-bar"`. Code Reviewer flagged MEDIUM. QA deferred. Test shipped as-is.

**Root Cause**: When testing complex page components, heavy mocking is necessary to isolate the test environment. Agents default to mocking any component that requires context providers (Supabase, i18n, search). When the component under test is mocked, the test can only assert the mock was included — not that the component renders anything interactive.

**Systemic Pattern**: Observed in 2 prior plan test suites (cross-referencing retrospectives 032, 050). The pattern is: page test → mock everything → assert test-id from mock → Code Review MEDIUM → deferred → shipped unaddressed.

**Proposed Change**: Add to bugfix handoff completeness criteria:

> "Regression tests for interactive UI elements MUST assert real DOM state:
> - `screen.getByRole('searchbox')` not `screen.getByTestId('my-mock-marker')`  
> - `screen.getByPlaceholderText(...)` not `screen.queryByTestId('component-mock')`  
> - Do not mock the component under test. Mock surrounding providers and data fetchers only."

**Affected Agents and Documents**:
- `.github/copilot-instructions.md`: Bugfix Handoff Completeness section — add regression test assertion guidance
- QA mode instructions: "Regression Adequacy" gate should include a check for mock-assertion anti-pattern before approving

**Measurement (if applied)**: Zero MEDIUM regression-test findings of this type in the next 5 bugfix implementations.

---

## PI-4 (MEDIUM): Planner Pre-Critique Self-Consistency Check

**Trigger**: Plan 082 M1 Steps 1 and 2 contradicted each other on whether to preserve the skeleton branch's SearchBar. Critique caught it. Revision cycle needed.

**Root Cause**: Plans are authored as sequential bullet steps within milestones. When two consecutive steps govern the same object, a contradiction can emerge without the Planner noticing — because each step is reasonable in isolation.

**Systemic Pattern**: M1 contradictions have appeared in 2 of the last 5 plans reviewed (cross-referencing retrospective 050). The pattern is: planner writes step N (preserve X) then step N+1 (remove all X without exception).

**Proposed Change**: Before handing a plan to the Critic, the Planner should verify:

> "Self-consistency check:  
> 1. List every component/object that appears in Milestone steps.  
> 2. For each, check if any step says ADD/KEEP and another says REMOVE without a stated condition.  
> 3. If yes, resolve the contradiction before handoff."

Two-question, 2-minute check for plans with multi-step milestones.

**Affected Agents and Documents**:
- Planner mode instructions: Add "Pre-handoff self-consistency check" before "Hand off to Critic"
- `.github/copilot-instructions.md`: No change needed (Planner self-check is Planner-scoped)

**Measurement (if applied)**: Zero within-milestone contradictions surfaced by Critic across next 5 plans.

---

## PI-5 (LOW): Deferred Manual Validation as Post-Merge Obligation

**Trigger**: DF-1/DF-2 manual browser validation was listed as a pre-merge condition in UAT but immediately deferred. It reappeared as a deferred item in QA, UAT, DevOps Stage 1, DevOps Stage 2. Still Open.

**Root Cause**: In worktree agent sessions, no phase has browser access to execute manual testing. Listing it as a pre-merge gate creates a condition that is always deferred — making the gate vacuous without anyone explicitly deciding to remove it.

**Proposed Change**: UAT should classify deferred validation as a **post-merge obligation** with:
- Owner: QA Team (human)
- Trigger: First production deployment
- Deadline: 48h after production deployment
- Format: "DF-1/DF-2 are post-merge validation items; merge may proceed. Validation must be recorded within 48h of production deployment."

DevOps should note the open-actions tracker reference in the deployment doc and confirm the 48h window is understood.

**Affected Agents and Documents**:
- UAT mode instructions: "Deferred Validation" section — replace "pre-merge condition" language with "post-merge obligation" protocol
- DevOps mode instructions: Add "If open-actions has DF-n items, note tracker reference and 48h window in deployment doc"

**Measurement (if applied)**: DF items are time-bounded in deployment docs and tracked to resolution, not left perpetually open.

---

## Summary of Proposed Changes

| PI | Area | Priority | Agent/File to update |
|---|---|---|---|
| PI-1 | UAT version language | CRITICAL | UAT mode instructions |
| PI-2 | DevOps pager pre-flight | HIGH | DevOps mode instructions |
| PI-3 | Regression test mock assertion | MEDIUM | copilot-instructions.md + QA mode instructions |
| PI-4 | Planner self-consistency check | MEDIUM | Planner mode instructions |
| PI-5 | Deferred manual validation protocol | LOW | UAT + DevOps mode instructions |
