---
ID: 007
Origin: 007
UUID: 6c0b7a1e
Status: Resolved
---

# Agent Instruction Updates 007 — Implementing PI 007 (Option 3)

**Source analysis**: `agent-output/process-improvement/007-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/closed/006-android-suggest-provider-form-bugfix-retrospective.md`
**Date**: 2026-02-22

## Summary

- **Option implemented**: Option 3 (Full)
- **Files updated**: 8 agent instruction files
- **Scope**: Instruction-only changes (no source code/tests)

## Files Updated

- `.github/agents/qa.agent.md`
  - Added **Focus/Scroll Side-Effects Checklist** (mount restore, post-mount programmatic change, explicit user action)
  - Added **deferral documentation requirement** (owner/rationale/severity/fallback path)
  - Added **UTC ISO-8601 timestamp guidance** for QA timelines

- `.github/agents/uat.agent.md`
  - Added **Focus/Scroll Side-Effects Scenarios** (fresh visit, restored draft, autocomplete/autofill)
  - Added **deferral documentation requirement** (owner/rationale/severity/fallback path)
  - Added **UTC ISO-8601 timestamp guidance**

- `.github/agents/planner.agent.md`
  - Strengthened **UUID inheritance** when planning from analysis: copy/paste frontmatter + closure check
  - Updated tools list to include explicit edit tools so Planner can reliably write planning outcomes

- `.github/agents/critic.agent.md`
  - Made chatmode dependency **conditional** if `.github/chatmodes/planner.chatmode.md` exists
  - Added explicit **closure rule** for APPROVED critiques (Status `Resolved` + move to `agent-output/critiques/closed/`)
  - Updated tools list to include explicit edit tools so Critic can reliably write critique outcomes

- `.github/agents/implementer.agent.md`
  - Added **UTC ISO-8601 timestamp guidance** in Implementation doc format

- `.github/agents/devops.agent.md`
  - Added **UTC ISO-8601 timestamp guidance** for deployment docs

- `.github/agents/retrospective.agent.md`
  - Added **UTC ISO-8601 timestamp guidance** for retrospectives

- `.github/agents/code-reviewer.agent.md`
  - Updated tools list to include explicit edit tools so Code Reviewer can reliably write code review outcomes

## Changes By Recommendation

- ✅ **R1 — QA/UAT focus/scroll acceptance checklist**: Implemented (QA + UAT)
- ✅ **R2 — Planner UUID inheritance copy/paste rule**: Implemented (Planner)
- ✅ **R3 — Critic closure rule**: Implemented (Critic)
- ✅ **R4 — Critic chatmode dependency guard**: Implemented (Critic)
- ✅ **R5 — UTC timestamp guidance**: Implemented (QA/UAT/Implementer/DevOps/Retrospective)
- ✅ **R6 — Mobile matrix deferral rubric**: Implemented (QA + UAT)

## Validation Plan

1. Run a new mobile-adjacent UX plan: QA and UAT must include the three focus/scroll scenario types.
2. Create a plan from an analysis doc: Planner must copy/paste analysis frontmatter and pass the closure check.
3. Complete a Critic review to APPROVED: critique must be moved to `agent-output/critiques/closed/` with `Status: Resolved`.
4. Ensure Code Reviewer can create `agent-output/code-review/` docs (tools list now includes create/edit).

## Related Artifacts

- PI analysis: `agent-output/process-improvement/007-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/006-android-suggest-provider-form-bugfix-retrospective.md`
