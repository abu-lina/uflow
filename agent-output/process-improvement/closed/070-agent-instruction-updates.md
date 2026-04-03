---
ID: 070
Origin: 070
UUID: 6c2f91ab
Status: Released
---

# Agent Instruction Updates 070: Plan 065 Process Improvements (P1–P3)

**Source Analysis**: `agent-output/process-improvement/070-process-improvement-analysis.md`
**Source Retrospective**: `agent-output/retrospectives/closed/065-provider-enrichment-pipeline-retrospective.md`
**Date**: 2026-03-29T17:35Z
**Implementer**: process-improvement

## Summary

3 recommendations from Retrospective 065 implemented across 3 agent instruction files. All changes are additive — no existing rules were removed or weakened.

## Files Updated

| File | Recommendation | Kind |
|---|---|---|
| `.github/agents/critic.agent.md` | P1 — Deferred Findings Rule | New section + amended closure rule |
| `.github/agents/planner.agent.md` | P2 — Entity Ownership Check | New section |
| `.github/agents/implementer.agent.md` | P3 — Pre-QA Static Gate | New sub-item under Core Responsibilities |

---

## Changes by Recommendation

### P1 — Deferred Findings Rule (`.github/agents/critic.agent.md`)

**Status**: ✅ Implemented

**Before**: Closure rule triggered only when there were "no OPEN findings remaining" — deferred findings could keep a critique permanently active.

**After**: Added `Deferred Findings Rule (MANDATORY)` section immediately before the closure rule. A finding may be marked `Deferred` when it carries all three required fields: downstream owner, target artifact, and trigger. The closure rule now triggers when all findings are either `RESOLVED` or `DEFERRED` (with those three fields present). The changelog entry is extended to name any deferred items and their owners.

**Agent-specific changes**:
- **Critic**: Now has explicit semantic for `Deferred` findings. Can close critiques with acknowledged deferred items without waiting for M4 or future milestones.

---

### P2 — Entity Ownership Check (`.github/agents/planner.agent.md`)

**Status**: ✅ Implemented

**Before**: No explicit checkpoint for provider ownership scope in plans that modify `providers` rows. The closest rule was the Shared Results Actionability Check, which covers multi-entity list actions, not ownership semantics.

**After**: Added `Entity Ownership Check (MANDATORY when applicable)` section after the Shared Results Actionability Check. When a plan creates, modifies, enriches, moderates, or batch-updates existing `providers` rows, the Planner must explicitly state: (1) which ownership tier is in scope, (2) where the filter is enforced, (3) whether fail-closed behaviour is needed for ownership transitions. If unclaimed-only, must be recorded as `[RESOLVED]` decision.

**Agent-specific changes**:
- **Planner**: This check runs before handoff to Critic. Prevents the Plan 065 pattern of ownership scope being discovered by Analyst or Critic and forcing a mid-flight revision.

---

### P3 — Pre-QA Static Gate (`.github/agents/implementer.agent.md`)

**Status**: ✅ Implemented

**Before**: Implementer required tests to pass and implementation to be complete, but no explicit static analysis requirement before QA handoff.

**After**: Added `Pre-QA Static Gate (MANDATORY before any Code Review or QA handoff)` as item `10b` under Core Responsibilities. Before any handoff to Code Review or QA, the Implementer must run `npm run lint` and `npm run type-check` and confirm both exit 0. QA remains the authoritative gate; this is a mandatory self-check only.

**Agent-specific changes**:
- **Implementer**: Prevents QA reset passes caused by IDE-level lint warnings (as happened in Plan 065 Pass 1, ~3h delay for 3 trivial lint errors).

---

## Validation

| Check | Result |
|---|---|
| P1 — Deferred Findings Rule present in critic.agent.md (line 155) | ✅ grep confirmed |
| P1 — Closure rule now references RESOLVED or DEFERRED | ✅ verified in context |
| P2 — Entity Ownership Check present in planner.agent.md (line 116) | ✅ grep confirmed |
| P3 — Pre-QA Static Gate present in implementer.agent.md (line 159) | ✅ grep confirmed |
| No existing rules removed or weakened | ✅ all changes are additive |
| QA authority preserved (P3) | ✅ stated explicitly as self-check only |
| Deferred bypass prevention (P1) | ✅ three required fields prevent casual use as escape hatch |

## Related Artifacts

- `agent-output/process-improvement/070-process-improvement-analysis.md`
- `agent-output/retrospectives/closed/065-provider-enrichment-pipeline-retrospective.md`
- `.github/agents/critic.agent.md`
- `.github/agents/planner.agent.md`
- `.github/agents/implementer.agent.md`

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-29T17:35Z | process-improvement | Instructions updated; updates doc created |
