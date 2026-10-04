---
ID: 006
Origin: 006
UUID: 8f3c1a2d
Status: Resolved
---

# Agent Instruction Updates 006 — Implementing PI 006 (Option 1)

**Source analysis**: `agent-output/process-improvement/006-process-improvement-analysis.md`
**Date**: 2026-02-21

## Summary

- **Files updated**: 5 agent instruction files
- **Recommendations implemented**: R1, R2, R3 (✅)
- **Recommendations deferred**: R4 (⏸️ pending ownership decision)

## Files Updated

- `.github/agents/uat.agent.md`
  - Added minimal edit tools so UAT can create `agent-output/uat/` docs
  - Added **Doc tooling readiness preflight** step
  - Added **Edit scope constraint** limiting edits to `agent-output/uat/` + plan status/changelog

- `.github/agents/qa.agent.md`
  - Added **Doc tooling readiness preflight** step to avoid doc-creation stalls

- `.github/agents/devops.agent.md`
  - Added **closure normalization** checklist in Stage 1 (verify `ID/Origin/UUID` match plan; set Status to "Committed" before moving to `closed/`)
  - Added **upstream tracking check** in Stage 2 Phase 2A before remote sync check

- `.github/agents/implementer.agent.md`
  - Strengthened **ID inheritance invariants**: treat `ID/Origin/UUID` as immutable; stop if mismatch

- `.github/agents/code-reviewer.agent.md`
  - Strengthened **ID inheritance invariants**: treat `ID/Origin/UUID` as immutable; stop if mismatch

## Changes by Recommendation

- **R1 — QA/UAT “Doc Tooling Readiness” Preflight**: ✅ Implemented
  - QA: preflight added
  - UAT: preflight added + edit tools enabled + safety constraint added

- **R2 — Enforce Document Lifecycle Invariants at Closure**: ✅ Implemented
  - Implementer/Code Reviewer: stronger header inheritance invariants
  - DevOps: explicit closure normalization checklist before moving docs to `closed/`

- **R3 — DevOps Upstream-Tracking Preflight**: ✅ Implemented
  - DevOps Stage 2 Phase 2A now checks upstream tracking before remote sync

- **R4 — Patch Release → Roadmap Release Tracker Update**: ⏸️ Deferred
  - Decision needed: DevOps-owned vs Planner-owned vs Roadmap-owned single source of truth

## Validation Plan

1. Start a fresh plan and verify new docs copy the plan’s `ID/Origin/UUID` exactly.
2. Run a QA → UAT cycle and confirm UAT can create the required `agent-output/uat/` document without tooling churn.
3. Simulate DevOps Stage 2 preflight on a branch with missing upstream tracking and confirm the checklist catches it before tagging.

## Related Artifacts

- Process improvement analysis: `agent-output/process-improvement/006-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/005-uat-docker-npm-ci-fix-retro.md`
