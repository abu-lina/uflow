---
ID: 049
Origin: 049
UUID: b7e4a92c
Status: Committed
---

# Code Review 049 — JoinHalal Dry-Run Timeout Hardening

**Plan Reference**: `agent-output/planning/049-joinhalal-dry-run-timeout-hardening-plan.md`
**Implementation Reference**: `agent-output/implementation/049-joinhalal-dry-run-timeout-hardening-impl.md`
**Date**: 2026-03-22T09:50Z
**Reviewer**: Code Reviewer

## Changelog

| Date (UTC) | Agent Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-22T09:50Z | Implementer → Code Reviewer | Implementation 049 complete | Initial code review; FIR applied for L-1 telemetry gap |
| 2026-03-22T11:10Z | Implementer → Code Reviewer | QA fix round complete | Re-review of abort propagation fix, mid-flight regression test, and route 504 test |

---

## Architecture Alignment

**System Architecture Reference**: `docs/architecture/ARCHITECTURE_OVERVIEW.md`
**Alignment Status**: ALIGNED

The implementation correctly addresses all three layers of the timeout chain documented in Analysis 049:

- **Nginx layer**: Adds `proxy_read_timeout 95s` scoped to `/api/admin/` — correctly placed above the catch-all `location /` block in both UAT and production templates. This is the deterministic fix.
- **Application layer**: AbortController with 90s expiry in the route handler — correctly below the Nginx 95s and Cloudflare 100s ceilings.
- **Observability layer**: `DryRunTiming` added to `DryRunResult` — additive and backward compatible.

The implementation respects the architecture's "Start with Postgres" philosophy; no external services were added. The timeout scope is narrow and does not weaken proxy behavior for user-facing routes.

---

## Deployment Path Audit (Mandatory)

Trigger: changes touch `deploy/nginx/nginx-uat-template.conf` and `deploy/nginx/nginx-template.conf`.

**Search terms used**: `nginx-template.conf`, `nginx-uat-template.conf`, `proxy_read_timeout` in `.github/workflows/`, `deploy/`, `scripts/`.

| Entrypoint | Template Modified | Upload Step | Apply Step | nginx -t Guard |
|---|---|---|---|---|
| `.github/workflows/deploy-uat.yml` | `nginx-uat-template.conf` | ✅ Conditional on `changed=true` (git diff), default `true` for workflow_dispatch | ✅ `cp /tmp/nginx-uat-template.conf /etc/nginx/sites-available/uat-ummahflow` with file-existence guard | ✅ `nginx -t` before reload |
| `.github/workflows/deploy-hetzner.yml` | `nginx-template.conf` | ✅ Conditional on `changed=true` (git diff), default `true` for workflow_dispatch | ✅ `sed "s/{{DOMAIN}}/ummahflow.com/g" /tmp/nginx-template.conf > ...` (unconditional sed, see L-2) | ✅ `nginx -t` before reload |

**Parity**: Both templates contain identical `/api/admin/` location blocks. UAT uses port 3001, production uses port 3000 — consistent with existing patterns across both configs.

**v0.8.10 first deployment**: Both templates were modified in this patch. Both workflows will detect `changed=true` and upload the template on push. The `sed` path is safe for this specific deployment.

---

## Outbound Data-Flow Cross-Trace (Mandatory)

Trigger: `route.ts` now returns an additional `timing` field in the JSON body.

- **Route**: `POST /api/admin/import-joinhalal/dry-run` → `NextResponse.json(result)` where `result: DryRunResult` with optional `timing?: DryRunTiming`.
- **Receiver**: `src/features/import/components/ImportDryRunPageContent.tsx` line 37: `setState({ phase: 'result', data: json as DryRunResult, limit })`.
- **Verification**: The component accesses `state.data.stats`, `state.data.unmappedGroups`, `state.data.samples`. It does not access `timing`. Since `timing` is optional on `DryRunResult`, TypeScript permits the cast; unknown extra fields are safely ignored at runtime. **No regression risk.**
- **Timeout error path**: Route returns `{ error: '...', detail: '...' }` with status 504. The component reads `json.error ?? 'Preview failed'` (line 35) and enters the `phase: 'error'` state displaying `'Dry-run timed out'`. The `detail` field is in the response body for developer tooling but is not rendered. **Correct behavior.**

---

## TDD Compliance Check

**TDD Table Present**: ✅ Yes (3 rows)
**All Rows Complete**: ✅ Yes

| Function/Class | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|
| `DryRunTiming` (phase keys + values) | ✅ Yes | ✅ Yes — `result.timing` undefined | Property doesn't exist before impl | ✅ Yes |
| `runJoinHalalDryRun` timing sum invariant | ✅ Yes | ✅ Yes — `result.timing` undefined | Property doesn't exist before impl | ✅ Yes |
| `runJoinHalalDryRun` AbortSignal rejection | ✅ Yes | ✅ Yes — resolves instead of rejecting | No signal support before impl | ✅ Yes |

---

## Findings

### Critical

None.

### High

None.

### Medium

**[MEDIUM] Correctness — AbortSignal not propagated to `fetchText()`; worst-case app execution may exceed Nginx ceiling**

- **Location**: [src/lib/import/joinhalal.ts](src/lib/import/joinhalal.ts) — `fetchText()` function and the page-processing loop
- **Issue**: The route-level `AbortSignal` is checked by polling at the top of each URL iteration, but `fetchText()` runs its own independent `AbortSignal.timeout(15000)`. If the 90s abort fires while a `fetchText()` call is in-flight, the function won't throw until that call completes — up to 15 additional seconds later. Worst-case app execution time is therefore 90s + 15s = **105s**, which exceeds both the Nginx (95s) and Cloudflare (100s) ceilings. In this edge case the plan's hard constraint ("both must be below 100s") could still be violated by the execution time, not by the configured values.
- **Practical impact**: The 15s overshoot requires a slow `fetchText()` call in progress at the exact moment the 90s limit fires. For `limit=10`, Analysis 049 measured 6.5s total — the edge case applies only to intermittently slow fetches. The implementation substantially improves reliability even with this gap.
- **Recommendation**: In a follow-up pass, propagate the caller's signal to `fetchText()` using a composite signal. In Node 20+, `AbortSignal.any([AbortSignal.timeout(15000), signal])` would provide clean interoperability. For Node 18 compatibility, a simple wrapper that listens to the passed signal and calls an inner AbortController would also work. This is not a blocker for this reliability patch but should be tracked.

### Low / Info

**[LOW] FIR Applied — Telemetry gap: `checkProviderDescriptionExists` was missing from timing breakdown**

- **Location**: [src/lib/import/joinhalal.ts](src/lib/import/joinhalal.ts) — `runJoinHalalDryRun` between categories load and sitemap collection
- **Issue**: The `checkProviderDescriptionExists()` Supabase call executed between `categoriesMs` and `sitemapMs` was not wrapped in timing markers. Its duration (typically a few ms) would appear as an unexplained gap between `totalMs` and the sum of individual phases, reducing the diagnostic value the telemetry was designed to provide.
- **Status**: **FIXED IN REVIEW** — Added `descCheckMs` field to `DryRunTiming` interface, wrapped the call in `tDescCheckStart / tDescCheckEnd` markers, and updated both the return statement and the test assertions to include this phase. All 7 dry-run tests remain green, no type errors.

**[LOW] Pre-existing — Production deploy workflow runs `sed nginx-template.conf` unconditionally**

- **Location**: [.github/workflows/deploy-hetzner.yml](.github/workflows/deploy-hetzner.yml) — main SSH deploy step
- **Issue**: The UAT workflow guards the `cp` command with `if [ -f "/tmp/nginx-uat-template.conf" ]`. The production workflow runs `sed /tmp/nginx-template.conf >...` without a file-existence check. If a future deployment runs where the template hasn't changed (and therefore wasn't uploaded), the `sed` command would fail or produce an empty config, `nginx -t` would catch it, but the config at `/etc/nginx/sites-available/ummahflow` would have been overwritten with empty content before the test runs.
- **Impact on Plan 049**: None — both templates were modified in this patch, so `changed=true` is guaranteed for the v0.8.10 deployment.
- **Recommendation**: Not caused by this plan; pre-existing workflow fragility. Add a file-existence guard mirroring the UAT pattern in a future process-improvement pass.

---

## Positive Observations

1. **Layered timeout design is exactly right**: 90s → 95s → 100s is a clean "defence-in-depth" approach. The gap between each layer gives the application time to write a proper response before the outer layer terminates the connection.
2. **`DryRunTiming` is additive and backward compatible**: Making `timing` optional on `DryRunResult` avoids breaking any existing code paths (CLI, tests, consumers) that don't reference the new field.
3. **`clearTimeout(timeout)` called on all exit paths**: The route handler correctly prevents timer leak regardless of whether the dry-run succeeds, times out, or throws for another reason.
4. **Structured 504 error is operator-actionable**: The detail message tells the operator exactly what happened ("exceeded the 90s route budget") and what to do ("try a smaller limit or use the CLI"). This is better than an opaque upstream 504.
5. **Nginx block is correctly scoped**: Placing the `/api/admin/` location block before the catch-all `location /` ensures it matches without altering any other route's timeout behavior. The inheriting server-level security headers (`HSTS`, `X-Frame-Options`, etc.) are preserved since no `add_header` directives are in the new block.
6. **TDD was applied correctly**: Tests were written first, failure was verified, and all three new tests target the actual bug path (missing timing, missing signal support) — not adjacent behavior.

---

## Required Actions Before QA

None. The single MEDIUM finding is documented and recommended for a follow-up pass — it does not block QA since the implementation still substantially resolves the reported 504 issue. The LOW FIR has been applied and verified.

## Optional Follow-up (post-QA)

- ~~**M-1 follow-up**: Propagate route-level signal into `fetchText()`.~~ **RESOLVED in QA fix round.**
- **L-2 follow-up**: Add file-existence guard to the production Nginx apply step in `deploy-hetzner.yml` to match UAT pattern.

---

## Verdict

**APPROVED_WITH_COMMENTS** *(initial round — 2026-03-22T09:50Z)*

The implementation correctly addresses the root cause (Nginx 60s default), adds application-level guardrails with a clean layered timeout budget, and ships operator-visible telemetry for post-deployment diagnosis. One MEDIUM finding (polling-based abort with a partial overshoot window) is noted — it does not block this reliability patch since it requires a low-probability chain of conditions and the plan was scoped to "restore browser usability." One LOW telemetry gap was fixed-in-review. All gates pass:

- `npm run type-check` → ✅ clean
- `npx vitest run` → ✅ 358 passed (7 dry-run tests including 3 new TDD), 18 skipped
- `npx eslint` on changed files → ✅ clean
- Build compilation → ✅ succeeds (page data collection failure is pre-existing, unrelated to Plan 049)

---

## QA Fix Round Review — 2026-03-22T11:10Z

> This section covers the re-review of changes introduced after QA Failed verdict. Scope is restricted to the three files changed by the implementer: `src/lib/import/joinhalal.ts`, `src/__tests__/lib/import/joinhalal-dry-run.test.ts`, and the new `src/__tests__/api/import-joinhalal-dry-run-route.test.ts`.

### Deployment / Data-Flow / Interaction-Layer Checklists

Not triggered. The fix round does not touch Nginx templates, CI workflows, `router.push`, `Link href`, overlay containers, or any deployment surface. All previously-run mandatory checklists remain valid.

### QA Finding Resolution Matrix

| QA Finding | Severity | Required Action | Resolution |
|---|---|---|---|
| AbortSignal not propagated into in-flight `fetchText()` | HIGH | Propagate caller signal so fetches cancel immediately | ✅ `fetchText(url, callerSignal?)` + `AbortSignal.any([AbortSignal.timeout(15000), callerSignal])` |
| No mid-flight abort regression test | MEDIUM | Test caller abort after work starts, during in-flight fetch | ✅ New test `[QA-049 regression]` — TDD RED proved (resolved after 5.47s before fix), GREEN confirms 205ms after fix |
| No route-level 504 test | MEDIUM | Test the structured `{ error, detail }` 504 response body | ✅ New file `import-joinhalal-dry-run-route.test.ts` — fake timers advance 91s, verifies status 504, `error`, `detail` |
| Implementation doc missing `descCheckMs` | LOW | Refresh narrative sections | ✅ Updated in all tables and test coverage lists |

### Code Review: `src/lib/import/joinhalal.ts` (fix changes only)

**`fetchText()` signature and composition:**

```typescript
async function fetchText(url: string, callerSignal?: AbortSignal, attempt = 1): Promise<string | null> {
  const fetchSignal = callerSignal
    ? AbortSignal.any([AbortSignal.timeout(15000), callerSignal])
    : AbortSignal.timeout(15000);
```

- `AbortSignal.any()` is the canonical Node 20+ composition API. Node 20 confirmed in `.nvmrc` (value: `20`) and `Dockerfile` (`FROM node:20-alpine`). ✅
- Optional parameter with `?` preserves backward compatibility — all existing callers (CLI script) pass no signal and get the same 15s timeout as before. ✅
- Retry path correctly forwards `callerSignal`: `return fetchText(url, callerSignal, attempt + 1)`. A retry after a rate-limit backoff (`429`) while the route signal is already aborted will immediately construct an already-aborted composite, and `fetch()` will throw `AbortError` → caught → returns `null` → post-fetch signal check throws. ✅

**`collectLocationUrls()` signature:**

```typescript
async function collectLocationUrls(sitemapUrls: string[], limit: ImportLimit, signal?: AbortSignal)
```

Signal propagated to `fetchText(sitemapUrl, signal)`. Sitemap abort edge case (signal fires mid-sitemap loop, some URLs collected) correctly falls through to the caller's post-call `signal?.aborted` check rather than requiring an additional loop guard. Acceptable. ✅

**Post-fetch signal check in page loop:**

```typescript
const html = await fetchText(url, signal);

if (signal?.aborted) {
  throw new Error('Dry-run aborted: timeout exceeded during page fetch.');
}
```

This is the key fix. When `fetchText` catches the `AbortError` from the composed signal and returns `null`, this check fires immediately after — before the `if (!html)` branch could silently count the cancelled fetch as a failure and continue the loop. ✅

**No new security issues.** No hardcoded secrets, no injection surfaces, no external input reaches the signal composition.

### Code Review: `src/__tests__/lib/import/joinhalal-dry-run.test.ts` (new test only)

**TDD gate**: Implementer confirmed RED (function resolved with `DryRunResult`, `pageProcessingMs: 5257`) → GREEN (rejects in 205ms). This is meaningful proof that the `AbortSignal.any()` composition is actually invoked by `fetch()` — not just by the polling checkpoints.

**Test design robustness:**

```typescript
// Abort the caller's signal NOW, while the page fetch is starting.
controller.abort();
// ...
if (fetchSignal) {
  if (fetchSignal.aborted) {         // handles already-aborted case
    clearTimeout(timer);
    reject(new DOMException('The operation was aborted.', 'AbortError'));
    return;
  }
  fetchSignal.addEventListener('abort', () => { ... }, { once: true });
}
```

The mock correctly handles both the synchronous-abort path (signal already aborted when listener is registered) and the asynchronous-abort path. ✅

**Test isolation:** `global.fetch` restored in `afterEach`. `vi.restoreAllMocks()` called. 10s test timeout declared — wide enough to let the 5s fallback expire if propagation regresses, producing a clear failure rather than a false pass. ✅

**Elapsed-time assertion:** `expect(elapsedMs).toBeLessThan(2000)` is correctly placed after the `.rejects.toThrow()` assertion resolves. If the function unexpectedly resolves (regression), `.rejects.toThrow()` fails first, so the timing assertion is only reached on the reject path. ✅

### Code Review: `src/__tests__/api/import-joinhalal-dry-run-route.test.ts` (new file)

**Mock coverage:**
- `getUserFromCookie` → `{ id: 'user-001' }` ✅
- `isAdminOrModerator` → `true` ✅
- `createClient` → `{}` ✅
- `runJoinHalalDryRun` → hangs until signal aborts ✅

All four injection points mocked. No real network or DB calls. Test env vars (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) set in `beforeEach` and deleted in `afterEach` — no env bleed. ✅

**Fake timers:** `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach`. `vi.advanceTimersByTimeAsync(91_000)` correctly advances past `ROUTE_TIMEOUT_MS = 90_000`, firing the `setTimeout(() => controller.abort(), ...)`. ✅

**Response contract assertions:**
- `response.status === 504` ✅
- `json.error === 'Dry-run timed out'` — exact match, not regex. Will catch any typo in the route handler string. ✅
- `json.detail` contains `'90s'` and `'CLI'` — verifies the template string `\`The operation exceeded the ${ROUTE_TIMEOUT_MS / 1000}s route budget. Try a smaller limit or use the CLI...\`` is rendered correctly. ✅

**One observation (INFO):** The mock `runJoinHalalDryRun` only wires the reject handler if `options.signal` is truthy. If a future refactor were to remove the signal parameter from the route handler call, the mock Promise would never settle and the test would hang — which is the correct failure mode (test fails with timeout rather than a false pass). No action needed.

### TDD Compliance — QA Fix Round

| Row | Function/Class | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| 4 | `fetchText` caller signal propagation | ⚠️ Post-fix (bugfix regression — acceptable) | ✅ Yes | Resolved with `DryRunResult` after 5.47s — confirms no propagation existed | ✅ Yes |
| 5 | Route handler 504 timeout response | ⚠️ Post-fix (bugfix regression — acceptable) | ✅ Yes (per impl doc) | Route timeout path untested before this round | ✅ Yes |

Bugfix regression TDD exception correctly applied: no new API surface, tests exercise the exact bug-class path, pre-fix behavior was directly observable.

### IDE Diagnostics

All three files: no errors reported. ✅

### Test Totals

- 360 passed, 18 skipped (pre-existing integration skips), 0 failed
- `tsc --noEmit` → clean
- `npm run eslint` on changed files → clean

### Findings (QA Fix Round)

**None.** All QA findings resolved cleanly. No new issues introduced.

### Verdict — QA Fix Round

**APPROVED**

The QA fix round fully resolves all three QA findings. The MEDIUM finding from the initial code review (abort propagation gap) is now closed. `AbortSignal.any()` is the correct composition primitive for this runtime, the post-fetch signal check provides defense-in-depth, and both new tests carry meaningful RED→GREEN proof. The implementation now owns the timeout boundary across all fetch paths before Nginx and Cloudflare can intervene.

**Outstanding:** Only L-2 (production `nginx -t` unconditional `sed`) remains open — pre-existing, not caused by this plan, does not block QA or UAT.
