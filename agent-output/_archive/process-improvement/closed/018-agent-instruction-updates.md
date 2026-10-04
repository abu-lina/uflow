---
ID: 018
Origin: 018
UUID: 3f2a9c1d
Status: Resolved
---

# Agent Instruction Updates 018 — Implementing Retro 017 Improvements

**Source analysis**: `agent-output/process-improvement/closed/018-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/closed/017-i18n-header-and-hotfix-retrospective.md`
**Date**: 2026-02-23

## Summary

- **Decision**: Update now (user-approved R1–R4)
- **Files updated**: 3 agent instruction files
- **Scope**: Instruction-only changes (no source code/tests)

## Files Updated

- `.github/agents/devops.agent.md`
  - Added **Functional Smoke Tests (MANDATORY)** to Stage 2 Post-Release checks (covers `/providers` with no query params)

- `.github/agents/qa.agent.md`
  - Added **SSR / Server-Defaults Check (MANDATORY when applicable)** for URL params/sentinels/server-component `searchParams`
  - Added **Sentinel Refactor Checklist (WHEN APPLICABLE)**
  - Clarified **TDD compliance** to allow a tightly-scoped `⚠️ Post-fix (bugfix regression)` entry only with strict evidence

- `.github/agents/implementer.agent.md`
  - Added **Sentinel Refactor Checklist (WHEN APPLICABLE)**
  - Clarified **TDD compliance** to allow a tightly-scoped `⚠️ Post-fix (bugfix regression)` entry only with strict evidence

## Changes by Recommendation

| Recommendation | Status | Notes |
| --- | --- | --- |
| R1 — DevOps Stage 2 functional smoke tests | ✅ | Added mandatory checks for server-rendered defaults beyond `/api/health` |
| R2 — QA SSR/server-default-path validation | ✅ | Conditional checklist; requires documenting exact URLs/inputs tested |
| R3 — Sentinel refactor completeness checklist | ✅ | Added to both QA and Implementer; emphasizes entry points + structured search + SSR-default regression test |
| R4 — Bugfix regression TDD exception format | ✅ | Allowed only when no new API surface and evidence requirements are met |

## Validation Plan

1. Next release:
   - DevOps Stage 2 includes functional smoke tests and records evidence/results

2. Next URL-param/sentinel change:
   - QA explicitly tests **no-param SSR defaults** and documents URLs
   - Implementer includes sentinel checklist evidence and adds a targeted regression test

3. Next bugfix regression:
   - `⚠️ Post-fix (bugfix regression)` is used only with a meaningful regression test + explicit failure reason

## Related Artifacts

- PI analysis: `agent-output/process-improvement/closed/018-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/017-i18n-header-and-hotfix-retrospective.md`
