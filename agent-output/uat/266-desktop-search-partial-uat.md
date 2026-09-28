---
ID: 266
Origin: 266
UUID: 4f5bf2ef
Status: Active
---

# UAT Report: Desktop Search - Suggestion/Result Parity and Partial Matching

**Plan Reference**: `agent-output/planning/266-desktop-search-partial-plan.md`  
**Implementation Reference**: `agent-output/implementation/266-desktop-search-partial-implementation.md`  
**Code Review Reference**: `agent-output/code-review/266-desktop-search-partial-code-review.md`  
**QA Report Reference**: `agent-output/qa/266-desktop-search-partial-qa.md`  
**Date**: 2026-09-28  
**UAT Agent**: Product Owner (UAT)

## Changelog

| Timestamp (UTC)           | Agent Handoff | Request                                | Summary                                                                                                                                                                                                                                                                                  |
| ------------------------- | ------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-27T12:37Z         | QA            | Start Plan 266 value validation        | Began artifact-first assessment after QA Complete handoff; checked the inherited value statement and UAT lifecycle preflight.                                                                                                                                                            |
| 2026-09-27T12:38Z         | QA            | Complete Plan 266 value validation     | Automated evidence supports planned behavior, but live visual, configured build, UAT timing, and migration execution evidence are unavailable. Conditional approval with release gates recorded.                                                                                         |
| 2026-09-27T14:02Z         | DevOps        | DEV-assisted validation                | Applied migration 134 to the separate DEV project; verified RPC behavior, desktop suggestion/Enter flow, mobile Was? queries, six locale labels, DEV timings/index plans, and standalone build. Production-shared UAT DB remains untouched; RTL direction and configured CI remain open. |
| 2026-09-27T14:08Z         | DevOps        | Docker artifact smoke check            | Built the `linux/amd64` Docker image locally with DEV config and smoke-tested `/`, `/providers`, and the matched-menu result route at desktop/mobile sizes. No CI run or UAT/PROD deployment occurred.                                                                                   |
| 2026-09-28T07:54Z         | Implementer   | RTL root-document fix                  | `LanguageProvider` now synchronizes `document.documentElement.dir` (`rtl` for `ar`/`ur`/`ps`) and `lang`; focused regression passes. Full suite has one unrelated pre-existing manifest failure.                                                                                         |
| 2026-09-28T10:00Z         | QA            | Post-review QA re-test                 | Migration test-loader fix passed 31/31 focused migration tests, type-check, and diff check. UAT remains conditional because runtime release gates are unchanged.                                                                                                                         |
| 2026-09-28T10:15Z         | User          | Shared database release strategy       | User confirmed the UAT/PROD-shared Supabase project is the release target because no separate Supabase project is available. Migration-first execution remains required.                                                                                                                 |
| 2026-09-28T10:16Z approx. | User          | Shared database SQL smoke verification | Confirmed `search_prefix_query('döner keb')` returns `'döner':* & 'keb':*`; provider search returns provider `3ec9a671-702b-4d1a-a502-63fde3d8d52d` with matched menu item `Tac Tac Istanbul`; scoped suggestions returns `menuItem: Tac Tac Istanbul`.                                  |

**Memory**: NO-MEMORY MODE. Flowbaby retrieval returned `No workspace folder open`; this assessment is artifact-first.

## Value Statement Under Test

As a **desktop user searching for food, stores or community services**, I want **every suggestion I click to show the matching places, and to find places by typing only the start of a word**, so that **search never shows an empty list when matching places exist, and I can discover providers without knowing exact names**.

## Document Review Summary

- **Implementation**: reports M2-M7 complete; local PGlite fixtures cover matching and scope, the M5 branch table is populated, local timing/index evidence exists, and M1, UAT timings, browser validation are explicitly deferred.
- **Code Review**: `APPROVED`; blocking findings were resolved. Review confirms the migration is additive, uses invoker security, and must be applied before app deployment. Translation quality outside German/English remains for native-speaker/UAT review.
- **QA**: `QA Complete`; corrected per-function TDD evidence is 4/12/7 (23 total). Focused suite 67/67 and full suite previously passed 2,613/2,613 with 28 skipped. The post-review migration test-loader re-test passed 31/31, type-check, and diff check. After the RTL fix, the focused RTL/i18n tests pass 3/3; browser visual proof remains open.
- **DevOps**: local DEV validation now exists. No PR or CI runs exist for this branch. The user has selected the UAT/PROD-shared Supabase project as the release target; migration 134 still requires execution and verification there before app deployment.
- **Predecessor status**: implementation complete, code review approved with comments, QA complete, UAT conditional, DevOps release preflight blocked.

## UAT Scenarios

### Scenario 1: Suggestion leads to an in-scope result

- **Given**: a user searches within a section and optional city.
- **When**: the user selects a provider, menu-item, or cuisine suggestion.
- **Then**: the result list contains at least one matching provider in that scope.
- **Result**: PASS on the separate DEV project; UAT/production promotion not performed.
- **Evidence**: Chromium clicked the live `Menu Burger` suggestion for DEV provider `0f2cf3d2-cdee-4e8e-8eb0-cccb51cc54ba`, navigated to `/food/hofheim-am-taunus?q=Burger`, and rendered Burger Hannes. Screenshot: `agent-output/uat/evidence/266-dev-desktop-menu-suggestion.png`.

### Scenario 2: Word-prefix discovery, including stopword-shaped input

- **Given**: search fixtures include Istanbul Grill, Kabul Kitchen, Afghan providers, and providers serving Lahmacun.
- **When**: the user searches `Istan`, `Kab`, `Afgh`, `Lahm`, or `Ist`.
- **Then**: matching providers are returned without requiring a complete word.
- **Result**: PASS for the DEV fixture prefix `Burg`; plan examples not represented in DEV data remain supported by PGlite evidence.
- **Evidence**: desktop Enter with `Burg` returned Burger Hannes and `Serves: Burger`; direct SQL confirmed the result and scoped suggestions. The route and card were also checked at 390px mobile width.

### Scenario 3: Multi-word partial search on desktop and mobile paths

- **Given**: a user enters `döner keb` or a multi-word Was? query.
- **When**: results are requested.
- **Then**: token prefixes are AND-matched and the query does not raise a tsquery error.
- **Result**: PASS for a real mobile `/search` multi-word partial category query on DEV; `döner keb` behavior remains covered by PGlite rather than a DEV fixture.
- **Evidence**: `/search?section=food`, entered `Essen Tr`, returned `Essen & Trinken` without an error; `Burger` returned the menu item. Screenshots: `agent-output/uat/evidence/266-dev-mobile-multiword.png` and `agent-output/uat/evidence/266-dev-mobile-menu-search.png`.

### Scenario 4: Menu-item result visibly identifies the matched dish

- **Given**: a provider has an available menu item matching the search.
- **When**: the result card is rendered.
- **Then**: the matched dish appears as accessible text on that provider card.
- **Result**: PASS on the separate DEV project, not UAT/production.
- **Evidence**: selected the real `Burger` menu suggestion; Burger Hannes displayed the accessible text `Serves: Burger` on desktop and mobile. Screenshot: `agent-output/uat/evidence/266-dev-mobile-matched-menu.png`.

### Scenario 5: Scope, approved-only boundary, and locale coverage

- **Given**: providers span different sections/cities and include a pending provider.
- **When**: scoped suggestions/results are requested and the card is localized.
- **Then**: out-of-scope and pending providers are excluded; labels exist in all six locales.
- **Result**: PARTIAL pending browser rerun. All six translated labels rendered on the DEV card; the RTL implementation is fixed and synchronizes Arabic, Urdu, and Pashto root direction to RTL, covered by `LanguageProvider-rtl.test.tsx`. Existing screenshots predate this fix and are not used as post-fix RTL evidence.
- **Evidence**: focused RTL/i18n tests pass 3/3. Browser rerun with a configured environment is still required to confirm visual RTL layout.

### Scenario 6: Build, database preflight, timing, and migration order

- **Given**: application code calls migration 134 RPCs.
- **When**: the release is prepared.
- **Then**: a configured CI build succeeds; UAT preflight and timings are recorded; migration 134 is applied before UAT and production app deployments.
- **Result**: PARTIAL. Migration 134 was applied and verified on DEV; the standalone build and local Docker image build passed. No configured CI run, UAT/PROD migration, or UAT-volume performance comparison exists.
- **Evidence**: the linked DEV project is `qrekonfhaenjdnjhwdum`; UAT/PROD are the same project per `env.uat.template`. Applying 134 there would alter production. DEV measured six approved food providers and one available menu item. The local `linux/amd64` image `uflow-plan266-dev-check:local` returned HTTP 200 at `/`, `/providers` (6 results), and the matched-menu result route on desktop/mobile with no browser errors. Screenshots: [Docker root](evidence/266-docker-root-smoke.png), [Docker providers](evidence/266-docker-providers-smoke.png), [Docker desktop result](evidence/266-docker-desktop.png), [Docker mobile result](evidence/266-docker-mobile.png).

## Value Delivery Assessment

The automated and local fixture evidence strongly supports the planned behavior: suggestion candidates derive from the same scoped results matcher, prefixes and multi-word queries work, menu matches are carried to cards, and the approved-only and no-ILIKE constraints are covered. This is meaningful progress toward the stated user outcome, not just a passing test count.

The defining flow is now demonstrated against real DEV records in Chromium: the suggestion navigates to the provider result, the matched dish is readable on the card, the mobile `/search` multi-word path works, and all six strings render. This is meaningful DEV validation, but it is not production/UAT sign-off. The RTL code fix is covered by focused regression tests but lacks post-fix browser evidence, configured CI has not run, and the DEV dataset is too small to establish UAT performance or `/food?q=` regression. Value delivery remains **PARTIAL pending the release gates below**.

## QA Integration

**QA Report Reference**: `agent-output/qa/266-desktop-search-partial-qa.md`  
**QA Status**: QA Complete  
**QA Findings Alignment**: The 4/12/7 TDD evidence correction is accepted and all reported automated gates pass. The unavailable build and visual/UAT evidence remain open as deferred gates, not treated as passes.

## Technical Compliance

- **Plan deliverables**: M2-M7 documented complete; M1 pre-implementation UAT verification deferred as allowed by plan. M5 has no unconfirmed row in the implementation's local evidence table.
- **Test coverage**: 31 executable PGlite migration tests; 67 focused tests passed; full suite 2,613 passed, 28 skipped; type-check, lint, i18n, and manifest-based performance budget passed.
- **Known limitations**: RTL code is fixed but post-fix browser visuals are not rerun; no configured CI run; no UAT/PROD migration; DEV timings use 6 approved food providers and 1 available menu item; no pre-change `/food?q=` latency baseline. The full suite currently has one unrelated manifest failure caused by the existing `public/manifest.json` `/providers` shortcut edit.
- **Runtime/project access**: DEV project `qrekonfhaenjdnjhwdum` was explicitly linked before DDL. Migration 134 was applied there with the Supabase CLI and its migration ledger repaired/verified. The shared PROD/UAT project is now the declared release target; migration 134 still requires execution and verification there. GitHub has no PR or CI run for this branch.

## Objective Alignment Assessment

**Does code meet original plan objective?**: PARTIAL (real DEV browser flow verified; post-fix RTL and UAT/production runtime evidence remain open).  
**Evidence**: real DEV suggestion click and Enter path, mobile `/search` multi-word query, matched-menu card text, six locale labels, focused RTL regression, SQL RPC checks, and GIN index plans. The plan's production-backed UAT conditions remain unproven.  
**Drift Detected**: No scope drift is evidenced. The gap is validation/deployment evidence, not a documented change to the planned feature.

## UAT Status

**Status**: UAT Complete (conditional assessment; Plan status remains `QA Complete`, not `UAT Approved`).  
**Rationale**: The document review and value assessment are complete. The missing mandatory visual and runtime evidence prevents an unqualified UAT pass; it is tracked below with named owners, triggers, and closure evidence.

## Release Decision

**Final Status**: CONDITIONAL APPROVAL. **Not approved for production deployment until DF-1, DF-2, and DF-3 are closed.**  
**Rationale**: Automated evidence supports expected functionality, but the live visual value gate, configured build, and UAT database/migration/timing gates have not been demonstrated.  
**Recommended Version**: Next available patch after current `origin/main`; DevOps must confirm the exact version at Stage 1.  
**Key Changes for Changelog**:

- Scoped suggestions use the same result-matching core, reducing suggestion clicks that lead to empty results.
- Word-prefix and multi-word matching support discovery from partial input.
- Menu-item matches are carried to provider cards, with translations across six locales.
- Existing food concept/category matching uses the shared tokenizer to avoid multi-word query errors.

## Next Actions and Deferred Follow-ups

### DF-1: Real-data visual validation (Medium)

- **Owner**: QA/UAT.
- **Trigger/due window**: DevOps Stage 1 after migration 134 is applied to UAT; complete before production approval.
- **Progress/evidence**: DEV provider `0f2cf3d2-cdee-4e8e-8eb0-cccb51cc54ba` has a populated `Burger` menu item. Desktop suggestion click, desktop Enter prefix, mobile card, mobile `Essen Tr` multi-word query, and six locale strings were verified before the code fix. `LanguageProvider-rtl.test.tsx` now proves the post-fix root `dir`/`lang` behavior.
- **Remaining evidence**: QA/UAT must rerun a configured browser check after the fix to confirm visual RTL layout, then repeat/accept in the configured UAT/release environment after the migration-first deployment. Record browser/profile, observed routes, and console/network errors. Do not substitute old screenshots or DEV evidence for approval of the production-shared UAT runtime.
- **Release conditional**: yes. An unreachable state need not be tested; scope evidence to states reachable in the deployed flow and explain any feature-flag or prerequisite-state exclusions.
- **Fallback execution path**: when a Supabase development project and browser runtime are available, configure the local app against that project, provision through the dev SQL tool if needed, and repeat the same live-route checks. Do not substitute mocked props or an unidentified/production database for this gate.

### DF-2: Configured CI production build (Medium)

- **Owner**: DevOps/CI operator.
- **Trigger/due window**: Before merge/release execution, at DevOps Stage 1.
- **Progress/evidence**: `npm run build:standalone` completed locally with DEV `.env.local`. The repository Dockerfile built successfully for `linux/amd64`, and the built container smoke checks passed locally. The ordinary `npm run build` failed while collecting `/dashboard/import` because the route uses cookies. No GitHub PR or configured CI run exists for this branch. After the RTL fix, focused tests/type-check/lint pass; the full suite has one unrelated manifest assertion failure.
- **Required evidence**: the production build workflow succeeds for the release commit with the required Supabase URL and secrets configured; record workflow/run and commit. A local build is not CI closure evidence.
- **Release conditional**: yes; hold production deployment if the configured build fails.

### DF-3: UAT database preflight, performance, and migration-first deployment (High)

- **Owner**: DevOps.
- **Trigger/due window**: DevOps Stage 1, before UAT app deployment; repeat the migration-first ordering for production deployment.
- **Progress/evidence**: on DEV, migration 134 is recorded as applied and all RPCs returned expected fixture results. The user also verified on the shared database that `search_prefix_query('döner keb')` returns `'döner':* & 'keb':*`, provider `3ec9a671-702b-4d1a-a502-63fde3d8d52d` is returned with matched menu item `Tac Tac Istanbul`, and scoped suggestions returns the corresponding `menuItem` label. One-shot `EXPLAIN ANALYZE` times (DEV, 6 approved food providers/1 menu item): provider exact 20.853 ms, prefix 13.124 ms, two-word prefix 13.912 ms; suggestions exact 15.499 ms, prefix 17.185 ms, two-word prefix 16.191 ms. These small-data DEV values do not close UAT thresholds or response-regression comparison.
- **Required evidence**: the user has accepted that the UAT/PROD-shared Supabase project is the release target. Record the latest applied migration and M1 assumptions, apply migration 134 to that shared project first, verify the RPCs and indexes, then deploy the app. Measure on representative data with index EXPLAIN evidence and compare `/food?q=` against the pre-change baseline. Production app deployment remains gated on this evidence and CI success.
- **Threshold and fallback**: suggestions <=100 ms, provider matcher <=200 ms, and `/food?q=` response regression <=20%. If a threshold is missed, hold the app deployment, investigate, and use the documented app rollback path if the release has already started; do not proceed to production until disposition is recorded.
- **Release conditional**: yes.

## Next Step

Handing off to devops agent for release execution
