---
ID: 037
Origin: 037
UUID: sec-037-npm-deps-2026-03-08
Status: Implemented
---

# Process Improvement Analysis 037: Dependency Override Semver Safety + Dev-Tool Smoke + PWA Fallback Guardrail

**Source Retrospective**: `agent-output/retrospectives/closed/037-npm-dependency-security-remediation-retrospective.md`
**Date**: 2026-03-08
**Scope**: Codify L-001/L-002/L-003 as repeatable guardrails in agent instructions.

> **NO-MEMORY MODE**: Flowbaby retrieval is unavailable in this environment; proceeding artifact-first.

## Executive Summary

- **Recommendations analyzed**: 3 (L-001/L-002/L-003)
- **Primary root cause**: An overly-broad `package.json` override constraint (`>=`) allowed a major bump, causing a dev-tool page to break despite HTTP 200.
- **Proposed updates**: 4 agent instruction files (Implementer, QA, Security, DevOps)
- **Overall risk**: **LOW** (additive checklist/policy text only)

## Changelog Pattern Analysis

### Documents reviewed

- `agent-output/retrospectives/closed/037-npm-dependency-security-remediation-retrospective.md`
- Relevant agent instructions:
  - `.github/agents/implementer.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/security.agent.md`
  - `.github/agents/devops.agent.md`

### Handoff / failure patterns

| Pattern | Frequency | Root cause | Impact | Recommendation |
|---|---:|---|---|---|
| Semver override too broad (`>=` across majors) | 1× | No documented override-constraint policy | QA bounce; broken `/api-docs` dev bundle | L-001: caret-major-lock policy |
| HTTP 200 but client bundle broken | 1× | Smoke checks didn’t include server compilation logs | False confidence until QA | L-002: dev-tool smoke + log inspection |
| Dev/build side-effects in `public/` | 1× | PWA plugin modifies fallback assets | Risk of committing missing prod fallback | L-003: explicit restore check |

## Recommendation Analysis

### L-001: npm Override Constraint Policy (HIGH)

- **Source**: Retrospective 037 / L-001
- **Current state**: No explicit guidance in Implementer/Security instructions about semver constraint shape for `package.json` `overrides`.
- **Proposed change**:
  - Codify: when you intend to stay within a major line, use `^x.y.z` (caret-major-lock), not `>=x.y.z`.
  - Require explicit callout when intentionally permitting a major bump.
- **Affected agents**: Implementer, Security
- **Risk**: LOW

### L-002: Implementer/QA Dev-Tool Smoke Test + Log Inspection (MEDIUM)

- **Source**: Retrospective 037 / L-002
- **Current state**: Implementer instructions emphasize tests/build, but do not explicitly require checking dev-only/tooling pages when dependency overrides touch their transitive deps. QA instructions do not call out dependency-only regressions like “compiled with errors” on dev-tool routes.
- **Proposed change**:
  - Implementer: after dependency overrides, identify impacted pages (e.g., `/api-docs`) and verify in dev mode; check server logs for import/compile errors.
  - QA: treat dependency override changes as needing both route smoke and compile/log inspection for affected tool routes.
- **Affected agents**: Implementer, QA
- **Risk**: LOW

### L-003: DevOps PWA Fallback Artifact Guardrail (MEDIUM)

- **Source**: Retrospective 037 / L-003
- **Current state**: DevOps Stage 1 already contains a PWA dev-artifact check (`public/fallback-*.js`).
- **Proposed change**:
  - Tighten the checklist to explicitly distinguish dev-only vs production hash-suffixed fallback files and to provide a canonical restore command.
- **Affected agents**: DevOps
- **Risk**: LOW

## Conflict Analysis

| Item | Recommendation | Conflicting instruction | Nature | Impact | Resolution |
|---|---|---|---|---|---|
| C1 | Retrospective suggests updating `.cursor/rules/*.mdc` and/or `copilot-instructions.md` | PI mode constraints: only `.agent.md` + workflow docs | Scope constraint | Prevents updating Cursor rules in this pass | Apply guardrails to `.github/agents/*.agent.md` instead |

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
|---|---|---|---|
| L-001 | LOW | Text-only policy; prevents major-resolution surprises | Include explicit exception clause when major bumps are intended |
| L-002 | LOW | Checklist-only; improves detection | Keep scope narrow: only pages affected by override chain |
| L-003 | LOW | Checklist-only; already present | Add concrete restore command + file patterns |

## Implementation Recommendations

### High-impact, low-risk (implement now)

- L-001 caret-major-lock policy in Implementer + Security
- L-002 dev-tool smoke + log inspection in Implementer + QA
- L-003 tighten DevOps fallback guardrail

## Suggested Agent Instruction Updates

- `.github/agents/implementer.agent.md`
  - Add an explicit “Dependency override guardrails” section (L-001/L-002)
- `.github/agents/qa.agent.md`
  - Add an explicit “Dependency override regression checks” subsection (L-002)
- `.github/agents/security.agent.md`
  - Add a dependency-audit note about override semver shape + dual advisory DB verification (L-001)
- `.github/agents/devops.agent.md`
  - Tighten Stage 1 Step 5b PWA fallback checklist (L-003)

## Decision Record

- 2026-03-08: User requested codification of L-001/L-002/L-003. Implemented instruction updates immediately (Implementer/QA/Security/DevOps).

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/037-npm-dependency-security-remediation-retrospective.md`
- Prior security chain artifacts:
  - `agent-output/security/closed/037-npm-dependency-vulnerability-audit.md`
  - `agent-output/qa/closed/037-npm-dependency-remediation-qa.md`
  - `agent-output/uat/closed/037-npm-dependency-remediation-uat.md`
  - `agent-output/deployment/v0.7.2.md`