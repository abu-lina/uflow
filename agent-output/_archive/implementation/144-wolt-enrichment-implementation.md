# Plan 144: Wolt Delivery Platform Enrichment — Implementation

## Summary

Built Phase 1 of the automated restaurant data enrichment pipeline for UFlow.
Integrates with the Wolt public API to find restaurant venues, match them to
UFlow providers via fuzzy name+city matching, extract menu items for alcohol
detection, and extract opening hours. All findings are staged as enrichment
candidates using the existing pattern.

### Key Architecture Decisions

- **Geocoder as dependency**: `StaticCityGeocoder` implements `Geocoder`
  interface. `WoltClient` accepts it via constructor injection (Condition 2).
- **No `target_table`**: `no_alcohol` candidates use `field_name = 'no_alcohol'`
  as normal — admin approval dispatch is deferred (Condition 1).
- **No changes to `joinhalal-enricher.ts`**: Left untouched as required.
- **`fastest-levenshtein`**: Used for fuzzy string matching in provider matcher.

## File List with Line Counts

### New Files (15 files, 1635 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/enrichment/delivery-platform/city-coords.ts` | 61 | Static city→coords map (60 German cities) |
| `src/lib/enrichment/delivery-platform/geocoder.ts` | 21 | `Geocoder` interface + `StaticCityGeocoder` |
| `src/lib/enrichment/delivery-platform/alcohol-detector.ts` | 126 | Alcohol keyword detection (pure functions) |
| `src/lib/enrichment/delivery-platform/normalizer.ts` | 78 | Wolt→standard format converters |
| `src/lib/enrichment/delivery-platform/wolt-client.ts` | 167 | Wolt API HTTP client with retry/rate-limit |
| `src/lib/enrichment/delivery-platform/provider-matcher.ts` | 121 | Fuzzy provider→venue matching |
| `src/lib/enrichment/delivery-enricher.ts` | 149 | Orchestrator — enrichment pipeline |
| `src/types/delivery.ts` | 12 | `ProviderDeliveryLink` + `DeliveryPlatform` types |
| `supabase/migrations/20260604120000_delivery_platform_links.sql` | 32 | New `provider_delivery_links` table |
| `src/__tests__/lib/enrichment/delivery-platform/geocoder.test.ts` | 60 | Geocoder tests (9 tests) |
| `src/__tests__/lib/enrichment/delivery-platform/alcohol-detector.test.ts` | 114 | Alcohol detector tests (18 tests) |
| `src/__tests__/lib/enrichment/delivery-platform/normalizer.test.ts` | 134 | Normalizer tests (14 tests) |
| `src/__tests__/lib/enrichment/delivery-platform/wolt-client.test.ts` | 193 | Wolt client tests (15 tests) |
| `src/__tests__/lib/enrichment/delivery-platform/provider-matcher.test.ts` | 146 | Provider matcher tests (21 tests) |
| `src/__tests__/lib/enrichment/delivery-enricher.test.ts` | 221 | Delivery enricher tests (10 tests) |

### Modified Files (2 files)

| File | Lines | Change |
|------|-------|--------|
| `src/lib/enrichment/enrichment-fields.ts` | 54 (+2) | Added `opening_hours`, `no_alcohol` to `SOURCE_ENRICHABLE_FIELDS` |
| `scripts/enrich-providers.ts` | 608 (+~218) | Added `--source wolt` dispatch with `runWoltEnrichment()` |

## Test Results

```
✓ src/__tests__/lib/enrichment/delivery-platform/alcohol-detector.test.ts (18 tests)
✓ src/__tests__/lib/enrichment/delivery-platform/normalizer.test.ts (14 tests)
✓ src/__tests__/lib/enrichment/delivery-platform/geocoder.test.ts (9 tests)
✓ src/__tests__/lib/enrichment/delivery-platform/provider-matcher.test.ts (21 tests)
✓ src/__tests__/lib/enrichment/delivery-platform/wolt-client.test.ts (15 tests)
✓ src/__tests__/lib/enrichment/delivery-enricher.test.ts (10 tests)
```

All **87 new tests** pass. Full suite: **1391 passed, 22 skipped**.

## Type Check

```
npx tsc --noEmit — PASS (no errors)
```

## Lint Results

No lint errors in new code. Only pre-existing error in
`src/features/providers/components/ProviderDetailSections.tsx:137:7`.

## Test Coverage by Module

| Module | Tests | Key Scenarios |
|--------|-------|---------------|
| `alcohol-detector` | 18 | Pizza → no_signal, Bier → definite_alcohol, alkoholfreies Bier → definite_no_alcohol, Apfelschorle → ambiguous, case insensitivity, partial word matching (Biergarten), mixed signals, empty |
| `normalizer` | 14 | Standard hours, null/undefined/empty input, missing days, midnight crossover, 24h, malformed times, venue normalization |
| `geocoder` | 9 | Known city (Berlin, München, Köln), case-insensitive, unknown city, empty/whitespace, all major cities |
| `wolt-client` | 15 | URL construction, venue parsing, menu parsing, 404 error, 429 retry with backoff, retry exhaustion, empty response, geocode city |
| `provider-matcher` | 21 | Exact match, fuzzy match, normalization (GmbH, e.K., Restaurant), case insensitivity, empty venues, cross-city with high similarity, best match selection |
| `delivery-enricher` | 10 | Full flow with mocks, no city error, geocode failure, no venues, no match, opening_hours candidate, no_alcohol candidate, both fields change, identical values → empty |

## Deviations from Plan (with Rationale)

1. **`fastest-levenshtein` distance API**: Used `distance()` function directly
   instead of `similarity()` helper — the plan referenced Levenshtein but did
   not specify the exact API. The library only exports `distance()`, so we
   compute similarity manually as `1 - dist / maxLen`.

2. **High-similarity cross-city matching**: The plan states "If city doesn't
   match but name similarity is very high → fuzzy_name_only". We implemented
   this by allowing exact name matches (score = 1.0) to bypass the city
   requirement, preventing false positives from chain restaurants.

3. **`RawItem` interface removed**: Originally declared for response parsing
   but unused after switching to `asArray<T>()` helper. Removed to satisfy lint.

4. **CLI query filter**: For Wolt source, we query providers with
   `listing_type = 'food'` and `enrichment_eligible = true` (not
   `import_source = 'wolt'`) since we're matching existing providers against
   Wolt, not importing from Wolt.

## Post-Review Fixes (Code Review 144)

The code review returned REJECTED with 1 CRITICAL and 4 MEDIUM issues. All fixed:

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | CRITICAL | `scripts/enrich-providers.ts:131` | `stats` referenced before `const` declaration (TDZ) → `--source wolt` crashes | Moved `const stats: RunStats = {...}` before the `if (source === 'wolt')` block |
| 2 | MEDIUM | `provider-matcher.ts:23-27` | Suffixes ordered short→long (`' gmbh'` before `' gmbh & co. kg'`), dead case variants never matched | Sorted descending by length, removed `' gmbH'`, `' GmbH'`, `' GMBH'` case variants |
| 3 | MEDIUM | `normalizer.ts:40` | `24:00` converted to `23:00`, losing 60 min of operating time | Store `24:00` natively instead of truncating |
| 4 | MEDIUM | `alcohol-detector.ts:27-29` | `.includes()` substring matching caused false positives (`Wein` in `Weiner`, `Weinbergstrasse`) | Replaced with regex word-boundary matching `(?:\|\\W)keyword(?:\|\\W)` |
| 5 | MEDIUM | `migration: provider_delivery_links` | Missing `updated_at` auto-update trigger | Added `update_updated_at_column()` function + `BEFORE UPDATE` trigger |

### Updated Test Results (post-fix)

```
npx vitest run src/__tests__/lib/enrichment/delivery-platform/
→ 77 passed, 5 files

npx tsc --noEmit
→ PASS (no errors)
```

### Test Adjustments

- **`normalizer.test.ts`**: `24h format` test now expects `close: '24:00'` instead of `close: '23:00'`
- **`alcohol-detector.test.ts`** (3 tests):
  - `Apfelschorle → ambiguous` → `Schorle → ambiguous` (compound word no longer matches `Schorle`)
  - `Bier, Apfelschorle` → `Bier, Punsch` in the `definite alcohol trumps ambiguous` test
  - `Apfelsaft → Hausgetränk` → `Saft → Hausgetränk` in `hasAmbiguousKeywords`
  - `matches partial words like Biergarten` → `rejects compound words like Biergarten`
