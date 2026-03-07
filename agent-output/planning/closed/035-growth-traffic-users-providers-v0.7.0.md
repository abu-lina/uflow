---
ID: 035
Origin: 035
UUID: 10b4766e
Status: Released
---

# Plan 035 — Growth: More Traffic, Users, and Providers

## Plan Header

- **Target Release**: v0.7.0 (minor)
- **Epic Alignment**:
  - Master Product Objective: “Make UFlow the first thought when any Muslim seeks a service or business.”
  - Roadmap Epics leveraged for growth: **Epic 2.2 (City Community Pages & Discovery)** and (optional) **Epic 2.3 (Enhanced Provider Profiles with Rich Media)**
- **Status**: Released v0.7.0
- **Related Issues**: None

### Changelog

| Date (UTC) | Author | Change | Rationale |
|---|---|---|---|
| 2026-03-07T00:00Z | planner | Created plan | Establish a 4-week, KPI-driven acquisition plan aligned to the roadmap and current release train (v0.6.12 → v0.7.0). |
| 2026-03-07T21:30Z | critic | Verdict: REVISION REQUESTED | 1 CRITICAL (4 unresolved open questions), 2 MEDIUM (M3 scope risk, city page SSR), 1 LOW |
| 2026-03-07T21:30Z | planner | Revision: All findings addressed | Resolved all 4 open questions with codebase evidence; split M3 → M3a/M3b; added SSR constraint to M2 |
| 2026-03-07T23:35Z | qa | QA Complete | QA gates pass (type-check, lint, tests, build). QA report: `agent-output/qa/035-growth-traffic-users-providers-qa.md`. |
| 2026-03-07T23:50Z | uat | UAT Approved | APPROVED FOR RELEASE. M1+M2 deliver indexable city pages + Plausible analytics. All gates pass. UAT report: `agent-output/uat/035-growth-traffic-users-providers-uat.md`. |
| 2026-03-07T23:55Z | devops | Committed for v0.7.0 | Stage 1 complete. All Plan 035 changes staged and committed locally. Version bumped to 0.7.0. Documents moved to closed/. |
| 2026-03-08T00:05Z | devops | Released v0.7.0 | Stage 2 complete. Tag v0.7.0 pushed to origin. Smoke tests pass. |

## Value Statement and Business Objective

As a **Muslim seeker and local community member**, I want to **discover trustworthy providers in my city quickly and share them with others**, so that **UFlow becomes the default place I search (and recommend) before Google/Instagram**, creating compounding growth for both users and providers.

## Objective

Deliver a **4-week growth cycle** that measurably increases:

- **User acquisition** (sessions/users from organic + referrals)
- **Activation** (seekers reaching “value” actions like viewing provider details and taking contact/intention steps)
- **Provider acquisition** (new providers listed + claimed + completed profiles)

…while preserving UFlow constraints: **privacy-respecting tracking**, **fast performance**, and the existing **trust-first** product posture.

## Scope (What ships in v0.7.0)

### A) Acquisition surfaces (SEO + shareability)

- City discovery pages (Epic 2.2) that are **indexable**, performant, and have correct metadata.
- Basic structured data + social share previews so city/provider pages “look legit” when shared.

### B) Provider supply growth loop

- A referral/invite mechanism that makes it easy for:
  - users to recommend providers
  - providers to invite other providers
  - community organizers (mosques/orgs) to onboard providers in batches

### C) Measurement foundations

- A minimal, decision-grade event model for the seeker and provider funnels.
- UTM discipline for content/referral distribution so channel attribution is actionable.

## Explicit Non-Goals (Out of scope)

- Paid ads / paid acquisition spend (can be planned later after baseline and conversion clarity)
- Enterprise sales / large provider contracts (unless a clear inbound opportunity exists)
- “Track everything” analytics: only decision-critical events and properties

## Assumptions

- UFlow can target a small set of initial geographies (“launch cities”) for focus, rather than spreading effort across all cities.
- Existing provider listing/search foundation is stable enough that incremental discovery improvements will convert into real usage.
- Analytics/tracking can be implemented in a privacy-respecting way (no PII in events; consent where required).

## Open Questions

> All 4 open questions are **RESOLVED** as of 2026-03-07T21:30Z (Planner revision following Critic finding C-1).

### OPEN QUESTION (Geo focus) — RESOLVED

**Decision**: Launch with **Stuttgart, Berlin, and Frankfurt** as the three focus cities for v0.7.0.

**Rationale**: The schema (`supabase/migrations/017_create_cities_table.sql`) shows the cities table is Germany-only. Stuttgart, Berlin, and Frankfurt are strong early markets (population + business density + travel/connectivity) and are already in the seeded cities list. Concentrating effort on 3 cities creates measurable density rather than thin coverage across 20.

**Deferral plan**: Expand to Hamburg, München, Köln after each city exceeds 15 providers (Stage 3 threshold per city page logic).

---

### OPEN QUESTION (North-star activation) — RESOLVED

**Decision**: North-star activation for **seekers** = `contact_intent_triggered` (any phone/website/email tap from a provider view).

**Rationale**: `ProviderActionBar` (`src/components/providers/ProviderActionBar.tsx`) renders a live `tel:` link; `ProviderCardModal` (`src/components/providers/ProviderCardModal.tsx`) handles phone (`window.open(\`tel:...\`)`) and website taps. These actions already exist in production UI — they represent real intent exchange, not passive browsing. Tracking them requires zero new UI work.

North-star activation for **providers** = `provider_profile_completed` (provider record has name, category, address_city, and at least one contact field filled).

---

### OPEN QUESTION (Analytics stack) — RESOLVED

**Decision**: Adopt **Plausible Analytics** (managed EU-hosted preferred; self-hosted on Hetzner acceptable with guardrails).

**Rationale**:
- No analytics keys exist in any env template (`env.local.template`, `env.production.template`) — analytics is being added from scratch.
- UFlow targets German users → strict GDPR applies → cookie consent banners are required for GA4 and most commercial tools.
- Plausible is cookie-free and GDPR-compliant by design; no consent banner required.
- Managed EU-hosted Plausible minimizes ops burden; self-hosting on the existing Hetzner instance also aligns with EU-first, cost-conscious hosting philosophy.
- Lightweight script (~1KB); no bundle impact.

**Consent posture**: No cookie consent banner required for Plausible. For any future session-replay or ID-based tools, a proper consent implementation would be required first.

---

### OPEN QUESTION (Referral incentives) — RESOLVED

**Decision**: **Community/status-based rewards only** for v0.7.0. No monetary incentives.

**Rationale**:
- Monetary incentives (cash, credits) feel transactional and misalign with the Ummah-first brand.
- The trust badge system already exists in Postgres (migration 016, Epic 2.1, v0.3.0). A "Top Contributor" badge variant can be added at the DB level with minimal engineering cost.
- Existing users who recommend providers are already motivated by community benefit — this should be reinforced, not replaced with financial motivation.
- Monetary incentives require LTV calculations, fraud controls, and payout infrastructure. Deferred to v0.8.0 if community rewards prove insufficient.

**Badge types**: `COMMUNITY_CONNECTOR` (5+ accepted provider recommendations) and `CITY_BUILDER` (10+ accepted provider recommendations in a single city).

## Target Release and Versioning

- Current product version (roadmap + repo): **v0.6.12**
- This plan targets **v0.7.0** because it introduces **new growth features** (not just bugfixes) across SEO surfaces, referral mechanics, and measurement.

## Release Strategy

Release Strategy: Standalone (no other known active plans currently targeting v0.7.0 in `agent-output/planning/`).

## Milestone Dependencies

```mermaid
graph LR
  M1[M1: KPIs + Measurement] --> M2[M2: SEO/city pages (SSR)]
  M1 --> M3a[M3a: Referral loop MVP]
  M2 --> M4[M4: Content + distribution]
  M3a --> M4
  M4 --> M5[M5: Release artifacts]
  M3a -.->|parallel / fast-follow| M3b[M3b: Community partner kit]
  M3b -.-> M5
```

Sequencing rule: **M1 must land before M2, M3a, and M4** — experiments must be attributable. M3b runs parallel to M4 and can slip to v0.7.1 without blocking the release.

## Baseline & Measurements (Required)

### What will be measured

- **Acquisition**
  - Organic sessions to city/provider pages (Plausible page views, no PII, no cookies)
  - Referral sessions (UTM-tagged: source, medium, campaign)
- **Activation (seekers)** — North-star: `contact_intent_triggered`
  - City page → provider detail view conversion rate
  - `contact_intent_triggered` per provider detail view (phone tap = `tel:`, website tap, email tap — `ProviderActionBar` + `ProviderCardModal`)
- **Provider funnel** — North-star: `provider_profile_completed`
  - `provider_started` (created/imported)
  - `provider_profile_completed` (name + category + address_city + ≥1 contact field)
  - Referral submissions → provider created → profile completed

### Where measured

- **Tool**: Plausible Analytics (cookie-less; GDPR-aligned without a consent banner).
  - Preferred: managed EU-hosted Plausible (lowest ops burden)
  - Acceptable: self-hosted on Hetzner with basic guardrails (monitoring + backups; analytics-down must not break app)
- Plausible script added to Next.js layout; custom events fired via `plausible()` JS API for `contact_intent_triggered` and `provider_profile_completed`.
- UAT: validate events fire correctly in UAT environment before production cutover.
- Production dashboard: Plausible web dashboard (accessible to team only; no PII stored).

### Success thresholds

- Baselines are recorded for each KPI above **or** an explicit deferral is documented (owner + rationale + date) if production access is unavailable.
- Measurement Readiness & Signal Quality Index (from analytics-tracking skill) reaches **≥70 (“Usable with Gaps”)** before Week 3 experiments are evaluated.

### Allowed deferral conditions

- If the chosen analytics stack requires legal/consent setup not available this week, record:
  - which KPIs are deferred
  - who owns the legal/consent decision
  - what interim proxy metrics will be used (e.g., server logs for page hits)

## Plan (4-week growth cycle)

### Milestone 1 (Week 1): KPIs + Measurement Readiness

Objective: move from “opinions” to **decision-grade signals**.

Deliverables:

1. **Define the funnels and KPIs**
   - Seeker funnel: landing/city → browse → provider detail → contact intent
   - Provider funnel: recommend/import → created → claimed → completed
   - Acceptance:
     - A single “north-star” activation metric per side (seeker/provider)
     - 5–10 supporting KPIs max, each mapped to a decision

2. **Tracking model & governance**
   - Event naming conventions and required properties (no PII)
   - UTM taxonomy standard for all owned distribution
   - Acceptance:
     - Measurement Readiness & Signal Quality Index score calculated and recorded
     - Ownership and documentation location agreed (single source of truth)

3. **Validation gates**
   - Cross-browser/mobile verification for key events (PWA included)
   - Acceptance:
     - Events fire once, with correct properties, for core funnel actions

### Milestone 2 (Week 2): SEO Surfaces (City discovery as acquisition)

Objective: make Epic 2.2 city pages a growth engine.

**Architectural constraint** (Finding M-2 resolution + Arch 035): City pages at `/city/[cityName]` MUST be server components and SHOULD use **ISR** (segment-level revalidation) as the default. Route-level `'use client'` is prohibited on city pages. This aligns with the server-first architecture established in Plan 010 and avoids origin load spikes on a primary acquisition surface.

> Note: `src/app/(public)/city/[cityName]/page.tsx` is currently a `'use client'` component. This must be refactored to a server component (with client islands for interactive content only) as part of M2.

Deliverables:

1. **City pages converted to server components**
   - Refactor `/city/[cityName]/page.tsx` from `'use client'` to a server component that fetches city + provider data server-side
   - Interactive sub-components (stage transitions, city event dispatch) extracted as client islands
  - Caching: prefer ISR with a practical starting revalidation window (e.g., minutes, not hours) so stage thresholds reflect supply growth without per-request SSR
   - Acceptance:
     - No route-level `'use client'` on city page
     - Initial HTML contains provider data (not empty shells filled by JS)
     - Existing city stage logic (stage1/stage2/stage3 based on provider count) is preserved

2. **City pages are indexable and coherent**
   - Canonicals, metadata, and social share previews for city and provider pages
   - UTM discipline: indexable pages must not generate duplicate crawlable URLs due to `utm_*` query strings (canonicals should strip query strings; avoid making the route dynamic just to read UTMs)
   - Structured data where applicable (Organization/LocalBusiness patterns if appropriate)
   - Empty-state city pages show "Be the first" CTA (per Epic 2.2 AC); no thin/blank pages indexed
   - Acceptance:
     - City pages load quickly (no new perf regressions)
     - Social preview (OG title/description/image) is correct when shared for Stuttgart, Berlin, Frankfurt
     - Empty-state pages are either noindexed or show meaningful content (not blank)

3. **Internal linking + sitemap discipline**
   - Ensure city pages and top categories are discoverable from the site
   - Sitemap includes relevant pages (and excludes low-value duplicates)
   - Acceptance:
     - Crawling paths exist (home → cities → providers)
     - No obvious index bloat (thin/duplicate pages)

### Milestone 3a (Week 3): Provider Referral Loop — MVP

Objective: get the core referral primitive (share + attribute) into users’ hands. Scope deliberately minimal.

> **Finding M-1 resolution**: Original M3 was split into M3a (this milestone) and M3b (following milestone) to de-risk the Week 3–4 timeline. M3a ships the shareable link + attribution; M3b ships the community partner kit.

Deliverables:

1. **Referral loop MVP**
   - Trigger moments: after a seeker views provider details (`contact_intent_triggered`), after a provider completes their profile
   - Share mechanisms: **copy-link** (primary) + personalized UTM-tagged URL (no QR code in v0.7.0 — deferred to M3b or fast-follow)
   - Community/status reward: `COMMUNITY_CONNECTOR` badge awarded at 5 accepted provider recommendations
   - Acceptance:
     - Referral flow is understandable in ≤10 seconds (clear CTA + clear outcome)
     - Referral attribution is measurable via UTMs (source=referral, medium=invite, campaign=city-builder)
     - Badge award is visible on referrer’s profile

2. **Anti-spam and integrity**
   - Basic abuse controls (rate limits, auth required)
   - Recommend flow already exists (`/recommend-provider`); referral variant must not bypass existing moderation
   - Acceptance:
     - Referral submissions require authenticated user
     - Rate limit of ≤10 referral submissions per user per 24h
     - No new unauthenticated write surface

### Milestone 3b (Week 4, parallel with M4): Community Partner Onboarding Kit

Objective: enable mosque admins and community organizers to onboard providers in batches without bespoke engineering.

> This milestone runs in parallel with M4 (content/distribution). If M3b slips beyond the 4-week cycle, it becomes the first delivery of v0.7.1 — M4 does not depend on it.

Deliverables:

1. **Partner onboarding kit**
   - “Invite providers in your community” flow: partner gets a pre-filled, city-scoped referral link they can share with providers
   - `CITY_BUILDER` badge awarded at 10 accepted provider recommendations in a single city
   - Acceptance:
     - A partner can share the link without needing access to the UFlow admin panel
     - Providers completing signup via the link are attributed to the partner referrer

2. **Partner attribution**
   - Partner referral source tracked (UTM: campaign=partner-kit, medium=community)
   - Acceptance:
     - Partner referrals distinguishable from individual referrals in the analytics dashboard

### Milestone 4 (Week 4): Content + Distribution (Ship and learn)

> Note: M3b (Community Partner Kit) runs in parallel with this milestone. M4 does not depend on M3b.

Objective: turn new surfaces into sustained acquisition, not a one-off launch.

Deliverables:

1. **Content calendar (4 weeks) aligned to launch cities**
   - Content pillars: city guides, categories, community services, provider spotlights
   - Repurpose plan: blog → Instagram/TikTok → WhatsApp share cards → email
   - Acceptance:
     - 1–2 high-quality “pillar” pieces per launch city
     - UTM-tagged distribution plan (owned + partner channels)

2. **Launch strategy**
   - Lightweight announcement plan (community partnerships + social + email)
   - Acceptance:
     - Clear “what’s new” message + CTA for seekers and providers

3. **Experiment readout**
   - Compare Week 1 baseline vs Week 4 results
   - Acceptance:
     - A written decision: continue, iterate, or kill each experiment

### Milestone 5: Version and Release Artifacts

Objective: ship v0.7.0 cleanly and keep artifacts consistent.

Deliverables:

- Update version artifacts and changelog for **v0.7.0** (bundled with any other plans targeting the same release, if added later)
- Acceptance:
  - Version and release artifacts match v0.7.0
  - Changelog includes the user-visible growth improvements (SEO surfaces + referral/invite loop + measurement foundations)

## Prioritized Experiment Backlog (Rough)

1. **City pages as SEO landing pages (Epic 2.2)**
   - Hypothesis: city pages will drive organic acquisition and convert into provider detail views.
   - KPI: organic sessions → provider detail view rate.

2. **“Recommend a provider” → “Invite to claim” loop**
   - Hypothesis: seekers can seed supply faster than cold outreach.
   - KPI: recommend submissions → provider created → provider claimed.

3. **Provider profile completion nudges**
   - Hypothesis: richer profiles increase seeker activation and provider retention.
   - KPI: completion rate → contact intent actions per view.

4. **Partner onboarding kit (mosque/org)**
   - Hypothesis: 1 partner can onboard 20–50 providers faster than individual outreach.
   - KPI: invites sent → providers created/claimed.

## Testing Strategy (High Level Only)

- Unit tests for any tracking utilities and referral attribution helpers
- Integration tests for key flows (recommend → provider created; city page → provider detail)
- Basic accessibility checks for new CTAs (keyboard + ARIA)

## Risks and Mitigations

- **Privacy/compliance risk**: analytics + referrals can accidentally create PII collection.
  - Mitigation: strict event/property allowlist; no free-text properties; consent gating where required.
- **SEO risk**: thin/duplicate pages could hurt crawl quality.
  - Mitigation: canonical discipline + sitemap curation; noindex low-value variants.
- **Spam/abuse risk**: recommend/invite endpoints could be abused.
  - Mitigation: rate limiting, auth requirements where appropriate, moderation hooks.

## Duration Estimates (Rough)

- Analysis: 0.5–1.5 days (current funnels + analytics + SEO audit)
- Planning: 0.5 day (this doc + stakeholder alignment)
- Implementation: 5–10 days (spread across SEO/indexability, referral loop, instrumentation)
- Verification (dev checks): 1–2 days
- UAT: 0.5–1.5 days (mobile + PWA + share preview verification)
- DevOps: 0.5–1 day (release prep + deployment verification)

## Open Questions Status

All 4 open questions have been resolved (see §Open Questions above). No further decisions are deferred to the implementer for these items.
