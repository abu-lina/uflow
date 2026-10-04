# CI Failures Analysis — Task #157

**Date**: 2026-06-09
**Status**: COMPLETED
**Pipeline**: Bugfix — Phase 1 (Analyst)
**Trigger**: GitHub Actions run #27125184208 (PR #248, dependabot bump of codecov/codecov-action 5.5.3 → 7.0.0)

---

## Summary

The CI pipeline triggered by dependabot PR #248 failed in 4 out of 6 jobs. **None of the failures are caused by the codecov-action bump itself.** All failures are pre-existing issues on the `main` branch that the PR CI run surfaced. The dependabot change is a one-line version bump (line 77 of `.github/workflows/ci.yml`) from `codecov/codecov-action@1af5884...` (v5.5.3) to `codecov/codecov-action@fb8b358...` (v7.0.0).

---

## Failure #1: Run Tests (exit code 1)

**Root Cause**: Migration test `src/__tests__/migrations/006-phase4-semantic-constraints-tdd.test.ts` fails because the test expects an idempotent enum guard in `0061_phase4_semantic_constraints.sql`, but it was moved to `0060_plan_145_enum_value.sql`.

**Details**:
- The test checks file `0061_phase4_semantic_constraints.sql` for pattern: `IF NOT EXISTS (SELECT 1 ... pg_enum ... listing_type_enum ... 'ummah'`
- Migration `0061` has a comment at line 10-11: `"1) Extend enum with idempotent guard — MOVED to 0060_plan_145_enum_value.sql"`
- Migration `0060_plan_145_enum_value.sql` contains the actual idempotent guard (`IF NOT EXISTS ... ALTER TYPE ADD VALUE 'ummah'`)
- The test was written before this refactoring and was never updated

**Failing assertion (line 17)**:
```typescript
expect(sql).toMatch(/IF NOT EXISTS \(\s*SELECT 1[\s\S]*pg_enum[\s\S]*listing_type_enum[\s\S]*'ummah'/i);
```

**Confidence**: HIGH — Confirmed locally with `npx vitest run`.

---

## Failure #2: Security Audit (exit code 1)

**Root Cause**: `npm audit --audit-level=high` detects 2 critical and 4 moderate vulnerabilities:

| Severity | Package | Vulnerability | Fix |
|----------|---------|---------------|-----|
| CRITICAL | vitest <3.2.6 | GHSA-5xrq-8626-4rwp (arbitrary file read/execution when UI server listening) | `npm audit fix` updates to 3.2.6+ |
| Moderate | postcss <8.5.10 | GHSA-qx2v-qp2m-jg93 (XSS in CSS Stringify) | `npm audit fix --force` (requires next upgrade) |
| Moderate | brace-expansion 5.0.2-5.0.5 | GHSA-jxxr-4gwj-5jf2 (DoS) | `npm audit fix` |
| Moderate | ws 8.0.0-8.20.0 | GHSA-58qx-3vcg-4xpx (memory disclosure) | `npm audit fix` |

**Note on `continue-on-error`**: The security audit step has `continue-on-error: true`, which should prevent the job from failing. However, the job still shows as "Failure". This may be a GitHub Actions runner behavior where the job's conclusion is determined by the npm audit process exit code despite `continue-on-error`.

**Confidence**: HIGH — Confirmed locally.

---

## Failure #3: Build Verification (exit code 1)

**Root Cause**: Cannot reproduce locally without proper Supabase secrets. Possible causes:

1. **Most Likely**: The build itself fails. The build requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` secrets, which should be available for same-repo PRs. If the Supabase URL validation passes, the build should succeed.

2. **Performance budget check fails** (`npm run perf:check-budgets`): This reads `.next/BUILD_OUTPUT.txt` and checks bundle sizes against `scripts/perf/budgets.json`. If the budget file is missing or bundle sizes exceed thresholds, it exits with code 1. However, the budgets check can't run if the build itself failed.

3. **Build output validation fails**: The "Check build output" step checks if `.next` directory exists. If the build succeeded but the directory wasn't created (unlikely), this would fail.

**Note**: The build succeeded locally (with placeholder URL that was rejected by validation, but still produced `.next` output). The actual CI build failure needs the CI logs to diagnose precisely.

**Confidence**: MEDIUM — Needs CI logs for confirmation.

---

## Failure #4: Lint & Type Check (annotations only, may not fail job)

**Root Cause**: Pre-existing lint warnings/errors in the codebase. 163 problems (37 errors, 126 warnings) across multiple files:

**Component code** (props sorting issues):
- `src/app/(dashboard)/dashboard/providers/[id]/edit/menu/page.tsx`
- `src/app/(dashboard)/dashboard/providers/[id]/edit/locations/page.tsx`
- `src/app/(dashboard)/dashboard/providers/[id]/edit/hours/page.tsx`
- `src/app/(dashboard)/dashboard/providers/[id]/edit/delivery/page.tsx`
- `src/app/(dashboard)/dashboard/providers/[id]/edit/category/page.tsx`

**Test files** (non-null assertions, unused vars, etc.):
- `src/__tests__/components/providers/contact-intent-tracking.test.tsx`
- `src/__tests__/components/UnifiedGallery.test.tsx`
- `src/__tests__/components/ProviderCard.test.tsx`
- `src/__tests__/components/ProviderCard-multi-location.test.tsx`
- `src/__tests__/components/MobileProviderDetail.safe-area.test.tsx`
- `src/__tests__/app/community-service-transform.test.ts`
- `src/__tests__/app/community-service-detail-page.server-path.test.tsx`
- `src/__tests__/api/admin/upload-certificate.test.ts`

**Note**: ESLint exits with code 0 despite these errors (warnings configured as errors). TypeScript type-check passes. The "Lint & Type Check" job **may not actually fail** in CI — the annotations are informational.

**Confidence**: HIGH — Confirmed locally.

---

## Failure #5: CI Summary (exit code 1)

**Root Cause**: Aggregate job that fails because upstream jobs (test, build, security) failed. The summary job checks:
```bash
if [ all jobs == "success" ]; then exit 0; else exit 1; fi
```
This is expected behavior — it will pass once the upstream jobs pass.

**Confidence**: HIGH.

---

## Items NOT Caused by the PR

### Codecov-action v7.0.0 bump
- v7.0.0 changes: GPG signing key migration from `codecovsecurity` to `codecovsecops`
- No breaking changes to action inputs (`token`, `fail_ci_if_error` are unchanged)
- The upload step has `continue-on-error: true`, so even if it fails, it won't fail the job
- **Status**: Safe to merge, but blocked by pre-existing CI failures

### Dependabot label issue
- PR mentions labels `ci` and `dependencies` not found
- `.github/dependabot.yml` references these labels but they don't exist in the repo
- **Non-blocking**, but should be addressed for label hygiene

---

## Recommended Fixes (for Planner)

### P0 — Must Fix (blocks CI from passing)

1. **Fix migration test (Test #4 line 17)**: Update `src/__tests__/migrations/006-phase4-semantic-constraints-tdd.test.ts` to either:
   - Option A: Remove the idempotent guard check from 0061 test (since it's now in 0060)
   - Option B: Add a separate test for 0060's idempotent guard
   - Option C: Check both files in the existing test

2. **Fix critical vitest vulnerability**: Run `npm audit fix` to update vitest from 3.1.2 to 3.2.6+

3. **Investigate and fix build failure**: Check CI logs to determine exact cause. If build passes with proper secrets, no fix needed. If budgets check fails, update budgets.

### P1 — Should Fix (improves CI quality)

4. **Address lint errors**: Clean up pre-existing lint warnings in provider edit pages and test files (props sorting, unused vars, non-null assertions)

5. **Create dependabot labels**: Create `ci` and `dependencies` labels in the repo

### P2 — Nice to Have

6. **Fix security audit job resilience**: Consider changing `continue-on-error: true` behavior or switching to `npm audit --audit-level=critical` with proper error handling

---

## Gate Condition

✅ Analysis document exists at `agent-output/analysis/157-ci-failures-analysis.md`

**Next Phase**: Planner — needs to create implementation plan addressing P0 items.
