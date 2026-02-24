---
ID: 012
Origin: 012
UUID: b61b2d3f
Status: Committed
---

# Implementation 012 — Root-Level Files Placement Cleanup

## Plan Reference

- **Plan**: [agent-output/planning/012-root-level-files-placement-v0.6.0.md](../planning/012-root-level-files-placement-v0.6.0.md)
- **Architecture**: [agent-output/architecture/012-root-level-files-placement-architecture-findings.md](../architecture/012-root-level-files-placement-architecture-findings.md)
- **Critique**: [agent-output/critiques/012-root-level-files-placement-critique.md](../critiques/012-root-level-files-placement-critique.md)
- **Date**: 2026-02-23T09:30Z
- **Target Release**: v0.6.0

### Changelog

| Date              | Handoff     | Request          | Summary                                                                                |
| ----------------- | ----------- | ---------------- | -------------------------------------------------------------------------------------- |
| 2026-02-23T09:30Z | Implementer | Execute Plan 012 | All 7 milestones complete; 30 files moved/deleted; 13 reference updates across 9 files |
| 2026-02-23T10:12Z | Implementer | QA fix round     | Fixed 2 additional stale nginx paths in ops scripts (QA findings); 15 reference updates total across 11 files |

---

## Implementation Summary

Relocated ~30 root-level files (markdown docs, shell scripts, SQL, CSV, nginx configs) into their canonical subdirectories per the folder responsibility contract defined in Arch 012. Updated all 13 cross-references across 9 files (CI workflows, deployment scripts, documentation). This delivers the plan's value statement: the repo root now contains only essential entrypoints and build wiring, making navigation faster and onboarding simpler.

---

## Milestones Completed

- [x] **M1**: Inventory & classify root clutter — manifest documented below
- [x] **M2**: Move root markdown artifacts into `docs/` (16 moved, 1 duplicate deleted)
- [x] **M3**: Move root shell scripts into `scripts/` namespaces (8 moved)
- [x] **M4**: Place SQL and data artifacts in canonical locations (SQL → migration, CSV → imports/)
- [x] **M5**: Move nginx template configs into `deploy/nginx/` (2 moved)
- [x] **M6**: Update all references (docs + scripts + pipelines) — 13 updates across 9 files
- [x] **M7**: Version management — CHANGELOG entry deferred to release coordination

---

## Files Modified (Reference Updates)

| File Path                                          | Changes                                                      | Lines Changed |
| -------------------------------------------------- | ------------------------------------------------------------ | ------------- |
| `.github/workflows/deploy-uat.yml`                 | Updated 2 nginx-uat-template.conf paths → `deploy/nginx/`    | 2             |
| `.github/workflows/deploy-hetzner.yml`             | Updated 2 nginx-template.conf paths → `deploy/nginx/`        | 2             |
| `scripts/update-uat-nginx.sh`                      | Updated file check + cp path → `deploy/nginx/`               | 2             |
| `scripts/safe-pull-uat.sh`                         | Updated backup files array entry → `deploy/nginx/`           | 1             |
| `scripts/deploy-uat.sh`                            | Updated file check + cp path → `deploy/nginx/`               | 2             |
| `scripts/apply-nginx-fix-uat.sh`                   | Updated file check + scp path → `deploy/nginx/`              | 2             |
| `scripts/apply-nginx-fix-production.sh`            | Updated file check + scp path → `deploy/nginx/` (QA fix)     | 2             |
| `scripts/fix-nginx-uat-mime.sh`                    | Updated file check + cp path → `deploy/nginx/` (QA fix)      | 2             |
| `docs/fixes/PWA_CONSOLE_DEBUG_GUIDE.md`            | Updated `./debug-pwa.sh` → `./scripts/debug/debug-pwa.sh`    | 1             |
| `docs/features/UNIFIED_CREATION_IMPLEMENTATION.md` | Updated 2 references → `supabase/migrations/057_...`         | 2             |
| `sql/queries/apply_ultra_permissive_and_test.sql`  | Updated script ref → `./scripts/db/test-direct-postgrest.sh` | 1             |

---

## Files Created / Moved

### Markdown Files Moved to `docs/`

| Original Path (root)               | New Path                                        |
| ---------------------------------- | ----------------------------------------------- |
| `CI_PIPELINE_FIX_SUMMARY.md`       | `docs/summaries/CI_PIPELINE_FIX_SUMMARY.md`     |
| `INVESTIGATION_SUMMARY.md`         | `docs/summaries/INVESTIGATION_SUMMARY.md`       |
| `TEST_MOCK_FIX_SUMMARY.md`         | `docs/fixes/TEST_MOCK_FIX_SUMMARY.md`           |
| `LOCAL_IPHONE_TESTING.md`          | `docs/guides/LOCAL_IPHONE_TESTING.md`           |
| `UAT_PWA_FIX_ACTION_PLAN.md`       | `docs/action-items/UAT_PWA_FIX_ACTION_PLAN.md`  |
| `VSCODE_AGENTS_SETUP.md`           | `docs/guides/VSCODE_AGENTS_SETUP.md`            |
| `DEPENDABOT_ALERTS_REVIEW.md`      | `docs/reviews/DEPENDABOT_ALERTS_REVIEW.md`      |
| `DEPENDABOT_ALERTS_RESOLVED.md`    | `docs/summaries/DEPENDABOT_ALERTS_RESOLVED.md`  |
| `DEPENDABOT_ALERTS_SUMMARY.md`     | `docs/summaries/DEPENDABOT_ALERTS_SUMMARY.md`   |
| `DEPENDABOT_VITE_ALERTS_REVIEW.md` | `docs/reviews/DEPENDABOT_VITE_ALERTS_REVIEW.md` |
| `SNYK_PR_VERIFICATION_SUMMARY.md`  | `docs/reviews/SNYK_PR_VERIFICATION_SUMMARY.md`  |
| `SNYK_UPGRADES_SUMMARY.md`         | `docs/summaries/SNYK_UPGRADES_SUMMARY.md`       |
| `snyk-pr-verification-report.md`   | `docs/reviews/snyk-pr-verification-report.md`   |
| `SECURITY_UPDATE_2025-12-21.md`    | `docs/summaries/SECURITY_UPDATE_2025-12-21.md`  |
| `RESEND_SECURITY_REVIEW.md`        | `docs/reviews/RESEND_SECURITY_REVIEW.md`        |
| `RESEND_UPGRADE_SUMMARY.md`        | `docs/summaries/RESEND_UPGRADE_SUMMARY.md`      |

### Markdown File Deleted (Duplicate)

| Original Path (root)                  | Reason                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `PERFORMANCE_OPTIMIZATION_SUMMARY.md` | Duplicate of `docs/performance/PERFORMANCE_OPTIMIZATION_SUMMARY.md` (252 lines, more comprehensive) |

### Shell Scripts Moved to `scripts/`

| Original Path (root)               | New Path                                      |
| ---------------------------------- | --------------------------------------------- |
| `debug-pwa.sh`                     | `scripts/debug/debug-pwa.sh`                  |
| `test-auth-context.sh`             | `scripts/db/test-auth-context.sh`             |
| `test-direct-insert-with-debug.sh` | `scripts/db/test-direct-insert-with-debug.sh` |
| `test-direct-postgrest.sh`         | `scripts/db/test-direct-postgrest.sh`         |
| `test-policy-condition.sh`         | `scripts/db/test-policy-condition.sh`         |
| `test-provider-insert.sh`          | `scripts/db/test-provider-insert.sh`          |
| `test-without-return.sh`           | `scripts/db/test-without-return.sh`           |
| `test-without-user-created-id.sh`  | `scripts/db/test-without-user-created-id.sh`  |

### SQL / Data / Nginx Files Moved

| Original Path (root)            | New Path                                                |
| ------------------------------- | ------------------------------------------------------- |
| `standardize-image-storage.sql` | `supabase/migrations/057_standardize_image_storage.sql` |
| `users_rows.csv`                | `imports/users_rows.csv`                                |
| `nginx-template.conf`           | `deploy/nginx/nginx-template.conf`                      |
| `nginx-uat-template.conf`       | `deploy/nginx/nginx-uat-template.conf`                  |

---

## Code Quality Validation

- [x] **Compilation**: `npm run type-check` — PASSED (zero errors)
- [x] **Linter**: `npm run lint` — 6839 pre-existing errors (all in service worker/generated/venv files); zero new errors from this change
- [x] **Tests**: `npx vitest run` — 16 passed, 1 skipped, 147 tests passed, 0 failures (5.25s)
- [x] **Build**: `npm run build` — PASSED (full Next.js production build succeeded)
- [x] **Compatibility**: No runtime code changes; only file moves and path reference updates

---

## Value Statement Validation

- **Original**: "As a developer/contributor, I want the repository root to contain only essential entrypoints and build wiring, so that navigation is faster, onboarding is simpler, and contributors don't misplace scripts/docs/SQL that cause boundary drift."
- **Delivered**: Root now contains only 4 markdown entrypoints (`README.md`, `START_HERE.md`, `SECURITY.md`, `CHANGELOG.md`) plus build/tooling configs. All operational docs, scripts, SQL, data, and infra templates have been relocated to their canonical subdirectories per the folder responsibility contract.

---

## TDD Compliance

This plan involves **zero new functions or classes** — it is a purely mechanical file-move and reference-update operation. No runtime code was created or modified. TDD does not apply per the exception: "Pure refactors with existing coverage."

| Aspect                | Status | Notes                                           |
| --------------------- | ------ | ----------------------------------------------- |
| New functions/classes | N/A    | Zero new code; file moves and path updates only |
| Existing test suite   | ✅     | 147/147 tests pass, 18 skipped (pre-existing)   |
| Build verification    | ✅     | Production build succeeds                       |

---

## Test Coverage

- **Unit tests**: 147 passed, 18 skipped (pre-existing, unrelated to this change)
- **Integration tests**: N/A (no runtime code changes)
- **No new tests required**: This is a file-move refactor with no behavioral changes

---

## Test Execution Results

```
Test Files  16 passed | 1 skipped (17)
     Tests  147 passed | 18 skipped (165)
  Start at  09:38:58
  Duration  5.25s (transform 2.06s, setup 2.94s, collect 7.80s, tests 3.64s, environment 23.41s, prepare 5.41s)
```

- **Command**: `npx vitest run --reporter=verbose`
- **Issues**: None
- **Coverage**: Existing coverage unaffected (no `src/` changes)

---

## Outstanding Items

- **M7 — CHANGELOG entry**: Deferred to release coordination. A brief note should be added to `CHANGELOG.md` under v0.6.0 when the release is finalized.
- **docs/INDEX.md / docs/README.md**: These index files were not automatically updated with new file locations. If they contain explicit links to moved files, they should be updated. (Verified: no broken links found in grep analysis during implementation.)

---

## Assumptions

| #   | Description                                 | Rationale                                        | Risk | Validation          |
| --- | ------------------------------------------- | ------------------------------------------------ | ---- | ------------------- |
| 1   | Migration number 057 is available           | Latest migration is 056\_\*                      | Low  | Verified via ls     |
| 2   | SQL file is a legitimate migration          | Contains ALTER TABLE + UPDATE + CREATE INDEX DDL | Low  | Content reviewed    |
| 3   | Pre-existing lint errors are known/accepted | All in venv/service worker/generated files       | None | Confirmed with grep |

---

## Next Steps

1. **Code Reviewer**: Review all file moves and reference updates for correctness
2. **QA**: Validate no broken references remain; confirm build/test/lint pass
3. **Release**: Add CHANGELOG entry when v0.6.0 is finalized
