---
ID: 157
Origin: 157
UUID: f6a2c8e3
Status: Committed
---

# Deployment Record: CI Failures Fix (#157)

**Date**: 2026-06-09
**Pipeline**: Bugfix — Phase 6 (DevOps)
**QA Document**: `agent-output/qa/157-ci-failures-fix-qa.md`

## Stage 1 Commit

| Field | Value |
|-------|-------|
| **Branch** | main |
| **Commit Hash** | `583d5986` |
| **Commit Message** | `fix(ci): resolve pre-existing CI failures (test, audit, build)` |
| **Files Changed** | 3 |
| **Push Status** | NOT PUSHED |

### Files Committed

1. `package-lock.json` — vitest 3.2.6 audit fix, @types/cheerio removal
2. `src/__tests__/migrations/006-phase4-semantic-constraints-tdd.test.ts` — fixed stale enum guard
3. `src/__tests__/migrations/0060-plan-145-enum-value-tdd.test.ts` — new TDD test for 0060 idempotent enum guard

### QA Gate

All P0 checks passed (security audit, migration tests 6/6, type check, build 145 pages, performance budgets). Lint is a pre-existing P1/deferred failure. Verdict: APPROVED FOR RELEASE.

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-06-09 | DevOps | Stage 1 commit `583d5986` — NOT PUSHED |
