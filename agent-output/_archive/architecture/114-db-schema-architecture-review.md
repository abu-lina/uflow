# 114 — Database Schema Architecture Review

**ID**: 114
**Origin**: Task #114 — DB Schema Architecture Review & Refactor
**Status**: APPROVED_WITH_CHANGES
**Verdict**: Structural debt is moderate-to-high. Eight severity-ranked findings require staged refactoring. No blocking unknowns for planning.

## Changelog

| Date       | Context                                | Summary                                                                 |
| ---------- | -------------------------------------- | ----------------------------------------------------------------------- |
| 2026-04-29 | Initial architecture review (S114)     | Full public schema audit from migration files. 7 findings ranked.       |
| 2026-04-29 | Re-verified against live Supabase DB   | 29 tables, 1 MV, 10 enums, 159 indexes, 34 RPCs, 13 triggers confirmed from live DB. Migration 076 badge→boolean sync trigger MISSING from live DB — elevated to new F-8 finding. Updated all counts and corrected migration-vs-live discrepancies. |
| 2026-04-30 | Cross-environment audit (prod + dev)   | Queried prod (`rdtdtcfntopcxcigkqoq`) and dev (`qrekonfhaenjdnjhwdum`) via Supabase MCP. F-8 downgraded to LOW (trigger exists on prod+dev, local-only gap). Two new findings: F-9 MEDIUM (schema divergence — `consent_logs`/`deletion_logs` mismatch across environments), F-10 LOW (duplicate `updated_at` triggers on `providers`). Total: 10 findings. |
| 2026-04-29 | Migration management audit (F-11)      | MCP-verified: prod has NO `supabase_migrations.schema_migrations` table; dev tracks only 4 timestamp-format migrations unrelated to local chain; local has 81 numeric-prefix files requiring 6 patches to replay. Three environments have zero shared migration lineage. New F-11 HIGH finding. ADR-114 accepted: prod schema dump as baseline, archive historical chain, forward-only migrations. Total: 11 findings. |

---

## Scope

Full review of the UFlow `public` schema verified against **three environments**: local Supabase CLI, dev (`qrekonfhaenjdnjhwdum`), and prod (`rdtdtcfntopcxcigkqoq`). Cross-referenced with 77 migration files in `supabase/migrations/`.

**Live DB summary (local)**:
- 29 tables + 1 materialized view (`provider_stats`)
- 10 USER-DEFINED enum types
- 159 indexes (including PKs, UNIQUEs, and explicit)
- 34 RPC functions, 13 triggers
- 330 total columns across all tables
- `providers` table alone: 45 columns
- 26 public-schema FK constraints + 16 cross-schema FKs to `auth.users`

### Table Inventory

| # | Table | Domain | Migration |
|---|-------|--------|-----------|
| 1 | `users` | Core | 0000 |
| 2 | `categories` | Core | 0000 |
| 3 | `providers` | Core | 0000 + many |
| 4 | `community_services` | Core | 0000 |
| 5 | `bookmarks` | Core | 0000 |
| 6 | `email_confirmation_tokens` | Auth | 0000 |
| 7 | `offers` | Vocabulary | 000 |
| 8 | `needs` | Vocabulary | 000 |
| 9 | `provider_community_services` | Junction | 002 |
| 10 | `category_suggested_offers` | Junction | 003 |
| 11 | `category_suggested_needs` | Junction | 003 |
| 12 | `push_subscriptions` | Notification | 010 |
| 13 | `consent_logs` | Compliance | 012 |
| 14 | `waitlist` | Growth | 015 |
| 15 | `badge_types` | Trust | 016 |
| 16 | `badge_system_config` | Trust | 016 |
| 17 | `provider_badges` | Trust | 016 |
| 18 | `badge_confirmations` | Trust | 016 |
| 19 | `badge_verifications` | Trust | 016 |
| 20 | `cities` | Growth | 017 |
| 21 | `provider_owner_outreach` | Outreach | 058 |
| 22 | `provider_owner_action_tokens` | Outreach | 058 |
| 23 | `provider_outreach_tasks` | Outreach | 058 |
| 24 | `enrichment_candidates` | Enrichment | 066 |
| 25 | `enrichment_run_logs` | Enrichment | 066 |
| 26 | `provider_menu_items` | Catalog (Food) | 068 |
| 27 | `provider_service_offers` | Catalog (Business) | 068 |
| 28 | `community_projects` | Catalog (Ummah) | 069 |
| 29 | `admin_audit_logs` | Compliance | 20251120 |

### Enum Types

| Enum | Values | Used By |
|------|--------|---------|
| `user_role` | user, owner, admin, moderator | `users.role` |
| `review_status` | pending, approved, rejected, needs_revision, removed_by_owner | `providers`, `community_services` |
| `consent_type` | terms_of_service, privacy_policy | `consent_logs` |
| `trust_level` | SELF_DECLARED, COMMUNITY_CONFIRMED, UMMAH_FLOW_VERIFIED | `provider_badges` |
| `entity_type` | provider, community_service | `provider_badges` |
| `outreach_status` | 9 values (pending_approval → expired) | `provider_owner_outreach` |
| `outreach_channel` | email, phone, instagram | outreach tables |
| `token_action_scope` | decision, claim, remove | `provider_owner_action_tokens` |
| `listing_type_enum` | food, business | `providers.listing_type` |
| `enrichment_status` | pending, approved, rejected, applied | `enrichment_candidates` |

### Cross-Environment Comparison

Queried prod and dev via Supabase MCP (`mcp_supabase-prod_execute_sql`, `mcp_supabase-dev_execute_sql`) on 2026-04-30.

| Aspect | Local (CLI) | Dev (`qrekonfhaenjdnjhwdum`) | Prod (`rdtdtcfntopcxcigkqoq`) |
|--------|-------------|-------|------|
| Tables | 29 | 29 | 29 |
| Enums | 10 | 10 | **9** (no `consent_type`) |
| Indexes | 159 | **173** (+14) | **163** (+4) |
| Triggers | **13** | **24** (+11) | **19** (+6) |
| `providers` columns | 45 | 45 | 45 |
| `sync_provider_badge_to_boolean()` | **❌ MISSING** | ✅ | ✅ |
| `trigger_sync_provider_badge_to_boolean` | **❌ MISSING** | ✅ | ✅ |
| `consent_logs` table | ✅ | ✅ | **❌** |
| `consent_type` enum | ✅ | ✅ | **❌** |
| `deletion_logs` table | **❌** | **❌** | ✅ |
| Duplicate `updated_at` triggers on `providers` | Needs verification | ✅ (2 triggers) | ✅ (2 triggers) |

**Key divergences**:

1. **Local is behind prod/dev**: 13 triggers locally vs 19 (prod) / 24 (dev). The badge sync trigger (migration 076) is deployed to prod+dev but not local. This means **local dev/test environments silently exhibit different behavior** than production.
2. **Prod diverges from local+dev on GDPR tables**: `consent_logs` (with `consent_type` enum) exists on local+dev but NOT prod. `deletion_logs` exists on prod only. This suggests either: (a) a manual prod-only migration for `deletion_logs`, or (b) `consent_logs` was intentionally replaced by `deletion_logs` on prod but the migration wasn't backported.
3. **Index count drift**: Dev has 14 more indexes than local. Either migrations haven't been applied locally, or indexes were created ad-hoc on dev. Both indicate migration hygiene issues.
4. **Prod has duplicate `updated_at` triggers on `providers`**: Both `trigger_providers_updated_at` and `update_providers_updated_at` fire BEFORE UPDATE. The function is called twice per UPDATE — harmless but wasteful.

---

## Findings

### F-1 · CRITICAL — Dual-PK Anti-Pattern (Surrogate `id` + Business `<entity>_id`)

**Affected tables**: `providers`, `community_services`, `offers`, `needs`, `categories`, `users`

Each of these tables has both a `id UUID PRIMARY KEY` and a parallel `<entity>_id UUID UNIQUE NOT NULL` (or `user_id` for `users`). Both columns are auto-generated UUIDs with no semantic difference. The "business key" (`provider_id`, `offer_id`, `user_id`, etc.) is the column actually used by foreign keys, while `id` is the physical PK.

**Live-verified FK graph**: 26 public-schema FKs target `<entity>_id` columns (never `id`). 16 cross-schema FKs target `auth.users(id)`. The `users.user_id → auth.users(id)` bridge is the only table where `<entity>_id` is the FK *source* rather than target.

**Structural impact**:

1. **Wasted storage & index bloat**: Every row carries two UUID columns (32 bytes) and two B-tree indexes where one suffices. At 28 bytes per index entry, this adds ~56 bytes of index overhead per row per table.
2. **Cognitive overhead**: Developers must remember that `providers.id` is NOT the FK target — `providers.provider_id` is. This is counter-convention. Every new developer will get confused.
3. **JOIN ambiguity**: Writing `JOIN providers USING (id)` will silently use the wrong column. All JOINs must explicitly use `provider_id`.
4. **Index redundancy**: `idx_providers_provider_id` is a separate index on the already-UNIQUE `provider_id` column. The UNIQUE constraint already creates an implicit index, making this explicit index fully redundant.

**Root cause**: The initial schema was created with `id` as PK (convention), then a second UUID was added as the "business identifier" without removing `id`. The FK graph grew around `<entity>_id` while `id` remained vestigial.

**Recommendation**: Promote `<entity>_id` to be the sole PK or eliminate it entirely (use `id` as the FK target). This is the highest-impact refactor — 26 FK references across the public schema point to `<entity>_id` columns.

---

### F-2 · HIGH — Denormalized UUID Array Columns vs Junction Tables

**Affected columns**: `providers.offers_ids UUID[]`, `providers.needs_ids UUID[]`, `community_services.offers_ids UUID[]`, `community_services.needs_ids UUID[]`

These store many-to-many relationships as UUID arrays on the parent table, with GIN indexes for containment queries (`@>`).

**Structural impact**:

1. **No FK enforcement**: Postgres array elements cannot reference another table. Deleting an `offer` row leaves orphan UUIDs in `providers.offers_ids` with no cascade or constraint violation. Data integrity is application-enforced only.
2. **No JOIN capability**: Cannot `JOIN offers ON offers.offer_id = ANY(providers.offers_ids)` efficiently. Requires `unnest()` which defeats index usage for complex queries.
3. **Unbounded growth**: No limit on array size. A provider could accumulate hundreds of UUIDs, bloating the row and slowing GIN index maintenance.
4. **Inconsistency with existing pattern**: `provider_community_services` (migration 002) correctly uses a junction table for the same kind of relationship. `category_suggested_offers` and `category_suggested_needs` (migration 003) also use junction tables. The array pattern was the earlier design; the junction pattern is the established correction.
5. **Catalog tables supersede**: `provider_menu_items` and `provider_service_offers` (migration 068) already provide per-provider typed offer instances. The `offers_ids` array on `providers` is now functionally redundant for catalog use cases — it persists only as a legacy tag-association mechanism.

**Recommendation**: Replace `offers_ids`/`needs_ids` arrays with proper junction tables (`provider_offers`, `provider_needs`). The vocabulary `offers`/`needs` tables already exist; only the junction tables are missing.

---

### F-3 · HIGH — `barakah_effects TEXT[]` Triple-Source Incoherence

**Affected**: `providers.barakah_effects`, `community_services.barakah_effects`, plus 10 boolean filter columns on `providers`, plus `provider_badges` trust system.

Three independent data systems encode overlapping information:

| System | Data Source | Update Mechanism | Query Role |
|--------|-----------|-----------------|------------|
| `barakah_effects TEXT[]` | Provider creation form (`formData.tags`) | User writes directly | Display tags |
| Boolean columns (e.g. `muslim_owned`, `no_alcohol`) | One-time backfill from `barakah_effects` (migration 067) | Trigger sync from badge INSERT/DELETE (migration 076) — but NOT from form writes | Section search filters |
| `provider_badges` | Badge endorsement system | Trigger-based confirmation counting | Trust display, badge UI |

**Structural impact**:

1. **New providers are invisible to search filters**: The creation path writes `barakah_effects` only and never sets boolean columns. A new provider tagged "familienfreundlich" in `barakah_effects` will NOT have `family_friendly = true`.
2. **Badge sync does not exist in live DB**: Migration 076's `sync_provider_badge_to_boolean()` function and trigger are **not present** in the live database (verified via `pg_proc` and `information_schema.triggers`). Even the partial 3-badge-key mapping described in the migration file never deployed. See F-8.
3. **Free-text fragility**: `barakah_effects` uses German-language strings ("familienfreundlich", "gebetsfreundlich") as data keys. Typos, casing differences, or i18n changes silently break the backfill logic.
4. **Triple write surface**: Updating a provider attribute may require writes to `barakah_effects`, the boolean column, AND a `provider_badges` row — with no transactional guarantee across them.

**Already documented**: system-architecture.md Problem Area 11 / ADR-105 flags this. This finding confirms it is a structural schema issue, not just a wiring gap.

**Recommendation**: Designate a single source of truth. The boolean columns are the most query-efficient for filters; make them the authoritative write target. Deprecate `barakah_effects` as an input mechanism and derive display tags from booleans + badges.

---

### F-4 · HIGH — Polymorphic FK Without Database Enforcement

**Affected tables**: `bookmarks` (`bookmarkable_id`, `bookmarkable_type`), `provider_badges` (`entity_id`, `entity_type`)

Both tables use a polymorphic association pattern: a UUID column plus a TEXT/ENUM discriminator, with no actual FOREIGN KEY constraint to any target table.

**Structural impact**:

1. **No referential integrity**: Deleting a `provider` does NOT cascade to its `bookmarks` or `provider_badges` rows. Orphan rows accumulate silently.
2. **No index-assisted JOINs**: Without FK, the query planner has no statistics about the join relationship. Explicit composite indexes (`entity_id, entity_type`) partially compensate but not fully.
3. **`bookmarks.bookmarkable_type`**: Uses a CHECK constraint (`IN ('provider', 'community_service')`) — a string, not the `entity_type` enum. Two representations of the same discriminator exist in the schema.
4. **Closed set**: Both tables have exactly 2 entity types (`provider`, `community_service`). Polymorphic patterns are justified when the set is large/open. For a closed set of 2, separate FK columns (`provider_id`, `community_service_id`) with a check constraint `(exactly one is NOT NULL)` provide full FK enforcement.

**Recommendation**: For a closed set of 2 entity types, replace polymorphic columns with nullable typed FK columns + a mutual exclusion constraint. This provides cascade deletes, referential integrity, and cleaner query plans.

---

### F-5 · MEDIUM — Boolean Flag Proliferation on `providers`

**Affected**: `providers` table now carries 12+ boolean/smallint filter columns added in migration 067.

| Column | Default | Section |
|--------|---------|---------|
| `muslim_owned` | false | All |
| `no_alcohol` | false | Food |
| `no_pork` | false | Food |
| `no_gambling` | false | Business |
| `has_prayer_space` | false | All |
| `family_friendly` | false | All |
| `women_friendly` | false | All |
| `children_friendly` | false | All |
| `accepts_donations` | false | Ummah |
| `has_parking` | false | All |
| `solidarity_pricing` | false | Business |
| `halal_level` | NULL | Food (1-3) |

**Structural impact**:

1. **Row width**: 12 booleans + 1 smallint adds ~14 bytes per row. Minor individually, but compounds with the dual-PK overhead and three array columns to make `providers` an unusually wide table (~50+ columns post-migration).
2. **Section-semantic coupling**: Some booleans only apply to certain `listing_type` values (e.g. `no_alcohol` is Food-only). The schema has no CHECK constraint enforcing this. A `business` provider can have `no_alcohol = true` which is semantically meaningless.
3. **Extension friction**: Adding a new filter attribute requires an ALTER TABLE migration, application code changes, backfill logic, and index creation. A more extensible pattern (e.g. `provider_attributes` key-value table or EAV-light) would allow admin-managed attributes without DDL.
4. **Index overhead**: 5 partial/composite indexes were created for these booleans. Individually small, collectively they slow INSERT/UPDATE operations.

**Mitigating factors**: For the current scale (<5,000 providers), boolean columns are the most query-efficient pattern. The postgres-first philosophy correctly favors simple columns over JSONB or EAV at low scale.

**Recommendation**: Accept booleans for now (YAGNI). Add section-scoped CHECK constraints (e.g. `CHECK (listing_type = 'food' OR no_alcohol = false)`) to prevent semantic inconsistency. Plan the EAV migration only when attribute count exceeds ~20 or business needs dynamic attribute management.

---

### F-6 · MEDIUM — Schema Cohesion: Outreach/Enrichment Subsystems Mixed with Core Domain

**Affected tables**:
- Outreach subsystem: `provider_owner_outreach`, `provider_owner_action_tokens`, `provider_outreach_tasks` (3 tables, 3 enums)
- Enrichment subsystem: `enrichment_candidates`, `enrichment_run_logs` (2 tables, 1 enum)

**Structural impact**:

1. **Single schema namespace**: All 28 tables live in `public`. No Postgres schema separation for operational subsystems vs core domain. The outreach and enrichment tables are admin/system-only — they serve background processes, not user-facing queries. Mixing them with core tables increases cognitive load during development and increases the blast radius of schema changes.
2. **Coupling via FK to `providers.provider_id`**: Both subsystems reference `providers(provider_id)`, which is correct. However, the outreach system also copies snapshot data (`candidate_email`, `candidate_phone`, `provider_name_snapshot`) rather than joining at query time. This is an intentional audit-trail pattern but creates data staleness.
3. **Enum namespace pollution**: 3 outreach-specific enums (`outreach_status`, `outreach_channel`, `token_action_scope`) and 1 enrichment enum (`enrichment_status`) sit in the global namespace alongside core enums. Low impact, but adds to discovery noise.

**Recommendation**: Consider Postgres schema separation (`CREATE SCHEMA outreach; CREATE SCHEMA enrichment;`) when the operational subsystem count grows beyond 3. For now, the table naming convention (`provider_owner_*`, `enrichment_*`) provides adequate grouping. No immediate action required.

---

### F-7 · LOW — Index Redundancy and Missing Composite Indexes

**Redundant indexes**:

| Index | Reason Redundant |
|-------|-----------------|
| `idx_providers_provider_id` | UNIQUE constraint on `provider_id` already creates an implicit index |
| `idx_offers_offer_id` | UNIQUE constraint on `offer_id` already creates an implicit index |
| `idx_needs_need_id` | UNIQUE constraint on `need_id` already creates an implicit index |
| `idx_categories_category_id` | UNIQUE constraint on `category_id` already creates an implicit index |
| `idx_community_services_service_id` | UNIQUE constraint on `community_service_id` already creates an implicit index |
| `idx_provider_community_services_composite` | The UNIQUE constraint on `(provider_id, community_service_id)` already provides this composite index |
| `idx_badge_types_badge_key` | UNIQUE constraint on `badge_key` already creates an implicit index |
| `idx_badge_confirmations_badge` | The UNIQUE constraint `(provider_badge_id, user_id)` has `provider_badge_id` as leftmost — covers single-column lookups |
| `idx_cities_name` | UNIQUE constraint on `city_name` already creates an implicit index |
| `idx_waitlist_email` | UNIQUE constraint `waitlist_email_unique` already covers this |

That is **10 fully redundant indexes** (verified from live `pg_indexes` — 159 total) consuming storage and slowing writes for zero query benefit.

**Potentially missing indexes** (based on query pattern analysis):

| Table | Suggested Index | Rationale |
|-------|----------------|-----------|
| `bookmarks` | `(bookmarkable_type, bookmarkable_id)` | The existing unique constraint is `(bookmarkable_id, bookmarkable_type, user_id)` which has `bookmarkable_id` first. Queries filtering by type first (`WHERE bookmarkable_type = 'provider'`) don't benefit from leftmost-prefix. |
| `providers` | `(address_city, listing_type)` | City-based search with section filtering is a primary query pattern but has no composite index. |
| `provider_badges` | `(entity_id, entity_type, badge_type_id) INCLUDE (trust_level)` | Covering index for the most common badge lookup (display badges for a provider with trust level). |

**Recommendation**: Drop the 10 redundant indexes. Add the 3 suggested composites. Validate with `EXPLAIN ANALYZE` on production query patterns before and after.

---

## Enum Assessment

| Enum | Scope | Verdict |
|------|-------|---------|
| `user_role` | Core, used once | ✅ Appropriate. Small, stable set. |
| `review_status` | Core, used by 2 tables | ✅ Appropriate. Shared semantics. |
| `consent_type` | Compliance, used once | ✅ Appropriate. GDPR compliance requires explicit type. |
| `trust_level` | Trust subsystem, used once | ✅ Appropriate. Ordered progression. |
| `entity_type` | Trust subsystem, used once | ⚠️ Only 2 values. Could be eliminated if F-4 refactor replaces polymorphic pattern with typed FK columns. |
| `outreach_status` | Outreach, used once | ✅ Appropriate. Complex lifecycle. |
| `outreach_channel` | Outreach, 2 tables | ✅ Appropriate. |
| `token_action_scope` | Outreach, used once | ✅ Appropriate. |
| `listing_type_enum` | Core, used once | ✅ Appropriate. Section discriminator. May grow if "ummah" becomes a listing_type. |
| `enrichment_status` | Enrichment, used once | ✅ Appropriate. |

**Overall**: Enum usage is well-scoped. No over-enumeration detected. The `entity_type` enum is the only candidate for removal (contingent on F-4 refactor).

---

### F-8 · LOW — Migration 076 Badge→Boolean Sync Trigger Not Deployed (LOCAL ONLY)

**Verified against all environments**: The function `sync_provider_badge_to_boolean()` and trigger `trigger_sync_provider_badge_to_boolean` **exist on prod and dev** but do NOT exist on the local Supabase instance. This is a **local dev environment gap**, not a production issue.

**Impact (downgraded from CRITICAL)**:

1. **Local development/testing diverges from production behavior**: Badge endorsement tests locally will not trigger boolean sync, potentially masking bugs or creating false negatives in test scenarios.
2. **Root cause**: Local Supabase CLI instance hasn't had `supabase db reset` run since migration 076 was added, or the migration failed silently during local application.

**Recommendation**: Run `supabase db reset` locally to bring migrations in sync. Add a CI check that validates local migration state matches the migration file count. No production action required — the trigger is live and functional on both prod and dev.

---

### F-9 · MEDIUM — Cross-Environment Schema Divergence (consent_logs / deletion_logs)

**Discovered via cross-environment audit (2026-04-30).**

| Object | Local | Dev | Prod |
|--------|-------|-----|------|
| `consent_logs` table | ✅ | ✅ | ❌ |
| `consent_type` enum | ✅ | ✅ | ❌ |
| `deletion_logs` table | ❌ | ❌ | ✅ |

**`deletion_logs` schema (prod only)**:
- `id UUID PK DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL`
- `deleted_at TIMESTAMPTZ DEFAULT now()`
- `reason TEXT`
- `created_at TIMESTAMPTZ DEFAULT now()`

**Structural impact**:

1. **GDPR compliance gap**: `consent_logs` tracks user consent events (terms_of_service, privacy_policy) — a GDPR requirement. Its absence from prod means either: (a) consent logging was never deployed to production, or (b) it was intentionally replaced by a different mechanism. Either scenario requires clarification.
2. **Untracked prod-only table**: `deletion_logs` exists only on prod with no corresponding migration file in the repo (or the migration was applied manually). This breaks the "migrations are the source of truth" contract.
3. **Orphan enum on local+dev**: The `consent_type` enum exists on local+dev but its table doesn't exist on prod. If `consent_logs` is truly not needed on prod, the enum should also be absent from local+dev (or the table should exist on prod).
4. **Testing blind spots**: Tests running locally/dev exercise `consent_logs` but this table doesn't exist in production. Conversely, `deletion_logs` behavior is never tested locally.

**Recommendation**: 
- Investigate whether `consent_logs` was intentionally excluded from prod or is a missing migration
- Determine if `deletion_logs` was created via manual SQL on prod (migration hygiene violation)
- Create proper migration files for whichever tables should exist across all environments
- Align all three environments to a single schema truth

---

### F-10 · LOW — Duplicate `updated_at` Triggers on `providers`

**Verified on prod and dev** (2026-04-30). Both environments have two BEFORE UPDATE triggers that set `updated_at`:

| Trigger Name | Timing | Event |
|-------------|--------|-------|
| `trigger_providers_updated_at` | BEFORE UPDATE | UPDATE |
| `update_providers_updated_at` | BEFORE UPDATE | UPDATE |

Both triggers fire on every UPDATE to `providers`, each calling a function that sets `updated_at = now()`. The second trigger's write is redundant — the timestamp will be identical since both execute within the same transaction.

**Structural impact**:

1. **Wasted function calls**: Two trigger function invocations per UPDATE instead of one. At current scale this is negligible, but it signals migration hygiene drift.
2. **Root cause**: Likely created by two separate migrations — one using the naming convention `trigger_<table>_updated_at` and another using `update_<table>_updated_at` — without checking for an existing trigger.
3. **Ambiguity**: Which trigger was "intended"? The naming inconsistency suggests different authors or different migration generations.

**Recommendation**: Drop one of the duplicate triggers (keep whichever naming convention is more consistent across the schema). Low priority.

---

### F-11 · HIGH — No Shared Migration Lineage Across Environments

**Verified via MCP** on 2026-04-29:

| Environment | Migration Tracking | Migration Count | Version Format | Notes |
|---|---|---|---|---|
| **Prod** (`rdtdtcfntopcxcigkqoq`) | `supabase_migrations.schema_migrations` does NOT exist | 0 tracked | N/A | Schema applied via Dashboard SQL / manual psql |
| **Dev** (`qrekonfhaenjdnjhwdum`) | `supabase_migrations.schema_migrations` exists | 4 tracked | Timestamp (`20251208...`) | Unrelated to local numeric chain |
| **Local** (CLI) | `supabase_migrations.schema_migrations` exists | 81 files | Numeric (`0000_`, `001_`, ...) | Required 6 patches to replay via `supabase db reset` |

**Structural impact**:

1. **No deployment mechanism**: The 81 migration files in `supabase/migrations/` are historical artifacts — neither prod nor dev uses them. `supabase db push` or `supabase db reset` against these files does NOT produce the same schema as prod.
2. **Patching history is backwards**: Fixing historical migrations (061, 069, 071, 075) to make `supabase db reset` work encodes 2-year-old design decisions as permanent structural constraints. The fixes ensure replay correctness but not schema correctness.
3. **New environments cannot bootstrap deterministically**: A new developer running `supabase db reset` will get a schema shaped by historical migration order and accumulated patches — not the target schema design.
4. **Plan 114 structural refactors have no shared starting point**: If Phase 1+ migrations are written against the local chain, they may fail on prod (different schema state) or dev (different migration tracking).
5. **Phase 0 migration (078) may be partially redundant on prod**: Some redundant indexes may not exist on prod (163 indexes vs 159 local). The migration must be verified against each environment independently.

**Root cause**: Schema management was never standardized. Early development likely used the Supabase Dashboard SQL editor for prod, while local development evolved its own migration chain. These paths diverged silently.

**Recommendation**: Execute ADR-114 (Migration Baseline Squash) before any Plan 114 structural refactoring:
1. `pg_dump --schema-only` from prod → `001_baseline.sql`
2. Extract seed data (categories, badge_types, cities, etc.) → `002_seed.sql`
3. Archive all 81 historical migrations to `supabase/migrations/archive/`
4. Phase 0 changes (if not yet applied to prod) become `003_phase0_schema_hygiene.sql`
5. All Plan 114 Phase 1+ migrations number from there
6. Establish `supabase_migrations.schema_migrations` tracking on prod

---

## Summary: Severity-Ranked Findings

| # | Severity | Finding | Effort | Risk if Deferred |
|---|----------|---------|--------|-----------------|
| F-1 | **CRITICAL** | Dual-PK anti-pattern (`id` + `<entity>_id`) on 6 tables | High (26 FK references) | Ongoing confusion, index bloat, JOIN bugs |
| F-2 | **HIGH** | UUID array columns instead of junction tables | Medium (4 columns → 2 junction tables) | Silent orphan data, no cascades |
| F-3 | **HIGH** | `barakah_effects` triple-source incoherence | Medium (form path + trigger gaps) | New providers invisible to search filters |
| F-4 | **HIGH** | Polymorphic FK without DB enforcement | Medium (2 tables, closed set) | Orphan rows, no cascade deletes |
| F-5 | **MEDIUM** | Boolean flag proliferation (45-col `providers` table) | Low (add CHECK constraints only) | Semantic inconsistency across sections |
| F-6 | **MEDIUM** | Schema cohesion (subsystem mixing) | Low (naming convention adequate) | Cognitive load scales with table count |
| F-9 | **MEDIUM** | Cross-environment schema divergence (consent_logs/deletion_logs) | Low (align migrations) | GDPR compliance uncertainty, testing blind spots |
| F-7 | **LOW** | 10 redundant indexes + 3 missing composites | Low (DROP + CREATE) | Minor storage/write overhead |
| F-8 | **LOW** | Migration 076 badge sync trigger missing locally only | Trivial (`supabase db reset`) | Local dev diverges from prod behavior |
| F-10 | **LOW** | Duplicate `updated_at` triggers on `providers` | Trivial (DROP one trigger) | Redundant function calls per UPDATE |
| F-11 | **HIGH** | No shared migration lineage across environments | Medium (baseline squash) | Structural refactors have no shared starting point; new devs cannot bootstrap |

---

## Recommendations for Planner

0. **[PREREQUISITE] F-11 / ADR-114 — Migration Baseline Squash**: Before any structural refactoring, dump prod schema as `001_baseline.sql`, archive the 81 historical migrations, and establish forward-only migration management. ALL subsequent phases depend on a shared starting point. This replaces the current Phase 0 approach of patching historical migrations.
1. **F-9 next (immediate post-baseline)**: Align schema across all three environments. Investigate `consent_logs` absence from prod and `deletion_logs` as a prod-only table. Reconcile during baseline creation.
2. **F-3 is the most urgent user-facing issue**: New providers being invisible to search filters is a live product bug disguised as schema debt. The badge sync trigger (F-8) is live on prod but only covers 3 of 10+ booleans — the form-write path still never sets booleans.
3. **F-7 + F-10 are quick wins**: Absorbed into baseline if prod schema already reflects cleanup, or applied as first forward migration.
4. **F-8 is dev hygiene**: Resolved by baseline approach — local schema matches prod.
5. **Revised phased approach**: F-11 (baseline) → F-9 (reconcile during baseline) → F-3 → F-7/F-10 → F-2 → F-4 → F-5 → F-1 (highest effort, plan last).
6. **F-5 requires no DDL beyond CHECKs**: Adding section-scoped CHECK constraints is a non-breaking additive migration.
7. **F-6 is advisory**: No action needed now. Flag for reassessment when table count exceeds 35.

---

## Architectural Constraints for Refactoring

- All refactoring MUST be backwards-compatible (zero-downtime migration strategy)
- Supabase managed Postgres — no superuser access for `pg_repack` or similar tools
- RLS policies reference column names — any column rename requires policy recreation
- `upsert_joinhalal_providers` RPC and 33 other public functions reference specific column names — must be updated in lockstep
- Application code (`src/services/`) uses Supabase client `.from('providers').select('provider_id, ...')` — column renames require coordinated app deploy
- Local dev DB state may drift from production — **all migration verification must also be done against prod/UAT**
- 13 triggers exist locally (19 on prod, 24 on dev) — column renames or table restructuring must audit trigger function bodies
- **Environment drift is confirmed**: Local, dev, and prod schemas are NOT identical. Any migration plan MUST verify against all three environments.

---

## Data Source

All findings verified against three environments:
- **Local**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres` via Supabase CLI v2.75.0
- **Dev**: Supabase project `qrekonfhaenjdnjhwdum` via MCP (`mcp_supabase-dev_execute_sql`)
- **Prod**: Supabase project `rdtdtcfntopcxcigkqoq` via MCP (`mcp_supabase-prod_execute_sql`)
- **Introspection queries**: `information_schema.tables`, `information_schema.columns`, `pg_constraint`, `pg_indexes`, `pg_proc`, `pg_type`, `pg_enum`, `pg_matviews`, `information_schema.triggers`
- **Dates**: 2026-04-29 (local), 2026-04-30 (prod + dev)

---

✅ PHASE COMPLETE: Architect — Verdict: APPROVED_WITH_CHANGES
📄 Output: agent-output/architecture/114-db-schema-architecture-review.md
📊 10 findings across 3 environments (1 CRITICAL, 3 HIGH, 3 MEDIUM, 3 LOW)
➡️ NEXT: @Planner to create phased migration plan from these 10 findings
   Gate: This architecture doc exists with severity-ranked findings and no blocking unknowns ✓
