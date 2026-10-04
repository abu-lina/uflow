---
ID: 059
Origin: 059
UUID: b1e4c8a2
Status: Superseded
---

# Agent Instruction Updates 059: Release-State and Mergeability Gaps

> NOTE: This document shares ID `059` with another Process Improvement chain in `agent-output/process-improvement/closed/`. To avoid overwriting or losing history, this copy is being archived as **Superseded (ID collision)**.

**Source Analysis**: `agent-output/process-improvement/059-process-improvement-analysis.md`
**Source Retrospective**: `agent-output/retrospectives/closed/056-gha-supply-chain-remediation-retrospective.md`
**Date**: 2026-03-24

## Summary

- **Files updated**: 1
- **Recommendations implemented**: R1, R2, R3, R4 (narrow DevOps-instruction fix set)
- **Recommendations deferred**: R5 (lifecycle-state expansion), R6 (no-memory mode signal — documented only)

## Files Updated

| File | Changes |
|---|---|
| `.github/agents/devops.agent.md` | Delayed `Released` status propagation until PR mergeability is verified; strengthened remote-sync language to default to rebase-before-push when behind; added long-gap branch preflight; added conflict-hotspot forecast guidance; added command-derived closure evidence guidance for config/workflow-only releases |

## Changes by Recommendation

### R1 — Reconcile `Released` timing with mergeability gate

**Status**: ✅ Implemented

- Updated Core Responsibility 11 to apply `Released` only after Stage 2 push succeeds **and** PR comparison is confirmed conflict-free (including any required rebase/force-push).

### R2 — Long-gap branch preflight defaults to rebase-before-push

**Status**: ✅ Implemented

- Updated Stage 2 Remote sync check wording to require not-behind state **before** the first Stage 2 push (default) and before tagging.
- Added explicit `8d. Long-gap branch preflight` steps: record ahead/behind counts; default to rebase/merge before push; document push-first exceptions.

### R3 — Conflict-hotspot forecast guidance

**Status**: ✅ Implemented

- Added a recommended `Conflict Hotspot Forecast` block under the Stage 2 readiness evidence guidance to proactively flag likely conflict files when the branch is behind.

### R4 — Command-derived closure evidence for config-only releases

**Status**: ✅ Implemented

- Added recommended guidance to prefer command-derived invariants (grep/count checks captured in readiness/deployment docs) over document-table counts alone, and to record discrepancies explicitly.

## Validation Plan

- Next session-branch release should show ahead/behind counts and explicit rebase-before-push decision in Stage 2 readiness evidence.
- Plans should not be marked `Released` until PR comparison is conflict-free.
- Deployment docs should include a conflict-hotspot forecast when rebase/merge is expected.
- Workflow/config-only releases should include at least one command-derived invariant check as closure evidence.

## Related Artifacts

- `agent-output/retrospectives/closed/056-gha-supply-chain-remediation-retrospective.md`
- `agent-output/process-improvement/closed/059-process-improvement-analysis-plan056.md`
- `.github/agents/devops.agent.md`

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-29T12:55Z | process-improvement | Archived as Superseded due to ID collision; preserved content under unique closed filename |
