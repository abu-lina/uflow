# UFlow (Ummah Flow) - Product Roadmap

**Last Updated**: 2026-04-27
**Roadmap Owner**: roadmap agent
**Current Version**: v0.10.39
**Strategic Vision**: UFlow empowers the global Muslim community by making halal businesses and community services easily discoverable, strengthening the bonds of Ummah through transparent, trust-first connections that drive economic growth and mutual support across cities and countries.

## Change Log

| Date & Time      | Change                                                             | Rationale                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-01-27 14:00 | Initial roadmap creation                                           | Established strategic direction based on "strengthening Ummah" outcome with focus on growth and community                                                 |
| 2026-01-27 15:30 | Epic 2.1 implementation plan created (Plan 001), validation passed | Detailed technical plan delivers all 5 acceptance criteria, ready for Architect/Security review                                                           |
| 2026-01-27 16:10 | Plan 001 revised for architecture gates                            | Implementation is gated by privacy-safe endorsements, unified role authority, and DB-side stable ranking                                                  |
| 2026-02-21       | Plan 003 released (v0.2.0): Console errors bugfix                  | Fixed hydration mismatch + diagnosed CORS NXDOMAIN; zero rework, exemplary workflow execution                                                             |
| 2026-02-21       | Process improvements implemented (PI 004)                          | Added duration estimates requirement (Planner) + remote divergence preflight (DevOps Stage 2)                                                             |
| 2026-02-22       | Plan 001 released (v0.3.0): Provider Trust & Verification System   | Complete UI trust badges + endorsements, 109 tests passing, UAT approved, deployed to production                                                          |
| 2026-02-22       | Plan 006 released (v0.3.1): Android Suggest Provider Form Bugfix   | Hotfix for Android UX regression; userToggledRef pattern prevents non-user focus triggers (Epic 3.1)                                                      |
| 2026-02-22       | Process improvements implemented (PI 007)                          | Focus/scroll checklist, UUID inheritance, critique closure rules, UTC timestamps, tool capability updates                                                 |
| 2026-02-22       | Plan 007 released (v0.4.0): Performance Improvements               | Bundle reduction 687kB→105kB (85%), tsvector search, GIN indexes; zero rejections, exceeded targets by 70%                                                |
| 2026-02-22       | Process improvements implemented (PI 008)                          | Schema verification gate for migrations + memory checkpoints at milestone boundaries (from Retro 007)                                                     |
| 2026-02-22       | Plan 008 released (v0.4.1): Search Index Validation & Fallbacks    | GIN indexes proven <1ms, fallback-on-empty fixed, bounded queries; zero rework, PI feedback loop validated                                                |
| 2026-02-23       | Plan 010 released (v0.5.0): Next.js App Router Refactor            | P0+P1 safety/alignment: removed localhost calls, server-first Providers discovery, caching discipline                                                     |
| 2026-02-23       | Process improvements implemented (PI 010)                          | Shell path quoting + commit message file guidance added to DevOps/QA instructions (from Retro 010)                                                        |
| 2026-02-23       | Orphan sweep: 11 terminal docs moved to closed/                    | Cleaned deployment/implementation/code-review/uat domains per document lifecycle                                                                          |
| 2026-02-23       | Plans 011+012 released (v0.6.0): Repository Structure Refactor     | Plan 011: placement rubric + folder READMEs; Plan 012: 30 root files moved; multi-plan bundle validated                                                   |
| 2026-02-23       | Process improvements implemented (PI 014)                          | Code Review file-move checklist, QA path regression check, Planner release bundling scan, DevOps stage evidence (from Retro 013)                          |
| 2026-02-23       | Plan 015 released (v0.6.1): MIUI PWA form rendering fix            | Unblocked Xiaomi/MIUI PWA users from blank recommend form via defensive viewport + layout containment fixes                                               |
| 2026-02-23       | Process improvements identified (Retro 015)                        | Pending codification: design-review UAT for CSS fixes, automated-first QA for CSS, DevOps evidence template reuse, UTC timestamps, related-issues linking |
| 2026-03-02       | Plan 032 released: DIY Agent Memory System (tooling)               | Standalone tooling release — memory-extension-v0.1.0 replaces Flowbaby backend, eliminates daemon lock failures, local-first SQLite WAL                   |
| 2026-03-03       | memory-extension-v0.1.1 hotfix released                            | Fixed multi-root workspace detection, added OutputChannel, Electron ABI rebuild, caching bug fix — 4 post-release activation bugs resolved                |
| 2026-03-07       | Versions v0.6.2–v0.6.11 backfilled in roadmap                      | 10 patch releases exist as git tags with detailed changelogs — see CHANGELOG.md for full release notes. Roadmap tracking established after v0.6.1         |
| 2026-03-07       | Plan 034 released (v0.6.12): Provider image load performance fix   | Eliminated >10s hero image load latency via WebP-only format (no AVIF cold encoding), correct sizes/priority attributes, Docker volume cache persistence  |
| 2026-03-08       | Plan 037 released (v0.7.2): npm dependency security remediation    | Eliminated all 10 npm vulnerabilities (8 high, 2 moderate) via package overrides; 0 vulnerabilities confirmed; zero application code changes               |
| 2026-03-13       | Plans 039+040 released (v0.8.1): Provider outreach improvements    | Plan 039: personalized provider names in outreach emails; Plan 040: WhatsApp config. Bundled release. Retrospective 040 + ProcessImprovement 041 completed |
| 2026-03-13       | Process improvements implemented (PI 041)                          | DevOps phase-start skill preflight, Stage 1 sequencing fixes, timestamp discipline mandate, UAT deferred-risk structured tracking (from Retro 040)          |
| 2026-03-14       | Plan 042 released: Parallel Copilot Sessions (workflow-only)       | Operator protocol for parallel development workflows; no product version bump; 3 local commits pushed (f40d35e, bc4d0c2, 845ce10)                           |
| 2026-03-18       | Plan 044 released (v0.8.2): Mobile footer overlay layer bugfix     | Fixed invisible tap interceptor blocking mobile footer interactions via z-index/pointer-events fixes                                                        |
| 2026-03-18       | Process improvements implemented (PI 044)                          | Local UI verification gate pre-UAT, interaction-layer audit checklist, post-UAT delta protocol, invisible interceptor bug heuristic (from Retro 044)        |
| 2026-03-18       | Orphan sweep: 4 terminal docs moved to closed/                     | Cleaned deployment (042, v0.8.2) and process-improvement (044 analysis + updates) per document lifecycle                                                    |
| 2026-03-19 09:00 | Plan 045 released (v0.8.4): Providers category filter bugfix       | BUG-1: URL param now takes precedence over stale React context; BUG-2: non-DE/EN locale browse (Arabic/Turkish/Urdu/Pashto) fixed; debug log cleanup        |
| 2026-03-19       | Process improvements implemented (PI 045)                          | Bugfix handoff completeness checklist + client-state precedence regression test pattern added to `.github/copilot-instructions.md` (from Retro 045)         |
| 2026-03-19       | Roadmap updated with v0.8.4 and deferred open actions              | Post-release housekeeping: version tracking, deferred open actions surfaced as blocking items                                                                |
| 2026-03-19       | Plan 046-OA-2 resolved: flatted HIGH vuln fixed in v0.8.5          | flatted 3.3.3→3.4.2 via package-lock.json update; `npm audit --audit-level=high` EXIT 0; 267 tests pass; released as v0.8.5                                  |
| 2026-03-22T20:36Z | Plan 053 released (v0.8.13): JoinHalal import integrity fixes      | Fixed multi-block vxconfig parsing, restored stable JoinHalal source IDs, and auto-created missing Speisen offers during import                              |
| 2026-03-22T23:14Z | Plan 054 released (v0.8.14): JoinHalal sitemap filter + RPC exit   | Excluded listing pages from JoinHalal sitemap candidate sets and made write-path batch failures terminate non-zero                                           |
| 2026-03-23T08:12Z | Plan 055 released (v0.8.15): JoinHalal RPC schema drift fix        | Removed `provider_description` from the JoinHalal upsert RPC, added fail-fast RPC preflight, and aligned staging runbooks with migration 064                 |
| 2026-03-24T03:15Z | Plan 058 released (v0.8.21): Admin review in providers discovery   | Admin provider review integrated into main /providers discovery page with status filter tabs, fixed RLS bypass with service-role client, excluded community services from moderation, removed .single() error |
| 2026-03-24T03:30Z | Process improvements implemented (PI 058)                          | Admin Runtime Smoke Gate (UAT), Shared Results Actionability Checklist (Planner + Code Reviewer), Release Version Discipline (UAT) from Retrospective 058      |
| 2026-03-24       | v0.8.22 released: Provider scroll render bug fix                   | Removed react-window virtual list; restored stable CSS grid for provider listing (render regression across browsers)                                           |
| 2026-03-24       | v0.8.23 released (Plan 057): JoinHalal badge fallback + alcohol backfill | Visible-rating badge fallback for providers without badges; safe alcohol-content backfill for JoinHalal import                                            |
| 2026-03-24       | v0.8.24 released: Remove legacy admin panel (S054)                 | Removed /dashboard route group, admin API routes, admin UI components, and rate-limit entries; preserved Supabase-layer review_status gate for operator moderation |
| 2026-03-24       | Process improvements implemented (PI 059)                          | Removal-Surface Enumeration (Planner), Removal-Surface Validation + Deleted-Module Residue Check (QA), Removed Capability Discoverability Gate (UAT), Deleted-Module Residue Sweep 6h (Code Reviewer) from Retrospective 054 |
| 2026-03-25       | Plan 061 released (v0.9.0): Admin provider edit flow               | Added admin provider editing from moderation detail view, including edit sub-pages and admin moderation handoff controls |
| 2026-03-25       | Plan 060 released (v0.9.1): Admin edit state persistence fix       | Restored admin category/offers/needs draft-state persistence on return to the edit form with admin-prefixed localStorage isolation and regression coverage |
| 2026-03-26       | Plan 063 released (v0.9.3): Profile menu mobile auth entry fix     | Restored mobile auth entry for fresh/logged-out users, unblocked auth routes in early-access mode, hid navbar during onboarding splash |
| 2026-03-28       | Plans 067+060 released (v0.9.8): Splash vertical centering bundle  | Full onboarding mobile centering across all 7 AnimatePresence branches |
| 2026-03-29       | Plan 064 released (v0.9.9): Iconify SW CORS fix                    | nginx sw-push-handler.js no-cache blocks + CSP frame-src cleanup |
| 2026-03-29       | Plan 065 released (v0.10.0): Automated provider enrichment pipeline (M1–M3) | enrichment_candidates schema, CLI runner with dry-run/write modes, admin review surface with approve/reject/bulk-approve; ownerless providers only |
| 2026-03-29       | Process improvements implemented (PI 070)                          | Deferred Findings Rule (Critic), Entity Ownership Check (Planner), Pre-QA Static Gate (Implementer) from Retrospective 065 |
| 2026-03-29       | Critique 065 closed via P1 Deferred Findings Rule                  | 4 findings RESOLVED, 5 findings DEFERRED to M4/M5 with named owners and triggers; first use of PI-070 closure path |
| 2026-03-29       | v0.9.10 released: Iconify service-worker interception hotfix       | Removed the explicit Iconify `NetworkOnly` Workbox route so browsers handle CDN JSON fetches natively |
| 2026-04-03 17:05 | Plans 075+076 released (v0.10.5): iOS footer CTA overlay fixes    | Released the iOS footer overlay fix bundle after version-collision rebase onto main; current version advanced to v0.10.5 and deferred device validation remains tracked via open-actions |
| 2026-04-04       | v0.10.5 deferred UAT validation confirmed                          | User confirmed the post-release iOS/UAT validation passed, so the roadmap no longer treats Plans 075+076 as active release blockers |
| 2026-04-04       | Plan 077 released (v0.10.6): Mobile header overlap fix             | Released safe-area-aware providers header offset fix for notch iPhones with regression tests and lifecycle closure |
| 2026-04-04       | Plan 079 released (v0.10.8): Admin provider URL edit fix           | Normalized schemeless website URLs in edit/create flows so browser URL validation no longer blocks moderation approve/reject actions |
| 2026-04-05T12:15Z | Plan 080 in progress: Agent Model Cost Optimization (internal tooling) | 4-tier model strategy reduces agent cost multiplier 42x → 20.66x (~51% savings); no version bump; all config gates passed; M-1 GPT-5.3-Codex runtime verification gating QA Complete |
| 2026-04-05T12:30Z | Plan 080 closed (internal tooling): Agent Model Cost Optimization      | QA Complete, M-1 accepted risk (platform abstraction), committed locally; 50.8% agent cost savings delivered |
| 2026-04-05       | Plan 081 released (v0.10.9): Community service open (partial)          | Community service detail page parity, ProviderDetailModal in CS view, profile provider RLS fix (M8); M9/M10 admin CS edit deferred to Plan 083 |
| 2026-04-06       | Plan 083 released (v0.10.11): Admin community service edit/review       | Full admin CRUD for community services — edit fields, approve, reject with feedback, request revision; Plan 082 M8 profile provider RLS fix bundled |
| 2026-04-06       | Plan 082 (S82) released (v0.10.12): Saved page search bar visibility fix | SearchBar now remains visible and interactive in no-results state on /saved; lifted out of conditional branch chain; eliminates dead-end search state on mobile |
| 2026-04-06       | Plan 084 released (v0.10.13): GitHub Issues integration for workflow pipeline | Planner creates GitHub Issues on plan finalization; DevOps closes on release; 7 custom labels; 5 YAML issue form templates for manual issue creation |
| 2026-04-06       | Plan 083 S83 released (v0.10.14): Full admin CS edit UI | Full ProviderEditForm adapter for community services — edit fields, PATCH APIs with rate-limiting/Zod/audit log, approve/reject with feedback, `hideSocialInitiatives` prop; released by Session 83 |
| 2026-04-06       | Plan 085 released (v0.10.15): Fix profile provider navigation links | Fixed 4 broken provider card click handlers in ProfileContent.tsx — cards now navigate to `/providers/:id` (public detail) instead of `/profile/providers/:id` (404). Abbreviated pipeline; 8 regression tests; tag v0.10.15 pushed. Closes #125, #128 |
| 2026-04-07       | Plan 085 released (v0.10.16): Restore resilient fetch pattern on CS detail page | Removed `notFound()` server-side guard on CS detail pages; wired `useCommunityService()` React Query hook client-side so admin/owner RLS clauses succeed with browser session. Admins can now view/approve/reject non-approved CS; owners see own pending submissions. Matches provider detail architecture (Plan 081). Tag v0.10.16 pushed. Closes #130 |
| 2026-04-07       | Plan 086 released (v0.10.17): Modal.tsx accessibility refactor (WCAG 2.1 AA) | Closed 9 accessibility gaps in the base Modal component: `useScrollLock`, `useAriaHidden`, `useFocusTrap`, `useDelayedUnmount` hooks; escape→keyup, drag-close via mouseDownTargetRef, `useId()` sr-only title, backdropRef z-index layering. 35 new tests (23 unit + 12 integration), 934 total. Tag v0.10.17 pushed. Closes #132 |
| 2026-04-11       | Plans 089 released (v0.10.18): Three-section discovery redesign — FOOD / UMMAH / BUSINESS | Restructured providers discovery into 3 sections with section-filtered search, URL-param routing, and i18n. Tag v0.10.18 pushed. |
| 2026-04-19       | Plans 090+091+092 released (v0.10.19): Home Nav Redesign session bundle | Plan 090: merged discovery surface + HomeSearchBar; Plan 091: SectionSelector Figma polish + /suchen route; Plan 092: ExpandSection component + search accordion consistency. Tags v0.10.19 pushed. Closes #144 #145 #146 |
| 2026-04-19       | Plan 093 released (v0.10.20): City Interest — Notify Me for Unavailable Cities | EmptyCityCard component, POST /api/city-interest/subscribe, GeoNames 27K cities dataset, checkCityExists() targeted lookup, 25 tests. Tag v0.10.20 pushed. Closes #147 |
| 2026-04-19       | Plan 094 released (v0.10.21): Provider Catalog Schema Evolution | Added provider_menu_items and provider_service_offers tables with unified search_provider_items RPC, RLS policies, and extended provider_stats MV. Enables future ordering-system foundation. Tag v0.10.21 pushed. Closes #148 |
| 2026-04-20       | Plan 095 released (v0.10.22): Unified Catalog Architecture — Ummah Section | Added community_projects table, categories.applicable_section scoping, search_community_projects RPC, and extended provider_stats MV with community_project_count. Completes three-section FOOD/STORES/UMMAH org→item hierarchy. Tag v0.10.22 pushed. Closes #151 |
| 2026-04-21       | Plans 096+097 released (v0.10.24): Food concept vocabulary search for Was? section | Plan 096: wired Was? accordion to live meal search with WasMealResults component and provider lookup augmentation. Plan 097: replaced broken provider_menu_items search with search_food_concepts RPC (dual-language tsvector, GIN array containment) returning deduplicated food concepts with provider counts. Migration 070 deployed to production. Tags v0.10.24 pushed. Closes #153 #154 |
| 2026-04-24       | Plans 098+099+100 released (v0.10.25): Was? category redesign + PWA gitignore + background-selection token | Was category row Figma redesign (WasCategoryResults), PWA fallback-development.js gitignore fix, bg-background-selection CSS variable. Tag v0.10.25 pushed. |
| 2026-04-24       | Plans 101+102 released (v0.10.26): Wo location default + city results redesign | Plan 101: pre-fill Wo field with onboarding city, Was/Wo state parity, dynamic header. Plan 102: WoCityResults component with popular cities idle state, recent searches, controlled accordion, 6-locale i18n. Tag v0.10.26 pushed. Closes #159 #162 |
| 2026-04-25       | Process improvements implemented (PI 101)                                       | PI-1: Accordion/Typeahead Idle-State Scenarios (UAT); PI-2: Accordion Mock Fidelity (QA); PI-3: Multi-Plan State Extension Audit (Implementer); PI-5: Post-UAT Re-Test Section Pattern (QA). PI-4 already codified in planner.agent.md 5e. Root cause: post-UAT idle-state bugs from Plan 102 state-coupling pattern. |
| 2026-04-25       | Plan 103 released (v0.10.27): WerAudienceFilter — Wer? audience selector on search page | WerAudienceFilter component with 3 rows (Männer, Frauen, Kinder), each with colored icon, label, subtitle, and independent ±stepper counter. Min-one-person guard enforced. Clear-all resets Wer counters via werResetSignal. Single-open accordion invariant maintained. 6 translation keys, 3 SVG icons, 3 unit + 2 page regression tests. Tag v0.10.27 pushed. Closes #164 |
| 2026-04-26       | Plan 104 released (v0.10.28): Filter accordion UI — 5 Islamic-context filter options | FilterSection accordion with 5 filter categories (audience/Wer stepper, prayer space, parking, delivery, dietary). Gebet icon updated to PrayerRug stroke-rounded design. 1086 tests passing. Tag v0.10.28 pushed. PR #167 merged. |
| 2026-04-26       | Plan 105 released (v0.10.29): Wire Values & Amenities filters to provider search results | Wired 5 filter keys (muslim→muslim_owned, spenden→accepts_donations, solidaritaet→solidarity_pricing, parken→has_parking, gebet→has_prayer_space) from /search UI through URL→API→service layer AND predicates. AND semantics, silent-strip unknown keys, ummah section isolated, React Query cache partitioned. 39/39 filter tests pass. Tag v0.10.29 pushed. PR #169. Closes #168 |
| 2026-04-27       | Plan 106 released (v0.10.30): Badge/Boolean Data Coherence | M1: badge-to-boolean sync trigger (migration 076 — AFTER INSERT/DELETE on provider_badges); M2: creation path wiring (providerService.ts writes badge rows + boolean columns on provider creation); M3: section-aware FilterSection (ummah hides all provider filters, business hides muslim filter). Tag v0.10.30 pushed. Closes #170 |
| 2026-04-27       | Plan 107 released (v0.10.31): Ummah Tab Section-Conditional Search | New WasServiceTypeResults (10 static community service types, query filtering) and UmmahFilterSection (5 Ummah-specific filters: kostenlos, online, sprache, zertifiziert, geschlechtergetrennt). Section-conditional rendering in /search page — Ummah tab now distinct from Food/Business. State-reset guards on section change; food RPC effects guarded. i18n parity across 6 locales. Staged delivery: providers wiring is follow-up. Tag v0.10.31 pushed. Closes #172 |
| 2026-04-27       | Ad-hoc food search prefix matching released (v0.10.34): Prefix tsquery + cuisine label normalization | Typing "Afgh" now returns "Afghanisch" in food cuisine search; cuisine labels normalized ("Küche" removed, "-ische"→"-isch"). Migration 077 updates 3 RPCs with :* prefix tsquery, explicit permissions, and backward-compatibility guards. TDD contract test added. Tag v0.10.34 pushed. |
| 2026-04-27       | Plan 107 released (v0.10.35): Ummah section tab state rollback fix + 3-item preview parity | Switching sections no longer transiently reverts tab state during async router.replace; no-op guard on already-active tab; 3-item preview parity across all sections; Ummah service type recent searches persisted. Tag v0.10.35 pushed. |
| 2026-04-27       | Plan 108 released (v0.10.36): Hide Wer accordion for Stores section | Wer (audience) accordion hidden when selectedSection === 'business'; accordion reset guard on section switch prevents all-collapsed state. Closes #174. Tag v0.10.36 pushed. |
| 2026-04-27       | Plan 110 released (v0.10.37): CI pipeline fixes | Fixed invalid dependency-review-action SHA pin; raised /providers/[provider_id] perf budget 220→260 kB; added pipefail to CI build step. All CI Pipeline jobs pass. Tag v0.10.37 pushed. |
| 2026-04-27       | Plan 109 released (v0.10.38): Providers results page UI enhancements | SearchContextBar on /providers header shows section icon, search term, location, wer audience; quick-edit button routes to /search with section preserved; location+wer URL params transported from /search; mobile nav active-state locked on /providers. v0.10.37 (CI fixes) was claimed by session/110 concurrently, so v0.10.38 used. Tag v0.10.38 pushed. Closes #175. |
| 2026-04-27       | Plan 108 released (v0.10.39): Admin Section (listing_type) editing in provider moderation | Admin moderators can now change provider Section classification (Food/Business/Unclassified) from /dashboard/providers/[id]/edit. Previously read-only; now editable select in admin moderation context (reviewFooterActions prop); owner edit flow unchanged. 19/19 regression tests. No DB migrations. Deferred: DF-1 i18n, DF-2 route test (108-open-actions.md). PR #180. Tag v0.10.39 pushed. |
| 2026-04-27       | Ad-hoc search quality fixes released (v0.10.33): Food recents filter + Wo empty-state i18n | Fixed cross-section contamination in food "What" recent history (non-food service-type entries filtered out). Added localized "Wo?" question-form label for Where accordion across 6 locales. 2 regression tests added. Tag v0.10.33 pushed. |
| 2026-04-27       | Search expand show-all preview released (v0.10.32): Feature-flagged 3-item preview UX + FigmaSearchBar | WasMealResults/WasCategoryResults/WoCityResults/FilterSection: 3-item show-all preview behind `enableSearchExpandShowAllPreview` flag (default off). Recent-priority UX: recent searches shown over popular items; state resets on query change. FigmaSearchBar: compact mobile search bar with hamburger collapse/expand. Provider grid: 2-col mobile layout. i18n 6 locales. 1120 tests passing. Tag v0.10.32 pushed. |

---

## 🎯 Master Product Objective

**Make UFlow the first thought when any Muslim seeks a service or business.**

When a Muslim needs anything—a halal restaurant, an Islamic school, a trusted professional, or community support—UFlow should be their instinctive first choice. This creates a self-reinforcing cycle: seekers find what they need, providers gain visibility, and the Ummah strengthens through every connection.

**Success Means**:

- Muslims default to UFlow before Google or Instagram when seeking services
- Muslim entrepreneurs list on UFlow as their primary visibility channel
- Cities feel the economic and social impact of their Muslim community supporting each other
- Trust and transparency (barakah) define every transaction

---

## Active Release Tracker

**Current Working Release**: v0.10.39 — Released 2026-04-27 · Admin Section (listing_type) editing in provider moderation (Plan 108)

_Admin moderation UX (2026-04-27): Admin moderators can now change a provider's Section classification (Food / Business / Unclassified) from the provider edit dashboard. The field was previously read-only for all users; now rendered as an editable select in admin moderation context (reviewFooterActions prop), read-only for owner profile edit flow (backward compatible). 19/19 regression tests pass. No DB migrations. Deferred: DF-1 i18n keys, DF-2 route test coverage (108-open-actions.md). Tag v0.10.39 pushed. PR #180._

**Release Status**: Released
**Ready for Release**: ✅ v0.10.33 complete
**Blocking Items**:

- **045-OA-1**: Live UAT browser validation — direct URL nav, SPA A→B nav, Arabic no-category browse, page-2 pagination under category filter (Owner: QA Lead — post-deploy)
- **045-OA-3**: E2E browser tests for category filter — direct URL nav + SPA nav + back-button (Owner: QA/Implementer — next sprint)
- **053-OA-1**: Live staging import validation for corrected JoinHalal parser + offer auto-creation before first corrected production import run (Owner: DevOps / Operator — evidence in `agent-output/planning/053-open-actions.md`)
- **054-OA-1**: Staging write validation for corrected JoinHalal candidate filtering and non-zero failure signaling before first production promotion of v0.8.15 (Owner: DevOps / Operator — evidence in `agent-output/planning/054-open-actions.md`)
- **055-DF-1**: Live RPC verification via `pg_get_functiondef` before first production `--write` using v0.8.15 (Owner: DevOps — evidence in `agent-output/planning/055-open-actions.md`)
- **060-OA-1**: Clear `admin_edit_*_${providerId}` draft-state keys on save/approve/reject during a future admin moderation UX touch (Owner: Implementer / future sprint — evidence in `agent-output/planning/060-open-actions.md`)
- **Dependabot**: GitHub reports 3 high + 4 moderate on `abu-lina/uflow` — investigate delta vs local npm audit (local shows 0 HIGH, 1 moderate)

✅ **045-OA-2** closed: flatted HIGH (GHSA-25h7-pfq9-p65f) fixed in v0.8.5

### Previous Releases

| Version | Date       | Plans Included                                       | Status   |
| ------- | ---------- | ---------------------------------------------------- | -------- |
| v0.10.39 | 2026-04-27 | Plan 108 (Admin Section listing_type editing in provider moderation — PR #180) | Released |
| v0.10.38 | 2026-04-27 | Plan 109 (Providers search context bar + location/wer transport — Closes #175) | Released |
| v0.10.37 | 2026-04-27 | Plan 110 (CI pipeline fixes — SHA pin, perf budget, pipefail) | Released |
| v0.10.36 | 2026-04-27 | Plan 108 (Stores Wer accordion hidden — Closes #174) | Released |
| v0.10.35 | 2026-04-27 | Plan 107 (Ummah tab state rollback fix + 3-item preview parity — Closes #174 predecessor) | Released |
| v0.10.34 | 2026-04-27 | Ad-hoc food search prefix matching (migration 077 — prefix tsquery + cuisine label normalization — 3 RPCs) | Released |
| v0.10.31 | 2026-04-27 | Plan 107 (Ummah Tab Section-Conditional Search — WasServiceTypeResults + UmmahFilterSection + section-conditional rendering — Closes #172) | Released |
| v0.10.30 | 2026-04-27 | Plan 106 (Badge/Boolean Data Coherence — sync trigger + creation path wiring + section-aware filters — Closes #170) | Released |
| v0.10.29 | 2026-04-26 | Plan 105 (Values & Amenities filter wiring — PR #169, Closes #168) | Released |
| v0.10.28 | 2026-04-26 | Plan 104 (Filter accordion UI — 5 Islamic-context options — PR #167) | Released |
| v0.10.27 | 2026-04-25 | Plan 103 (WerAudienceFilter — Wer? audience selector — Issue #164) | Released |
| v0.10.26 | 2026-04-24 | Plans 101+102 (Wo location default + city results redesign — Issues #159 #162) | Released |
| v0.10.25 | 2026-04-24 | Plans 098+099+100 (Was? category redesign + PWA gitignore + background-selection token) | Released |
| v0.10.24 | 2026-04-21 | Plans 096+097 (Was? food concept vocabulary search — Issues #153 #154) | Released |
| v0.10.23 | 2026-04-21 | Plan 096 (Wire meal search Was? accordion — bundled into v0.10.24) | Released |
| v0.10.22 | 2026-04-20 | Plan 095 (Unified Catalog Architecture — Ummah Section — Issue #151) | Released |
| v0.10.21 | 2026-04-19 | Plan 094 (Provider Catalog Schema Evolution — Issue #148) | Released |
| v0.10.20 | 2026-04-19 | Plan 093 (City Interest: Notify Me for Unavailable Cities — Issue #147) | Released |
| v0.10.19 | 2026-04-19 | Plans 090+091+092 (Home Nav Redesign bundle — Issues #144 #145 #146) | Released |
| v0.10.18 | 2026-04-11 | Plan 089 (Three-section discovery redesign — FOOD / UMMAH / BUSINESS) | Released |
| v0.10.17 | 2026-04-07 | Plan 086 (Modal.tsx accessibility refactor — WCAG 2.1 AA — Issue #132) | Released |
| v0.10.16 | 2026-04-07 | Plan 085 (Restore resilient fetch pattern on CS detail page — Issue #130) | Released |
| v0.10.15 | 2026-04-06 | Plan 085 (Fix profile provider navigation links — Issue #125) | Released |
| v0.10.14 | 2026-04-06 | Plan 083 S83 (Full admin CS edit UI — ProviderEditForm adapter, CS PATCH APIs) | Released |
| v0.10.13 | 2026-04-06 | Plan 084 (GitHub Issues integration for workflow pipeline) | Released |
| v0.10.12 | 2026-04-06 | Plan 082 S82 (Saved page SearchBar visibility fix — Issue #82) | Released |
| v0.10.11 | 2026-04-06 | Plan 083 (Admin CS edit/review) + Plan 082 M8 (profile provider RLS fix) | Released |
| v0.10.9 | 2026-04-05 | Plan 081 (Community service detail parity + ProviderDetailModal in CS view) | Released |
| v0.10.8 | 2026-04-04 | Plan 079 (Admin provider URL edit fix)               | Released |
| v0.10.6 | 2026-04-04 | Plan 077 (Mobile header overlap fix)                 | Released |
| v0.10.5 | 2026-04-03 | Plans 075+076 (iOS footer CTA overlay fixes)         | Released |
| v0.10.0 | 2026-03-29 | Plan 065 (Automated provider enrichment pipeline M1–M3) | Released |
| v0.9.10 | 2026-03-29 | Hotfix release: Iconify SW interception removal      | Released |
| v0.9.9  | 2026-03-29 | Plan 064 (Iconify SW CORS fix)                       | Released |
| v0.9.8  | 2026-03-28 | Plans 067+060 (Splash vertical centering bundle)     | Released |
| v0.9.7  | 2026-03-28 | Plan 060 (Security remediation)                      | Released |
| v0.9.6  | 2026-03-26 | Plan 059 (Dependabot CI fix)                         | Released |
| v0.9.3  | 2026-03-26 | Plan 063 (Profile menu mobile auth entry fix)        | Released |
| v0.9.2  | 2026-03-25 | Plan 062 (Profile menu fix)                          | Released |
| v0.9.1  | 2026-03-25 | Plan 060 (Admin edit state persistence fix)          | Released |
| v0.9.0  | 2026-03-25 | Plan 061 (Admin provider edit flow)                  | Released |
| v0.8.24 | 2026-03-24 | S054 (Remove legacy admin panel)                     | Released |
| v0.8.23 | 2026-03-24 | Plan 057 (JoinHalal badge fallback + alcohol backfill) | Released |
| v0.8.22 | 2026-03-24 | Plan 053 (Provider scroll render bug fix)            | Released |
| v0.8.21 | 2026-03-24 | Plan 058 (Admin review in providers discovery)       | Released |
| v0.8.15 | 2026-03-23 | Plan 055 (JoinHalal RPC schema drift fix)            | Released |
| v0.8.14 | 2026-03-22 | Plan 054 (JoinHalal sitemap filter + RPC failure visibility) | Released |
| v0.8.13 | 2026-03-22 | Plan 053 (JoinHalal vxconfig fix + offer auto-create) | Released |
| v0.8.5  | 2026-03-19 | 045-OA-2 (flatted HIGH vuln fix)                    | Released |
| v0.8.4  | 2026-03-19 | Plan 045 (Providers category filter bugfix)          | Released |
| v0.8.2  | 2026-03-18 | Plan 044 (Mobile footer overlay layer bugfix)       | Released |
| v0.8.1  | 2026-03-13 | Plans 039+040 (Provider outreach improvements)      | Released |
| v0.8.0  | 2026-03-13 | Plan 038 (Provider owner outreach & claim system)    | Released |
| v0.7.2  | 2026-03-08 | Plan 037 (npm dependency security remediation)       | Released |
| v0.7.1  | 2026-03-07 | Plan 036 (Analytics activation + event instrumentation) | Released |
| v0.7.0  | 2026-03-07 | Plan 035 (Growth: indexable city pages + Plausible)  | Released |
| v0.6.12 | 2026-03-07 | Plan 034 (Provider image load performance fix)       | Released |
| v0.6.11 | 2026-03-07 | Plan 033 (Performance optimization guardrails)       | Released |
| v0.6.10 | 2026-03-01 | Plans 028+029 (Mobile onboarding vertical centering) | Released |
| v0.6.9  | 2026-02-24 | Plan 022 (Blurred header overlay on onboarding)      | Released |
| v0.6.8  | 2026-02-25 | Plan 024 (Supply chain hardening)                    | Released |
| v0.6.7  | 2026-02-24 | Plan 022 (Blurred header overlay - duplicate tag)    | Released |
| v0.6.6  | 2026-02-24 | Plan 021 (iPhone Safari viewport overlap v3)         | Released |
| v0.6.5  | 2026-02-24 | Plan 020 (iPhone Safari viewport overlap v2)         | Released |
| v0.6.4  | 2026-02-23 | Plan 019 (iPhone Safari viewport overlap)            | Released |
| v0.6.3  | 2026-02-23 | Hotfix (Early access scroll + manifest icon)         | Released |
| v0.6.2  | 2026-02-23 | Plan 017 (Early access notification module)          | Released |
| v0.6.1  | 2026-02-23 | Plan 015 (PWA MIUI form rendering fix)               | Released |
| v0.6.0  | 2026-02-23 | Plans 011+012 (Repository Structure Refactor)        | Released |
| v0.5.0  | 2026-02-23 | Plan 010 (Next.js App Router Refactor)               | Released |
| v0.4.1  | 2026-02-22 | Plan 008 (Search Index Validation & Fallback Guards) | Released |
| v0.4.0  | 2026-02-22 | Plan 007 (Performance Improvements)                  | Released |
| v0.3.1  | 2026-02-22 | Plan 006 (Android Suggest Provider Form Bugfix)      | Released |
| v0.3.0  | 2026-02-22 | Plan 001 (Provider Trust & Verification System)      | Released |
| v0.2.0  | 2026-02-21 | Plan 003 (Console errors: hydration + CORS fix)      | Released |
| v0.1.0  | 2025-Q4    | Initial launch, waitlist system, early access        | Released |

**Note on v0.6.2–v0.6.11 Backfill**: These 10 patch releases were deployed between 2026-02-23 and 2026-03-07 before the roadmap agent workflow was fully established. Each release has detailed changelogs documenting fixes, features, and rationale. See [CHANGELOG.md](../../CHANGELOG.md) for complete release notes. Key themes across these versions: mobile PWA UX refinements (viewport overlap, onboarding layout), supply chain security hardening, and performance guardrails (Cache-Control alignment, budgets, telemetry).

### Standalone Tooling Releases

Workflow and development tooling releases — versioned independently from main product.

| Package                | Version | Date       | Plan     | Description                                                                        | Status   |
| ---------------------- | ------- | ---------- | -------- | ---------------------------------------------------------------------------------- | -------- |
| uflow-memory-extension | v0.1.1  | 2026-03-03 | Plan 032 | **Hotfix**: Multi-root workspace detection, OutputChannel, Electron ABI rebuild    | Released |
| uflow-memory-extension | v0.1.0  | 2026-03-02 | Plan 032 | Local-first agent memory system replacing Flowbaby (SQLite WAL, multi-window safe) | Released |

**Key Features**:

- Zero-config SQLite WAL backend — no daemon, no cloud dependencies
- Multi-window concurrent access without lock contention
- Drop-in replacement for Flowbaby tools (`flowbabyStoreSummary`, `flowbabyRetrieveMemory`)
- Sub-millisecond store/retrieve performance (0.4–0.7ms typical)
- Workspace-local storage at `.uflow-memory/memories.db`

### Workflow Releases

Agent workflow improvements — no product version bump, documentation and instruction updates only.

| Plan    | Date       | Description                                                                                      | Status   |
| ------- | ---------- | ------------------------------------------------------------------------------------------------ | -------- |
| Plan 080 | 2026-04-05 | Agent Model Cost Optimization — 4-tier model strategy (Opus/Codex/Sonnet/Haiku); 42x → 20.66x multiplier (~51% savings) | Released |
| Plan 042 | 2026-03-14 | Parallel Copilot Sessions Operator Protocol — multi-window development workflow, session isolation | Released |

**Key Deliverables (Plan 042)**:

- Parallel sessions operator guide (`docs/ai/parallel-sessions.md`)
- Orchestrator Session Context Header awareness (control vs worker windows)
- Agent instruction guardrails (ID allocation prohibition in worker windows)
- Copilot instructions pitfall #7 (parallel sessions workflow)

---

## Release v0.2.0 - Community Trust Foundations

**Target Date**: 2026-03-15
**Strategic Goal**: Enable city-based communities to build trust through verified providers, authentic profiles, and social proof, creating the foundation for Ummah-first discovery.

### Epic 2.1: Provider Trust & Verification System

**Priority**: P0
**Status**: Planned

**User Story**:
As a **service seeker**,
I want to **see verified, trustworthy provider profiles with community endorsements**,
So that **I feel confident supporting Muslim businesses and know I'm getting authentic halal/Islamic services**.

**Business Value**:

- Trust is the foundation of "Ummah first thought" - without it, users default to established platforms
- Verification differentiates UFlow from generic directories
- Community endorsements create network effects (trust breeds more trust)
- Reduces friction in decision-making, leading to higher conversion from browse to contact/visit

**Dependencies**:

- Current provider listing system (✅ exists)
- User authentication system (✅ exists)

**Acceptance Criteria** (outcome-focused):

- [ ] Service seekers can instantly distinguish verified providers from unverified ones
- [ ] Providers display community trust signals (verification badges, endorsement counts)
- [ ] Users can endorse providers they've used (social proof mechanism)
- [ ] Verification status visible in search results and provider cards
- [ ] Trust metrics contribute to search ranking (verified providers surface higher)

**Constraints**:

- Verification process must be simple enough for small businesses (no complex bureaucracy)
- Must respect privacy (no forced public reviews, optional endorsements)
- Halal/Islamic authenticity verification requires community/scholar input (future epic)

**Status Notes**:

- 2026-01-27: Epic defined based on trust-first strategic priority
- 2026-01-27: Implementation plan created (Plan 001), validation passed, pending Architect/Security review
- 2026-01-27: Architecture assessment required gates (privacy-safe endorsement reads, unified role authority, DB-side ranking); Plan 001 updated accordingly

---

### Epic 2.2: City Community Pages & Discovery

**Priority**: P0
**Status**: Planned

**User Story**:
As a **Muslim in a specific city**,
I want to **discover all halal businesses and community services in my area through a dedicated city page**,
So that **I feel connected to my local Muslim community and can easily support local businesses**.

**Business Value**:

- City pages create geographic community hubs (sense of belonging)
- Drives local engagement and repeat visits (users check "what's new in my city")
- Enables city-based marketing and partnerships (mosque collaborations, community events)
- Measurable: Track active cities, providers per city, user engagement per city

**Dependencies**:

- Basic provider listing and search (✅ exists)
- City data structure (✅ partially exists from early access feature)

**Acceptance Criteria** (outcome-focused):

- [ ] Each city has a dedicated landing page (`/city/[cityname]`) with all local providers
- [ ] City pages show provider count, categories available, and featured businesses
- [ ] Users can subscribe to city updates (new providers, community news)
- [ ] City pages rank by provider density and community activity
- [ ] "Coming Soon" cities show waitlist/interest capture for future expansion

**Constraints**:

- Must handle cities with zero providers gracefully (show "Be the first" CTA)
- City name standardization (München vs Munich, Turkish city names in multiple languages)

**Status Notes**:

- 2026-01-27: Epic defined to leverage existing city-based architecture
- Note: City selection feature already exists in early access flow, needs expansion

---

### Epic 2.3: Enhanced Provider Profiles with Rich Media

**Priority**: P1
**Status**: Planned

**User Story**:
As a **provider (business owner)**,
I want to **showcase my business with photos, videos, detailed descriptions, and service highlights**,
So that **seekers understand my offerings and feel excited to visit/contact me**.

**Business Value**:

- Increases provider satisfaction and retention (they see value in listing)
- Drives user engagement (rich profiles = longer time on site, higher conversion)
- Differentiates UFlow from simple directories (Instagram-like visual appeal)
- Encourages providers to invest time in platform (sticky behavior)

**Dependencies**:

- Basic provider creation flow (✅ exists with Google/Instagram import)
- Image storage infrastructure (✅ exists via Supabase Storage)

**Acceptance Criteria** (outcome-focused):

- [ ] Providers can upload multiple photos (gallery view with swipe/arrows)
- [ ] Providers can add video (embedded YouTube/Vimeo or direct upload)
- [ ] Profile sections: About, Services, Hours, Special Features (halal cert, women-only, etc.)
- [ ] "Barakah Tags" system for Islamic attributes (Halal, Zakat, Sunnah-based, etc.)
- [ ] Mobile-first design with fast loading (optimized images, lazy load)

**Constraints**:

- Storage limits per provider tier (free vs future premium)
- Video upload size limits (to control costs)
- Image moderation (prevent inappropriate content)

**Status Notes**:

- 2026-01-27: Epic defined to build on existing quick import feature

---

### Epic 2.4: User Favorites & Personal Collections

**Priority**: P1
**Status**: Planned

**User Story**:
As a **service seeker**,
I want to **save my favorite providers and organize them into collections**,
So that **I can easily return to businesses I trust and share recommendations with family/friends**.

**Business Value**:

- Creates user lock-in (saved favorites = reason to return to UFlow)
- Enables social sharing (collections = viral growth potential)
- User engagement metric (favorites count = interest level)
- Foundation for personalized recommendations (future epic)

**Dependencies**:

- User authentication (✅ exists)
- Provider listing system (✅ exists)

**Acceptance Criteria** (outcome-focused):

- [ ] Users can favorite any provider with one tap (heart icon)
- [ ] Favorites accessible from user profile page
- [ ] Users can create named collections ("Best Halal Restaurants", "Kids Activities", etc.)
- [ ] Collections shareable via link (public/private toggle)
- [ ] Providers see favorite count (social proof + provider motivation)

**Constraints**:

- Must work for non-authenticated users (localStorage until signup)
- Collections sync across devices when logged in

**Status Notes**:

- 2026-01-27: Epic defined based on existing UI (heart icon already in provider cards)

---

## Release v0.3.0 - Community Participation & Growth

**Target Date**: 2026-05-15
**Strategic Goal**: Activate the community to grow UFlow organically through recommendations, referrals, and city unlocking, making every user a contributor to Ummah strengthening.

### Epic 3.1: Community-Driven Provider Recommendations

**Priority**: P0
**Status**: In Progress

**User Story**:
As a **community member**,
I want to **recommend Muslim businesses that aren't on UFlow yet**,
So that **my community can discover them and the Ummah benefits from comprehensive coverage**.

**Business Value**:

- Scales provider acquisition without marketing spend (organic growth)
- Community feels ownership (they built the platform)
- Identifies high-demand categories/cities (where recommendations cluster)
- Reduces admin workload (community does discovery work)

**Dependencies**:

- Basic provider creation flow (✅ exists)
- Early access recommendation feature (✅ partially exists)

**Acceptance Criteria** (outcome-focused):

- [x] Any user can submit a provider recommendation (name, location, category, reason)
- [ ] Recommended providers go into review queue (admin dashboard)
- [ ] Recommenders get credit/badge when their suggestion go live
- [ ] Top recommenders featured on leaderboard (gamification)
- [ ] Recommendations tracked by city (shows demand for city unlock)

**Constraints**:

- Must prevent spam/fake recommendations (rate limiting, verification)
- Duplicate detection (don't recommend existing providers)

**Status Notes**:

- 2026-01-27: Epic defined to formalize existing early access recommendation feature
- 2026-02-22: Plan 006 released (v0.3.1) — Fixed Android UX regression blocking recommend provider form; userToggledRef pattern prevents non-user focus triggers
- 2026-02-22: First acceptance criterion (submit recommendation form) now functional on Android; remaining criteria (admin queue, credit badges, leaderboard) pending future plans

---

### Epic 3.2: City Unlock Campaign System

**Priority**: P0
**Status**: Planned

**User Story**:
As a **Muslim in a city not yet on UFlow**,
I want to **rally my community to unlock our city by hitting provider/user thresholds**,
So that **we get access to UFlow's benefits and strengthen our local Ummah**.

**Business Value**:

- Creates viral growth mechanism (users recruit others to unlock their city)
- Builds anticipation and momentum (launches feel like events)
- Pre-validates demand before expansion (ROI-focused growth)
- Community ownership from day one (users fought to unlock it)

**Dependencies**:

- City data structure (✅ exists)
- Recommendation system (Epic 3.1)
- Email notification system (✅ exists via Resend)

**Acceptance Criteria** (outcome-focused):

- [ ] City unlock page shows progress (X providers needed, Y recommendations submitted)
- [ ] Users can vote/signal interest in city unlock
- [ ] Automated unlock when thresholds met (e.g., 10 providers + 50 interested users)
- [ ] Email campaign to city participants when unlock happens
- [ ] City unlock announcement on homepage (celebration, social proof)

**Constraints**:

- Thresholds must be achievable but meaningful (not too easy, not impossible)
- Must handle overlapping cities (e.g., Berlin suburbs)

**Status Notes**:

- 2026-01-27: Epic defined based on city-focused community building strategy

---

### Epic 3.3: Referral & Share Features

**Priority**: P1
**Status**: Planned

**User Story**:
As a **satisfied UFlow user**,
I want to **easily share providers, collections, and UFlow itself with friends/family**,
So that **my Ummah can benefit from what I've discovered**.

**Business Value**:

- Viral growth loop (users recruit users)
- Trust-based acquisition (friend referrals convert higher than ads)
- Social proof (seeing friends use UFlow increases credibility)
- Measurable via referral codes and share metrics

**Dependencies**:

- Provider pages (✅ exists)
- Collections system (Epic 2.4)

**Acceptance Criteria** (outcome-focused):

- [ ] One-tap share for any provider (WhatsApp, Telegram, Twitter, copy link)
- [ ] Shareable collection links with preview images (Open Graph meta tags)
- [ ] Referral codes for user acquisition ("Join with my code, we both get X")
- [ ] Share tracking (see which providers/collections go viral)
- [ ] Pre-filled share messages optimized for Muslim audience ("Assalamu Alaikum, check out...")

**Constraints**:

- Privacy-first (no forced social logins, no spam)
- Islamic etiquette in messaging (respectful language)

**Status Notes**:

- 2026-01-27: Epic defined to enable organic growth through existing network effects

---

### Epic 3.4: Basic User Profiles & Activity

**Priority**: P2
**Status**: Planned

**User Story**:
As a **UFlow user**,
I want to **have a profile showing my contributions (recommendations, favorites, endorsements)**,
So that **I feel recognized in the community and motivated to participate more**.

**Business Value**:

- Gamification drives engagement (people want badges, recognition)
- Creates community leaders (top contributors become ambassadors)
- Trust signal (profiles with activity = real users, not bots)
- Foundation for future social features (following, messaging)

**Dependencies**:

- User authentication (✅ exists)
- Favorites system (Epic 2.4)
- Recommendation system (Epic 3.1)

**Acceptance Criteria** (outcome-focused):

- [ ] User profile page shows: favorites count, recommendations submitted, endorsements given
- [ ] Badges/achievements for milestones (first recommendation, 10 favorites, etc.)
- [ ] Public/private profile toggle
- [ ] Profile accessible from recommendations/endorsements (attribution)
- [ ] Basic profile customization (name, city, bio optional)

**Constraints**:

- Privacy-first (users control what's public)
- No complex social features yet (keep simple for v0.3)

**Status Notes**:

- 2026-01-27: Epic defined as foundation for community engagement features

---

## Release v0.4.0 - Engagement & Transaction Enablement

**Target Date**: 2026-07-30
**Strategic Goal**: Enable seamless interaction between seekers and providers through bookings, inquiries, and reviews, creating a complete marketplace experience.

### Epic 4.1: Direct Contact & Inquiry System

**Priority**: P0
**Status**: Planned

**User Story**:
As a **service seeker**,
I want to **contact providers directly through UFlow (call, email, message)**,
So that **I can ask questions and book services without leaving the platform**.

**Business Value**:

- Measurable conversion (contact = real intent)
- Provider value proof (they see leads from UFlow)
- Retention (users stay in UFlow ecosystem vs jumping to external sites)
- Foundation for future monetization (charge for premium leads)

**Dependencies**:

- Provider contact information (✅ exists)
- User authentication (✅ exists)

**Acceptance Criteria** (outcome-focused):

- [ ] One-tap call from provider page (mobile click-to-call)
- [ ] In-app inquiry form (sends email to provider, CC to user)
- [ ] WhatsApp direct message button (if provider provides WhatsApp number)
- [ ] Inquiry tracking (users see sent inquiries in profile, providers see received)
- [ ] Response rate metric for providers (social proof)

**Constraints**:

- Privacy (don't expose provider emails publicly, use proxy)
- Spam prevention (rate limiting on inquiries)

**Status Notes**:

- 2026-01-27: Epic defined to enable measurable conversion tracking

---

### Epic 4.2: Simple Booking System (Calendar-based)

**Priority**: P1
**Status**: Planned

**User Story**:
As a **service seeker**,
I want to **book appointments with providers through an integrated calendar**,
So that **I can secure my time slot without phone tag or external booking tools**.

**Business Value**:

- Major provider value add (booking system = tangible business benefit)
- Higher conversion (easier booking = more bookings)
- Lock-in for providers (integrated calendar = dependency on UFlow)
- Data insight (peak booking times, popular services)

**Dependencies**:

- Provider profiles with service offerings (Epic 2.3)
- User authentication (✅ exists)

**Acceptance Criteria** (outcome-focused):

- [ ] Providers can set available time slots (calendar integration or manual)
- [ ] Users can book available slots with confirmation email/SMS
- [ ] Booking confirmation with iCal attachment (add to Google Calendar, etc.)
- [ ] Providers can manage bookings (accept/decline/reschedule)
- [ ] Automated reminders (24h before appointment)

**Constraints**:

- Must integrate with provider's existing calendars (Google Calendar sync)
- SMS notifications cost (limit free tier, charge for premium)
- Cancellation policy (who controls cancellations, refund logic)

**Status Notes**:

- 2026-01-27: Epic defined as high-value provider feature
- Note: Consider starting with simple time slot system before full calendar sync

---

### Epic 4.3: Review & Rating System

**Priority**: P1
**Status**: Planned

**User Story**:
As a **service seeker**,
I want to **read authentic reviews from other Muslims who've used a provider**,
So that **I can make informed decisions based on real experiences**.

**Business Value**:

- Trust amplification (reviews = social proof at scale)
- Quality control (bad providers get flagged, good ones rise)
- User engagement (people return to leave/read reviews)
- SEO benefit (user-generated content)

**Dependencies**:

- User authentication (✅ exists)
- Provider pages (✅ exists)
- Contact/booking system (Epic 4.1/4.2 for verified interactions)

**Acceptance Criteria** (outcome-focused):

- [ ] Users can leave reviews only after verified interaction (booking/contact)
- [ ] Rating scale (1-5 stars) + optional text review
- [ ] Islamic review guidelines (constructive feedback, no backbiting)
- [ ] Provider response to reviews (engagement, accountability)
- [ ] Review moderation (flag inappropriate content)

**Constraints**:

- Prevent fake reviews (only verified interactions can review)
- Islamic ethics (no slandering, balanced feedback encouraged)
- Provider protection (right to respond, dispute false reviews)

**Status Notes**:

- 2026-01-27: Epic defined as critical trust-building feature
- Note: Consider "endorsement" model first (simpler than full reviews, less negative)

---

### Epic 4.4: Featured Listings & Provider Dashboard

**Priority**: P2
**Status**: Planned

**User Story**:
As a **provider (business owner)**,
I want to **see analytics on my listing performance and upgrade to featured visibility**,
So that **I can grow my business and justify investing in UFlow**.

**Business Value**:

- Revenue stream (featured listings = monetization)
- Provider retention (analytics = perceived value)
- Quality signal (providers who pay = serious businesses)
- Funds platform sustainability

**Dependencies**:

- Provider profiles (✅ exists)
- Contact/inquiry tracking (Epic 4.1)

**Acceptance Criteria** (outcome-focused):

- [ ] Provider dashboard shows: profile views, favorites, inquiries, bookings (if applicable)
- [ ] Featured listing option (prominent placement in search, city pages, homepage)
- [ ] Payment integration for featured listings (Stripe or local payment)
- [ ] Featured vs organic performance comparison (ROI proof)
- [ ] Simple upgrade flow (free → featured with one click)

**Constraints**:

- Pricing must be accessible for small businesses (€5-20/month)
- No "pay to win" (featured listings still need quality/relevance)
- Transparent labeling (users know which are featured)

**Status Notes**:

- 2026-01-27: Epic defined as first monetization pathway
- Note: Start with simple featured flag before complex bidding/auction

---

## Release v0.5.0 - Technical Foundation & Reliability

**Release Date**: 2026-02-23
**Strategic Goal**: Cross-cutting technical refactor to improve App Router alignment, safety, and caching discipline—ensuring UFlow's discovery features remain fast, reliable, and maintainable.

### Plan 010: Next.js App Router Refactor (Best Practices)

**Priority**: P0 (Technical Foundation)
**Status**: Delivered

**User Story**:
As a **UFlow service seeker**,
I want **faster and more reliable discovery pages (especially Providers search) with fewer client-side failures**,
So that **I can find halal services quickly and trust the app to work consistently across devices and network conditions**.

**Business Value**:

- Improves platform reliability and user trust
- Reduces technical debt and maintenance burden
- Enables faster feature development on solid foundations
- Better performance = better SEO and user retention

**Dependencies**:

- Existing Providers search with tsvector full-text search (✅ exists)
- Supabase RLS and session context (✅ exists)

**Acceptance Criteria** (outcome-focused):

- [x] No localhost agent log calls reach production (P0 safety)
- [x] Providers discovery uses server-first rendering (P1 App Router alignment)
- [x] Caching discipline: `force-dynamic` only where truly needed (P1 optimization)
- [x] All tests passing, build succeeds, no hydration mismatches
- [x] Deployed to production without user-facing changes

**Constraints**:

- No UX changes (refactor only)
- Must preserve bookmark functionality with RLS
- Postgres-first philosophy maintained (no Redis/Elastic)

**Status Notes**:

- 2026-02-23: Plan created, critiqued, implemented, QA passed, UAT approved for release
- 2026-02-23: Released as v0.5.0 (commit 9316f72) - zero rework, exemplary TDD execution
- 2026-02-23: Retrospective completed; PI 010 implemented (shell quoting + commit message guidance)

---

## Release v0.6.0 - Advanced Community & Islamic Features (Planned)

**Target Date**: 2026-10-15
**Strategic Goal**: Deepen Islamic authenticity and community features that make UFlow uniquely valuable for Muslims (prayer times, Zakat, community events, halal verification).

### Epic 6.1: Islamic Authenticity Verification (Halal, Zakat, Scholars)

**Priority**: P0
**Status**: Planned

**User Story**:
As a **service seeker**,
I want to **know that providers are truly halal/Islamic through scholar verification or community consensus**,
So that **I trust UFlow as a source of authentic halal services**.

**Business Value**:

- Ultimate differentiation (no other platform offers Islamic verification)
- Trust at the deepest level (religious authenticity)
- Attracts conservative/observant Muslims (underserved market)
- Partnership with Islamic organizations (imams, halal certification bodies)

**Dependencies**:

- Provider verification system (Epic 2.1)
- Scholar/organization onboarding process (new)

**Acceptance Criteria** (outcome-focused):

- [ ] Halal certification upload and verification (for restaurants, food)
- [ ] Scholar endorsement system (local imams can endorse providers)
- [ ] Islamic service categories (halal, women-only, non-music environment, etc.)
- [ ] Verification badge hierarchy (community verified, scholar verified, certified halal)
- [ ] Transparency (users can see verification source)

**Constraints**:

- Must respect different Islamic schools of thought (Hanafi, Shafi, etc.)
- Avoid religious disputes (clear criteria, no enforcement of one madhab)
- Scholar onboarding requires trust (background checks, community reputation)

**Status Notes**:

- 2026-01-27: Epic defined as core Islamic value proposition
- Note: Requires careful implementation with Islamic advisory board

---

### Epic 6.2: Integrated Prayer Times & Mosque Features

**Priority**: P1
**Status**: Planned

**User Story**:
As a **Muslim user**,
I want to **see prayer times integrated into UFlow and find nearby mosques easily**,
So that **UFlow becomes my daily Islamic companion, not just a business directory**.

**Business Value**:

- Daily engagement driver (prayer times = open app 5x/day)
- Mosque partnerships (mosques promote UFlow to congregation)
- Community hub positioning (beyond commerce → spiritual connection)
- Unique value (no competitor combines marketplace + prayer times seamlessly)

**Dependencies**:

- Location services (✅ exists)
- Mosque provider category (✅ exists)

**Acceptance Criteria** (outcome-focused):

- [ ] Prayer times widget on homepage (automatic location detection)
- [ ] Mosque finder with distance/directions (map integration)
- [ ] Mosque detail pages (prayer times, services, events, contact)
- [ ] Prayer time notifications (opt-in push notifications)
- [ ] Calculation method preference (ISNA, MWL, etc.)

**Constraints**:

- Prayer time accuracy critical (test thoroughly, multiple calculation methods)
- Offline support (prayer times cached for offline PWA use)

**Status Notes**:

- 2026-01-27: Epic defined to position UFlow as daily Islamic tool
- Note: Consider partnership with existing prayer time APIs (e.g., Aladhan)

---

### Epic 6.3: Zakat & Charity Integration

**Priority**: P2
**Status**: Planned

**User Story**:
As a **Muslim user**,
I want to **discover verified Zakat organizations and charitable initiatives through UFlow**,
So that **I can fulfill my Islamic obligations with trusted, transparent organizations**.

**Business Value**:

- Deepens Islamic positioning (beyond commerce → religious duty)
- Attracts high-intent users (people giving Zakat are engaged Muslims)
- Partnership with Islamic charities (cross-promotion, credibility)
- Social impact (measurable Zakat distributed through platform)

**Dependencies**:

- Provider categories (✅ exists, add "Charity/Zakat" category)
- Verification system (Epic 6.1 for organization authenticity)

**Acceptance Criteria** (outcome-focused):

- [ ] Zakat category with verified organizations
- [ ] Zakat calculator tool (integrated into UFlow)
- [ ] Transparent reporting (where donations go, impact metrics)
- [ ] Recurring donation option (monthly Sadaqah)
- [ ] Tax receipt generation (for countries with tax deduction)

**Constraints**:

- Must comply with charity regulations (varies by country)
- Financial transparency required (no UFlow commission on donations)
- Verification stringent (only trusted, registered charities)

**Status Notes**:

- 2026-01-27: Epic defined to serve Islamic social responsibility
- Note: Start with directory, add transaction layer later (complex compliance)

---

### Epic 6.4: Community Events & Announcements

**Priority**: P2
**Status**: Planned

**User Story**:
As a **community member**,
I want to **discover local Islamic events (Iftars, lectures, classes) and community announcements**,
So that **I stay connected and active in my local Ummah**.

**Business Value**:

- Engagement driver (events = reason to return weekly)
- Community hub positioning (central place for Muslim community life)
- Provider value (mosques, schools can promote events)
- Network effects (users invite friends to events → app growth)

**Dependencies**:

- Provider profiles (✅ exists, extend with event capability)
- City pages (Epic 2.2 for city-based event discovery)

**Acceptance Criteria** (outcome-focused):

- [ ] Event creation for providers (mosques, schools, organizations)
- [ ] Event calendar view (city-wide, category filtered)
- [ ] RSVP/registration for events (track attendance)
- [ ] Event notifications (users can follow categories/organizations)
- [ ] Past event archive (photos, recap, community memory)

**Constraints**:

- Free vs paid events (UFlow takes no cut initially, just facilitates)
- Spam prevention (only verified providers can post events)
- Capacity management (max attendees, waitlist)

**Status Notes**:

- 2026-01-27: Epic defined to build vibrant community engagement
- Note: Simple MVP = event listing, advanced = ticketing/payment

---

## Backlog / Future Consideration

### Epic 7.1: Multi-Language Quran Search Integration

**Priority**: P3
**Status**: Deferred

Integrate Quran search and translation into UFlow as a spiritual companion feature. Users can search Quran by topic, copy ayahs to share with providers (e.g., "As-Salamu-Alaikum, I found this on UFlow..."), and deepen Islamic engagement.

**Dependencies**: Prayer times integration (Epic 6.2), content moderation
**Rationale for Deferral**: Core marketplace features take precedence, but represents long-term vision of UFlow as complete Islamic lifestyle platform

---

### Epic 7.2: Ummah Marketplace (P2P Services)

**Priority**: P3
**Status**: Deferred

Enable peer-to-peer service exchange (e.g., "I can teach Quran, you can teach coding"). Creates community skill sharing beyond formal businesses.

**Dependencies**: User profiles (Epic 3.4), trust/verification system (Epic 2.1)
**Rationale for Deferral**: Requires strong community foundation first; P2P needs trust infrastructure

---

### Epic 7.3: Islamic Business Networking

**Priority**: P3
**Status**: Deferred

LinkedIn-style networking for Muslim professionals and entrepreneurs. Connect providers with suppliers, investors, mentors within Ummah.

**Dependencies**: User profiles (Epic 3.4), business verification
**Rationale for Deferral**: Focus on B2C before B2B; complex feature requiring dedicated effort

---

### Epic 7.4: Mobile App (Native iOS/Android)

**Priority**: P2
**Status**: Deferred

Native mobile apps with push notifications, offline support, camera integration for provider photo uploads.

**Dependencies**: Core features stable, PWA performance benchmarked
**Rationale for Deferral**: PWA currently covers 90% of use cases; native app when scale justifies investment
**Note**: Current PWA strategy is cost-effective; revisit at 50k+ monthly active users

---

## Document Lifecycle

**Status**: Active
**Owner**: roadmap agent
**Review Cycle**: Monthly (or when major releases complete)

**Next Review**: 2026-02-27

---

## Notes

### Strategic Principles

1. **Ummah First**: Every feature should strengthen community bonds, not just facilitate transactions
2. **Trust Over Growth**: Verification and authenticity before aggressive user acquisition
3. **Islamic Values**: Transparency (no hidden fees), justice (fair to all parties), benefit (mutual gain)
4. **Community-Driven**: Users build UFlow through recommendations, not top-down marketing
5. **Sustainable Economics**: Monetization that doesn't compromise mission (featured listings, not transaction fees)

### Success Metrics by Release

- **v0.2 (Trust)**: Verified provider count, endorsement rate, trust badge visibility in search
- **v0.3 (Growth)**: New providers from recommendations, city unlock rate, referral conversion
- **v0.4 (Engagement)**: Inquiry/booking conversion, review submission rate, repeat user visits
- **v0.5 (Technical Foundation)**: Page load performance, zero production errors, caching hit rate
- **v0.6 (Islamic Depth)**: Halal-verified provider count, daily prayer time opens, Zakat referrals

### Risk Management

- **Community Moderation**: Rapid growth requires moderation capacity (consider volunteer moderator program)
- **Islamic Authenticity**: Verification disputes could damage trust (establish clear, transparent criteria early)
- **Provider Quality**: Bad experiences with providers hurt platform (need quality control mechanisms)
- **Monetization Timing**: Too early = user backlash, too late = unsustainable (current plan: v0.4 featured listings)

---

**Alhamdulillah** - May this roadmap serve the Ummah and bring barakah to all who use and build UFlow.
