---
ID: 001
Origin: 001
UUID: 9c4d7a1e
Status: Resolved
---

# Agent Instruction Updates 001 — Implementing PI 001 (Option 1)

**Source analysis**: `agent-output/process-improvement/closed/001-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/closed/001-provider-trust-verification-retrospective.md`
**Date**: 2026-02-22

## Summary

- **Files updated**: 4 agent instruction files
- **Recommendations implemented**: R1, R2, R3, R4 (✅) + R6 (✅)
- **Recommendations deferred**: R5 weekly check-in cadence (⏸️)

## Files Updated

- `.github/agents/planner.agent.md`
  - Added **Milestone dependency graph** requirement for multi-layer plans (backend+UI)
  - Added **Scope Lock on UAT Failure** standard (Option A/B/C) with changelog recording requirement

- `.github/agents/implementer.agent.md`
  - Added **Pre-Handoff QA Gate** checklist (tests/type-check/build + doc completeness) before handing off to Code Review/QA

- `.github/agents/uat.agent.md`
  - Added **Value-evidence preflight** step to compare plan milestones vs implementation “Milestones Completed”; fails fast and hands off to Planner for scope lock if user-visible deliverables are missing

- `.github/agents/qa.agent.md`
  - Added **delta lint preferred** guidance and clarified repo-wide lint can be informational when clearly pre-existing

## Changes by Recommendation

- **R1 — Milestone dependency graph + sequencing**: ✅ Implemented (Planner)
- **R2 — Implementer pre-handoff QA gate checklist**: ✅ Implemented (Implementer)
- **R3 — UAT value-evidence preflight**: ✅ Implemented (UAT)
- **R4 — Formalize scope lock on UAT failure**: ✅ Implemented (Planner)
- **R5 — Weekly check-in cadence**: ⏸️ Deferred (kept optional; may add after observing 1–2 plans)
- **R6 — QA delta lint**: ✅ Implemented (QA)

## Validation Plan

1. Create a new plan with backend + UI milestones and confirm `## Milestone Dependencies` + Mermaid graph is present.
2. Run a small implementation and verify the Implementer checklist blocks QA handoff if any of `npm test`, `npm run type-check`, `npm run build` fail.
3. Simulate a UAT attempt where the implementation doc is missing a user-visible milestone and confirm UAT fails fast and requests scope lock (A/B/C).
4. Run QA and confirm lint reporting includes delta lint gating and repo-wide lint is captured as informational when unrelated.

## Related Artifacts

- Process improvement analysis: `agent-output/process-improvement/closed/001-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/001-provider-trust-verification-retrospective.md`

---

## Changelog

| Date       | Agent              | Change           | Notes            |
| ---------- | ------------------ | ---------------- | ---------------- |
| 2026-02-22 | ProcessImprovement | Document closed  | Status: Resolved |
