---
ID: 033
Origin: 033
UUID: 7a1c4e2b
Status: Committed
---

# Plan 033 — Performance Optimization Guardrails + Caching Alignment

## Plan Header

- **Target Release**: v0.6.11 (patch)
- **Epic Alignment**: Platform performance & reliability (improves discovery UX; supports Master Product Objective by reducing friction and improving conversion from browse → contact)
- **Status**: Committed for Release v0.6.11
- **Related Issues**: None

## Release Strategy

Standalone (no other known active plans targeting v0.6.11 in `agent-output/planning/`).

## Value Statement and Business Objective

As a **service seeker (especially on mobile)**,
I want **UFlow to load quickly and remain responsive while browsing/searching providers**,
so that I can **find trusted services without delay**, increasing trust and likelihood of contacting a provider.

## Objective

Deliver a measurable, durable performance improvement package focused on:

1. **Caching correctness + consistency** (eliminate conflicting Cache-Control sources of truth).
2. **Performance observability + budgets** (so regressions are detected early).
3. **Targeted optimizations** on the highest-traffic discovery flows (providers browse/search), without changing UX.

## Scope

### In scope

- Cache-Control ownership/precedence alignment across Next.js headers and route handlers.
- Public GET caching policy for safe, bounded endpoints (providers browse) while keeping free-text search uncacheable.
- Bundle + page performance budgets for a small critical-route set.
- Lightweight always-on performance telemetry at server boundaries (request timing + dependency timing) with opt-in debug verbosity.
- Validation in production-like builds and via existing k6 performance harness.

### Out of scope (explicitly)

- New external services (Redis, Elastic, third-party RUM) unless the team explicitly opts in after evidence.
- UX/UI redesign, new features, or new pages.
- Large schema redesigns; DB-side read models are only included if they stay within patch-release scope.

## Assumptions

- Repo version source of truth is currently `0.6.10` (package.json / CHANGELOG).
- This plan ships as a **patch** release because it is primarily refactor + guardrails, not new user-facing features.
- Cloudflare is present in front of Nginx, but Cloudflare configuration changes are optional and should be minimal.

## OPEN QUESTIONS

- **OPEN QUESTION (Release Target)**: Confirm v0.6.11 is the intended next release train (repo is at v0.6.10; roadmap “Current Version” field is stale). If a different release train is intended, retarget before implementation.

## Milestone Dependencies

```mermaid
graph LR
  A[Baseline + evidence
(production-like build)] --> B[Caching precedence decision
(Cache-Control ownership)]
  B --> C[Implement Cache-Control fixes
(per-route + exceptions)]
  A --> D[Perf telemetry + budgets
(CI + local scripts)]
  C --> E[Validate improvements
(Lighthouse + k6 + bundle)]
  D --> E
  E --> F[Version + release artifacts
(v0.6.11)]
```

Sequencing rule: implementation of caching changes should not begin until the baseline measurements and Cache-Control ownership decision are explicitly recorded.

## Plan

### 1) Establish baseline (production-like)

**Objective**: Capture before-state metrics that are repeatable and close to production.

**Work**:

- Run a production build locally (`next build` + `next start`) and capture key route performance for:
  - `/providers` (browse)
  - `/providers?q=...` (free-text)
  - a provider detail route (modal/page)
- Run bundle analysis using existing analyzer wiring.
- Use existing k6 harness against UAT (preferred) or local if UAT is unavailable.

**Acceptance criteria**:

- A small baseline summary exists in the plan’s implementation log (or implementation doc) with:
  - Lighthouse (mobile) scores for the selected routes
  - First Load JS size snapshots for the selected routes
  - k6 summary for baseline (P95 latencies + error rates)

---

### 2) Fix Cache-Control precedence and define single source of truth

**Objective**: Ensure intentional endpoint caching is not silently overridden by global headers.

**Work**:

- Adopt ADR-004 (from architecture) in implementation:
  - Route handlers own Cache-Control for `/api/*`.
  - Global headers avoid writing Cache-Control for all APIs.
- Update Next.js header rules to:
  - keep `/api/manifest` caching as-is,
  - keep “default no-store” only where explicitly intended,
  - allow cacheable GET endpoints (e.g., `/api/providers/search` when `q` is empty) to set Cache-Control.
- Confirm behavior via response header inspection:
  - Default browse endpoint has cacheable policy (bounded TTL + SWR)
  - Query endpoint remains `no-store`

**Acceptance criteria**:

- For `/api/providers/search`:
  - When `q` is empty: response includes cacheable `Cache-Control` (as defined in code).
  - When `q` is present: response includes `Cache-Control: no-store`.
- No other API responses inadvertently become cacheable.

---

### 3) Add performance budgets and regression gates

**Objective**: Prevent performance regressions from reappearing.

**Work**:

- Define budgets for a small set of critical public routes:
  - Lighthouse thresholds (mobile) for LCP/CLS/INP and overall score.
  - Bundle/route chunk size thresholds (First Load JS) for the same routes.
- Wire budgets into CI in a way that is stable and low-noise (run on main routes only, limited concurrency).

**Acceptance criteria**:

- CI (or a dedicated script runnable in CI) fails when:
  - Lighthouse metrics breach thresholds, or
  - First Load JS exceeds configured budgets.
- Budgets are documented and easy to adjust intentionally.

---

### 4) Add minimal always-on performance telemetry (server boundary)

**Objective**: Make slowdowns diagnosable without enabling debug mode.

**Work**:

- Add request timing instrumentation for key route handlers (e.g., providers search) with:
  - total handler duration
  - dependency timing summaries for Supabase calls (operation name + duration + status category)
- Keep high-cardinality fields (free-text queries, detailed payloads) behind an explicit debug flag.

**Acceptance criteria**:

- For targeted endpoints, logs/metrics include:
  - correlation identifier
  - handler duration
  - dependency summaries
- No PII and no raw search query text logged by default.

---

### 5) Targeted performance optimization sweep (bounded)

**Objective**: Apply 1–3 high-impact fixes that are strongly supported by baseline evidence.

Candidate areas (pick based on baseline):

- Reduce client bundle/hydration in discovery flows by ensuring presentational primitives remain Server Components where possible.
- Ensure LCP image patterns are consistent on critical routes (single `priority` image, dimensions present, avoid background-image LCP).
- Reduce client-side duplicate fetches when server-first data is already available.

**Acceptance criteria**:

- Measurable improvement vs baseline on at least one key metric (e.g., LCP p75, First Load JS, or k6 latency) without UX regressions.

---

### 6) Validation (pre-merge)

**Objective**: Confirm performance and correctness.

**Work**:

- Run type-check, unit tests, and production build.
- Re-run Lighthouse and bundle analysis on the same route set.
- Re-run k6 baseline scenario (prefer UAT).

**Acceptance criteria**:

- No regressions in correctness gates.
- Performance budgets pass.
- Improvements are recorded in the implementation summary.

---

### 7) Version Management and Release Artifacts

**Objective**: Ensure release artifacts reflect the target train.

**Work**:

- Bump version to **v0.6.11** in the repo’s version source of truth.
- Add CHANGELOG entry for v0.6.11 referencing Plan 033.
- Coordinate with Roadmap agent to update the roadmap release tracker (roadmap “Current Version” field currently lags).

**Acceptance criteria**:

- Version artifacts are consistent.
- CHANGELOG includes a concise performance/caching summary.

## Testing Strategy (High-Level)

- **Unit**: Add/adjust unit tests around cache header logic and any new helpers.
- **Integration**: Validate Cache-Control headers in route handler responses.
- **Performance**:
  - Lighthouse CI (mobile) for a minimal route set.
  - Existing k6 suite for baseline and load (UAT preferred).

## Risks and Rollback

- **Risk**: Misconfigured cache headers could cache user-specific responses.
  - **Mitigation**: Keep caching limited to public GET endpoints; default `no-store` for authenticated reads.
- **Risk**: CI budgets become flaky.
  - **Mitigation**: Limit to a few routes; run with stable build artifacts; treat as “budget gate” not a full perf test.
- **Rollback**: Revert Cache-Control header changes and disable budgets if they block deploy; keep evidence for follow-up.

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-03-07 | Planner | Plan created, Status: Active |
| 2026-03-07 | Critic | Critique reviewed, Status: Resolved (v0.6.11 confirmed) |
| 2026-03-07 | Implementer | All 7 milestones complete, Status: In Progress |
| 2026-03-07 | Code Reviewer | Verdict: APPROVED_WITH_COMMENTS (3 LOW findings), Status: Code Review Approved |
| 2026-03-07 | QA | Automated gates pass; QA verdict QA Complete |
| 2026-03-07 | UAT | Value delivery confirmed; verdict APPROVED FOR RELEASE — Status: UAT Approved |
| 2026-03-07 | DevOps | Stage 1 local commit completed — Status: Committed for Release v0.6.11 |
