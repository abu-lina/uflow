---
ID: 228
Origin: 228
UUID: 228-orchestrator-cost-tiers
Status: Done
Type: change-request
Branch: cr/228-orchestrator-cost-tiers
Worktree: ../uflow-wt/228-orchestrator-cost-tiers
Created: 2026-09-24
---

# Request 228: Add cost-tier guidance to orchestrator skill

## Original request

> I need you to be more cost saving while using different agents. For important agents/tasks it should be the more expensive ones but for execution cheaper.

## Classification

- **Type:** change-request
- **Route:** CR flow (Grill -> Implement -> Code Review -> Done)
- **Confidence:** high

## Phases

| #   | Phase                 | Status | Outcome                                              |
| --- | --------------------- | ------ | ---------------------------------------------------- |
| 0   | Tracking file created | Done   | This file                                            |
| 1   | Grill                 | Done   | Tier mapping confirmed by user                       |
| 2   | Implement             | Done   | 1 file, 43 insertions, 15 deletions. Commit b749ebc1 |
| 3   | Code Review           | Done   | PASS WITH NOTES. 2 notes fixed in commit 0fedf384    |
| 4   | Done                  | Done   | PR #411 created, worktree removed                    |

## Decisions

Decisions made during grilling, recorded as they land.

| #   | Decision                                  | Choice                       | Rationale                                                               |
| --- | ----------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| 1   | Which phases are "important" (foreground) | Grill, Diagnose, Code Review | High-judgment phases needing reasoning, user interaction, quality gates |
| 2   | Which phases are "execution" (background) | Implement, Fix, QA           | Follow a spec, execute work, lower judgment needed                      |

## Spec

### Cost-tier policy for orchestrator subagent dispatch

**Foreground (expensive)** -- phases requiring reasoning, user interaction, or quality judgment:

- Grill (feature, refactor, CR flows)
- Diagnose (bug flow)
- Code Review (all flows that have it)

**Background (cheaper)** -- execution phases that follow an existing spec:

- Implement (feature, refactor, CR flows)
- Fix (bug, hotfix flows)
- QA (feature flow)
- Research (exploration flow -- already background)

**No subagent (free):**

- Spec writing (orchestrator does it directly)
- Ticket writing (orchestrator does it directly)
- Done phase (orchestrator updates tracking file)

### Changes to SKILL.md:

1. Add a "Cost Tiers" section after "Dispatching subagents" explaining the policy
2. Update all flow tables: change "Subagent" column values to reflect foreground/background explicitly
3. Add tier annotation to the dispatch example

## Implementation notes

_Updated during implementation._

- Branch: `cr/228-orchestrator-cost-tiers`
- Tests added:
- Files changed:

## Review findings

_Filled during code review._

### Standards axis

- PASS: All 6 flow tables use consistent tier labels
- PASS: Cost Tiers section well-structured and unambiguous
- PASS: Phase-to-tier mapping matches flow tables
- FIXED: run_subagent example now uses is_background: true for execution tasks
- COSMETIC: Table padding inconsistent in source (renders fine)

### Spec axis

- PASS: Foreground tiers correct (Grill, Diagnose, Code Review)
- PASS: Background tiers correct (Implement, Fix, QA, Research)
- PASS: No subagent tiers correct (Spec, Tickets, Done)
- FIXED: Report phase added to mapping table

## QA results

_N/A -- skill file change, no test suite._

## Follow-up requests

_New work discovered during this request. Do not act on these; finish the current request first._

## Learnings

Background subagents can't get write-access approval in Devin CLI. When dispatching execution workers to worktrees, either (a) request_scope for the worktree path before dispatching background, or (b) use foreground for the first write-needing worker. The cost savings of background dispatch are lost if the subagent fails and needs re-dispatch.
