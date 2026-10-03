---
ID: { ID }
Origin: { ID }
UUID: { UUID }
Status: Active
Type: { TYPE }
Branch: { BRANCH }
Worktree: ../uflow-wt/{ID}-{SLUG}
Created: { TIMESTAMP }
---

# Request {ID}: {TITLE}

## Original request

> {USER_REQUEST_VERBATIM}

## Classification

- **Type:** {feature | bug | refactor | change-request | hotfix | exploration}
- **Route:** {Main flow | Bug flow | Refactor flow | CR flow | Hotfix flow | Explore flow}
- **Confidence:** {high | medium -- if medium, note why}

## Phases

| #   | Phase                 | Status  | Outcome   |
| --- | --------------------- | ------- | --------- |
| 0   | Tracking file created | Done    | This file |
| 1   | {phase_name}          | Pending |           |
| 2   | {phase_name}          | Pending |           |
| ... |                       |         |           |

## Decisions

Decisions made during grilling, recorded as they land.

| #   | Decision | Choice | Rationale |
| --- | -------- | ------ | --------- |

## Spec

_Filled during the spec phase (feature/CR flows)._

## Tickets (multi-session only)

_Filled when the spec is broken into tickets. Omit this section for single-session work._

| #   | Ticket | Branch | Worktree | Status | Handoff doc |
| --- | ------ | ------ | -------- | ------ | ----------- |

## Implementation notes

_Updated during implementation. For multi-session work, each ticket has its own section below._

- Branch: `{BRANCH}`
- Tests added:
- Files changed:

## Review findings

_Filled during code review._

### Standards axis

### Spec axis

## QA results

_Filled after test suite run._

- Suite: pass / fail
- Coverage delta:
- Regressions:

## Follow-up requests

_New work discovered during this request. Do not act on these; finish the current request first._

## Learnings

_Captured after review and test (workflow.mdc rule). Copy to docs/ai/LEARNINGS.md._
