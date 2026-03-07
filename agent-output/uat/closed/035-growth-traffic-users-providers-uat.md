---
ID: 035
Origin: 035
UUID: 10b4766e
Status: Committed
---

# UAT Report: Plan 035 — Growth: More Traffic, Users, and Providers (M1 + M2)

**Plan Reference**: `agent-output/planning/035-growth-traffic-users-providers-v0.7.0.md`
**Date**: 2026-03-07T23:40Z
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date (UTC) | Agent Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-07T23:40Z | QA → UAT | QA Complete — validate objective alignment | UAT Complete — APPROVED FOR RELEASE. M1+M2 deliver the stated SEO and measurement value. All automated gates pass. |

---

## Value Statement Under Test

> "As a **Muslim seeker and local community member**, I want to **discover trustworthy providers in my city quickly and share them with others**, so that **UFlow becomes the default place I search (and recommend) before Google/Instagram**, creating compounding growth for both users and providers."

---

## Value-Evidence Preflight

Plan deliverables scoped to this implementation (M1+M2):

| Milestone | Deliverable | Status |
|---|---|---|
| M1 | `trackEvent()` SSR-safe Plausible wrapper | ✅ Delivered |
| M1 | Conditional `<Script>` in root layout | ✅ Delivered |
| M1 | CSP updated (`script-src-elem`, `connect-src`) | ✅ Delivered |
| M1 | Env templates updated with `NEXT_PUBLIC_PLAUSIBLE_*` | ✅ Delivered |
| M2 | City page converted from `'use client'` to Server Component + ISR | ✅ Delivered |
| M2 | `generateStaticParams()` for seeded cities | ✅ Delivered |
| M2 | `generateMetadata()` with UTM-stripped canonical + OG tags | ✅ Delivered |
| M2 | `createSupabaseStaticClient()` — cookie-free ISR-safe client | ✅ Delivered |
| M2 | Client islands (`CityPageClientEffects`, `CityStage1Content`) | ✅ Delivered |
| M2 | Server-side RPC error logging (fix-in-review) | ✅ Delivered |

Acknowledged out-of-scope (not a UAT finding):
- M3a/M3b (referral loop, partner kit), M4 (content/distribution), M5 (release artifacts)
- `trackEvent` CTA wiring into `ProviderActionBar` / `ProviderCardModal` (planned for M3a)

All user-visible M1+M2 milestones are present. **Value-evidence preflight: PASS.**

---

## UAT Scenarios

### Scenario 1: City page is discoverable by search engines

- **Given**: A user shares `/city/Berlin` on WhatsApp or Google indexes the page
- **When**: The crawler or link-previewer fetches the URL
- **Then**: Full HTML is returned immediately (no empty shell requiring JS execution); `<head>` contains `<link rel="canonical">` pointing to `https://ummahflow.com/city/Berlin`; OG title and description are populated for Berlin
- **Result**: PASS
- **Evidence**: Build output shows `● /city/[cityName]` (SSG/ISR pre-rendered); `generateMetadata()` sets `alternates.canonical` via `generateCityCanonicalUrl(cityName, siteUrl)`. Unit tests confirm canonical URL is correctly structured for Berlin, Hamburg, München.

### Scenario 2: UTM-tagged social share does not create a duplicate crawlable URL

- **Given**: A post on Instagram links to `/city/Stuttgart?utm_source=instagram&utm_medium=social&utm_campaign=ramadan`
- **When**: A seeker clicks the link and Google later crawls the URL
- **Then**: The `<head>` canonical points to `/city/Stuttgart` (no UTM params), preventing Google from treating the UTM variant as a separate page
- **Result**: PASS
- **Evidence**: `stripUtmParams()` has 11 unit tests (including case-insensitive matching, partial UTM removal, URL unchanged when no UTMs). `generateCityCanonicalUrl()` builds canonical from city name only — `searchParams` is not passed to the server component, so UTM params structurally cannot affect the canonical.

### Scenario 3: Analytics measurement is GDPR-compliant and zero-friction

- **Given**: UFlow is visited by a German user who expects no cookie banner for analytics
- **When**: The page loads in production (with `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` set)
- **Then**: The Plausible script loads without placing a cookie; no consent banner is required; `trackEvent()` can be called without throwing in SSR or before the script loads
- **Result**: PASS
- **Evidence**: Plausible is cookie-free (by product design). `<Script>` only renders when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set (safe no-op in dev/local). `trackEvent()` guards against both SSR (`typeof window === 'undefined'`) and script-not-loaded (`typeof window.plausible !== 'function'`). 6 unit tests confirm all guard conditions.

### Scenario 4: Analytics measurement does not break in development / staging

- **Given**: A developer runs `npm run dev` without setting `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- **When**: Any page loads and `trackEvent()` is called
- **Then**: No errors are thrown; no Plausible request is made; developer experience is unaffected
- **Result**: PASS
- **Evidence**: Conditional `<Script>` (env-var gate); `trackEvent()` no-op when `window.plausible` is absent. Both confirmed by unit tests.

### Scenario 5: City page RPC failure is observable (not silent)

- **Given**: The Supabase RPC `get_provider_count_by_city` fails (network error, DB issue)
- **When**: A city page is rendered during revalidation or on-demand
- **Then**: The page renders (Stage 1 fallback with `providerCount = 0`); a `console.error` is emitted to server logs so on-call is alerted
- **Result**: PASS
- **Evidence**: Code review confirmed the `else if (rpcError) { console.error(...) }` block was added as a fix-in-review. Verified in `src/app/(public)/city/[cityName]/page.tsx`.

### Scenario 6: ISR does not accidentally opt out of caching

- **Given**: The city page uses `createSupabaseStaticClient()` (cookie-free) instead of `createSupabaseServerClient()` (which calls `cookies()`)
- **When**: Next.js builds or revalidates the page
- **Then**: No `DYNAMIC_SERVER_USAGE` error is triggered by the city page's own data fetch; the route appears as `●` (SSG) in the build route table
- **Result**: PASS
- **Evidence**: Build output: `├ ● /city/[cityName]` with pre-rendered city entries (Berlin, Hamburg, München). The "Dynamic server usage" stacks seen in build logs are from _other_ routes (e.g., `/privacy-policy`, `/manual-user`, `/figma-test`) using `cookies()`/`headers()` in the root layout or their own components — not from the city page's data fetch.

---

## Performance Timing Gate

No explicit cold/warm latency thresholds were defined in Plan 035 for M1+M2. ISR `revalidate = 300` (5 min) is the freshness constraint, not a latency target.

**Status**: Not applicable as a blocking gate for this delivery.  
If latency measurement is needed in production, DevOps should validate Time-To-First-Byte on `/city/Berlin` post-deployment (expected: <200ms warm from Cloudflare, <800ms cold from Hetzner).

---

## Focus/Scroll Side-Effects Assessment

`CityPageClientEffects` renders `null` — no DOM output, no `focus()` calls. `CityStage1Content` wraps an existing component that has been tested previously. No explicit `focus()` calls introduced in either island.

**Mobile input/keyboard/scroll risk**: LOW. Manual on-device validation is deferred; no blocking scenarios identified.

---

## Value Delivery Assessment

The core value of M1+M2 is **establishing the growth foundation**:

1. **SEO surface**: City pages are no longer invisible to search engines. Crawlers receive complete HTML on first byte. Canonical URLs are clean. OG tags enable rich social previews. This is the single most impactful change for organic user acquisition.

2. **Measurement readiness**: Plausible analytics is wired into the root layout and ready to activate. The `trackEvent()` utility is available for M3a CTA instrumentation. The plan correctly requires measurement to precede experimentation — this gate is now open.

3. **ADR-005 compliance**: ISR + UTM-stripped canonicals were explicitly specified in the architecture. Delivered as specified.

Is core value deferred? **No.** The two foundational milestones are fully delivered. M3–M5 are future-cycle work and explicitly acknowledged as out-of-scope.

---

## QA Integration

**QA Report Reference**: `agent-output/qa/035-growth-traffic-users-providers-qa.md`  
**QA Status**: QA Complete  
**QA Findings Alignment**: No QA failures. QA noted one deferred manual check (live HTML inspection of canonical tag in the running app) and pre-existing lint warnings in unrelated test files. Neither is a blocker.

---

## Technical Compliance

| Check | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | ✅ PASS | Exit 0 |
| `npx next lint` | ✅ PASS | Exit 0; warnings in unrelated test files (pre-existing) |
| `npx vitest run` | ✅ PASS | 23 suites passed / 1 skipped; 189 tests passed / 18 skipped; 0 failures |
| `npm run build` | ✅ PASS | Exit 0; `● /city/[cityName]` confirmed SSG/ISR |
| TDD compliance | ✅ PASS | Red-phase verified for all 3 pure functions |
| ADR-005 (ISR + UTM canonical) | ✅ PASS | Delivered as architected |
| GDPR / analytics posture | ✅ PASS | Cookie-free, consent-banner-free |
| CSP integrity | ✅ PASS | `script-src-elem` + `connect-src` updated atomically |

**Known limitations / residual items** (none are blockers):

1. Test name in `plausible.test.ts` misleads on empty-props behaviour (LOW — code review noted; cosmetic)
2. `defer` prop redundant on `<Script strategy="afterInteractive">` in `layout.tsx` (LOW — harmless)
3. No OG image on city page (INFO — deferred to M4 content milestone)
4. `trackEvent` not yet wired to `ProviderActionBar` / `ProviderCardModal` CTAs (INFO — M3a scope)
5. Plausible managed account setup pending (DevOps action — code is ready)

---

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES  
**Evidence**: The plan objective is "measurably increase user acquisition via organic + referrals." The M1+M2 implementation delivers the measurement substrate (Plausible) and the primary organic acquisition surface (indexable city pages). Without these, the growth cycle cannot be measured or attributed. With these, every subsequent milestone (referral loop, content, distribution) has a foundation to land on.  
**Drift Detected**: None. The implementation faithfully delivers what was scoped for M1+M2, explicitly marks M3–M5 as out-of-scope, and documents the path forward (trackEvent CTA wiring in M3a, Plausible account setup by DevOps).

---

## UAT Status

**Status**: UAT Complete  
**Rationale**: All M1+M2 milestones delivered. Predecessor chain complete (Implementation → Code Review APPROVED_WITH_COMMENTS → QA Complete). All automated gates pass. The implementation directly and demonstrably enables the stated business value: city pages are now indexable by search engines and Plausible is ready to measure the seeker funnel. No objective drift detected.

---

## Release Decision

**Final Status**: APPROVED FOR RELEASE  
**Rationale**: Implementation is architecturally aligned (ADR-005), TDD-compliant, fully passing all CI gates, code-reviewed and approved, and delivers the foundational growth assets — indexable city pages and GDPR-compliant analytics — ahead of the referral/distribution milestones. Residual items are all LOW/INFO and have documented follow-up paths.

**Recommended Version**: `v0.7.0` (minor) — new user-facing features (city page SSR, analytics), no breaking changes.

**Key Changes for Changelog**:

- City pages (`/city/[cityName]`) converted to ISR server components — fully indexable by search engines; 5-minute revalidation; pre-rendered for Berlin, Hamburg, München
- Plausible Analytics integration — cookie-free, GDPR-compliant; activates when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env var is set
- UTM-stripped canonical URLs on city pages — prevents duplicate crawlable URLs from referral/campaign traffic
- CSP allowlist updated for Plausible script and beacon hosts
- `createSupabaseStaticClient()` — new cookie-free Supabase client enabling ISR on acquisition pages

---

## Next Actions

**DevOps actions before activation**:

1. Create Plausible account (EU region) and set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=ummahflow.com` in production secrets
2. Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=uat.ummahflow.com` in UAT secrets
3. Post-deploy: smoke-test `/city/Berlin` — verify `<link rel="canonical">` in HTML and Plausible dashboard shows pageview

**M3a follow-up** (next implementation cycle):

- Wire `trackEvent('contact_intent_triggered', ...)` into `ProviderActionBar.tsx` and `ProviderCardModal.tsx`
- Wire `trackEvent('provider_profile_completed', ...)` into provider creation flow
