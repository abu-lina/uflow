---
ID: 049
Origin: 049
UUID: b7e4a92c
Status: Planned
---

# Analysis 049 — JoinHalal Dry-Run 504 Timeout on UAT

## Value Statement and Business Objective

The admin dry-run dashboard (Plan 048, v0.8.8) is inaccessible on UAT because the request exceeds the Nginx proxy timeout. The feature works locally but operators cannot use it in the deployed environment, blocking the live browser validation deferred from UAT.

## Objective

Determine the root cause of the 504 Gateway Timeout observed at `POST https://uat.ummahflow.com/api/admin/import-joinhalal/dry-run` (60107ms), trace every timeout layer in the request path, and quantify the timing gap with evidence.

## Context

- **Symptom**: XHR `POST /api/admin/import-joinhalal/dry-run` returns HTTP 504 after exactly **60107ms** on UAT (`uat.ummahflow.com`).
- **Local behavior**: Same request completes in **~3.3s** for `limit=10` from macOS (POC measured).
- **Infrastructure**: Browser → Cloudflare (Free plan) → Nginx (Hetzner EU) → Next.js 15 (Docker, port 3001).

## Methodology

1. Code trace of `runJoinHalalDryRun` to identify all IO-bound phases and their per-phase timing constraints.
2. Nginx/Cloudflare configuration audit for timeout defaults.
3. Local POC to measure actual wall-clock time of the HTTP-bound phases.
4. Timing model projection for all limit values.
5. Gap analysis: measured local time vs. observed UAT timeout.
6. **Server-side validation** (SSH into Hetzner UAT): curl + Node.js `fetch()` timing from both the host and inside the Docker container.
7. Nginx access/error log analysis for the actual 504 event.

---

## Findings

### Finding 1: VERIFIED — Nginx `proxy_read_timeout` = 60s is the immediate cause

**Confidence**: Verified

The UAT Nginx config in `deploy/nginx/nginx-uat-template.conf` has **no `proxy_read_timeout` directive** anywhere. Nginx's default is 60s. The observed 504 at 60107ms matches this default within measurement noise (107ms overhead for Cloudflare + TCP teardown).

The `location /` block that handles all API routes:
```nginx
location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    # ... headers ...
    proxy_cache_bypass $http_upgrade;
    # NO proxy_read_timeout — defaults to 60s
}
```

The production Nginx config (`deploy/nginx/nginx-template.conf`) has the same gap.

### Finding 2: VERIFIED — Cloudflare Free plan has a hard 100s proxy timeout

**Confidence**: Verified (documented Cloudflare specification)

Cloudflare Free plan enforces a non-configurable 100s proxy read timeout. Even if Nginx is fixed, any request taking >100s will still 504 at the Cloudflare layer. This caps `limit=all` at ~100s maximum response time.

**Layer hierarchy**:
| Layer | Timeout | Configurable? |
|---|---|---|
| Cloudflare (Free) | 100s | No (requires Enterprise for custom) |
| Nginx | 60s (default) | Yes — `proxy_read_timeout` directive |
| Next.js API route | None | Yes — `maxDuration` export (serverless), or no limit (standalone Docker) |
| `AbortSignal.timeout` per fetch | 15s | Yes — in `fetchText()` |
| `sleep()` politeness delay | 250ms/page | Yes — `FETCH_DELAY_MS` constant |

### Finding 3: VERIFIED — Dry-run is dominated by sequential HTTP fetching

**Confidence**: Verified (POC measured)

The `runJoinHalalDryRun` function has 4 serial IO phases:

| Phase | What | Measured (local, limit=10) | Code Location |
|---|---|---|---|
| 1. Load categories | `supabase.from('categories').select(...)` | ~50–100ms (est.) | `loadCategories()` |
| 2. Check description column | `supabase.from('providers').select(...)` | ~50–100ms (est.) | `checkProviderDescriptionExists()` |
| 3. Load existing keys | Paginated loop, 1000/batch | ~50–200ms (est. for 31 rows) | `loadExistingProviderKeys()` |
| 4. Sitemap discovery | Fetch 1–5 XML sitemaps sequentially + 200ms inter-sitemap delay | 367ms (1 sitemap used for limit=10) | `collectLocationUrls()` |
| 5. Page fetch loop | Fetch N pages sequentially + 250ms inter-page delay | 2886ms (10 pages) | main loop in `runJoinHalalDryRun()` |
| **Total** | | **~3.3s** (local) | |

**Phase 5 dominates**: `avg_fetch (63ms) + FETCH_DELAY_MS (250ms) = 313ms/page` × N pages.

### Finding 4: VERIFIED — Local timing proves the operation should complete within 60s for limit ≤ 100

**Confidence**: Verified (POC data + curl measurements)

**Local curl timing** (macOS → joinhalal.com):
| Target | DNS | Connect | TTFB | Total |
|---|---|---|---|---|
| sitemap1.xml | 2ms | 27ms | 81ms | 134ms |
| page (valid URL) | 2ms | 27ms | 84ms | 220ms |

**Node.js POC results** (macOS, `fetch()`):
| Metric | Value |
|---|---|
| Sitemap fetch | 165ms |
| Page fetch (avg) | 63ms (min: 56ms, max: 89ms) |
| Phase 5 total (10 pages) | 2886ms |
| **Total limit=10** | **3.3s** |

**Projections** (based on `avg_fetch (63ms) + FETCH_DELAY_MS (250ms) = 313ms/page`):

| Limit | Projected Time | Within Nginx 60s? | Within CF 100s? |
|---|---|---|---|
| 10 | ~3.5s | ✅ Yes | ✅ Yes |
| 50 | ~16s | ✅ Yes | ✅ Yes |
| 100 | ~32s | ✅ Yes | ✅ Yes |
| all (~1000) | ~315s (~5.3min) | ❌ No | ❌ No |

**Critical gap**: The UAT server times out at 60s for limit=10 (3.3s locally). This 18x slowdown cannot be explained by network latency alone — see Finding 5.

### Finding 5: VERIFIED — UAT server network + fetch performance is FAST (hypothesis disproven)

**Confidence**: Verified (server-side SSH testing, 2026-03-20)

**All prior network/blocking hypotheses were disproven** by direct server-side testing:

**Test 1 — Host-level curl** (Hetzner host → joinhalal.com):
```
200 dns:0.013593s total:0.146130s
```
→ **146ms** — faster than local macOS (230ms). Network path is excellent.

**Test 2 — Container Node.js `fetch()` single request**:
```
200 212ms
```
→ **212ms** — fast, no blocking or DNS issues inside the container.

**Test 3 — Container Node.js `fetch()` 10 pages sequential + 250ms delay** (matching production code pattern):
```
Page 0: 476ms  Page 5: 368ms
Page 1: 458ms  Page 6: 396ms
Page 2: 402ms  Page 7:  46ms
Page 3: 387ms  Page 8: 409ms
Page 4: 387ms  Page 9: 402ms
Total pages: 6235ms
Grand total: 6455ms
```
→ **6.5s total** for 10 pages — well within 60s.

**Test 4 — Container regex parsing on 600KB+ HTML**:
```
schema parse: 0-1ms per page
vxconfig parse: 0-1ms per page
```
→ Parsing is negligible.

**joinhalal.com server profile** (verified):
- IP: `185.219.237.10`, plain `server: nginx` (WordPress)
- **No Cloudflare, no WAF, no bot protection**
- DNS: direct A record, no CDN
- Response headers: `x-scout-cache: MISS`

**Conclusions disproven**:
- ~~Docker DNS resolution overhead~~ → 14ms (fast)
- ~~Datacenter IP blocking/WAF~~ → joinhalal.com has no WAF; all fetches return 200
- ~~Node.js `fetch()` inside Docker is slow~~ → avg 370ms/page including body read
- ~~Rate-limiting / 429 cascades~~ → 0 of 10 pages triggered 429

### Finding 6: VERIFIED — No API route timeout or `maxDuration` guard exists

**Confidence**: Verified

The API route at `src/app/api/admin/import-joinhalal/dry-run/route.ts`:
- Has no `export const maxDuration = ...` (Next.js serverless function timeout)
- Has no internal abort controller or wall-clock guard
- Relies entirely on the per-fetch `AbortSignal.timeout(15000)` in `fetchText()`

In standalone Docker mode (not serverless), Next.js has **no built-in request timeout**. The request runs until it completes, crashes, or Nginx kills the connection. When Nginx kills it at 60s, the Next.js handler keeps running orphaned in the background until all fetches complete or timeout — wasting server resources.

### Finding 7: VERIFIED — `next.config.js` has no `serverTimeout` or `httpAgentOptions`

**Confidence**: Verified

```js
experimental: {
  optimizeCss: true,
  scrollRestoration: true,
  // ... no timeout configuration
}
```

### Finding 8: VERIFIED — The failure is intermittent, not consistent

**Confidence**: Verified (Nginx access log evidence)

The Nginx access and error logs show **two requests** from the user's session:

| Timestamp (UTC) | Status | Response Size | Duration |
|---|---|---|---|
| `2026-03-20 16:56:47` | **200** ✅ | 833 bytes | < 60s (exact unknown) |
| `2026-03-20 17:01:15` | **504** ❌ | 160 bytes | 60s (Nginx timeout) |

Nginx error log for the 504:
```
upstream timed out (110: Connection timed out) while reading response header
from upstream, client: 172.71.178.164, server: uat.ummahflow.com,
request: "POST /api/admin/import-joinhalal/dry-run HTTP/2.0",
upstream: "http://127.0.0.1:3001/api/admin/import-joinhalal/dry-run"
```

**Key insight**: The **first request succeeded** (200, 833 bytes). The **second request** (4.5 minutes later) hit the Nginx 60s timeout. Since the container-level network tests show 6.5s for 10 pages, the intermittent failure points to a **Supabase cold-connection** or **API route initialization** overhead that doesn't reproduce in isolated `node -e` tests.

**Hypothesis** (High confidence): The first request warmed up the route module (Next.js lazy-loads API route bundles on first hit). The second request may have hit a different code path (e.g., larger limit), or Supabase connection pooling behaved differently under the full Next.js runtime vs. bare `node -e`. The 833-byte successful response suggests the first request used a small limit (likely 10) and completed successfully — confirming the feature **does work** on UAT, but is fragile near the 60s boundary.

**Fastest validation**: Trigger the dry-run twice in succession from the browser. If the second request also succeeds, the failure was a one-time cold-start or Supabase latency spike. If it consistently fails on the second attempt, there may be a connection leak or state accumulation issue.

### Finding 9: VERIFIED — Container is running v0.8.8 with all env vars present

**Confidence**: Verified (SSH inspection)

```
Container: uflow-uat (created 2026-03-19T16:43:20Z)
Image: ghcr.io/abu-lina/uflow-uat:latest
Version: 0.8.8
NEXT_PUBLIC_SUPABASE_URL: ✅ set
SUPABASE_SERVICE_ROLE_KEY: ✅ set
API route: /app/.next/server/app/api/admin/import-joinhalal/dry-run/route.js ✅ exists
```

The `@supabase/supabase-js` module is bundled into the Next.js standalone build (not available as a separate `node_modules` entry), so direct Supabase timing tests from `docker exec node -e` were not possible — the Supabase phase timing remains an inference gap.

---

## Root Cause

**Verified (Layer 1 — proximate cause)**: The 504 is caused by `deploy/nginx/nginx-uat-template.conf` having no `proxy_read_timeout` directive, defaulting to **60s**. Nginx terminates the upstream connection after exactly 60s, producing the 504 that Cloudflare forwards to the browser. Nginx error log confirms: `upstream timed out (110: Connection timed out) while reading response header from upstream`.

**High-confidence inference (Layer 2 — why it's intermittently slow)**: The failure is **intermittent** (one request succeeded, the next failed). Server-side testing proves the network and parsing path takes only **~6.5s** for `limit=10`. The most likely cause of the intermittent slowdown is either:

1. **Supabase cold-connection latency** — The Supabase project may hibernate between requests (common on free/pro tiers with low traffic). The first request warms the connection; subsequent requests after >4 minutes may hit another cold start. This could add 30-50s of Supabase initialization that doesn't reproduce in isolated `node -e` tests (which don't use the bundled Supabase client).

2. **Next.js API route lazy compilation** — Standalone Next.js lazy-loads route bundles. If the route was evicted from cache between the two requests, the second invocation may have triggered re-compilation overhead.

3. **A second request with a larger limit** — If the user changed from `limit=10` to `limit=50` or `limit=100` on the second attempt, the wall-clock time would increase proportionally (16s for 50, 32s for 100 — adding Supabase overhead could push it past 60s).

**Cannot be determined without**: Supabase query timing from the actual Next.js runtime (not possible from `docker exec node -e` due to standalone bundling). The `runJoinHalalDryRun` function has zero timing telemetry.

**Fix**: Add `proxy_read_timeout 120s` in the Nginx config for admin API routes. This gives 2x headroom over the 60s boundary while staying safely under Cloudflare's 100s limit. This is necessary regardless of the Layer 2 cause — the current 60s default is too tight for any operation involving sequential outbound HTTP + Supabase queries.

---

## System Weaknesses

### Architecture

| Weakness | Risk Mechanism | Detection |
|---|---|---|
| No Nginx timeout override for long-running admin routes | Any admin operation exceeding 60s silently 504s | Add per-route timeout in Nginx config; monitor 504 rate |
| Sequential HTTP fetching with no parallelism | Wall-clock scales linearly: O(N × (fetch_time + delay)) | Timing instrumentation would reveal this |
| No internal wall-clock abort on the API route | Orphaned handlers continue running server-side after Nginx 504s, wasting CPU/memory | Add AbortController with deadline matching the Nginx timeout |

### Code

| Weakness | Risk Mechanism | Detection |
|---|---|---|
| `fetchText()` swallows errors silently (returns `null`) | Timeout, block, or rate-limit is invisible; caller only sees `stats.failed++` | Add structured error categories to `fetchText()` return |
| No timing telemetry in `runJoinHalalDryRun` | Cannot diagnose which phase is slow without a POC | Add `debug`-level phase timing that can be opted into |
| `FETCH_DELAY_MS = 250` is not adaptive | Fixed delay wastes time when server responds fast, doesn't back off when slow | Consider adaptive delay or at minimum log when rate-limited |

### Process

| Weakness | Risk Mechanism | Detection |
|---|---|---|
| UAT deferred live browser validation to post-deploy | This exact failure was predicted as a deferred follow-up (048 open-actions item 1) but never tested before release | Require at least one manual smoke test on UAT before marking release complete |

---

## Instrumentation Gaps

### Normal (always-on, low-volume)

| Telemetry | What | Why |
|---|---|---|
| Phase-level timing in `DryRunResult` | Add `timing?: { categories_ms, keys_ms, sitemaps_ms, pages_ms, total_ms }` to the response | Operators see where time is spent; diagnose intermittent slowdowns without SSH. **Highest priority.** |
| API route response time header | `Server-Timing: total;dur=6200` on the dry-run route | Triage 504 vs. slow-but-successful; visible in Nginx logs and browser DevTools |

### Debug (opt-in, short window)

| Telemetry | What | Why |
|---|---|---|
| Per-fetch timing in `fetchText()` | Log URL, HTTP status, elapsed ms, error type (timeout/network/4xx/5xx) to `console.warn` behind a debug flag | Proves whether specific URLs are slow or timing out silently |

---

## Analysis Recommendations (Next Steps)

1. **[FIX — Nginx timeout]** Add a `location` block for `/api/admin/` with `proxy_read_timeout 120s` in both `deploy/nginx/nginx-uat-template.conf` and `deploy/nginx/nginx-template.conf`. This is the minimum viable fix and addresses the verified root cause. Stay under Cloudflare's 100s limit — use 90s to add safety margin.

2. **[REPRODUCE]** Trigger the dry-run from the UAT browser twice in succession with `limit=10`. Record the response time for both. If the first succeeds and the second fails, or both succeed, this narrows the intermittent cause.

3. **[INSTRUMENT]** Add timing telemetry to `DryRunResult` — return phase durations (`categories_ms`, `keys_ms`, `sitemaps_ms`, `pages_ms`, `total_ms`). This is the cheapest way to diagnose future slowdowns without SSH access.

4. **[GUARD]** Add an internal `AbortController` timeout to the API route (e.g., 85s) that aborts the dry-run before Cloudflare kills it. Return a structured error: `{ error: "Dry-run timed out after 85s", partial: true }`. This prevents orphaned handlers.

---

## Open Questions

1. What is the Supabase query latency from the actual Next.js runtime in the Docker container? (Cannot test via `docker exec node -e` — module is bundled into the standalone build.)
2. Was the user's second request (the 504) using a different `limit` than the first (the 200)?
3. Does the Supabase project hibernate between low-traffic requests on UAT, adding cold-start latency?

---

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-20T18:00Z | analyst | Initial analysis — 7 findings, root cause verified (Nginx 60s default), network slowdown hypothesised |
| 2026-03-20T18:30Z | analyst | Server-side SSH validation: network disproven (6.5s for 10 pages from container), Nginx logs show intermittent failure (1 success + 1 timeout), added Findings 8-9, refined root cause to Nginx timeout + intermittent Supabase/init delay |
| 2026-03-20T18:45Z | planner | Analysis consumed into Plan 049 and marked Planned |
