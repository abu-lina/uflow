---
ID: 070
Origin: 070
UUID: 9f3a2c7b
Status: Implemented
---

# Agent Instruction Updates 070 (from Retrospective 069)

**Source**: `agent-output/retrospectives/closed/069-iconify-sw-interception-hotfix-retrospective.md`
**PI Analysis**: `agent-output/process-improvement/closed/070-process-improvement-analysis.md`
**Date**: 2026-03-29

## Summary

Implemented the approved Option 2 improvements to prevent repeating the “config/build looks correct but runtime fails in privacy browsers” pattern and to keep hotfix traceability intact without forcing the full pipeline.

Key outcomes:

- Adds a **browser-runtime evidence gate** for PWA/service-worker/privacy/network-sensitive fixes (executed evidence or explicit deferral with owner + closure evidence).
- Adds a **hotfix minimum evidence floor** when UAT is intentionally skipped (record live verification in the deployment doc).
- Adds DevOps guidance for the **post-merge hotfix metadata lock** case (fix already on `main`, but version/changelog/lockfile lag).

## Files Updated

- `.github/agents/qa.agent.md`
  - Added `PWA / Service-Worker Runtime Validation Gate (MANDATORY when applicable)`.
  - Added `Hotfix Evidence Minimum (WHEN APPLICABLE)`.

- `.github/agents/uat.agent.md`
  - Added `PWA / Privacy Runtime Evidence Gate (MANDATORY when applicable)`.

- `.github/agents/devops.agent.md`
  - Tightened `PWA Browser Verification Requirements` with closure discipline (executed evidence or explicit DEFERRED record).
  - Added `Hotfix note` requiring a `Live Verification` subsection in deployment docs when UAT is skipped.
  - Added `Post-Merge Hotfix Metadata Lock (WHEN APPLICABLE)`.

- `.github/agents/orchestrator.agent.md`
  - Annotated Hotfix pipeline with a minimum evidence rule and escalation criteria to the full pipeline when uncertainty remains high.

## Changes by Recommendation

| Rec | Status | Notes |
| --- | --- | --- |
| R1 | ✅ Implemented | QA/UAT/DevOps now require browser-runtime evidence or explicit deferral for PWA/service-worker/privacy/network runtime defects |
| R2 | ✅ Implemented (refined) | Kept hotfix pipeline minimal; added minimum evidence floor rather than forcing UAT into every hotfix |
| R3 | ✅ Implemented | DevOps now has explicit guidance for already-merged hotfixes needing metadata/tag alignment |
| R4 | ✅ Implemented (absorbed) | Folded into R1 wording; no separate Workbox-only rule added |

## Validation Plan

- Next PWA/service-worker change:
  - QA report must include executed browser-runtime evidence **or** a DEFERRED entry with owner + trigger + closure evidence.
  - UAT (when present) must not issue unqualified approval without runtime evidence.
  - DevOps Stage 2 must record executed validation or explicit deferred risk in deployment doc.

- Next compressed hotfix (no formal UAT artifact):
  - DevOps deployment doc must include `Live Verification` section (routes + browser/profile + outcome).

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-03-29T14:55Z | process-improvement | Updated agent instructions per PI-070 and recorded implementation summary |