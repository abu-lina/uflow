---
ID: 033
Origin: 033
UUID: 7a1c4e2b
Status: Code Review Approved
---

# Code Review — 033 Performance Optimization Guardrails + Caching Alignment

**Reviewer**: Code Reviewer Agent
**Date**: 2026-03-07
**Plan**: [033-performance-optimization-v0.6.11.md](../planning/033-performance-optimization-v0.6.11.md)
**Implementation**: [033-performance-optimization-implementation.md](../implementation/033-performance-optimization-implementation.md)
**Verdict**: ✅ **APPROVED_WITH_COMMENTS**

---

## Scope

Files listed in the Implementation doc's "Files Modified" and "Files Created" tables:

| # | File | Type | Reviewed |
|---|------|------|---------|
| 1 | `next.config.js` | Modified | ✅ |
| 2 | `src/app/api/providers/search/route.ts` | Modified | ✅ |
| 3 | `package.json` | Modified | ✅ |
| 4 | `.github/workflows/ci.yml` | Modified | ✅ |
| 5 | `CHANGELOG.md` | Modified | ✅ |
| 6 | `src/lib/telemetry/perf-telemetry.ts` | Created | ✅ |
| 7 | `src/__tests__/lib/telemetry/perf-telemetry.test.ts` | Created | ✅ |
| 8 | `scripts/perf/budgets.json` | Created | ✅ |
| 9 | `scripts/perf/check-budgets.js` | Created | ✅ |

**Path Refactor / File-Move Checklist**: No file moves or renames in this implementation. N/A.

**Agent Spec / Cross-Workspace Path Checklist**: No agent specs or cross-workspace path references modified. N/A.

---

## Positive Observations

Before findings, the following is explicitly good engineering:

1. **ADR-004 alignment is clean** — `next.config.js` removal of the global `/api/:path*` override is surgical. The replacement comment block clearly states the architectural decision and why global overrides are wrong. Future maintainers will understand the rationale immediately.

2. **TDD compliance is genuine** — The implementation doc records the red→green sequence with ModuleNotFoundError evidence. The 6 tests in `perf-telemetry.test.ts` cover positive paths, error recording, and a privacy assertion that `queryParams` content is not serialized to output. This is not retroactive testing; it's TDD done right.

3. **Privacy-safe telemetry design** — `logRequestTiming` explicitly excludes `queryParams` from both production JSON output and dev human-readable output. The PII test (`"halal restaurant" not in output`) documents the privacy contract in code.

4. **Correlation IDs on all response paths** — Both the success path and the catch block attach `X-Correlation-ID` to the response headers. This is a common omission in instrumented routes; it was done correctly here.

5. **`measureDependency` uses a finally block for timing** — This ensures timing is always recorded even if the wrapped function throws, before the error is re-thrown to the caller. The implementation handles the error path correctly.

6. **CI pipeline ordering is correct** — `tee .next-build-output.txt` → `mv .next-build-output.txt .next/BUILD_OUTPUT.txt` → `npm run perf:check-budgets` executes in guaranteed order. With GitHub Actions' default `set -eo pipefail`, any step failure halts the pipeline before budget checks run, preventing stale data.

7. **Budget thresholds include headroom** — Current actuals are 87.7% / 82.7% / 87.5% of thresholds, providing ~12-17% growth budget before CI breaks. Thresholds are grounded in real measurements.

---

## Findings

### F1 — LOW: Hardcoded baseline fallback in `check-budgets.js` may mislead local developers

**File**: [scripts/perf/check-budgets.js](../../scripts/perf/check-budgets.js) (~lines 237–250)

**Description**: The `main()` function has a three-tier fallback:
1. Read `BUILD_OUTPUT.txt` (the real path).
2. Call `getBuildStats()` to read build manifests (reasonable fallback).
3. If manifests yield no routes, substitute hardcoded baseline values from Plan 033 measurement (`/providers: 307kB, /providers/[provider_id]: 182kB`).

Tier 3 uses values that are guaranteed to pass all budgets. A developer who runs `npm run perf:check-budgets` locally without first running a build will see "✅ All performance budgets pass!" with fake data. The console does print "Using baseline values from Plan 033 measurement" but the exit code is `0`, which misleads automated local workflows (e.g., pre-push hooks or IDE tasks that check exit codes).

**In CI**: This path is never reached — the workflow builds first and the `mv` step ensures `BUILD_OUTPUT.txt` exists. CI reliability is not affected.

**Recommended fix**: Differentiate behaviour by environment:

```javascript
// Before the hardcoded fallback block
if (process.env.CI) {
  console.error('❌ BUILD_OUTPUT.txt not found in CI. Check workflow step ordering.');
  process.exit(1);
}
// Existing guidance + baseline fallback for local dev only
```

This preserves the helpful local-dev UX while making CI fail fast if the file setup was ever misconfigured.

---

### F2 — LOW: `budgets.json` references a non-existent schema file

**File**: [scripts/perf/budgets.json](../../scripts/perf/budgets.json) line 2

**Description**: `"$schema": "./budgets.schema.json"` references `scripts/perf/budgets.schema.json`, which does not exist in the repository. This causes IDEs with JSON schema validation (VS Code) to show a warning (`Cannot resolve schema for URI`) and suppresses IntelliSense inside the file.

**No runtime impact** — `$schema` is an IDE-only hint. The budget checker reads the file with `JSON.parse` and does not validate schema.

**Recommended fix**: Either remove the `$schema` field (simplest), or create a minimal JSON Schema file at `scripts/perf/budgets.schema.json`.

---

### F3 — LOW (informational): `generateCorrelationId()` fallback is dead code for this project

**File**: [src/lib/telemetry/perf-telemetry.ts](../../src/lib/telemetry/perf-telemetry.ts) lines ~57–62

**Description**: The `Math.random()` fallback in `generateCorrelationId()` returns `local-{timestamp}-{random}` (not UUID format) for environments without `crypto.randomUUID()`. `crypto.randomUUID()` has been available in Node.js since v15.6.0. This project requires `>=18.0.0` per `package.json`. The fallback will never execute in any supported environment.

**No bug here** — defensive code is acceptable. This is informational: if correlation IDs are ever consumed by downstream tooling that expects UUID format, the fallback would produce a non-conforming string. The comment currently says "Node 19+" which is inaccurate (it's been available since Node 15.6 / Node 16 LTS).

**Recommended fix** (optional): Update the comment to reflect the accurate version (`Node 15.6+`) or remove the fallback entirely since it is unreachable within the supported Node range.

---

## TDD Compliance Review

| Function / Unit | Tests Present | Test-First Evidence | Status |
|----------------|--------------|---------------------|--------|
| `createRequestContext` | ✅ 2 tests | ModuleNotFoundError first | ✅ PASS |
| `measureDependency` | ✅ 2 tests (success + error) | ModuleNotFoundError first | ✅ PASS |
| `logRequestTiming` | ✅ 2 tests (happy path + PII) | ModuleNotFoundError first | ✅ PASS |
| `check-budgets.js` | ⚠️ No unit tests | N/A (script, not library) | Acceptable |

**Note on `check-budgets.js`**: As a standalone Node.js script (not a library), unit testing would require significant mocking of `fs`, `path`, and process exit. The implementation doc notes this was validated end-to-end against a real build. No objection to the approach for a CI script.

---

## Architecture Alignment

| Concern | ADR/Principle | Status |
|---------|--------------|--------|
| Cache-Control ownership | ADR-004 | ✅ Aligned — global override removed, per-route ownership enforced |
| No external services before necessity | Postgres-first philosophy | ✅ Clean — no Redis, no APM vendor, uses console output for telemetry |
| Server component separation | `server-only` pattern | ✅ `perf-telemetry.ts` is server-side only (uses `performance.now()`) |
| Import alias pattern | `@/` aliases | ✅ All imports use alias paths |
| Folder structure | `src/lib/` for utilities | ✅ Correctly placed in `src/lib/telemetry/` |
| tsvector search preserved | Not in scope | ✅ No changes to search implementation |

---

## Summary

All 9 files were reviewed. The implementation is architecturally clean, TDD-compliant, and solves all three stated problems (caching conflict, observability gap, regression risk) without over-engineering.

The three LOW findings are non-blocking. F1 (hardcoded CI fallback) is the most actionable and worth a follow-up fix; F2 and F3 are minor polish items.

**No CRITICAL or HIGH issues found.**

---

## Verdict

### ✅ APPROVED_WITH_COMMENTS

**Rationale**: Code quality is high; TDD compliance is demonstrated; architecture alignment is correct. Three LOW-severity findings are documented. None block QA execution. F1 is recommended as a follow-up fix (can be addressed in a subsequent patch or during QA if test harness reveals a gap).

**Blocking**: None
**Non-blocking comments**: F1 (CI fallback guard), F2 (missing schema file), F3 (dead code comment accuracy)

**Condition for full APPROVED**: Implementer may address F1–F3 as a follow-up; not required before QA proceeds.

---

## Handoff

Handing off to qa agent for test execution.

---

*Reviewed by Code Reviewer Agent — Plan 033 — v0.6.11*
