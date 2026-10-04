---
ID: 058
Origin: 058
UUID: 3c0c8f41
Status: Implemented
---

# Agent Instruction Updates 058: Admin Review Inside Providers Discovery

**Source Analysis**: `agent-output/process-improvement/058-process-improvement-analysis.md`
**Source Retrospective**: `agent-output/retrospectives/058-admin-review-in-providers-discovery-retrospective.md`
**Date**: 2026-03-24

## Summary

3 files updated with 3 recommendations (R1, R2, R3). 2 recommendations deferred (R4, R5 — already covered by existing instructions).

## Files Updated

| File | Changes |
|------|---------|
| `.github/agents/uat.agent.md` | Added R1 (Admin Runtime Smoke Gate) + R3 (Release Version Discipline) |
| `.github/agents/planner.agent.md` | Added R2 (Shared Results Actionability Check) |
| `.github/agents/code-reviewer.agent.md` | Added R2 (Shared Results Actionability Checklist as 6g) |

## Changes by Recommendation

### R1 — Admin Runtime Smoke Gate

**Status**: ✅ Implemented

| Agent | Change |
|-------|--------|
| UAT | Added `### Admin Runtime Smoke Gate (MANDATORY when applicable)` section after the Performance Timing Gate. Requires live admin-session validation before "APPROVED FOR RELEASE" for role/RLS-dependent features. Includes minimum checks and conditional-approval fallback. |

### R2 — Shared Results Actionability Checklist

**Status**: ✅ Implemented

| Agent | Change |
|-------|--------|
| Planner | Added `### Shared Results Actionability Check (MANDATORY when applicable)` section after item 13. Requires plans with inline actions on multi-entity lists to specify which entity types may receive each action and how wrong-type entities are excluded. |
| Code Reviewer | Added `6g. Shared Results Actionability Checklist (MANDATORY when applicable)` after 6f (Interaction-Layer Audit). Requires reviewers to verify actions are wired only to correct entity types and wrong-type entities are excluded from the action surface. |

### R3 — Release Version Discipline

**Status**: ✅ Implemented

| Agent | Change |
|-------|--------|
| UAT | Added `### Release Version Discipline (SHOULD)` section after R1. Guidance to reference plan's conservative version language rather than hard-coding a specific version number that DevOps may override. |

### R4 — Post-UAT Delta Summary in Implementation Doc

**Status**: ⏸️ Deferred — Existing Post-UAT Delta Protocol already covers this.

### R5 — Timestamp Sanity Check

**Status**: ⏸️ Deferred — Existing DevOps chain timestamp sanity-check already covers this.

## Validation Plan

- [ ] Next UAT of an admin/RLS feature should trigger R1 smoke gate
- [ ] Next plan with multi-entity inline actions should trigger R2 actionability check
- [ ] Next UAT release decision should reference plan version language per R3
- [ ] Monitor for false positives (gates triggering when not applicable)

## Related Artifacts

| Artifact | Location |
|----------|----------|
| PI Analysis | `agent-output/process-improvement/058-process-improvement-analysis.md` |
| Retrospective | `agent-output/retrospectives/058-admin-review-in-providers-discovery-retrospective.md` |
| UAT Instructions | `.github/agents/uat.agent.md` |
| Planner Instructions | `.github/agents/planner.agent.md` |
| Code Reviewer Instructions | `.github/agents/code-reviewer.agent.md` |
