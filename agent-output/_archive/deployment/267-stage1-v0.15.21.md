---
ID: 267
Origin: 267
UUID: ed174b2e
Status: Active
---

# Deployment Record: v0.15.21 — Release (Plan 267)

**Plan Reference**: `agent-output/planning/closed/267-food-search-scope-mismatch-plan.md`  
**Target Version**: v0.15.21  
**Type**: Bugfix patch  
**Environment**: UAT (https://uat.ummahflow.com); production (https://ummahflow.com) pending DF-1 & MIG-135  
**Agent**: devops  
**Date**: 2026-09-28

## Changelog

| Date (UTC) | Agent  | Change                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-28 | devops | Stage 1: version pre-flight confirmed v0.15.21 (working target: origin/main v0.15.20 + 1 patch), version confirmed in package.json/package-lock.json/CHANGELOG.md, open-actions tracker created (`267-open-actions.md`), chain docs moved to `closed/` with status `Committed`, local commit prepared. Changes stay local until explicit Stage 2 release approval. |

---

## Release Context

| Field              | Value                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID            | 267                                                                                                                                |
| Epic               | Admin moderation in discovery (Plan 058 contract) / Food search (Plan 266)                                                         |
| Classification     | Bugfix (Admin "All" Status Scope on Food Search / UAT discrepancy)                                                                 |
| GitHub Issue       | [#435](https://github.com/abu-lina/uflow/issues/435)                                                                               |
| Plan doc           | `agent-output/planning/closed/267-food-search-scope-mismatch-plan.md`                                                              |
| Implementation doc | `agent-output/implementation/closed/267-food-search-scope-mismatch-implementation.md`                                              |
| Critique doc       | `agent-output/critiques/closed/267-food-search-scope-mismatch-plan-critique.md`                                                    |
| QA doc             | `agent-output/qa/closed/267-food-search-scope-mismatch-qa.md`                                                                      |
| UAT doc            | `agent-output/uat/closed/267-food-search-scope-mismatch-uat.md`                                                                    |
| Open Actions doc   | `agent-output/planning/267-open-actions.md` (MIG-135, DF-1, DF-2, DF-3)                                                            |
| QA Status          | QA Complete (TypeScript clean, delta-lint clean, full lint 0 errors, 2668 unit/integration tests pass, 37/37 migration tests pass) |
| UAT Status         | CONDITIONAL APPROVAL (Value statement delivered; live admin browser validation deferred to post-migration deployment DF-1)         |

**Plans included in this release**: Plan 267 (single-plan patch, v0.15.21)

---

## Version Pre-Flight

| Check                       | Command                                                                | Result                                |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| Latest tag on origin        | `git fetch origin --tags && git tag --list "v*" \| sort -V \| tail -5` | `v0.15.19` (latest released tag)      |
| Current origin/main version | `git show origin/main:package.json \| grep '"version"'`                | `"version": "0.15.20"`                |
| Target working version      | origin/main version + 1 patch                                          | `v0.15.21` (FREE, tag does not exist) |
| `package.json`              | Post-bump                                                              | `0.15.21`                             |
| `package-lock.json`         | Post-bump                                                              | `0.15.21`                             |
| `CHANGELOG.md` heading      | Post-bump                                                              | `## [Unreleased] - 2026-09-28`        |

---

## Stage 1: Pre-Release Verification

### Branch & Sync

| Check      | Result                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Branch     | `fix/267-food-search-scope-mismatch`                                                            |
| Tracking   | `origin/main`                                                                                   |
| Divergence | `git rev-list --left-right --count origin/main...HEAD` → `0 1` (0 behind, 1 ahead: docs commit) |

### Packaging Integrity & Technical Gates

| Gate                         | Result  | Evidence                                                                             |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------ |
| TypeScript strict type-check | ✅ PASS | `npm run type-check` — 0 errors                                                      |
| Delta ESLint (changed files) | ✅ PASS | `git diff --name-only -z -- '*.ts' '*.tsx' \| xargs -0 npx eslint` — 0 errors        |
| Full Repository ESLint       | ✅ PASS | `npm run lint` — 0 errors, 148 pre-existing warnings                                 |
| Focused Plan 267 regressions | ✅ PASS | 9 files / 149 tests passed                                                           |
| PGlite migration tests       | ✅ PASS | `134-desktop-search-partial.test.ts` — 37/37 passed (covering Migration 134 + 135)   |
| Full Vitest test suite       | ✅ PASS | `CI=1 .github/skills/testing-patterns/scripts/run-tests.sh .` — 2668 passed, 24 skip |
| Production Next.js build     | ✅ PASS | 102/102 static pages compiled cleanly with isolated dummy config                     |
| i18n key parity              | ✅ PASS | `npm run i18n:check` — all 6 locales key-complete vs English                         |
| Version consistency          | ✅ PASS | package.json `0.15.21` = package-lock.json `0.15.21`                                 |

---

## Stage 1 Local Commit Details

- **Commit type**: `fix(search)`
- **Subject**: Return all review statuses for admin search overview
- **Referenced Plan**: `Refs PLAN-267`
- **Pushed**: NO (Changes stay local until explicit Stage 2 release approval)

---

## Deferred Post-Deploy Obligations

| ID      | Item                                                                                             | Owner                | Trigger                                           | Status |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------- | ------ |
| MIG-135 | Apply Migration 135 to shared UAT/PROD database (`rdtdtcfntopcxcigkqoq`)                         | DevOps               | Prior to application deployment in Stage 2        | Open   |
| DF-1    | Post-Merge UAT live admin confirmation on `uat.ummahflow.com` for Munchies pending row under All | DevOps / QA Operator | Deploy to UAT after Migration 135 apply           | Open   |
| DF-2    | Map / Near-Me / Home "All" Status Alignment (FU-1 / D8)                                          | Planner              | Allocation of follow-up Plan ID by control window | Open   |
| DF-3    | GitHub Issue #435 Body Refresh (N3)                                                              | DevOps               | At Stage 1/2 artifact preparation                 | Open   |

---

## Stage 2: Release Execution

**User Confirmation**: ⏳ Pending (Stage 1 only)  
**Confirmed by**: Pending

### Release Execution Log

| Step         | Command                              | Result     |
| ------------ | ------------------------------------ | ---------- |
| Push branch  | `git push origin [branch]`           | ⏳ Pending |
| Tag creation | `git tag -a v[X.Y.Z] <sha> -m "..."` | ⏳ Pending |
| Tag push     | `git push origin v[X.Y.Z]`           | ⏳ Pending |
