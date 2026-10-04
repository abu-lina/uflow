---
ID: 037
Origin: 037
UUID: sec-037-npm-deps-2026-03-08
Status: Implemented
---

# Agent Instruction Updates 037: Override Semver Safety + Dev-Tool Smoke + PWA Fallback Guardrail

**Source Retrospective**: `agent-output/retrospectives/closed/037-npm-dependency-security-remediation-retrospective.md`
**Source PI Analysis**: `agent-output/process-improvement/closed/037-process-improvement-analysis.md`
**Date**: 2026-03-08

## Summary

- **Recommendations implemented**: 3 (L-001, L-002, L-003)
- **Files updated**: 4
- **Change type**: additive policy/checklist updates (no product code changes)

## Files Updated

- `.github/agents/implementer.agent.md` — add dependency override guardrails (semver + dev-tool smoke)
- `.github/agents/qa.agent.md` — add dependency override regression checks (logs + dev-tool routes)
- `.github/agents/security.agent.md` — add override constraint guidance + npm vs Dependabot variance note
- `.github/agents/devops.agent.md` — tighten PWA fallback checklist with canonical restore command

## Changes By Recommendation

### L-001 — Override constraint policy (✅)

- Implementer and Security instructions now explicitly recommend **caret-major-lock** (`^x.y.z`) when an override should stay within a major line.
- Guidance explicitly warns against using `>=x.y.z` unless intentionally allowing majors, and requires documenting that choice.

### L-002 — Dev-tool smoke + log inspection (✅)

- Implementer instructions now require mapping overrides to affected features/pages and validating dev-mode compilation/log output (not just HTTP status).
- QA instructions now require dev-tool route checks (example: `/api-docs`) and server log inspection for import/compile errors after dependency-only changes.

### L-003 — PWA fallback artifact guardrail (✅)

- DevOps Stage 1 PWA dev-artifact check now includes a canonical restore command (`git checkout -- public/fallback-*.js`) and explicitly distinguishes production hash-suffixed fallback vs dev-only fallback.

## Validation Plan

- Confirm the updated agent instructions are internally consistent and that examples match rules.
- Spot-check that the PWA checklist mentions both `public/fallback-development.js` (dev-only) and `public/fallback-*.js` (production hash fallback).

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/037-npm-dependency-security-remediation-retrospective.md`
- PI analysis: `agent-output/process-improvement/closed/037-process-improvement-analysis.md`