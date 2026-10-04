---
ID: 144
Origin: 144
UUID: c4f9e7b2
Status: Active
---

# Architecture Critique: Plan 144 — Wolt Delivery Platform Enrichment

## Summary Verdict

**APPROVED WITH CONDITIONS**

The plan is architecturally sound for Phase 1. The module placement, alcohol detection strategy, delivery links table design, and CLI integration pattern all align with UFlow's existing patterns. Three conditions must be addressed before implementation: cross-table enrichment schema, Wolt client responsibility boundaries, and city map maintenance.

---

## 1. Design Quality Assessment

### 1.1 Module Placement: `src/lib/enrichment/delivery-platform/`

**What's good**: The subdirectory isolates platform-specific code (Wolt client, normalizer, matcher) from the generic enrichment logic. The orchestrator at `src/lib/enrichment/delivery-enricher.ts` (one level up) correctly signals that it coordinates across sub-modules rather than being another leaf module.

**What could go wrong**: The analysis originally put `alcohol-detector.ts` and `normalizer.ts` outside the `delivery-platform/` folder (in `src/lib/enrichment/` directly) because they are **shared** across platforms. The plan nests them under `delivery-platform/`. When Lieferando/Uber Eats come in Phase 2+, the alcohol detector and normalizer will need to be extracted upward. If the extraction doesn't happen, you'd get duplicated logic or cross-folder imports that break the encapsulation.

**Better alternative**: Put `alcohol-detector.ts` and `normalizer.ts` at `src/lib/enrichment/` level now. They are domain utilities (alcohol detection, opening hours normalization) that are independent of any platform. The platform-specific modules (`wolt-client.ts`, `wolt-normalizer.ts`, `provider-matcher.ts`) belong under `delivery-platform/`.

**Verdict**: Acceptable for Phase 1 with a **condition** to extract shared modules upward before adding a second platform.

### 1.2 Adding `target_table` to `EnrichmentCandidate`

**What's good**: The plan correctly identifies that `no_alcohol` lives on `food_providers` while all other enrichment targets are on `providers`. Adding an optional `target_table` field is the minimal change to handle this.

**What could go wrong**: This is the **most under-specified design decision in the plan**. Here's what's missing:

- **No DB migration defined** for the `enrichment_candidates` table. The plan only mentions adding `target_table?: 'providers' | 'food_providers'` to the TypeScript interface. The actual DB column `target_table` must exist in the `enrichment_candidates` table or the upsert won't persist it.
- **Admin approval service writes to `providers` only**. The current `approveCandidate()` in `src/services/admin/enrichment.ts:193` does `supabase.from('providers').update(...)` unconditionally (except for image enrichments which use append-only logic). A candidate with `target_table = 'food_providers'` would silently update the wrong table or fail at the FK level.
- **The `getPendingCandidates()` query joins `providers!inner`** (line 77). A candidate targeting `food_providers` would still join correctly (provider_id FK exists), but the query selects `provider_name` which does come from `providers`. However, the apply path is broken.
- **Field name collision**: `no_alcohol` exists on both `food_providers` (as a column) and on `providers` via the M-5 view/join (in `src/services/providers.ts:64`, it's included in the `Provider` interface). The plan needs to clarify whether `no_alcohol` is being resolved via the extension table or the providers table at query time. Currently `getProviderById()` reads it from `food_providers` (line 399). The candidate system needs to know this.

**Better alternative**: Two options (either acceptable):

*Option A (recommended — less risk)*: Skip `target_table` entirely. Instead, handle `no_alcohol` via a two-step process in the CLI: (1) create the candidate in `enrichment_candidates` with `field_name = 'no_alcohol'` as today, (2) the admin approval for `no_alcohol` updates `food_providers` instead of `providers`. This requires modifying the approval logic but keeps the candidate schema stable.

*Option B (as planned)*: Add the column but must also:
  - Write the migration SQL for `ALTER TABLE enrichment_candidates ADD COLUMN target_table TEXT`
  - Update `approveCandidate()` to dispatch to `food_providers` when `target_table === 'food_providers'`
  - Update `bulkApproveByProvider()` with the same dispatch
  - Add the column to `EnrichmentCandidateRow` in `src/services/admin/enrichment.ts`
  - Document which field_names map to which tables

**Verdict**: **Condition** — must specify the full migration and admin approval dispatch logic. Option A is simpler but both work.

### 1.3 Static City Geocode Map

**What's good**: Pragmatic. Avoids Nominatim rate limits (1 req/s, no guarantee SLA). For ~100 German cities, a static map is fast, deterministic, and zero-cost.

**What could go wrong**:
- **Coverage gap**: The plan says "~100 most common German cities." But the `city-coords.ts` example only shows 20. If a provider's city isn't in the map, the provider is silently skipped. This could be 20-30% of providers depending on the dataset.
- **Stale coordinates**: City names change, new cities appear, provider dataset evolves. The map must be regenerated.
- **No CI check**: The risk register mentions a CI check but the plan doesn't specify one in the implementation steps.

**Better alternative**: Keep the static map, but:
1. Generate it from `SELECT DISTINCT address_city FROM providers` as the plan suggests — make this an explicit step in the implementation
2. Add a CI check (or at least a CLI flag `--validate-cities`) that reports unmatched cities
3. Log a warning (not error) for unmatched cities so the run continues for the rest

**Verdict**: Acceptable with condition to add coverage validation.

### 1.4 Delivery Links as Separate Table

**What's good**: Normalized design. The composite PK `(provider_id, platform)` enforces one link per platform, which matches the domain. The partial index `WHERE is_active = true` is a nice touch for the "order online" query path. RLS with public read + service-role write matches the `providers` table pattern.

**What could go wrong**:
- The platform CHECK constraint `IN ('wolt', 'lieferando', 'ubereats')` is hardcoded. Adding a fourth platform requires a migration. Consider using the existing `delivery_platform_enum` if one exists, or use a TEXT column with an app-level constant.
- The plan says delivery link discovery is deferred to a later phase, but the migration creates the table now. The table will be empty until then. This is fine — empty tables are not harmful.

**Better alternative**: Use an enum type (PostgreSQL `CREATE TYPE delivery_platform AS ENUM (...)`) for future-proofing. But for speed, a CHECK constraint is acceptable for Phase 1 and can be migrated to an enum later.

**Verdict**: Good design. No change needed.

### 1.5 Alcohol Detection as Pure Function

**What's good**: Deterministic, testable, zero I/O. The keyword catalog is well-researched (the analysis covers 26+ terms). The staging approach mitigates false positives — admin reviews before applying. The signal hierarchy (definite alcohol > ambiguous > no-signal) is the right conservative choice for halal compliance.

**What could go wrong**:
- **Menu items are in German only**: If Wolt returns items in other languages (Turkish, Arabic, English), keywords miss them. This is acceptable for Phase 1.
- **Context ambiguity**: "Biergarten" triggers on "Bier" even if it's just the venue name. The plan handles this via partial word matching with correct behavior (match on substring).
- **False positives from cooking methods**: "in Bierteig" (beer batter) flags alcohol even though the alcohol cooks off. Islamic rulings vary on this. The staging approach handles it — admin can reject.

**Better alternative**: None needed. Keyword matching is the right approach for Phase 1. ML classification can be considered if the false-positive rate exceeds 10% after review.

**Verdict**: Good design. No change needed.

### 1.6 CLI Integration Pattern

**What's good**: The plan correctly identifies the `if (source !== 'joinhalal')` guard at line 124 of `scripts/enrich-providers.ts` and proposes replacing it with a dispatch switch. The parallel structure (select providers → process each → create candidates → write run log) is the same as the existing flow.

**What could go wrong**:
- **Provider query differs fundamentally**: For joinhalal, the query filters by `import_source = 'joinhalal'`. For Wolt, the plan says to use `listing_type = 'food' AND enrichment_eligible = true`. These are different query patterns that need different filter logic.
- **Offers catalog load (lines 141-150) is wasted for Wolt**: The plan says "skip offers catalog load" but doesn't specify how. The code currently loads offers unconditionally before iterating providers. The dispatch needs to happen early enough to skip this.
- **The `parseEnrichmentData` helper is joinhalal-specific** (extracts Schema.org JSON-LD). Wolt needs its own parsing path.

**Verdict**: The dispatch pattern is correct but the implementation needs careful restructuring. The plan's approach (switch on source) is consistent with OCP. No architecture change needed — this is an implementation detail.

### 1.7 Wolt API Client Design

**What's good**: Factory function with configurable delay, retries, user-agent. Clean separation of the HTTP concerns. The retry-with-backoff on 429 is essential.

**What could go wrong**:
- **`geocodeCity()` on the client is a misplaced responsibility**: The Wolt client should handle Wolt API calls only. Geocoding is a separate concern — it maps city names to coordinates using a static dataset. Putting it on the Wolt client makes it harder to:
  - Reuse for Lieferando/Uber Eats (they also need coordinates)
  - Test independently
  - Replace with a live API later

**Better alternative**: Extract a `Geocoder` interface and implement `StaticCityGeocoder`. The Wolt client depends on a geocoder, but doesn't own it:

```typescript
interface Geocoder {
  geocode(cityName: string): Promise<{lat: number; lon: number} | null>;
}

class StaticCityGeocoder implements Geocoder { ... }

function createWoltClient(config, geocoder: Geocoder): WoltClient
```

This follows the Dependency Inversion Principle and allows swapping the geocoder implementation without changing the client.

**Verdict**: **Condition** — extract geocoding from the Wolt client into its own module/interface.

### 1.8 No Menu Persistence

**What's good**: The plan correctly scopes Phase 1 to only extracting the `no_alcohol` flag and `opening_hours` from menu data. Storing raw menu items would bloat the database with data that has no current consumer.

**What could go wrong**: If a future feature needs menu items (e.g., "search by dish" or "display menu"), the enrichment would need to be re-run. But this is a premature optimization concern — YAGNI applies.

**Verdict**: Correct scope. No change needed.

---

## 2. Pattern Compliance

### Postgres-First
✅ **Compliant**. Uses PostgreSQL native features: JSONB for `opening_hours`, composite PK with CHECK constraint, partial GIN indexes, RLS policies, service-role write pattern. No Redis, queues, or external caches introduced.

### Enrichment Pipeline Patterns
✅ **Mostly compliant**. Reuses `enrichment_candidates`, `enrichment_run_logs`, `detectConflict()`, circuit breaker, and CLI flags (`--dry-run`, `--write`, `--source`, `--limit`).

⚠️ **Partially non-compliant on cross-table enrichment**. The existing pipeline assumes all candidates target the `providers` table. The plan introduces cross-table writes without fully specifying how the admin approval path handles this. See condition 1.

### Server/Client Separation
✅ **Compliant**. The enrichment code runs in CLI scripts (Node.js), not in browser components. No server/client import boundary violations.

### Module Boundaries (Feature vs Shared)
✅ **Compliant**. The new code lives under `src/lib/enrichment/delivery-platform/`, not in `components/` or `features/`. Domain-specific enrichment logic stays in `lib/enrichment/`, which is the correct pattern for backend/data-processing code.

---

## 3. Technical Debt Assessment

### Debt Added

| Item | Severity | Rationale |
|------|----------|-----------|
| `target_table` on enrichment_candidates | Low-Medium | Existing admin approval service needs updating to dispatch writes to `food_providers`. If missed, candidates get silently dropped or corrupt data. |
| Static city map maintenance | Low | New cities require map regeneration. Without a CI check or regeneration script, coverage silently degrades. |
| Geocoding on Wolt client | Low | Tight coupling. Extracting later is straightforward but requires changing callers. |
| Platform-specific code under `delivery-platform/` | Low | Alcohol detector and normalizer will need extraction before Phase 2. Minor refactor. |

### Debt Reduced

| Item | Severity | Rationale |
|------|----------|-----------|
| No opening hours data | **High reduction** | Only 2/804 providers had opening hours. This enrichment fills the gap for ~200-300 providers. |
| No delivery links | **Medium reduction** | New table enables "order online" feature that was previously impossible. |
| No alcohol data for food providers | **High reduction** | New halal compliance signal for the food section. |

**Net assessment**: Debt reduced. The new debt items are low-severity and have straightforward mitigations.

---

## 4. Security Review

### Wolt API Access
- **No auth tokens stored**: The Wolt API requires no authentication. No secrets to leak.
- **Read-only access**: Enrichment only fetches data, never writes to Wolt.

### Service Role Key Usage
- ✅ The CLI uses `SUPABASE_SERVICE_ROLE_KEY` — same as existing `enrich-providers.ts` pattern.
- ✅ Writes go to `enrichment_candidates` (staging table), never directly to production data.
- ✅ The migration locks down `provider_delivery_links` with RLS: public SELECT only, writes restricted to `service_role`.

### Data Exposure
- **Menu item names are public data**: Wolt's restaurant pages are publicly accessible. The enrichment extracts item names only (not descriptions, not prices), minimizing any copyright concern.
- **Delivery links are public by design**: The RLS policy grants `SELECT TO public` on `provider_delivery_links`. This is intentional — the "order online" feature needs to expose these URLs.

### Injection Vectors
- **No SQL injection**: All DB writes use Supabase parameterized queries.
- **No XSS risk**: Data is stored as JSONB in `enrichment_candidates` and reviewed via admin UI before application. Applied values go through Supabase.
- **No command injection**: Wolt responses are JSON-parsed by `fetch`, not evaluated.

### Legal (Non-Security)
As noted in the analysis, Wolt's ToS prohibition on scraping is mitigated by:
- Public API (no auth bypass)
- German law allowing non-competing, extract-is-not-database-level use
- Per-provider enrichment (not mass export)

**Verdict**: No security concerns. The patterns match existing approved designs.

---

## 5. Conditions for Approval

### Condition 1 (Required): Specify cross-table enrichment schema and admin approval

The `target_table` approach must be fully specified before implementation:

**a)** Write the migration SQL for `ALTER TABLE enrichment_candidates ADD COLUMN target_table TEXT;` (nullable, defaults to `'providers'`).

**b)** Update `src/services/admin/enrichment.ts`:
- `approveCandidate()` must check `candidate.target_table` and dispatch to `food_providers` when applicable
- `bulkApproveByProvider()` must do the same per-candidate
- `getPendingCandidates()` must handle `target_table` in its results (it currently hardcodes `providers!inner` join)

**c)** Update `EnrichmentCandidateRow` in `src/services/admin/enrichment.ts` to include `target_table`.

**d)** Document the mapping: `field_name = 'no_alcohol'` → `target_table = 'food_providers'`, all other fields → `target_table = 'providers'`.

**Alternatively** (preferred): Drop `target_table` from the schema and handle `no_alcohol` dispatch entirely within the admin approval logic. Update the approval service to check if the field is `no_alcohol` and write to `food_providers` instead of `providers`. This avoids a schema change entirely. Simpler, less risk.

### Condition 2 (Required): Extract geocoding from Wolt client

Extract the city geocoding into a separate module/interface (`src/lib/enrichment/delivery-platform/geocoder.ts`). The Wolt client should accept a `Geocoder` as a dependency rather than owning `geocodeCity()`. This:
- Keeps the Wolt client focused on Wolt HTTP concerns
- Makes geocoding reusable for future platforms
- Enables swapping to a live API later

### Condition 3 (Recommended): Add city map coverage validation

- Generate the static city map from `SELECT DISTINCT address_city FROM providers` — make this a build step or a one-time script
- Log a warning for unmatched cities during enrichment (don't fail, just report)
- Add a `--validate-cities` flag or CI check that compares the static map against the provider dataset

---

## 6. Final Recommendation

**GO for Phase 1 implementation** once conditions 1 and 2 are addressed in the plan.

The architecture is clean, the pattern reuse is good, and the net technical debt impact is positive. The three risks with the highest impact are:
1. Cross-table enrichment pipeline not fully specified (Condition 1) — **blocker until resolved**
2. Tight coupling of geocoding to Wolt client (Condition 2) — **medium risk, fix before implementing**
3. Silent coverage gaps in city map (Condition 3) — **low risk, can be addressed during implementation**

Estimated rework if conditions aren't met: 2-3 days of refactoring (admin approval service + client extraction). Much cheaper to get right in the plan.

---

## 7. Appendix: Design Debt Registry

| ID | Area | Current State | Optimal State | Priority | Discovered |
|----|------|---------------|---------------|----------|------------|
| DD-144-01 | Cross-table enrichment | Ad-hoc `target_table` field | Generic dispatch by field_name mapping | Medium | 2026-06-04 |
| DD-144-02 | Geocoding | Embedded in Wolt client | `Geocoder` interface with pluggable implementations | Low | 2026-06-04 |
| DD-144-03 | City coverage | Static map, no validation | Auto-generated from provider dataset + CI check | Low | 2026-06-04 |
| DD-144-04 | Alcohol detector location | Under `delivery-platform/` | Extract to `src/lib/enrichment/` before Phase 2 | Low | 2026-06-04 |
