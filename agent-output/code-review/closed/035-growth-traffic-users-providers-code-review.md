---
ID: 035
Origin: 035
UUID: 10b4766e
Status: Committed
---

# Code Review 035 — Growth: More Traffic, Users, and Providers (M1 + M2)

**Plan Reference**: `agent-output/planning/035-growth-traffic-users-providers-v0.7.0.md`
**Implementation Reference**: `agent-output/implementation/035-growth-traffic-users-providers-implementation.md`
**Architecture Reference**: `agent-output/architecture/035-growth-traffic-architecture-findings.md`
**Date**: 2026-03-07
**Reviewer**: Code Reviewer

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-07T22:00Z | Implementer → Code Reviewer | Review M1+M2 implementation | Plausible Analytics (M1) + City page ISR refactor (M2) for Plan 035 v0.7.0 |

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md`
**Alignment Status**: ALIGNED

- **ADR-005 (ISR for public pages)**: ✅ City page uses `revalidate = 300` with `generateStaticParams`. Verified in build output: `● /city/[cityName]` (SSG/ISR).
- **ADR-005 (UTM canonicalization)**: ✅ `generateMetadata` produces canonical URLs via `generateCityCanonicalUrl` and UTMs are stripped by `stripUtmParams`. OG tags set for Stuttgart, Berlin, Frankfurt.
- **ADR-004 (API route cache ownership unchanged)**: ✅ No `/api/*` cache headers were modified.
- **Server-first architecture (Plan 010)**: ✅ Route-level `'use client'` removed from city page. Client boundary pushed to two focused islands (`CityPageClientEffects`, `CityStage1Content`).
- **Cookie-free ISR**: ✅ New `createSupabaseStaticClient()` does not call `cookies()`, preserving the ISR boundary.
- **GDPR / analytics posture**: ✅ Plausible script renders conditionally (only when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set). Safe no-op in all envs without config.

## Path Refactor Checklist

No file moves or renames occurred. Not applicable.

## Agent Spec Checklist

No `.github/agents/*.agent.md` files modified. Not applicable.

## Deployment Path Audit

**Trigger**: Env template files modified (new `NEXT_PUBLIC_PLAUSIBLE_*` vars).

**Search performed**:
- `.github/workflows/` — grep for `PLAUSIBLE` → no matches
- `scripts/` — grep for `PLAUSIBLE` → no matches
- `deploy/` — no deployment scripts; nginx conf not affected

**Conclusion**: The new env vars are purely additive and optional. The Plausible Script conditionally renders only when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is present — absence silently skips it. No deployment entrypoints require updating. DevOps only needs to set the env vars in production/UAT secrets when activating Plausible.

## TDD Compliance Check

**TDD Table Present**: ✅ Yes
**All Rows Complete**: ✅ Yes (3 pure functions covered; 3 thin wrappers/infrastructure correctly waived with rationale)
**Concerns**: None — Red phase verified (import failure logged), Green phase verified (23/23 suites pass).

## Findings

### Critical
None.

### High
None.

### Medium

**[MEDIUM] Observability — RPC error silently suppressed (Fix-in-review applied)**
- **Location**: `src/app/(public)/city/[cityName]/page.tsx` (CityPage function, RPC call)
- **Issue**: The refactored server component had no logging when `get_provider_count_by_city` RPC failed — it silently fell back to `providerCount = 0` and rendered Stage 1 without any signal. The original client-side code logged `console.error('[City Page] Error fetching provider count:', ...)`. On an ISR page, a silent RPC failure causes incorrect Stage 1 rendering until the next revalidation cycle (up to 5 minutes) with no trace in server logs, making the failure invisible during incidents.
- **Fix applied**: Added `else if (rpcError) { console.error('[City Page] RPC get_provider_count_by_city failed:', rpcError); }` to restore the logging signal. This is a one-line restoration of explicitly defensive code from the original implementation.
- **Verification**: Re-check `src/app/(public)/city/[cityName]/page.tsx` line 83.

### Low

**[LOW] Test name misleads on empty-props behaviour**
- **Location**: `src/__tests__/lib/analytics/plausible.test.ts`, test: `'does not pass props object when props argument is empty object'`
- **Issue**: The test name says "does not pass props object" but the assertion `toHaveBeenCalledWith('page_view', { props: {} })` confirms the utility **does** pass `{ props: {} }`. Future maintainers reading the name would expect the opposite assertion.
- **Recommendation**: Rename to `'passes empty props wrapper when props argument is empty object'`.

**[LOW] `defer` prop redundant on `<Script strategy="afterInteractive">`**
- **Location**: `src/app/layout.tsx`, Plausible Script element
- **Issue**: `strategy="afterInteractive"` already handles deferred loading in Next.js 15. Adding `defer` as an explicit HTML attribute is redundant (though harmless — browsers ignore a second `defer` on an already-deferred script). The lint check passes because ESLint doesn't flag this combination.
- **Recommendation**: Remove the `defer` prop; `strategy="afterInteractive"` is sufficient.

### Info

**[INFO] No OG image in city page `generateMetadata`**
- **Location**: `src/app/(public)/city/[cityName]/page.tsx`, `generateMetadata`
- **Issue**: Social shares will show no preview image. Acceptable for v0.7.0 but weakens shareability (the core M2 goal). Plan M4 (content/distribution) should add city-specific or generic OG images.
- **Action**: Deferred to M4 content milestone.

**[INFO] `CategoryGallerySection` receives no `cityName` prop (Stage 3)**
- **Location**: `src/app/(public)/city/[cityName]/page.tsx` — preserved from original behaviour.
- **Issue**: Stage 3 render passes `cityName` to `MobileGreetingHeader` but not to `CategoryGallerySection`. This is pre-existing behaviour — not a regression introduced by this PR.
- **Action**: Track as a follow-up if `CategoryGallerySection` needs to scope its query by city.

**[INFO] `trackEvent` event instrumentation not yet wired to CTAs**
- **Location**: `src/components/providers/ProviderActionBar.tsx`, `ProviderCardModal.tsx`
- **Issue**: The `trackEvent` utility is production-ready, but `contact_intent_triggered` events are not yet called on phone/website taps. `provider_profile_completed` is not yet called in the provider creation flow.
- **Action**: Explicitly documented in the implementation doc Outstanding Items. Expected in M3a or a follow-up PR. Not a blocker for M1/M2 approval.

## Positive Observations

- **Excellent ISR boundary management**: The decision to create `createSupabaseStaticClient()` as a cookie-free client is architecturally sound and precise. The implementation doc clearly explains the reasoning (avoids `cookies()` opt-out).

- **Tight client island decomposition**: Two focused client islands (`CityPageClientEffects` renders null; `CityStage1Content` holds the callback with browser-API dependencies) is the correct pattern. The server component is genuinely static after data fetch — no state, no effects.

- **TDD for pure functions**: All three pure functions (`trackEvent`, `stripUtmParams`, `generateCityCanonicalUrl`) have complete test-first coverage with clear RED-phase failure verification documented. 17 new unit tests with good edge-case coverage (URL without trailing `?`, special chars, SSR no-op).

- **`trackEvent` SSR safety**: The `typeof window === 'undefined'` guard plus `typeof window.plausible !== 'function'` check correctly covers both SSR and race conditions where the script hasn't loaded yet.

- **Conditional Plausible script**: Gating on `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` means the analytics script never renders in dev/local without explicit opt-in. No feature flag required — the env var absence is the flag.

- **CSP updated atomically**: Both `script-src-elem` and `connect-src` were updated in the same change, preventing a state where the script can load but its beacons are blocked by the CSP.

## Summary of Files Reviewed

| File | Status | Notes |
|---|---|---|
| `src/lib/analytics/plausible.ts` | ✅ Clean | Correct type extension, SSR guard, clear docs |
| `src/utils/canonicalUrl.ts` | ✅ Clean | Two-pass delete loop (avoids mutating during iteration) correct; regex case flag |
| `src/lib/supabase/static.ts` | ✅ Clean | `server-only` import, follows existing factory pattern |
| `src/app/(public)/city/[cityName]/page.tsx` | ✅ Fixed | Fixed-in-review: added RPC error log |
| `src/app/(public)/city/[cityName]/CityPageClientEffects.tsx` | ✅ Clean | Correctly renders null; try/catch preserved |
| `src/app/(public)/city/[cityName]/CityStage1Content.tsx` | ✅ Clean | Preserves original callback logic faithfully |
| `src/app/layout.tsx` | ✅ Clean | Conditional render correct; LOW: `defer` redundant |
| `next.config.js` | ✅ Clean | Follows existing env-var-in-CSP pattern |
| `env.*.template` (×4) | ✅ Clean | Additive & backward-compatible |
| `src/__tests__/lib/analytics/plausible.test.ts` | ✅ Clean | LOW: one test name misleading |
| `src/__tests__/utils/canonicalUrl.test.ts` | ✅ Clean | Good edge case coverage |

## Verdict

**Status**: APPROVED_WITH_COMMENTS

**Rationale**: Implementation is architecturally correct, TDD-compliant, and passes all validation gates (0 type errors, 0 lint errors, 189 tests passing, clean build with city page as `●` SSG). One MEDIUM finding (silent RPC error suppression) was fixed in-review — a small, well-understood one-line restoration of defensive logging. All remaining findings are LOW/INFO and do not warrant blocking.

## Required Actions

None — the MEDIUM finding was resolved in-review.

## Optional Improvements (Non-blocking)

1. Rename the misleading test in `plausible.test.ts` (LOW — clarify "does not pass" → "passes empty wrapper"). Can be done in any follow-up commit.
2. Remove `defer` prop from Plausible `<Script>` component in layout.tsx (LOW — cosmetic).
3. Add OG image to city page metadata in M4. (INFO)
4. Wire `trackEvent('contact_intent_triggered', ...)` into `ProviderActionBar.tsx` and `ProviderCardModal.tsx` as part of M3a. (INFO — documented in implementation Outstanding Items)

## Next Steps

Handing off to qa agent for test execution.
