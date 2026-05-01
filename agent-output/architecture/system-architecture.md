# UFlow System Architecture (Evergreen)

**Last Updated**: 2026-04-27
**Status**: Active

## Changelog

| Date       | Change                                                  | Rationale                                                                 | Related             |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------- |
| 2026-01-27 | Initialized evergreen architecture doc in agent-output  | Architect-mode requires a single source of truth for current system state | Plan 001 (Epic 2.1) |
| 2026-02-22 | App Router best-practices audit findings captured       | Document current Next.js boundary/caching risks for planned refactor      | Arch 010            |
| 2026-02-23 | Repo-structure review findings captured                 | Reduce boundary drift; keep folder responsibilities crisp                 | Arch 011            |
| 2026-02-23 | Root-level file placement guidance captured             | Reduce root clutter; align files to docs/scripts/sql/imports conventions  | Arch 012            |
| 2026-03-02 | Agent memory tooling decision captured                  | Flowbaby reliability issues; record local-first replacement direction     | Arch 032            |
| 2026-03-07 | Performance optimization architecture findings captured | Align caching, rendering, and telemetry for durable performance wins      | Arch 033            |
| 2026-03-07 | Growth plan (city pages + analytics) architecture decisions captured | Establish ISR-first city acquisition pages, UTM canonicalization, and analytics guardrails | Arch 035            |
| 2026-03-08 | Captured Plausible analytics ADR | Make analytics deployment + privacy guardrails explicit for upcoming activation/instrumentation work | Arch 035 / Plan 036 |
| 2026-03-24 | Removed legacy in-app admin panel UI | Reduce privileged UI surface; preserve API-only admin tools and newer review workflows | Arch 054            |
| 2026-03-29 | Plan 065: Enrichment Pipeline — new subsystem, ADR-007 (staging-first), ADR-008 (pg_cron-in-migrations), Problem Areas 8–9 | First automated background actor in system; establishes scheduling, staging, and module-boundary constraints | Arch 065            |
| 2026-04-07 | Modal.tsx a11y refactor — 9 gaps mapped: focus trap, focus restore, aria-hidden, escape scoping, drag-close, scroll lock, aria-labelledby, exit animation, z-index. 4 new hooks, 9 ADRs. Design debt: z-index proliferation, multiple modal impls, redundant ARIA. | Close critical/high a11y gaps in base Modal without breaking consumers; establish reusable dialog hooks | Arch 086            |
| 2026-04-19 | Offers schema evolution ADR (Plan 094): add `provider_menu_items` (food) + `provider_service_offers` (business) typed tables. Global `offers` vocabulary preserved. Was? search confirmed fully wired for vocabulary search; item-level search requires migration 068. | Current offers table is a shared tag vocabulary — insufficient for pricing, per-provider catalog, and future ordering. Separate instance tables with STORED TSVECTOR chosen over STI or JSONB. | ADR-094 |
| 2026-04-20 | Three-section catalog hierarchy ADR (Plan 095): add `community_projects` under `community_services` (ummah item-level), `categories.applicable_section` for section scoping, three-table ordering FK pattern settled. `provider_stats` MV extended with `community_project_count`. | Completes FOOD/UMMAH/STORES symmetry. Three separate item tables (no CTI base) confirmed as the ordering-FK architecture. Supersedes ADR-094/D7 open question. | ADR-095 |
| 2026-04-23 | Food category model ADR (096): Single `category_id` per provider confirmed for nationality cuisines. 22 cuisine categories to be seeded as `applicable_section = 'food'`. No schema change; no junction table. Fusion edge case mitigated by item-level search (`provider_menu_items`). Extension path: `cuisine_tags TEXT[]` deferred until user feedback warrants it. | YAGNI/KISS: multi-category touches 7+ query/UI/filter layers for <5% of listings. Single category preserves all existing patterns and is consistent across sections. | ADR-096 |
| 2026-04-27 | Badge/Boolean data coherence ADR (105): Creation path writes `barakah_effects` only — never sets boolean columns or creates badge rows. Badge endorsement triggers don't propagate to booleans. One-time backfill (migration 067) has no ongoing sync. Section-specific filter semantics differ (STORES requires `muslim_owned`, FOOD treats it as optional, UMMAH has no boolean columns). Problem Area 11 added. | Plan 105 filter wiring surfaced that the three data systems (booleans, badges, barakah_effects) are disconnected — new providers are invisible to search filters. | ADR-105 |
| 2026-04-29 | Full public schema audit (Plan 114) — live-verified against Supabase DB: 8 severity-ranked findings across 29 tables, 159 indexes, 10 enums. CRITICAL: dual-PK anti-pattern (6 tables), migration 076 badge→boolean trigger MISSING from live DB. HIGH: UUID array columns (4 cols), barakah_effects triple-source incoherence, polymorphic FK without enforcement (2 tables). MEDIUM: boolean flag proliferation (45-col providers), schema cohesion. LOW: 10 redundant indexes. Problem Area 12 added. | Structural debt assessment before staged schema refactor. F-8 (missing trigger) is immediate; F-3 (new providers invisible to search) is most urgent user-facing issue. | Arch 114 |
| 2026-04-30 | Cross-environment audit (Plan 114, prod + dev) — F-8 downgraded from CRITICAL to LOW (badge sync trigger exists on prod+dev, local-only gap). Two new findings: F-9 MEDIUM (schema divergence — `consent_logs` on local+dev only, `deletion_logs` on prod only), F-10 LOW (duplicate `updated_at` triggers on `providers`). Index drift: local=159, prod=163, dev=173. Trigger drift: local=13, prod=19, dev=24. Total: 10 findings (1 CRITICAL, 3 HIGH, 3 MEDIUM, 3 LOW). | Environment parity is now a known risk. Migration hygiene issues confirmed across all three environments. | Arch 114 |
| 2026-04-29 | ADR-114: Migration Baseline Squash — prod schema as canonical baseline. Historical 81-file migration chain to be archived; prod dump becomes `001_baseline.sql`. New F-11 finding (HIGH): three environments have completely independent migration management (prod=no tracking, dev=4 timestamp migrations, local=81 numeric migrations). Problem Area 13 added. | 81-migration replay encodes past decisions, not target schema. Patching historical chain is backwards; prod is the only authoritative state. Confirmed via MCP: prod has no `supabase_migrations.schema_migrations`, dev tracks 4 unrelated migrations. | ADR-114 / Arch 114 |
| 2026-05-01 | ADR-118: Provider Attribute Model — trust vs amenity distinction added. FL-23 finding documents root cause of badge/boolean fragmentation: three disconnected registries (badge_types, boolean columns, filterKeys.ts), hardcoded trigger CASE. Recommendation: extend badge_types with attribute_category + provider_column_name + is_filterable + data-driven trigger. Problem Area 14 added. | Owner review surfaced that "can community confirm this?" vs "is this a factual declaration?" is a meaningful distinction not captured in the schema. Three registries must collapse to one. | Arch 118 |
| 2026-05-01 | ADR-118 revised — owner-validated classification applied (amenity = physical/usable; trust = values/practice claim). FL-24 added: `solidarity_pricing` name mismatches intent (economic solidarity, not pricing); business-only CHECK too restrictive. FL-25 added: `accepts_donations` inverts meaning (provider makes donations, not receives); ummah-only CHECK excludes food/business providers. Problem Area 14 updated. | Owner clarification confirmed prayer space, parking, women section, family friendly = amenity; all others = trust. Two column renames and CHECK revisions required. | Arch 118 |
| 2026-05-01 | FL-26 added — full supertype unification for providers + community_services. Column overlap analysis: community_services duplicates 24 of 35 columns from providers (69%). Owner confirmed pre-consumer timing. Full unification recommended: add 'ummah' to listing_type_enum, merge community_services into providers, create food_providers / business_providers / ummah_providers extension tables, rename community_projects FK, rename provider_community_services → provider_support_links, simplify bookmarks to single FK. Problem Area 15 added. | Pre-consumer window is the only time this is zero-risk. Full unification eliminates 24 duplicate columns and makes badge/trust/search work natively across all three entity types. | Arch 118 |
| 2026-05-01 | FL-28 added — `listing_type = 'business'` naming split confirmed. UI already shows "Stores" (`sections.stores` key); developer left explicit comment in `SectionSelector.tsx` noting the intentional data-model split. Recommend bundling `'business'` → `'store'` enum rename into FL-26 migration. `provider_service_offers` has no app service layer (zero results from `search_provider_items` RPC store branch). Both catalog tables renamed for consistency: `provider_menu_items` → `provider_menu`, `provider_service_offers` → `provider_catalog` — keeps `provider_*` convention, eliminates "offers" overloading, clean parallel pair. | Confirms UI-layer decision already made — data model must catch up. Zero marginal cost if bundled into FL-26. | Arch 118 |
| 2026-05-01 | Pre-implementation audit of Plan 116 against migration chain (001–078). 6 conflicts found. CRITICAL: enum RENAME VALUE breaks 2 CHECK constraints + 1 partial index that embed `'business'::listing_type_enum` in expression text. HIGH: FL-1/FL-2 already implemented in migration 006; M-3 CHECK recreation conflicts with M-5 column drops. MEDIUM: FL-3 column DROP missing; cities.trust_level range 0-10 vs baseline comment 0-100. Architectural recommendation: section-scoped CHECKs should move from providers supertype to extension tables post-M-5. | Implementer discovered FL-1/FL-2 conflict at start of M-1. Full cross-reference triggered by owner. | Arch 116 |

---

## Purpose

UFlow (Ummah Flow) is a community services marketplace that connects Muslims with halal businesses and community services. The platform prioritizes **trust-first discovery** and **city-based community building** to strengthen the Ummah.

---

## High-Level Architecture

### Runtime Topology

- **Client**: Browser + PWA
- **Edge**: Cloudflare (CDN, security) → Nginx (reverse proxy)
- **App**: Next.js 15 (App Router) in Docker (Hetzner)
- **Backend**: Supabase (Auth, Postgres, Storage)
- **External**: Resend (email), OpenStreetMap/Nominatim (geocoding)

### Key Architectural Principle

**Postgres-first**: Prefer Postgres-native capabilities (RLS, views, indexes, triggers, full-text search) before adding external services.

### Automated Background Actor (Plan 065+)

From Plan 065 onward, UFlow includes a **time-driven subsystem** alongside the existing request-driven core:

- **Scheduler**: pg_cron (definition in migration files — see ADR-008)
- **Trigger path**: pg_cron → pg_net HTTP POST → Supabase Edge Function
- **Actor**: `IMPORT_BOT_UUID` sentinel (system-initiated writes, distinct from operator writes)
- **Output**: `enrichment_candidates` staging table (see ADR-007)
- **Outbound fetches**: External source URLs (JoinHalal Phase 1; Lieferando/TripAdvisor/Instagram Phase 2+) originate from Supabase shared Edge Function infrastructure

---

## Core Components

### Import & Enrichment Pipeline

UFlow maintains a multi-phase data ingestion architecture for provider enrichment:

**Phase 1 — Manual CLI Import (existing)**:
- `scripts/import-joinhalal.ts` — operator-triggered import CLI (dry-run / write modes)
- `src/lib/import/joinhalal.ts` — import library
- `src/utils/joinhalal-parser.ts` — Rank Math JSON-LD parser
- `upsert_joinhalal_providers` RPC — idempotent Postgres upsert (migration 064)
- Source: JoinHalal listing pages (server-rendered, Rank Math JSON-LD)

**Phase 2 — Automated Enrichment Pipeline (Plan 065)**:
- `scripts/enrich-providers.ts` — CLI enrichment runner (dry-run / write modes)
- `src/lib/enrichment/joinhalal-enricher.ts` — ESM-compatible enrichment core (must work in both Node and Deno runtimes — see A-1)
- `supabase/functions/enrich-providers/` — Deno Edge Function, scheduled via pg_cron
- `enrichment_candidates` table — staging inbox (ADR-007); admin must approve before application to `providers`
- `enrichment_run_logs` table — normal + debug telemetry for each run
- Scheduling: weekly by default (pg_cron in migration file — ADR-008); cadence configurable
- Secrets: function URL + anon key stored in Vault

**Admin Enrichment Review Surface (Plan 065 M3)**:
- Extends Plans 058+061 admin moderation UI
- Route: admin-only, service-role client, server-side Route Handlers
- Admin approves/rejects/bulk-approves enrichment candidates; apply writes to `providers`
- Admin-field preservation (Plan 052) enforced at server layer

### Next.js Application (src/)

- **App Router**: Route-driven features, server components by default
- **API Routes**: Server-side boundaries for privileged operations
- **Services Layer**: All Supabase queries go through src/services/

### Supabase (Auth + Postgres + Storage)

- **Auth**: Email/password + cookie session handling
- **Postgres**: Domain tables + RLS (privacy + tenancy)
- **Storage**: Provider images and media
- **Edge Functions**: Deno runtime; currently `send-confirmation-email` (Resend) and `enrich-providers` (Plan 065)
- **pg_cron** (Plan 065+): Scheduled job definitions live in migration files; job registration via `cron.schedule()`
- **pg_net** (Plan 065+): Used by pg_cron to POST to Edge Function endpoints; auth via Vault secrets

---

## Key Runtime Flows

### 1) Discovery (Search → Provider Detail)

1. User searches by query/category/location.
2. Next.js queries Postgres via services.
3. Results render provider cards; user opens provider detail.

### 2) Early Access / City-based Community Mode

1. Unlaunched app routes gate users through early-access flow.
2. User selects city / recommends providers.
3. City interest captured for unlock strategy.

---

## Trust & Verification Subsystem (Epic 2.1 Target)

### Current State (Already Present)

A badge/trust schema exists in Postgres (migration 016) with:

- Badge types
- Badges attached to providers/community_services
- Community confirmations
- Admin verification audit trail
- Config-driven confirmation threshold

A services module exists for badge operations.

### Architectural Intent

Use badges as the primitive for trust signals:

- **Self-declared**: provider claims
- **Community confirmed**: community endorsements reach threshold
- **UFlow verified**: admin/authority verification

### Data Coherence Gap (ADR-105)

Three disconnected data systems currently represent provider attributes:

| System | Write Path | Read Path | Sync |
|---|---|---|---|
| `barakah_effects` (TEXT[]) | Creation form | Legacy display | None to booleans or badges |
| `providers.*` boolean columns | Migration 067 backfill (one-time) | Search filters (Plan 105) | No ongoing sync |
| `provider_badges` rows | Manual/admin creation | Detail page trust display | Triggers update own trust_level only |

**Result**: Providers created after migration 067 have all boolean columns defaulting to `false`, regardless of what the owner claims or consumers endorse. Plan 105's filters will miss them.

**Target data flow** (see ADR-105):
```
Creation Form → badge row (SELF_DECLARED) → Postgres trigger → boolean column
Endorsement  → trust_level upgrade      → boolean unchanged (already true)
Search Filter → reads boolean (fast, indexed)
Detail Page   → reads badge (trust level, confirmation count)
```

### Section-Specific Filter Semantics

| Attribute | FOOD | STORES | UMMAH |
|---|---|---|---|
| `muslim_owned` | Optional filter | **Listing invariant** (must be true) | N/A (no column) |
| `has_prayer_space` | Optional filter | Optional filter | N/A |
| `has_parking` | Optional filter | Optional filter | N/A |
| `accepts_donations` | Optional filter | Optional filter | Built into section |
| `solidarity_pricing` | Optional filter | Optional filter | N/A |

Filter UI must be section-aware: hide `muslim_owned` toggle for STORES (invariant), hide all provider-boolean filters for UMMAH.

### Required Read Model Boundary (Recommended)

For performance and privacy, the UI should consume:

- **Aggregated trust summary** (per provider): highest trust level, total confirmations, top badges
- Full confirmation rows should not be broadly exposed

---

## Data Boundaries & RLS

### Privacy & PII

- Public pages should not expose user identifiers for endorsements.
- RLS must enforce that:
  - Users can create/delete their own confirmations.
  - Public consumers can only see **aggregates** (counts), not confirmer identities.

### Roles & Authorization

The system currently uses multiple role sources:

- `public.users.role` (app DB table)
- `auth.users.raw_user_meta_data.role` (Supabase auth metadata)
- `user.user_metadata.role` (client metadata fallback)

This is a known architecture risk; roles must be normalized behind a single authority.

### Administrative Surfaces (Current State)

- The legacy in-app admin dashboard/panel UI has been removed.
- Administrative capabilities are exposed via **server-side protected API routes** (e.g., `/api/admin/*`) and any separate operator workflow (if present).
- Any remaining product requirement for “provider review/approval” MUST be satisfied by a supported workflow that does not reintroduce the legacy admin panel.

---

## Observability (Architecture Requirement)

### Normal (Always-on, low volume)

- Correlation IDs on API routes
- Performance request timing for key routes (TTFB/handler duration) and key API reads
- Trust workflow state transitions:
  - `badge.confirmation.create` (success/fail)
  - `badge.confirmation.delete` (success/fail)
  - `badge.trust_level.changed` (success/fail)
- Dependency boundary metrics:
  - Supabase query name + duration + result category

### Debug (Opt-in)

- Detailed payload fields (still no secrets/PII unless explicitly authorized)
- Temporary per-request verbose tracing for trust workflows

---

## Quality Attributes

- **Security**: RLS correctness, role normalization, least-privilege service role use
- **Privacy**: prevent user_id leakage through public SELECT policies
- **Performance**: avoid N+1 badge lookups; prefer aggregated read models
- **Maintainability**: keep trust logic in Postgres triggers/views + focused services
- **Scalability**: stable pagination and ranking performed in SQL when possible

---

## Problem Areas (Design Debt Registry)

1. **Role authority fragmentation**: multiple sources of truth for role checks across API/RLS.
2. **Potential privacy leak risk**: public read access to confirmation rows can expose user IDs.
3. **Ranking stability risk**: client-side ranking can break pagination consistency; prefer DB-side ordering.
4. **App Router value leakage**: client-heavy data fetching and broad `'use client'` usage reduce streaming SSR and increase bundle/hydration costs.
5. **Caching policy inconsistency**: global header defaults (e.g., broad `/api/*` no-store) can silently override route-level caching intent.
6. **Telemetry guardrails**: debug telemetry must remain opt-in; keep safety checks to prevent reintroducing localhost/unsafe endpoints.
7. **Agent memory tooling reliability**: Flowbaby memory tools frequently fail due to multi-window daemon ownership/lock contention, forcing NO-MEMORY MODE and reducing workflow quality.
8. **Enrichment candidate table lifecycle**: `enrichment_candidates` is a staging table but has no defined archival or purge policy. Applied/rejected rows will accumulate over time. A periodic purge job or archival strategy should be added in M4 or a post-launch task.
9. **Enrichment fetch origin (shared Supabase IPs)**: After M4, JoinHalal and Phase 2 source fetches originate from Supabase's shared Edge Function IP fleet rather than a controlled developer IP. Rate limit exposure changes; polite delays (200ms) and a meaningful `User-Agent` header partially mitigate this.
10. **`provider_stats` naming drift**: MV name implies provider-only scope but now contains cross-entity counts (`menu_item_count`, `service_offer_count`, `community_project_count` after Plan 095). Rename to `platform_stats` in a future migration (breaking change for any dashboard queries referencing the MV name).
11. **Badge/Boolean data coherence gap (ADR-105)**: Provider creation (`providerService.ts`) writes `barakah_effects` but never sets boolean filter columns or creates `provider_badges` rows. Badge endorsement triggers update only `provider_badges.trust_level`, not `providers.*` booleans. Migration 067 performed a one-time backfill with no ongoing sync trigger. New providers are invisible to Plan 105 search filters. Fix: badges become the write model, booleans the read model, with a Postgres trigger propagating `provider_badges` inserts to boolean columns. `barakah_effects` must be deprecated as a structured data source.
12. **Schema-wide structural debt (Arch-114)**: Full schema audit verified against live Supabase DB + cross-environment audit (prod/dev via MCP). 10 findings total (1 CRITICAL, 3 HIGH, 3 MEDIUM, 3 LOW). CRITICAL: dual-PK anti-pattern on 6 core tables. HIGH: UUID array columns without FK enforcement, barakah_effects triple-source incoherence, polymorphic FK without enforcement. MEDIUM: boolean flag proliferation, schema cohesion, cross-environment schema divergence (`consent_logs`/`deletion_logs` mismatch). LOW: 10 redundant indexes, duplicate `updated_at` triggers, local-only migration 076 gap. Environment drift confirmed: index counts (159/163/173) and trigger counts (13/19/24) across local/prod/dev. See `114-db-schema-architecture-review.md`.
13. **Migration management gap (ADR-114)**: The three environments use completely independent migration strategies. Prod has no `supabase_migrations.schema_migrations` table — migrations were applied manually (Dashboard SQL editor or psql). Dev tracks only 4 timestamp-format migrations unrelated to the local chain. Local has 81 numeric-prefix migration files. This means: (a) the migration chain in `supabase/migrations/` is NOT a deployment mechanism for prod or dev, (b) patching historical migrations to make `supabase db reset` work encodes past decisions as permanent constraints, (c) new environments cannot bootstrap deterministically. Resolution: prod schema dump as `001_baseline.sql`, archive historical chain, future migrations forward-only from baseline. See ADR-114.
14. **Provider attribute model fragmentation (ADR-118)**: Three disconnected registries describe provider attributes: `badge_types` (7 rows), 11 boolean columns on `providers`, and `SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN` TypeScript map (5 entries). No registry has full coverage. The sync trigger has a hardcoded CASE statement that covers only 3 of 7 badge types. Two conceptually distinct attribute types (trust claims requiring community endorsement vs amenity declarations — physical facilities observable on visit) are stored identically as booleans with no schema-level distinction. Additionally, two column names contradict owner intent: `solidarity_pricing` (owner intent: economic solidarity — boycotts, pro-Muslim sourcing) and `accepts_donations` (owner intent: provider MAKES donations, not receives them). Both have overly restrictive section CHECK constraints. Fix: extend `badge_types` with `attribute_category`, `provider_column_name`, and `is_filterable`; make trigger data-driven; rename the two columns and revise their CHECKs. See FL-23, FL-24, FL-25 in `118-field-level-schema-review.md`.
15. **Provider table type monolith (FL-26)**: `community_services` has 24 of 35 columns duplicating `providers` (69% overlap). `listing_type_enum` currently only has `'food'` and `'business'`; ummah entities live in a separate table. Full supertype unification recommended pre-consumer: add `'ummah'` to enum, migrate `community_services` rows into `providers`, create three 1:1 extension tables (`food_providers`, `business_providers`, `ummah_providers`), rename `community_projects.community_service_id` → `provider_id`, rename `provider_community_services` → `provider_engagements` (open engagement graph: any provider type engages with any other, discriminated by `engagement_type`), simplify `bookmarks` to single FK. Outcome: eliminates 24 duplicate columns; badge/trust/discovery system works natively across all three entity types; bookmarks simplifies from two FK columns to one. Window closes at first consumer. See FL-26.

### ADR-118: Provider Attribute Model — Trust vs Amenity

- **Context**: UFlow has two consumer-facing attribute concepts: (1) *trust claims* where community members can confirm/endorse values and practices, and (2) *amenity declarations* — physical facilities that are observable on visit. Currently both are stored as flat boolean columns on `providers` with no schema-level distinction. The badge system partially models trust claims (badge_types + trust_level progression) but doesn't cover all trust attributes and has no concept of amenities. Three independent registries (badge_types, boolean columns, TypeScript filter map) are out of sync. Adding any new attribute requires touching 5+ files.
- **Owner-validated classification (2026-05-01)**:
  - *Amenity* (physical, actionable, visible/usable on visit): `has_prayer_space`, `has_parking`, `women_friendly` (women's section), `family_friendly`, `children_friendly`
  - *Trust claim* (values/practice requiring community verification): `muslim_owned`, `no_alcohol`, `no_pork`, `no_gambling`, `halal_level`, `economic_solidarity` (formerly `solidarity_pricing`), `makes_donations` (formerly `accepts_donations`)
- **Choice**: Extend `badge_types` to be the **single registry** for all provider attributes (trust AND amenity). Add three columns: `attribute_category TEXT CHECK ('trust' | 'amenity')`, `provider_column_name TEXT`, and `is_filterable BOOLEAN`. Keep boolean columns on `providers` as **search-optimized read cache** (fast indexed predicates). Replace hardcoded CASE trigger with a data-driven trigger that reads `badge_types.provider_column_name` via `EXECUTE format('%I', ...)`. Rename `solidarity_pricing` → `economic_solidarity` and `accepts_donations` → `makes_donations` to match owner intent; revise over-restrictive section CHECK constraints on those two columns (FL-24, FL-25).
- **Alternatives**:
  - **New `provider_attributes` junction table** (rejected for now): would require rewriting search query layer; YAGNI at current scale — adding columns to `badge_types` achieves the same registry benefit with no query changes
  - **EAV `provider_attribute_values` table** (rejected): untyped, hard to index, defeats the purpose of indexed boolean predicates
  - **Keep current state, just fix trigger** (rejected): doesn't address the three-registry fragmentation or the trust/amenity distinction — next developer still doesn't know which booleans are trust-aware
  - **Separate `amenity_types` table** (rejected): unnecessary split; `attribute_category` column achieves clean separation within one table without doubling the join surface
- **Consequences**:
  - **Positive**: Single registry; adding new attribute = one INSERT into `badge_types` + one boolean column; no trigger rewrite; trust/amenity distinction is explicit and queryable
  - **Positive**: `is_filterable` column on `badge_types` can drive the filter UI dynamically instead of hardcoded TypeScript map
  - **Positive**: `solidarity_pricing` and `accepts_donations` renames fix active product meaning confusion and unlock food/business providers from incorrect section restrictions
  - **Negative**: `badge_types` name becomes slightly misleading once amenity rows exist; rename to `provider_attribute_types` is a future improvement
  - **Constraint**: `no_alcohol`, `no_pork`, `no_gambling` retain their section-scoped CHECK constraints (food-only enforcement) — the CHECK is the section invariant; the badge is the trust attestation layer above it
- **Related**: ADR-105, FL-23, FL-24, FL-25, Plan 106

### ADR-001: Trust system should expose aggregates publicly

- **Context**: Endorsements require social proof, but confirmer identities are sensitive.
- **Choice**: Public reads should use an aggregated trust read model (view/materialized view).
- **Alternatives**:
  - Publicly readable confirmation rows (rejected: privacy risk)
  - External trust service (rejected: violates Postgres-first)
- **Consequences**:
  - Requires additional DB objects and query refactor
  - Improves privacy, performance, and UX consistency

### ADR-002: Ranking should be computed in SQL

- **Context**: Search paging must be stable and fair.
- **Choice**: Compute trust_score and ordering in SQL to support deterministic pagination.
- **Alternatives**:
  - Client-side weighted ranking (rejected: pagination instability)
- **Consequences**:
  - Requires DB function/view/index support
  - Clearer performance characteristics

### ADR-003: Agent memory should be local-first and multi-window safe

- **Context**: The current agent memory system (Flowbaby) is frequently unavailable due to VS Code multi-window daemon ownership/lock contention, plus cloud authentication coupling. This forces frequent NO-MEMORY MODE operation and leads to repeated decisions and lower-quality output.
- **Choice**: Adopt a local-first agent memory backend that avoids single-owner daemon locks and supports concurrent access from multiple VS Code windows.
- **Alternatives**:
  - Keep Flowbaby and “just fix the lock” (rejected: still couples us to heavy dependencies and cloud auth; high regression risk).
  - Full knowledge-graph rebuild (rejected: overengineered for structured summary storage; violates KISS/YAGNI).
- **Consequences**:
  - Requires a small, maintained tooling extension/library.
  - Improves workflow reliability and reduces repeated work across sessions.

### ADR-004: Cache-Control ownership is per-route (avoid global overrides)

- **Context**: UFlow uses multiple caching layers (browser/PWA, Cloudflare, Nginx, Next.js). Broad defaults like `Cache-Control: no-store` on all `/api/*` can conflict with intentional per-endpoint caching (e.g., public browse endpoints) and are difficult to reason about.
- **Choice**: Treat **route handlers** as the single source of truth for Cache-Control on `/api/*` responses. Global header rules should avoid setting Cache-Control for all API routes; instead, only set it for specific endpoints where required (e.g., `/api/manifest`).
- **Alternatives**:
  - Keep global `/api/*` no-store (rejected: overrides intended cacheable public reads; increases origin load).
  - Cache all API reads at CDN by default (rejected: risks caching user-specific responses and unbounded keys).
- **Consequences**:
  - Requires explicit Cache-Control on any cacheable API routes.
  - Makes caching behavior inspectable and debuggable at the endpoint boundary.

### ADR-005: Public acquisition pages use ISR; UTMs must not create duplicates

- **Context**: UFlow’s primary acquisition surfaces (e.g., `/city/[cityName]`) must be indexable and fast. Query strings like `utm_*` are required for attribution but can create duplicate URLs (SEO) and cache fragmentation (if edge caching is enabled later). City/provider data changes slowly enough that rebuild-on-every-request SSR is unnecessary.
- **Choice**:
  - Implement public acquisition pages as **Server Components** with **ISR** (segment-level `revalidate`) where feasible.
  - Avoid `searchParams` reads in those routes to prevent accidental dynamic rendering.
  - Emit canonical metadata that strips `utm_*` (and all query strings) from indexable pages.
- **Alternatives**:
  - Force dynamic SSR for all acquisition pages (rejected: higher origin load and tail latency risk).
  - Pure static without revalidation (rejected: pages become stale during growth campaigns).
- **Consequences**:
  - Requires explicit segment-level caching decisions per acquisition route.
  - Keeps UTMs usable for analytics without polluting SEO/caching.

---

### ADR-006: Analytics uses Plausible (GDPR-aligned, no PII)

- **Context**: UFlow needs decision-grade acquisition and activation signals without adding cookie banners or collecting PII. Analytics must not break the app if unavailable.
- **Choice**:
  - Use **Plausible Analytics** for cookie-free, GDPR-aligned measurement.
  - Preferred operational mode: **Plausible Cloud (EU region)**.
  - Acceptable operational mode: **self-host Plausible CE on Hetzner** as a separate container stack, provided guardrails are met:
    - persistent volumes (Postgres + ClickHouse)
    - health checks + restart policies
    - backups + basic disk monitoring (ClickHouse growth)
    - admin access controls (strong credentials; ideally IP allowlist and/or reverse-proxy auth)
  - Client integration must be **non-fatal**: analytics script is conditionally loaded and event emission is a safe no-op when the script is absent.
  - Event properties MUST remain **non-PII** and **low-cardinality** (enums/booleans/city), never provider IDs, emails, phone numbers, or URLs.
- **Alternatives**:
  - GA4 or other cookie-based analytics (rejected: requires consent banner; higher GDPR/legal overhead).
  - Session replay / user-ID tools (rejected for now: consent + privacy posture not ready).
- **Consequences**:
  - Requires clear governance for event naming and allowed properties.
  - Requires ops ownership if self-hosting (backups/monitoring/access controls).
  - Preserves UX (no cookie banner) and privacy-first brand posture.

### ADR-007: Staging-first pattern for external data ingestion (Enrichment Inbox)

- **Status**: Accepted
- **Context**: Automated recurring enrichment requires controlled staging before writes reach `providers`. Direct upsert gives no conflict tracking, no admin visibility, and risks overwriting admin-set fields. Admin moderation (Plans 058/061) established the pattern of review-before-apply; enrichment follows the same principle.
- **Choice**: All enrichment proposals stage in `enrichment_candidates` as `pending` records. Admin approval required for conflicts. Auto-apply only for additive non-conflicting updates from the provider's known import source.
- **Alternatives**:
  - Direct upsert into `providers` (rejected: no conflict tracking, risks admin-field overwrite)
  - External queue service (rejected: violates Postgres-first, adds unnecessary vendor dependency)
  - CQRS event log (rejected: overengineered for current scale)
- **Consequences**:
  - Adds latency to data propagation (enriched data is pending until approved)
  - Staging table needs lifecycle management (Problem Area 8)
  - Unlocks auditability and conflict visibility impossible with direct upsert
- **Related**: ADR-008, Plans 052/058/061

### ADR-008: pg_cron schedule definitions belong in migration files

- **Status**: Accepted
- **Context**: Supabase offers both dashboard-defined native schedules and pg_cron migration-defined schedules. Dashboard-only definitions are invisible in-repo, not reproducible across environments, not code-reviewed, and not rollback-able via migration workflow.
- **Choice**: All persistent automated job schedules MUST be defined in migration files as `cron.schedule(...)` calls. Vault stores function URL and anon key. Dashboard may inspect/pause jobs but is not the source of truth.
- **Alternatives**:
  - Dashboard-only native schedule (rejected: stealth configuration, not version-controlled)
  - External cron from GitHub Actions / Hetzner (rejected: introduces auth complexity and ops surface outside Supabase stack)
- **Consequences**:
  - Operator must populate Vault at deployment time (documented in runbook)
  - Local `supabase db reset` registers the cron job (harmless; safe to ignore in local context)
  - Cadence changes are diff-able and code-reviewed
- **Related**: ADR-007, Arch Finding A-2

### ADR-095: Three-Section Org→Item Catalog Hierarchy

- **Status**: Accepted
- **Context**: Plan 094 established food (`provider_menu_items`) and business (`provider_service_offers`) item tables under `providers`. The ummah section (`community_services`) had no equivalent item table, creating an asymmetry in the three-section model (FOOD / UMMAH / STORES). Category scoping across sections was also missing.
- **Choice**: Add `community_projects` table under `community_services` (parallel to how 068 tables sit under `providers`). Add `categories.applicable_section` for cross-cutting section scoping. Maintain three separate item tables (no CTI base table) with the three-table ordering FK pattern for future Epic 4.2.
- **Alternatives**:
  - CTI base table `catalog_items` with type discriminator (rejected: < 50% type-specific column overlap, adds unnecessary base join)
  - Add item columns to `community_services` directly (rejected: mixes org and item concerns, SRP violation)
  - Defer until ordering system (rejected: zero-cost schema window closes as data accumulates)
- **Consequences**:
  - Completes three-section symmetry: every section has org→item hierarchy
  - Future ordering system has clean FK targets across all three sections
  - `provider_stats` MV becomes a platform-wide aggregation point (naming debt: Problem Area 10)
  - RLS write policies for ummah items require a 2-hop join (community_services→providers) — acceptable at current scale
- **Related**: ADR-094, Plan 095, Plan 094

### ADR-114: Migration Baseline Squash — Prod Schema as Canonical Baseline

- **Status**: Accepted
- **Context**: The UFlow `supabase/migrations/` directory contains 81 SQL files with numeric prefixes (0000 through 078 + legacy timestamp files). These accumulated over 2+ years of development. Investigation on 2026-04-29 revealed:
  - **Prod** (`rdtdtcfntopcxcigkqoq`): No `supabase_migrations.schema_migrations` table exists. Schema was applied via Dashboard SQL editor or manual psql. Zero migration tracking.
  - **Dev** (`qrekonfhaenjdnjhwdum`): Has `supabase_migrations.schema_migrations` but contains only 4 entries with timestamp-format versions (`20251208...`, `20260108...`, `20260111...`) — completely unrelated to the 81 local numeric-prefix files.
  - **Local**: 81 migration files. Chain required 6 patches to replay via `supabase db reset` (duplicate version collisions, missing columns, SQL bugs, function signature changes). These patches fixed historical accidents, not schema design.
  - **Result**: The three environments have **no shared migration lineage**. The migration chain is a historical changelog, not a deployment mechanism.
- **Choice**: Adopt a **baseline squash** strategy:
  1. Take a `pg_dump --schema-only` of prod (authoritative state) — prod is the live system with real data.
  2. Archive all 81 historical migrations to `supabase/migrations/archive/` (preserve for reference).
  3. Promote the prod dump as `001_baseline.sql` — this becomes the canonical starting point for all environments.
  4. All Plan 114 refactoring migrations (Phase 1+) are authored against this baseline, not against accumulated history.
  5. Phase 0 cleanup (migration 078: redundant indexes, duplicate triggers, composite indexes) is absorbed into the baseline if those changes are applied to prod first, OR remains as `002_phase0_schema_hygiene.sql` if applied after baseline creation.
  6. `supabase db reset` replays baseline + forward migrations. New developers get a deterministic, fast bootstrap.
- **Alternatives**:
  - Patch historical chain indefinitely (rejected: encodes past decisions as permanent constraints; fragile and backwards)
  - Forward-only discipline without squash (rejected: still requires 81 files to replay for new environments; `supabase db reset` fragility persists)
  - Rebuild schema from scratch as target-state DDL (rejected: risks missing prod-only objects like `deletion_logs` or ad-hoc indexes; prod dump is safer)
- **Consequences**:
  - Requires operator access to run `pg_dump --schema-only` against prod (or use MCP `execute_sql` to reconstruct DDL)
  - Historical migration files become reference-only artifacts
  - `supabase_migrations.schema_migrations` on dev has 4 entries that won't match the new chain — dev must be reset or the tracking table cleared
  - All future migrations are numbered from 002+ (or 003+ if Phase 0 is separate)
  - Seed data (cities, categories, badge types, etc.) must be extracted from prod and included in the baseline or as a separate `002_seed.sql`
  - Cross-environment parity becomes enforceable: everyone starts from the same known-good state
- **Related**: Plan 114, F-11, Problem Area 13

### ADR-105: Badge/Boolean Data Coherence — Badges as Write Model, Booleans as Read Model

- **Status**: Accepted
- **Context**: Plan 105 wired search filters to 5 boolean columns on `providers` (migration 067). Post-release analysis revealed three disconnected data systems:
  1. **Creation path** (`providerService.ts`): sets `barakah_effects: formData.tags` but never sets boolean columns or creates badge rows. New providers default to `false` for all filter columns.
  2. **Badge endorsement path** (`badges.ts`): triggers update `provider_badges.confirmation_count` and `trust_level`, but never propagate to `providers.*` booleans.
  3. **Backfill** (migration 067): one-time `UPDATE providers SET muslim_owned = true FROM provider_badges WHERE badge_key = 'MUSLIM_OWNED'`. No ongoing sync trigger.
  4. **Section semantics**: STORES requires `muslim_owned = true` as a listing invariant (not a filter). FOOD treats it as an optional filter. UMMAH has no boolean columns at all.
  5. **Coverage asymmetry**: `has_parking` and `solidarity_pricing` have no badge equivalents; they must remain direct boolean attributes.
- **Choice**: Establish badges as the **write model** and booleans as the **read model** with a Postgres trigger for synchronization:
  - Provider creation form writes a `provider_badges` row with `trust_level = SELF_DECLARED` for each claimed attribute that has a badge equivalent.
  - A new Postgres trigger on `provider_badges` INSERT/DELETE propagates to the corresponding boolean column on `providers`.
  - Attributes without badge equivalents (`has_parking`, `solidarity_pricing`) continue to be set directly as boolean columns during creation.
  - `barakah_effects` is deprecated as a structured data source; retained only for free-form tags.
  - Filter UI becomes section-aware: STORES hides `muslim_owned` toggle (invariant), UMMAH hides all provider-boolean filters.
- **Alternatives**:
  - Badges only, no booleans (rejected: `has_parking`/`solidarity_pricing` have no badge type; badge JOIN for every search query adds complexity for marginal benefit)
  - Booleans only, deprecate badges (rejected: loses trust-level progression and community endorsement UX)
  - Materialized view combining both (rejected: adds refresh latency; simple trigger is sufficient at current scale)
- **Consequences**:
  - Requires a new migration: trigger function + section-aware creation logic
  - `providerService.ts` must be updated to write badges and direct booleans at creation time
  - Existing providers are already backfilled (migration 067); only new providers are affected
  - Trust level remains a display/UX concern; boolean answers "does this provider claim this attribute?" regardless of trust level
  - Future: if badge types expand to cover parking/solidarity, the direct-boolean path can be retired for those too
- **Related**: Plan 105, Migration 067, Migration 016, Problem Area 11

---

## Roadmap Readiness

Epic 2.1 (Provider Trust & Verification) is architecturally feasible because foundational schema exists, but implementation MUST address:

- Privacy-safe reads
- Role authority normalization
- DB-side stable ranking and pagination

---

## Recommendations

1. Normalize admin role checks behind a single function used by both API routes and RLS.
2. Replace public SELECT on confirmation rows with public aggregates.
3. Implement a trust summary read model and DB-side ordering for search.
4. Add minimal trust workflow telemetry (normal + debug) before rollout.
5. **[PRIORITY] Execute migration baseline squash (ADR-114)** before Plan 114 Phase 1 begins. Prod schema dump → `001_baseline.sql` → archive historical chain → all future migrations forward-only from baseline. This is prerequisite to any structural refactoring having cross-environment parity.
6. **Establish migration tracking on prod**: After baseline, ensure `supabase_migrations.schema_migrations` is populated on prod so future migrations are tracked consistently across all environments.
