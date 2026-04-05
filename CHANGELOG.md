# Changelog

All notable changes to UFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
