# 118 — Field-Level Schema Design Review

**ID**: 118
**Origin**: Task #118 — Full field-level schema review, all tables
**Status**: APPROVED_WITH_CHANGES
**Verdict**: 28 field-level findings across 34 tables + 1 MV. No CRITICAL blockers; 5 HIGH, 14 MEDIUM, 9 LOW findings requiring staged remediation.

## Changelog

| Date       | Context                                | Summary                                                                 |
| ---------- | -------------------------------------- | ----------------------------------------------------------------------- |
| 2026-04-30 | Initial field-level review (S118)      | Full column-level audit via Supabase MCP against prod (`rdtdtcfntopcxcigkqoq`). 34 tables + 1 MV introspected. 22 findings ranked. Owner questions on categories answered explicitly. |
| 2026-05-01 | FL-23 added (S118 continuation)        | Owner review of `badge_types` vs provider boolean columns surfaced missing conceptual model. Trust vs amenity distinction identified as root cause of maintainability problem. Data-driven trigger + unified registry recommended. |
| 2026-05-01 | FL-23 revised + FL-24, FL-25 added     | Owner provided product definitions for trust vs amenity: amenity = physical/usable (prayer space, parking, women section, family friendly). Trust = value/practice claim (no alcohol, no pork, no gambling, muslim owned, halal level, solidarity, donations). Solidarity and donations column names identified as semantic mismatches with owner intent. |
| 2026-05-01 | FL-26 added                            | Owner questioned whether providers table should be split by type (food vs business vs ummah). Key finding: ummah is already split (`community_services` table exists; `listing_type_enum` only has 'food' and 'business'). Full supertype unification recommended: providers covers food + business + ummah; three 1:1 extension tables; community_services merged; bookmarks simplified; community_projects FK renamed; provider_community_services → provider_engagements (open engagement graph). Pre-consumer window is time-sensitive. |
| 2026-05-01 | FL-27 added                            | Owner asked whether category_suggested_offers and category_suggested_needs should be removed. Verdict: keep. All 4 FK constraints correct with ON DELETE CASCADE. Tables serve a distinct purpose (cross-category editorial curation + priority ordering) that cannot be collapsed into offers.category_id. One code quality fix: category-suggestions.ts should call existing RPCs instead of two-hop queries. |
| 2026-05-01 | FL-28 added                            | Owner asked whether `provider_menu_items`/`provider_service_offers` should be renamed to `food_menu_items`/`store_offers`, and whether "stores" is a better term than "business". Finding: UI already shows "Stores" via `sections.stores` translation key; developer left explicit comment in `SectionSelector.tsx` noting the split. Renaming `listing_type = 'business'` → `'store'` recommended — bundle into FL-26 migration. `provider_service_offers` has no app service layer (only one migration test). Both catalog tables renamed for consistency: `provider_menu_items` → `provider_menu`, `provider_service_offers` → `provider_catalog` — keeps `provider_*` convention, eliminates "offers" overloading, creates a clean parallel pair. |
| 2026-05-01 | FL-3 app code implemented; schema migration pending | `applicable_to` removed from all app code and types. `applicable_section` made sole scoping mechanism. Code reviewed and approved. QA passed. Schema `DROP COLUMN` migration pending in Plan 116 M-1. |

---

## Scope

Per-column field design review of the UFlow `public` schema on production. This review goes **one level deeper** than Plan 114's structural review — examining column types, nullability, defaults, naming, and constraint completeness for every table.

**Data sources**: `information_schema.columns`, `pg_constraint`, `information_schema.table_constraints`, `information_schema.referential_constraints`, live `categories` data, `pg_matviews`, `pg_enum`.

**Prior art**: Plan 114 addressed systemic structural issues (F-1 through F-11). This review does NOT reopen those findings but references them where relevant.

---

## Schema Evolution Since Plan 114

Several Plan 114 structural recommendations have been implemented on prod:

| Plan 114 Finding | Status on Prod | Evidence |
|---|---|---|
| F-1 (Dual-PK) | **RESOLVED** | Vestigial `id` columns dropped from `providers`, `categories`, `community_services`. PK is now the business key (`provider_id`, `category_id`, `community_service_id`). Ordinal position gaps (1, 4, 17, etc.) confirm dropped columns. |
| F-2 (UUID arrays) | **RESOLVED** | New junction tables: `provider_offers`, `provider_needs`, `community_service_offers`, `community_service_needs`. Array columns (`offers_ids`, `needs_ids`) no longer present. |
| F-4 (Polymorphic FK) | **RESOLVED** | `bookmarks` and `provider_badges` now use typed nullable FK columns with `CHECK (num_nonnulls(...) = 1)` mutual exclusion. |
| F-5 (Section CHECKs) | **RESOLVED** | Three section-scoped CHECKs on `providers`: `providers_listing_type_food_only_ck`, `providers_listing_type_business_only_ck`, `providers_listing_type_ummah_only_ck`. |
| `listing_type_enum` | **EXTENDED** | Now has 3 values: `food`, `business`, `ummah` (was 2 at time of Plan 114). |

**Updated table count**: 34 tables + 1 MV (was 29 + 1 MV). New tables: `provider_offers`, `provider_needs`, `community_service_offers`, `community_service_needs`, `deletion_logs` (previously prod-only, now in schema).

---

## Owner Questions — Explicit Answers

### Q1: `categories.applicable_to` — Type, values, and mechanism

**Live definition**:
```
column: applicable_to
type: TEXT[] (text array)
nullable: YES
default: '{provider,community_service}'::text[]
```

**Live data** (20 rows): Every row contains **exactly one** value — either `['provider']` (19 rows) or `['community_service']` (1 row). No row uses the default of both values simultaneously.

**Assessment**: The array type is over-engineered for the actual data pattern. This is a **single-value discriminator** masquerading as a multi-value array. The default of `'{provider,community_service}'::text[]` implies "applies to both" but no data uses that. The semantic intent is: "which entity type can this category be assigned to?"

**Recommendation**: Replace `TEXT[]` with `TEXT NOT NULL` (or ideally `entity_type` enum) with a CHECK constraint. The array default is misleading — it creates the appearance of a many-to-many relationship that doesn't exist. If a category genuinely needs to apply to both entity types in future, a junction table (`category_entity_types`) would be more appropriate than an array.

---

### Q2: `categories.applicable_section` — Relationship to `listing_type_enum`

**Live definition**:
```
column: applicable_section
type: TEXT
nullable: YES
default: NULL
CHECK: (applicable_section IN ('food', 'business', 'ummah', 'all'))
```

**Live data**: 12 rows have `applicable_section = 'food'`, 3 have `'business'`, 1 has `'ummah'`, 4 have `NULL`.

**Coupling with `listing_type_enum`**: The CHECK constraint values (`food`, `business`, `ummah`, `all`) **mirror** the `listing_type_enum` values (`food`, `business`, `ummah`) plus `all` and `NULL`. This is a manual coupling — they share the same domain vocabulary but are not formally linked.

**Risk**:
1. If a new `listing_type_enum` value is added (e.g., `education`), the `categories.applicable_section` CHECK constraint must be updated separately — no compiler/DB enforcement ensures synchronization.
2. `NULL` and `'all'` are ambiguous — both appear to mean "applies to all sections." Four categories have `NULL` (`applicable_section`) but those same categories have generic names like "Bildung & Lernen", "Sonstiges" which should apply to all sections. The intent of NULL vs 'all' is undocumented.
3. The query path: when listing providers of `listing_type = 'food'`, the app must filter categories where `applicable_section IN ('food', 'all') OR applicable_section IS NULL`. This three-way OR is fragile.

**Recommendation**:
- Make `applicable_section` NOT NULL with DEFAULT `'all'`. Eliminate the NULL ambiguity.
- Consider using the `listing_type_enum` type directly (with 'all' added) instead of a TEXT CHECK to enforce synchronization.
- Alternatively, model as a junction table if categories can eventually apply to multiple sections.

---

### Q3: `category_suggested_needs` / `category_suggested_offers` — Constraints, consumption, conflict with F-2

**Live definition** (both tables are structurally identical):
```
category_suggested_offers:
  id UUID PK (gen_random_uuid())
  category_id UUID NOT NULL → categories(category_id) ON DELETE CASCADE
  offer_id UUID NOT NULL → offers(offer_id) ON DELETE CASCADE
  priority INTEGER DEFAULT 0
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
  UNIQUE(category_id, offer_id)

category_suggested_needs:
  id UUID PK (gen_random_uuid())
  category_id UUID NOT NULL → categories(category_id) ON DELETE CASCADE
  need_id UUID NOT NULL → needs(need_id) ON DELETE CASCADE
  priority INTEGER DEFAULT 0
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
  UNIQUE(category_id, need_id)
```

**Constraint completeness**: ✅ These tables have proper FK + CASCADE + UNIQUE constraints on the composite business key. The junction is well-constrained.

**Intended consumption**: These tables define **which offers/needs are "suggested" for a given category** — i.e., when a user selects category "Türkisch", the UI can pre-suggest relevant offers ("Döner", "Lahmacun") from the vocabulary. The `priority` column enables ordering of suggestions.

**Conflict with `provider_offers` / `provider_needs` (F-2 debt)**: These serve **different purposes** and do NOT conflict:

| Table | Purpose | Relationship |
|---|---|---|
| `category_suggested_offers` | Admin-curated "suggestions" per category | Category → Offer (vocabulary pre-selection) |
| `provider_offers` | Actual offers a specific provider has | Provider → Offer (fact) |

The old `providers.offers_ids UUID[]` was the F-2 debt — it stored the same data as `provider_offers` but as an array. That has been resolved. `category_suggested_offers` was never in conflict; it's a different relationship (category-level suggestions vs provider-level facts).

**Minor issue**: The surrogate `id` PK is redundant — the `UNIQUE(category_id, offer_id)` could serve as the composite PK directly. This is a stylistic debt (see FL-16 below).

---

## Findings — Field-Level (FL-prefix)

### FL-1 · HIGH — `bookmarks` Missing UNIQUE Constraint on (user_id, entity)

**Table**: `bookmarks`

**Current constraints**: PK on `id`, FK on `user_id`/`provider_id`/`community_service_id`, CHECK `num_nonnulls(provider_id, community_service_id) = 1`.

**Missing**: No UNIQUE constraint on `(user_id, provider_id)` or `(user_id, community_service_id)`. A user can bookmark the same provider or community service **multiple times**. This is almost certainly a bug — bookmark semantics are toggle-based (add/remove), not accumulative.

**Impact**: Duplicate bookmarks accumulate silently. UI shows duplicate entries. Removal logic (`DELETE WHERE user_id = X AND provider_id = Y`) may delete only one, leaving duplicates. Count queries are inflated.

**Fix**: 
```sql
CREATE UNIQUE INDEX idx_bookmarks_user_provider 
  ON bookmarks(user_id, provider_id) WHERE provider_id IS NOT NULL;
CREATE UNIQUE INDEX idx_bookmarks_user_community_service 
  ON bookmarks(user_id, community_service_id) WHERE community_service_id IS NOT NULL;
```

---

### FL-2 · HIGH — `provider_badges` Missing UNIQUE Constraint on (entity, badge_type)

**Table**: `provider_badges`

**Current constraints**: PK on `id`, FK on `badge_type_id`/`provider_id`/`community_service_id`, CHECK mutual exclusion.

**Missing**: No UNIQUE constraint on `(provider_id, badge_type_id)` or `(community_service_id, badge_type_id)`. A provider can be assigned the **same badge type multiple times**. This breaks the trust-level progression model — a provider should have at most one instance of each badge type.

**Impact**: Duplicate badge entries inflate `confirmation_count` aggregations. Badge display logic must deduplicate in application code. The `sync_provider_badge_to_boolean()` trigger may fire multiple times redundantly.

**Fix**:
```sql
CREATE UNIQUE INDEX idx_provider_badges_provider_type 
  ON provider_badges(provider_id, badge_type_id) WHERE provider_id IS NOT NULL;
CREATE UNIQUE INDEX idx_provider_badges_cs_type 
  ON provider_badges(community_service_id, badge_type_id) WHERE community_service_id IS NOT NULL;
```

---

### FL-3 · HIGH — `categories.applicable_to` Redundant with `applicable_section` (Two Columns, One Concept)

**Table**: `categories`

**Current**:
- `applicable_to TEXT[] DEFAULT '{provider,community_service}'::text[]` — NULLABLE, no CHECK
- `applicable_section TEXT CHECK (IN ('food', 'business', 'ummah', 'all'))` — NULLABLE

**Problem**: Both columns answer the same question: "Which section of the platform should this category appear in?" Since `ummah` is now a `listing_type_enum` value AND community services ARE the ummah section, the entity-type discriminator (`applicable_to`) is fully redundant with the section discriminator (`applicable_section`). Live data confirms perfect alignment:

| `applicable_to` | `applicable_section` | Equivalent single value |
|---|---|---|
| `['provider']` | `food` | `food` |
| `['provider']` | `business` | `business` |
| `['community_service']` | `ummah` | `ummah` |
| `['provider']` | `NULL` | `all` |

No row breaks this mapping — the array column carries zero additional information.

**Impact**:
- Two columns to maintain/query for one concept.
- `applicable_to` is a TEXT[] with no CHECK — any value accepted, GIN index required.
- Divergence risk: the two columns could theoretically contradict each other (e.g., `applicable_to = ['community_service']` with `applicable_section = 'food'`).
- Query paths must filter on BOTH columns to be correct.

**Fix**: Drop `applicable_to` entirely. Make `applicable_section` the sole scoping mechanism:
```sql
-- Backfill NULLs
UPDATE categories SET applicable_section = 'all' WHERE applicable_section IS NULL;
-- Enforce
ALTER TABLE categories ALTER COLUMN applicable_section SET NOT NULL;
ALTER TABLE categories ALTER COLUMN applicable_section SET DEFAULT 'all';
-- Drop redundant column
ALTER TABLE categories DROP COLUMN applicable_to;
```
Requires coordinated app code change (remove all `applicable_to` query filters, rely solely on `applicable_section`).

---

### FL-4 · HIGH — `needs.category_id` NOT NULL with ON DELETE SET NULL FK (Logical Conflict)

**Table**: `needs`

**Current**: `category_id UUID NOT NULL` with FK `needs_category_id_fkey → categories(category_id) ON DELETE SET NULL`.

**Problem**: The NOT NULL constraint and ON DELETE SET NULL are in direct conflict. If a category is deleted, Postgres attempts to SET NULL on `needs.category_id`, which violates the NOT NULL constraint, causing the DELETE to **fail** (effectively becoming ON DELETE RESTRICT behavior). The declared intent (SET NULL) does not match the actual behavior.

**Impact**: Misleading schema documentation. Developers reading the FK definition expect soft-unbinding on category deletion, but actually get hard failure. Same issue exists on `offers.category_id` (also NOT NULL + ON DELETE SET NULL).

**Fix**: Choose one:
- If needs MUST have a category: Change FK to `ON DELETE RESTRICT` (matching actual behavior, makes intent explicit).
- If needs CAN exist without a category: Change column to `category_id UUID` (nullable).

---

### FL-5 · MEDIUM — `categories.applicable_section` Nullable with Ambiguous NULL vs 'all' Semantics

**Table**: `categories`

**Current**: `applicable_section TEXT`, nullable, CHECK `IN ('food', 'business', 'ummah', 'all')`.

**Problem**: 4 categories have NULL, 0 have 'all'. Both NULL and 'all' appear to mean "applies to all listing types." This dual-representation creates fragile query logic requiring `WHERE applicable_section = 'food' OR applicable_section IS NULL OR applicable_section = 'all'`.

**Fix**: `ALTER TABLE categories ALTER COLUMN applicable_section SET NOT NULL, ALTER COLUMN applicable_section SET DEFAULT 'all';` after backfilling NULLs with 'all'.

---

### FL-6 · MEDIUM — `providers.listing_type` NOT NULL Without DEFAULT

**Table**: `providers`

**Current**: `listing_type listing_type_enum NOT NULL`, no DEFAULT.

**Problem**: Every INSERT must explicitly provide `listing_type`. For community-submitted providers (via forms), if the form doesn't capture this field, the INSERT fails silently. Unlike other NOT NULL columns in the schema which have sensible defaults (`created_at`, `enrichment_eligible`, boolean flags), this critical column has no fallback.

**Impact**: Potential INSERT failures in edge cases (form submissions where listing_type wasn't selected, bulk imports, API edge cases).

**Recommendation**: Either add a DEFAULT (e.g., `'business'` as the most common type), or ensure ALL write paths validate this field at the application layer before INSERT. The form-level validation is the preferred approach — schema should not default a semantically critical discriminator.

**Verdict**: Advisory — no schema change needed if app-layer validation is confirmed complete.

---

### FL-7 · MEDIUM — `providers.review_status` Nullable (Should Be NOT NULL)

**Table**: `providers`, `community_services`

**Current**: `review_status review_status DEFAULT 'pending'::review_status`, NULLABLE.

**Problem**: A provider or community_service with NULL review_status is semantically undefined — it's neither pending nor approved nor rejected. The DEFAULT suggests intent was "always starts as pending", but NULL is still possible via explicit `INSERT ... VALUES (NULL)` or programmatic SET.

**Impact**: Query filters like `WHERE review_status = 'approved'` exclude NULL rows (intended?). Admin dashboards counting pending items miss NULL rows.

**Fix**: `ALTER TABLE providers ALTER COLUMN review_status SET NOT NULL;` (after backfilling any NULLs with 'pending'). Same for `community_services.review_status`.

---

### FL-8 · MEDIUM — `community_services.is_verified` Nullable Boolean

**Table**: `community_services`

**Current**: `is_verified BOOLEAN DEFAULT false`, NULLABLE.

**Problem**: Three-valued logic for what should be binary. `NULL`, `false`, and `true` all exist as possible states. Boolean columns should be NOT NULL — the absence of verification is `false`, not NULL.

**Impact**: `WHERE is_verified = true` works correctly, but `WHERE NOT is_verified` would exclude NULLs, potentially hiding unverified services.

**Fix**: `ALTER TABLE community_services ALTER COLUMN is_verified SET NOT NULL;` (after `UPDATE ... SET is_verified = false WHERE is_verified IS NULL`).

---

### FL-9 · MEDIUM — `admin_audit_logs.action` and `target_type` Use TEXT Without Enum

**Table**: `admin_audit_logs`

**Current**: `action TEXT NOT NULL`, `target_type TEXT NOT NULL CHECK (IN ('provider', 'user', 'system'))`.

**Problem**: `target_type` has a CHECK constraint (good) but `action` has none. Any arbitrary string can be stored as an action — no validation, no discoverable vocabulary. As the admin system grows, the set of actions becomes unknowable without scanning live data.

**Impact**: Analytics queries must guess/discover valid action values. Typos in action strings create silent data fragmentation.

**Recommendation**: Add a CHECK constraint on `action` with the known values, or create an `audit_action` enum. At minimum, document the valid action values in a comment.

---

### FL-10 · MEDIUM — `provider_outreach_tasks.task_status` TEXT with CHECK Instead of Enum

**Table**: `provider_outreach_tasks`

**Current**: `task_status TEXT NOT NULL DEFAULT 'pending' CHECK (IN ('pending', 'in_progress', 'completed', 'cancelled'))`.

**Problem**: The outreach subsystem uses proper enums for `outreach_status` and `outreach_channel` but uses TEXT+CHECK for `task_status`. This is inconsistent within the same domain.

**Impact**: No enum introspection, no IDE autocomplete for valid values, inconsistency with sibling tables.

**Fix**: Create `task_status_enum` type and migrate. Low priority but improves consistency.

---

### FL-11 · MEDIUM — `providers.category_id` FK Has ON DELETE NO ACTION

**Table**: `providers`

**Current**: `category_id UUID → categories(category_id) ON DELETE NO ACTION`.

**Problem**: If an admin attempts to delete or merge a category, the operation will fail with an FK violation for every provider referencing that category. This makes category management (rename, merge, retire) impossible without manual provider-by-provider reassignment.

**Contrast**: `community_services.category_id` has the same issue. But `needs.category_id` / `offers.category_id` use ON DELETE SET NULL (even though that conflicts with NOT NULL — see FL-4).

**Recommendation**: Change to `ON DELETE SET NULL` (allow providers to exist without a category temporarily) or implement a category merge procedure that reassigns providers before deletion.

---

### FL-12 · MEDIUM — `deletion_logs.user_id` Has No FK Constraint

**Table**: `deletion_logs`

**Current**: `user_id UUID NOT NULL`, no FK.

**Problem**: This table logs user account deletions. By design, the user won't exist after deletion, so a traditional FK would prevent the log from persisting. However, the absence of any referential link means orphan entries cannot be validated against historical data.

**Assessment**: This is actually **correct by design** — you can't FK to a row that will be deleted. The NOT NULL constraint is sufficient. However, a comment documenting this intentional design choice would prevent future developers from "fixing" it.

**Verdict**: No change needed. Document intent.

---

### FL-13 · MEDIUM — `community_services.show_address` and `providers.show_address` Nullable Boolean

**Tables**: `providers`, `community_services`

**Current**: `show_address BOOLEAN DEFAULT true`, NULLABLE.

**Problem**: Same three-valued logic issue as FL-8. The default is `true` (show the address), but NULL is possible. Does NULL mean "show" or "don't show"? Application code must handle this ambiguity.

**Fix**: `ALTER TABLE providers ALTER COLUMN show_address SET NOT NULL;` (after backfilling NULLs with `true`).

---

### FL-14 · MEDIUM — `enrichment_candidates.run_id` Has No FK to `enrichment_run_logs`

**Table**: `enrichment_candidates`

**Current**: `run_id UUID`, nullable, no FK constraint.

**Problem**: Semantically this references `enrichment_run_logs.id` (which run created this candidate). Without FK, orphan `run_id` values can exist, and cascade behavior on run deletion is undefined.

**Fix**: `ALTER TABLE enrichment_candidates ADD CONSTRAINT enrichment_candidates_run_id_fkey FOREIGN KEY (run_id) REFERENCES enrichment_run_logs(id) ON DELETE SET NULL;`

---

### FL-15 · LOW — Redundant UNIQUE Constraint on PK Columns

**Tables**: `categories`, `community_services`, `providers`, `users`

**Current**: These tables have both a PRIMARY KEY and a separate UNIQUE constraint on the same column (e.g., `categories_category_id_key` UNIQUE alongside `categories_pkey`).

**Problem**: A PRIMARY KEY already implies UNIQUE + NOT NULL. The explicit UNIQUE constraint is fully redundant — it creates a second index that wastes storage and slows writes.

**Root cause**: Likely a legacy artifact from when `category_id` was not the PK (it was the "business key" alongside a separate `id` PK — the F-1 pattern). After F-1 was resolved and `category_id` became the PK, the old UNIQUE constraint wasn't dropped.

**Fix**: `DROP CONSTRAINT categories_category_id_key;` (and equivalent for the other 3 tables).

---

### FL-16 · LOW — `category_suggested_offers/needs` Redundant Surrogate PK

**Tables**: `category_suggested_offers`, `category_suggested_needs`

**Current**: PK on `id UUID`, plus UNIQUE on `(category_id, offer_id)` / `(category_id, need_id)`.

**Problem**: The natural composite key `(category_id, offer_id)` is already UNIQUE and could serve as the PK. The surrogate `id` adds 16 bytes per row + an extra index for no query benefit — no external table references these tables by `id`.

**Impact**: Minor storage overhead. Not blocking.

**Recommendation**: If refactoring, switch to composite PK. Otherwise, leave as-is (YAGNI — the overhead is minimal at current scale).

---

### FL-17 · LOW — `cities.trust_level` Integer Without Range CHECK

**Table**: `cities`

**Current**: `trust_level INTEGER DEFAULT 0`, nullable.

**Problem**: No CHECK constraint bounding the value. Negative values or extremely large values are valid. The semantics (what does trust_level=5 mean?) are undocumented.

**Fix**: Add `CHECK (trust_level >= 0 AND trust_level <= 10)` (or whatever the actual range should be).

---

### FL-18 · LOW — `waitlist.is_provider` Nullable Boolean

**Table**: `waitlist`

**Current**: `is_provider BOOLEAN`, nullable, no default.

**Problem**: NULL means "we don't know if they're a provider." Should be NOT NULL DEFAULT false (most waitlist signups are users, not providers).

**Fix**: `ALTER TABLE waitlist ALTER COLUMN is_provider SET NOT NULL, ALTER COLUMN is_provider SET DEFAULT false;`

---

### FL-19 · LOW — `email_confirmation_tokens.type` TEXT with CHECK Instead of Enum

**Table**: `email_confirmation_tokens`

**Current**: `type TEXT NOT NULL CHECK (IN ('signup', 'password_reset', 'magic_link'))`.

**Problem**: Works correctly but is inconsistent with the enum usage pattern elsewhere. Lower priority than FL-10 since this is an auth utility table with low write frequency.

**Verdict**: Advisory. No immediate action.

---

### FL-20 · LOW — Inconsistent Naming: `community_service_view_count` vs `provider_view_count` (Dropped)

**Table**: `community_services`

**Current**: `community_service_view_count INTEGER DEFAULT 0`. The equivalent column on `providers` appears to have been dropped (no view_count column visible).

**Problem**: If `providers` once had a view count and dropped it (perhaps moved to `provider_stats` MV), `community_services` still carries a denormalized counter. Denormalized counters require trigger-based maintenance or are eventually stale.

**Recommendation**: Either add `community_service_view_count` to the `provider_stats` MV (or a new `community_service_stats` MV), or accept the denormalized counter with documented staleness guarantees.

---

### FL-21 · LOW — `provider_owner_outreach.dispatch_after` Non-Standard Default

**Table**: `provider_owner_outreach`

**Current**: `dispatch_after TIMESTAMPTZ NOT NULL DEFAULT (now() + '24:00:00'::interval)`.

**Problem**: The default computes "24 hours from INSERT time." This is a valid pattern but unusual — most timestamps default to `now()` or NULL. If a row is inserted with the intent of immediate dispatch, the default silently delays it by 24 hours. This is business logic encoded in the schema.

**Verdict**: Intentional by design (approval workflow requires 24h cool-down). Document the business rule in a comment.

---

### FL-22 · LOW — `community_projects.price_currency` / `provider_menu_items.price_currency` / `provider_service_offers.price_currency` TEXT without CHECK

**Tables**: `community_projects`, `provider_menu_items`, `provider_service_offers`

**Current**: `price_currency TEXT NOT NULL DEFAULT 'EUR'::text`.

**Problem**: No CHECK constraint validates the currency code. Invalid codes like 'EURO' or 'XYZ' are accepted. Since UFlow currently operates only in Germany (EUR), this is low risk but should be constrained.

**Fix**: Add `CHECK (price_currency IN ('EUR'))` — expandable when multi-currency is needed.

---

## Per-Table Verdict Summary

| # | Table | Verdict | Findings |
|---|-------|---------|----------|
| 1 | `admin_audit_logs` | ⚠️ MEDIUM | FL-9 (action unconstrained) |
| 2 | `badge_confirmations` | ✅ CLEAN | Well-constrained (UNIQUE, FK+CASCADE) |
| 3 | `badge_system_config` | ✅ CLEAN | Simple KV store, PK on config_key |
| 4 | `badge_types` | ✅ CLEAN | Proper UNIQUE on badge_key, NOT NULL on required fields |
| 5 | `badge_verifications` | ✅ CLEAN | FK+CASCADE on provider_badge_id, SET NULL on verifier |
| 6 | `bookmarks` | 🔴 HIGH | FL-1 (missing UNIQUE on user+entity) |
| 7 | `categories` | 🔴 HIGH + ⚠️ MEDIUM | FL-3 (duplicate scope columns), FL-5 (applicable_section NULL) |
| 8 | `category_suggested_needs` | 🔵 LOW | FL-16 (redundant surrogate PK) |
| 9 | `category_suggested_offers` | 🔵 LOW | FL-16 (redundant surrogate PK) |
| 10 | `cities` | 🔵 LOW | FL-17 (trust_level unbounded) |
| 11 | `community_projects` | ✅ CLEAN | Good CHECKs on prices/dates/types |
| 12 | `community_service_needs` | ✅ CLEAN | Composite PK, proper FKs |
| 13 | `community_service_offers` | ✅ CLEAN | Composite PK, proper FKs |
| 14 | `community_services` | ⚠️ MEDIUM | FL-8 (is_verified nullable), FL-13 (show_address nullable), FL-20 (view_count denormalized) |
| 15 | `consent_logs` | ✅ CLEAN | Proper enum, NOT NULL on required, FK+CASCADE |
| 16 | `deletion_logs` | ⚠️ MEDIUM (advisory) | FL-12 (intentionally no FK — document) |
| 17 | `email_confirmation_tokens` | 🔵 LOW | FL-19 (TEXT+CHECK vs enum) |
| 18 | `enrichment_candidates` | ⚠️ MEDIUM | FL-14 (run_id no FK) |
| 19 | `enrichment_run_logs` | ✅ CLEAN | All NOT NULL with defaults, no FKs needed |
| 20 | `needs` | 🔴 HIGH | FL-4 (NOT NULL + ON DELETE SET NULL conflict) |
| 21 | `offers` | 🔴 HIGH (same as needs) | FL-4 (same conflict) |
| 22 | `provider_badges` | 🔴 HIGH | FL-2 (missing UNIQUE on entity+badge_type) |
| 35 | `badge_types` + `providers` (booleans) | 🔴 HIGH | FL-23 (no trust vs amenity distinction; three disconnected registries; hardcoded trigger) |
| 36 | `providers.solidarity_pricing` | ⚠️ MEDIUM | FL-24 (name implies pricing; owner intent is economic solidarity; business-only CHECK too restrictive) |
| 37 | `providers.accepts_donations` | ⚠️ MEDIUM | FL-25 (name implies receiving donations; owner intent is making donations; ummah-only CHECK wrong) |
| 38 | `providers` (table structure) | ⚠️ MEDIUM | FL-26 (listing_type monolith; ummah already split; extension table pattern recommended pre-consumer) |
| 39 | `category_suggested_offers`, `category_suggested_needs` | 🔵 LOW | FL-27 (keep both; FKs correct; service should use existing RPCs instead of two-hop query) |
| 40 | `listing_type_enum`, `provider_service_offers`, `provider_menu_items` | ⚠️ MEDIUM | FL-28 (UI says "Stores", DB says "business"; rename `provider_menu_items` → `provider_menu`, `provider_service_offers` → `provider_catalog`; build missing app service) |
| 23 | `provider_community_services` | ✅ CLEAN | UNIQUE composite, proper FKs |
| 24 | `provider_menu_items` | 🔵 LOW | FL-22 (price_currency unconstrained) |
| 25 | `provider_needs` | ✅ CLEAN | Composite PK, proper FKs+CASCADE |
| 26 | `provider_offers` | ✅ CLEAN | Composite PK, proper FKs+CASCADE |
| 27 | `provider_outreach_tasks` | ⚠️ MEDIUM | FL-10 (task_status TEXT vs enum) |
| 28 | `provider_owner_action_tokens` | ✅ CLEAN | UNIQUE on token_hash, proper FKs |
| 29 | `provider_owner_outreach` | 🔵 LOW | FL-21 (dispatch_after default — advisory) |
| 30 | `provider_service_offers` | 🔵 LOW | FL-22 (price_currency unconstrained) |
| 31 | `providers` | ⚠️ MEDIUM | FL-6 (listing_type no default — advisory), FL-7 (review_status nullable), FL-11 (category_id ON DELETE NO ACTION), FL-13 (show_address nullable), FL-15 (redundant UNIQUE) |
| 32 | `push_subscriptions` | ✅ CLEAN | UNIQUE on (user_id, endpoint), proper FK |
| 33 | `users` | 🔵 LOW | FL-15 (redundant UNIQUE on user_id) |
| 34 | `waitlist` | 🔵 LOW | FL-18 (is_provider nullable) |
| MV | `provider_stats` | ✅ CLEAN | Aggregation-only, no constraints needed |

---

## Severity-Ranked Summary

| # | Severity | Finding | Affected Tables | Effort |
|---|----------|---------|-----------------|--------|
| FL-1 | **HIGH** | Missing UNIQUE on bookmarks (user+entity) | `bookmarks` | Trivial (CREATE INDEX) |
| FL-2 | **HIGH** | Missing UNIQUE on provider_badges (entity+badge_type) | `provider_badges` | Trivial (CREATE INDEX) |
| FL-3 | **HIGH** | `categories.applicable_to` duplicates `applicable_section` scope semantics | `categories` | Medium (column migration) |
| FL-4 | **HIGH** | NOT NULL + ON DELETE SET NULL conflict | `needs`, `offers` | Low (ALTER FK or ALTER COLUMN) |
| FL-23 | **HIGH** | No trust vs amenity model; 3 disconnected registries; trigger hardcoded CASE | `badge_types`, `providers` (booleans) | Medium (ALTER badge_types + trigger rewrite + creation path) |
| FL-24 | **MEDIUM** | `solidarity_pricing` name mismatches owner intent (economic solidarity ≠ pricing); CHECK too restrictive | `providers` | Low (column rename + CHECK revision) |
| FL-25 | **MEDIUM** | `accepts_donations` inverts meaning (provider receives vs makes donations); ummah-only CHECK excludes food/business | `providers` | Low (column rename + DROP CHECK) |
| FL-26 | **MEDIUM** | `providers` table monolith: ummah already split; supertype + per-type extension tables recommended while pre-consumer | `providers` | Medium (2 migrations + ~15 file changes; sequence after FL-24/FL-25) |
| FL-5 | **MEDIUM** | `applicable_section` NULL vs 'all' ambiguity | `categories` | Low (backfill + SET NOT NULL) |
| FL-6 | **MEDIUM** | `listing_type` NOT NULL without DEFAULT (advisory) | `providers` | None (app-layer validated) |
| FL-7 | **MEDIUM** | `review_status` nullable | `providers`, `community_services` | Low (backfill + SET NOT NULL) |
| FL-8 | **MEDIUM** | `is_verified` nullable boolean | `community_services` | Low (backfill + SET NOT NULL) |
| FL-9 | **MEDIUM** | `action` column unconstrained | `admin_audit_logs` | Low (ADD CHECK) |
| FL-10 | **MEDIUM** | `task_status` TEXT+CHECK vs enum | `provider_outreach_tasks` | Low (CREATE TYPE + ALTER) |
| FL-11 | **MEDIUM** | `category_id` FK ON DELETE NO ACTION blocks cleanup | `providers`, `community_services` | Low (ALTER FK) |
| FL-12 | **MEDIUM** | `deletion_logs.user_id` no FK (intentional — document) | `deletion_logs` | None (comment only) |
| FL-13 | **MEDIUM** | `show_address` nullable boolean | `providers`, `community_services` | Low (backfill + SET NOT NULL) |
| FL-14 | **MEDIUM** | `run_id` missing FK | `enrichment_candidates` | Trivial (ADD CONSTRAINT) |
| FL-15 | **LOW** | Redundant UNIQUE on PK columns | `categories`, `community_services`, `providers`, `users` | Trivial (DROP CONSTRAINT) |
| FL-16 | **LOW** | Redundant surrogate PK on junction tables | `category_suggested_*` | Low (optional refactor) |
| FL-17 | **LOW** | `trust_level` integer unbounded | `cities` | Trivial (ADD CHECK) |
| FL-18 | **LOW** | `is_provider` nullable boolean | `waitlist` | Trivial (SET NOT NULL) |
| FL-19 | **LOW** | `type` TEXT+CHECK vs enum | `email_confirmation_tokens` | Low (optional) |
| FL-20 | **LOW** | Denormalized view count | `community_services` | Advisory |
| FL-21 | **LOW** | `dispatch_after` business-logic default | `provider_owner_outreach` | None (document) |
| FL-22 | **LOW** | `price_currency` unconstrained | 3 tables | Trivial (ADD CHECK) |

---

---

### FL-23 · HIGH — Provider Attribute System Has No Explicit Trust vs Amenity Model

**Tables**: `badge_types`, `provider_badges`, `providers` (11 boolean columns)

**Current State — Three Disconnected Registries:**

| Registry | Location | What it covers |
|---|---|---|
| `badge_types` | DB table (7 rows) | `MUSLIM_OWNED`, `PRAYER_FRIENDLY`, `SUPPORTS_SADAQAH`, `FAMILY_FRIENDLY`, `WOMEN_FRIENDLY`, `HALAL`, `COMMUNITY_ACTIVE` |
| Provider boolean columns | 11 columns on `providers` | `muslim_owned`, `has_prayer_space`, `accepts_donations`, `family_friendly`, `women_friendly`, `children_friendly`, `no_alcohol`, `no_pork`, `no_gambling`, `has_parking`, `solidarity_pricing` |
| TypeScript filter map | `filterKeys.ts` (5 entries) | `muslim_owned`, `accepts_donations`, `solidarity_pricing`, `has_parking`, `has_prayer_space` |

These three registries are not synchronized: there are 7 badge types, 11 booleans, and 5 filter keys — and none of them has full coverage of the others.

**Validated Attribute Classification (owner-confirmed 2026-05-01):**

Owner definition:
- **Amenity** = physical facility, actionable, can be seen or used on visit
- **Trust claim** = a values/practice claim whose truthfulness benefits from community verification

| Attribute | Category | Rationale |
|---|---|---|
| `has_prayer_space` | **Amenity** | Physical room — either it exists or it doesn't. Visitors use it directly. |
| `has_parking` | **Amenity** | Physical facility, observable on arrival or maps. |
| `women_friendly` (= women's section) | **Amenity** | Physical separation facility. |
| `family_friendly` | **Amenity** | Atmosphere/facilities observable on visit. |
| `children_friendly` | **Amenity** | Observable on visit (noise tolerance, space, facilities). |
| `muslim_owned` | **Trust** | Ownership claim — community members who know the business attest. |
| `no_alcohol` | **Trust** | Food safety claim — hidden alcohol (mirin, trace ingredients) requires verification beyond self-declaration. |
| `no_pork` | **Trust** | Food safety claim — hidden pork (gelatin, lard) requires community verification. |
| `no_gambling` | **Trust** | Values/compliance claim — community confirms operational practice. |
| `halal_level` | **Trust** | Certification claim (levels 1–3) — highest need for community/official verification. |
| `solidarity_pricing` (→ rename: see FL-24) | **Trust** | Economic solidarity: boycotts certain products, supports pro-Muslim supply chain. Community confirms the practice is genuine. |
| `accepts_donations` (→ rename: see FL-25) | **Trust** | Provider MAKES charitable donations / supports sadaqah. Community confirms the practice. |

**Root Cause — Missing Conceptual Distinction:**

All 12 attributes are stored identically as boolean columns with no schema-level encoding of their category. The badge system partially models trust claims but:
- Only 3 trust attributes are wired to the trigger (`FAMILY_FRIENDLY`, `WOMEN_FRIENDLY` badge types exist but are never synced)
- No amenity attribute has a registry row
- The trigger is a hardcoded `CASE` — adding any attribute requires a trigger rewrite
- Adding a new attribute requires touching 5+ files: schema, badge_types, trigger, filterKeys.ts, TypeScript types, providerService.ts

**Recommended Architecture:**

**Part 1: Make `badge_types` the single registry for ALL attributes.** Add three columns:

```sql
ALTER TABLE badge_types
  ADD COLUMN attribute_category TEXT NOT NULL DEFAULT 'trust'
    CHECK (attribute_category IN ('trust', 'amenity')),
  ADD COLUMN provider_column_name TEXT,  -- maps to the boolean column on providers
  ADD COLUMN is_filterable BOOLEAN NOT NULL DEFAULT false;

-- Wire existing trust badge types to their boolean columns
UPDATE badge_types SET attribute_category = 'trust', provider_column_name = 'muslim_owned',      is_filterable = true  WHERE badge_key = 'MUSLIM_OWNED';
UPDATE badge_types SET attribute_category = 'trust', provider_column_name = 'no_alcohol',         is_filterable = true  WHERE badge_key = 'HALAL'; -- see FL-25 note
UPDATE badge_types SET attribute_category = 'trust', provider_column_name = 'has_prayer_space',   is_filterable = true  WHERE badge_key = 'PRAYER_FRIENDLY';
UPDATE badge_types SET attribute_category = 'trust', provider_column_name = 'makes_donations',    is_filterable = true  WHERE badge_key = 'SUPPORTS_SADAQAH'; -- after FL-25 rename
UPDATE badge_types SET attribute_category = 'trust', provider_column_name = 'family_friendly',    is_filterable = true  WHERE badge_key = 'FAMILY_FRIENDLY';
UPDATE badge_types SET attribute_category = 'trust', provider_column_name = 'women_friendly',     is_filterable = true  WHERE badge_key = 'WOMEN_FRIENDLY';

-- Add missing trust attribute rows
INSERT INTO badge_types (badge_key, labels, icon_name, attribute_category, provider_column_name, is_filterable, is_active) VALUES
  ('NO_PORK',            '{"de":"Schweinefleischfrei","en":"No Pork"}',     'mdi:pig-off',          'trust',   'no_pork',              true,  true),
  ('NO_GAMBLING',        '{"de":"Kein Glücksspiel","en":"No Gambling"}',    'mdi:cards-off',        'trust',   'no_gambling',          true,  true),
  ('ECONOMIC_SOLIDARITY','{"de":"Wirtschaftliche Solidarität","en":"Economic Solidarity"}', 'mdi:hand-coin', 'trust', 'economic_solidarity', true, true), -- after FL-24 rename
  ('CHILDREN_FRIENDLY',  '{"de":"Kinderfreundlich","en":"Child-friendly"}', 'mdi:baby-face',        'trust',   'children_friendly',    false, true);

-- Add amenity attribute rows
INSERT INTO badge_types (badge_key, labels, icon_name, attribute_category, provider_column_name, is_filterable, is_active) VALUES
  ('HAS_PARKING',        '{"de":"Parkplatz","en":"Parking"}',               'mdi:parking',          'amenity', 'has_parking',          true,  true),
  ('HAS_WOMENS_SECTION', '{"de":"Frauenbereich","en":"Women''s Section"}',  'mdi:gender-female',    'amenity', 'women_friendly',       true,  true); -- see FL-23 note on women_friendly naming
```

**Part 2: Make the trigger data-driven** — eliminate the hardcoded `CASE` statement:

```sql
CREATE OR REPLACE FUNCTION public.sync_provider_badge_to_boolean()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_provider_id uuid;
  v_col_name text;
BEGIN
  v_provider_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.provider_id ELSE OLD.provider_id END;
  IF v_provider_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT bt.provider_column_name INTO v_col_name
  FROM badge_types bt
  WHERE bt.id = CASE WHEN TG_OP = 'INSERT' THEN NEW.badge_type_id ELSE OLD.badge_type_id END
    AND bt.provider_column_name IS NOT NULL;

  IF v_col_name IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    EXECUTE format('UPDATE public.providers SET %I = true WHERE provider_id = $1', v_col_name)
    USING v_provider_id;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM provider_badges WHERE provider_id = v_provider_id AND badge_type_id = OLD.badge_type_id
    ) THEN
      EXECUTE format('UPDATE public.providers SET %I = false WHERE provider_id = $1', v_col_name)
      USING v_provider_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
```

**Result after this fix:** One registry (`badge_types`), one write model (`provider_badges`), one indexed read layer (boolean columns). Adding a new attribute = one INSERT into `badge_types` + one `ALTER TABLE providers ADD COLUMN`. No trigger rewrite. No TypeScript map change.

**Note on `no_alcohol` / `halal_level`**: The existing `HALAL` badge type is ambiguous — halal certification spans no-pork + no-alcohol + preparation method. Recommend splitting: `NO_ALCOHOL` and `NO_PORK` as separate trust attributes; `HALAL` badge retained for overall certification status (maps to `halal_level` after FL-25 / halal_level schema decision).

**Verdict**: **HIGH** — root cause of the maintainability problem. The trigger rewrite removes the most fragile component. The unified registry makes the attribute system self-describing and scalable.

**Scope**: Coordinated change:
1. Schema: `ALTER TABLE badge_types` (3 new columns) + INSERT new rows + data-driven trigger migration
2. Schema: Column renames per FL-24 and FL-25 (coordinated)
3. App code: Route all trust attribute tags through `FORM_TAG_TO_BADGE_KEY` in `providerService.ts`; update `filterKeys.ts` to drive from `badge_types WHERE is_filterable = true`
4. No changes to search query layer (booleans stay identical; only trigger write path changes)

---

### FL-24 · MEDIUM — `solidarity_pricing` Name Does Not Match Intent

**Table**: `providers`

**Current name**: `solidarity_pricing` (and `SECTION_FILTER_CONFIG` key, `filterKeys.ts`, `sectionBadges.ts`, `ProviderDetailSections.tsx`)

**Current schema scope**: Business-only — `providers_listing_type_business_only_ck` CHECK enforces `solidarity_pricing = FALSE` unless `listing_type = 'business'`.

**Problem**: The name `solidarity_pricing` implies a sliding-scale or discounted pricing model. The owner's intent is **economic solidarity** — this provider boycotts products from companies with anti-Muslim stances and prioritises pro-Muslim supply chains. These are completely different concepts:

| Concept | What it means | Who can claim it |
|---|---|---|
| Solidarity *pricing* (current name) | Discounted prices for people in need | Business-type providers |
| Economic *solidarity* (owner intent) | Boycotts, buys from Muslim-owned suppliers, supports pro-Muslim causes | Food AND business providers |

**Impact**:
1. The name misleads consumers (they may expect a discount tier, not a supply chain practice)
2. The CHECK constraint restricts it to `listing_type = 'business'` only — but a halal restaurant practicing economic solidarity (e.g., only buying from Muslim slaughterhouses, boycotting certain brands) cannot claim this
3. Any new developer reading the column name writes the wrong mental model

**Fix**:
```sql
-- Rename column
ALTER TABLE providers RENAME COLUMN solidarity_pricing TO economic_solidarity;

-- Drop the over-restrictive CHECK (economic solidarity applies to food too)
ALTER TABLE providers DROP CONSTRAINT providers_listing_type_business_only_ck;
-- Optionally replace with a less restrictive version that still guards no_gambling
ALTER TABLE providers ADD CONSTRAINT providers_listing_type_business_only_ck
  CHECK (listing_type = 'business' OR no_gambling = FALSE);
```

App code rename scope: `solidarity_pricing` appears in 8+ locations (`filterKeys.ts`, `sectionFilters.ts`, `providerService.ts`, `providers.ts`, `ProviderDetailSections.tsx`, `sectionBadges.ts`, tests). All mechanical renames — no logic changes.

**Verdict**: **MEDIUM** — naming confusion is a product and developer problem; the CHECK scope issue means food providers are silently blocked from a feature that should apply to them.

---

### FL-25 · MEDIUM — `accepts_donations` Name Inverts the Meaning

**Table**: `providers`

**Current name**: `accepts_donations`; badge: `SUPPORTS_SADAQAH`

**Current schema scope**: Ummah-only — `providers_listing_type_ummah_only_ck` CHECK enforces `accepts_donations = FALSE` unless `listing_type = 'ummah'`.

**Problem**: `accepts_donations` reads as "this provider receives donations from visitors" — which is the semantic of a community service (ummah section). The owner's intent is the reverse: **this provider makes charitable donations / supports sadaqah** — i.e., the provider *gives* to causes. A halal food business that donates 10% of profits to Islamic charities should be able to claim this. Under the current name and CHECK constraint, they cannot.

| Meaning | Column name | Who it fits |
|---|---|---|
| "I receive donations from visitors" | `accepts_donations` (current) | Ummah / community services only |
| "I make charitable donations / support sadaqah" (owner intent) | `makes_donations` or `supports_sadaqah_practice` | Food, business, AND ummah providers |

**Impact**:
1. The column name is misleading to consumers and developers alike
2. The CHECK constraint (`listing_type = 'ummah' OR accepts_donations = FALSE`) is correct for the current mistaken meaning, but **wrong** for the owner's intended meaning — food and business providers who donate are silently excluded
3. The badge name `SUPPORTS_SADAQAH` actually encodes the *correct* intent — the column name is the outlier

**Fix**:
```sql
-- Rename to match the badge intent
ALTER TABLE providers RENAME COLUMN accepts_donations TO makes_donations;

-- Drop the ummah-restricting CHECK — making donations is section-agnostic
ALTER TABLE providers DROP CONSTRAINT providers_listing_type_ummah_only_ck;
-- No replacement needed: there is no semantic reason to restrict this to ummah only
```

App code rename scope: `accepts_donations` appears in 12+ locations. All mechanical renames. The German filter key `spenden` in `filterKeys.ts` should also be reviewed ("spenden" means "donate" — correct intent, wrong column name it was pointing to).

**Verdict**: **MEDIUM** — the inverted name creates incorrect consumer expectations. The CHECK constraint scope mismatch actively blocks food and business providers from claiming a valid trust attribute.

---

### FL-26 · MEDIUM — Provider Table Type Monolith: Full Supertype Unification Recommended Pre-Consumer

**Table**: `providers`, `community_services`

**Context clarification (verified from migrations 2026-05-01)**:
- `listing_type_enum` currently only has `'food'` and `'business'` — ummah is NOT in the enum yet
- `community_services` is a separate table with its own PK (`community_service_id`), its own search RPCs, its own CRUD paths
- `community_projects` is a child table of `community_services` (FK: `community_service_id`) — holds events, donations, classes, volunteer campaigns
- `provider_community_services` is a M:M junction: food/business providers *support* community services
- `bookmarks` has BOTH `provider_id` and `community_service_id` as parallel FK columns

**Column overlap analysis — `community_services` vs `providers`:**

| Column group | Shared? | Count |
|---|---|---|
| Core identity (name, description, images, category) | ✅ Yes | 4 |
| Address + geolocation | ✅ Yes | 6 |
| Contact + social | ✅ Yes | 4 |
| `review_status`, `review_feedback` | ✅ Yes | 2 |
| `created_at`, `updated_at`, `show_address`, `user_created_id`, `recommender_email` | ✅ Yes | 5 |
| `offers_ids`, `needs_ids`, `barakah_effects` (deprecated) | ✅ Yes | 3 |
| **Shared total** | | **24 of 35 community_services columns = 69%** |
| `is_verified`, `verified_at`, `verified_by`, `donation_count`, `view_count` | Ummah-only | 5 |
| `community_services.provider_id` (CS linked to a provider) | CS-only | 1 |
| `provider_owner_id`, import metadata, enrichment, `listing_type`, trust/amenity booleans | Providers-only | 16 |

**Answer to whether `providers` should be the supertype for all three:**

Yes. The column overlap makes `community_services` structurally a subtype of the same entity concept. With the pre-consumer window open, the full unification is the architecturally correct move.

**Target schema:**

```
providers (supertype — all shared columns; listing_type = 'food' | 'business' | 'ummah')
├── food_providers (1:1 extension: halal_level, no_alcohol, no_pork)
├── business_providers (1:1 extension: no_gambling)
└── ummah_providers (1:1 extension: donation_count, view_count, is_verified, verified_at, verified_by)

community_projects (rename FK: community_service_id → provider_id; still ummah-only child)
provider_engagements      → food/biz provider supports ummah provider (was: provider_community_services)
bookmarks (simplifies: drop community_service_id column, keep only provider_id)
```

**Migration sequence:**

```sql
-- Step 1: Add 'ummah' to listing_type_enum
ALTER TYPE public.listing_type_enum ADD VALUE 'ummah';

-- Step 2: Create supertype extension tables
CREATE TABLE public.food_providers (
  provider_id uuid PRIMARY KEY REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  halal_level  smallint CHECK (halal_level BETWEEN 1 AND 3),
  no_alcohol   boolean NOT NULL DEFAULT false,
  no_pork      boolean NOT NULL DEFAULT false
);

CREATE TABLE public.business_providers (
  provider_id uuid PRIMARY KEY REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  no_gambling  boolean NOT NULL DEFAULT false
);

CREATE TABLE public.ummah_providers (
  provider_id    uuid PRIMARY KEY REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  donation_count integer NOT NULL DEFAULT 0,
  view_count     integer NOT NULL DEFAULT 0,
  is_verified    boolean DEFAULT false,
  verified_at    timestamp with time zone,
  verified_by    uuid REFERENCES auth.users(id)
);

-- Step 3: Migrate community_services rows INTO providers
INSERT INTO public.providers (
  provider_id, provider_name, provider_description, provider_images,
  category_id, address_street, address_zip, address_city, address_country,
  location_latitude, location_longitude, contact_email, contact_phone,
  social_website, social_instagram, review_status, review_feedback,
  show_address, user_created_id, recommender_email, created_at, updated_at,
  listing_type
)
SELECT
  community_service_id, community_service_name, community_service_description,
  community_service_images, category_id, address_street, address_zip,
  address_city, address_country, location_latitude, location_longitude,
  contact_email, contact_phone, social_website, social_instagram,
  review_status, review_feedback, show_address, user_created_id,
  recommender_email, created_at, updated_at,
  'ummah'::public.listing_type_enum
FROM public.community_services;

-- Step 4: Migrate ummah-specific columns
INSERT INTO public.ummah_providers (provider_id, donation_count, view_count, is_verified, verified_at, verified_by)
SELECT community_service_id, donation_count, community_service_view_count, is_verified, verified_at, verified_by
FROM public.community_services;

-- Step 5: Migrate existing food and business extension rows
INSERT INTO public.food_providers (provider_id, halal_level, no_alcohol, no_pork)
SELECT provider_id, halal_level, no_alcohol, no_pork FROM public.providers WHERE listing_type = 'food';

INSERT INTO public.business_providers (provider_id, no_gambling)
SELECT provider_id, no_gambling FROM public.providers WHERE listing_type = 'business';

-- Step 6: Update community_projects FK
ALTER TABLE public.community_projects RENAME COLUMN community_service_id TO provider_id;
ALTER TABLE public.community_projects ADD CONSTRAINT community_projects_provider_id_fk
  FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;

-- Step 7: Rename provider_community_services → provider_engagements
-- Open engagement graph: any provider type can engage with any other.
-- Food/biz supporting ummah initiatives, mosques endorsing halal restaurants,
-- businesses recommending Muslim suppliers, ummah directing community to food providers.
ALTER TABLE public.provider_community_services RENAME TO provider_engagements;
ALTER TABLE public.provider_engagements RENAME COLUMN community_service_id TO engaged_provider_id;
ALTER TABLE public.provider_engagements ADD CONSTRAINT pe_engaged_provider_id_fk
  FOREIGN KEY (engaged_provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
ALTER TABLE public.provider_engagements
  RENAME COLUMN provider_id TO initiating_provider_id;

-- engagement_type captures the nature of the relationship without restricting who can engage with whom.
-- No trigger needed — the graph is intentionally open across all listing_type combinations.
ALTER TABLE public.provider_engagements
  ADD COLUMN engagement_type text NOT NULL DEFAULT 'endorsement'
    CHECK (engagement_type IN ('endorsement', 'financial', 'supply_chain', 'community_referral'));

COMMENT ON TABLE public.provider_engagements IS
  'Open engagement graph: any provider (food, business, ummah) can engage with any other.
   initiating_provider_id = who initiates; engaged_provider_id = who is engaged.
   engagement_type: endorsement, financial contribution, supply chain, community referral.';

-- Step 8: Simplify bookmarks (after verifying all CS bookmarks migrated)
-- bookmarks.community_service_id values now exist as provider_id in providers
UPDATE public.bookmarks SET provider_id = community_service_id WHERE provider_id IS NULL AND community_service_id IS NOT NULL;
ALTER TABLE public.bookmarks DROP COLUMN community_service_id;

-- Step 9: Migrate community_service_offers → provider_offers
-- Ummah provider rows are now in providers; their offer/need junctions merge into the unified tables.
INSERT INTO public.provider_offers (provider_id, offer_id, created_at)
SELECT community_service_id, offer_id, created_at
FROM public.community_service_offers
ON CONFLICT DO NOTHING;

INSERT INTO public.provider_needs (provider_id, need_id, created_at)
SELECT community_service_id, need_id, created_at
FROM public.community_service_needs
ON CONFLICT DO NOTHING;

DROP TABLE public.community_service_offers;
DROP TABLE public.community_service_needs;

-- Step 10: Drop type-exclusive columns from providers (now in extension tables)
-- Drop community_services LAST — all child FKs (community_service_offers, community_service_needs,
-- community_projects, bookmarks, provider_community_services) must be migrated first.
ALTER TABLE public.providers DROP COLUMN halal_level, DROP COLUMN no_alcohol, DROP COLUMN no_pork, DROP COLUMN no_gambling;
DROP TABLE public.community_services;
```

**What this achieves:**

| Property | Current state | After unification |
|---|---|---|
| Duplicate columns | 24 cols exist on both `providers` and `community_services` | Eliminated |
| `bookmarks` FKs | 2 FK columns (`provider_id OR community_service_id`) | 1 FK column (`provider_id`) |
| Offer/need junctions | 4 tables: `provider_offers`, `provider_needs`, `community_service_offers`, `community_service_needs` | 2 tables: `provider_offers`, `provider_needs` (ummah rows included) |
| `providerService.ts` table union type | `'provider_offers' \| 'provider_needs' \| 'community_service_offers' \| 'community_service_needs'` | `'provider_offers' \| 'provider_needs'` |
| Badge system on ummah | Impossible (different table, no `provider_id`) | Works natively — ummah entities have `provider_id` |
| Cross-type search | Two separate queries + UNION | Single `SELECT FROM providers WHERE listing_type = ?` |
| Food/biz supports ummah relationship | Cross-table FK (`providers` → `community_services`) — ummah-only | Open engagement graph: `provider_engagements(initiating_provider_id, engaged_provider_id, engagement_type)`; any provider type engages with any other; no restriction |
| `community_projects` | FK: `community_service_id → community_services` | FK renamed: `provider_id → providers`; table kept (ummah-only structured events/donations/campaigns) |
| Type enforcement | `community_services` is separate table | `listing_type` CHECK + extension table FK existence |
| Adding ummah column | `ALTER TABLE community_services` | `ALTER TABLE ummah_providers` |

**Scope of app code change:**

| Area | Impact |
|---|---|
| Schema + migrations | 2 migration files (extension tables + CS merge) |
| TypeScript supabase types | Major — `community_services` type disappears; absorbed into providers discriminated union |
| `src/services/communityServices.ts` / `communityServices.server.ts` | All queries rewrite to `providers WHERE listing_type='ummah'`; offer/need queries rewrite to `provider_offers`/`provider_needs` |
| `src/services/admin/communityServiceEdit.ts` | `community_service_offers` / `community_service_needs` references → `provider_offers` / `provider_needs` |
| `src/services/providerService.ts` | Table union type drops from 4 options to 2: `'provider_offers' \| 'provider_needs'` |
| `src/services/providers*.ts` | Moderate — existing code unaffected; ummah queries added |
| All CS components (`features/community-services/`) | Column name changes (community_service_name → provider_name, etc.) |
| `bookmarks` service | Remove community_service_id branch |
| `community_projects` queries | FK rename only |
| `provider_community_services` references | Rename to `provider_engagements`; column renames (`provider_id` → `initiating_provider_id`, `community_service_id` → `engaged_provider_id`); add `engagement_type` |
| Total estimate | ~50 files; 3–5 days of implementation |

**Two sequencing options:**

| Option | Work | Leaves you with |
|---|---|---|
| **A (recommended): Full unification now** | Extension tables + CS merge in one coordinated plan | Clean supertype model; no duplication; ummah gets badge system for free |
| B: Food/business only now, ummah later | Extension tables only (~15 files) | Two clean extension tables + one duplicate `community_services` table that grows over time; the ummah merge becomes a live data migration after launch |

Option B leaves the ummah table as a permanent second-class entity. Every shared feature (badges, trust, discovery, bookmark unification) requires a dual-table workaround. Option A costs more now but the window closes at first consumer.

**Verdict**: **MEDIUM** — the full unification is the correct long-term shape. Pre-consumer window is the only time this migration is zero-risk. The extension table migration and the community_services merge should be a single coordinated implementation plan.

---

### FL-27 · LOW — `category_suggested_offers` / `category_suggested_needs`: Keep; Use Existing RPCs

**Tables**: `category_suggested_offers`, `category_suggested_needs`, `offers`, `needs`

**Current structure:**

```
offers (offer_id PK, name_de, name_en, category_id FK→categories, created_by)
needs  (need_id  PK, name_de, name_en, category_id FK→categories, created_by)

category_suggested_offers (category_id FK→categories, offer_id FK→offers, priority)
category_suggested_needs  (category_id FK→needs,      need_id  FK→needs,  priority)
```

All 4 FK constraints present and correct with ON DELETE CASCADE.

**What this does**: During provider creation, the UI shows a curated quick-pick list of relevant offers/needs for the provider's category. `offers.category_id` is the offer's *primary* classification. `category_suggested_offers` is *editorial curation* — it allows any offer to be suggested for any category, with priority ordering. These are different concepts and cannot be merged.

**Why keep it:**

| Capability | Without junction tables | With junction tables |
|---|---|---|
| Show offers belonging to a category | `WHERE offers.category_id = X` | Same |
| Cross-category suggestion ("suggest prayer space offer for food providers") | Not possible | `category_suggested_offers` row |
| Priority-ordered quick-picks | Not possible | `priority` column |
| Admin curation without changing offer classification | Not possible | Add/remove junction rows |

The tables are in active use: 3 creation flow pages call `getSuggestedOffersForCategory` / `getSuggestedNeedsForCategory`. 5 offer suggestions and 2 need suggestions confirmed populated.

**One code quality issue — two-hop query vs RPC:**

`category-suggestions.ts` runs two sequential queries (fetch IDs → fetch items). The DB already has RPCs (`get_suggested_offers_for_category`, `get_suggested_needs_for_category`) that do this as a single JOIN. The service should call the RPC:

```typescript
// Current (two hops)
const { data: suggestionData } = await supabase.from('category_suggested_offers').select('offer_id, priority').eq('category_id', categoryId);
const { data: offersData } = await supabase.from('offers').select('*').in('offer_id', offerIds);

// Better (single RPC)
const { data } = await supabase.rpc('get_suggested_offers_for_category', { p_category_id: categoryId });
```

**After FL-26**: ummah providers will go through a creation flow with `provider_id` — they'll benefit from the same suggestion system automatically. No schema change needed; the junction tables are category-scoped, not provider-type-scoped.

**Verdict**: **LOW** — keep both tables and both RPCs. One code-quality fix: migrate `category-suggestions.ts` to call the existing RPCs instead of two-hop queries. No schema changes required.

---
-- Drop the migrated columns + food CHECK from providers
ALTER TABLE public.providers
  DROP COLUMN halal_level,
  DROP COLUMN no_alcohol,
  DROP COLUMN no_pork,
  DROP CONSTRAINT providers_listing_type_food_only_ck;

-- business_providers (1:1 extension) — worth doing now to establish the pattern
CREATE TABLE public.business_providers (
  provider_id  uuid PRIMARY KEY REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  no_gambling  boolean NOT NULL DEFAULT false
  -- future business columns: no_interest, employee_count, sector, etc.
);

INSERT INTO public.business_providers (provider_id, no_gambling)
SELECT provider_id, no_gambling FROM public.providers WHERE listing_type = 'business';

ALTER TABLE public.providers
  DROP COLUMN no_gambling,
  DROP CONSTRAINT providers_listing_type_business_only_ck;
```

**What this achieves:**

| Property | Current monolith | After extension tables |
|---|---|---|
| FK chain | ✅ Single FK target | ✅ Unchanged — all 8 tables still FK to `providers.provider_id` |
| Cross-type queries | ✅ Single scan on `providers` | ✅ Unchanged — `providers` table still covers all types |
| Type enforcement | CHECK constraints (runtime) | FK existence = structural constraint (compile-time: a food_providers row can't exist without a provider) |
| Food column nullability | food cols nullable on business rows | Impossible — no `food_providers` row for business providers |
| Adding food column | `ALTER TABLE providers ADD COLUMN` + CHECK update | `ALTER TABLE food_providers ADD COLUMN` — isolated, no CHECK needed |
| Query to get food details | Simple: all on one row | One LEFT JOIN `food_providers` on food-specific queries |
| TypeScript types | Union type or discriminated union | Discriminated union with proper per-type shapes |

**App code change cost:**
- All reads of `no_alcohol`, `no_pork`, `halal_level` need a JOIN to `food_providers` — these appear in ~15 locations (`providers.ts`, `providerService.ts`, `ProviderDetailSections.tsx`, search functions, tests)
- All reads of `no_gambling` need a JOIN to `business_providers` — ~8 locations
- All writes need to INSERT into the extension table, not just `providers`
- TypeScript types need per-type shapes (already partially modelled in the frontend)

**Decision matrix:**

| Do it now? | Rationale |
|---|---|
| ✅ **Yes, establish the pattern now** | Pre-consumer = zero data migration risk; sets the schema expectation that food columns live in `food_providers`; halal compliance columns benefit from proper NOT NULL without CHECK gymnastics; this is exactly the type of structural refactor you want to do before launch |
| ❌ Defer | Risk: first food-specific column added post-launch goes back on `providers`, resetting the debt; the window gets more expensive with every new consumer |

**Verdict**: **MEDIUM** — the timing argument is strong. The extension table pattern is the architecturally correct long-term shape for this product. The cost is bounded (~15 file changes + 2 migrations), zero data risk, and the window is now. If deferred past launch, every subsequent food-column addition accumulates against the wrong table.

**Recommended action**: Raise a separate implementation plan for the extension table migration. Sequence AFTER FL-24/FL-25 renames (to avoid migrating the columns twice).

---

### FL-28 · MEDIUM — `listing_type = 'business'` / `provider_service_offers`: Rename to `'store'` / `provider_catalog`; Build Missing App Service

**Tables**: `providers` (`listing_type` column, `listing_type_enum`), `provider_service_offers`, `provider_menu_items`

**Context: The two-layer catalog design is correct**

The schema already has a well-designed two-layer architecture for provider item listings:

| Layer | Tables | Purpose |
|---|---|---|
| **Global vocabulary** | `offers` + `provider_offers` junction | Shared named tags ("Döner", "Islamic Books") — used for search matching, discovery, cross-suggestion |
| **Food menu** | `provider_menu_items` → `provider_menu` | Per-provider food menu: price, allergens, `is_halal`, image, sort order. Active in `provider-catalog.ts`. |
| **Store catalog** | `provider_service_offers` → `provider_catalog` | Per-provider store product/service listing: price, duration, booking URL. Schema correct. **No app service exists.** |

The `offer_tag_id` bridge column on both catalog tables allows a specific item to optionally link to the global vocabulary. It's optional — providers can list items not in the global vocabulary.

**Finding 1 — UI/DB naming split on "Stores" vs "business"**

The UI already shows **"Stores"** to users. `SectionSelector.tsx` and `SearchContextBar.tsx` both call `t('sections.stores')` when the section value is `'business'`. The developer left an explicit comment documenting this intentional split:

```typescript
// SectionSelector.tsx — line 23 comment
// The internal section value for "Stores" remains 'business' throughout the data model.
```

The data model (`listing_type_enum`, TypeScript `Section` type, all service functions) uses `'business'` in ~30 places while the user-facing display and translation keys (`sections.stores = "Stores"`) use the Store vocabulary. This is confirmed technical debt.

**Finding 2 — `provider_service_offers` name introduces "offers" overloading**

Three distinct concepts share the same root word:

| Name | What it is |
|---|---|
| `offers` | Global vocabulary table — shared searchable tag names |
| `provider_offers` | Junction table — provider ↔ vocabulary tag association |
| `provider_service_offers` | Per-provider catalog items — store's actual products/services |

Renaming both catalog tables to `provider_menu` and `provider_catalog` keeps the `provider_*` convention consistent, eliminates "offers" overloading, and creates a clean parallel pair: a menu is ordered food, a catalog is products/services. (`store_catalog`, `food_menu` etc. would break the prefix convention asymmetrically.)

**Finding 3 — `provider_service_offers` has no app service layer**

The schema fields are correct for store products (books, goods, consulting packages): `price_cents`, `duration_minutes`, `booking_url`, `is_available`, `sort_order`, `search_vector`. The `search_provider_items` RPC already queries both `provider_menu_items` AND `provider_service_offers` in a UNION ALL — but the `service_offer` branch will always return zero rows until store providers can actually add items.

Only one file references `provider_service_offers`:
```
src/__tests__/migrations/068-provider-catalog-tdd.test.ts  — migration test only
```

No CRUD service, no creation flow integration, no UI.

**On `provider_menu_items` → `provider_menu` and `provider_service_offers` → `provider_catalog`**

Both renames keep the `provider_*` prefix that all 8+ other relation/catalog tables in this schema follow (`provider_offers`, `provider_needs`, `provider_badges`, etc.). Trimming the redundant suffixes (`_items`, `_service_offers`) produces a clean parallel pair. The food/store distinction is already encoded in the owning provider's `listing_type` — the table name doesn't need to repeat it.

**Recommended renames — bundle into FL-26**

| Current | Rename to | Rationale |
|---|---|---|
| `listing_type_enum` value `'business'` | `'store'` | Align DB with UI; eliminate documented split |
| `applicable_section` value `'business'` | `'store'` | Consistency with `listing_type_enum` |
| TypeScript `Section = 'food' \| 'ummah' \| 'business'` | `'food' \| 'ummah' \| 'store'` | ~30 references; global find-replace; low risk |
| `provider_menu_items` table | `provider_menu` | Remove redundant `_items` suffix; clean parallel with `provider_catalog` |
| `provider_service_offers` table | `provider_catalog` | Eliminate "offers" overloading; clarify catalog intent; parallel with `provider_menu` |
| Translation key `sectionBusiness` | `sectionStore` | Consistency (note: `sections.stores` key already exists and is the one in active use) |

FL-26 already alters `listing_type_enum` and touches all `listing_type` references — bundling `'business'` → `'store'` into the same migration has zero marginal cost.

**Verdict**: **MEDIUM** — the naming split is confirmed technical debt with a developer-authored comment. The `provider_service_offers` feature gap means the store catalog is invisible in search results. Both must be resolved before the store section is publicly usable. Bundle the enum rename into FL-26; build `provider-catalog.ts` app service (matching the `provider-menu.ts` → renamed from `provider-catalog.ts` pattern) in a separate task.

---

## Recommendations for Planner

### Phase A — Quick Wins (no downtime, additive only)

1. **FL-1 + FL-2**: Create partial UNIQUE indexes on `bookmarks` and `provider_badges`. Zero-downtime `CREATE INDEX CONCURRENTLY`. **Highest priority** — these are data integrity gaps.
2. **FL-15**: Drop 4 redundant UNIQUE constraints. Zero-downtime.
3. **FL-14**: Add FK on `enrichment_candidates.run_id`.
4. **FL-17 + FL-22**: Add CHECK constraints on `cities.trust_level` and `price_currency` columns.
5. **FL-18**: SET NOT NULL on `waitlist.is_provider` after backfill.

### Phase B — Nullable Booleans and Statuses (requires backfill)

6. **FL-7 + FL-8 + FL-13**: Backfill NULLs → SET NOT NULL on `review_status`, `is_verified`, `show_address`.
7. **FL-5**: Backfill `categories.applicable_section` NULLs with 'all', then SET NOT NULL.
8. **FL-9**: Add CHECK on `admin_audit_logs.action` (requires audit of live values first).

### Phase C — Schema Refactors (coordinated with app code)

9. **FL-3**: Remove `categories.applicable_to` and use `applicable_section` as the sole scope column. Requires app code changes.
10. **FL-4**: Resolve NOT NULL + ON DELETE SET NULL conflict on `needs`/`offers` (decide policy).
11. **FL-11**: Change `providers.category_id` FK to ON DELETE SET NULL.
12. **FL-10**: Create `task_status_enum` and migrate `provider_outreach_tasks.task_status`.
13. **FL-23**: Extend `badge_types` with `attribute_category` + `provider_column_name` + `is_filterable` columns. Insert trust and amenity attribute rows. Rewrite trigger to be data-driven. Update `providerService.ts` creation path.
14. **FL-24**: Rename `solidarity_pricing` → `economic_solidarity`. Revise `providers_listing_type_business_only_ck` to remove solidarity restriction (keep no_gambling guard). Update `filterKeys.ts`, `sectionFilters.ts`, `ProviderDetailSections.tsx`, and all test references.
15. **FL-25**: Rename `accepts_donations` → `makes_donations`. Drop `providers_listing_type_ummah_only_ck` (no valid reason to restrict to ummah). Update `filterKeys.ts`, `sectionFilters.ts`, `ProviderDetailSections.tsx`, and all test references.

### Deferred (no immediate action)

- FL-6, FL-12, FL-16, FL-19, FL-20, FL-21: Advisory/low-impact. Document and address opportunistically.
- **FL-26**: Sequenced after FL-24 and FL-25 renames. Pre-consumer window is time-sensitive — schedule before first public launch. **Bundle FL-28 enum rename (`'business'` → `'store'`) into this same migration** — zero marginal cost since `listing_type_enum` is already being altered.
- **FL-27**: `category-suggestions.ts` two-hop query → RPC. Opportunistic code quality fix, no urgency.
- **FL-28 (part 2)**: Rename `provider_menu_items` → `provider_menu` and `provider_service_offers` → `provider_catalog` — separate migration immediately after FL-26 (`ALTER TABLE ... RENAME TO` + RLS policy + FK name + RPC body updates). Also rename `src/services/provider-catalog.ts` → `provider-menu.ts` to match.
- **FL-28 (part 3)**: Build `src/services/provider-catalog.ts` (new file for store catalog) mirroring the `provider-menu.ts` pattern. Required before the store section is publicly searchable — the `search_provider_items` RPC's `service_offer` branch returns zero results without an app service creating items.

---

## Architectural Constraints

- All changes must be backwards-compatible (zero-downtime).
- `CREATE INDEX CONCURRENTLY` for new indexes (avoid table locks).
- Backfills for SET NOT NULL changes must handle production data volumes.
- `categories.applicable_to` migration requires coordinated app code change (query patterns change from array operators to equality).
- Section-scoped CHECKs on `providers` already exist — the `applicable_section` coupling (Q2) is partially mitigated by these, but the vocabulary synchronization risk remains.
- Plan 114 F-1 through F-11 are referenced by number where relevant but NOT re-analysed.

---

## Data Source

- **Prod**: Supabase project `rdtdtcfntopcxcigkqoq` via MCP (`mcp_supabase_execute_sql`)
- **Introspection queries**: `information_schema.columns`, `information_schema.table_constraints`, `information_schema.key_column_usage`, `information_schema.constraint_column_usage`, `information_schema.referential_constraints`, `pg_constraint`, `pg_enum`, `pg_matviews`
- **Date**: 2026-04-30

---

✅ PHASE COMPLETE: [N] Architect — Verdict: APPROVED_WITH_CHANGES
📄 Output: agent-output/architecture/118-field-level-schema-review.md
➡️ NEXT: @Planner to create migration plan from 22 field-level findings (prioritise FL-1, FL-2 as immediate data integrity fixes)
   Gate: This architecture doc exists with per-table verdict and severity-ranked findings ✓
