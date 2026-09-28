---
ID: 267
Origin: 267
UUID: ed174b2e
Status: Active
---

# Implementation Report: Plan 267 - Admin All Status Scope on Food Search

## Plan Reference

- Plan: `agent-output/planning/267-food-search-scope-mismatch-plan.md` (Revision 1, Critic APPROVED)
- Analysis: `agent-output/analysis/closed/267-food-search-scope-mismatch-analysis.md`
- Session: `S267-food-search-scope-mismatch`

## Date

2026-09-28

## Changelog

| Timestamp (UTC)   | Handoff               | Request                          | Summary                                                                                                                                                |
| ----------------- | --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-28T12:03Z | Critic -> Implementer | Implement approved Plan 267      | Started test-first implementation; root cause reconfirmed in search service.                                                                           |
| 2026-09-28T12:28Z | Implementer           | Plan 267 implementation complete | M1-M5 implemented locally; full tests, lint and type-check passed; build passed with isolated dummy Supabase settings. Migration not applied remotely. |

## Implementation Summary

Admin All now requests an explicit four-status scope (approved, pending, rejected, needs_revision) for food and store discovery. The API keeps the existing admin gate and no-store response behavior. Owner-removed listings remain excluded; public and non-admin searches remain approved-only. Each admin list card receives the row's own status, and the All view remains read-only. Suggestions follow the effective list scope. Map, near-me and home behavior remain deferred under D8/FU-1.

## Baseline & Measurements

- No latency target or production performance baseline was specified by Plan 267.
- Schema preflight: both connected projects have the referenced columns and current signatures expected by migration 135. DEV: `qrekonfhaenjdnjhwdum`; shared UAT/PROD: `rdtdtcfntopcxcigkqoq`.
- Existing RPC signatures observed on both projects: `search_providers_for_query(text,text,text,text,integer)` and `search_scoped_suggestions(text,text,text,integer)`.
- PGlite `EXPLAIN (ANALYZE, BUFFERS)` test after migration 135 confirms the existing `idx_providers_name_simple_search` GIN index remains eligible for provider-name prefix matching. This is index-plan evidence, not a live latency benchmark.
- Migration 135 has not been applied to either remote database by this implementation session.

## Milestones Completed

- [x] M1: Migration 135 preserves approved as the default/NULL scope, defines All as the explicit four-status set, excludes `removed_by_owner`, updates suggestions scope, replaces the old signature, and restores grants.
- [x] M2: API accepts `status=all` only through the existing admin/moderator gate and service-role path; status requests remain `no-store`. Provider outer query applies the same four-status allowlist.
- [x] M3: ProvidersContent normalizes URL status, separates selected tab from request scope, gates approved-only SSR `initialData`, keeps map/near-me on the selected tab, uses row-level status and renders All without moderation actions. Card labels are explicitly opted in. Desktop Header URL values normalize to the existing tab set.
- [x] M4: SearchBar and suggestions service pass the same effective review scope for admin food/store suggestions; omitted scope preserves the approved DB default.
- [x] M5: Deployment paths were audited; version and changelog updated. Migration remains a manual pre-deploy operation for DevOps/UAT.

## Files Modified

| Path                                                                           | Changes                                                                                                                                     | Lines / area                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `agent-output/planning/267-food-search-scope-mismatch-plan.md`                 | Status set to In Progress; implementation-start entry added.                                                                                | Header / Changelog             |
| `CHANGELOG.md`                                                                 | Current Unreleased date and Plan 267 entry.                                                                                                 | 3, 7                           |
| `package.json`                                                                 | Preliminary next patch version `0.15.21`.                                                                                                   | 3                              |
| `package-lock.json`                                                            | Root/package versions aligned to `0.15.21`.                                                                                                 | 3, 9                           |
| `public/manifest.json`                                                         | Build generator left only a missing-final-newline formatting delta; shortcut content was restored to `/food`.                               | EOF only                       |
| `src/services/providers/types.ts`                                              | Added request-only `all` to `AdminSearchOptions.status`; `ReviewStatusFilter` unchanged.                                                    | 206                            |
| `src/services/providers/search.ts`                                             | Outer query applies the explicit four-status set for admin All.                                                                             | 282-285                        |
| `src/app/api/providers/search/route.ts`                                        | Adds `all` to API validation; existing admin gate and cache path reused.                                                                    | 16, 37                         |
| `src/app/(public)/providers/ProvidersContent.tsx`                              | URL normalization, effective scope, initialData gate, selected-tab map scope, row status and explicit label opt-in.                         | 71, 178-188, 305-337, 577, 628 |
| `src/components/layout/Header.tsx`                                             | Normalizes invalid/all URL values to null tab state.                                                                                        | 68-76                          |
| `src/features/providers/components/ProviderCard.tsx`                           | Uses DB row status type and explicit read-only badge opt-in.                                                                                | 15, 39-41, 77, 385             |
| `src/features/search/components/DiscoveryResultsGrid.tsx`                      | Forwards row status and status-label opt-in independently from moderation mode.                                                             | 14, 50, 70, 140, 292-293       |
| `src/services/providers/suggestions.ts`                                        | Optional request scope forwarded only when supplied; non-admin RPC args unchanged.                                                          | 3, 16-18, 43                   |
| `src/features/search/components/SearchBar.tsx`                                 | Derives admin suggestion scope from URL tab and section.                                                                                    | 14, 44-63, 212, 227            |
| `src/components/shared/RootPageContent.tsx`                                    | Keeps nullable tab status assignable to the DB-row status presentation type.                                                                | 208                            |
| `src/features/providers/components/SearchResultsList.tsx`                      | Converts nullable status prop to optional status.                                                                                           | 164                            |
| `src/__tests__/migrations/134-desktop-search-partial.test.ts`                  | PGlite fixtures and regression coverage for defaults, All, removed-owner exclusion, suggestions, signature, idempotence and GIN index plan. | 6-13, 43-64, 84-159, 214-286   |
| `src/__tests__/services/providers.test.ts`                                     | Admin All outer-query and RPC-scope regression.                                                                                             | 199-224                        |
| `src/__tests__/api/providers-search.test.ts`                                   | Admin all/no-store/service-role contract and non-admin 403 route tests.                                                                     | 244-279                        |
| `src/__tests__/app/providers-content-location-resolution.test.tsx`             | All, URL normalization, SSR gate, request URL, map scope, per-row label, specific tab and store regressions.                                | 22-242, 295-394                |
| `src/__tests__/components/Header-admin-filters.test.tsx`                       | `status=all` and unknown URL fallback tests.                                                                                                | 24, 49-57                      |
| `src/__tests__/components/ProviderCard.test.tsx`                               | Explicit bookmark-mode status label and default opt-out tests.                                                                              | 753-783                        |
| `src/__tests__/features/search/discovery-results-grid-provider-count.test.tsx` | Grid-to-card status forwarding contract.                                                                                                    | 13-22, 172-190                 |
| `src/__tests__/services/search-suggestions-plan266.test.ts`                    | Explicit review scope RPC argument regression.                                                                                              | 37-57                          |
| `src/__tests__/components/SearchBar-near-me.test.tsx`                          | Admin All/specific-tab suggestions and non-admin default-scope tests.                                                                       | 3-5, 25-59, 80-133             |

Lifecycle housekeeping: terminal-status implementation document 219 was moved from `agent-output/implementation/` to `agent-output/implementation/closed/` per the session-start document-lifecycle check.

## Files Created

| Path                                                                           | Purpose                                                                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `supabase/migrations/135_plan_267_admin_all_status_scope.sql`                  | Function scope and suggestions-signature migration; apply manually before dependent app deployment. |
| `agent-output/implementation/267-food-search-scope-mismatch-implementation.md` | This implementation record, inheriting Plan 267 identifiers.                                        |

## Deployment Path Audit

- `.github/workflows/deploy-uat.yml` and `.github/workflows/deploy-hetzner.yml` deploy Docker images; neither applies Supabase migrations.
- `.github/agents/devops.agent.md` documents the current PROD migration paths: MCP `apply_migration` per file or `supabase db push --linked`. The prior migration 134 was applied manually by the user to shared UAT/PROD project `rdtdtcfntopcxcigkqoq`.
- `scripts/apply-provider-social-migration.sh` is a legacy helper for migration 002 and invokes generic `supabase db push`; it is not called by either deployment workflow and was not run. Other matching setup docs are generic/manual instructions, not CI entrypoints.
- The numeric-prefix scan found a pre-existing collision at 089 (`089_fix_search_food_concepts_junction.sql` and `089_add_food_category_american.sql`). No CLI bulk push was run. Use the documented per-file MCP/dashboard route for migration 135 unless DevOps resolves that existing collision before any CLI push.
- Required order for both UAT and production: apply migration 135 first, then deploy the app. This implementation session did not modify or execute deployment workflows and did not apply remote DDL.

## Code Quality Validation

- `npm run lint`: PASS, 0 errors and 148 warnings across the repository.
- `npm run type-check`: PASS (`tsc --noEmit`).
- `npx vitest run`: PASS, 292 files; 2,663 passed, 28 skipped.
- Focused Plan 267 suite: PASS, 9 files / 149 tests; migration suite rerun after added acceptance checks: 36/36 passed.
- `npm run build` without env: BLOCKED at route-data collection by missing `NEXT_PUBLIC_SUPABASE_URL`.
- `npm run build` with invented, non-routable Supabase URL and structurally valid dummy keys: PASS; PWA compilation completed and 102 static pages generated. Existing Swagger dependency import warnings (`js-yaml` / `immutable`) were emitted but did not fail the build. No live Supabase endpoint was used.
- `git diff --check`: PASS.
- Version lockstep: `package.json` and `package-lock.json` both show `0.15.21` after `npm install --package-lock-only`.
- i18n self-scan: no new hardcoded user-facing copy or translation keys; the label reuses the existing status text behavior.
- VS Code Problems also reports unrelated existing workflow secret-context and TS deprecation diagnostics; the repository lint and type-check commands pass.

## Value Statement Validation

**Original**: Admins/moderators on food and store discovery see all moderation candidates on All, each card labeled with its own status, without moderation buttons. Public users remain approved-only.

**Delivered in code/tests**: the explicit `all` request crosses the admin-gated API and both result/suggestion SQL scopes; the outer query independently restricts to the same four statuses. UI state normalizes `all`/unknown URL values to All, avoids approved-only SSR data on All, and keeps maps/near-me on the selected tab. Grid tests confirm status labels are explicitly enabled and moderation callbacks are absent on All. Public defaults remain approved-only.

## Search/Filter Client-Interaction Trace

- URL lifecycle: API request builder retains `q`, `location`, `filters`, and `section`, and sends `status=all` as request-only scope. Regression invokes the actual query function and asserts all five parameters. Page URL `status=all` is normalized to the All tab; existing tab navigation continues to start from current `window.location.search`.
- Inline action guard: All passes no `onApprove`/`onReject`; specific status tabs keep moderation enabled. `ummah` remains excluded. Grid-to-card regression covers the wrong-action case.

## Multi-Plan State Audit

Plan 058/235 URL status state and Plan 089 section context were reviewed in `ProvidersContent`, `Header`, and `SearchBar`. Status is URL-derived rather than hydrated from localStorage. The implementation keeps selected status separate from effective request scope; map/near-me receive the selected status, and All cannot inherit approved-only `initialData`. No prior localStorage state mutation in these paths was changed.

## TDD Compliance

| Function/Class                                        | Test File                                                                      | Test Written First? | Failure Verified? | Failure Reason                                                                            | Pass After Impl? |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------- | ----------------- | ----------------------------------------------------------------------------------------- | ---------------- |
| `search_providers_for_query`                          | `src/__tests__/migrations/134-desktop-search-partial.test.ts`                  | Yes                 | Yes               | Plan 267 migration file absent; later idempotence assertion caught non-idempotent CREATE. | Yes              |
| `search_scoped_suggestions(..., review_status_scope)` | `src/__tests__/migrations/134-desktop-search-partial.test.ts`                  | Yes                 | Yes               | Migration 135 absent; second-apply test then caught duplicate signature creation.         | Yes              |
| `searchProviders()`                                   | `src/__tests__/services/providers.test.ts`                                     | Yes                 | Yes               | Expected explicit status `.in()` call was absent; only provider ID filter was observed.   | Yes              |
| `GET /api/providers/search`                           | `src/__tests__/api/providers-search.test.ts`                                   | Yes                 | Yes               | Admin all returned 400 instead of 200; non-admin all returned 400 instead of 403.         | Yes              |
| `fetchProvidersFromAPI()` / `ProvidersContent`        | `src/__tests__/app/providers-content-location-resolution.test.tsx`             | Yes                 | Yes               | No-param admin key was null instead of all; `status=all` reached map as `all`.            | Yes              |
| `ProviderCard`                                        | `src/__tests__/components/ProviderCard.test.tsx`                               | Yes                 | Yes               | Opted-in bookmark mode did not render the pending label.                                  | Yes              |
| `DiscoveryResultsGrid`                                | `src/__tests__/features/search/discovery-results-grid-provider-count.test.tsx` | Yes                 | Yes               | Card received undefined status and no explicit show-label prop.                           | Yes              |
| `Header` URL normalization                            | `src/__tests__/components/Header-admin-filters.test.tsx`                       | Yes                 | Yes               | All tab had `aria-selected=false` for `status=all` and unknown values.                    | Yes              |
| `fetchSearchSuggestions()`                            | `src/__tests__/services/search-suggestions-plan266.test.ts`                    | Yes                 | Yes               | RPC call omitted `review_status_scope`.                                                   | Yes              |
| `SearchBarContent` suggestions effect                 | `src/__tests__/components/SearchBar-near-me.test.tsx`                          | Yes                 | Yes               | Admin All and pending requests omitted `reviewStatusScope`.                               | Yes              |

## Test Coverage

- Unit: provider search scope, suggestions RPC args, card label opt-in, URL tab normalization.
- Integration: API authorization/cache contract, Grid-to-Card row status, client request URL parameters.
- Database: migration execution in PGlite for approved defaults/NULL, four-status All, owner-removal exclusion, suggestions scope, signature uniqueness, idempotence and GIN plan.

## Test Execution Results

| Command                                            | Result              | Notes                                                                                                                                                 |
| -------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run`                                   | PASS                | 292 files; 2,663 passed, 28 skipped.                                                                                                                  |
| Focused Plan 267 Vitest files                      | PASS                | 9 files; 149 tests. Migration suite subsequently expanded and passed 36/36.                                                                           |
| `npm run lint`                                     | PASS                | 0 errors; 148 warnings.                                                                                                                               |
| `npm run type-check`                               | PASS                | `tsc --noEmit`, exit 0.                                                                                                                               |
| `npm run build`                                    | PASS with dummy env | Full build and static page generation pass with non-routable dummy configuration; ordinary env-less build is blocked as described above.              |
| Playwright `http://localhost:3100/food?q=Munchies` | PARTIAL             | HTTP 200, page rendered, no browser page errors; anonymous empty state only. Admin flow could not be verified without an admin session and real data. |

## Outstanding Items

- **Migration apply**: DevOps/operator must apply migration 135 to shared UAT/PROD before app deployment; owner DevOps, trigger M5 deployment, evidence: successful per-file apply and post-apply RPC signature/scope checks.
- **Admin browser validation**: QA/UAT needs a real admin session and Munchies test data after migration apply. Verify All shows Pending label/no actions, Pending retains actions, store All labels, and public remains approved-only.
- **Near-me/map/home deferral (N1/D8)**: Planner owns FU-1; trigger is allocation of the follow-up ID by the control window; evidence is admin All semantics for the deferred near-me/map/home surfaces.
- **GitHub issue #435 stale body (N3)**: DevOps owns refresh; trigger DevOps Stage 1; update issue body from Plan 267.
- **Mobile `/store` tabs (N2)**: accepted per user; mobile shows the full labelled list but has no in-page status tabs. Desktop Header has tabs.
- **Version**: `0.15.21` is preliminary; DevOps confirms after fetching tags.
- **Build/runtime**: build was successful with dummy environment values, not a live deployment configuration. QA/CI should build with configured environment values.
- **PWA manifest**: build generation left an EOF-only formatting delta in `public/manifest.json`; shortcut content is restored to `/food`.

## Next Steps

Code Review, then QA, then UAT. QA owns the real-data/admin browser validation and confirms the migration is applied before deployment. Memory storage was unavailable (`No workspace folder open`); this report is the continuity record.
