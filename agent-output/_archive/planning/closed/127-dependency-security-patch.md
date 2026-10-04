---
ID: 127
Origin: 127
UUID: a7e3c1f0
Status: Committed
---

# Plan 127 — Dependency Security Patch

| Field          | Value                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------- |
| Plan ID        | 127                                                                                      |
| Target Release | next available patch after current origin/main v0.12.9; confirm at DevOps Stage 1        |
| Epic Alignment | Maintenance / Security Hygiene                                                           |
| Related Issues | None                                                                                     |
| Classification | Hotfix                                                                                   |
| Pipeline       | Abbreviated                                                                              |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/220                                             |
| Created        | 2026-05-12T07:30Z                                                                        |

## Value Statement and Business Objective

As a **maintainer**, I want to apply safe dependency security patches and harden the local audit configuration, so that all high-severity npm advisories are resolved, CI audit gates remain green, and developers have a consistent local audit experience.

## Release Strategy

Standalone — no other known active plans for this version.

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| D1 | Commit `next ^15.5.18` and `resend ^6.12.3` patch bumps already in working tree | [RESOLVED] — These are semver-compatible bumps that resolve 2 high + 6 moderate advisories with zero breaking changes |
| D2 | Do NOT run `npm audit fix --force` | [RESOLVED] — Force path downgrades Next.js to 9.3.3, which is catastrophically breaking |
| D3 | Accept 2 residual moderate advisories (postcss in Next internals) | [RESOLVED] — Build-time only, no runtime exposure, no upstream fix available (Next 9.3.4-canary.0 through 16.3.0-canary.5 affected); CI already gates at `high` level |
| D4 | Create `.npmrc` with `audit-level=high` for local developer consistency | [RESOLVED] — CI already uses `--audit-level=high`; `.npmrc` brings local `npm audit` in line so developers don't see false failures |
| D5 | No version bump in this plan — bundle with next feature release | [RESOLVED] — Pure dependency chore with no user-facing change; avoids unnecessary tag churn |

## Assumptions

1. Working tree already contains the patched `package.json` and `package-lock.json` (verified in current session).
2. CI pipeline (`ci.yml:145`) uses `npm audit --audit-level=high` — confirmed by inspection.
3. Weekly quality gates (`weekly-quality-gates.yml:101-104`) report at moderate but gate at high — confirmed.
4. No `.npmrc` file currently exists in the project root.

## Plan

### Milestone 1: Commit Dependency Security Updates

**Objective**: Land the safe dependency patches that resolve all high-severity advisories.

**What**: Commit the already-modified `package.json` and `package-lock.json` with the following changes:
- `next`: `^15.5.9` → `^15.5.18` (patch security bump)
- `resend`: `^6.6.0` → `^6.12.3` (minor security bump)
- Transitive dependency updates: `@babel/plugin-transform-modules-systemjs`, `fast-uri`, `@formatjs/*` packages

**Acceptance Criteria**:
- `npm install` completes without errors
- `npm audit --audit-level=high` exits 0 (zero high/critical)
- `npm run type-check` passes
- `npm run lint` passes
- `npm run build` passes (or verified in CI)

### Milestone 2: Add `.npmrc` for Local Audit Consistency

**Objective**: Align local developer `npm audit` behavior with CI so residual moderate advisories don't produce confusing local failures.

**What**: Create `.npmrc` in project root with `audit-level=high`.

**Where**: Project root `/Users/NARAFIQ/Projects/uflow/.npmrc`

**Acceptance Criteria**:
- `.npmrc` exists with `audit-level=high`
- Running bare `npm audit` locally exits 0 (since only moderate remain)
- File is committed and not in `.gitignore`

### Milestone 3: Verify CI Pipeline Compatibility

**Objective**: Confirm existing CI audit steps are unaffected.

**What**: Verify that:
- `.github/workflows/ci.yml` line 145 (`npm audit --audit-level=high`) still functions correctly — the explicit `--audit-level` flag overrides `.npmrc` so behavior is unchanged
- `.github/workflows/weekly-quality-gates.yml` lines 101-104 still produce the moderate-level report AND gate at high

**Acceptance Criteria**:
- CI runs green after commit (or local dry-run confirms no regression)
- No workflow file changes needed

## Residual Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| PostCSS XSS in Next internals (GHSA-qx2v-qp2m-jg93) | Moderate (build-time only) | Accept; no runtime exposure; will auto-resolve when Next bumps internal postcss past 8.5.10 |
| `eslint-visitor-keys@5.0.1` engine warning (Node 23.7.0) | Low (warning only) | Cosmetic; does not affect functionality; resolves when Node 24 LTS or eslint-visitor-keys update lands |

## Testing Strategy

- **Unit/Integration**: Not applicable — no source code changes
- **Build verification**: `npm run build` must pass
- **Audit verification**: `npm audit --audit-level=high` must exit 0
- **Lint/Type gate**: `npm run lint` + `npm run type-check` must pass

## Duration Estimates

| Phase          | Estimate | Notes                            |
|----------------|----------|----------------------------------|
| Implementation | 15–30 min | Files already modified; commit + `.npmrc` creation |
| QA             | 10 min   | Build + audit + lint verification |
| DevOps         | 5 min    | Push to main (no version bump)   |

**Uncertainty drivers**: Near-zero — changes are already validated in working tree.

## Validation & Rollback

- **Rollback**: `git revert <commit>` — single commit, trivially reversible
- **Verification**: CI pipeline provides automated gate

## Changelog

| Date               | Author  | Change            | Notes                     |
|--------------------|---------|-------------------|---------------------------|
| 2026-05-12T07:30Z  | planner | Created plan 127  | From dependency audit session |
| 2026-05-12T07:45Z  | implementer | Status update | Implementation started |
| 2026-05-12T08:00Z  | code-reviewer | Status update | Code Review Approved (APPROVED_WITH_COMMENTS) |
| 2026-05-12T09:00Z  | uat | Status update | UAT Approved — all objectives delivered; APPROVED FOR RELEASE |
