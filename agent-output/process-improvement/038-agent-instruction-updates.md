---
ID: 038
Origin: 038
UUID: a8d0f3c1
Status: Active
---

# Agent Instruction Updates 038: Cross-Layer Integration Wiring + Data-Flow Review Checklist

**Source**: `agent-output/retrospectives/closed/038-provider-owner-outreach-claim-system-retrospective.md`  
**PI analysis**: `agent-output/process-improvement/038-process-improvement-analysis.md`  
**Date**: 2026-03-13

## Summary

- **Recommendations implemented**: 6 (PI-1..PI-6)
- **Files updated**: 4 agent instruction files
- **Net effect**: Prevents “API exists but no caller” integration misses; forces reviewers to cross-trace redirects/query params; strengthens DevOps release evidence on changelog-date correctness + vulnerability deltas; ensures UAT documents whether remediation fixes were inspected vs relying on QA-only evidence.

## Files Updated

- `.github/agents/implementer.agent.md`
  - Added **Cross-Layer Integration Self-Check** (PI-1)

- `.github/agents/code-reviewer.agent.md`
  - Added **Outbound Data-Flow Cross-Trace Checklist** (PI-2)

- `.github/agents/devops.agent.md`
  - Added **CHANGELOG date sanity-check** to Stage 1 version verification (PI-3)
  - Added **Stage 2 audit evidence** requirement + “new HIGH/CRITICAL = blocker unless accepted” rule (PI-4)
  - Extended **open-actions tracker** trigger to include deployment “Known Limitations (pre-operation)” items (PI-5)

- `.github/agents/uat.agent.md`
  - Added **Remediation Review (WHEN APPLICABLE)** note in UAT template (PI-6)

## Changes by Recommendation

- **PI-1 Implementer ‘caller exists’ check**: ✅ Implemented
- **PI-2 Code Reviewer outbound data-flow cross-trace**: ✅ Implemented
- **PI-3 DevOps CHANGELOG date sanity-check**: ✅ Implemented
- **PI-4 DevOps `npm audit` evidence + new HIGH/CRITICAL handling**: ✅ Implemented
- **PI-5 Pre-operation items must produce an open-actions tracker**: ✅ Implemented
- **PI-6 UAT remediation inspection note**: ✅ Implemented

## Validation Plan

Next 2–3 plan cycles, monitor:

- **Integration gaps reaching QA**: QA failures due to “route exists but never called” should drop toward zero.
- **Review findings quality**: Code Reviewer should catch missing param-consumption defects before QA.
- **Release hygiene**: CHANGELOG heading date should match the actual release day, or have explicit rationale.
- **Security visibility**: Deployment docs should record audit outputs/deltas (even when vulnerabilities are pre-existing).
- **Pre-operation follow-through**: Known limitations that must be fixed before first operation should always have a visible `agent-output/planning/[ID]-open-actions.md` tracker.

## Related Artifacts

- Retrospective (closed): `agent-output/retrospectives/closed/038-provider-owner-outreach-claim-system-retrospective.md`
- PI analysis: `agent-output/process-improvement/038-process-improvement-analysis.md`
- This summary: `agent-output/process-improvement/038-agent-instruction-updates.md`
