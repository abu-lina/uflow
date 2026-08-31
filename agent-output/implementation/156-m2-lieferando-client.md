---
ID: 156
Origin: 156
UUID: 23410a23
Status: Active
---

# Milestone 2 — Lieferando Web Scraper Client

## Summary

Built a Lieferando.de web scraper client that searches restaurants by city (HTML page parsing), fetches restaurant pages and extracts menu items, opening hours, description, phone, and address via JSON-LD + cheerio DOM parsing. Integrated into the enrichment pipeline as a new `--source lieferando` option.

Also generified the provider-matcher per ARCHITECT MEDIUM-3 recommendation (`VenueLike` interface + generic type parameter), ensuring backward compatibility with existing WoltVenue usage.

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/enrichment/delivery-platform/lieferando-types.ts` | **NEW** | TypeScript interfaces for Lieferando data structures |
| `src/lib/enrichment/delivery-platform/lieferando-client.ts` | **NEW** | HTTP scraper client with cheerio parsing, rate limiting, exponential backoff retry |
| `src/lib/enrichment/delivery-platform/lieferando-enricher.ts` | **NEW** | `enrichFromLieferando()` orchestration — geocode, search, match, fetch, build candidates |
| `src/lib/enrichment/delivery-platform/provider-matcher.ts` | MODIFIED | Generified with `VenueLike` interface + `MatchCandidate<T>` + `matchProviderToVenues<T>()` |
| `src/lib/enrichment/delivery-enricher.ts` | MODIFIED | Updated `match.woltVenue` → `match.venue` to match new generic property name |
| `src/lib/enrichment/delivery-platform/__tests__/lieferando-client.test.ts` | **NEW** | 15 unit tests for HTML parsing (JSON-LD, menu items, price parsing, restaurant cards) |
| `src/__tests__/lib/enrichment/delivery-platform/provider-matcher.test.ts` | MODIFIED | Updated `woltVenue` → `venue`; added generic matcher tests with Lieferando-like venues |
| `scripts/enrich-providers.ts` | MODIFIED | Added `runLieferandoEnrichment()`, `autoApplyLieferandoFields()`, `--source lieferando` support |
| `package.json` | MODIFIED | Added `cheerio` dependency |
| `agent-output/implementation/156-m2-lieferando-client.md` | **NEW** | This document |

## TDD Compliance

| Test | Status | Notes |
|------|--------|-------|
| JSON-LD extraction from HTML | ✅ | 4 tests: valid Restaurant JSON-LD, missing, non-Restaurant type, malformed JSON |
| Menu item parsing from HTML | ✅ | 3 tests: full menu, empty categories, items without description |
| Price parsing (EUR to cents) | ✅ | 5 tests: "10,50 €" → 1050, integer, zero, unparseable |
| Restaurant card extraction from city page | ✅ | 3 tests: basic extraction, dedup by slug, empty page |
| Generic matcher with LieferandoSearchResult | ✅ | 2 tests: exact match, null on no match |
| Backward compat with WoltVenue | ✅ | Existing 20 tests unchanged, all pass |
| Provider-matcher error handling unchanged | ✅ | 23 total tests pass (20 existing + 3 new for generic) |
| Auto-apply payload tests pass (no regressions) | ✅ | 15/15 pass |

## Test Evidence

```
 ✓ src/__tests__/lib/enrichment/delivery-platform/provider-matcher.test.ts (23 tests) 4ms
 ✓ src/lib/enrichment/delivery-platform/__tests__/lieferando-client.test.ts (15 tests) 135ms
 ✓ src/lib/enrichment/__tests__/auto-apply-payload.test.ts (15 tests) 4ms
 ✓ src/__tests__/lib/enrichment/delivery-enricher.test.ts (10 tests) 9ms
 ✓ src/__tests__/lib/enrichment/joinhalal-enricher.test.ts (19 tests) 11ms
 ✓ src/__tests__/lib/enrichment/delivery-platform/alcohol-detector.test.ts (18 tests) 9ms
 (all 9 enrichment test files pass, total 125 tests)
```

## Verification

- `npx tsc --noEmit` — zero errors (excluding pre-existing `ubereats-client.ts` which is a different milestone)
- `npx vitest run src/lib/enrichment/` — 125/125 tests pass
- `npx tsx scripts/enrich-providers.ts --source lieferando --dry-run --limit 1` — starts without error

## Lieferando Source

The Lieferando client is selectable via:
```
npx tsx scripts/enrich-providers.ts --source lieferando --dry-run
npx tsx scripts/enrich-providers.ts --source lieferando --write
npx tsx scripts/enrich-providers.ts --source lieferando --mode auto-apply
```

## Implementation Notes

- **Search**: Fetches `https://www.lieferando.de/speisekarte/{city-slug}`, parses `<a href="/speisekarte/{slug}">` links as restaurant cards
- **Restaurant page**: Fetches individual restaurant page, extracts JSON-LD (`<script type="application/ld+json">`) for structured data, falls back to DOM parsing for menu items
- **Rate limiting**: 750ms delay between requests (configurable via `LieferandoClientConfig.requestDelayMs`)
- **Retry**: Exponential backoff (2^attempt * 1000ms), max 3 retries, on 429/5xx responses
- **Client interface**: `LieferandoClient` interface with `searchRestaurants(city)` and `getRestaurantPage(slug)` matching the Wolt pattern

## Known Limitations

1. **City page structure**: The search parser assumes `<a href="/speisekarte/{slug}">Name</a>` patterns. If Lieferando changes their page structure, the parser may need updates.
2. **No `venue_preview_items` equivalent**: Unlike Wolt, Lieferando's search results don't include preview menu items. Full menu data requires fetching each restaurant page individually.
3. **No pagination handling**: If a city has >~50 restaurants, Lieferando may paginate the search results page. Current implementation returns only the first page.
4. **Region restriction**: Lieferando is `.de` domain only. The client is hardcoded to `lieferando.de`. The city slug normalization assumes German city names.
5. **Dynamic content**: If Lieferando moves to client-side rendering for menus, the HTML parser will break and a headless browser (Playwright) approach would be needed.
