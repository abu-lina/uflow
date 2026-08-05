# Changelog

## [0.15.5] - 2026-08-05

### Fixed

- **Weitere Standorte guard for single-location providers (Plan 202)**: The provider detail section in `src/features/providers/components/ProviderDetailSections.tsx` now renders the "Weitere Standorte" accordion only when a provider has more than one location. The guard was changed from `(locations?.length ?? 0) > 0` to `(locations?.length ?? 0) > 1`, preventing the section from appearing for single-location providers.

## [0.15.4] - 2026-08-02

### Changed

- **Desktop search bar simplified (Plan 200)**: Restructured the desktop search bar to follow a Google Maps-style pattern with clear visual hierarchy. The primary bar (800px, white rounded container) now contains only essential controls — location selector, search input, and a green "Suchen" CTA button — with no visual dividers. Secondary filters (Wer: person count, Werte & Ausstattung: amenity filters) moved to a separate pill row below the bar, displayed only on desktop (≥768px) to preserve mobile touch targets. All controls use consistent sizing (text-sm, smaller icons), softer colors (neutral-600), and hover states. This reduces visual clutter while maintaining full functionality. Desktop users see the refined bar + pills; mobile users see the existing accordion (no changes). Closes #288.

## [0.15.3] - 2026-08-02

### Fixed

- **Chatbot "open now" filter (Plan 199)**: The chatbot's restaurant search now supports "open now"/"geöffnet"/"offen"/"jetzt" queries. Previously, asking for e.g. "open burger restaurants in Stuttgart" returned both open and closed providers with no way to filter or indicate status. Added `open_now` parameter to the `search_providers` chatbot tool, `opening_hours` column to the `search_providers_chat` RPC (migration 121), and an `is_open` annotation on every result computed via the existing `getOpenStatus()` utility (device-local time, overnight-window aware — same logic used by `/search`'s "Open now" chip). Providers without opening-hours data are annotated `is_open: null` and excluded when `open_now: true` is requested.

## [0.15.2] - 2026-08-02

### Added

- **Near me + Open now restaurant search (Plan 196)**: Public `/search` page now offers a "Near me" quick-filter chip that requests device geolocation and searches approved food providers within a selectable radius (2/5/10 km), distance-sorted, via a new additive `search_food_near_me` Postgres RPC (nearest-location-per-provider semantics against the `locations` table). A companion "Open now" chip filters results to currently-open providers client-side, reusing the existing `getOpenStatus` logic (device-local time, overnight-window aware) — result cards always show open/closed status regardless of the toggle. Includes graceful fallback to manual city search when geolocation is denied, unavailable, or times out. Existing `find_nearby_food_providers` (related-provider lookup on the detail page) is unchanged.
- **Admin delete provider (Plan 162)**: Red "Delete Provider" button on /dashboard/providers/[id]/edit with confirmation dialog. Cascading delete (all child tables have ON DELETE CASCADE). Security: auth required, admin/moderator only, rate limited (20/hr, 5/min), audit logged.

### Fixed

- **Chatbot UX improvements (Plan 198)**: Three UX fixes: (1) "Empfehlung erhalten" card and chatbot scope now focuses on food/restaurants only — stores and community services are no longer offered; (2) conversational copy polished — removed machine artifact "Folgendes trifft zu: " prefix from multi-select confirmations, updated CONVERSATION STYLE guidance to be warm and concise; (3) back-navigation state loss fixed — chat session (messages + conversationId) is now persisted to `sessionStorage` so returning from a provider detail page restores the full conversation. Fixes Rules-of-Hooks violation in `ChatFloatingWidget.tsx`.
- **Chat auth-required copy (Plan 197)**: ChatWidget no longer shows the misleading "Um ein Restaurant zu registrieren" text when the user is unauthenticated. The auth-required card now displays a generic chatbot login message sourced from the i18n system (`chat.authRequired.*` keys added to all 6 locale files).
- **Auth-outcome observability (Plan 197)**: `getUserFromCookie()` now emits `console.warn({ event: 'auth_outcome', result: 'no_user', reason: '<code>' })` at each auth-failure path (`ssr_client_no_user`, `no_access_token_cookie`, `missing_env_vars`, `auth_api_error`, `token_expired_refresh_failed`, `fetch_error`). Logs fire on all environments (not gated by `NODE_ENV`), with no PII. content on `/create`, `/saved`, `/profile` and other mobile pages by correcting Tailwind `header-spacing` tokens from flat `160px` to per-breakpoint values (80px mobile / 96px tablet / 104px desktop). `PageContent.tsx` inline padding updated to match.
- Provider edit form now saves inline field state before sub-page navigation (no more lost edits)
- Review status now shows stored value instead of always defaulting to "Pending"
- Category selection page now filters by listing_type (food/store)
- Halal check page reads from store_providers extension table for store-type providers

### Changed

- Moved Section (listing_type) dropdown to directly under Description field
- Delivery Links renamed to "Order Links" for store-type providers
- Delivery/order links now support custom website URLs beyond Wolt/Lieferando/UberEats
- Values page: Food section hidden for non-food, Store section hidden for non-store providers


## [0.12.17] - 2026-05-14

### Fixed

- **Amenities dietary restrictions removed (Plan 132)**: Removed `no_alcohol` and `no_pork` entries from the Values & Amenities section in the provider detail page. These dietary attestation flags belong to the Nachweise/Proofs section where they are already displayed as attestation commitments, not in the general amenities list.

## [0.12.16] - 2026-05-13

### Fixed

- **Attestation proofs icon background removed (Plan 131 delta)**: Removed `bg-icon-surface` class from the proofs commitment icon wrapper in `AttestationCard`. The halalOnly, noAlcohol, noPork, and noGambling icons now render without a colored background square, delivering the intended flat icon-on-surface visual presentation globally across all food/store providers with declared attestations.

## [0.12.15] - 2026-05-12

### Changed

- **Reusable IconListRow layout primitive (Plan 130, #227)**: Added `IconListRow` in `src/components/ui/` and refactored repeated icon-label-detail row layouts to use it across search sections (`WasCategoryResults`, `WasServiceTypeResults`, `WoCityResults`, `FilterSection`) and provider detail attestation display (`AttestationCard`).
- **Provider attestation token alignment (Plan 130)**: Replaced hardcoded attestation row text and icon background colors with semantic design tokens (`text-text-primary`, `bg-background-selection`, `text-primary-dark`) to keep row styling consistent with search surface patterns while preserving attestation-specific typography.
- **RowItem component system rollout (Plan 131, #228)**: Added `RowItem`, `InfoTrailing`, and controlled `CounterTrailing` components in `src/components/ui/`, then migrated search/provider consumers (`WasCategoryResults`, `WasServiceTypeResults`, `WoCityResults`, `FilterSection`, `AttestationCard`, `WerAudienceFilter`) from ad-hoc row markup to shared semantics with standardized subtitle typography and consistent selectable/multi-select state handling.

## [0.12.14] - 2026-05-12

### Added

- **Nachweise attestation display card (Plan 126, #219)**: Added `AttestationCard` to the provider detail Nachweise section to show declared halal commitments (`no_alcohol`, `no_pork`, `no_gambling`) for eligible `food` and `store` providers. The card renders only when at least one commitment is declared and is fully localized across all 6 locales (`en`, `de`, `ar`, `tr`, `ur`, `ps`).

### Changed

- **Provider detail attestation data hydration (Plan 126)**: Updated both `getProviderById()` implementations (client and server) to fetch extension-table fields from `food_providers` and `store_providers` with parallel `maybeSingle()` reads by `provider_id`, ensuring attestation booleans are available at runtime.

## [0.12.12] - 2026-05-12

### Fixed

- **Food search RPC restored — `search_food_concepts` junction-table hotfix (Plan 129)**: Production `/search?section=food` was returning HTTP 400 with Postgres error 42703 (`column p.offers_ids does not exist`). Root cause: migration 006 replaced `providers.offers_ids` uuid[] with the `provider_offers` junction table but did not update the `search_food_concepts` SQL function. New migration 089 recreates the function with the correct `INNER JOIN public.provider_offers` join pattern. Function signature, ranking logic, and all GRANT/REVOKE permissions are preserved. Other food search RPCs (`search_food_categories`, `search_food_menu_items`) are unaffected.

## [0.12.11] - 2026-05-12

### Fixed

- **Admin edit-provider section save no longer fails with HTTP 400 (Plan 128, #221)**: Updated provider edit validation and related typing/tests to align listing type values with the post-migration enum rename (`business` -> `store`). Admins can now change section to Business/Store from the edit panel without triggering "Invalid request body".

## [0.12.10] - 2026-05-12

### Security

- **Dependency security patch (Plan 127)**: Applied safe semver-compatible dependency updates to resolve all high-severity npm audit advisories. Updated `next` from `^15.5.9` to `^15.5.18` (patch) and `resend` from `^6.6.0` to `^6.12.3` (minor). Added `.npmrc` with `audit-level=high` to align local developer audit behavior with CI threshold. Zero breaking changes; all 1243 tests pass. Two residual moderate advisories (postcss <8.5.10 in Next.js internals) are accepted — build-time only, no runtime exposure.

## [0.12.9] - 2026-05-04

### Changed

- **Remove location field from providers search bar (Plan 124)**: The location selector is completely removed from the `/providers` fixed search header. The search bar now shows query input, section tabs, and people summary only — no location dropdown. Existing URL parameters (`?location=Berlin`) continue to work for backend filtering. Regression tests confirm location combobox is absent from the DOM.

## [0.12.7] - 2026-05-04

### Changed

- **Profile route middleware exemption in early access (Plan 123 Iteration 2)**: Added an explicit `/profile` and `/profile/*` exemption in `shouldRedirectToWaitlist` so non-admin users in early-access mode are no longer redirected to `/providers` when navigating to profile pages after login. Added regression tests covering `/profile` and `/profile/edit` behavior and guard checks for existing exemptions.
- **Navbar auth state updates reactively after login (Plan 123)**: Removed premature `router.push` calls from both `LoginPageContent` and `LoginModal` success handlers. Post-login routing now occurs only after auth context user state commits (`useEffect([user])`), fixing the UAT issue where the navbar remained in logged-out state until reload. Added regression tests covering pre-fix failure mode and post-fix behavior for both login entry points, including `returnUrl` handling.
- **Category image unification — DB-driven Supabase Storage (Plan 122)**: Eliminated the hardcoded UUID→static-PNG map (`categoryImages.ts`, 7.2 MB of PNGs) that caused the v0.12.4 Turkish category image bug. All 5 callsites (ProviderCard, ProviderDetailPage, ProviderDetailModal, MobileProviderDetail, UnifiedGallery) now resolve category images from `categories.category_images` JSONB in the database. Images are served from the Supabase Storage `category-images` bucket (Turkish: 8 images, Arabic: 6 images, Italian: 4 images). Adding or changing category images no longer requires a code change or Docker rebuild.
- **Removed static category PNG assets**: `public/images/categories/` directory (22 PNGs, 7.2 MB) removed from repository; images migrated to Supabase Storage as WebP.
- **Background color utility relocated**: `getCategoryCardBackgroundColor`, `CARD_BACKGROUND_COLORS`, and `hashId` moved from the deleted `categoryImages.ts` to `imageUtils.ts`. Category image rendering in `UnifiedGallery` simplified to always use `object-cover` (real food photos from Storage).

## [0.12.4] - 2026-05-03

### Added

- **Provider image fallback redesign — ornament placeholder (Plan 119 M1b)**: Provider cards and detail pages now display a branded ornament-masked placeholder instead of a generic gray image when no provider image is available. The design follows the Figma spec (node 460:2818): mint background (`#d8efe5`), optional category stock photo visible through Islamic geometric ornament diamond-grid cutouts, and a UFlow logo mark with luminosity blend. All 10 placeholder.jpg callsites replaced. Responsive 320 px – 1920 px. Graceful degradation when no stock image is available.
- **Category-based stock image pool (Plan 119 M1b)**: 20 production categories mapped to local PNG image variants in `public/images/categories/`. Deterministic per-provider image selection ensures visual variety across cards in the same category.
- **Unsplash image enrichment workflow — CLI (Plan 119 M3)**: New `npm run enrich:images` script with `--curate` (search, download, upload to Supabase Storage) and `--assign` (deterministically stage candidates per provider) modes. Reuses Plan 065 `enrichment_candidates` admin review flow with append-only merge into `provider_images`. Ownership fail-close enforced (unclaimed providers only).
- **Provider image label i18n (Plan 119)**: Added translation keys for provider image labels (`providers.placeholderImage`, `providers.providerImage`, `providers.communityServiceImage`, `providers.categoryImage`, `providers.failedToLoadImages`, and others) across all 6 supported locales (en, de, ar, tr, ur, ps). `UnifiedGallery` alt/error text and `useImageFallback` error token are now fully localized.
- **Image enrichment schema extension (Plan 119 M3)**: Migration 088 adds `enrichment_type`, `image_url`, `source_service`, `source_category`, and `attribution` columns to `enrichment_candidates` table with idempotent guards.

## [0.12.3] - 2026-05-03

### Changed

- **Search header fixed + section tabs scroll with content** (Plan 109): The search bar and context summary (query · location · audience) are now pinned at the top of the screen on both the home page (Stage 2/3) and the providers listing page. Section tabs were moved to the scrollable content area so they scroll naturally with results instead of overlapping the fixed header.
- **i18n: Search context and providers UI labels localized** (Plan 109): Back-to-home aria-label and admin filter label are now fully translated across all six supported languages (EN/DE/AR/TR/UR/PS). Removes the last hardcoded English fallback strings from the search/providers UI surface.

## [0.12.2] - 2026-05-02

### Added

- **Provider cards: specialty tags on list cards** (Plan 115): Discovery cards now show up to two dish/specialty tags from provider `offers` (for example `Shawarma · Falafel`) with `+N` overflow when more specialties exist.
- **Provider cards: compact open/closed status indicator** (Plan 115): Discovery cards now show a localized `Open`/`Closed` status chip with a green/red dot when `opening_hours` is available, using existing `getOpenStatus()` logic.
- **Provider trust chip i18n** (Plan 115): Trust attribute labels (e.g. Muslim-owned, family-friendly) are now fully localized across all six supported languages (EN/DE/AR/TR/UR/PS).

## [0.12.1] - 2026-05-02

### Fixed

- **Category gallery section leakage fixed** (Plan 119): `fetchCategoriesBySection()` now enforces `applicable_section` guardrails so categories are filtered by section scope (`food`, `store`, `ummah`) while still allowing shared (`all`) categories.
- **Data alignment for wrong-section category exposure** (Plan 119): Added migration `087_plan_119_category_section_alignment.sql` to scope legacy `Gesundheit & Sport` from `all` to `store` when present and to reconcile all provider/category section mismatches by aligning provider `listing_type` to the linked category scope (`food`, `store`, `ummah`).
- **Dead category filter cleanup** (Plan 119): Removed unused `src/components/providers/CategoryFilter.tsx` to reduce stale code paths and maintenance surface.

## [0.12.0] - 2026-05-02

### Changed — Schema Remediation (Plan 116, Architecture 118, 28 findings)

This is a MINOR release. All 28 field-level schema findings from Architecture Review 118 are resolved.
The primary breaking structural changes (supertype unification, table drops, enum rename) were applied
to PROD before app-code changes, making each schema step individually safe during the pre-consumer window.

**M-1 — Phase A Quick Wins** (migration 079, FL-14, FL-15, FL-17, FL-18, FL-22, FL-3)

- Dropped 3 redundant UNIQUE constraints on PK columns (`categories`, `providers`, `users`)
- Added FK on `enrichment_candidates.run_id → enrichment_run_logs.id ON DELETE SET NULL` (FL-14)
- Added EUR-only CHECK constraints on `provider_menu.price_currency`, `provider_catalog.price_currency`, `community_projects.price_currency` (FL-22; tables renamed in M-6)
- Backfilled `waitlist.is_provider` NULLs → `false` and enforced `NOT NULL DEFAULT false` (FL-18)
- Dropped dead column `categories.applicable_to` and its GIN index (FL-3)

**M-2 — Phase B Nullable Boolean Backfills** (migration 080, FL-5, FL-7, FL-8, FL-9, FL-13)

- Backfilled `providers.review_status` NULLs → `'pending'`, enforced `NOT NULL` (FL-7)
- Backfilled `providers.show_address` NULLs → `true`, enforced `NOT NULL DEFAULT true` (FL-13)
- Backfilled `categories.applicable_section` NULLs → `'all'`, enforced `NOT NULL DEFAULT 'all'` (FL-5)
- Added verified `admin_audit_logs.action` CHECK constraint based on live value audit (FL-9)

**M-3 — Phase C Column Renames** (migration 081, FL-24, FL-25)

- Renamed `providers.solidarity_pricing` → `economic_solidarity` (FL-24)
- Renamed `providers.accepts_donations` → `makes_donations` (FL-25)
- Dropped all three section-scoped CHECK constraints (`food_only_ck`, `business_only_ck`, `ummah_only_ck`) from `providers` supertype — structurally replaced by extension tables in M-5

**M-4 — FK Integrity, Enum, Badge Registry** (migration 082, FL-4, FL-10, FL-11, FL-23)

- Changed `needs.category_id` and `offers.category_id` FK to `ON DELETE RESTRICT` (FL-4)
- Changed `providers.category_id` FK to `ON DELETE SET NULL` (FL-11)
- Created `task_status_enum` and migrated `provider_outreach_tasks.task_status` from TEXT+CHECK (FL-10)
- Added `attribute_category`, `provider_column_name`, `is_filterable` columns to `badge_types` (FL-23)
- Inserted 6 new badge type rows (`CHILDREN_FRIENDLY`, `ECONOMIC_SOLIDARITY`, `HAS_PARKING`, `NO_ALCOHOL`, `NO_GAMBLING`, `NO_PORK`)
- Rewrote `sync_provider_badge_to_boolean()` trigger as data-driven via `badge_types.provider_column_name` registry (fixes live regression where stale `accepts_donations` reference caused silent badge sync failures)

**M-5a — Supertype Unification + Enum Rename** (migration 083, FL-26, FL-28 Part 1)

- Renamed `listing_type_enum` value `'business'` → `'store'` (with strict DROP/RENAME/RECREATE ordering per AF-1)
- Created 1:1 extension tables `food_providers`, `store_providers`, `ummah_providers` with RLS enabled
- Migrated food/store type-exclusive columns (`halal_level`, `no_alcohol`, `no_pork`, `no_gambling`) to extension tables; dropped from `providers` supertype
- Migrated `community_services` (8 rows) → `providers` with `listing_type = 'ummah'`; populated `ummah_providers` extension
- Created `provider_engagements` table (replaces `provider_community_services`); migrated 3 rows
- Merged `community_service_offers` and `community_service_needs` → `provider_offers` / `provider_needs`; dropped CS junction tables
- Simplified `bookmarks`: merged `community_service_id` → `provider_id`, dropped CS FK column, enforced `provider_id NOT NULL`
- Dropped `community_services` and `provider_community_services` tables
- Renamed `community_projects.community_service_id` → `provider_id` with FK to `providers`

**M-5b/c — App Code Layer** (no migration, service + component rewrites)

- All 50+ source files referencing dropped tables/columns updated to use `providers` unified supertype
- `from('community_services')` → `from('providers').eq('listing_type', 'ummah')` across all services
- `community_service_id` → `provider_id`, `community_service_name` → `provider_name`, etc.
- Bookmark and badge hooks simplified to `bookmarkableType: 'provider'` only
- Navigation: all CS routes unified under `/providers/[id]`

**M-6 — Table Renames** (migration 084, FL-28 Parts 2+3)

- Renamed `provider_menu_items` → `provider_menu`
- Renamed `provider_service_offers` → `provider_catalog`
- Rewrote `search_food_menu_items()` and `search_provider_items()` RPCs to reference new table names

**M-7 — Advisory Documentation** (migration 085, FL-6, FL-12, FL-21)

- Added SQL comment on `providers.listing_type`: no DEFAULT by design, app-layer validation required
- Added SQL comment on `deletion_logs.user_id`: intentional FK absence (user deleted before log written)
- Added SQL comment on `provider_owner_outreach.dispatch_after`: 24h cool-down business rule

### Deferred (YAGNI)

- FL-16: `category_suggested_offers/needs` surrogate PK retained; composite PK migration deferred
- FL-19: `email_confirmation_tokens.type` TEXT+CHECK retained; enum migration deferred
- FL-20: `community_service_view_count` moved to `ummah_providers`; `provider_stats` MV decision deferred
- FL-27: `category-suggestions.ts` RPC optimisation deferred to next opportunity

## [0.11.7] - 2026-04-30

### Changed

- **F-1 dual-PK anti-pattern eliminated** (Plan 114 Phase 5): Promoted `<entity>_id` as the sole PRIMARY KEY on four tables (`categories`, `users`, `community_services`, `providers`) and dropped the vestigial `id` column from each. All inbound FK references already targeted `<entity>_id` — no FK remapping required. FK-safe cutover strategy preserved UNIQUE constraints during PK promotion (26+ inbound FKs on `providers` remain valid). Phase 4 migration file renamed from `006_phase4_semantic_constraints.sql` to `0061_phase4_semantic_constraints.sql` to resolve a version-prefix collision during dev push.
- **Admin authorization fix** (Plan 114 Phase 5): Updated badge `verify` and `unverify` endpoints (`/api/admin/badges/verify`, `/api/admin/badges/unverify`) to authorize via `public.users.role` column instead of non-existent `raw_user_meta_data`. Also cleaned stale `id` column references from `roles.ts`, `check-role`, `debug-auth`, `set-role`, and `diagnose` admin routes. Service layer `getCategoryById()` now uses `.eq('category_id', id)`.

## [0.11.6] - 2026-04-30

### Changed

- **F-5 semantic constraints for provider section fields** (Plan 114 Phase 4): Added migration `006_phase4_semantic_constraints.sql` to extend `listing_type_enum` with `ummah`, backfill `providers.listing_type` from `NULL` to `ummah`, enforce `listing_type NOT NULL`, and add section-scoped CHECK constraints that prevent invalid boolean/section combinations (`food`-only, `business`-only, `ummah`-only attributes).

### Tests

- Added migration contract test `src/__tests__/migrations/006-phase4-semantic-constraints-tdd.test.ts` validating enum extension, backfill + NOT NULL enforcement, and all three semantic CHECK constraints.

## [0.11.5] - 2026-04-29

### Changed

- **F-2 referential integrity: junction tables replace UUID array columns** (Plan 114 Phase 3): Created four junction tables (`provider_offers`, `provider_needs`, `community_service_offers`, `community_service_needs`) with FK constraints and ON DELETE CASCADE. Backfilled from existing `offers_ids`/`needs_ids` arrays then dropped the array columns and GIN indexes. All service-layer queries and matching logic updated to join via junction tables.
- **F-4 referential integrity: typed FK columns replace polymorphic associations** (Plan 114 Phase 3): Added `provider_id` and `community_service_id` typed FK columns to `bookmarks` and `provider_badges`, replacing polymorphic `bookmarkable_id`/`bookmarkable_type` and `entity_id`/`entity_type` pairs. Mutual exclusion CHECK (`num_nonnulls = 1`) enforced at DB level. Legacy polymorphic columns and `entity_type` enum dropped. All runtime bookmark query paths (five UI components + one hook) migrated to typed FK columns. Service layer provides backward-compatible field mapping for consumers expecting legacy response shapes.

## [0.11.4] - 2026-04-29

### Fixed

- **F-3 data coherence: boolean columns now sole source of truth for provider attributes** (Plan 114 Phase 2): Eliminated the triple-source incoherence bug where providers created via the form were invisible to search filters. Dropped `barakah_effects TEXT[]` from `providers` and `community_services` tables (migration 005). All writes to this field removed from create forms, import scripts, and RPC functions. Boolean columns (`muslim_owned`, `family_friendly`, etc.) remain the authoritative filter source. Updated `get_community_services_for_provider` and `upsert_joinhalal_providers` RPC signatures to exclude the dropped column.

## [0.11.3] - 2026-04-29

### Fixed

- **City-selection redirect fix** (Plan 111): CTA now navigates to `/` (home) instead of the broken `/city/{name}` route. City is stored in context/cookie; URL-based city routing was removed in an earlier architecture cycle.
- **Navbar/footer hidden on city-selection page** (Plan 111): `shouldShowMobileFooter` and `shouldShowCityEarlyAccessNavbar` now use suffix-based matching (`pathname.endsWith('/city-selection')`) so locale-prefixed paths (e.g. `/de/city-selection`) are correctly excluded.

### Added

- **Canonical section routes** (Plan 111): `/food`, `/stores`, and `/ummah` are now first-class bookmarkable routes. Each is a thin Next.js App Router alias page that delegates to `ProvidersContent` with the correct section forced via `searchParams`. Legacy `/providers` routes are fully preserved for backward compatibility.
- **Locale-safe route resolver** (Plan 111): `sectionFilters.ts` gains three new helpers — `getResultsPathForSection()`, `resolveSectionFromSearchParams()`, and `resolveSectionFromRoute()` — all using suffix matching so locale prefixes (e.g. `/de/food`) resolve correctly.
- **Section-aware navigation** (Plan 111): Header, CategoryFilter, ProvidersContent, Search page, and gallery components updated to push canonical routes; `categoryLabel` prop wired into `SearchContextBar` for section context display.

### Tests

- Added `src/app/city-selection/page.test.tsx` (120 lines): regression suite for the redirect-to-home fix.
- Updated `src/__tests__/utils/navigationUtils-063.test.ts` (12 tests): suffix-matching navbar exclusion coverage including locale-prefixed paths.
- Updated `src/__tests__/config/sectionFilters.test.ts` (23 tests): canonical route resolution with locale prefix edge cases.
- Updated `src/features/search/components/SearchContextBar.test.tsx`: 14 lines of category label regression coverage.
- Updated `src/__tests__/app/(public)/search/page-meal-search.test.tsx`: routing assertions updated for canonical `/food` paths.

## [0.11.2] - 2026-04-29

### Changed

- **Infrastructure: Cross-environment schema alignment for compliance tables** (Plan 114 Phase 1, F-9): Added `004_phase1_environment_alignment.sql` — idempotent migration that reconciles `consent_type` enum, `consent_logs` table, and `deletion_logs` table across local, dev, and prod environments. Resolves schema divergence where `consent_logs` was absent from prod and `deletion_logs` was prod-only. All three environments now share identical schema for compliance tables.

### Added

- **Migration contract test** (Plan 114 Phase 1): `004-phase1-environment-alignment-tdd.test.ts` validates migration 004 presence and required schema markers across environments.

## [0.11.1] - 2026-04-29

### Changed

- **Infrastructure: Deterministic migration baseline established** (Plan 114 Phase 0-prime): Prod schema captured as canonical baseline (`001_baseline.sql`, 158 KB). All three environments (local/dev/prod) now share identical schema lineage via a forward-only migration chain (`001` → `002` → `003`). Eliminates the zero-shared-lineage problem that previously made cross-environment schema verification impossible.
- **Infrastructure: Historical migration chain archived** (Plan 114 Phase 0-prime): 84 historical migration files moved to `supabase/migrations/archive/`. Active root now contains only the forward migration chain. Historical chain preserved for audit/traceability.
- **Infrastructure: Phase 0 schema hygiene migration added** (Plan 114 Phase 0-prime): `003_phase0_schema_hygiene.sql` removes 10 redundant indexes and a duplicate `update_providers_updated_at` trigger that were present in the prod-derived baseline. Adds 2 composite indexes for query performance.
- **Infrastructure: Supabase config aligned to Postgres 17** (Plan 114 Phase 0-prime): `supabase/config.toml` `major_version` updated from 15 → 17 to match linked prod.

### Fixed

- **Migration tooling: Archive-aware path resolution** (Plan 114 Phase 0-prime): `scripts/apply-provider-social-migration.sh` now resolves migration files from both active root and `archive/` paths via fallback logic. Prevents operational failure when migration files are reorganised.
- **Migration tooling: Seed replication role safety** (Plan 114 Phase 0-prime): `002_seed.sql` now explicitly restores `session_replication_role = origin` before `RESET ALL`, ensuring FK/trigger enforcement is preserved in downstream migration-runner sessions.
- **Migration tooling: Stale path references swept** (Plan 114 Phase 0-prime): 20 docs/scripts files updated to reference archived migration paths after historical chain moved to `archive/`.

### Tests

- Updated 6 migration contract test files (`068`–`077`) with archive-aware path resolution: tests now locate migration files from either active root or `archive/` path, preventing test breakage after migration file reorganisation.

## [0.11.0] - 2026-04-29

### Added

- **Provider Details: Real-time open/closed status line** (Plan 113 M2): Displays green "Geöffnet" or red "Geschlossen" label beneath provider title, derived from `opening_hours` JSONB data. Shows next opening time when closed. Hidden gracefully when no schedule data exists.
- **Provider Details: 6 accordion sections** (Plan 113 M3): Structured collapsible sections — Werte & Amenities, Angebote (menu), Öffnungszeiten (full week schedule), Feedback (placeholder), Nachweise (trust certificates), In der Nähe (same-city providers). Applied to both mobile and desktop detail paths.
- **Provider Details: Halal Trust Banner** (Plan 113 M4): Static section at page bottom with teal Halal seal, headline, body text, and `/halal` info link. Matches Figma design specification.
- **Provider Details: Halal Trust Popup** (Plan 113 M5): First-visit popup displayed for the first 10 provider detail opens (global counter via `localStorage`). Dismissible via close button, ESC key, or click-outside. Includes full keyboard focus trap and ARIA accessibility attributes.
- **Provider Details: Keyboard-accessible popup focus trap** (Plan 113 M5): Tab/Shift+Tab cycles within popup; focus does not escape to background; ESC closes popup; `aria-modal="true"` present.
- **Database: `opening_hours` JSONB column on `providers` table** (Plan 113 M1, migration 078): Nullable JSONB column stores structured weekly schedule. Backward-compatible — existing providers unaffected.

### Fixed

- **Provider Detail: Scroll-lock extends to `<html>` element** (Plan 113 M6): `useScrollLock` now locks both `body` and `html` overflow to prevent page scroll in all browsers. Includes DOM-attribute counter (`data-scroll-lock-count`) for HMR/dev-mode recovery when module state resets but DOM remains locked.
- **Provider Detail: Image carousel swipe no longer blocks vertical scroll** (Plan 113 M6): `useImageSwipe` move handler now gates `preventDefault()` behind an active drag-session ref. Touch moves that are not part of a swipe gesture allow native vertical scroll to proceed.
- **Provider Detail: Touch-pan override removed from image container** (Plan 113 M6): Removed `touch-pan-x` Tailwind class and `touchAction: 'pan-x'` style from mobile and desktop image containers — vertical panning was blocked on some devices.
- **Provider Detail: Nearby section loading state** (Plan 113 M3): "In der Nähe" section now shows loading text while the city-match query is in-flight instead of a premature empty-state message.
- **Provider Detail: Trust badges 42703 fallback** (Plan 113 M6): `getBadgesForEntityServer()` now uses independent query builders for its primary and fallback paths, preventing a stale `is_active` filter from persisting across the retry and causing a PostgreSQL 42703 (undefined column) error.
- **Provider Detail: ARIA labels localised in image gallery** (Plan 113 M6): Image gallery container and pagination dots now use `t()` i18n calls instead of hardcoded English strings.

## [0.10.42] - 2026-04-28

### Fixed

- **i18n: All 6 locales now have full key parity with the EN canonical reference** (Plan 111 M1): Key-diff script (`npm run i18n:check`) now reports 0 missing keys for de, ar, tr, ur, ps. Closes the key-structure gap that caused raw translation keys to render for non-DE/EN users.
- **i18n: Forgot-password and reset-password pages fully localised** (Plan 111 M2): Replaced all `language === 'de' ? ... : ...` ternaries with `t()` calls from `LanguageProvider`. Auth recovery pages now render correctly in all 6 supported locales.
- **i18n: Auth error messages now localised** (Plan 111 M2): Backend error codes (`EMAIL_NOT_FOUND`, `INVALID_OR_EXPIRED_TOKEN`) are now mapped to human-readable localized messages instead of being rendered raw to the user.
- **i18n: Reset→forgot-password email prefill** (Plan 111 M2): After a reset-password failure, navigation to the forgot-password page now pre-populates the email field via query param, completing the cross-page user journey.
- **i18n: Bookmark toast messages now locale-aware** (Plan 111 M2): `useBookmarkWithAuth` hook migrated from legacy 2-language (`de`/`en`) fallback to `LanguageProvider`, enabling toast messages for all 6 supported locales.

### Added

- **i18n: Deterministic locale parity checker** (`scripts/check-i18n.mjs`, `npm run i18n:check`): Automated script verifies all locale files have identical key structure to the EN canonical. Exits with code 1 if gaps are detected.
- **i18n: Regression test for parity checker** (`tests/scripts/check-i18n.test.ts`): Vitest unit test covering `collectMissingKeys()` detection logic.
- **i18n: `forgotPassword.*` and `resetPassword.*` translation namespaces** added to all 6 locale files (en, de, ar, tr, ur, ps) with localised strings.

## [0.10.41] - 2026-04-28

### Changed

- **ProviderCard bookmark overlay** (Plan 112): Relocated bookmark/heart button from the bottom action row to a top-right image overlay (circular icon, `top-3 right-3`). Removes the bottom Save/Saved and Website rows in bookmark mode for a cleaner card layout. Moderation mode (Approve/Reject buttons) is unaffected.
- **Providers navbar visibility** (Plan 112): Mobile footer navbar now consistently visible on the `/providers` discovery page. `RootClientLayout` treats `/providers` as a discovery route and forces `mobileUiMode='footer'`.
- **Search tab active state** (Plan 112): Explore/Search tab in `MobileFooterBar` now shows as active when visiting the `/providers` listing route.

### Tests

- Added/updated 53 unit tests across `ProviderCard`, `RootClientLayout`, and `MobileFooterBar` to cover overlay behaviour, moderation mode preservation, PO Barik decision, navbar visibility regression, and explore-tab active-state logic.
- Regression test `[post-fix PASSES] /providers forces footer mode even when stage is loading` added to `RootClientLayout.test.tsx`.

## [0.10.40] - 2026-04-27

### Changed

- **i18n: Section (listing_type) field labels localised** (DF-1): The admin Section field labels (`Section (listing_type)`, `Unclassified`, `Food`, `Business`) now use the LanguageProvider translation system (`t()` keys) instead of hardcoded English strings. Translation keys added to all six locale files (en, de, ar, tr, ur, ps).

### Tests

- **Route test schema fidelity** (DF-2): Enhanced `providerEditUpdateSchema` mock in `admin-edit-provider.test.ts` to validate the `listingType` enum contract at route level. Added regression test `[pre-fix FAILS] returns 400 when listingType is outside allowed enum` confirming invalid values are rejected with HTTP 400.
- Added i18n regression test `[pre-fix FAILS] moderation section selector uses translation keys for label and options` to `ProviderEditForm.regression.test.tsx` confirming all UI strings use `t()` keys.

## [0.10.39] - 2026-04-27

### Added

- **Admin Section (listing_type) editing**: Admin moderators can now change a provider's Section classification (Food / Business / Unclassified) directly from the provider edit dashboard (`/dashboard/providers/[id]/edit`). The field was previously read-only for all users; it is now an editable dropdown in the admin moderation context.

### Tests

- Added regression test `[pre-fix FAILS] admin moderation flow should allow editing Section (listing_type)` to `ProviderEditForm.regression.test.tsx`.
- Added regression test `[pre-fix FAILS] includes listing_type when explicitly provided by admin edit flow` to `admin-provider-edit.test.ts`.

## [0.10.38] - 2026-04-27

### Added

- **Providers results search context bar (Plan 109 / Issue #175)**:
  - Added `SearchContextBar` component at `src/features/search/components/SearchContextBar.tsx`.
  - Added shared section icon renderers at `src/features/search/constants/sectionIconRenderers.tsx` and reused them in `SectionSelector`.
  - Search context bar now shows section icon, search term fallback, location fallback (`Everywhere`), optional `wer` audience summary, and an edit affordance routing to `/search?section={section}`.

### Changed

- Updated `ProvidersPageHeader` to use `SearchContextBar` instead of `FigmaSearchBar`.
- Removed redundant `SectionSelector` row from `/providers` header.
- Updated `/search` submit URL builder to include:
  - `location` when a city is selected (functional providers filter)
  - `wer` when audience selection exists (display-only context transport)

### Tests

- Added `src/features/search/components/SearchContextBar.test.tsx`.
- Added `src/components/providers/ProvidersPageHeader.test.tsx`.
- Added `src/__tests__/components/MobileFooterBar.providers-active.test.tsx` to lock `/providers` active-nav behavior.
- Extended `src/__tests__/app/(public)/search/page-meal-search.test.tsx` with regression coverage for `location` and `wer` URL params.

## [0.10.37] - 2026-04-27

### Fixed

- **CI dependency-review action**: Replaced invalid SHA pin `4081bf99...` with verified v4.6.0 commit SHA `ce3cf9537a52e8119d91fd484ab5b8a807627bf8`; resolves Dependency Review workflow failures and Dependabot `github_actions` updater crashes on all PR branches
- **CI performance budget**: Raised `/providers/[provider_id]` First Load JS budget ceiling from 220 kB to 260 kB to match current measured bundle size (244 kB) with headroom; removes deterministic CI budget failures introduced by organic feature growth since Plan 033

### Improved

- **CI build reliability**: Added `shell: bash` and `set -o pipefail` to the CI build step so `next build` failures propagate correctly through the `tee` pipeline; previously a build failure could be silently masked by tee's exit code

## [0.10.36] - 2026-04-27

### Fixed

- **Stores search Wer accordion removal**: The `Wer` (audience) accordion is now hidden when the Stores (`business`) section is selected on `/search`, so users no longer see irrelevant Männer/Frauen/Kinder audience controls for stores.
- **Accordion section-switch behavior**: Switching from an open `Wer` accordion to Stores now resets the open panel to `Was`, preventing an all-collapsed accordion state.

### Tests

- Added regression coverage in `src/app/(public)/search/page.test.tsx` for hidden `Wer` in Stores and section-switch reset behavior.

## [0.10.35] - 2026-04-27

### Fixed

- **Ummah section tab state rollback**: Switching between search sections (Food/Ummah) no longer transiently reverts to the previous section during async `router.replace` propagation; URL is now the authoritative state source
- **Redundant tab navigation**: Clicking the already-active search section tab no longer triggers a `router.replace` (no-op guard added)

### Improved

- **3-item preview parity**: All search sections (WAS service types, filter rows, and popular cities) now cap to 3 items in the idle/empty-query state, matching the existing food categories and meal preview behavior
- **Ummah service type recent searches**: Selecting an Ummah community service type (e.g., Beratung, Islamische Bildung) now persists to localStorage (`uflow:recent-ummah-service-types`, max 3, deduped) and surfaces as recent-first suggestions on next open
- **Section switch state clearing**: Stale WAS selections, query text, and filter toggles from the previous section are cleared when switching sections

### Tests

- Added `[regression] section switching updates URL section param` test
- Added `[regression] no router.replace when clicking already-active section tab` test
- Added `[regression] mounted URL sync updates selectedSection` test
- Added `[regression] delayed router.replace does not revert section state` test
- Added `[regression] food WAS selection cleared on switch to Ummah` test
- Extended `WasServiceTypeResults`, `UmmahFilterSection`, `WoCityResults` test suites for 3-item preview and recent-search behavior

## [0.10.34] - 2026-04-27

### Fixed

- **Food search prefix matching**: Typing partial cuisine names (e.g., "Afgh") now returns matching results in all three food search RPCs (`search_food_concepts`, `search_food_categories`, `search_food_menu_items`); previously, `plainto_tsquery` only matched whole lexemes

### Improved

- **Cuisine label normalization**: Food category labels no longer include the redundant "Küche" suffix; "-ische" endings are normalized to "-isch" (e.g., "Afghanische Küche" → "Afghanisch")

### Tests

- Added TDD migration contract test for food search prefix matching RPC (migration 077)

## [0.10.33] - 2026-04-27

### Fixed

- **Food search recent history contamination**: Non-food items (service-type entries) no longer appear in the Food "What" section recent history; only `category` and `dish` type entries are stored and displayed
- **Legacy storage cleanup**: Mixed-section recent entries written by older app versions are automatically cleaned from localStorage on mount
- **Food-only persistence guard**: Selections in non-food sections no longer write to the food recent searches key

### Improved

- **"Wo?" empty-state label**: The "Where" accordion now shows a localized question form ("Wo?", "Where?", "أين؟", "Nerede?", "کہاں؟", "چیرته؟") when no city is selected, matching the "Was?" accordion style, across all 6 supported locales

### Tests

- Added `[regression] excludes non-food recent items from food What section` test
- Added `[regression] shows Wo? when no Wo city is selected` test

## [0.10.32] - 2026-04-27

### Added

- **Search expand show-all preview** (feature-flagged, default OFF — `NEXT_PUBLIC_FEATURE_ENABLESEARCHEXPANDSHOWALLPREVIEW`):
  - `WasMealResults`, `WasCategoryResults`, `WoCityResults`, `FilterSection` sections now show max 3 items in idle state when flag enabled, with a section-specific reveal button
  - Section-aware "Show all" CTA labels across 6 locales (DE, EN, AR, TR, UR, PS): `suchen.was.showAllCuisines`, `suchen.was.showAllDishes`, `suchen.wo.showAllCities`, `suchen.filter.showAllFilters`
  - `FilterSection` preview respects `selectedSection` context (ummah = empty, business = no muslim filter, others = all)
  - **Recent-over-Popular mutual exclusivity**: Recent searches hide Popular listings when any recent search history exists; Popular renders only as fallback when recent list is empty — enforced in both `WasCategoryResults` and `WoCityResults`
  - **FigmaSearchBar** new compact search bar component with hamburger collapse/expand and location filtering, integrated into `ProvidersPageHeader`

### Improved

- Provider search result grid uses 2-column layout on mobile for better card density
- City rows in `WoCityResults` styled with `hover:bg-background-selection/50`, `focus:ring-2 focus:ring-primary/30`, `h-6 w-6` map icon, and `text-base font-light` subtitle for visual alignment with filter rows
- Search action aria-labels (`search.open`, `search.submit`, `search.filter`) localized across all 6 locales

### Tests

- Added feature-flag ON/OFF tests for `WasMealResults`, `WasCategoryResults`, `WoCityResults`, `FilterSection`
- Added business-section and ummah-section filter hiding tests for `FilterSection`
- Added recent-priority + popular-fallback tests for `WasCategoryResults` and `WoCityResults`
- Added `FigmaSearchBar.test.tsx` covering localized labels, submit, and location dropdown

## [0.10.31] - 2026-04-27

### Added

- **Ummah tab section-conditional search options (Plan 107 / Issue #172)**:
  - Added `WasServiceTypeResults` component in `src/features/search/components/WasServiceTypeResults.tsx` for Ummah WAS discovery.
  - Added static Ummah service types with client-side filtering (`islamische-bildung`, `beratung`, `rechtshilfe`, `jugenddienste`, `gesundheitsversorgung`, `eheberatung`, `bestattungsdienste`, `soziale-hilfe`, `sprachkurse`, `quran-unterricht`).
  - Added `UmmahFilterSection` component in `src/features/search/components/UmmahFilterSection.tsx` with Ummah-specific filters:
    - `kostenlos`
    - `online`
    - `sprache`
    - `zertifiziert`
    - `geschlechtergetrennt`
  - Added Ummah filter key constants in `src/features/search/constants/ummahFilterKeys.ts`.
  - Added Ummah translations under `suchen.was.ummah.*` and `suchen.filter.ummahItems.*` in all locales (`de`, `en`, `tr`, `ur`, `ps`, `ar`).

### Changed

- Updated `/search` page (`src/app/(public)/search/page.tsx`) to render section-conditional WAS and Filter content:
  - Ummah section now renders `WasServiceTypeResults` and `UmmahFilterSection`.
  - Food/Business sections retain existing `WasCategoryResults`/`WasMealResults` and `FilterSection` behavior.
- Added section-change state hygiene via `useEffect` to clear stale WAS/filter state when switching sections.
- Guarded food RPC effects (`searchFoodConcepts`, `searchFoodMenuItems`) to avoid requests when section is not `food`.
- Extended `WasSelection` union in `src/features/search/components/WasCategoryResults.tsx` to include `'service-type'` with optional `serviceTypeId`.

### Tests

- Added `src/features/search/components/WasServiceTypeResults.test.tsx`.
- Added `src/features/search/components/UmmahFilterSection.test.tsx`.
- Extended `src/__tests__/app/(public)/search/page-meal-search.test.tsx` with regression coverage for Food -> Ummah switch clearing stale WAS selection.

## [0.10.30] - 2026-04-27

### Added

- **Badge/Boolean data coherence for provider filters (Plan 106 / Issue #170)**:
  - Added migration `supabase/migrations/076_provider_badge_boolean_sync_trigger.sql`:
    - New trigger function `sync_provider_badge_to_boolean()` on `public.provider_badges` (`AFTER INSERT OR DELETE`)
    - Resolves `badge_key` via `badge_types` JOIN (`provider_badges` stores `badge_type_id`)
    - Applies provider-only mapping (`entity_type = 'provider'`):
      - `MUSLIM_OWNED` → `providers.muslim_owned`
      - `PRAYER_FRIENDLY` → `providers.has_prayer_space`
      - `SUPPORTS_SADAQAH` → `providers.accepts_donations`
    - Insert path sets mapped booleans to `true`
    - Delete path unsets mapped booleans only when the deleted badge was the last provider badge of that type
  - Updated provider creation flow in `src/services/providerService.ts`:
    - Added form-tag normalization and mapping for filter-relevant attributes
    - Writes direct booleans for non-badge attributes on provider INSERT:
      - `has_parking`
      - `solidarity_pricing`
    - Creates `provider_badges` rows with `trust_level = SELF_DECLARED` for badge-mapped attributes after provider INSERT
    - Adds fallback strategy: if badge creation fails, directly updates corresponding provider booleans (`muslim_owned`, `has_prayer_space`, `accepts_donations`) so search filtering remains correct

### Changed

- Made `FilterSection` section-aware:
  - `src/features/search/components/FilterSection.tsx` now accepts `selectedSection`
  - FOOD shows all 5 filters
  - BUSINESS/STORES hides `muslim` filter
  - UMMAH hides provider-only filters
- Wired `selectedSection` through `src/app/(public)/search/page.tsx` into `FilterSection`.

### Tests

- Extended `src/features/search/components/FilterSection.test.tsx` with section-visibility coverage.
- Added `src/__tests__/services/providerService.badges.test.ts` for creation-path badge/boolean wiring and fallback behavior.

## [0.10.29] - 2026-04-26

### Added

- **Values & Amenities filter data wiring on `/search` and `/providers` (Plan 105 / Issue #168)**:
  - Added search filter key mapping constants in `src/features/search/constants/filterKeys.ts`:
    - `muslim` → `muslim_owned`
    - `spenden` → `accepts_donations`
    - `solidaritaet` → `solidarity_pricing`
    - `parken` → `has_parking`
    - `gebet` → `has_prayer_space`
  - Wired `/search` submit flow (`src/app/(public)/search/page.tsx`) to include selected filters in URL as comma-separated `filters` query param.
  - Wired `/providers` server initial fetch (`src/app/(public)/providers/page.tsx`) to parse, validate, and pass filters into provider search.
  - Wired `/providers` client pagination (`src/app/(public)/providers/ProvidersContent.tsx`) to preserve filters across API requests and React Query cache keys.
  - Wired API route `GET /api/providers/search` (`src/app/api/providers/search/route.ts`) to parse and allowlist-filter `filters`, silently strip unknown keys, forward validated keys to service layer, and apply `Cache-Control: no-store` when filters are present.
  - Wired provider service search (`src/services/providers.ts`) to apply selected filters as AND predicates via boolean columns (`.eq(column, true)`), while preserving the `ummah` section behavior (community services unaffected by these provider-only filters).

### Tests

- Extended route tests: `src/__tests__/api/providers-search.test.ts` (validated filter forwarding, unknown-key stripping, filter cache-control semantics)
- Extended SSR page tests: `src/__tests__/app/providers-page-location.test.tsx` (filters passthrough)
- Extended service routing tests: `src/__tests__/services/providers-section-routing.test.ts` (AND semantics + ummah isolation)
- Added regression test with explicit pre-fix naming in `src/__tests__/app/(public)/search/page-meal-search.test.tsx`:
  - `[pre-fix FAILS] includes selected filters in providers URL on search submit`

## [0.10.28] - 2026-04-26

### Added

- **Filter accordion UI redesign on `/search` (Plan 104 / Issue #166)**:
  - Added new `FilterSection` component in `src/features/search/components/FilterSection.tsx` with 5 interactive filter rows:
    - `muslim` (`Moon`)
    - `spenden` (`HandHeart`)
    - `solidaritaet` (`HeartHandshake`)
    - `parken` (`CircleParking`)
    - `gebet` (`PrayerRug` custom SVG)
  - Added custom `PrayerRug` icon component in `src/components/icons/PrayerRug.tsx` with MIT attribution comment (Hugeicons source).
  - Replaced `/search` filter stub with controlled accordion state in `src/app/(public)/search/page.tsx`:
    - `selectedFilters` local state
    - `filterOpen` accordion state
    - required collapsed title badge `Filter · N` when filters are selected
    - clear-all now resets filter state and title back to `Filter`
  - Added `suchen.filter.items.*` translation keys for all 6 locales (`de`, `en`, `ar`, `tr`, `ur`, `ps`).

### Tests

- Added component test: `src/components/icons/PrayerRug.test.tsx`
- Added component test: `src/features/search/components/FilterSection.test.tsx`
- Extended page integration tests: `src/app/(public)/search/page.test.tsx`

### Fixed

- Updated Gebet filter icon to use `prayer-rug-02` stroke-rounded design matching Figma node 245:11586. Prior implementation used a simplified rug shape; new design shows rectangular prayer mat with fringe tassels and mihrab arch motif (Hugeicons CDN, MIT).

### Notes

- Filter UI is interactive (items toggle with visual feedback and collapsed title count) but does not execute backend queries yet.
- Selected filters are not applied to search results in this release.
- Full filter execution wiring is deferred to a future plan.

## [0.10.27] - 2026-04-25

### Added

- **Wer audience filter component — Plan 103 / Issue #164**:
  - Added `WerAudienceFilter` client component (`src/features/search/components/WerAudienceFilter.tsx`) with three audience rows: Männer, Frauen, Kinder.
  - Each row renders a colored 48×48 icon, bold label, subtitle, and a circular −/N/+ stepper counter.
  - Steppers are fully independent per row; minimum of one total selected person enforced (cannot decrement below 0 or reach 0 total).
  - Component accepts `onSelectionChange` callback and `resetSignal` prop for parent-driven clear-all integration.
  - Wired into the existing `ExpandSection` Wer placeholder in `src/app/(public)/search/page.tsx`; "Alles löschen" now resets Wer counters to default (1 Männer) via `werResetSignal`.
  - Added 6 translation keys under `suchen.wer.*` namespace in `de.ts` / `en.ts`: `maennerLabel`, `frauenLabel`, `kinderLabel`, `subtitle`, `decrementAriaLabel`, `incrementAriaLabel`.
  - Added audience icon SVGs: `public/icons/audience/maenner.svg`, `frauen.svg`, `kinder.svg`.
  - Added 3 unit tests (`WerAudienceFilter.test.tsx`) covering render, counter independence, and decrement guard.
  - Added 2 page-level regression tests covering Wer clear-all reset path and single-open accordion invariant.

## [0.10.26] - 2026-04-24

### Added

- **Wo onboarding default + Was-parity city results redesign (Plans 101 + 102 / Issues #159 + #162)**:
  - Added `fetchPopularCities(limit)` in `src/services/providers.ts` to aggregate city-level listing counts across `providers` and approved `community_services`.
  - Added new `WoCityResults` component (`src/features/search/components/WoCityResults.tsx`) with 5-state rendering:
    - loading
    - error
    - idle (popular cities + recent city searches + selected city card)
    - query results
    - empty/no-provider fallback
  - Refactored `/search` Wo accordion in `src/app/(public)/search/page.tsx` to match Was interaction patterns:
    - controlled accordion mode (`isOpen` + `onToggle`)
    - persistent recent Wo searches via `localStorage['uflow:recent-wo-searches']` (max 3, deduplicated)
    - selection row with remove action in idle state
    - dynamic Wo header remains `Wo · {city}` when city selected
  - Added Wo i18n namespace (`suchen.wo.*`) in all locales (`de`, `en`, `tr`, `ar`, `ps`, `ur`):
    - `loading`
    - `searchError`
    - `providerCount`
    - `popularLabel`
    - `recentLabel`
    - `selectionLabel`
    - `selectedWhere`
    - `removeSelection`
    - `noResults`

### Tests

- Added component tests: `src/features/search/components/WoCityResults.test.tsx`
- Extended service tests: `src/__tests__/services/providers.test.ts` with `fetchPopularCities` coverage
- Updated page regression tests: `src/app/(public)/search/page.test.tsx`

## [0.10.25] - 2026-04-24

### Added

- **Was? category row Figma redesign (Plan 098 / Issue #156)**:
  - Added migration `supabase/migrations/075_search_food_categories_add_images.sql` to extend RPC `search_food_categories(search_query, limit_count)` with additive `category_images` output for icon rendering.
  - Extended `FoodCategory` type in `src/services/offers.ts` with `category_images: string | null`.
  - Redesigned `WasCategoryResults` to match Figma selection/category row spec:
    - 48x48 rounded icon slot per category row.
    - Active AUSWAHL row with `bg-primary/10`, filled teal remove button, and divider before following sections.
    - Accessible remove action via localized `aria-label` (`suchen.was.removeSelection`).
    - Dish-type recent rows now render localized `dishLabel` subtitle and no icon slot.
    - Fallback icon switched from emoji to Lucide `UtensilsCrossed` for cross-platform visual consistency.
  - Added new i18n keys in all locales (`de`, `en`, `tr`, `ar`, `ps`, `ur`):
    - `suchen.was.dishLabel`
    - `suchen.was.removeSelection`

### Tests

- Added migration contract test: `src/__tests__/migrations/075-food-category-images-rpc-tdd.test.ts`
- Added component tests: `src/features/search/components/WasCategoryResults.test.tsx`

### Fixed

- **PWA fallback asset gitignore consistency (Plan 099 / Issue #157)**:
  - Updated `.gitignore` to exclude all hashed PWA fallback files (`**/public/fallback-*.js`, `**/public/fallback-*.js.map`), consistent with other PWA build outputs (`sw.js`, `workbox-*.js`).
  - Untracked `public/fallback-ce627215c0e4a9af.js` from git index — file remains on disk and is generated at build time.
  - Removed obsolete `guard-fallback-assets` script and lint-staged hooks (root cause fixed by consistent gitignoring).

### Changed

- **Design system: Convert `background.selection` token to CSS variable (Plan 100)**:
  - Added CSS custom property `--color-background-selection: 170 30% 96%` to `:root` in `src/styles/globals.css`.
  - Converted `background.selection` Tailwind token from hardcoded `#F2F8F7` to `hsl(var(--color-background-selection))`.
  - Expanded `background` token in `src/design-system/tokens/colors.ts` from flat string to object with `DEFAULT` and `selection` keys.
  - Token now participates in runtime theme switching alongside the rest of the design system.

## [0.10.24] - 2026-04-21

### Added

- **Food concept search for `Was?` in `/search?section=food` (Plan 097 / Issue #154)**:
  - Added migration `supabase/migrations/070_search_food_concepts_rpc.sql` with new RPC `search_food_concepts(search_query, limit_count)` returning canonical food concepts with `provider_count`.
  - RPC searches offer names using German + English tsvector branches and filters to approved food providers using GIN-friendly array containment (`providers.offers_ids @> ARRAY[offer_id]`).
  - Added typed `FoodConcept` model and `searchFoodConcepts()` service wrapper in `src/services/offers.ts`.
  - Rewired `/search` Was flow in `src/app/(public)/search/page.tsx` from `searchProviderItems` to `searchFoodConcepts` with `limit_count: 10`.
  - Removed provider lookup augmentation effect from search page; concept rows now render directly from RPC results.
  - Updated `WasMealResults` to concept-level rendering (name + localized provider count) and switched row key from `item_id` to `offer_id`.
  - Added new i18n key `suchen.was.providerCount` to all 6 locale files (`de`, `en`, `tr`, `ar`, `ps`, `ur`).

### Tests

- Added migration contract test: `src/__tests__/migrations/070-food-concept-search-tdd.test.ts`
- Extended service tests: `src/__tests__/services/offers.test.ts` with `searchFoodConcepts` coverage
- Updated component tests: `src/features/search/components/WasMealResults.test.tsx`
- Updated page integration tests: `src/__tests__/app/(public)/search/page-meal-search.test.tsx`

## [0.10.23] - 2026-04-21

### Added

- **Meal search in `Was?` accordion (`/search?section=food`) (Plan 096 / Issue #153)**:
  - Added new service `src/services/provider-catalog.ts` with typed RPC wrapper `searchProviderItems()` for `search_provider_items`.
  - Added `WasMealResults` component (`src/features/search/components/WasMealResults.tsx`) with 5 UI states: empty, loading, error, results, no-results.
  - Wired debounced meal search (300ms) in `src/app/(public)/search/page.tsx` with a minimum 2-character guard and `listing_type_filter = 'food'` when food section is active.
  - Implemented client-side `provider_id -> provider_name/provider_image` augmentation for RPC rows (frontend-only approach; no RPC schema change).
  - Added i18n keys under `suchen.was.*` across all 6 locales (`de`, `en`, `tr`, `ar`, `ps`, `ur`):
    - `searchPlaceholder`
    - `loading`
    - `noResults`
    - `notFoundEncouragement`
    - `searchError`

### Tests

- Added service tests: `src/__tests__/services/provider-catalog.test.ts`
- Added component tests: `src/features/search/components/WasMealResults.test.tsx`
- Added page integration tests: `src/__tests__/app/(public)/search/page-meal-search.test.tsx`

## [0.10.22] - 2026-04-20

### Added

- **Unified Catalog Architecture — Ummah Section (Plan 095 / Issue #151)**: Completes the three-section catalog architecture by adding item-level publishing for ummah organisations, establishing a consistent `org → item` hierarchy across all sections (FOOD / STORES / UMMAH):
  - **`community_projects` table**: Ummah item-level catalog under `community_services`, with typed fields for all ummah activity types — `project_type TEXT CHECK IN ('event', 'donation', 'class', 'volunteer')`, `ticket_price_cents INTEGER`, `donation_goal_cents INTEGER`, `raised_cents INTEGER DEFAULT 0`, `price_currency TEXT DEFAULT 'EUR'`, `is_active BOOLEAN DEFAULT true`, `start_date / end_date TIMESTAMPTZ`, `max_attendees INTEGER`, `sort_order INTEGER`, and German full-text search via `search_vector TSVECTOR GENERATED ALWAYS AS (...) STORED` with GIN index.
  - **RLS security**: Owner-based row-level security — SELECT is public; INSERT/UPDATE/DELETE require ownership via 2-hop join `community_projects.community_service_id → community_services.provider_id → providers.provider_owner_id = auth.uid()`. 4 policies total.
  - **`categories.applicable_section` column**: Section-scoped category filtering — CHECK constraint enforces `'food' | 'business' | 'ummah' | 'all'`; NULL allowed for legacy unscoped categories. Partial B-tree index for efficient section-filtered queries.
  - **`search_community_projects` RPC**: Full-text search over `community_projects` with filters for `community_service_id`, `project_type`, `active_only`, `limit_count`, `offset_count`. Uses `plainto_tsquery('german', ...)` + `ts_rank` for relevance ranking. `SECURITY INVOKER` preserves RLS context.
  - **`provider_stats` MV extension**: Extended with `community_project_count BIGINT` column (count of active projects) — backward compatible, all 8 existing columns preserved.
  - **ADR-095**: Formal Architecture Decision Record codifying the three-section hierarchy, three-table ordering FK pattern, and CTI base table rejection rationale.

### Technical

- Migration 069 is additive and idempotent — `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS` throughout; safe to re-run
- Backward compatible: `community_services` table structure unchanged; `search_community_services_enhanced` RPC (migration 014) unmodified; all Plan 094 tables and RPCs unaffected
- Ordering-ready schema: typed `ticket_price_cents`/`donation_goal_cents` are typed database columns (not JSONB) — prerequisite for Epic 4.2 ordering without destructive migration
- Pre-QA ownership diagnostic: `DO $$ RAISE NOTICE $$` block logs any `community_services` rows with `provider_id IS NULL` at migration time

## [0.10.21] - 2026-04-19

### Added

- **Provider Catalog Schema Evolution (Plan 094 / Issue #148)**: Introduces per-provider typed catalog tables as the data foundation for food menu and business service offerings:
  - **`provider_menu_items` table (M1)**: Per-provider food catalog with typed ordering-ready fields — `price_cents INTEGER`, `is_available BOOLEAN NOT NULL DEFAULT true`, `allergens TEXT[]`, `is_halal BOOLEAN`, `image_path TEXT` (Supabase Storage), and `sort_order INTEGER`. German-language tsvector full-text search via `search_vector TSVECTOR GENERATED ALWAYS AS (...) STORED` with GIN index.
  - **`provider_service_offers` table (M1)**: Per-provider service catalog with booking-ready fields — `price_cents INTEGER`, `is_available BOOLEAN NOT NULL DEFAULT true`, `duration_minutes INTEGER`, `booking_url TEXT`, and `sort_order INTEGER`. Same STORED tsvector GIN search pattern.
  - **RLS security (M1)**: Owner-based row-level security on both tables — SELECT is public (USING true); INSERT/UPDATE/DELETE require `provider_id IN (SELECT provider_id FROM providers WHERE provider_owner_id = auth.uid())`, matching existing provider ownership model. 8 policies total.
  - **`search_provider_items` RPC (M2)**: Unified full-text search across both catalog tables via `UNION ALL` with `item_type` discriminator (`'menu_item'` | `'service_offer'`). Accepts `search_query`, `listing_type_filter`, `provider_id_filter`, `limit_count`, `offset_count`. Uses `SECURITY INVOKER` to preserve RLS. Fallback ordering by `sort_order, name_de` for empty query.
  - **`provider_stats` MV extension (M3)**: Materialized view extended with `menu_item_count BIGINT` and `service_offer_count BIGINT` columns for dashboard display. Singleton UNIQUE index preserved for `CONCURRENTLY` refresh support.
  - **`offer_tag_id` vocabulary bridge (M1)**: Optional FK to global `offers` vocabulary entry on both tables — links provider-specific items to shared taxonomy without breaking existing vocabulary search.
  - **Updated-at triggers (M1)**: BEFORE UPDATE triggers on both tables reuse existing `update_updated_at_column()` function, consistent with providers (migration 062) and badge tables (migration 016).

### Technical

- Migration 068 is additive and idempotent — uses `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS` throughout; safe to re-run
- Backward compatible: existing `offers` vocabulary table, `search_offers` RPC, and `providers.offers_ids[]` are unchanged
- Ordering-ready schema: `price_cents`, `is_available`, `duration_minutes` are typed database columns (not JSONB) — prerequisite for Epic 4.2 (Simple Booking System)
- Schema foundation for Epic 2.3 (Enhanced Provider Profiles) catalog display
- GIN indexes on `search_vector` columns plus partial indexes (`WHERE is_available = true`) for hot-path menu display performance

## [0.10.20] - 2026-04-19

### Added

- **City Interest: "Notify Me" for Unavailable Cities (Plan 093 / Issue #147)**: Converts empty-city search dead-ends into interest capture opportunities for demand-side users:
  - **i18n (M3)**: Added `notifyMe`, `notifyMeSuccess`, `notifyMeError`, `notifyMeEmailPlaceholder`, `notifyMeCityUnavailable`, `providerCTA` translation keys to all 6 language files (de, en, ar, tr, ur, ps). Updated existing `noCitiesFound` from placeholder-quality to proper messaging.
  - **POST /api/city-interest/subscribe endpoint (M2)**: New API route at `src/app/api/city-interest/subscribe/route.ts` — handles city interest submissions for both authenticated (session-based, no email required) and anonymous users (email in body). Uses `getSupabaseAdmin()` service role client to upsert `waitlist.selected_city` directly (bypasses RLS). Includes rate limiting (20 req/hr per IP via `@/lib/rate-limit`), manual input validation (email format, cityName trim/max 100 chars), and idempotent upsert. 11 unit tests covering auth/anon paths, validation, error handling, idempotency.
  - **EmptyCityCard component (M1)**: New `src/features/search/components/EmptyCityCard.tsx` — renders in `/search` Wo section when city query has no matching providers. Shows warm unavailability message, one-tap "Notify me" button for authenticated users (email from session), or email input + button for anonymous users. Inline success/error feedback (no toast). Subtle secondary provider CTA link to `/recommend`. Accessibility: ARIA labels, `role="status"` + `aria-live="polite"` for success, `role="alert"` + `aria-live="assertive"` for errors. RTL support via `dir="auto"`. 14 component tests covering auth/anon flows, success/error states, accessibility, provider CTA.
  - **Search page integration (M1)**: Updated `src/app/(public)/search/page.tsx` to fetch user session (via `supabase.auth.getUser()`), pass `userEmail` to `EmptyCityCard`, and replace plain "noCitiesFound" text with `EmptyCityCard` component when city search returns no results.

## [0.10.19] - 2026-04-19

### Added

- **Home Screen Redesign — Merged Home + Search Page (Plan 090 / Issue #144)**: Redesigns the mobile home screen (Stage 3) to merge the Home and Search pages into a single discovery-first view:
  - **i18n (M1)**: Added `home.searchPlaceholder`, `home.searchAriaLabel`, `sections.food`, `sections.ummah`, `sections.stores` keys to all 6 translation files (de, en, ar, tr, ur, ps). `sections.stores` globally renames "Business" to "Stores" across the app.
  - **HomeSearchBar component (M2)**: New `src/features/search/components/HomeSearchBar.tsx` — tap-to-navigate affordance (`div[role="search"]`, not `<input>`) navigating to `/providers?section={activeSection}`. Avoids iOS PWA keyboard on home load.
  - **Section-filtered category galleries (M3)**: `fetchCategoriesBySection(section)` in `src/services/categories.ts` queries categories via `providers.listing_type` (food/business) or `community_services` (ummah). `CategoryGallerySection` accepts optional `section` prop; when provided uses `fetchCategoriesBySection` with React Query key `['categories-by-section', section]`; category clicks preserve `?section=` in navigation URL.
  - **Home page assembly (M4)**: Stage 3 block in `RootPageContent` replaced — removes `MobileGreetingHeader`, adds glassmorphism fixed header with `HomeSearchBar` + `SectionSelector` and active section state (`useState<Section>('food')`). Scrollable body renders `CategoryGallerySection` with `section={activeSection}`.
  - **SectionSelector i18n (M1)**: `SectionSelector.tsx` now uses `useLanguage()` hook for tab labels replacing hardcoded strings.
- **Home Redesign Increment 2 — SectionSelector Visual Polish + /suchen Stub (Plan 091 / Issue #145)**: Continues home redesign with Figma-aligned visual polish and dedicated search entry point:
  - **SectionSelector visual restyle (M1)**: Restyled `SectionSelector` component to match Figma teal-pill design — white rounded container (`bg-background`, `h-14`, `rounded-2xl`), teal active tab (`bg-primary`, `h-10`, `rounded-xl`), grey inactive tabs (`text-neutral-500`), Inter Tight Medium 16px (`font-inter-tight font-medium text-base`).
  - **/suchen search page stub (M2)**: New `src/app/(public)/suchen/page.tsx` — dedicated search entry point with back header ("← Suchen"), `SectionSelector`, 4 accordion sections (Was?/Wo:/Wer:/Filter; Was? open by default), and fixed bottom bar ("Clear all" + "♡ Suchen" button). Search execution deferred to future plan — accordions and buttons are styled stubs. Uses `<Suspense>` boundary for `useSearchParams()` per Next.js App Router requirement. Back button navigates to `/` when no history (direct URL access fallback).
  - **HomeSearchBar URL update (M3)**: `HomeSearchBar` now navigates to `/suchen?section={activeSection}` instead of `/providers?section=...` (supersedes Plan 090 SC5). CategoryGallerySection category clicks still navigate to `/providers` (unchanged).
  - **i18n (M2)**: Added `suchen.title`, `suchen.accordions.{was,wo,wer,filter}`, `suchen.clearAll`, `suchen.searchButton` keys to all 6 translation files (de, en, ar, tr, ur, ps).

- **Search Page Accordion Consistency — ExpandSection Component (Plan 092 / Issue #146)**: Pre-QA UI consistency fix for `/search` page accordions to match provider detail expand pattern:
  - **ExpandSection component (M1)**: New `src/components/ui/ExpandSection.tsx` — reusable expand/collapse card component extracted from the provider detail page expand pattern. Uses single rotating `ChevronDown` icon (no Up/Down swap), borderless `rounded-2xl bg-background shadow-sm` card, `font-inter-tight text-lg font-semibold text-content-heading` title. Accepts `title`, `defaultOpen`, and `children` props. Manages internal open/close state.
  - **Search page update (M2)**: Updated `/search` page to use `ExpandSection` for all 4 accordion rows (Was?, Wo, Wer, Filter). Removed bespoke `open` state object, `toggle` function, `renderLabel` helper, and `rows` array. Was? accordion uses `defaultOpen` prop to remain open by default.
  - **Unit tests (M3)**: Added `src/__tests__/components/ui/ExpandSection.test.tsx` with 5 tests covering render, default state, `defaultOpen` prop, toggle behavior, and icon rotation.

## [0.10.18] - 2026-04-11

### Added

- **Three-Section Search & Listing Redesign — FOOD / UMMAH / BUSINESS (Plan 089 / Issue #137)**: Splits the unified provider listing into three purpose-built discovery sections:
  - **Database (M1)**: New `listing_type_enum` ('food'|'business') on `providers` table; `halal_level SMALLINT`, `muslim_owned BOOLEAN`, and 10 filter-boolean columns (`no_alcohol`, `no_pork`, `no_gambling`, `has_prayer_space`, `family_friendly`, `women_friendly`, `children_friendly`, `accepts_donations`, `has_parking`, `solidarity_pricing`). Migration `067_three_section_search_schema.sql` backfills all existing providers by category, backfills `muslim_owned` from MUSLIM_OWNED badge data, backfills booleans from `barakah_effects` strings, and creates composite performance indexes.
  - **Search Routing (M2)**: `searchProvidersAndCommunityServices()` accepts a `section` parameter; FOOD/BUSINESS routes to `providers` with `listing_type` filter, UMMAH routes to `community_services` table only. Default section is FOOD (D9). `searchProviders()` accepts `listingType` parameter. API route `/api/providers/search` forwards `?section=`.
  - **Section Configuration (M3)**: `src/config/sectionFilters.ts` — `SECTION_FILTER_CONFIG`, `getDefaultFilters()`, `getAllowedFilters()`, `inferSectionFromCategory()` for category→section inference.
  - **Section Selector UI (M6)**: `SectionSelector` component (tab bar: FOOD 🍽️ / UMMAH 🕌 / BUSINESS 🏪) integrated into `ProvidersPageHeader`. `SearchProvider` context extended with `selectedSection`/`setSelectedSection`.
  - **Computed Badge Logic (M5)**: `src/utils/sectionBadges.ts` — `computeHalalStars()` (0–3 stars from `halal_level`) and `computeBarakahBadge()` (muslim_owned + ≥2 community attributes). Halal stars and Barakah badge rendered on `ProviderCard`.
  - **JoinHalal Pipeline (M4)**: Import pipeline sets `listing_type='food'`, `no_alcohol=true`, `halal_level=1` for all JoinHalal records. `SOURCE_CONTROLLED_FIELDS` updated. Upsert RPC in migration updated.
  - **Backward Compatibility (M8)**: Legacy `/providers?category=UUID` URLs without `?section=` infer section from category via `inferSectionFromCategory()`. Admin edit UI surfaces `listing_type` display field alongside category.
  - **Verification SQL (M7)**: `sql/089_section_classification_verification.sql` with 6 verification queries for post-migration audit.

## [0.10.17] - 2026-04-07

### Fixed

- **Modal accessibility refactor — 9 identified gaps closed (Plan 086)**: Refactored `src/components/ui/Modal.tsx` and added four new reusable hooks in `src/hooks/` to meet WCAG 2.1 AA dialog requirements:
  - **Focus trap** (`useFocusTrap`): Tab key is now contained inside the modal. Shift+Tab at the first focusable element wraps to the last, and Tab at the last wraps to the first.
  - **Focus restoration** (`useFocusTrap`): When the modal closes, keyboard focus returns to the element that had focus before the modal opened.
  - **Background `aria-hidden`** (`useAriaHidden`): All content outside the modal portal is marked `aria-hidden="true"` while the modal is open, preventing screen readers from reaching background content.
  - **Escape key scoping**: The Escape handler moved from `keydown` (which fires on auto-repeat) to `keyup`, is now scoped via a `contains()` guard to only fire when focus is inside the modal, and calls `stopPropagation()` to prevent stacked modals from both closing simultaneously.
  - **Drag-close prevention**: Dragging from inside the modal content to the backdrop no longer triggers `onClose`. Close via backdrop only fires when both `mousedown` and `click` originate on the backdrop element.
  - **Stack-safe scroll lock** (`useScrollLock`): Replaced the naive `overflow: hidden` toggle with a module-level counter. Opening two modals simultaneously and closing one no longer restores scroll while the other is still open. The original `overflow` value is captured and restored (not hardcoded to empty string).
  - **`aria-labelledby` wiring**: The `role="dialog"` element's `aria-labelledby` now points to a real element (a `sr-only` span rendered inside the modal, keyed by a `React.useId()` ID). Previously `aria-labelledby="modal-title"` was set but no element had that ID.
  - **Exit animation** (`useDelayedUnmount`): The modal now remains in the DOM for 300ms after `isOpen` becomes `false` to allow CSS fade-out transitions. Respects `prefers-reduced-motion` (immediate unmount). Cancels the timer if the modal re-opens before the delay expires.
  - **Z-index fix**: Backdrop uses `z-0` and content uses `z-10` within the wrapper's stacking context, eliminating the z-index collision where both layers shared `z-[999999]`.

## [0.10.16] - 2026-04-07

### Fixed

- **Community service detail page 404 for non-approved services (Plan 085)**: Admins and owners can now view community service detail pages regardless of `review_status`. Previously, when server-side auth context was anon (server-side Supabase client doesn't propagate user session), non-approved CS would trigger `notFound()` before the client could retry with the browser's actual session. Fixed by restoring the resilient fetch pattern from Plan 082: server page passes nullable `initialData` and `communityServiceId` to client → client uses `useCommunityService()` React Query hook → client-side Supabase has the user's session → RLS admin/owner clauses succeed. Matches the existing provider detail page architecture (Plan 081). No Supabase/RLS changes needed.

## [0.10.15] - 2026-04-06

### Fixed

- **Profile page provider cards navigate to correct detail page (Plan 085 / Issue #125)**: Clicking a provider card in the "Deine Inhalte" or "Recommendations" sections of the profile page now navigates to the public detail page `/providers/:id` instead of the owner-scoped `/profile/providers/:id` (which returned a 404 or triggered a middleware redirect in early-access mode). Recommendations cards previously navigated directly to `/profile/providers/:id/edit` (the edit page) on click — these now correctly navigate to the public detail page as well. The desktop "Deine Inhalte" (created) tab provider cards, which had no click handler at all, now navigate to `/providers/:id` for parity with the mobile layout. All edit-flow internal navigation links (ProviderEditPage, ProviderEditForm, ProfileProviderDetailButtons, ProfileProviderDetailPage) are unchanged. Community service links in the same sections already routed correctly and are unaffected.

## [0.10.14] - 2026-04-06

### Added

- **Community services admin edit UI — full ProviderEditForm adapter (Plan 083)**: Augments the stub CS edit surface shipped in v0.10.11 with a complete adapter-based implementation. Admins and moderators can now edit community services using the identical form used for providers (4-section accordion: Basics, Standort, Kontakt, Media; Approve/Reject footer). Key additions:
  - `PATCH /api/admin/edit-community-service` — update CS fields with rate-limiting, size guard, Zod validation, audit log, concurrency conflict (409)
  - `PATCH /api/admin/review-community-service` — approve/reject with mandatory rejection feedback
  - `src/services/admin/communityServiceEdit.ts` — service layer with `getCommunityServiceForAdmin`, `updateCommunityServiceFields`, `updateCommunityServiceReview`
  - `communityServiceEditUpdateSchema` and `communityServiceReviewUpdateSchema` enhanced in `adminSchemas.ts` (images array, expectedUpdatedAt for concurrency)
  - `src/app/(dashboard)/dashboard/community-services/[id]/edit/page.tsx` — CS↔Provider adapter page using `ProviderEditForm`
  - Category, offers, needs, images sub-pages (each adapted to query `community_services` table + `admin_cs_edit_*` localStorage keys)
  - Image format conversion: CS native `TEXT[]` ↔ ProviderEditForm `{urls:[...]}` JSON string
  - `hideSocialInitiatives` prop on `ProviderEditForm` (default `false`, backward-compatible)

## [0.10.13] - 2026-04-06

### Added

- **GitHub Issues integration for workflow pipeline (Plan 084)**: The Planner agent now creates a GitHub Issue in `abu-lina/uflow` when finalising a plan, using `gh issue create --body-file` with structured content (value statement, milestones, artifact path). Labels mirror the Orchestrator task classification (`type:feature`, `type:bugfix`, `type:refactor`, `type:hotfix`, `type:verification`, `type:security`) plus a `plan` meta-label. DevOps Stage 2 automatically closes the issue on release with a versioned comment. Five GitHub Issue form templates added to `.github/ISSUE_TEMPLATE/` (feature, bugfix, refactor, hotfix, security) for manual issue creation with consistent structure and auto-applied labels.

## [0.10.12] - 2026-04-06

### Fixed

- **Saved page search bar visibility on empty-results state (Plan 082 / Issue #82)**: The search bar now remains visible and interactive on `/saved` when a search term matches no saved providers. Previously the conditional rendering in `SavedProvidersPage` omitted the `SearchBar` component from the `no_results` branch, leaving users in a dead-end state unable to modify or clear their search without navigating away. Resolved by lifting `SearchBar` outside the branching conditional chain and rendering it once using a new `shouldShowSearchBar` state predicate. The `no_saved_items` and `queryError` branches continue to suppress the search bar (no searchable items in those states). Layout centering is now isolated to the empty-state message below the search bar via `shouldCenterWholePageContent`.

## [0.10.11] - 2026-04-06

### Fixed

- **Profile provider pages: server Supabase client for RLS (Plan 082 M8)**: Profile provider detail (`/profile/providers/[id]`) and edit (`/profile/providers/[id]/edit`) pages were silently using the anonymous Supabase client in Server Components, causing RLS failures for non-approved providers. Both pages now import `getProviderById` from `@/services/providers.server` (cookie-based auth context), matching the fix applied to the public provider and community-service pages in Plan 081.

### Added

### Added

- **Admin community service edit page (Plan 083)**: Full admin CRUD surface for community services. Admins and moderators can now view (bypassing RLS), edit fields, and review (approve/reject/request revision) any community service from `/dashboard/community-services/[id]/edit`. New API routes: `GET /api/admin/community-services/[id]` and `PATCH /api/admin/edit-community-service` and `PATCH /api/admin/review-community-service`. New admin service layer at `src/services/admin/communityServices.ts` with sanitized partial-update and review functions. Zod validation schemas added to `src/lib/validations/adminSchemas.ts`. Resolves `AdminCommunityServiceDetailButtons` OA-1 (edit button now routes to a working page).

## [0.10.10] - 2026-04-05

### Fixed

- **Community service detail page: full architectural + design system parity (Plan 082)**: Achieved full UX parity between community service and provider detail pages. Removed the hard `notFound()` call in the Server Component that caused a permanent "Service nicht gefunden" wall for non-approved or auth-context-sensitive services; the component now passes nullable `initialData` to the client. Added `useCommunityService(id)` React Query hook (mirrors `useProvider()`) with 5-min stale time, SSR hydration, and graceful loading/error states. Rewrote `CommunityServiceDetailPageClient` to use the hook with loading skeleton and client-side not-found only after React Query confirms. Desktop now renders through `ProviderDetailModal` (eliminating the separate 714-line `CommunityServiceDetailModal`), giving community services full design system compliance: image carousel, analytics tracking, Skeleton states, and badges. Fixed `ProviderDetailModal` to dynamically use `bookmarkableType: 'community_service'` and the correct share URL when `provider.community_service_id` is set. Improved the community-service-to-provider data transform: description, badges, all social/contact fields, and correct image encoding. `CommunityServiceDetailModal` deprecated (not deleted) pending import-site audit.

## [0.10.9] - 2026-04-05

### Fixed

- **Community service owner detail crash in Server Components (Plan 081)**: Fixed owner navigation from Profile -> Deine Inhalte to `/community-services/[community_service_id]` by switching the route to server-side data services (`communityServices.server`) so auth context is preserved under RLS for non-approved services. Also hardened `/providers/[provider_id]` Server Component imports to server modules and aligned `providers.server.getProviderById` with client parity by resolving offers/needs names for SSR `initialData`, preventing missing-label regressions during React Query stale windows.

## [0.10.8] - 2026-04-04

### Fixed

- **Admin provider URL validation block (Plan 079)**: Normalized schemeless website inputs (for example `www.example.com` -> `https://www.example.com`) in provider edit and create flows so HTML5 URL validation no longer blocks moderation approve/reject or final save actions.

## [0.10.7] - 2026-04-04

### Fixed

- **iOS admin/provider toast safe-area overlap (Plan 078)**: Updated global Sonner toaster configuration to include safe-area-aware top offsets so approve/reject confirmations no longer render behind the iPhone status bar when `viewport-fit=cover` is active.

## [0.10.6] - 2026-04-04

### Fixed

- **Mobile header overlap on providers page (Plan 077)**: Replaced static `pt-32` (128px) top padding with safe-area-aware `max(128px, calc(env(safe-area-inset-top) + 128px))` on the `/providers` content container. On iOS devices with a notch or Dynamic Island (`safe-area-inset-top ≈ 59px`), the fixed `ProvidersPageHeader` was ~173px tall but content only offset by 128px, hiding the first provider card and admin filter tabs behind the glassmorphic header. Non-notch devices retain identical 128px padding.

## [0.10.5] - 2026-04-03

### Fixed

- **Provider detail iOS footer CTA overlay — structural overscroll fix v2 (Plan 076)**: Replaced `overscroll-contain` with `overscroll-none` on mobile provider detail and provider card modal scroll containers to suppress all rubber-band bounce (CSS spec: `contain` still allows local bounce). Replaced nested `h-screen-fix` (explicit viewport-height claim) with `flex-1 min-h-0` in the mobile branch to eliminate the height duplication anti-pattern identified in Analysis 020. Added `overscroll-none` to root `<main>` as a safety net. Extracted the fixed CTA footer outside the `overflow-y-auto` scroll container as a DOM sibling (fragment-wrapper pattern) to eliminate iOS Safari compositor coupling in both `ProviderDetailPage` and `ProviderCardModal`.

## [0.10.4] - 2026-04-03

### Fixed

- **Desktop provider detail: Barakah Effect section hidden when no community service linked (Plan 076, Bug A)**: The "Unser Barakah Effekt" section in `ProviderDetailModal` now only renders when the provider has at least one linked community service. Previously it always rendered a placeholder card with empty content.
- **Desktop provider detail: "Service bearbeiten" button repositioned (Plan 076, Bug B)**: The admin edit button is now anchored in the top-right area of the modal's right panel (near the close button) instead of floating at the bottom-center. This gives the action clear visual context.
- **Desktop provider detail: Instagram social button added (Plan 076, Bug C)**: The desktop modal actions bar now includes a conditional Instagram button when `social_instagram` is set, matching the mobile path's behavior. Follows the same expand-on-click pill pattern as Phone/Website buttons.

## [0.10.3] - 2026-04-03

### Fixed

- **Provider detail iOS footer CTA overlay during bottom overscroll (Plan 075)**: Added `overscroll-contain` to the mobile provider detail scroll container to stop iOS scroll chaining/rubber-band propagation into viewport layers. Updated mobile fixed action bars to use fully opaque `bg-white` (removed translucent footer on detail page and modal footer) so CTA controls remain visually stable and unobscured during upward drag gestures.

## [0.10.2] - 2026-04-03

### Security

- Remediated lodash code injection (GHSA-r5fr-rjxr-66jc) and prototype pollution (GHSA-f23m-r3pf-42rh) via override to lodash >=4.18.0
- Remediated tar path traversal, picomatch ReDoS, and brace-expansion DoS vulnerabilities in uflow-memory-extension via npm audit fix
- Deferred esbuild/vite dev-server CORS vulnerabilities in memory-backend (dev-only tool, requires semver-major vitest upgrade)

## [0.10.1] - 2026-04-03

### Fixed

- **Admin provider moderation contract drift (Plan 073)**: Fixed HTTP 400 validation errors when admin moderators attempt to approve or reject providers with no images. The shared `ProviderEditForm` defaults missing images to the JSON array string `'[]'`, but `providerEditUpdateSchema` only accepts `null` or `'{"urls": string[]}'`. Added client-side normalisation in `saveProviderEdits()` to omit the `providerImages` field entirely when empty/invalid (triggering "no change" semantics in the service layer), send valid `{urls: [...]}` as-is, and wrap legacy bare arrays. Includes regression tests documenting the pre-fix failure and post-fix acceptance paths.

## [0.10.0] - 2026-03-29

### Added

- **Automated provider enrichment pipeline (Plan 065, M1–M3)**: Introduces an ownerless-provider enrichment workflow with three layers:
  - **M1 — Schema**: `enrichment_candidates` staging table with `pending/approved/rejected/applied` status, `enrichment_run_logs` telemetry, and `enrichment_eligible` / `last_enriched_at` columns on `providers`. GIN/BTREE indexes and RLS admin-only policies included.
  - **M2 — CLI runner + JoinHalal enricher core**: `scripts/enrich-providers.ts` with `--dry-run` (default), `--write`, `--source`, and `--limit` flags. Enrichment is restricted to approved providers where `provider_owner_id IS NULL`. Circuit breaker halts the run at 20% failure. Side-effect-free enricher core (`joinhalal-enricher.ts`) detects conflicts, deduplicates candidates, and preserves admin-controlled fields.
  - **M3 — Admin review surface**: `EnrichmentReviewPanel` client component with per-candidate approve/reject and bulk-approve-by-provider. Backed by `/api/admin/enrichment/candidates` (GET/POST) with admin auth, pagination, rate limiting, and ownership fail-closed guard at the service layer.

## [0.9.10] - 2026-03-29

### Fixed

- **Iconify service-worker interception hotfix**: Removed the explicit `NetworkOnly` Workbox route for `api.iconify.design`, `api.unisvg.com`, and `api.simplesvg.com`. The prior hotfix still caused the service worker to intercept Iconify JSON fetches and re-issue them from the SW context, which Firefox ETP and some content blockers can block at network level. With no explicit route, Workbox leaves Iconify requests alone and the browser handles them natively.

## [0.9.9] - 2026-03-29

### Fixed

- **Service worker push handler cache fix (Plan 064)**: Added `location = /sw-push-handler.js` exact-match nginx blocks with `no-cache` headers in both production and UAT configs. Previously the file fell through to the generic JS rule with a 1-year immutable cache, silently preventing push handler updates after deployments.
- **CSP frame-src hygiene (Plan 064)**: Removed Iconify API domains (`api.iconify.design`, `api.unisvg.com`, `api.simplesvg.com`) from `frame-src` CSP directive — they serve JSON data via `fetch()`, not iframe content. Origins remain in `connect-src` where they belong.

## [0.9.8] - 2026-03-28

### Fixed

- **Full onboarding mobile centering bundle (Plans 067 + 060)**: Restored consistent vertical centering across all 7 `MobileSplashScreen` AnimatePresence branches. Plan 067 corrects the `loading` and `splash` motion wrappers to use a column flex layout, and Plan 060 extends the same `flex w-full flex-1 flex-col` wrapper participation to `about`, `waitlist`, `success`, `earlyAccess`, and `aboutFromEarlyAccess`. Together the bundle closes the user-reported top-alignment regression on the onboarding flow without changing flow logic or content.

## [0.9.7] - 2026-03-28

### Security

- Reject non-image file types at the admin image upload endpoint using a safe extension allowlist (`jpg`, `jpeg`, `png`, `webp`, `gif`) and explicit SVG rejection.
- Add admin upload route rate limiting to reduce storage abuse and request flooding risk.
- Sanitize internal error details in admin needs and offers routes so production responses no longer leak SQL or database internals.
- Add a server-side dashboard auth guard so unauthenticated users redirect to `/login` and non-admin users redirect to `/providers` before any admin UI renders.
- Enforce UUID validation on `offersIds`, `needsIds`, and `communityServiceIds` in the admin schema.
- Validate `providerImages` as JSON with shape `{ urls: string[] }` and sanitize the persisted payload at the service layer.

### Dependencies

- Patch `picomatch`, `brace-expansion`, `yaml`, and `serialize-javascript` via package overrides. `npm audit --audit-level=high` now reports 0 vulnerabilities.

## [0.9.6] - 2026-03-26

### Fixed

- **Mobile auth entry restored for fresh and logged-out users (Plan 063)**: Fresh users (no localStorage / incognito / new device) on `/` now always see `CityEarlyAccessNavbar` with a Profile icon. Previously, `shouldShowCityEarlyAccessNavbar` gated `/` behind `hasCompletedOnboarding()`, which is always `false` for fresh users, leaving them with no mobile auth entry point.
- **Authentication routes unblocked in early-access mode (Plan 063)**: `/login`, `/signup`, `/forgot-password`, and `/reset-password` were listed as app routes in the middleware and redirected to `/providers` when `isAppLaunched=false`. Auth routes are now always public regardless of waitlist/launch status.
- **Navbar hidden during onboarding splash screens (Plan 063)**: The `CityEarlyAccessNavbar` now respects `isSplashVisible`, matching the long-standing `shouldShowMobileFooter` behaviour. The navbar no longer appears during first-visit splash/onboarding screens.

### Fixed

- **iOS touch events blocked by parent wrapper pointer-events (Plan 062 post-release hotfix)**: Fixed critical iOS WebKit issue where mobile navigation wrapper divs blocked touch events despite child elements having `pointer-events: auto`. Added explicit `pointer-events: auto;` restoration to both `.mobile-footer-bar-wrapper` and `.city-navbar-wrapper` active visibility rules in `globals.css`. Discovered during post-release D1 validation on real iOS device; desktop Chrome DevTools mobile emulation did not surface this WebKit-specific behavior.

## [0.9.2] - 2026-03-25

### Fixed

- **Profile icon restored in early-access mobile bottom navigation (Plan 060)**: `CityEarlyAccessNavbar` now includes a Profile entry so Stage 1 and Stage 2 mobile users no longer lose account access. Unauthenticated users are routed to `/login`; authenticated users are routed to `/profile`, matching the established `MobileFooterBar` contract.
- **Profile active-state feedback now covers auth entry paths (Plan 060)**: The early-access Profile icon highlights on `/profile`, `/login`, and `/signup`, giving consistent feedback after tapping the account entry.

### Changed

- **Early-access mobile navigation contract now includes account-entry parity (Plan 060)**: Stage 1 and Stage 2 bottom-nav variants now expose the same core account-access affordance as the full-access footer without changing `isAppLaunched` semantics.

## [0.9.0] - 2026-03-25

### Added

- **Admin provider editing from moderation detail flow (Plan 061)**: Admin and moderator users can now edit provider details directly from the provider detail view during moderation. An edit button appears on both mobile and desktop provider detail views for admin users only. The edit page reuses the existing owner provider edit form with admin-specific persistence (server-side authorization, audit logging, service-role writes). Includes provider description field in the shared edit form, cache invalidation after save, and complete separation from owner localStorage state. Community service detail views are unaffected.
- **Approve and reject providers from the admin edit form (Plan 061)**: Admin moderators can approve or reject providers directly from the edit page via a moderation footer that replaces the generic Save button. Rejecting a provider requires mandatory feedback via a RejectModal. Approving is a one-click action. Both actions chain save-then-review to preserve edits before the review decision.
- **Admin taxonomy creation via server routes (Plan 061)**: Admin offer and need creation now goes through dedicated server routes (`/api/admin/offers`, `/api/admin/needs`) that bypass RLS, enforce auth, rate-limit, sanitize input, and reject duplicates.
- **Admin image upload via service-role route (Plan 061)**: Admin image uploads bypass storage RLS via `POST /api/admin/upload-image` using the service-role client.
- **Dashboard edit sub-pages (Plan 061)**: Category, images, and social sub-pages added under the `(dashboard)` route group for admin provider editing.

## [0.8.28] - 2026-03-25

### Added

- **Admin provider review route restored on current main (Plan 059)**: Reintroduces `PATCH /api/admin/review-provider` on top of current `origin/main`, including admin/moderator authorization, request size guard, optimistic concurrency handling, and admin review rate limiting (`5/min`, `20/hour`).

### Changed

- **Rejecting a provider now requires a non-empty reason again (Plan 059)**: `RejectModal` now disables confirmation until a trimmed rejection reason is present, shows the field as required, and passes trimmed text through the `/providers` moderation flow while leaving approval as a one-click action.

### Fixed

- **Current-main `/providers` moderation no longer 404s on reject/approve (Plan 059)**: Restored the missing validation/service/audit modules removed in `v0.8.24`, so `useProviderReview` once again targets a live backend contract instead of the deleted route.
- **Server-side validation now blocks bypass attempts for comment-free rejections (Plan 059)**: `providerReviewUpdateSchema` enforces that `reviewStatus: 'rejected'` includes a non-empty trimmed `reviewFeedback`, preserving accountability even if the client UI is bypassed.

## [0.8.27] - 2026-03-24

### Added

- **JoinHalal legacy provenance recovery (Plan 058)**: Added deterministic legacy provenance recovery for JoinHalal-imported provider rows that were created before authoritative listing URLs were persisted. The import pipeline now supports `--recover-provenance` to match legacy rows back to current JoinHalal detail pages, persist `import_source_url`, and report matched / ambiguous / unmatched outcomes without modifying reviewed rows.
- **Stale-clone audit CLI for Plan 058**: Added `--audit-stale-clone` to classify the 864-row stale-clone batch into exact duplicates, partial overlaps, and unique rows, with an operator-facing remediation recommendation before any provenance write run.

### Changed

- **Migration 065 / JoinHalal RPC provenance persistence**: Added `import_source_url` to the `providers` table and updated `upsert_joinhalal_providers` so authoritative JoinHalal listing URLs are persisted on both insert and upsert paths.

### Fixed

- **Legacy JoinHalal alcohol backfill now uses recovered provenance**: The alcohol backfill now prefers `import_source_url` over `social_website`, allowing legacy rows to be evaluated against the authoritative JoinHalal page instead of merchant websites after provenance recovery is run.

### Security

- **Pin all GitHub Actions workflow references to immutable commit SHAs (Plan 056)**: Replaces 42 mutable action tag/branch references (`@v*`, `@master`) across 7 workflow files with immutable 40-character commit SHAs. Eliminates the tag-rewrite supply chain attack vector triggered by the Checkmarx KICS compromise (2026-03-23). Adds `.github/dependabot.yml` for automated GitHub Actions version tracking (weekly, `ci` label). Critical change: `snyk/actions/node@master` (live branch reference) pinned to commit SHA. All production and UAT deploy-path action SHAs verified aligned.

## [0.8.26] - 2026-03-24

### Fixed

- **Dependabot GitHub Actions CI baseline restored (Plan 059)**: Aligned the app-level ESLint project boundary with `tsconfig.json` by excluding `tools/**`, eliminating 8 TypeScript parser errors that blocked every Dependabot PR in `Lint & Type Check`.
- **Share cancel handler no longer fails lint (Plan 059)**: Removed the unused `error` binding from the `navigator.share()` cancel path in `ProfileProviderDetailButtons.tsx`, clearing the remaining source-level unused-variable blocker in the session branch.
- **Flaky CLI timeout hardened for CI latency (Plan 059)**: Added a 15-second per-test timeout to the `import-muslimbusiness` invalid `--limit` regression test so GitHub-hosted runner variance no longer causes false-negative failures.

### Changed

- **Workflow compatibility verified without YAML churn (Plan 059)**: Audited all 9 affected GitHub Actions workflows and confirmed the Dependabot action-major bumps are compatible as-is; failures were caused by repository lint/test baselines, not workflow bootstrap.

## [0.8.25] - 2026-03-24

### Fixed

- **Clothing & Fashion category gallery no longer returns `/_next/image` HTTP 400 (Plan 055)**: The `category_images` JSONB for the Clothing & Fashion category referenced a Supabase Storage object (`a65-design-2NLeXS3NR5E-unsplash.jpg`) that did not exist in the `category-images` bucket. Fixed by updating `category_images` to the confirmed live replacement asset `clothing.jpg` via migration 061. Applied via `supabase/migrations/061_fix_clothing_category_image_reference.sql` — must be run manually against the target database before the visual fix is active in production.

- **`UnifiedGallery` now falls back to local placeholder on broken remote image (Plan 055)**: Any `<Image>` tile whose remote URL fails to load (network error, missing storage object, expired URL) now swaps to `/images/placeholder.jpg` via an `onError` handler instead of displaying a broken image icon. Protects against future stale `category_images` references across all home page gallery rows.

## [0.8.24] - 2026-03-24

### Removed

- **Removed legacy in-app admin provider review panel (Plan 054)**: The admin dashboard (`/dashboard`, `/dashboard/providers`) and all its supporting code have been removed — 13 files deleted, net -1767 lines. Removed: route group `src/app/(dashboard)/`, review components (`AdminProvidersPageContent`, `ProviderReviewCard`, `ProviderCardSkeleton`, `StatusFilter`), admin review API endpoints (`/api/admin/pending-providers`, `/api/admin/review-provider`), admin provider service (`src/services/admin/providers.ts`), Zod validation schemas (`adminSchemas.ts`), audit logging (`adminAudit.ts`), and k6 performance tests. All cross-cutting references cleaned: email sign-up redirect (`/dashboard` → `/`), PWA manifest dashboard shortcuts (all 4 locales: de/en/ar/tr), middleware dead auth-gate block, and auth-debug dashboard link. Rate-limit config entries for the deleted endpoints removed. Provider moderation continues via Supabase Studio / direct DB operations; the `review_status = 'pending'` creation gate and `review_status = 'approved'` public visibility filter are preserved.

## [0.8.23] - 2026-03-24

### Fixed

- **JoinHalal visible badge fallback and safe alcohol backfill (Plan 057)**: The JoinHalal importer now falls back to the visible `Halal Merkmale` badge list when Schema.org `additionalProperty` is absent, null, or non-decisive, so providers with a visible `Alkoholverkauf` badge are imported as `review_status = 'rejected'` and providers with `Kein Alkoholverkauf` remain on the non-rejected path. The parser accepts both `Halal Merkmale` and `Halal-Merkmale` variants, and both the shared dry-run/admin path (`src/lib/import/joinhalal.ts`) and CLI write path (`scripts/import-joinhalal.ts`) use the same detector. Added a new `--backfill-alcohol` CLI mode for one-time remediation of already-imported JoinHalal providers with dry-run-first output, `pending`-only safety guards, and direct service-role updates that do not overwrite human-reviewed rows.

## [0.8.22] - 2026-03-24

### Fixed

- **Provider cards now maintain stable grid layout after repeated infinite scroll (Plan 053)**: Cards on the `/providers` page were rendering incorrectly after scrolling down 3–4 times — layout collapsed to a single column, cards overlapped, and pagination triggered cascading page fetches. Root cause: `SearchResultsList.tsx` switched from a responsive CSS grid to a `react-window` `FixedSizeList` when accumulated results crossed `VIRTUALIZATION_THRESHOLD=50` (after ~4 pages of `PAGE_SIZE=12`). The virtual path was broken in three ways: (1) single-column layout instead of the responsive 1–4 column grid, (2) `ESTIMATED_CARD_HEIGHT=320px` underestimated actual card height of 390–470px causing overlap, and (3) the IntersectionObserver pagination sentinel was placed outside the virtual scroll container and fired immediately on entry. Fixed by removing the entire `react-window` `FixedSizeList` branch; the responsive CSS grid is now the sole rendering contract for all result counts. Infinite scroll continues to work correctly at any scroll depth on desktop and mobile.

## [0.8.21] - 2026-03-23

### Added

- **Admin provider review integrated into /providers discovery page (Plan 058)**: Admin and moderator users can now review providers directly from the main `/providers` discovery page instead of navigating to a separate admin panel. Added status filter tabs (All/Approved/Pending/Rejected/Needs Revision) visible only to admin users. ProviderCard now supports a `mode` prop that switches between bookmark mode (default Save/Saved button) and moderation mode (Approve/Reject buttons). Review status badges are displayed on cards in moderation mode. The RejectModal component allows optional feedback when rejecting providers. Cache invalidation and optimistic updates ensure the list reflects changes immediately. The legacy `/dashboard/providers` admin panel remains available for parallel use.

### Fixed

- **Admin provider search uses service-role client to bypass RLS**: Admin-filtered provider queries now use the Supabase service-role client instead of the anon client, which was restricted by RLS to approved-only providers. This fixes status filters returning empty results.
- **Community services excluded from admin status-filtered results**: When filtering by review status, community service cards no longer appear in results — prevents moderation buttons from sending community service IDs to the providers review endpoint.
- **updateProviderReview no longer uses PostgREST .single()**: Replaced with array-based select to avoid "Cannot coerce the result to a single JSON object" errors when 0 rows match.

## [0.8.20] - 2026-03-23

### Fixed

- **MuslimBusiness importer now handles client-rendered directory pages**: When the muslimbusiness.de directory no longer server-renders provider cards, the importer falls back to discovering the site’s public Supabase REST configuration and reconstructing the provider card dataset via table joins. This restores non-zero extraction results for CI/GitHub Actions runs.

## [0.8.19] - 2026-03-23

### Added

## [0.8.18] - 2026-03-23

### Fixed

- **JoinHalal importer auto-rejects alcohol sellers (Plan 051)**: Providers whose Schema.org `additionalProperty` contains `Halal Merkmale` with the token `Alkoholverkauf` are now imported with `review_status = 'rejected'` (instead of `pending`). This rule is applied consistently in both the shared dry-run/admin preview path (`src/lib/import/joinhalal.ts`) and the CLI write path (`scripts/import-joinhalal.ts`). Operator reports now include an `Auto-rejected (alcohol)` count.

## [0.8.17] - 2026-03-23

### Added

- **Admin provider review panel — profile menu access, conflict-safe updates (Plan 050)**: Added "Admin Panel" navigation entry to the home profile dropdown (desktop) and mobile profile screen for admin/moderator roles. Fixed the pending-provider list API response shape (`providers` field, previously `data`) so the admin review page correctly renders reviewable items. Added `updated_at` to the pending-provider list contract to support optimistic concurrency. Extended the review mutation with an optional `expectedUpdatedAt` parameter that issues a 409 Conflict response when another admin has already changed the provider, preventing silent overwrites with a single user-facing conflict toast and automatic list refresh.

## [0.8.16] - 2026-03-23

### Security

- **CRITICAL — DB-backed authorization gate on `/api/admin/set-role` (Plan 049, F-049-01)**: Any authenticated user could previously self-promote to any role by calling this endpoint without an authorization check. Added `isAdminOrModerator()` DB-backed gate that returns 403 for all non-admin/moderator callers.

- **CRITICAL — Rate limiting and server-authoritative URLs for auth email/token routes (Plan 049, F-049-02)**: `/api/send-auth-email` and `/api/generate-confirmation-token` accepted unlimited requests and trusted caller-supplied redirect URLs, enabling phishing via branded UFlow emails. Added 5 requests/hr/IP rate limiting to both endpoints. `send-auth-email` now derives `confirmationUrl` origin from the server-side `NEXT_PUBLIC_SITE_URL` config, ignoring any caller-supplied origin.

- **HIGH — DB-backed role check in push notification route (Plan 049, F-049-05)**: `/api/push/send` trusted `user_metadata.role`, which is client-mutable. Replaced with `isAdminOrModerator()` call backed by the `users` database table.

- **HIGH — Removed hardcoded admin debug key fallback (Plan 049, F-049-03)**: `debug-ip-status` and `magic-link-diagnostic` endpoints fell back to the hardcoded value `'debug-key-change-in-production'` when `ADMIN_DEBUG_KEY` env var was absent. Removed all three fallback occurrences; endpoints now fail-closed (401) without the env var.

- **HIGH — Enumeration-safe `/api/check-email-exists` responses (Plan 049, F-049-04)**: Non-existent and unconfirmed email accounts previously returned distinguishable responses, enabling user enumeration. Both cases now return an identical `{ confirmed: false }` response. The `exists` and `userId` fields are removed. Updated `signInWithEmailConfirmation()` and `resetPasswordWithLanguage()` in `src/lib/auth.ts` to use only the `confirmed` field.

- **HIGH — Content Security Policy response header restored (Plan 049, F-049-06)**: CSP header was inadvertently removed. Restored via `buildCsp()` in `next.config.js` `headers()` config.

- **MEDIUM — Instagram scraper input validation (Plan 049, F-049-07)**: `/api/instagram/scrape` accepted arbitrary usernames enabling path traversal and injection. Added `/^[a-zA-Z0-9._]{1,30}$/` validation; invalid usernames return 400.

- **MEDIUM — Removed email PII from auth token generation log (Plan 049, F-049-12)**: `generate-confirmation-token` route logged the full email address in a security log. Removed; only `userId` and token type are now logged.

- **LOW — Centralized admin Supabase client in outreach routes (Plan 049, F-049-13)**: `outreach/claim` and `outreach/action` defined a local copy of `getSupabaseAdmin()`. Replaced with the centralized import from `@/lib/supabase/admin`.

### Dependencies

- **Next.js upgraded to 15.5.14 (Plan 049, F-049-10/11)**: Closes GHSA-3x4c-7xq6-9pq8 (unbounded image cache disk growth, moderate severity). `npm audit` reports 0 vulnerabilities.

### Deployment

- **`ADMIN_DEBUG_KEY` wired into production and UAT deploy workflows**: Added `-e ADMIN_DEBUG_KEY` flag to all four `docker run` invocations in `deploy-hetzner.yml` and `deploy-uat.yml`. Added `ADMIN_DEBUG_KEY` entry to `env.production.template` and `env.uat.template`. **Ops action required**: add `ADMIN_DEBUG_KEY` (and optionally `UAT_ADMIN_DEBUG_KEY`) to GitHub repository secrets before first deploy of this release.

## [0.8.15] - 2026-03-23

### Fixed

- **RPC schema drift fix for provider_description (Plan 055)**: The PostgreSQL RPC function `upsert_joinhalal_providers` no longer references `providers.provider_description`, which is absent in production-shaped environments (documented in migration 056). Previously, write-mode imports failed with `column "provider_description" of relation "providers" does not exist` because migration 063 unconditionally included that column in INSERT, SELECT, and DO UPDATE SET clauses. Migration 064 replaces the function definition without `provider_description` references. The source-controlled field classification in `joinhalal-fields.ts` is updated to match.

- **Write-mode RPC preflight check (Plan 055)**: The CLI import script now verifies the `upsert_joinhalal_providers` RPC function exists and is callable before the first write batch. Missing or incompatible RPC definitions are reported as environment/schema setup errors with actionable guidance, rather than surfacing as batch-offset failures during data writes.

## [0.8.14] - 2026-03-22

### Fixed

- **Sitemap non-detail URL filter (Plan 054)**: The JoinHalal sitemap URL extractor (`extractUrlsFromSitemapXml`) now filters out non-detail listing pages (e.g., `/locations/`, `/locations/restaurant/`) before they enter the import candidate set. Only provider detail page URLs matching the `/locations/{category}/{name}/` three-segment pattern are accepted. The filter is applied in the shared parser utility before the numeric limit slice, so both the admin dry-run preview and the CLI write path produce identical, clean candidate sets. A new `isJoinHalalDetailUrl()` predicate is exported for direct use and testing.

- **RPC write-path non-zero exit on failure (Plan 054)**: The CLI import script (`scripts/import-joinhalal.ts`) now exits with a non-zero status code when any RPC `upsert_joinhalal_providers` batch fails during a write run. Previously, batch failures were logged to stderr but the process exited 0, masking failures from operators and CI pipelines. The existing error logging is preserved; only the exit behavior changes.

## [0.8.13] - 2026-03-22

### Fixed

- **JoinHalal vxconfig parser fix (Plan 053)**: The `parseVxConfig()` function previously used `html.match()` which only returned the first vxconfig `<script>` block on JoinHalal pages. Real pages contain 3 blocks, and only the last one holds the authoritative `current_post` data (post ID and display name). The parser now iterates all vxconfig blocks using a `RegExp.exec()` loop and returns the first block containing `current_post`. This restores correct `import_source_id` extraction so providers are keyed for upsert rather than falling into the insert-only fallback path.

### Added

- **Offer auto-creation for unmatched Speisen (Plan 053)**: The import pipeline no longer silently drops unmatched Speisen food terms. A new `createMissingOffers()` function auto-creates missing offers in the `offers` table during import execution, assigns them to the "Essen & Trinken" category (`20c10efe-404b-4a39-bb81-5089a0332d78`), and uses `ON CONFLICT (name_de) DO NOTHING` for idempotency. Created offer IDs are merged into provider `offers_ids` before the provider upsert, ensuring every Speisen term is represented. The write report now shows `Offers matched`, `Offers auto-created`, and `Offers create failed` counts so operators have full visibility into offer-mapping behavior.

### Operator Notes

- **Remediation for pre-fix imports**: Providers imported before this fix may have `import_source_id = NULL` due to the parser bug. Before running a corrected re-import, operators should either: (a) delete providers with `import_source IS NULL AND user_created_id = '00000000-0000-0000-0000-000047000001'` to allow clean re-import, or (b) run a targeted update to backfill `import_source_id` from the source pages. Without remediation, the first corrected import may create duplicate rows for providers that previously lacked a post ID.

## [0.8.12] - 2026-03-22

### Added

- **JoinHalal import upsert with unique ID (Plan 052)**: The JoinHalal import pipeline now supports true upsert behavior — re-running the import updates existing providers with fresh data instead of skipping or duplicating them. Each listing's WordPress post ID (`vxconfig.current_post.id`) is extracted as a stable unique identifier and stored in new `import_source` + `import_source_id` columns on the providers table, backed by a partial unique index. The CLI write path uses a dedicated PostgreSQL RPC function (`upsert_joinhalal_providers`) that performs `ON CONFLICT DO UPDATE SET` with an explicit source-field allowlist, ensuring admin-controlled fields (`review_status`, `barakah_effects`, `needs_ids`, etc.) are never overwritten on re-import. Providers without a post ID (vxconfig absent) fall back to the existing name+city dedup insert-only path. The dry-run report now distinguishes between providers that would be **created** vs. **updated**, giving operators full visibility before committing a write. An `updated_at` trigger on the providers table ensures timestamps are refreshed on re-import. Migrations `062_add_import_source_columns.sql` and `063_upsert_joinhalal_provider_rpc.sql` are idempotent and safe to re-run.

## [0.8.11] - 2026-03-22

### Added

- **JoinHalal Speisen → offers mapping (Plan 051)**: The JoinHalal import pipeline now extracts the `Speisen` (food offerings) field from each listing's Schema.org data and resolves matching food terms against the UFlow offers catalog. Imported providers arrive with populated `offers_ids` instead of empty arrays, making them immediately searchable and filterable by food type. A seed migration adds 21 missing food offers (Adana, Bowl, Chicken, Dessert, Falafel, Fisch, Grill, Hot Dog, Köfte, Lamm, Lokma, Manti, Pasta, Reis, Salat, Sandwich, Steak, Sucuk, Suppe, Waffel, Wraps) to the offers catalog under the "Essen & Trinken" category. Both the admin dry-run dashboard and CLI write path now report unmatched Speisen values so operators can detect future catalog drift. Sample records in dry-run output include an `offers_matched` count for operator visibility.

## [0.8.10] - 2026-03-22

### Fixed

- **JoinHalal dry-run timeout hardening (Plan 049)**: The admin dry-run dashboard (`/dashboard/import`) intermittently returned 504 Gateway Timeout on UAT because the Nginx reverse proxy used the default 60-second `proxy_read_timeout`, which could be exceeded during route initialization or Supabase cold connections. Fixed by adding an explicit `proxy_read_timeout 95s` for `/api/admin/` routes in both UAT and production Nginx templates, scoped to avoid weakening other proxy behavior. An application-level 90-second AbortController timeout guard was added to the dry-run API route to ensure the app controls the failure response before Nginx (95s) or Cloudflare (100s) kill the request. The dry-run response now includes phase-level timing telemetry (`timing` field on `DryRunResult`) exposing category lookup, existing-key loading, sitemap retrieval, and page processing durations for operator diagnosis of intermittent slow paths.

## [0.8.9] - 2026-03-22

### Fixed

- **Provider modal Barakah Effekte section now displays actual badge visuals (Plan 048)**: The "Barakah Effekte" section in the desktop provider detail modal previously rendered legacy placeholder text ("Hatem Ipsum") and string-based pills from the deprecated `barakah_effects` field. Replaced with structured `BadgeLabel` components that render verified badge icons and labels from the provider's `badges` array (populated by the trust/badge system introduced in migration 016). Providers with structured badges now display their actual badge visuals (e.g., Halal, Muslim Owned, Community Active); providers without badges see a localised empty-state message. Added `providers.noBadges` translation key across all 6 supported languages.

## [0.8.8] - 2026-03-19

### Added

- **JoinHalal admin dry-run dashboard UI (Plan 048)**: A new admin-only dashboard page at `/dashboard/import` that lets operators run a JoinHalal import dry-run preview directly from the browser without needing terminal access. Introduces a shared server-safe import core (`src/lib/import/joinhalal.ts`) consumed by both the CLI script and a new authenticated admin API route (`POST /api/admin/import-joinhalal/dry-run`). The dashboard page displays import counts, unmapped category groups, sample records, and a copyable CLI write command for when the operator is ready to write. Actual database writes remain CLI-only in v1. Auth is enforced at both the dashboard layout boundary and the API route level (admin/moderator only).

### Added

- **JoinHalal provider data import pipeline (Plan 047)**: A new admin-only import script (`scripts/import-joinhalal.ts`) that fetches public halal business listings from joinhalal.com and bulk-upserts them into the UFlow providers database. The script scrapes Schema.org JSON-LD structured data from each listing page (server-side, no JS rendering required), normalises addresses, resolves UFlow category IDs, and writes via service-role access. A `--dry-run` mode generates a full import plan without writing data. All imported rows default to `review_status = 'pending'` and are traceable via `user_created_id = '<import-bot-uuid>'`. The outreach trigger is safely bypassed by the non-null `user_created_id` sentinel. A pure parser utility module (`src/utils/joinhalal-parser.ts`) backs the scraping logic with 27 unit tests.

## [0.8.7] - 2026-03-19

### Added

- **JoinHalal provider data import pipeline (Plan 047)**: A new admin-only import script (`scripts/import-joinhalal.ts`) that fetches public halal business listings from joinhalal.com and bulk-upserts them into the UFlow providers database. The script scrapes Schema.org JSON-LD structured data from each listing page (server-side, no JS rendering required), normalises addresses, resolves UFlow category IDs, and writes via service-role access. A `--dry-run` mode generates a full import plan without writing data. All imported rows default to `review_status = 'pending'` and are traceable via `user_created_id = '<import-bot-uuid>'`. The outreach trigger is safely bypassed by the non-null `user_created_id` sentinel. A pure parser utility module (`src/utils/joinhalal-parser.ts`) backs the scraping logic with 27 unit tests.

## [0.8.6] - 2026-03-19

### Fixed

- **Iconify icons (share, Instagram, web, phone) now render correctly on provider detail pages when the PWA service worker is active (Plan 046)**: Icons such as `lucide:share-2`, `mdi:instagram`, `mdi:internet`, and `entypo:old-phone` were blank on `/providers/[id]` pages. Root cause: `next.config.js` used the pre-v10 `shadowwalker/next-pwa` API shape, placing `runtimeCaching`, `importScripts`, `skipWaiting`, and `buildExcludes` at the **top level** of `withPWA({...})`. `@ducanh2912/next-pwa@10.x` silently ignores all top-level Workbox options, activating the default cache which includes a `!sameOrigin` NetworkFirst catch-all intercepting all Iconify CDN API requests. Combined with the `fallbacks.document` `handlerDidError` callback, this returned `Response.error()` for all generic XHR/fetch requests, producing `status: null` CORS errors. Fixed by moving all Workbox-specific options into `workboxOptions: { ... }` as required by v10, adding an explicit `NetworkOnly` bypass rule for `api.iconify.design`, `api.unisvg.com`, and `api.simplesvg.com` as defence-in-depth, and restoring the push notification handler import and build exclusion wiring. CSP `connect-src` was already correct and required no changes.

## [0.8.5] - 2026-03-19

### Security

- **Remediate flatted HIGH vulnerability (GHSA-25h7-pfq9-p65f)**: `flatted` transitive dependency bumped from 3.3.3 to 3.4.2 via `package-lock.json` update. Fixes unbounded recursion DoS in `parse()` revive phase. `npm audit --audit-level=high` now exits 0. Remaining advisory: Next.js moderate (GHSA-3x4c-7xq6-9pq8) deferred — fix requires breaking upgrade to Next.js 16.x.

## [0.8.4] - 2026-03-19

### Fixed

- **Category filter now respects URL parameter as canonical source (Plan 045)**: Navigating to `/providers?category=<uuid>` after previously selecting a different category chip silently displayed the wrong category's results. Root cause: the client-side category resolver used `selectedCategory ?? searchParams.get('category')`, giving stale React context higher priority than the URL param. Fixed by inverting operand order to `(searchParams.get('category') || null) ?? selectedCategory` so the URL param is always canonical and context is only used as a fallback when no URL param is present.

- **No-category provider browse now works correctly for all locales (Plan 045)**: Arabic, Turkish, Urdu, and Pashto users on the no-category browse path had all community services hidden because `t('search.all')` locale labels (`الكل`, `Tümü`, `سب`, `ټول`) were injected into the API `category` transport value. Only `'Alle'` and `'All'` were recognised by `getSearchStrategy`; all other locale labels fell through to `'providers_only'` instead of `'both'`. Fixed by passing `null` directly when no category is selected; `null` already routes to the `'both'` strategy throughout the service layer.

### Changed

- **Removed debug `console.log` calls from provider discovery components (Plan 045)**: Seven development-only `console.log` calls were removed from `ProviderCardModal`, `ProviderDetailModal`, `ProfileProviderDetailPage`, and `ProfileProviderDetailButtons`. A share-cancel failure log was also upgraded from `console.log` to `console.error` in `ProviderDetailModal`.

## [0.8.3] - 2026-03-18

### Fixed

- **Providers discovery now shows all providers when `?location=` is empty or absent (Plan 044)**: Navigating to `/providers?location=` or any URL with a missing/empty location param silently showed only the first server-rendered page and blocked infinite scroll. Root cause: the client-side location resolver used JavaScript `||` which discarded the empty-string `LOCATION_ALL` sentinel and fell through to a localised display label (`Überall`/`Everywhere`), which was then sent to the API as a real city name, causing `WHERE address_city = 'Überall'` to match zero rows. Fixed by switching to nullish-coalescing (`??`) in `ProvidersContent` and replacing the `|| 'Everywhere'` default in the API route with proper sentinel normalization (matching the existing server-component logic). Legacy `location=Everywhere` and `location=Überall` URL params are also mapped to the all-locations sentinel.

## [0.8.2] - 2026-03-15

### Fixed

- **Mobile footer overlay no longer blocks content interaction (Plan 044)**: Invisible wrapper elements in the mobile bottom UI slot were intercepting touch events above the footer, preventing users from tapping buttons and links near the bottom of the screen. Added `pointer-events: none` to the structural wrapper layers and `pointer-events: auto` to the interactive footer/navbar components, restoring full touch access to page content on all mobile routes.

## [0.8.1] - 2026-03-13

### Fixed

- **Outreach emails now include real provider name (Plan 039)**: Replaced hardcoded `'Your business'` / `'Provider'` placeholders with the provider's actual display name fetched from the database (`providers.provider_name`). Both the email template and the token snapshot (`provider_name_snapshot`) now use the real name. A language-appropriate fallback (`'Ihr Unternehmen'` / `'Your business'`) is applied when the DB lookup returns no result, so dispatch is never blocked.

### Changed

- **WhatsApp contact number is now configurable (Plan 040)**: Replaced hardcoded `4915123456789` placeholder with `WHATSAPP_CONTACT_NUMBER` environment variable. New `getWhatsAppContactUrl()` utility reads the server-side env var, strips non-digit characters, and returns a `wa.me` link (or `null` when unconfigured). Both outreach email templates (DE/EN) and the owner-decision landing page conditionally render the WhatsApp CTA only when a number is configured.

## [0.8.0] - 2026-06-08

### Added

**Provider Owner Outreach & Claim System (Plan 038)**

- **Outreach Database Model**: New tables `provider_owner_outreach`, `provider_owner_action_tokens`, and `provider_outreach_tasks` for tracking outreach campaigns, secure one-time tokens, and manual tasks (phone/Instagram outreach).
- **Auto-enqueue Trigger**: Postgres trigger automatically creates outreach queue entries when unclaimed providers (with contact info) are inserted.
- **Multi-Channel Dispatcher**: Service to process outreach queue via email (automated) or manual tasks (phone/Instagram). Includes configurable German/English email templates with WhatsApp contact option.
- **Secure Token System**: SHA-256 hashed tokens with 7-day expiry, single-use enforcement, and scope-specific actions (keep/claim/remove).
- **Owner Decision Landing Page**: German-first `/owner-decision` page where external owners can validate their listing or request removal. Responsive UI with loading, error, and success states.
- **Claim Provider Flow**: API endpoint for authenticated users to claim ownership of a provider listing via secure token.
- **Remove by Owner**: New `removed_by_owner` review status for providers whose owners request removal. Listings with this status are excluded from public search.
- **Observability Queries**: SQL monitoring queries for unclaimed provider counts, channel performance, decision rates, and daily dashboard metrics.
- **34 TDD Tests**: Comprehensive test coverage for outreach service (14 tests), dispatcher (12 tests), and landing page (8 tests).

### Changed

- Extended `review_status` enum to include `removed_by_owner` value.
- Updated TypeScript types in `providers.ts` and `communityServices.ts` for new review status.

## [0.7.2] - 2026-03-08

### Security

- **Fixed**: Eliminated all 10 npm dependency vulnerabilities (8 high, 2 moderate) via package overrides
  - Resolved serialize-javascript RCE (CVSS 8.1): override `>=7.0.4` via `@ducanh2912/next-pwa` → workbox chain
  - Resolved immutable prototype pollution: override `^3.8.3` via `swagger-ui-react`
  - Resolved minimatch ReDoS (CVSS 7.5): override `>=3.1.5` across eslint/typescript/vitest/workbox tooling
  - Resolved dompurify XSS (CVSS 6.1, 2 advisories): override `^3.3.2` via `swagger-ui-react`
- **Impact**: `npm audit` reports 0 vulnerabilities (down from 10); no functional or API changes

### Changed

- Updated `package.json` overrides to pin patched transitive dependency versions
- Regenerated `package-lock.json` with patched dependency tree

## [0.7.1] - 2026-05-27

### Added

**Analytics Activation & Event Instrumentation (Plan 036)**

- **`contact_intent_triggered` events wired**: `trackEvent('contact_intent_triggered', { contact_type: 'call'|'website', city })` now fires in `ProviderCardModal` (`handleCall`/`handleWebsite`) and `ProviderDetailModal` (`handleExpand` for `'call'`/`'website'`). Email intent intentionally omitted — no email CTA handlers exist in current UI.
- **`provider_profile_completed` events wired**: `trackEvent('provider_profile_completed', { city, has_phone, has_website })` now fires after successful `createProviderOrService` in both `StreamlinedRecommendForm` and `StreamlinedImportForm`.
- **Plausible CE Docker Compose**: `infra/plausible/docker-compose.yml` — self-hosted Plausible Community Edition stack (Postgres 16 + ClickHouse 24 + Plausible v2.1.4) with healthchecks, named volumes, and localhost-only port binding. Setup guide in `infra/plausible/README.md`.
- **ADR-006 codified**: Analytics governance rules (non-fatal, GDPR-aligned, non-PII props, separate stack) recorded in `agent-output/architecture/system-architecture.md`.

### Changed

- `ProviderCardModal`: imports `trackEvent` from `@/lib/analytics/plausible`; handlers now fire event before opening tel:/website URL.
- `ProviderDetailModal`: imports `trackEvent`; `handleExpand` fires event before tel: link click / `window.open` for website.
- `StreamlinedRecommendForm`: imports `trackEvent`; fires `provider_profile_completed` inside `handleSubmit` immediately after `await createProviderOrService(...)` resolves.
- `StreamlinedImportForm`: same pattern as above.

### Tests

- `src/__tests__/components/providers/contact-intent-tracking.test.tsx`: TDD tests (9) for M2 event wiring — ProviderDetailModal call/website buttons + ProviderCardModal call/website links.
- `src/__tests__/features/providers/provider-profile-completed-tracking.test.tsx`: TDD tests (3) for M2b event wiring — StreamlinedRecommendForm + StreamlinedImportForm submit flows.

### Added

**Growth: Indexable City Pages + Plausible Analytics (Plan 035 M1 + M2)**

- **ISR city pages**: `/city/[cityName]` converted from `'use client'` route to Server Component with ISR (`revalidate = 300`). Pages are now fully indexable by search engines. `generateStaticParams()` pre-renders Berlin, Hamburg, München at build time.
- **UTM-stripped canonical URLs**: `generateMetadata()` emits canonical URLs that strip all `utm_*` params (ADR-005). Social shares with UTM-tagged links no longer create duplicate crawlable URLs.
- **OG tags on city pages**: Title, description, URL, and site name set for social share previews.
- **Plausible Analytics**: Cookie-free, GDPR-compliant analytics integrated via conditional `<Script>` in root layout. Activates when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env var is set — safe no-op otherwise (no consent banner required).
- **`trackEvent()` utility**: SSR-safe Plausible wrapper at `src/lib/analytics/plausible.ts`. Guards against SSR (`typeof window`) and script-not-loaded (`typeof window.plausible`) contexts.
- **CSP allowlist**: `script-src-elem` and `connect-src` updated atomically to permit Plausible script and beacon hosts.
- **`createSupabaseStaticClient()`**: Cookie-free Supabase client at `src/lib/supabase/static.ts` enabling ISR on acquisition pages without triggering Next.js dynamic-server-usage errors.
- **Client islands**: `CityPageClientEffects` (localStorage/sessionStorage sync, null-render) and `CityStage1Content` (wraps early-access subscribe flow) extracted from city page to preserve ISR boundary.
- **Server-side RPC error logging**: `get_provider_count_by_city` RPC failures are now logged (`console.error`) on the server instead of silently falling back to Stage 1.
- **Env templates**: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and `NEXT_PUBLIC_PLAUSIBLE_HOST` added to all four env templates.

### Fixed

**Provider Image Load Performance (Plan 034)**: Eliminates multi-second hero image load latency on provider detail pages.

- **WebP-only format**: Changed `next.config.js` image `formats` from `['image/avif', 'image/webp']` to `['image/webp']`, eliminating AVIF cold-encode latency (5–15s) on Hetzner VPS. WebP encode is ~100ms vs multi-second AVIF.
- **Correct `sizes` attribute**: Added `sizes="640px"` to `ProviderDetailModal.tsx` hero image (desktop, fixed 640px container) and `sizes="(min-width: 1024px) 50vw, 100vw"` to `ProviderDetailPage.tsx` hero image (responsive layout). Prevents Next.js from requesting oversized `w=3840` images when 640px suffices.
- **Missing `priority` on mobile**: Added `priority={index === 0}` to `ProviderDetailPage.tsx` hero image so the first image gets a fetchpriority hint.
- **Persistent image cache**: Updated Dockerfile to create `.next/cache/images/` with correct ownership, and all deploy scripts to mount a named Docker volume (`uflow-image-cache` / `uflow-uat-image-cache`), so optimized images survive container restarts and deployments.
- **Files changed**: `next.config.js`, `src/components/providers/ProviderDetailModal.tsx`, `src/components/providers/ProviderDetailPage.tsx`, `Dockerfile`, `scripts/deploy-uat.sh`, `scripts/deploy-hetzner.sh`, `scripts/deploy-hetzner-fixed.sh`, `scripts/deploy-with-monitoring.sh`
- **Measurable targets**: Cold load < 500ms, warm load < 200ms for typical provider hero images.

## [0.6.11] - 2026-03-07

### Changed

**Performance Optimization Guardrails + Caching Alignment (Plan 033)**: Establishes measurable, durable performance guardrails for UFlow discovery flows.

- **Cache-Control precedence fix (ADR-004)**: Removed global `/api/:path*` Cache-Control override from `next.config.js`. Route handlers now own Cache-Control for `/api/*` routes, allowing `/api/providers/search` to set cacheable headers for browse (no query) and `no-store` for free-text search as intended.
- **Performance budgets**: Added `scripts/perf/budgets.json` with First Load JS thresholds for critical routes (`/providers`: 350kB, `/providers/[provider_id]`: 220kB, shared: 120kB). Added `scripts/perf/check-budgets.js` budget checker integrated into CI build job.
- **Performance telemetry**: Added `src/lib/telemetry/perf-telemetry.ts` with minimal always-on request timing and dependency timing for route handlers. Instrumented `/api/providers/search` with correlation IDs, handler duration, and Supabase call timing. No PII logged by default.
- **CI integration**: Updated `.github/workflows/ci.yml` to capture build output and run budget checks as part of the build job.
- **Optimization audit**: LCP image optimization already in place (first 4 cards get `priority={true}` and `loading="eager"`). Bundle sizes within budget (all routes <90% of threshold).
- **Files changed**: `next.config.js`, `package.json`, `scripts/perf/{budgets.json,check-budgets.js}`, `src/lib/telemetry/perf-telemetry.ts`, `src/app/api/providers/search/route.ts`, `.github/workflows/ci.yml`
- **Architectural principle**: Make performance observable and enforceable — budgets prevent regression, telemetry enables diagnosis, ADR-004 ensures caching intent is respected.

## [0.6.10] - 2026-03-01

### Fixed

**Mobile Onboarding Vertical Centering (Plans 028 + 029)**: Fixed vertical centering for all 7 mobile onboarding screens (loading, splash, about, waitlist, success, earlyAccess, aboutFromEarlyAccess) on iOS Safari.

- **Root cause**: `height: 100%` (`h-full` Tailwind class) fails to resolve correctly when parent height is determined by `flex-1` (flex sizing). iOS Safari is particularly sensitive to this pattern, causing layout jumps when the address bar shows/hides.
- **Fix**: Changed pattern from `h-full` to `min-h-full` in 6 components (SplashLayout, MobileSplashScreen, RootPageContent, EarlyAccessScreen, WaitlistScreen, WaitlistSuccessScreen). The `min-height: 100%` approach sets a floor that works correctly in flex-sized parents.
- **Pattern**: `flex min-h-full flex-1 flex-col` — proven solution for flex-based layouts.
- **Device validation**: User confirmed all states vertically centered on iPhone Safari without layout jumps.
- **Affected screens**: All mobile onboarding state transitions.
- **Files changed**: `SplashLayout.tsx`, `MobileSplashScreen.tsx`, `RootPageContent.tsx`, `EarlyAccessScreen.tsx`, `WaitlistScreen.tsx`, `WaitlistSuccessScreen.tsx`.
- **Architectural principle**: Use `min-height` instead of `height` in flex-sized parents to ensure reliable layout behavior across browsers.

## [0.6.9] - 2026-02-24

### Fixed

**Blurred Header Overlay on Onboarding Slide 1 (Plan 022)**: Removed the frosted/blurred header overlay that was covering the map illustration on the onboarding "About" screen on iPhone Safari.

- **Root cause**: `AboutPageContent` always rendered a fixed `PageHeader` + `HeaderSpacer` even when in splash/onboarding mode (`showSplashHeader=true`). The header had no visible content (empty title, no back button, no icon) but still applied `backdrop-filter: blur()` when `isScrolled` became true, creating a frosted overlay that obscured the `MapIllustration`.
- **Fix**: Conditionally skip rendering `PageHeader` and `HeaderSpacer` when `showSplashHeader=true`. The language switcher remains accessible via its existing portal to `document.body`.
- **Affected screens**: Onboarding "About" screen (map illustration slide).
- **Files changed**: `AboutPageContent.tsx`.
- **Architectural principle**: Do not render empty fixed header layers that only contribute visual artifacts (blur) without functional UI.

## [0.6.8] - 2026-02-25

### Security

**Supply Chain Hardening (Plan 024)**: Implemented defense-in-depth controls against active Shai-Hulud NPM supply chain worm campaign and AI toolchain poisoning.

- **Threat context**: Active campaign targeting JavaScript projects via 23 malicious/sleeper NPM packages (typosquatting), malicious GitHub Actions, and AI assistant MCP server poisoning
- **IOC Scanner (CI gate)**: Added `scripts/security/ioc-scan.sh` scanning for known malicious packages and GitHub Actions; integrated as first job in CI pipeline (`supply-chain-ioc-scan`) gating all downstream jobs (lint, test, build, security)
- **Dependency Review (PR gate)**: Added `dependency-review.yml` workflow (SHA-pinned to v4.6.0) blocking PRs that introduce dependencies with high+ CVE severity
- **MCP Config Auditor**: Added `scripts/security/audit-mcp-configs.sh` with JSON output support for local developer toolchain verification; checks Cursor, Claude, Continue, and Windsurf MCP configs against allowlist (`mcp-allowlist.json`) with prefix matching
- **Documentation**: Comprehensive hardening guide at `docs/security/supply-chain-hardening.md` with quarterly maintenance cadences
- **QA Fixes**: Fixed ESLint ignores for `docs/implementation/**`, `.flowbaby/`, and `public/fallback-*.js` to prevent CI lint blocking
- **Files changed**: `scripts/security/{ioc-scan.sh,audit-mcp-configs.sh,mcp-allowlist.json}`, `.github/workflows/{ci.yml,dependency-review.yml}`, `docs/security/supply-chain-hardening.md`, `eslint.config.mjs`
- **Architectural principle**: Defense-in-depth — layer automated CI gates, PR review workflows, and local developer tools to detect supply chain threats before they reach production

## [0.6.7] - 2026-02-24

### Fixed

**Blurred Header Overlay on Onboarding Slide 1 (Plan 022)**: Removed the frosted/blurred header overlay that was covering the map illustration on the onboarding "About" screen on iPhone Safari.

- **Root cause**: `AboutPageContent` always rendered a fixed `PageHeader` + `HeaderSpacer` even when in splash/onboarding mode (`showSplashHeader=true`). The header had no visible content (empty title, no back button, no icon) but still applied `backdrop-filter: blur()` when `isScrolled` became true, creating a frosted overlay that obscured the `MapIllustration`.
- **Fix**: Conditionally skip rendering `PageHeader` and `HeaderSpacer` when `showSplashHeader=true`. The language switcher remains accessible via its existing portal to `document.body`.
- **Affected screens**: Onboarding "About" screen (map illustration slide).
- **Files changed**: `AboutPageContent.tsx`.
- **Architectural principle**: Do not render empty fixed header layers that only contribute visual artifacts (blur) without functional UI.

## [0.6.6] - 2026-02-24

### Fixed

**Remaining iPhone Safari Viewport Overlap v3 (Plan 021)**: Fixed CTA buttons still being clipped/hidden on onboarding slides and city-selection page after Plan 020 only fixed the landing splash. Real-device UAT on iPhone SE Safari confirmed the remaining issue.

- **Root cause**: The `mobile-bottom-ui-slot` CSS reserved 128px (`var(--mobile-nav-total)`) via `min-height` even when `data-mobile-ui="none"` (no bottom UI visible). During onboarding, this created 128px of dead space that reduced `<main>` height from ~559px to ~431px, pushing taller content (onboarding slides ~500px, city-selection ~530px) below the visible area.
- **Primary fix**: Added CSS rule to collapse the bottom slot when no bottom UI is present: `.mobile-bottom-ui-slot[data-mobile-ui='none'] { min-height: 0; }`. This reclaims the full viewport height for onboarding content.
- **Hydration shift mitigation**: Added `transition: min-height 0.15s ease-out` to smooth the slot height change when transitioning from onboarding (slot collapsed) to post-onboarding pages (slot expanded for footer/navbar).
- **Secondary sweep**: Replaced remaining nested `h-screen-fix` → `h-full` in waitlist flow screens (`WaitlistScreen.tsx`, `WaitlistSuccessScreen.tsx`) and `HomePageShell.tsx` loading/error states.
- **Affected screens**: Onboarding slides ("Weiter >", "Entdecke deine Ummah >"), city selection (`/city-selection`), waitlist screens.
- **Files changed**: `globals.css` (CSS rule + transition), `WaitlistScreen.tsx`, `WaitlistSuccessScreen.tsx`, `HomePageShell.tsx`.
- **Architectural principle**: Extended from Plan 020 — not only should children avoid claiming viewport height, but the layout should also avoid reserving space for UI that isn't visible.

## [0.6.5] - 2026-02-24

### Fixed

**iPhone SE Viewport Overlap v2 (Plan 020)**: Fixed content (CTA buttons, map) being hidden behind bottom navigation on iPhone SE Safari. Plan 019 (v0.6.4) correctly replaced `h-screen` with `h-screen-fix` (dvh) but the true root cause was a **nested viewport-height conflict**: child screens claimed `100dvh` inside `<main>` which only had `100dvh - 128px` available (due to the always-reserved `mobile-bottom-ui-slot`).

- **Root cause**: 6 child screens used `h-screen-fix` (100dvh) inside the root layout's `<main>` container, which is already constrained to `100dvh - 128px` by the bottom UI slot reservation. The 128px overflow pushed CTAs below the visible area.
- **Fix**: Removed nested `h-screen-fix` from all primary onboarding funnel screens. Child screens now use `flex h-full` to fill the available parent space instead of independently claiming viewport height.
- **Affected screens**: Landing page (`/`), city selection (`/city-selection`), city page (`/city/[cityName]`) loading/error states.
- **Files changed**: `SplashLayout.tsx`, `MobileSplashScreen.tsx`, `EarlyAccessScreen.tsx`, `CityEarlyAccessEmptyState.tsx`, `city-selection/page.tsx`, `city/[cityName]/page.tsx`.
- **Architectural principle**: Single source of viewport height truth — only `RootClientLayout` should set `h-screen-fix`; children fill available space.

## [0.6.4] - 2026-02-23

### Fixed

**iPhone SE Safari Viewport Overlap (Plan 019)**: Fixed content being hidden behind fixed headers/footers on iPhone SE Safari by replacing `h-screen` (100vh) with the project's `h-screen-fix` utility (dvh + iOS -webkit-fill-available) across all mobile full-height page wrappers.

- **Root cause**: iOS Safari's `100vh` includes browser chrome height, causing fixed headers/footers to overlap page content on small screens like iPhone SE.
- **Fix**: Swept 24 files replacing `h-screen` with `h-screen-fix` on all page/screen viewport wrappers. Left `min-h-screen` (allows content growth) and `md:h-screen` (desktop-only) unchanged.
- **Scope**: Layout wrappers, onboarding screens, provider edit pages, city pages, loading/error states.
- **Impact**: All mobile screens now use iOS-safe viewport height, preventing content from being hidden behind browser chrome.

## [0.6.3] - 2026-02-23

### Fixed

**Providers Page Location Filter Bug (Hotfix)**: Fixed critical bug introduced in v0.6.2 where `/providers` page showed "No results found" because it was passing `'Everywhere'` as a literal city name instead of the canonical empty string sentinel for "all locations".

- **Root cause**: Plan 017 introduced `LOCATION_ALL = ''` as canonical sentinel, but `providers/page.tsx` server component still defaulted to `'Everywhere'` string, causing service layer to filter for a non-existent city.
- **Fix**: Updated `providers/page.tsx` to map legacy location values (`'Everywhere'`, `'Überall'`) to empty string, matching SearchBar client-side logic.
- **Impact**: Providers page now correctly displays all providers by default when no location filter is specified.

## [0.6.2] - 2026-02-23

### Fixed

**i18n Header Translation Bug (Plan 017)**: Fixed a bug where English users saw German text ("Anmelden", "Registrieren", "Überall") in the header navigation even when the language selector showed EN.

- **Header buttons**: Replaced hardcoded German strings "Anmelden" and "Registrieren" with translation calls `t('navigation.login')` and `t('navigation.register')` in `Header.tsx`.
- **Location sentinel**: Introduced canonical `LOCATION_ALL` constant (empty string) in `search-provider.tsx` to represent "all locations" in a language-agnostic way. Previously defaulted to hardcoded German "Überall".
- **SearchBar display**: Updated `SearchBar.tsx` to display translated `t('search.everywhere')` when canonical sentinel is selected, and to map legacy URL params ("Überall", "Everywhere") to the canonical sentinel for backward compatibility.
- **Service layer alignment**: Updated `categories.ts`, `providers.ts`, `communityServices.ts`, and `saved/page.tsx` to treat empty/falsy location values as "all locations" instead of comparing against hardcoded translated strings.

## [0.6.1] - 2026-02-23

### Fixed

**PWA Form Rendering on MIUI/Xiaomi Devices (Plan 015)**: Fixed a bug where the "Anbieter empfehlen" (Recommend Provider) form displayed blank content on Xiaomi 13T Pro in PWA standalone mode. Only the "Basics" heading and submit button were visible; all input fields were hidden.

- **Viewport height fix**: Updated `.h-screen-fix` CSS utility to use `100dvh` (dynamic viewport height) instead of unconditional `-webkit-fill-available`. The `-webkit-fill-available` value could resolve to 0 on MIUI WebView in PWA standalone mode, collapsing the root container. Now gated behind `@supports (-webkit-touch-callout: none)` so it only applies on iOS Safari where it's needed.
- **Scroll container positioning**: Added `position: relative` to `PageTransition` component so that `ScrollablePageLayout`'s `absolute inset-0` resolves to its direct parent instead of a distant ancestor. This prevents layout collapse when viewport height propagation fails.
- **Page background fix**: Applied same iOS-only gating to `.page-background` `min-height: -webkit-fill-available` to prevent height collapse on Android PWA.

## [0.6.0] - 2026-02-23

### Improved

**Repository Structure Cleanup (Plans 011 + 012)**: Improved developer experience, contributor onboarding, and repository maintainability through folder structure clarification and root directory cleanup.

#### Plan 011: Repo Structure Refactor (Documentation)

**Changed**:

- **Scripts consolidated**: Moved `src/scripts/*` to root `scripts/`; removed `src/scripts/` directory. Dev/ops scripts now have a single home. Fixed stale `tsconfig.json` reference to non-existent `bundle-icons.mts`.
- **SQL folder clarified**: Updated `sql/README.md` to state that `supabase/migrations/` is the sole authoritative migration source. `sql/migrations/` is now labelled as historical/reference-only.
- **Copilot instructions updated**: `.github/copilot-instructions.md` folder-structure section now distinguishes shared UI (`src/components/`) from domain UI (`src/features/<domain>/components/`), references the new placement rubric, and documents migration/script authority rules.

**Added**:

- **Placement rubric**: New `docs/guides/PLACEMENT_RUBRIC.md` — a decision table covering 18 file categories (UI, hooks, services, types, migrations, scripts, tests, docs, etc.) to answer "where should I add this file?"
- **Folder READMEs**: Added `src/components/README.md`, `src/features/README.md`, and `scripts/README.md` describing each folder's responsibility and what does/doesn't belong there.

#### Plan 012: Root-Level Files Placement Cleanup

**Changed**:

- **Root directory cleaned**: Relocated 30 files from repository root to proper subdirectories. Root now contains only essential entrypoints (README, START_HERE, SECURITY, CHANGELOG) plus build configuration.
- **Documentation organized**: 16 markdown documents moved to `docs/{summaries,reviews,fixes,guides,action-items}` following established taxonomy.
- **Scripts relocated**: 8 shell scripts moved to `scripts/{db,debug}` for better discoverability.
- **Infrastructure templates**: 2 nginx configuration templates moved to `deploy/nginx/`.
- **Data artifacts**: CSV import data moved to `imports/`, SQL migration moved to `supabase/migrations/057_standardize_image_storage.sql`.
- **Reference updates**: Updated 15 path references across 11 files (CI workflows, deployment scripts, documentation) to reflect new locations.
- **Duplicate removed**: Deleted duplicate `PERFORMANCE_OPTIMIZATION_SUMMARY.md` from root (comprehensive version exists in `docs/performance/`).

### Developer Impact

- **Faster navigation**: Root clutter eliminated — contributors can scan the repository structure in seconds
- **Clearer onboarding**: New contributors have obvious starting points and placement guidance
- **Prevents drift**: 18-category placement rubric + folder READMEs establish clear boundaries for future contributions
- **Improved velocity**: Less time spent asking "where should this go?" or hunting for files

### Technical Notes

- Minor version bump rationale: Changes developer-facing folder contracts (placement rules, migration authority, script location, root organization) even though there are no user-facing UX changes
- No runtime behavior changes; no database schema changes; structure and documentation only
- All automated validation passed: type-check ✓, 147 tests ✓, build ✓

## [0.5.0] - 2026-02-23

### Security (Plan 010 — P0)

- **Removed localhost ingest calls**: All unguarded `fetch('http://127.0.0.1:7243/ingest/...')` debug/agent-log calls removed from `SplashContent.tsx` and `MobileSplashScreen.tsx`. These were production-risk calls that attempted to contact the user's own device.
- **Safety regression test added**: `no-localhost-ingest.test.ts` prevents future localhost ingest calls from being shipped.

### Performance (Plan 010 — P1a)

- **Server-first Providers discovery**: `/providers` page now server-renders the initial page of search results, reducing time-to-content. Client component receives server-rendered initial data and handles pagination/interactivity.
- **Server pagination boundary**: New route handler `GET /api/providers/search` serves as the canonical server boundary for search pagination with explicit caching headers (60s TTL for browse, `no-store` for free-text queries).
- **Reduced client bundle coupling**: Providers search pagination now calls the API route handler instead of importing the search service directly into the client bundle.

### Improved (Plan 010 — P1b)

- **Reduced `force-dynamic` blast radius**: Removed explicit `force-dynamic` exports from root layout and root page. Routes remain dynamic via inherent API usage (`headers()`, `cookies()`, `searchParams`) but no longer explicitly suppress caching for all child routes.

## [0.4.1] - 2026-02-22

### Fixed (Plan 008)

- **Fallback-on-empty bug removed**: `searchCommunityServices()` no longer falls back to ILIKE when the full-text search RPC returns an empty result set. Fallback now only triggers on RPC error or function-missing (code 42883).
- **Fallback queries bounded**: ILIKE fallback in `searchNeeds()` and `searchOffers()` now uses explicit column selects (not `select('*')`) and `.limit(100)` aligned with the RPC limit.

### Validated (Plan 008)

- **GIN index usage confirmed**: `EXPLAIN (ANALYZE, BUFFERS)` validates that `idx_providers_name_search` and `idx_community_services_name_search` are used via Bitmap Index Scan (sub-millisecond execution times).
- **Limit rationale documented**: All key query limits (100/200/500/1000) now have inline comments explaining the UX/safety rationale.

## [0.4.0] - 2026-02-22

### Performance (Plan 007)

- **First Load JS: 687 kB → 105 kB** (85% reduction)
  - Removed custom webpack `splitChunks` override that was leaking dynamically-imported modules (swagger-ui-react + 1.2 MB dependency tree) into the shared bundle
  - Replaced `PageTransition` motion/react wrapper with CSS-only opacity transition, eliminating ~212 kB motion runtime from critical path
  - Dynamically imported `FooterAction` in root layout to isolate `@iconify/react` (56 kB) from shared bundle
  - Converted 8 modal components to dynamic imports across shell and page components
  - Removed decorative `motion/react` from MobileHeader, MobileNavbar, MobileFooterBar (CSS `animate-fade-in` replacement)
  - Removed dead `@iconify/react` import from MobileFooterBar (all nav items use function icons)

- **Database Search Performance** (GIN indexes + ILIKE elimination)
  - Created 4 GIN tsvector indexes for providers and community_services search
  - Added 3 RPC helper functions for tsvector-based filtering: `search_provider_ids_by_name`, `get_filtered_cities_by_search`, `get_filtered_category_ids_by_search`
  - Replaced 3 ILIKE violations in categories.ts and providers.ts with tsvector RPC calls
  - Migration: `supabase/migrations/056_add_provider_community_service_search_indexes.sql`

- **Data Fetch Optimization**
  - Added `.limit()` bounds to unbounded queries: needs (500), badges (100/200), categories (200)
  - Replaced `select('*')` with explicit column selects for needs and bookmarks services

### Added

- Custom `animate-fade-in` CSS animation in Tailwind config (keyframe + utility class)
- 12 new service tests for ILIKE→tsvector migration (TDD: categories.test.ts, providers.test.ts)

### Fixed

- Cleaned up unused imports: `useReduceMotion` in MobileSplashScreen, `useState`/`hasAnimated` in CategoryGallerySection

## [0.3.1] - 2026-02-22

### Fixed

- **Android UX Regression**: Recommend provider form now displays all sections correctly on Android devices with saved draft state
  - Fixed input auto-focus that opened keyboard and scrolled viewport on page load
  - Implemented `userToggledRef` causal guard to prevent non-user-initiated focus triggers (mount, localStorage restore, autocomplete auto-selection)
  - Focus preserved for user-initiated checkbox toggles (desired UX maintained)
  - Added 5 unit tests with full TDD coverage (114 total tests passing)
  - Impact: Community-driven provider recommendations (Epic 3.1) now functional on Android

## [0.3.0] - 2026-02-22

### Added

- **Provider Trust & Verification System** (Plan 001)
  - Trust badges displayed on provider detail pages with clear trust level distinction (Self-Declared, Community Confirmed, UmmahFlow Verified)
  - Badge endorsement UX: authenticated users can confirm/revoke badge endorsements
  - Aggregate confirmation counts shown on badges (privacy-safe — no individual confirmer identities exposed)
  - Badge display on provider search result cards via existing BadgeLabel component
  - TrustBadgesSection component with loading, empty, and populated states
  - EndorseBadgeButton component with login-required flow for unauthenticated users
  - Badges fetched in parallel with offers/needs in getProviderById (no N+1 patterns)
  - Trust-based search ranking preserved from DB-side implementation (no client-side re-sorting)

## [0.2.1] - 2026-02-21

### Fixed

- Fixed UAT Docker build failures caused by `npm ci` errors
- Restored missing phantom dependencies (react-window, swagger-ui-react, next-swagger-doc)
- Removed problematic bn.js override crossing major version boundary
- Synchronized package-lock.json with package.json (resolved 9 spec mismatches)
- Fixed PWA import in next.config.js to use @ducanh2912/next-pwa.default

### Added

- Added .nvmrc to pin Node.js 20 for contributor toolchain
- Added pre-Docker npm ci validation step to UAT workflow for early failure detection

## [0.2.0] - 2026-02-21

### Fixed

- Fixed hydration mismatch error in RootClientLayout by introducing `hasMounted` guard pattern
- Removed unnecessary `typeof window !== 'undefined'` check on `getFeatureFlag('isAppLaunched')` that was causing server/client HTML divergence
- Gated client-only UI decisions (mobile footer, early access navbar, subpage actions) on `hasMounted` state to ensure SSR and client initial paint produce identical HTML

### Added

- Unit tests for RootClientLayout hydration safety (3 tests)
- Comprehensive test coverage for client-only rendering guards

### Technical

- Diagnosed Supabase local development "CORS" errors as DNS NXDOMAIN (environment configuration issue)
- All quality gates passed: 54/54 tests passing, type-check clean, lint clean, build succeeds
- TDD workflow followed (tests written first, implementation verified)
- No breaking changes, no new dependencies

**Plan ID**: 003  
**UAT**: APPROVED FOR RELEASE  
**QA**: Complete (all automated checks passed)  
**Code Review**: APPROVED

## [0.1.0] - 2025-Q4

### Added

- Initial launch with waitlist system
- Early access functionality for selected cities
- Provider listing and search
- Basic community services platform
- Progressive Web App (PWA) support
- User authentication via Supabase
- Mobile-responsive design
