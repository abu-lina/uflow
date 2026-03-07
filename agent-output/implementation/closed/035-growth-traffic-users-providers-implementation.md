---
ID: 035
Origin: 035
UUID: 10b4766e
Status: Committed
---

# Implementation 035 — Growth: More Traffic, Users, and Providers (M1 + M2)

## Plan Reference

- **Plan**: `agent-output/planning/035-growth-traffic-users-providers-v0.7.0.md`
- **Architecture**: `agent-output/architecture/035-growth-traffic-architecture-findings.md`
- **Target Release**: v0.7.0

## Date

2026-03-07

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-07T21:41Z | Planner → Implementer | Implement M1 + M2 | M1: Plausible Analytics integration; M2: City page ISR refactor |

## Implementation Summary

Implemented Milestones 1 and 2 of Plan 035 — the measurement foundation (Plausible Analytics) and the primary SEO acquisition surface (city page ISR refactor).

**How this delivers value**: The city page is now server-rendered with ISR (5-minute revalidation), meaning initial HTML contains provider data immediately — no client-side fetch required. Combined with proper metadata, canonical URLs, and OG tags, city pages become a growth engine discoverable by search engines and shareable on social media. The Plausible integration provides cookie-free, GDPR-compliant measurement without requiring a consent banner.

## Milestones Completed

- [x] **M1**: KPIs + Measurement Readiness — Plausible Analytics integration with `trackEvent` utility, CSP, env variables
- [x] **M2**: SEO Surfaces — City page converted from `'use client'` to server component with ISR, `generateStaticParams`, `generateMetadata`, canonical URLs stripping UTMs
- [ ] M3a: Provider Referral Loop MVP (not in this implementation)
- [ ] M3b: Community Partner Onboarding Kit (not in this implementation)
- [ ] M4: Content + Distribution (not in this implementation)
- [ ] M5: Version and Release Artifacts (not in this implementation)

## Files Modified

| Path | Changes | Lines |
|---|---|---|
| `src/app/layout.tsx` | Added conditional Plausible `<Script>` tag (Plan 035 M1) | ~8 |
| `next.config.js` | Added Plausible host to CSP `script-src-elem` and `connect-src` | ~3 |
| `env.local.template` | Added `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and `NEXT_PUBLIC_PLAUSIBLE_HOST` | ~5 |
| `env.template` | Added Plausible env variables | ~5 |
| `env.production.template` | Added Plausible env variables (domain=ummahflow.com) | ~5 |
| `env.uat.template` | Added Plausible env variables (domain=uat.ummahflow.com) | ~5 |
| `src/app/(public)/city/[cityName]/page.tsx` | **Major refactor**: `'use client'` → server component with ISR, generateStaticParams, generateMetadata | Full rewrite |

## Files Created

| Path | Purpose |
|---|---|
| `src/lib/analytics/plausible.ts` | `trackEvent(name, props?)` — typed, SSR-safe wrapper around Plausible JS API |
| `src/utils/canonicalUrl.ts` | `stripUtmParams(url)` and `generateCityCanonicalUrl(cityName, siteUrl)` — ADR-005 UTM canonicalization |
| `src/lib/supabase/static.ts` | `createSupabaseStaticClient()` — cookie-free Supabase client for ISR pages |
| `src/app/(public)/city/[cityName]/CityPageClientEffects.tsx` | Client island: syncs selected city to localStorage/sessionStorage, dispatches `city-selected` event |
| `src/app/(public)/city/[cityName]/CityStage1Content.tsx` | Client island: wraps `CityEarlyAccessEmptyState` with `handleReceiveUpdates` callback |
| `src/__tests__/lib/analytics/plausible.test.ts` | Unit tests for `trackEvent` (6 tests) |
| `src/__tests__/utils/canonicalUrl.test.ts` | Unit tests for `stripUtmParams` and `generateCityCanonicalUrl` (11 tests) |

## Code Quality Validation

- [x] TypeScript compilation: `npx tsc --noEmit` — 0 errors
- [x] ESLint: `npx next lint` — 0 errors
- [x] Build: `npm run build` — succeeds; city page shows `●` (SSG/ISR pre-rendered)
- [x] Tests: `npx vitest run` — 23 suites passed, 189 tests passed, 0 failures

## Value Statement Validation

**Original**: "As a Muslim seeker and local community member, I want to discover trustworthy providers in my city quickly and share them with others, so that UFlow becomes the default place I search (and recommend) before Google/Instagram."

**Implementation delivers**: City pages are now server-rendered with full metadata and canonical URLs — Google can index them, social shares display proper OG tags, and initial load contains real provider data (no empty shell). Plausible Analytics is wired in for decision-grade measurement of the seeker funnel (contact intent tracking) and provider funnel.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `trackEvent()` | `src/__tests__/lib/analytics/plausible.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/lib/analytics/plausible"` | ✅ Yes |
| `stripUtmParams()` | `src/__tests__/utils/canonicalUrl.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/utils/canonicalUrl"` | ✅ Yes |
| `generateCityCanonicalUrl()` | `src/__tests__/utils/canonicalUrl.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/utils/canonicalUrl"` | ✅ Yes |
| `CityPageClientEffects` | — | ⚠️ Thin client island | N/A | React component (side-effect only, renders null) | N/A |
| `CityStage1Content` | — | ⚠️ Thin client island | N/A | React wrapper (delegates to existing tested component) | N/A |
| `createSupabaseStaticClient()` | — | ⚠️ Infrastructure | N/A | Thin factory (mirrors existing pattern in server.ts) | N/A |

## Test Coverage

### Unit Tests (17 total, all passing)

**`src/__tests__/lib/analytics/plausible.test.ts`** (6 tests):
- Calls `window.plausible` with event name
- Calls with event name and props
- Does not throw when `window.plausible` is undefined
- Does not throw in SSR context
- Passes numeric and boolean props correctly
- Handles empty props object

**`src/__tests__/utils/canonicalUrl.test.ts`** (11 tests):
- Removes utm_source, utm_medium, utm_campaign
- Removes utm_term and utm_content
- Preserves non-UTM query parameters
- Returns URL unchanged when no UTM params
- Returns URL unchanged when no query params
- Removes `?` entirely when all params are UTM
- Case-insensitive UTM matching
- Generates canonical URL for city
- Encodes city names with special characters (München → M%C3%BCnchen)
- Trims whitespace from city name
- Strips trailing slash from siteUrl

## Test Execution Results

```
$ npx vitest run
 Test Files  23 passed | 1 skipped (24)
      Tests  189 passed | 18 skipped (207)
   Duration  3.77s
```

No test failures. The 1 skipped file (`SearchAndViewProvider.test.tsx`, 18 skipped tests) was already skipped before this implementation.

## Outstanding Items

### Not Implemented (Out of Scope for M1+M2)

- **M3a (Referral Loop MVP)**: Requires UI design decisions for share CTA, referral attribution DB schema, and rate limiting. Plan calls for Week 3.
- **M3b (Community Partner Kit)**: Parallel to M4, can slip to v0.7.1.
- **M4 (Content + Distribution)**: Non-code milestone (content calendar, launch strategy).
- **M5 (Version + Release)**: Deferred to release cycle.

### Event Instrumentation (M1 Follow-up)

The `trackEvent` utility is ready but custom events (`contact_intent_triggered`, `provider_profile_completed`) are not yet wired into `ProviderActionBar.tsx` and `ProviderCardModal.tsx`. This requires:
- Adding `trackEvent('contact_intent_triggered', { contact_type: 'phone', city })` to phone/website tap handlers
- Adding `trackEvent('provider_profile_completed', { city })` to provider creation flow
- These are CTA-level integrations that should be part of M3a or a follow-up PR

### Plausible Account Setup (DevOps)

The Plausible managed account needs to be created and `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` / `NEXT_PUBLIC_PLAUSIBLE_HOST` env vars set in production and UAT. The code is ready and safe — script tag only renders when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set.

### City Page ISR Note

The build output shows the city page as `●` (SSG) with pre-rendered cities from `generateStaticParams`. The root layout uses `cookies()` and `headers()` (for auth + language detection), which triggers Next.js warnings during build, but these are handled gracefully — the city page itself avoids dynamic functions via `createSupabaseStaticClient()`.

## Architectural Decisions

1. **`createSupabaseStaticClient()`**: Created a cookie-free Supabase client (`src/lib/supabase/static.ts`) because `createSupabaseServerClient()` calls `cookies()` via its `cookieAdapter`, which opts routes out of ISR. The static client uses `@supabase/supabase-js` directly with `NEXT_PUBLIC_*` env vars — appropriate for public reads.

2. **Client islands over monolithic client wrapper**: Rather than wrapping the entire city page in a single client component (which would negate ISR benefits for HTML), extracted two focused client islands:
   - `CityPageClientEffects` — side-effect-only component (renders null) for localStorage/sessionStorage sync
   - `CityStage1Content` — wraps `CityEarlyAccessEmptyState` to provide `handleReceiveUpdates` callback requiring browser APIs

3. **Conditional Plausible script**: The `<Script>` tag only renders when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set. This makes it safe for all environments without requiring a feature flag — dev/local simply doesn't set the variable.

## Next Steps

➡️ **NEXT**: Pick "⑥ Code Reviewer" from the Orchestrator handoff suggestions
   Gate: Review verdict must be APPROVED or APPROVED_WITH_COMMENTS
