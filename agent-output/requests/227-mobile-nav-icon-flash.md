---
ID: 227
Origin: 227
UUID: 227-mobile-nav-icon-flash
Status: Done
Type: bug
Branch: fix/227-mobile-nav-icon-flash
Worktree: ../uflow-wt/227-mobile-nav-icon-flash
Created: 2026-09-24
---

# Request 227: Mobile bottom nav icon size flash on tab switch

## Original request

> I still notice flaky UI transitions. For example when I switch from search menu to bookmark menu the icons are flashy, it seems like the icon quickly increases in size e.g. the heart icon.

## Classification

- **Type:** bug
- **Route:** Bug flow
- **Confidence:** high

## Phases

| #   | Phase                 | Status  | Outcome   |
| --- | --------------------- | ------- | --------- |
| 0   | Tracking file created | Done    | This file |
| 1   | Diagnose              | Done    | Icon size mismatch + opacity flash |
| 2   | Fix                   | Done    | 5 files, 6 tests, 2307 pass |
| 3   | Code Review           | Done    | SHIP |
| 4   | Done                  | Done    | PR #412 |

## Decisions

| #   | Decision | Choice | Rationale |
| --- | -------- | ------ | --------- |

## Implementation notes

- Branch: `fix/227-mobile-nav-icon-flash`
- Tests added:
- Files changed:

## Review findings

### Standards axis

### Spec axis

## Follow-up requests

## Learnings
