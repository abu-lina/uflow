---
ID: 012
Origin: 012
UUID: b61b2d3f
Status: Committed
---

# QA Report: Root-Level Files Placement Cleanup

**Plan Reference**: `agent-output/planning/012-root-level-files-placement-v0.6.0.md`
**Implementation Reference**: `agent-output/implementation/012-root-level-files-placement-implementation.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date | Agent Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-02-23T10:05Z | Code Reviewer → QA | Execute QA for Plan 012 | Started QA: strategy definition + prepared post-implementation verification gates |
| 2026-02-23T10:09Z | QA | Testing executed | Automated gates PASS (type-check, vitest, build); root cleanliness verified; stale nginx template paths found in 2 scripts |
| 2026-02-23T10:12Z | Implementer → QA | Re-run after fix | Fixed stale paths in apply-nginx-fix-production.sh and fix-nginx-uat-mime.sh; all gates PASS; QA Complete |

## Timeline

- **Test Strategy Started**: 2026-02-23T10:05Z
- **Test Strategy Completed**: 2026-02-23T10:05Z
- **Implementation Received**: 2026-02-23T10:05Z
- **Testing Started**: 2026-02-23T10:05Z
- **Testing Completed**: 2026-02-23T10:12Z
- **Final Status**: QA Complete

## Test Strategy (Pre-Implementation)

### User-facing risk summary

This plan is a mechanical refactor (file moves + path reference updates). The primary user-facing risks are operational regressions rather than runtime behavior changes:

- **Broken deployment wiring**: CI workflows or deploy scripts reference old paths (nginx templates, moved scripts), causing UAT/prod deployments to fail.
- **Broken ops runbooks**: emergency scripts (nginx hotfix scripts) fail due to stale paths.
- **Broken documentation links**: moved markdown files leave stale references in docs indexes.
- **Migration discoverability risk**: SQL file moved to `supabase/migrations/` must still be correctly referenced by docs and developers.

### Testing approach

- **Automated gates** (confidence baseline):
  - `npm run type-check`
  - `npx vitest run`
  - `npm run build`
- **Path regression checks** (primary acceptance risk):
  - Grep for stale references to moved nginx templates and moved scripts.
  - Verify root directory contains only the approved entrypoint markdown files.
- **Manual spot-check guidance**:
  - Open `docs/README.md` and (if present) `docs/INDEX.md` to confirm no broken links to moved root docs.

### Testing Infrastructure Requirements

⚠️ TESTING INFRASTRUCTURE NEEDED: None expected.

- **Test framework**: Existing Vitest configuration
- **Build tooling**: Existing Next.js build
- **Additional tooling**: None (use `grep` + targeted file reads)

### Acceptance Criteria

- Repo root contains only intended entrypoints (README.md, START_HERE.md, SECURITY.md, CHANGELOG.md) plus build/tooling config.
- All known deploy/ops scripts and CI workflows reference nginx templates at `deploy/nginx/`.
- Tests + type-check + build succeed.

## Implementation Review (Post-Implementation)

### TDD compliance gate (MANDATORY)

- ✅ TDD exemption applies: this plan is a mechanical refactor with no new runtime functions/classes.
- ✅ Implementation doc includes a TDD Compliance section marking the exemption explicitly.

### Key risk checks to execute

- Verify no scripts still require `nginx-template.conf` or `nginx-uat-template.conf` at repo root.
- Verify CI workflows reference `deploy/nginx/*.conf` for uploads and diff checks.

## Test Execution Results

### Automated gates

- **Type-check**: `npm run type-check` → PASS (exit 0)
- **Unit tests**: `npx vitest run` → PASS
  - Test Files: 16 passed, 1 skipped (17)
  - Tests: 147 passed, 18 skipped (165)
- **Build**: `npm run build` → PASS (exit 0)

### Repo structure spot-checks

- **Root markdown entrypoints** (from `ls -1 *.md`):
  - CHANGELOG.md
  - README.md
  - SECURITY.md
  - START_HERE.md

## Issues / Findings

### ~~[HIGH] Production ops script uses stale nginx template path~~ ✅ RESOLVED

- **Location**: `scripts/apply-nginx-fix-production.sh`
- **Observed**: Script expected `nginx-template.conf` in the repo root (no longer exists after this plan).
- **Resolution**: Updated to use `deploy/nginx/nginx-template.conf` (2026-02-23T10:12Z)

### ~~[MEDIUM] UAT MIME fix script uses stale nginx template path~~ ✅ RESOLVED

- **Location**: `scripts/fix-nginx-uat-mime.sh`
- **Observed**: Script expected `nginx-uat-template.conf` in the repo root (no longer exists after this plan).
- **Resolution**: Updated to use `deploy/nginx/nginx-uat-template.conf` (2026-02-23T10:12Z)

### [INFO] Build logs include dynamic-server-usage messages

- **Observed**: `npm run build` logs include `Dynamic server usage` messages for routes like `/pwa-start` and `/auth-debug`.
- **Impact**: Build still succeeds (exit 0); treat as pre-existing behavior unless correlated with user-facing regressions.

---

## Re-validation Results (2026-02-23T10:12Z)

- **Type-check**: PASS
- **Tests**: 147 passed, 18 skipped (165 total) — Test Files: 16 passed, 1 skipped
- **Build**: PASS
- **Stale path check**: No remaining stale nginx template paths in scripts/

---

✅ QA Complete — Ready for UAT
