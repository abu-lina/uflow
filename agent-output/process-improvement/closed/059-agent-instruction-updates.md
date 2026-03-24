---
ID: 059
Origin: 059
UUID: 6f5d2b19
Status: Implemented
---

# Agent Instruction Updates 059: Remove Legacy Admin Panel

**Source Analysis**: `agent-output/process-improvement/closed/059-process-improvement-analysis.md`
**Source Retrospective**: `agent-output/retrospectives/closed/054-remove-admin-panel-retrospective.md`
**Date**: 2026-03-24

## Summary

4 files updated with 3 recommendations (R1–R3). 3 retrospective recommendations were deferred as already covered or too broad for the evidence base.

## Files Updated

| File | Changes |
| --- | --- |
| `.github/agents/planner.agent.md` | Added R1 (Removal Surface Enumeration) |
| `.github/agents/qa.agent.md` | Added R2 (Removal Surface Validation) + R3 (Deleted-Module Residue Check) |
| `.github/agents/uat.agent.md` | Added R2 (Removed Capability Discoverability Gate) |
| `.github/agents/code-reviewer.agent.md` | Added R3 (Deleted-Module Residue Sweep as 6h) |

## Changes by Recommendation

### R1 — Removal-Surface Enumeration Gate

**Status**: ✅ Implemented

| Agent | Change |
| --- | --- |
| Planner | Added `### Removal Surface Enumeration (MANDATORY when applicable)` to require explicit inventory of user-visible discovery/entry surfaces for removals (navigation, mobile, manifest shortcuts, debug links, deep links, tests/imports). |

### R2 — Removal-Surface Validation Gate

**Status**: ✅ Implemented

| Agent | Change |
| --- | --- |
| QA | Added `### Removal Surface Validation (MANDATORY when applicable)` requiring evidence that the removed capability is no longer discoverable via enumerated rendered surfaces (desktop + mobile). |
| UAT | Added `### Removed Capability Discoverability Gate (MANDATORY when applicable)` blocking unconditional approval unless QA/plan evidence shows the removed capability is no longer discoverable. |

### R3 — Deleted-Module Residue Sweep

**Status**: ✅ Implemented

| Agent | Change |
| --- | --- |
| Code Reviewer | Added `6h. Deleted-Module Residue Sweep (MANDATORY when applicable)` requiring targeted searches for stale references to deleted/renamed modules across tests/fixtures/mocks/scripts/manifests/docs, plus entry-point sanity for user-visible removals. |
| QA | Added `### Deleted-Module Residue Check (MANDATORY when applicable)` requiring evidence of residue search + gate behavior (cannot mark QA Complete if residue remains). |

## Deferred / No Instruction Change

- **Plan Artifact Requirement for “simple” deletions**: Deferred (risk of workflow overhead; treat as future consideration, scope narrowly if reintroduced).
- **Deployment timestamp integrity**: Deferred (already covered by DevOps chain timestamp sanity-check).
- **Roadmap sync gate**: Deferred (already covered by Roadmap ownership + DevOps handoff + Orchestrator phase; primarily follow-through).

## Validation Plan

- Next removal/deprecation plan should explicitly enumerate removal surfaces (R1).
- Next removal/deprecation QA + UAT should require and record discoverability evidence (R2).
- Next change with deleted/renamed modules should trigger residue sweeps in review/QA and prevent green status if stale imports remain (R3).

## Related Artifacts

- `agent-output/process-improvement/059-process-improvement-analysis.md`
- `agent-output/retrospectives/closed/054-remove-admin-panel-retrospective.md`
