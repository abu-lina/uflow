---
ID: 057
Origin: 057
UUID: 4d2a9c71
Status: Complete
---

# Agent Instruction Updates 057: Plan 052 Import Workflow Gaps

**Source Analysis**: `agent-output/process-improvement/057-process-improvement-analysis.md`
**Date**: 2026-03-23T18:15Z

## Summary

4 files updated implementing 4 of 6 recommendations from PI Analysis 057. R4 (workflow parity) and R5 (mainline test tracking) deferred per phase rollout decision.

## Files Updated

| File | Changes |
|---|---|
| `.github/agents/planner.agent.md` | R1: Added "Third-Party Source Verification" section after Core Responsibilities. R3: Tightened version wording in Process step 5 to ban speculative exact versions. |
| `.github/agents/critic.agent.md` | R1: Added third-party source check to Plan review criteria in Review Method step 5. |
| `.github/agents/qa.agent.md` | R2: Added "Import Dry-Run Deferral Rule" section before Diagnosability & Telemetry. |
| `.github/agents/uat.agent.md` | R2: Added "Import Dry-Run Deferral Rule" section after Deferred Follow-ups. R6: Added "External Source Contract Stability" section after dry-run rule. |

## Changes by Recommendation

| Rec | Status | Description | Agent-Specific Changes |
|---|---|---|---|
| R1 | ✅ Implemented | Live source verification gate for third-party import plans | Planner: new MANDATORY section. Critic: added review criteria. |
| R2 | ✅ Implemented | Escalate blocked import dry-runs to MEDIUM risk | QA: new MANDATORY section. UAT: new MANDATORY section. |
| R3 | ✅ Implemented | Ban speculative exact version numbers in plans | Planner: tightened Process step 5 wording. |
| R4 | ⏸️ Deferred | Operator workflow parity for import plans | Deferred to next PI cycle. |
| R5 | ⏸️ Deferred | Track mainline test failures as visible follow-up | Deferred to next PI cycle. |
| R6 | ✅ Implemented | External source contract stability in UAT | UAT: new WHEN APPLICABLE section. |

## Validation Plan

- Verify each inserted rule is conditionally scoped (`MANDATORY when applicable` / `WHEN APPLICABLE`)
- Confirm no instruction contradicts existing DevOps two-stage release model
- Confirm QA/UAT wording is consistent with existing deferred-follow-up format
- Monitor next import plan for correct gate application

## Related Artifacts

- `agent-output/process-improvement/057-process-improvement-analysis.md`
- `agent-output/retrospectives/closed/052-muslimbusiness-import-retrospective.md`
- `.github/agents/planner.agent.md`
- `.github/agents/critic.agent.md`
- `.github/agents/qa.agent.md`
- `.github/agents/uat.agent.md`
