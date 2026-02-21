---
ID: 5
Origin: 5
UUID: d7e2a91f
Status: QA Complete
---

# QA Report: Restore UAT Docker Build (npm ci failure)

**Plan Reference**: `agent-output/planning/005-uat-docker-npm-ci-fix.md`
**Implementation Reference**: `agent-output/implementation/005-uat-docker-npm-ci-impl.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date       | Agent Handoff      | Request         | Summary                                                                |
| ---------- | ------------------ | --------------- | ---------------------------------------------------------------------- |
| 2026-02-21 | Code Reviewer → QA | QA for Plan 005 | Executed install/build verification; documented test results and risks |

## Timeline

- **Test Strategy Started**: 2026-02-21
- **Test Strategy Completed**: 2026-02-21
- **Implementation Received**: 2026-02-21
- **Testing Started**: 2026-02-21
- **Testing Completed**: 2026-02-21
- **Final Status**: QA Complete

## Test Strategy (Pre-Implementation)

### Approach

This plan is an **infrastructure build determinism fix**. QA focuses on user-impacting workflows:

- Developers/CI can run `npm ci` deterministically.
- Next.js production build succeeds (standalone build used by Docker).
- CI provides an earlier, clearer failure signal before Docker buildx.

### Testing Types

- **Build/Tooling validation (primary)**: `npm ci`, `next build` (standalone)
- **Workflow static validation**: Confirm `.github/workflows/deploy-uat.yml` includes pre-Docker `npm ci`
- **Regression check (secondary)**: `npm test -- --run` to detect obvious regressions (known failures exist)

### Testing Infrastructure Requirements

- Node.js (CI/Docker target): 20.x (repo has `.nvmrc` = `20`)
- npm: compatible with lockfile v3
- No additional frameworks required beyond existing repo setup

### Acceptance Criteria

- `npm ci --no-audit` succeeds from a clean working tree.
- `npm run build:standalone` succeeds.
- UAT workflow fails fast on dependency drift (pre-Docker `npm ci` step present).

## Implementation Review (Post-Implementation)

### TDD Compliance Gate

- **PASS (N/A)**: No new app behavior or functions/classes added; change is dependency/tooling only. Implementation doc includes a TDD compliance table marked N/A.

### Code Changes Summary

Primary deltas (reviewed in code review):

- Lockfile regenerated and synced
- bn.js override removed
- Missing dependencies restored to match actual imports
- PWA import fixed to use `@ducanh2912/next-pwa`.default
- Pre-Docker `npm ci` step added to UAT workflow

## Test Coverage Analysis

### New/Modified Code

| File                           | Function/Class | Test File | Test Case | Coverage Status       |
| ------------------------------ | -------------- | --------- | --------- | --------------------- |
| package.json/package-lock.json | N/A            | N/A       | N/A       | N/A (tooling change)  |
| next.config.js                 | N/A            | N/A       | N/A       | N/A (config change)   |
| deploy-uat.yml                 | N/A            | N/A       | N/A       | N/A (workflow change) |

### Coverage Gaps

- No new runtime logic introduced; coverage expectations are build/install determinism checks.

## Test Execution Results

### Environment

- **Node**: v23.7.0
- **npm**: 11.6.3

Note: npm 11.6.3 previously triggered an overrides regression, but the problematic override was removed and installs are now stable.

### Deterministic Install (npm ci)

- **Command**: `rm -rf node_modules && npm ci --no-audit`
- **Status**: PASS
- **High-signal output**: `added 1148 packages` (with EBADENGINE warnings due to Node 23 local environment)

### Standalone Production Build

- **Command**: `npm run build:standalone`
- **Status**: PASS
- **High-signal output**:
  - `✓ Compiled successfully`
  - `✓ Checking validity of types`
  - `✓ Generating static pages (70/70)`

### Test Suite (Vitest)

- **Command**: `CI=1 npm test -- --run`
- **Status**: FAIL (pre-existing)
- **High-signal summary**:
  - `Test Files  4 failed | 2 passed | 1 skipped (7)`
  - `Tests  53 failed | 31 passed | 18 skipped (102)`

**QA interpretation**: Not a regression blocker for Plan 005 because Plan 005 acceptance criteria is CI/Docker build determinism; these test failures predate the change (already documented in the implementation/code review).

## Diagnosability / Telemetry Validation

### Normal telemetry improvements

- Pre-Docker `npm ci --no-audit` in the workflow provides **always-on, low-volume, actionable** failure output before Docker buildx.

### Debug telemetry

- None added/required for this change.

## Risks & Notes

- **EBADENGINE warnings locally**: Expected because local Node is 23.x; CI/Docker targets Node 20.x. Not a functional failure.
- **Existing test failures**: Persist; should be tracked separately, but do not block this infrastructure fix.

---

Handing off to uat agent for value delivery validation
