# Changelog

All notable changes to UFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
