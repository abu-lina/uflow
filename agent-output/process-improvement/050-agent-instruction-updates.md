---
ID: 050
Origin: 050
UUID: c4e7a912
Status: Active
---

# Agent Instruction Updates 050: JoinHalal Dry-Run Timeout Hardening

**Source**: `agent-output/retrospectives/closed/049-joinhalal-dry-run-timeout-hardening-retrospective.md`
**PI Analysis**: `agent-output/process-improvement/050-process-improvement-analysis.md`
**Date**: 2026-03-22

## Summary

- **Recommendations implemented**: 3 (`PI-1`, `PI-2`, `PI-3`)
- **Files updated**: 3 agent instruction files
- **Net effect**: reduces avoidable QA escalations for constraint-sensitive MEDIUM findings, makes API route contract coverage explicit during implementation, and strengthens DevOps auditability for chain timestamp anomalies.

## Files Updated

- `.github/agents/code-reviewer.agent.md`
  - Added **Constraint-Sensitive Findings** rule requiring explicit `Fix before QA` or `Risk accepted for this release` disposition when a MEDIUM finding could violate a plan constraint.

- `.github/agents/implementer.agent.md`
  - Added **API Route Coverage Gate** requiring a route-level test row or documented exception when `src/app/api/**/route.ts` is added or modified.

- `.github/agents/devops.agent.md`
  - Added **Chain timestamp sanity-check** to Stage 1 so obvious chronology anomalies across implementation/code-review/QA/UAT docs are surfaced and recorded.

## Changes by Recommendation

- **PI-1**: ✅ Implemented
  - Scope: Code Reviewer only
  - Outcome: Constraint-sensitive MEDIUM findings can no longer be left as vague follow-up items.

- **PI-2**: ✅ Implemented
  - Scope: Implementer only
  - Outcome: API route work now requires route-contract coverage visibility in the TDD/verification record.

- **PI-3**: ✅ Implemented (narrowed)
  - Scope: DevOps only
  - Outcome: DevOps now performs a lightweight chronology audit instead of becoming the blanket editor of upstream docs.

- **PI-4**: ⏸️ Deferred / no additional change
  - Reason: Existing UAT deferred-follow-up guidance plus DevOps deferred-item release-summary guidance already provide substantial coverage. Generalization can be added later if repeated under-signaling appears.

## Validation Plan

- Watch the next lifecycle run that includes an API route change and confirm the implementation doc includes a route-level test row or explicit exception.
- Watch the next Code Review doc with a MEDIUM edge-case finding and confirm it records a concrete disposition rather than "track later" wording.
- Watch the next Stage 1 deployment doc and confirm any chronology anomaly is either corrected or explicitly recorded.

## Related Artifacts

- `agent-output/retrospectives/closed/049-joinhalal-dry-run-timeout-hardening-retrospective.md`
- `agent-output/process-improvement/050-process-improvement-analysis.md`
- `.github/agents/code-reviewer.agent.md`
- `.github/agents/implementer.agent.md`
- `.github/agents/devops.agent.md`

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-22T13:00Z | process-improvement | Implemented PI-1, PI-2, and narrowed PI-3 in agent instructions |