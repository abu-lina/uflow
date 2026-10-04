---
ID: 144
Origin: 144
UUID: b8f3d9a1
Status: Draft
---

# Plan 144: Wolt Delivery Platform Enrichment — Phase 1 Implementation Plan

## 1. Scope

### Phase 1 (this plan) — Wolt Only
| Feature | Module | DB Target |
|---------|--------|-----------|
| Alcohol detection via menu keyword analysis | `alcohol-detector.ts` | `food_providers.no_alcohol` |
| Opening hours extraction | `normalizer.ts` | `providers.opening_hours` |
| Wolt venue matching (name+city) | `provider-matcher.ts` | Run-time only |
| Wolt API integration | `wolt-client.ts` | HTTP calls |
| Delivery link storage | Migration | `provider_delivery_links` table |

### Deferred to Later Phases
- Lieferando integration — needs Puppeteer/Playwright or paid proxy
- Uber Eats integration — needs paid data provider
- Delivery link matching as standalone script (`scripts/match-delivery-platforms.ts`)
- Auto-approval of enrichment candidates (still admin-review via `enrichment_candidates`)

---

## 2. Data Model Changes

### 2.1 New Table: `provider_delivery_links`

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_delivery_platform_links.sql

CREATE TABLE IF NOT EXISTS public.provider_delivery_links (
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('wolt', 'lieferando', 'ubereats')),
  platform_url TEXT NOT NULL,
  platform_slug TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_provider_delivery_links_platform
  ON public.provider_delivery_links(platform);

CREATE INDEX IF NOT EXISTS idx_provider_delivery_links_active
  ON public.provider_delivery_links(provider_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.provider_delivery_links ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see delivery links)
CREATE POLICY "Allow public read access"
  ON public.provider_delivery_links
  FOR SELECT
  TO public
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Allow service role all"
  ON public.provider_delivery_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 2.2 TypeScript Type: `ProviderDeliveryLink`

```typescript
// src/types/delivery.ts (new file)

export interface ProviderDeliveryLink {
  provider_id: string;
  platform: 'wolt' | 'lieferando' | 'ubereats';
  platform_url: string;
  platform_slug: string | null;
  is_active: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliveryPlatform = 'wolt' | 'lieferando' | 'ubereats';
```

### 2.3 Extend `enrichment-fields.ts`

```typescript
// Add to SOURCE_ENRICHABLE_FIELDS:
'opening_hours',
'no_alcohol',
```

These fields need special handling because:
- `opening_hours` lives on `providers` (JSONB) — normal enrichment candidate flow
- `no_alcohol` lives on `food_providers` (boolean) — needs cross-table candidate creation

The `buildEnrichmentCandidates` in `joinhalal-enricher.ts` currently only writes candidates for fields on the `providers` table. For `no_alcohol`, the orchestrator (`delivery-enricher.ts`) must create candidates that specify the target table in a new optional field, or handle it via a two-step process:

**Decision**: Add an optional `target_table` field to `EnrichmentCandidate`:
```typescript
export interface EnrichmentCandidate {
  // ... existing fields ...
  target_table?: 'providers' | 'food_providers'; // new optional field
}
```

The CLI upsert logic will be extended to write to `food_providers` when `target_table === 'food_providers'`.

---

## 3. Module Specifications

### 3.1 `src/lib/enrichment/delivery-platform/alcohol-detector.ts`

Pure function. No I/O, no side effects. Menu item name → alcohol classification.

```typescript
// ─── Exports ──────────────────────────────────────────────────────────────────

export type AlcoholSignal = 'definite_alcohol' | 'definite_no_alcohol' | 'ambiguous' | 'no_signal';

export interface AlcoholDetectionResult {
  signal: AlcoholSignal;
  matchedKeywords: string[];
  matchedItems: string[];        // the menu item names that triggered matches
  ambiguousItems: string[];      // items with ambiguous terms
}

// ─── Functional API ───────────────────────────────────────────────────────────

/**
 * Analyzes menu item names for alcohol-related keywords.
 * Pure function — deterministic, no I/O.
 */
export function detectAlcohol(
  menuItemNames: string[]
): AlcoholDetectionResult;

/**
 * Checks if a single menu item name contains definite alcohol keywords.
 */
export function hasAlcoholKeywords(itemName: string): boolean;

/**
 * Checks if a single menu item name contains explicit non-alcohol markers.
 */
export function hasNoAlcoholKeywords(itemName: string): boolean;

/**
 * Returns true if the item name contains ambiguous terms requiring review.
 */
export function hasAmbiguousKeywords(itemName: string): boolean;

// ─── Keyword Catalogs (re-exported for testing) ───────────────────────────────

export const ALCOHOL_KEYWORDS: ReadonlyArray<string>;
export const NO_ALCOHOL_KEYWORDS: ReadonlyArray<string>;
export const AMBIGUOUS_KEYWORDS: ReadonlyArray<string>;
```

**Test requirements (TDD)**:
- `detectAlcohol(['Pizza Margherita'])` → `{ signal: 'no_signal', ... }`
- `detectAlcohol(['Bier', 'Pizza'])` → `{ signal: 'definite_alcohol', matchedKeywords: ['Bier'], ... }`
- `detectAlcohol(['Alkoholfreies Bier'])` → `{ signal: 'definite_no_alcohol', ... }`
- `detectAlcohol(['Apfelschorle'])` → `{ signal: 'ambiguous', ... }`
- Case insensitivity: `bier`, `BIER`, `Bier` all match
- Partial word matching: `Biergarten` should match `Bier`
- Empty array → `{ signal: 'no_signal', ... }`
- Mixed signals: definite alcohol trumps ambiguous (conservative halal compliance)

**Failure modes**: None (pure function, always returns)

### 3.2 `src/lib/enrichment/delivery-platform/normalizer.ts`

Pure functions. Converts Wolt API response shapes to standard internal formats.

```typescript
// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Converts Wolt venue opening hours to standard OpeningHours JSONB format.
 * Wolt format: array of { day: number (0=Monday), opens: string, closes: string }
 * Target: OpeningHours (src/types/openingHours.ts)
 */
export function normalizeWoltOpeningHours(
  woltHours: WoltOpeningHour[] | null | undefined
): OpeningHours | null;

/**
 * Converts Wolt venue response to a normalized provider-ready shape.
 */
export function normalizeWoltVenue(
  venue: WoltVenue
): NormalizedWoltVenue;

// ─── Wolt API Response Shapes (internal, not exported) ────────────────────────

interface WoltOpeningHour {
  day: number;     // 0=Monday, 6=Sunday
  opens: string;   // "11:00"
  closes: string;  // "23:00"
}

// ─── Output Types ─────────────────────────────────────────────────────────────

// Re-export OpeningHours from src/types/openingHours.ts
import type { OpeningHours } from '@/types/openingHours';

export interface NormalizedWoltVenue {
  name: string;
  slug: string;
  url: string;
  openingHours: OpeningHours | null;
  menuItemNames: string[];
}
```

**Test requirements (TDD)**:
- Normalize standard Wolt hours → correct `OpeningHours` structure
- Null/undefined input → `null`
- Incomplete day coverage (missing days → undefined, not null)
- Empty hours array → `null`
- Edge: 24h format "00:00"–"24:00", split across midnight "22:00"–"02:00"
- Edge: malformed time strings (graceful fallback, skip that entry)

**Failure modes**: Malformed input → skip problematic entries, return partial result

### 3.3 `src/lib/enrichment/delivery-platform/wolt-client.ts`

HTTP client for the Wolt public API. Handles fetch, retries, geocoding.

```typescript
// ─── Exports ──────────────────────────────────────────────────────────────────

export interface WoltClientConfig {
  requestDelayMs?: number;   // default 250
  maxRetries?: number;       // default 3
  userAgent?: string;
}

export interface WoltVenue {
  name: string;
  slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;       // additional fields passthrough
}

export interface WoltVenueSearchResult {
  venues: WoltVenue[];
  lat: number;
  lon: number;
}

/**
 * Creates a configured Wolt API client.
 */
export function createWoltClient(
  config?: WoltClientConfig
): WoltClient;

export interface WoltClient {
  /**
   * Searches for venues near a geographic coordinate.
   * Uses Wolt consumer-api discovery endpoint.
   */
  searchVenuesByLocation(lat: number, lon: number): Promise<WoltVenueSearchResult>;

  /**
   * Fetches full menu data for a venue by its slug.
   * Uses Wolt restaurant-api menu endpoint.
   */
  fetchMenuData(venueSlug: string): Promise<{
    items: Array<{ name: string; description?: string; category?: string }>;
    categories: Array<{ name: string; items: string[] }>;
  }>;

  /**
   * Geocodes a city name to lat/lon using a built-in static map.
   * Avoids external API dependency (Nominatim rate limits).
   * Falls back to a best-effort city → coord lookup.
   */
  geocodeCity(cityName: string): Promise<{ lat: number; lon: number } | null>;
}
```

**Implementation notes**:
- Two API endpoints: consumer-api for venue discovery, restaurant-api for menu
- No auth required, no headers beyond User-Agent
- `geocodeCity()` uses a static mapping of German cities (pre-populated from cities table or a bundled JSON map)
- Rate limiting via `requestDelayMs` between fetches
- Retry with exponential backoff on 429/5xx

**Test requirements (TDD)**:
- Client initialization with default config
- `searchVenuesByLocation` — mock fetch, verify URL construction
- `fetchMenuData` — mock fetch, verify slug in URL
- `geocodeCity` — known city returns coords, unknown returns null
- HTTP 429 → retry after delay (mock implementation)
- HTTP 404 → throw typed error

### 3.4 `src/lib/enrichment/delivery-platform/provider-matcher.ts`

Fuzzy matching of UFlow providers to Wolt venues.

```typescript
// ─── Exports ──────────────────────────────────────────────────────────────────

export interface MatchCandidate {
  providerId: string;
  providerName: string;
  providerCity: string;
  woltVenue: WoltVenue;
  confidence: number;     // 0–1
  matchType: 'exact_name_city' | 'fuzzy_name_city' | 'fuzzy_name_only';
}

export interface ProviderMatchConfig {
  nameSimilarityThreshold: number;  // 0–1, default 0.6
  requireCityMatch: boolean;        // default true for initial match
}

/**
 * Attempts to match a UFlow provider to a Wolt venue using name + city.
 * Uses Levenshtein or trigram similarity for name matching.
 */
export function matchProviderToVenues(
  providerName: string,
  providerCity: string,
  venues: WoltVenue[],
  config?: ProviderMatchConfig
): MatchCandidate | null;

/**
 * Computes string similarity score (0–1) between two strings.
 * Exported separately for testing.
 */
export function stringSimilarity(a: string, b: string): number;

/**
 * Normalizes a restaurant name for comparison:
 * - lowercase
 * - remove common suffixes (GmbH, e.K., Restaurant, etc.)
 * - strip special characters
 */
export function normalizeName(name: string): string;
```

**Implementation approach**:
1. Normalize both provider and venue names
2. Compute similarity score using Levenshtein distance (via `fastest-levenshtein` or similar)
3. If city matches AND name similarity > threshold → `exact_name_city`
4. If city matches only (lower similarity) → `fuzzy_name_city`
5. If city doesn't match but name similarity is very high → `fuzzy_name_only`
6. Return top match above threshold, or null

**Test requirements (TDD)**:
- Exact match: "Döner Haus" in "Berlin" matches venue "Döner Haus" in Berlin
- Fuzzy match: "Döner Haus Berlin" vs "Döner Haus GmbH Berlin"
- No match: completely different names in same city → null
- Empty venue list → null
- Normalization removes "Restaurant", "GmbH", "e.K." prefixes/suffixes
- Case insensitivity
- Confidence scores for each match type

### 3.5 `src/lib/enrichment/delivery-enricher.ts`

Orchestrator — coordinates the enrichment pipeline for delivery platforms.

```typescript
// ─── Exports ──────────────────────────────────────────────────────────────────

export interface DeliveryPlatformSnapshot {
  provider_id: string;
  provider_name: string;
  address_city: string | null;
  listing_type: string | null;
  opening_hours: OpeningHours | null;
  no_alcohol: boolean | null;
}

export interface DeliveryEnrichmentResult {
  providerId: string;
  venueSlug: string | null;        // null if no match
  matchConfidence: number | null;
  candidates: EnrichmentCandidate[];
  error: string | null;
}

/**
 * Enriches a single provider with Wolt data.
 * Steps: geocode → search → match → fetch menu → detect alcohol → normalize hours → build candidates.
 */
export async function enrichFromWolt(
  provider: DeliveryPlatformSnapshot,
  woltClient: WoltClient,
  options?: { geocodeFallback?: boolean }
): Promise<DeliveryEnrichmentResult>;

/**
 * Builds enrichment candidates from Wolt data for a matched provider.
 * Handles the cross-table field logic:
 * - opening_hours → providers.opening_hours
 * - no_alcohol → food_providers.no_alcohol
 */
export function buildDeliveryCandidates(
  providerId: string,
  sourceUrl: string,
  currentOpeningHours: unknown,
  currentNoAlcohol: unknown,
  proposedOpeningHours: unknown,
  proposedNoAlcohol: unknown,
): EnrichmentCandidate[];
```

**Integration with existing pipeline**:
- Reuses `detectConflict()` from `joinhalal-enricher.ts`
- Reuses `EnrichmentCandidate` interface (extended with optional `target_table`)
- Writes candidates to `enrichment_candidates` table (same upsert logic)
- Circuit breaker at 20% failure rate (same pattern)

**Test requirements (TDD)**:
- Full flow: mock WoltClient + matcher → verify candidates created
- No match found → returns result with null slug, error message
- `buildDeliveryCandidates` opening_hours additive → candidate with `source: 'wolt'`
- `buildDeliveryCandidates` no_alcohol → candidate with `target_table: 'food_providers'`
- No change when values identical → empty candidates

### 3.6 Test Files

```
src/__tests__/lib/enrichment/delivery-platform/alcohol-detector.test.ts
src/__tests__/lib/enrichment/delivery-platform/normalizer.test.ts
src/__tests__/lib/enrichment/delivery-platform/wolt-client.test.ts
src/__tests__/lib/enrichment/delivery-platform/provider-matcher.test.ts
src/__tests__/lib/enrichment/delivery-enricher.test.ts
```

---

## 4. Static City Geocode Map

The analysis recommends using OpenStreetMap Nominatim for geocoding, but that introduces rate limits and external dependency risk. Safer approach: bundle a static city→coordinates JSON map for the ~100 most common German cities in our provider dataset.

```typescript
// src/lib/enrichment/delivery-platform/city-coords.ts

export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Berlin': { lat: 52.5200, lon: 13.4050 },
  'Hamburg': { lat: 53.5511, lon: 9.9937 },
  'München': { lat: 48.1351, lon: 11.5820 },
  'Köln': { lat: 50.9375, lon: 6.9603 },
  'Frankfurt': { lat: 50.1109, lon: 8.6821 },
  'Stuttgart': { lat: 48.7758, lon: 9.1829 },
  'Düsseldorf': { lat: 51.2277, lon: 6.7735 },
  'Leipzig': { lat: 51.3397, lon: 12.3731 },
  'Dortmund': { lat: 51.5136, lon: 7.4653 },
  'Essen': { lat: 51.4556, lon: 7.0116 },
  'Bremen': { lat: 53.0793, lon: 8.8017 },
  'Dresden': { lat: 51.0504, lon: 13.7373 },
  'Hannover': { lat: 52.3759, lon: 9.7320 },
  'Nürnberg': { lat: 49.4521, lon: 11.0767 },
  'Duisburg': { lat: 51.4344, lon: 6.7624 },
  'Bochum': { lat: 51.4818, lon: 7.2162 },
  'Wuppertal': { lat: 51.2562, lon: 7.1508 },
  'Bielefeld': { lat: 52.0302, lon: 8.5325 },
  'Bonn': { lat: 50.7374, lon: 7.0982 },
  'Münster': { lat: 51.9607, lon: 7.6261 },
  // ... remaining cities extracted from provider dataset
};
```

To generate: query `SELECT DISTINCT address_city FROM providers WHERE address_city IS NOT NULL`, then use a one-time script to populate coordinates (manually or via a single Nominatim batch). This avoids per-run API calls.

---

## 5. Implementation Steps (TDD Order)

### Step 1: Alcohol Detector (Pure Function)
**Files to create**:
- `src/lib/enrichment/delivery-platform/alcohol-detector.ts`
- `src/__tests__/lib/enrichment/delivery-platform/alcohol-detector.test.ts`

**Test-first**: Write all alcohol detector tests (RED) → implement minimal code (GREEN) → refactor.

**Keywords catalog**: Extract from analysis §3 into typed arrays. Cover:
- Definite alcohol keywords (26+ terms)
- Definite no-alcohol markers (5+ terms)
- Ambiguous terms (5+ terms)

**Test data**: Use realistic German menu item names (pizza, döner, pasta, salads) plus alcohol keywords.

**Effort**: 0.5 day

### Step 2: Opening Hours Normalizer (Pure Function)
**Files to create**:
- `src/lib/enrichment/delivery-platform/normalizer.ts`
- `src/__tests__/lib/enrichment/delivery-platform/normalizer.test.ts`

**Test-first**: Write tests for `normalizeWoltOpeningHours` with representative Wolt hour formats (varied day coverage, split days, 24h format).

**Edge cases**: Null input, empty array, missing days, midnight crossover, malformed time strings.

**Effort**: 0.5 day

### Step 3: Wolt Client (HTTP Client)
**Files to create**:
- `src/lib/enrichment/delivery-platform/city-coords.ts` (static map)
- `src/lib/enrichment/delivery-platform/wolt-client.ts`
- `src/__tests__/lib/enrichment/delivery-platform/wolt-client.test.ts`

**Test pattern**: Mock `global.fetch` (or use `vitest` mock). Construct expected URLs and assert they match Wolt API patterns.

**Test coverage**:
- Happy path: venue search returns venues, menu fetch returns items
- Empty response (no venues nearby)
- HTTP errors (429, 404, 500)
- Geocode known city → coords, unknown → null
- Retry on 429

**Effort**: 1 day

### Step 4: Provider Matcher (Fuzzy Name+City)
**Files to create**:
- `src/lib/enrichment/delivery-platform/provider-matcher.ts`
- `src/__tests__/lib/enrichment/delivery-platform/provider-matcher.test.ts`

**Implementation**: Use `fastest-levenshtein` or implement trigram similarity. Normalize names before comparison.

**Test data**: Create fixture Wolt venues using realistic provider names from the dataset.

**Effort**: 1 day

### Step 5: Delivery Enricher (Orchestrator)
**Files to create**:
- `src/lib/enrichment/delivery-enricher.ts`
- `src/__tests__/lib/enrichment/delivery-enricher.test.ts`
- Extend `src/types/provider.ts` (add `delivery_links` concept) or create `src/types/delivery.ts`

**Modify existing files**:
- `src/lib/enrichment/joinhalal-enricher.ts` — add optional `target_table` to `EnrichmentCandidate`
- `src/lib/enrichment/enrichment-fields.ts` — add `opening_hours`, `no_alcohol` to `SOURCE_ENRICHABLE_FIELDS`

**Test coverage**:
- Full orchestration with mocked WoltClient+matcher → candidates with correct field_names
- `buildDeliveryCandidates` handles opening_hours → providers table
- `buildDeliveryCandidates` handles no_alcohol → food_providers table (target_table flag)
- No match → graceful return with error message
- Circuit breaker integration (reuse existing)

**Effort**: 1 day

### Step 6: DB Migration + TypeScript Types
**Files to create**:
- `supabase/migrations/YYYYMMDDHHMMSS_delivery_platform_links.sql`
- `src/types/delivery.ts`

**Files to modify**:
- `src/lib/enrichment/enrichment-fields.ts` — add new fields
- `src/lib/enrichment/joinhalal-enricher.ts` — add `target_table` to type

**Effort**: 0.5 day

### Step 7: CLI Integration
**Files to modify**:
- `scripts/enrich-providers.ts` — add `--source wolt` support

**Changes to `scripts/enrich-providers.ts`**:
1. Remove the `if (source !== 'joinhalal')` guard (line 124) — or replace with a switch that dispatches to the appropriate enricher
2. When `source === 'wolt'`:
   - Query food providers (not import_source = 'joinhalal') — select providers with `listing_type = 'food'` and `enrichment_eligible = true`
   - Geocode each provider's city
   - Search Wolt venues
   - Match to venue
   - Fetch menu
   - Run alcohol detection + opening hours extraction
   - Build candidates via `buildDeliveryCandidates`
   - Stage in `enrichment_candidates`
3. Skip offers catalog load (not needed for Wolt flow)
4. Handle `target_table` in upsert logic (write to `food_providers` when applicable)

**Effort**: 0.5 day

### Step 8: Integration Test Script
**File to create**:
- `scripts/test-wolt-enrichment.ts` — or add `--dry-run --limit 10 --source wolt` to existing CLI

**What to run**:
```bash
npx tsx scripts/enrich-providers.ts --dry-run --source wolt --limit 5
```

**Validation**:
- Check console output for proper logging
- Check `enrichment_run_logs` table for run entry
- Inspect `enrichment_candidates` for Wolt-sourced candidates (dry-run = preview only)
- Verify candidate structure (field_name, proposed_value, current_value)

**Effort**: 0.5 day

---

## 6. Test Plan

### 6.1 Unit Tests (Pure Functions)
| Test File | Tests | Coverage Target |
|-----------|-------|-----------------|
| `alcohol-detector.test.ts` | ~15 tests | Keyword matching, signal classification, edge cases, case insensitivity |
| `normalizer.test.ts` | ~12 tests | Wolt→standard hours, null/edge inputs, partial days |
| `provider-matcher.test.ts` | ~12 tests | Exact/fuzzy/no match, name normalization, confidence scoring |
| `delivery-enricher.test.ts` | ~10 tests | Candidate building, cross-table targeting, no-match handling |

### 6.2 Mocked HTTP Tests
| Test File | Tests | Coverage Target |
|-----------|-------|-----------------|
| `wolt-client.test.ts` | ~10 tests | Happy path, 429 retry, 404, geocode, empty response |

### 6.3 Integration Test
```bash
npx tsx scripts/enrich-providers.ts --dry-run --source wolt --limit 5
```

Validates:
- End-to-end DB→Wolt→candidates flow
- Supabase connection with service role
- Circuit breaker not triggered (low volume)
- Run log written

### 6.4 Running Tests
```bash
# All unit tests
npx vitest run src/__tests__/lib/enrichment/delivery-platform/

# Individual file
npx vitest run src/__tests__/lib/enrichment/delivery-platform/alcohol-detector.test.ts

# Coverage
npx vitest run --coverage src/__tests__/lib/enrichment/delivery-platform/
```

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Wolt API changes (endpoint URL or response shape) | Low | High | Version the module; add response validation with Zod schemas; monitor via integration test |
| City geocode map incomplete (provider city not in static map) | Medium | Medium | Log warning; skip provider; add CI check that verifies coverage against provider dataset |
| Provider name matching fails for >50% of providers | Medium | Medium | Validate on first 50 providers via `--dry-run --limit 50` before full run |
| Circuit breaker trips due to Wolt rate limiting | Low | Medium | Start with higher delay (500ms); monitor failure rate |
| False positive alcohol detection (halal restaurant flagged as alcohol) | Low | Low | Candidates are staged for admin review (not auto-applied). Keyword list is conservative. |
| Migration conflicts with existing schema | Low | High | Run migration against UAT first; check for existing `provider_delivery_links` or similar |
| `no_alcohol` field in `food_providers` is nullable — no existing enrichments for this table | Low | Low | Ensure upsert handles nullable booleans correctly; test with existing null values |

### Circuit Breaker Configuration
- Threshold: 20% failure rate (same as JoinHalal pipeline)
- Minimum samples before triggering: 5 providers (same as existing)
- On trigger: log urgent warning, abort run, write run log with `circuit_breaker_triggered = true`

---

## 8. Timeline Estimate

| Step | Module | Type | Person-Days | Dependencies |
|------|--------|------|-------------|--------------|
| 1 | Alcohol detector | Pure function + tests | 0.5 | None |
| 2 | Opening hours normalizer | Pure function + tests | 0.5 | None |
| 3 | Wolt client | HTTP client + tests | 1.0 | Step 2 (normalizer types) |
| 4 | Provider matcher | Fuzzy matching + tests | 1.0 | Step 3 (Wolt venue type) |
| 5 | Delivery enricher | Orchestrator + tests | 1.0 | Steps 1–4 |
| 6 | DB migration + types | SQL + TypeScript | 0.5 | None |
| 7 | CLI integration | Script modification | 0.5 | Steps 5–6 |
| 8 | Integration test | Dry-run validation | 0.5 | Steps 5–7 |
| **Total** | | | **5.5** | |

### Parallelization Opportunities
- Steps 1+2+6 can run in parallel (no dependencies)
- Steps 3+4 can run in parallel after step 6 (types needed)
- Step 5 requires all prior steps
- Steps 7+8 sequential after Step 5

### Recommended Sprint Allocation
- Day 1: Steps 1, 2, 6 (independent parallel work)
- Day 2: Steps 3, 4 (parallel)
- Day 3: Step 5 (orchestrator)
- Day 4: Step 7, Step 8 (CLI + integration)
- Day 5: Buffer for issues, code review, regression testing

---

## 9. Files Summary

### New Files (9)
| File | Purpose |
|------|---------|
| `src/lib/enrichment/delivery-platform/alcohol-detector.ts` | Alcohol keyword detection |
| `src/lib/enrichment/delivery-platform/normalizer.ts` | Wolt→standard format converters |
| `src/lib/enrichment/delivery-platform/wolt-client.ts` | Wolt API HTTP client |
| `src/lib/enrichment/delivery-platform/city-coords.ts` | Static city→coordinates map |
| `src/lib/enrichment/delivery-platform/provider-matcher.ts` | Fuzzy provider→venue matching |
| `src/lib/enrichment/delivery-enricher.ts` | Orchestrator |
| `src/types/delivery.ts` | Delivery link + platform types |
| `supabase/migrations/*_delivery_platform_links.sql` | New table migration |
| `src/__tests__/lib/enrichment/delivery-platform/alcohol-detector.test.ts` | Tests |
| `src/__tests__/lib/enrichment/delivery-platform/normalizer.test.ts` | Tests |
| `src/__tests__/lib/enrichment/delivery-platform/wolt-client.test.ts` | Tests |
| `src/__tests__/lib/enrichment/delivery-platform/provider-matcher.test.ts` | Tests |
| `src/__tests__/lib/enrichment/delivery-enricher.test.ts` | Tests |

### Modified Files (4)
| File | Change |
|------|--------|
| `src/lib/enrichment/enrichment-fields.ts` | Add `opening_hours`, `no_alcohol` to `SOURCE_ENRICHABLE_FIELDS` |
| `src/lib/enrichment/joinhalal-enricher.ts` | Add optional `target_table` to `EnrichmentCandidate` |
| `scripts/enrich-providers.ts` | Add `--source wolt` support with dispatch logic |

---

## 10. Acceptance Criteria

1. `npm test` passes all new unit tests
2. `npx tsc --noEmit` passes (no type errors)
3. `npm run lint` passes
4. `npx tsx scripts/enrich-providers.ts --dry-run --source wolt --limit 5` runs without errors
5. Output shows Wolt-sourced candidates with `field_name: opening_hours` and/or `field_name: no_alcohol`
6. `provider_delivery_links` table exists in DB (verified via UAT migration run)
7. Circuit breaker fires correctly when `--source wolt` encounters >20% failures

---

## 11. Architecture Condition Updates (Post-Critique)

The architecture review (agent-output/critiques/144-architecture-critique.md) approved this plan with two required conditions and one recommended condition. These updates incorporate them.

### Condition 1 (REQUIRED): Cross-table enrichment — simplified

**Decision**: Drop the `target_table` approach entirely. Instead:
- `no_alcohol` enrichment candidates are created with `field_name = 'no_alcohol'` as usual
- The admin approval logic (in `src/services/admin/enrichment.ts`) will be updated to check: if `field_name === 'no_alcohol'`, write to `food_providers` table instead of `providers`
- No schema change to `enrichment_candidates` table needed
- No new column, no migration for enrichment_candidates

**Changes to plan**:
- Remove `target_table` from `EnrichmentCandidate` interface (no modification to `joinhalal-enricher.ts`)
- Update `enrichment-fields.ts` — just add `opening_hours`, `no_alcohol` to `SOURCE_ENRICHABLE_FIELDS` (no struct changes)
- Update `scripts/enrich-providers.ts` upsert logic — no target_table handling needed (candidates go to enrichment_candidates as normal)
- Admin approval dispatch is deferred to a separate task (not in this implementation phase)

### Condition 2 (REQUIRED): Geocoding as separate module

- Extract `src/lib/enrichment/delivery-platform/geocoder.ts` with:
  - `Geocoder` interface: `geocode(cityName: string): Promise<{lat: number; lon: number} | null>`
  - `StaticCityGeocoder` class implementing `Geocoder` using the city-coords map
- `wolt-client.ts` accepts `Geocoder` as a dependency instead of owning `geocodeCity()`
- `city-coords.ts` remains as the static data map

### Condition 3 (RECOMMENDED): City coverage validation

- Add `getAllCities()` helper that queries available city keys
- Log warning (not error) for unmatched cities during run
- No CI check needed for Phase 1 — add to Phase 2 planning

### Updated Files Summary

**New files (14 total)**:
- `src/lib/enrichment/delivery-platform/alcohol-detector.ts`
- `src/lib/enrichment/delivery-platform/normalizer.ts`
- `src/lib/enrichment/delivery-platform/geocoder.ts` (NEW — extracted per Condition 2)
- `src/lib/enrichment/delivery-platform/city-coords.ts`
- `src/lib/enrichment/delivery-platform/wolt-client.ts` (accepts Geocoder)
- `src/lib/enrichment/delivery-platform/provider-matcher.ts`
- `src/lib/enrichment/delivery-enricher.ts`
- `src/types/delivery.ts`
- `supabase/migrations/*_delivery_platform_links.sql`
- 5 test files

**Modified files (3 total)**:
- `src/lib/enrichment/enrichment-fields.ts` — add `opening_hours`, `no_alcohol`
- `scripts/enrich-providers.ts` — add `--source wolt` dispatch
- (No changes to `joinhalal-enricher.ts` — `target_table` approach dropped)

### Implementation Steps (Updated)

| Step | Module | Type | Changes |
|------|--------|------|---------|
| 0a | Geocoder | New file | geocoder.ts + interface + StaticCityGeocoder |
| 0b | City coords | New file | city-coords.ts — static map |
| 1 | Alcohol detector | New file | alcohol-detector.ts + tests |
| 2 | Opening hours normalizer | New file | normalizer.ts + tests |
| 3 | Wolt client | New file | wolt-client.ts + tests (accepts Geocoder) |
| 4 | Provider matcher | New file | provider-matcher.ts + tests |
| 5 | Delivery enricher | New file | delivery-enricher.ts + tests |
| 6 | DB migration + types | New files | Migration SQL, types/delivery.ts |
| 7 | CLI integration | Modify | enrich-providers.ts — source wolt |
| 8 | Integration test | Run | --dry-run --limit 5 validation |
