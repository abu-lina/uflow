---
ID: 007
Origin: 007
UUID: e7f4a31c
Status: Released
---

# 007 — Performance Improvements Plan (v0.4.0)

## Changelog

| Date       | Agent         | Change                                           | Rationale                                                                                         |
| ---------- | ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 2026-02-22 | Planner       | Plan created from Analysis 007                   | Reduce baseline JS + align search with Postgres-first rules                                       |
| 2026-02-22 | Planner       | Scope decisions locked (Iconify/Motion/UAT data) | Reduce regression risk; ensure DB validation is meaningful                                        |
| 2026-02-22 | Implementer   | Status → In Progress                             | Beginning implementation of all milestones                                                        |
| 2026-02-22 | Implementer   | Implementation complete                          | All 8 milestones done. First Load JS 687→105 kB. Handoff to Code Review.                          |
| 2026-02-22 | Code Reviewer | Status → Code Review Approved                    | APPROVED — No blocking findings. Handoff to QA.                                                   |
| 2026-02-22 | QA            | Status → QA Complete                             | Automated QA gates PASS; UAT still required for DB `EXPLAIN` + Lighthouse comparison.             |
| 2026-02-22 | UAT           | Status → UAT Approved                            | APPROVED FOR RELEASE — Value delivered: 85% bundle reduction + instant search. Handoff to DevOps. |
| 2026-02-22 | DevOps        | Status → Released                                | v0.4.0 pushed to origin/main, tag v0.4.0 created. Migration 056 schema fix for prod applied.     |

## Target Release: v0.4.0

## Epic Alignment

- Release v0.4.0 — Engagement & Transaction Enablement
- Supports Epic 4.1 (Direct Contact & Inquiry): faster provider browsing and detail pages increases conversion to contact

## Value Statement and Business Objective

As a **mobile service seeker**, I want **UFlow pages to load quickly and searches to feel instant**, so that **I can browse providers and contact them without friction**, increasing engagement and conversion for v0.4.0.

## Scope

In-scope (from Analysis 007):

- Frontend bundle reduction focusing on **First Load JS shared by all**
- Replace **direct ILIKE search usage** with **tsvector RPC search** (project rule compliance)
- Add missing **GIN tsvector indexes** for provider/community-service names used in RPC searches
- Add guardrails to prevent **unbounded queries** and reduce over-fetching
- Reduce **Edge middleware bundle size** where feasible without changing product behavior

Out of scope (defer unless necessary):

- Full migration to cursor-based pagination across all lists
- Major UI redesigns or new features
- Adding Redis/Elasticsearch/queues (explicitly not needed at current scale)
- Broad, repo-wide replacement of `@iconify/react` imports across all components (defer if bundle target is met via code splitting)

## Success Metrics (Acceptance Criteria)

Frontend:

- [ ] Reduce **First Load JS shared by all** from **687 kB** to **≤ 350 kB** (measured via `ANALYZE=true npm run build`)
- [ ] Increase code-splitting: dynamic-import **all modal** components and other interaction-only UI so they are not in the shared bundle
- [ ] Reduce `motion/react` usage in the **global shell** (layout/navigation components) to only interaction-critical animations (see Milestone 5)

Database/Search:

- [ ] Eliminate **direct ILIKE** usage in production search paths in `src/services/categories.ts` and `src/services/providers.ts` (use RPC tsvector search instead)
- [ ] Add **GIN tsvector indexes** for `providers.provider_name` and `community_services.community_service_name` (or equivalent stored search vectors) so RPC search functions use indexes (validated with `EXPLAIN (ANALYZE, BUFFERS)` in UAT/staging)
- [ ] Ensure UAT/staging has a dataset size sufficient to make index usage observable (see Milestone 2: UAT data sizing)

Data access:

- [ ] Add sane default limits for any previously unbounded list fetches (needs/categories/badges/bookmarks) and avoid `limit=1000` fallbacks where not required
- [ ] Reduce over-fetching by replacing high-impact `select('*')` usage with explicit column selects in the heaviest endpoints/forms

Infrastructure:

- [ ] Reduce middleware bundle size from **79.3 kB** toward **≤ 50 kB**, or document why the remaining size is unavoidable without behavior changes

## Assumptions

- The user accepts small UX-neutral changes such as reduced decorative animations in the global shell if it materially improves load performance.
- Supabase migrations can be applied normally in the existing deployment process.
- UAT environment is available for `EXPLAIN ANALYZE` and Lighthouse baseline validation.

## Milestone Dependencies

```mermaid
graph LR
  A[DB: Add GIN indexes / search vectors] --> B[DB: Update RPC search functions if needed]
  B --> C[Services: Replace direct ILIKE with RPC search]
  D[UI: Reduce global bundle (iconify/motion)] --> E[UI: Dynamic import modals & interaction-only components]
  C --> F[End-to-end validation in UAT]
  E --> F
```

Sequencing rule: Database gates (indexes/search RPC correctness) must complete before service-layer search refactors; UI bundle work can proceed in parallel.

---

## Plan

### Milestone 1 — Establish Baselines (Required)

Objective: lock “before” metrics to validate improvements.

Deliverables:

- Baseline build metrics captured: First Load JS, middleware size, worst route sizes
- Lighthouse baseline (mobile) for key pages: `/providers`, `/providers/[id]`, `/city/[cityName]`

Acceptance:

- Numbers recorded in UAT artifact (QA/UAT domain) with timestamps

### Milestone 2 — Database Search Indexing (Required)

Objective: make provider and community-service search RPCs index-backed.

Deliverables:

- New migration in `supabase/migrations/` adding GIN index strategy for:
  - `providers.provider_name`
  - `community_services.community_service_name`
- If required, adjust RPC functions `search_providers_enhanced` and `search_community_services_enhanced` to take advantage of indexes (while preserving RLS/security patterns)
- UAT data sizing step (to make index validation meaningful): create or import a representative dataset (order-of-magnitude target: 10k+ rows for searched tables) and document how it is generated and cleaned up

Acceptance:

- `EXPLAIN (ANALYZE, BUFFERS)` shows index usage (no sequential scan on large tables for search)
- Search latency improved under representative dataset (UAT/staging)

### Milestone 3 — Replace Direct ILIKE Searches (Required)

Objective: enforce Postgres-first search rule.

Deliverables:

- Update `src/services/categories.ts` search to use RPC-based full-text search instead of direct `.ilike()`
- Update `src/services/providers.ts` city filtering search paths (`fetchFilteredCities()` and any query search) to avoid direct ILIKE where used for search UX
- Keep any ILIKE fallback only as a deliberately documented emergency fallback, if needed

Acceptance:

- No direct ILIKE usage in these production paths
- Existing search UX remains functionally equivalent (language-aware ranking acceptable)

### Milestone 4 — Bound & Slim Data Fetches (High Priority)

Objective: avoid unbounded reads and reduce payload size.

Deliverables:

- Add `.limit()` (or RPC limit params) for:
  - `getNeeds()` and any list endpoints previously unbounded
  - category/bookmark/badge list fetches where unbounded
- Replace highest-impact `select('*')` calls (especially in `badges.ts` and provider forms) with explicit selects

Acceptance:

- No unbounded list reads in hot paths
- Payload size reduced for the heaviest list/query paths

### Milestone 5 — Frontend Bundle Reduction (P0)

Objective: reduce First Load JS and avoid loading animation/icon runtime on every route.

Deliverables:

- Reduce global/shared dependencies in shell components (`MobileHeader`, `MobileNavbar`, `MobileFooterBar`):
  - De-risk and reduce `motion/react` usage in global shell to interaction-critical animations only:
    - Keep: navigation open/close transitions, essential route/page transitions (if present), toast enter/exit transitions
    - Remove/defer from shell: decorative mount fades, scroll-trigger animations, motion wrappers around static layout elements
  - Reduce or replace widespread `@iconify/react` usage; consolidate onto a static/icon-component approach where possible
- Increase code splitting:
  - Dynamic import all `*Modal.tsx` components and other interaction-only components
  - Keep `swagger-ui-react` dynamically imported (already correct)

Acceptance:

- First Load JS shared by all ≤ 350 kB
- No regression in navigation responsiveness

Scope decision (locked): `@iconify/react` repo-wide replacement is NOT mandatory for v0.4.0 if bundle target is achieved via code splitting + shell trimming; prioritize the highest-impact call sites first.

### Milestone 6 — Middleware Size & Multi-Instance Readiness (Medium)

Objective: reduce edge overhead and remove unnecessary code from middleware.

Deliverables:

- Reduce middleware bundle toward ≤ 50 kB by simplifying non-critical logic
- Document rate-limiting constraints: in-memory Map is not multi-instance safe; keep as-is unless v0.4.0 explicitly moves to multi-instance

Acceptance:

- Middleware size reduced OR a clear, documented rationale for remaining size

### Milestone 7 — Validation & Release Readiness

Objective: confirm improvements and ensure the work is releasable.

Deliverables:

- Rerun build/bundle analysis and compare to baseline
- Rerun Lighthouse and compare key metrics
- Confirm search queries use indexes after migrations

Acceptance:

- All acceptance criteria satisfied or explicitly deferred with scope lock decision

### Milestone 8 — Version & Release Artifacts (Required)

Objective: align with roadmap target release v0.4.0.

Deliverables:

- Ensure release artifacts reflect v0.4.0 when bundled:
  - `package.json` version
  - `CHANGELOG.md` entry
  - Roadmap release tracker updated with Plan 007 targeting v0.4.0

Acceptance:

- Version artifacts consistent for the release bundle (handled with DevOps during release execution)

---

## Validation (Non-QA)

- Local: `ANALYZE=true npm run build` (bundle size) and `npm run build:standalone`
- UAT: Lighthouse baseline + post-change comparison
- DB: `EXPLAIN (ANALYZE, BUFFERS)` for key RPC search functions

## Risks

- Icon library migration could cause missing icons or layout regressions
- Removing motion from shell may change perceived polish; must stay UX-neutral
- Adding indexes/migration changes require careful rollout timing
- Middleware changes risk auth/waitlist redirect regressions if logic is simplified too aggressively

## Rollback

- Frontend: revert dependency reductions or dynamic import changes via git
- DB: migrations are harder to roll back; prefer additive migrations (new indexes) and keep existing RPC signatures stable

## Duration Estimates

- Analysis: 0.5–1.0 day (complete)
- Planning: 0.5 day (complete)
- Implementation: 1–3 days
- QA: 0.5–1.0 day
- UAT: 0.5 day
- DevOps: 0.5 day

Uncertainty drivers: scope of Iconify replacement and the amount of motion usage that must be preserved.

---

## Open Questions

- **OPEN QUESTION [RESOLVED]**: Should v0.4.0 treat the `@iconify/react` reduction as mandatory scope, even if it means replacing icons across many components?
  - Decision: Not mandatory if the First Load JS target is met via code splitting + shell trimming. Reassess only if bundle target cannot be reached.
- **OPEN QUESTION [RESOLVED]**: Which global-shell animations are essential vs. removable?
  - Decision: Keep interaction-critical transitions (nav open/close, essential page transitions, toasts). Remove/defer decorative shell animations.
- **OPEN QUESTION [RESOLVED]**: Do we have a UAT dataset large enough to validate index usage meaningfully?
  - Decision: Assume “no” by default; include an explicit UAT data sizing step (10k+ rows order-of-magnitude) before relying on `EXPLAIN` results.
