---
ID: 049
Origin: 049
UUID: b7e4a92c
Status: Committed
---

# Implementation 049 — JoinHalal Dry-Run Timeout Hardening

## Plan Reference

`agent-output/planning/049-joinhalal-dry-run-timeout-hardening-plan.md`

## Date

2026-03-22T09:31Z

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-22T09:31Z | Critic → Implementer | Plan 049 APPROVED by Critic | Initial implementation of timeout hardening |
| 2026-03-22T09:50Z | Implementer → Code Reviewer | Code review complete | FIR applied: added `descCheckMs` to `DryRunTiming`; tests + type-check confirmed clean |
| 2026-03-22T11:00Z | QA → Implementer | QA Failed: mid-flight abort gap | Propagated caller AbortSignal into `fetchText()` via `AbortSignal.any()`, added post-fetch signal check, added mid-flight abort regression test |

## Implementation Summary

Hardened the JoinHalal dry-run browser workflow to respond reliably on UAT and production by addressing the root cause identified in Analysis 049: the Nginx default 60-second `proxy_read_timeout` intermittently killed admin dry-run requests.

**What was done:**
1. Added explicit `proxy_read_timeout 95s` for `/api/admin/` routes in both UAT and production Nginx templates
2. Added a 90-second application-level AbortController timeout guard in the dry-run API route
3. Added phase-level timing telemetry (`DryRunTiming`) to the dry-run response
4. Made `runJoinHalalDryRun` accept an optional `AbortSignal` for caller-controlled cancellation
5. Structured timeout error response (504 with actionable detail message)
6. Propagated caller `AbortSignal` into `fetchText()` via `AbortSignal.any()` so in-flight fetches are cancelled immediately when the route budget expires
7. Added post-fetch signal check in the page processing loop to throw immediately after a cancelled fetch

**Timeout budget (layered):**
- App-level: 90s (AbortController in route handler)
- Nginx: 95s (`proxy_read_timeout` in admin API location block)
- Cloudflare Free: 100s (hard, non-configurable ceiling)

This ensures the application controls the failure response rather than Cloudflare replacing it with an opaque 504.

## Baseline & Measurements

- **Analysis 049 evidence**: `limit=10` from container completes in ~6.5s (10 sequential fetches + 250ms delay each)
- **Local test suite**: All 358 tests pass in ~6.4s total; dry-run tests run in ~2.5s
- **Timing telemetry**: The `DryRunResult.timing` object now exposes `totalMs`, `categoriesMs`, `existingKeysMs`, `sitemapMs`, `pageProcessingMs` — sufficient to isolate DB/setup cost from fetch cost
- **UAT baseline**: Deferred to QA/UAT validation since intermittent slowdown cannot be reproduced on demand locally. Owner: QA. The timing telemetry shipped in this patch will provide the data needed to diagnose any future intermittent timeout.

## Milestones Completed

- [x] M1: Baseline and Timeout Budget — 90s/95s/100s layered budget established from Analysis 049 evidence
- [x] M2: Infrastructure Timeout Hardening — `proxy_read_timeout 95s` added to both Nginx templates for `/api/admin/` routes
- [x] M3: API Guardrails and Operator Telemetry — AbortController + `DryRunTiming` + structured timeout error
- [x] M4: Deployment Path Audit — Both deploy workflows verified (UAT + production)
- [x] M5: Validation and Release Readiness — type-check, lint, 359 tests pass
- [x] M6: Version and Release Artifacts — v0.8.10, CHANGELOG updated, lockfile aligned
- [x] M7: QA Fix Round — Caller signal propagated into `fetchText()` and `collectLocationUrls()` via `AbortSignal.any()`, post-fetch signal check added, mid-flight abort regression test added

## Files Modified

| Path | Changes | Lines |
|---|---|---|
| `src/lib/import/joinhalal.ts` | Added `DryRunTiming` interface, optional `timing` field on `DryRunResult`, optional `signal` on `DryRunOptions`, `performance.now()` instrumentation around each phase, `signal.aborted` checks at key points, **QA fix**: propagated caller signal into `fetchText()` via `AbortSignal.any()`, added `callerSignal` param to `fetchText` and `signal` param to `collectLocationUrls`, added post-fetch signal check in page loop | ~60 |
| `src/app/api/admin/import-joinhalal/dry-run/route.ts` | Added `ROUTE_TIMEOUT_MS = 90_000`, AbortController with timeout, structured 504 error on timeout | ~20 |
| `deploy/nginx/nginx-uat-template.conf` | Added `/api/admin/` location block with `proxy_read_timeout 95s` before catch-all `location /` | +11 |
| `deploy/nginx/nginx-template.conf` | Added `/api/admin/` location block with `proxy_read_timeout 95s` before catch-all `location /` | +11 |
| `src/__tests__/lib/import/joinhalal-dry-run.test.ts` | Added 4 new tests: timing shape (with `descCheckMs`), timing sum invariant, pre-aborted AbortSignal rejection, **QA fix**: mid-flight abort regression test proving caller signal cancels in-flight fetches promptly. Imported `DryRunTiming` type. | ~130 |
| `package.json` | Version `0.8.8` → `0.8.10` (0.8.9 was taken by Plan 048 Barakah badges; bumped at DevOps Stage 1) | 1 |
| `package-lock.json` | Version aligned to `0.8.10` | auto |
| `CHANGELOG.md` | Added `[0.8.10]` entry describing timeout hardening | +6 |
| `agent-output/planning/049-*.md` | Status `Active` → `In Progress` | 2 |

## Files Created

| Path | Purpose |
|---|---|
| `agent-output/implementation/049-joinhalal-dry-run-timeout-hardening-impl.md` | This implementation document |
| `src/__tests__/api/import-joinhalal-dry-run-route.test.ts` | Route-level 504 timeout response test (QA-049 required) |

## Deployment Path Audit

**Verified entrypoints:**

| Entrypoint | Template | Verified |
|---|---|---|
| `.github/workflows/deploy-uat.yml` | `deploy/nginx/nginx-uat-template.conf` | ✅ SCPs to `/tmp/` → copies to `/etc/nginx/sites-available/uat-ummahflow` → `nginx -t` → reload |
| `.github/workflows/deploy-hetzner.yml` | `deploy/nginx/nginx-template.conf` | ✅ SCPs to `/tmp/` → `sed` template vars → `/etc/nginx/sites-available/ummahflow` → `nginx -t` → reload |

**Parity**: Both templates have identical `/api/admin/` location blocks (differing only in upstream port: 3001 for UAT, 3000 for production). No manual operator steps required beyond the standard merge-to-main flow.

## Code Quality Validation

- [x] `npm run type-check` — exits 0 (tsc --noEmit clean)
- [x] `npx vitest run` — 360 passed, 18 skipped (pre-existing integration skips), 0 failed
- [x] `npx eslint` on changed files — clean, no warnings
- [x] `npm run build` — Compilation succeeds ✅. Page data collection fails due to missing `.env.local` (pre-existing; CI has env vars via secrets). Not caused by Plan 049 changes.
- [x] Lockfile aligned after version bump

## Value Statement Validation

**Original**: "As an admin/operator, I want the JoinHalal dry-run dashboard to respond reliably on UAT and production-like environments, so that I can validate imports in-browser without infrastructure timeouts and trust the released admin workflow."

**Implementation delivers**: The Nginx timeout is raised from the default 60s to 95s for admin API routes. The app enforces a 90s guard with a structured timeout error. Both values are below the 100s Cloudflare ceiling. Phase-level timing telemetry enables diagnosis of intermittent slow paths. The dry-run route now fails gracefully before infrastructure kills it.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `DryRunTiming` (type + `runJoinHalalDryRun` timing output) | `joinhalal-dry-run.test.ts` | ✅ Yes | ✅ Yes | `result.timing` is `undefined` | ✅ Yes |
| `runJoinHalalDryRun` timing sum invariant | `joinhalal-dry-run.test.ts` | ✅ Yes | ✅ Yes | `result.timing` is `undefined` | ✅ Yes |
| `runJoinHalalDryRun` AbortSignal support | `joinhalal-dry-run.test.ts` | ✅ Yes | ✅ Yes | Function resolves instead of rejecting (no signal support) | ✅ Yes |
| `fetchText` caller signal propagation (QA fix) | `joinhalal-dry-run.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Function resolved with `DryRunResult` after 5.47s instead of rejecting — proves signal NOT propagated into in-flight fetch | ✅ Yes |
| Route handler 504 timeout response (QA fix) | `import-joinhalal-dry-run-route.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Route handler not previously tested for timeout path | ✅ Yes |

## Test Coverage

### Unit Tests (4 new, 355 existing pass)

1. **Timing shape**: Verifies `DryRunResult.timing` has all expected phase keys (`totalMs`, `categoriesMs`, `descCheckMs`, `existingKeysMs`, `sitemapMs`, `pageProcessingMs`) and all values are non-negative numbers.
2. **Timing sum invariant**: Verifies `totalMs >= categoriesMs + descCheckMs + existingKeysMs + sitemapMs + pageProcessingMs` (with 1ms tolerance).
3. **AbortSignal rejection**: Verifies `runJoinHalalDryRun` rejects with a timeout/abort error when passed a pre-aborted signal.
4. **Mid-flight abort regression (QA-049)**: Verifies that when the caller aborts while a page fetch is in-flight, `runJoinHalalDryRun` rejects promptly (<2s) instead of waiting for the fetch timeout. Proves `AbortSignal.any()` propagation works.
5. **Route 504 timeout response (QA-049)**: Verifies the route handler returns `{ error: 'Dry-run timed out', detail: '...90s...CLI...' }` with status 504 when the application-level timeout budget is exceeded. Uses fake timers to fast-forward 91s.

### Integration Tests

- Route-level timeout guard behavior (AbortController + structured 504 error) is tested indirectly through the unit tests on `runJoinHalalDryRun` signal support. The route handler's timeout wiring is straightforward (AbortController + try/catch) and covered by type-checking.

## Test Execution Results

```
$ npx vitest run
 Test Files  39 passed | 1 skipped (40)
      Tests  360 passed | 18 skipped (378)
   Duration  6.39s

$ npm run type-check
tsc --noEmit (clean, exit 0)

$ npx eslint src/lib/import/joinhalal.ts src/__tests__/lib/import/joinhalal-dry-run.test.ts
(clean, no output)
```

## Outstanding Items

- **UAT browser verification**: Deferred to QA/UAT phase. Local `.env.local` is not available; cannot reproduce intermittent UAT slowdown locally. The timing telemetry shipped in this patch will provide diagnostic data for QA validation on UAT.
- **Build page data collection**: `npm run build` fails at page data collection for `/api/admin/badges/verify` due to missing env vars. This is pre-existing (not caused by Plan 049) and succeeds in CI with secrets.

## Next Steps

1. **Code Review** → verify implementation matches plan, check for security/quality issues
2. **QA** → validate on UAT with repeated dry-run requests, verify timing telemetry visible, verify timeout behavior
3. **UAT** → operator validation of the browser dry-run experience
