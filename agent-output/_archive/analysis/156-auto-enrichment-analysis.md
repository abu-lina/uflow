---
ID: 156
Origin: 156
UUID: ad728c27
Status: Active
---

# Automatic Food Provider Enrichment Pipeline — Analysis

## 1. Current Pipeline Analysis

### Architecture Overview

The existing enrichment infrastructure spans three layers:

**Layer 1 — CLI Entry Point** (`scripts/enrich-providers.ts`)
- A Node.js CLI script using `npx tsx` execution
- Supports two sources: `joinhalal` and `wolt`
- Default mode is `--dry-run` (preview only); `--write` stages candidates
- Uses service-role Supabase client (bypasses RLS)
- Circuit breaker at 20% failure rate after 5 providers
- 250ms delay between fetches
- Writes run logs to `enrichment_run_logs` table

**Layer 2 — Enrichment Logic** (`src/lib/enrichment/`)
- `joinhalal-enricher.ts` — Core types (`ProviderSnapshot`, `ParsedEnrichmentData`, `EnrichmentCandidate`), conflict detection, candidate-building, dedup logic
- `delivery-enricher.ts` — Wolt enrichment orchestration (geocode city → search venues → match provider → detect alcohol → build candidates)
- `enrichment-fields.ts` — Field classification: `SOURCE_ENRICHABLE_FIELDS` vs `ADMIN_CONTROLLED_FIELDS`

**Layer 3 — Delivery Platform Clients** (`src/lib/enrichment/delivery-platform/`)
- `wolt-client.ts` — HTTP client hitting Wolt consumer API (`consumer-api.wolt.com/v1/pages/restaurants`) and restaurant menu API (`restaurant-api.wolt.com/v4/venues/slug/.../menu/data`). Rate-limited, retry logic, User-Agent header.
- `provider-matcher.ts` — Name normalization (remove GmbH, UG, suffixes), Levenshtein-based fuzzy matching with city verification
- `geocoder.ts` — Static in-memory city→coords map (83 German cities)
- `normalizer.ts` — Wolt opening hours → UFlow `OpeningHours` format
- `alcohol-detector.ts` — Keyword-based alcohol detection from menu item names

### Current Flow: CLI → Candidate → Admin Review

1. **Selection**: Fetches providers matching filter criteria:
   - JoinHalal: `import_source = 'joinhalal'`, `review_status = 'approved'`, `enrichment_eligible = true`, `provider_owner_id IS NULL`, `import_source_url IS NOT NULL`
   - Wolt: `listing_type = 'food'`, `enrichment_eligible = true` (no owner check — all food providers eligible)

2. **Processing**: For each provider
   - JoinHalal: Fetches HTML from `import_source_url`, parses Schema.org JSON-LD, extracts Speisen (menu items), resolves offers_ids from catalog, checks phone/website changes
   - Wolt: Geocodes city, searches Wolt venues by coords, fuzzy-matches provider name to venue, fetches menu preview items, runs alcohol detection

3. **Candidate Staging**: Differences are packaged as `EnrichmentCandidate` objects and upserted into `enrichment_candidates` table with `status = 'pending'`. Uses `ON CONFLICT DO NOTHING` on `(provider_id, field_name, source)`.

4. **Admin Review**: Admin reviews via `src/services/admin/enrichment.ts` — `getPendingCandidates()`, `approveCandidate()`, `rejectCandidate()`, `bulkApproveByProvider()`. Approval writes the proposed value directly to `providers` table via `supabase.from('providers').update(...)`.

5. **Wolt-specific delivery links**: After candidate staging, Wolt enrichment additionally writes to `provider_delivery_links` table (upsert on `provider_id, platform`).

### Current Gaps
- No auto-apply mode — always stages for review
- Always overwrites existing values (uses `detectConflict` which returns `'additive'`, `'conflict'`, or `'no-change'` but the CLI stages ALL non-identical values)
- Only supports Wolt and JoinHalal
- No trigger on provider creation

## 2. Source Capability Matrix

| Field | Wolt (current) | Lieferando (new) | Uber Eats (new) | JoinHalal (current) |
|---|---|---|---|---|
| **delivery_links** | ✅ Venue URL + slug | ✅ Restaurant URL | ✅ Restaurant URL | ❌ |
| **opening_hours** | ⚠️ Available in venue API but `delivery-enricher.ts:87` hardcodes `normalizedHours = null` | ✅ On page | ✅ On page | ❌ |
| **no_alcohol** | ✅ Via menu item keyword detection | ⚠️ Possible (menu scraping) | ⚠️ Possible (menu scraping) | ❌ |
| **contact_phone** | ❌ Not in Wolt API | ✅ On page | ❌ | ✅ Schema.org |
| **social_website** | ❌ | ❌ | ❌ | ✅ Schema.org |
| **offers_ids** | ❌ | ❌ | ❌ | ✅ Speisen→offers |
| **address fields** | ⚠️ Venue has city but not full address in discovery API | ✅ Full address | ⚠️ Partial | ✅ Schema.org |
| **menu items** | ✅ `fetchMenuData()` returns items + categories | ✅ Menu with prices | ✅ Menu with prices | ✅ Speisen only |
| **provider_description** | ❌ | ✅ Restaurant description | ✅ | ❌ |
| **images** | ⚠️ Venue preview images possible | ✅ | ✅ | ❌ |
| **rating** | ✅ In venue data (not currently used) | ✅ | ✅ | ❌ |
| **prices** | ✅ In menu data (`unit_prices=true`) | ✅ | ✅ | ❌ |

### Key Observations

- **Wolt**: `fetchMenuData()` is already implemented and returns rich item data (name, description, category, prices) — currently only used for alcohol detection. Menu data could be written to `food_menu` table directly.
- **Lieferando**: Full HTML pages with structured data. Address, phone, opening hours, menu with prices, description are all available.
- **Uber Eats**: Strongest anti-bot protection (Cloudflare Turnstile, fingerprinting). Data is loaded dynamically via GraphQL API, making scraping harder.
- **JoinHalal**: Only Schema.org data — limited to phone, website, and Speisen. No opening hours, delivery links, or alcohol info.

## 3. Auto-Apply Design

### Desired Behavior

The enrichment pipeline should write directly to provider fields but ONLY when the field is currently empty/null. Never overwrite existing data.

### Conflict Detection Already Exists

`detectConflict()` in `joinhalal-enricher.ts:92-103` already categorizes changes:
- `'no-change'` → skip
- `'additive'` → current is empty, proposed has value → **safe to auto-apply**
- `'conflict'` → both have different non-empty values → **skip entirely** (was admin review, now just skip)

### Multi-Table Write Strategy

Use the existing `admin_update_provider` RPC function (migration 094). It accepts a JSONB payload with sub-objects:
- `providers` — basic fields + amenities
- `food_providers` — extension fields (no_alcohol, etc.)
- `menu_items` — full replacement
- `delivery_links` — full replacement

The RPC uses `COALESCE` internally which means: if a field is provided in the payload, it overwrites. This contradicts auto-apply semantics. **Two options:**

**Option A (Recommended)**: Build enrichment payloads by reading current values, and only include fields that are currently null. Use the existing RPC but ensure the payload is filtered to null-only fields. This requires a pre-read step.

**Option B**: Create a new RPC `auto_enrich_provider` that uses the same structure but with `ON CONFLICT` / null-guard semantics. This is cleaner but adds maintenance overhead.

**Recommendation**: Option A. The CLI already reads current provider state (see `DeliveryPlatformSnapshot` / `ProviderSnapshot`). Filter to fields where `current_value` is empty before building the RPC payload.

### Write Path for Each Table

| Target Table | RPC Sub-object | Auto-apply Condition |
|---|---|---|
| `providers` (basic fields) | `providers` | Only include fields where current value is null |
| `food_providers` (no_alcohol, etc.) | `food_providers` | Only include fields where current value is null |
| `provider_delivery_links` | `delivery_links` | Only insert if no row exists for `(provider_id, platform)` |
| `food_menu` | `menu_items` | Only insert if no menu items exist for this provider |

For `delivery_links` and `food_menu`, the current RPC does full replacement (DELETE + INSERT). This is dangerous for auto-apply. **Mitigation**: Only include these in the payload if the current value is empty (no existing rows). Use `ON CONFLICT DO NOTHING` on `provider_delivery_links`. For menu items, check `SELECT count(*) FROM food_menu WHERE provider_id = X` first.

## 4. Trigger Design

### Trigger A: On Provider Creation (Immediate)

**Approach**: Supabase Database Webhook on `INSERT` into `providers`

```sql
-- Webhook condition: NEW.listing_type = 'food' AND NEW.provider_owner_id IS NULL
-- Webhook calls: POST https://<project>.supabase.co/functions/v1/enrich-new-provider
```

The webhook calls a Supabase Edge Function (or a Next.js API route) that:
1. Receives the new `provider_id`
2. Runs enrichment against all available sources (Wolt, Lieferando, UberEats) in parallel
3. Auto-applies valid fields (only where empty)
4. Logs results

**Alternative**: Next.js API route at `/api/webhooks/enrich-provider` called by the Supabase webhook with `service_role` key for database access.

**Important**: Webhook has a 5-second timeout on free plan (Supabase). If enrichment takes longer, use a queue or async pattern:
- Webhook enqueues the provider_id (e.g., writes to a `pending_enrichments` table)
- A scheduled cron job picks up pending enrichments
- Or keep the webhook minimal (just insert into a queue table) and let the scheduled enrichment pick it up

### Trigger B: Scheduled Refresh (Weekly)

Update `enrich-wolt.yml` to:
- Run all sources (Wolt, Lieferando, UberEats) with `--auto-apply` flag
- Target `listing_type = 'food' AND provider_owner_id IS NULL`
- Run weekly on Sunday at 3am UTC (existing schedule)
- Add `--auto-apply` flag to the CLI (new mode)

### Workflow Changes

Create a new unified workflow `enrich-all-sources.yml` or extend `enrich-wolt.yml`:

```yaml
name: Food Provider Enrichment

on:
  workflow_dispatch:
    inputs:
      sources:
        description: 'Sources to run (comma-separated)'
        default: 'wolt,lieferando,ubereats'
      mode:
        description: 'auto-apply or dry-run'
        default: 'auto-apply'
      limit:
        description: 'Provider limit'
  schedule:
    - cron: '0 3 * * 0'  # weekly Sunday 3am UTC
```

## 5. Lieferando Scraper Spec

### Base URL
```
https://www.lieferando.de/
```

### Search API Endpoint
Lieferando uses an internal search API. Based on public knowledge:
```
GET https://www.lieferando.de/api/restaurants/search
  ?q={search_term}
  &lat={lat}
  &lng={lng}
  ...
```

Or more commonly, the search is done via page navigation:
```
GET https://www.lieferando.de/speisekarte/{restaurant-slug}
```

### Restaurant Page Structure
License plate page example:
```
https://www.lieferando.de/speisekarte/restaurant-name
```

Available data on restaurant pages:
- **Restaurant name** — `<h1>` or meta tags
- **Address** — In the restaurant header
- **Phone number** — On the contact section
- **Opening hours** — In a structured format, often in a JSON-LD script tag
- **Delivery area / estimated time** — Header area
- **Menu categories** — Grouped sections (e.g., "Hauptgerichte", "Vorspeisen")
- **Menu items** — Each with name, description, price (in euros)
- **Ratings** — Star rating and review count
- **Cuisine type** — Tags or labels
- **Minimum order amount** — In the ordering panel

### Lieferando Anti-Bot Protections
- Moderate. Less aggressive than Uber Eats
- Uses standard web scraping countermeasures (rate limiting, some JS challenge)
- No Cloudflare Turnstile observed
- IP-based rate limiting possible

### Expected Client Interface

```typescript
interface LieferandoClient {
  searchRestaurants(city: string): Promise<LieferandoSearchResult[]>;
  getRestaurantPage(slug: string): Promise<LieferandoRestaurantData>;
}

interface LieferandoSearchResult {
  name: string;
  slug: string;
  city: string;
  address: string;
  cuisineType: string[];
  rating: number | null;
  isActive: boolean;
}

interface LieferandoRestaurantData {
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  openingHours: OpeningHours | null;
  description: string | null;
  rating: number | null;
  menuCategories: LieferandoMenuCategory[];
  deliveryUrl: string;
}

interface LieferandoMenuCategory {
  name: string;
  items: LieferandoMenuItem[];
}

interface LieferandoMenuItem {
  name: string;
  description: string | null;
  priceCents: number;
}
```

### Suggested Implementation Approach
- Use `cheerio` (already parsable with standard HTML parsing) or `jsdom` for HTML parsing
- Parse JSON-LD (Schema.org) when available for structured data
- Fall back to DOM parsing for items not in JSON-LD
- 500ms-1s delay between requests
- Respect `robots.txt`

## 6. Uber Eats Scraper Spec

### Base URL
```
https://www.ubereats.com/
```

### Search & Discovery
Uber Eats loads data dynamically. The public search URL pattern:
```
https://www.ubereats.com/de/location/{city-slug}
```

Restaurant page:
```
https://www.ubereats.com/de/store/{restaurant-slug}
```

### Data Access Challenges

**Strong anti-bot protection:**
- Cloudflare Turnstile (CAPTCHA challenges)
- Browser fingerprinting (TLS fingerprint, headers, canvas)
- Dynamic GraphQL API (not straightforward REST)
- Data loaded via JavaScript (not SSR HTML)
- Cookie/session requirements
- Possible DevTools detection

### Available Data (on restaurant pages, if scraped)
- **Restaurant name** — Page title
- **Delivery ETA** — Estimated delivery time
- **Rating** — Star rating, may have count
- **Menu categories** — JS-rendered groups
- **Menu items** — Name, price, description, images
- **Cuisine type** — Tags
- **Price range** — $/$$/$$$
- **Distance** — km from searcher

### Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Cloudflare blocking | **High** | Headless browser (Playwright/Puppeteer), rotating proxies |
| IP rate limiting | Medium | Long delays, proxy rotation |
| CAPTCHA challenges | **High** | CAPTCHA solving service, or accept limited coverage |
| Terms of Service violation | Medium | Consult legal; may need user opt-in |
| Page structure changes | Medium | Integration tests + monitoring |

### Recommended Approach
1. **Start with Playwright** (headless Chromium) instead of raw fetch + DOM parsing
2. **Use stealth plugins**: `playwright-extra` with `puppeteer-extra-plugin-stealth`
3. **Residential proxy rotation**: For any meaningful scale
4. **Graceful degradation**: If scraping fails, skip and log; don't block the pipeline

### Expected Client Interface

```typescript
interface UberEatsClient {
  searchRestaurants(city: string, lat: number, lon: number): Promise<UberEatsSearchResult[]>;
  getRestaurantPage(slug: string): Promise<UberEatsRestaurantData>;
}

interface UberEatsSearchResult {
  name: string;
  slug: string;
  rating: number | null;
  estimatedDeliveryMinutes: number | null;
  isActive: boolean;
}

interface UberEatsRestaurantData {
  name: string;
  slug: string;
  description: string | null;
  rating: number | null;
  openingHours: OpeningHours | null;
  menuCategories: UberEatsMenuCategory[];
  deliveryUrl: string;
}

interface UberEatsMenuCategory {
  name: string;
  items: UberEatsMenuItem[];
}

interface UberEatsMenuItem {
  name: string;
  description: string | null;
  priceCents: number;
}
```

### Implementation Complexity
- **Lieferando**: Medium (HTML parsing + some JSON-LD)
- **Uber Eats**: High (headless browser, anti-bot evasion)
- **Wolt**: Low (existing HTTP API client, no anti-bot issues)

## 7. Schema Gaps

### Existing Schema (Post-Migration 094)

| Table | Columns | Enrichment-Relevant |
|---|---|---|
| `providers` | `provider_name`, `address_street`, `address_zip`, `address_city`, `address_country`, `contact_phone`, `contact_email`, `social_website`, `social_instagram`, `opening_hours`, `provider_description`, `provider_images` | All |
| `food_providers` | `no_alcohol`, `no_pork`, `no_gambling`, `verification_method`, `has_certificate`, `certificate_url` | `no_alcohol` |
| `provider_delivery_links` | `provider_id`, `platform` (enum: wolt/lieferando/ubereats), `platform_url`, `platform_slug`, `is_active`, `last_verified_at` | All (platform enum already covers all 3) |
| `food_menu` | `provider_id`, `name_de`, `name_en`, `description_de`, `price_cents`, `category`, `is_available`, `sort_order` | All (plus needs `image_url`?) |

### Gaps Identified

1. **food_menu.image_url** — Lieferando and Uber Eats have menu item images. If we want to enrich images, `food_menu` needs an `image_url` column.
   - Severity: **Low** — images are nice-to-have, can be added later
   
2. **provider_delivery_links.menu_last_fetched_at** — Track when menu items were last pulled from a delivery platform. Useful for staleness detection.
   - Severity: **Low** — can use `last_verified_at` as proxy

3. **enrichment_candidates** table — Still useful for logging what was auto-applied (change status to `'auto_applied'` instead of `'pending'`). No schema changes needed — the `status` column uses `text` type.

4. **providers.last_enriched_at** — Already exists and is updated by current CLI. No change needed.

5. **providers.rating** or **providers.avg_rating** — Could store aggregated rating from delivery platforms. Currently doesn't exist.
   - Severity: **Medium** — useful feature but adds complexity. Out of scope for initial auto-apply.

### No New Tables Needed

The current schema supports the entire enrichment pipeline. Only potentially `food_menu.image_url` if menu images are prioritized.

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Uber Eats Cloudflare blocking** | High | Medium — Uber Eats enrichment fails gracefully | Detect failure early, skip provider, log. Use headless browser with stealth. Don't let it block the pipeline. |
| **Lieferando IP rate limiting** | Medium | Low — individual providers fail | Exponential backoff, max retries, long delays (1s+). Weekend-only schedule reduces pressure. |
| **Lieferando page structure change** | Medium | Medium — scraper breaks, no data | Integration tests per source with daily assertion. Alerting on failure. |
| **Wolt API changes** | Low | Medium — affects existing enrichment | Wolt uses consumer-facing API (not public developer API). Could change without notice. Monitor `enrichment_run_logs` failure rates. |
| **Data staleness** | Medium | Low — stale data is better than no data | Weekly refresh schedule. Tag `last_enriched_at` for staleness tracking. |
| **Overwriting existing data** | Low | High — user data loss | Auto-apply ONLY to null fields. Existing data is sacred. Unit test this behavior explicitly. |
| **Conflicting auto-apply + admin edits** | Medium | Low — admin writes last_updated_at, enrichment checks it | Skip enrichment for providers modified by admin in last 24h. Or always respect existing values. |
| **Error in one source blocks others** | Low | Medium | Sources are independent. Run with `Promise.allSettled` per provider. One source failure doesn't stop others. |
| **Docker/headless-browser in GitHub Actions** | Medium | Medium — larger image, longer runs | Lieferando standard scraping doesn't need headless. Uber Eats does. Use `playwright`'s browser download in CI. Cache browser binaries. |
| **No owner check on creation trigger** | Low | High — enrichment runs for owned providers | Webhook condition must check `provider_owner_id IS NULL`. The scheduled job already checks this. |

## 9. Open Questions

1. **Lieferando scraping approach**: Are we OK with standard `fetch` + HTML parsing (like `cheerio`), or should we use headless browser from the start? Recommendation: start with `fetch` + JSON-LD/DOM parsing, escalate to headless only if needed.

2. **Uber Eats feasibility**: The anti-bot protections are significant. Should we build Uber Eats enrichment even if it's unreliable (best-effort), or skip it until we have a proxy/CAPTCHA infrastructure? **Recommendation**: Build but mark as `experimental` — never blocking, always best-effort with explicit error logging.

3. **Menu enrichment scope**: Should we write menu items to `food_menu`? The Wolt client's `fetchMenuData()` already returns rich data. Adding menu enrichment adds significant value but also complexity (price formatting, currency conversion, category normalization).

4. **Rate limiting**: What's the acceptable total runtime? For ~400 food providers across 3 sources = 1200 page fetches. At 500ms delay = 10 minutes. With headless browser (Uber Eats) = slower. 60-minute workflow timeout seems sufficient but tight for Uber Eats at scale.

5. **Provider matching for Lieferando/Uber Eats**: Can we reuse `provider-matcher.ts` (Levenshtein + city) for these platforms? The matcher is Wolt-generic in implementation (works on `WoltVenue[]` type). We'd need to create a generic `Venue` interface that all platforms share, or create separate matcher functions.

6. **Parallel vs sequential**: Should per-provider processing be parallel? Currently sequential with circuit breaker. Parallel across providers would be faster but harder to rate-limit and debug.

7. **Storage of source raw data**: Do we want to store raw HTML/API responses for debugging? Currently no. A `enrichment_raw_responses` table with TTL would help debug scraping failures.

8. **CLI vs Edge Function for on-creation trigger**: The Supabase webhook can call an Edge Function or a Next.js API route. Edge Functions have a 10-minute timeout (better for enrichment). But the CLI has more infrastructure (rate limiting, circuit breaker). **Recommendation**: Have the webhook insert into a `pending_enrichments` queue table, and let the scheduled CLI pick it up. This keeps enrichment logic in one place (the CLI).
