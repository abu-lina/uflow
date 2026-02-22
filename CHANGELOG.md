# Changelog

All notable changes to UFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
