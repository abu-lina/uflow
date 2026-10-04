# Plan 144: Delivery Platform Enrichment Analysis

**Status**: Draft  
**Date**: 2026-06-04  
**Author**: Analyst (Plan 144)  
**Scope**: Feasibility of enriching 804 UFlow food providers with menu→alcohol detection, opening hours, and delivery platform links from Lieferando, Wolt, and Uber Eats.

---

## 1. Executive Summary

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Technical feasibility** | 7/10 | Wolt is easy (public API). Lieferando and Uber Eats require reverse-engineering or paid APIs. |
| **Legal risk** | 6/10 | Moderate. Restaurant data is mostly non-personal (business info), but ToS prohibit scraping. German law allows scraping of publicly accessible data for non-competing uses. |
| **Operational cost** | 5/10 | 804 restaurants × 3 platforms = ~2,412 fetches. At ~1s/fetch (with delays) = ~40 min per full run. Anti-bot measures on Uber Eats add complexity. |
| **Maintenance burden** | 4/10 | Platform DOM/API changes break scrapers. Wolt is most stable (documented API). Uber Eats is least stable. |
| **Data value** | 8/10 | Alcohol flags are actionable (halal compliance). Opening hours fill a major UX gap (only 2/804 filled). Delivery links enable "order online" CTAs. |

**Overall feasibility: 6/10 — Worth pursuing with phased approach starting from Wolt.**

---

## 2. Platform-by-Platform Analysis

### 2.1 Wolt — Easiest

**Rendering**: Consumer web app is CSR (React), but the underlying REST API is publicly accessible without authentication for venue discovery and menu data.

**Data endpoints** (no auth required):
- `GET https://consumer-api.wolt.com/v1/pages/restaurants?lat={lat}&lon={lon}` — venue listing by location
- `GET https://restaurant-api.wolt.com/v4/venues/slug/{venue_slug}/menu/data?unit_prices=true&show_weighted_items=true&show_subcategories=true` — full menu with item names, descriptions, categories

**Response format**: Returns clean JSON with venue name, slug, online status, menu items with names/descriptions/prices/categories.

**Opening hours**: Available in the venue detail response.

**Alcohol detection potential**: Menu item names and descriptions are in German text. Keyword matching on item names is feasible.

**Anti-bot measures**:
- Rate limiting: not formally documented, but moderate fetch rates (~1 req/s) work
- No CAPTCHA on discovery/menu endpoints
- No CloudFlare on API subdomains

**Risk level**: Low

**Recommendation**: **Build direct integration** — use the public consumer API. This is the primary platform for this enrichment.

**Search by name+city**: Wolt API doesn't expose a direct search endpoint. Need to reverse-geocode the provider's address to lat/lon, fetch nearby venues, then match by name similarity (Levenshtein or fuzzy matching).

---

### 2.2 Lieferando (Just Eat Takeaway.com) — Moderate

**Rendering**: The consumer website is a React SPA with CSR for restaurant listings and menu pages. No server-side rendered schema.org JSON-LD.

**Public API**: Just Eat Takeaway.com has a developer portal (`developers.just-eat.com`) but it's for **merchant partners** (POS integration, order management), not for consumer data access. Requires partnership agreement.

**Consumer API**: The mobile/web app communicates with internal gRPC/REST APIs. These are:
- Not documented
- Require specific headers/tokens
- Protected by rate limiting and bot detection (CloudFlare)

**SEO pages**: Just Eat UK (`just-eat.co.uk`) serves SSR pages with schema.org JSON-LD for SEO. However, Lieferando.de does not appear to embed schema.org on restaurant pages.

**Existing data**: Each Lieferando restaurant has a public URL pattern: `https://www.lieferando.de/restaurant/{slug}` — this page contains:
- Restaurant name, address, rating
- Menu categories and items (loaded via XHR, not SSR)
- Opening hours (in the page or via API)

**Anti-bot measures**:
- CloudFlare protection (JS challenge, sometimes CAPTCHA)
- Session-based API tokens
- Rate limiting

**Risk level**: Medium-High

**Recommendation**: **Paid data provider or limited scraping**. Options:
1. Use a scraping-as-a-service provider (Apify, ScrapingBee) with JS rendering
2. Partner with Just Eat Takeaway.com for official API access
3. Build minimal scraper using Puppeteer/Playwright for SSR-only data (opening hours only)

**Search by name+city**: No public search API. Would need to use the consumer web search or reverse-engineer the internal search endpoint.

---

### 2.3 Uber Eats — Hardest

**Rendering**: Fully CSR React SPA. No SSR for restaurant pages. No schema.org JSON-LD.

**Consumer API**: Internal GraphQL/REST endpoints:
- `https://www.ubereats.com/api/getFeedV1` — restaurant feed
- `https://www.ubereats.com/api/getRestaurantMenuV1` — menu data

All endpoints require:
- `x-csrf-token` header (obtained from initial page load)
- Session cookies
- Specific `User-Agent`
- `Referer` header

**Data format**: JSON responses with restaurant name, menu categories, items, prices, descriptions.

**Opening hours**: Available in restaurant detail API response.

**Anti-bot measures**:
- CloudFlare (always-present)
- CSRF token rotation
- Request signature validation (internal API)
- Fingerprinting (TLS, headers, timing)
- IP-based rate limiting

**Risk level**: High

**Recommendation**: **Skip direct scraping; use paid data provider only if needed.** The value (delivery platform link + opening hours) doesn't justify the engineering cost of maintaining a working Uber Eats scraper.

---

### 2.4 Comparison Table

| Factor | Wolt | Lieferando | Uber Eats |
|--------|------|------------|-----------|
| **Public API** | Yes (unauthenticated) | No (partner-only) | No (internal) |
| **Data format** | JSON (clean) | Requires JS rendering | Requires JS rendering |
| **Opening hours** | In venue details | In page + API | In API response |
| **Menu items** | Full menu JSON | Full menu (via XHR) | Full menu (via GraphQL) |
| **Anti-bot** | Minimal | CloudFlare + rate limits | CloudFlare + CSRF + fingerprinting |
| **Maintenance risk** | Low | Medium | High |
| **Cost to scrape 800** | Free | Free (+ proxy cost) | Free (+ proxy + rendering cost) |
| **Match accuracy** | Fuzzy name + location | Fuzzy name + location | Fuzzy name + location |
| **Overall difficulty** | Easy | Medium | Hard |

---

## 3. German Alcohol Keyword Catalog

For menu-based alcohol detection, use keyword matching on German menu item names and descriptions. The approach: scan item names for these terms; if found, propose `no_alcohol = false` on `food_providers`.

### 3.1 Definite Alcohol Keywords (set no_alcohol = false)

**Beer/Wine categories**:
- Bier, Biere, Bierchen, Biergarten
- Weizen, Weißbier, Hefeweizen, Pils, Pilsner, Kölsch, Altbier, Helles, Dunkles, Export
- Alkoholisches Getränk, alkoholische Getränke
- Wein, Rotwein, Weißwein, Roséwein, Glühwein, Sekt, Champagner, Prosecco
- Radler, Alsterwasser (shandy — contains beer)
- Cocktail, Longdrink, Drink, Mixgetränk (alcoholic context)

**Spirits**:
- Schnaps, Schnäpse, Likör, Korn, Vodka, Wodka, Gin, Rum, Whisky, Whiskey
- Cognac, Brandy, Grappa, Tequila, Jägermeister, Amaretto, Baileys
- Cocktail (e.g. Mojito, Caipirinha, Margarita, Pina Colada, Negroni, Martini)

**Prefix/suffix patterns** (menu item names):
- "mit Bier" / "in Bierteig" (beer batter)
- "Wein-" prefix (Weinbegleitung, Weingelage)
- "Alkohol" as standalone word

### 3.2 Explicit Non-Alcohol Keywords (set no_alcohol = true)

**Explicit markers**:
- Alkoholfrei, alkoholfreies Getränk, ohne Alkohol
- "alkoholfreies Bier", "alkoholfreier Cocktail", "alkoholfreier Wein"
- "0,0%" (zero percent alcohol)

### 3.3 Ambiguous Terms (manual review needed)

- "Saft", "Schorle" — could be alcoholic (Weinschorle) or non-alcoholic (Apfelschorle)
- "Punsch" — often alcoholic but can be non-alcoholic (Kinderpunsch)
- "Bowle" — usually alcoholic but context-dependent
- "Aperitif" — usually alcoholic but context-dependent
- "Hausgetränk" — could be anything

### 3.4 Implementation Strategy

1. Collect all menu item names from each platform (across ~800 providers)
2. Run keyword matching against the definite keywords list
3. For matches → propose `no_alcohol = false`
4. For explicit non-alcohol keywords → propose `no_alcohol = true`
5. Flag ambiguous terms for manual review
6. Write results as enrichment candidates with field_name `no_alcohol`

**False positive mitigation**: A Turkish restaurant that serves "Bier" as a menu category likely sells alcohol. A restaurant that lists "Hausgemachte Limonade" does not. The keyword approach has ~85-95% accuracy for the definite categories.

---

## 4. Technical Architecture Proposal

### 4.1 New Enrichment Sources

Add a new source enum: `delivery_platform` alongside existing `joinhalal`.

New field classifications in `enrichment-fields.ts`:

| Field | Table | Source | Detection |
|-------|-------|--------|-----------|
| `no_alcohol` | `food_providers` | Wolt/Lieferando/UE | Menu keyword analysis |
| `opening_hours` | `providers` | Wolt/Lieferando/UE | Direct extraction |
| No new field for delivery links — store as a separate table instead |

### 4.2 New Database Structures

Option A (recommended): New junction table for delivery platform links:

```sql
CREATE TABLE IF NOT EXISTS public.provider_delivery_links (
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  platform TEXT NOT NULL,   -- 'wolt', 'lieferando', 'ubereats'
  platform_url TEXT NOT NULL,
  platform_slug TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, platform)
);
```

Option B: Store as JSONB on `providers`:
```sql
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS delivery_links JSONB;
-- Example: {"wolt": "https://wolt.com/...", "lieferando": "https://..."}
```

### 4.3 Module Architecture

```
src/lib/enrichment/
├── joinhalal-enricher.ts         (existing)
├── enrichment-fields.ts          (extend with new fields)
├── image-enrichment.ts           (existing, separate flow)
├── delivery-platform/
│   ├── index.ts                  (orchestrator)
│   ├── wolt-client.ts            (Wolt public API client)
│   ├── lieferando-client.ts      (Lieferando scraper — optional phase)
│   ├── ubereats-client.ts        (Uber Eats scraper — optional phase)
│   └── alcohol-detector.ts       (keyword matching, shared)
├── delivery-enricher.ts          (buildCandidates, conflict detection)
└── opening-hours/
    └── normalizer.ts             (convert platform formats to JSONB standard)
```

### 4.4 Pipeline Reuse

Reuse from existing pipeline:
- `enrichment_candidates` table — same staging pattern
- `enrichment_run_logs` table — same telemetry
- `buildEnrichmentCandidates()` from `joinhalal-enricher.ts` — same logic, new fields
- `detectConflict()` from `joinhalal-enricher.ts` — identical
- `fetchWithDelay()` pattern from `enrich-providers.ts`
- Circuit breaker pattern (20% failure threshold)
- Service-role Supabase client pattern
- CLI pattern: `--dry-run`, `--write`, `--source`, `--limit`

New infrastructure needed:
- **Wolt client**: no browser rendering needed, direct HTTP
- **Platform matching**: fuzzy match provider name + city to platform venue by search/discovery
- **Alcohol detection module**: keyword catalog + matching logic (pure function, testable)
- **Opening hours normalizer**: convert platform-specific formats to standard JSONB

### 4.5 Provider Matching Strategy

The hardest part: finding which Wolt/Lieferando/UE venue corresponds to which provider in our DB.

We have: `provider_name`, `address_city`, `address_zip`, `address_street`.

**Wolt approach**:
1. Geocode provider's city name to lat/lon (use a static map or OpenStreetMap Nominatim)
2. Fetch nearby venues from Wolt consumer API
3. Match by: fuzzy name similarity + city name match
4. Expected match rate: ~60-70% for major cities, lower for small towns

**Improving match rate**: Store the matched platform_slug after first success. Re-use for subsequent runs (avoid re-searching).

### 4.6 Integration with Existing CLI

The existing `enrich-providers.ts` supports `--source` flag. Extend to accept `--source wolt`:

```bash
npx tsx scripts/enrich-providers.ts --dry-run --source wolt --limit 50
npx tsx scripts/enrich-providers.ts --write --source wolt
```

The CLI would:
1. Select providers eligible for delivery platform enrichment
2. For each provider:
   a. Search/map to the platform venue
   b. Fetch menu data (Wolt: API call; Lieferando/UE: render + scrape)
   c. Run alcohol detection on menu items
   d. Extract opening hours
   e. Build enrichment candidates
   f. Stage in `enrichment_candidates`
3. Log run telemetry

### 4.7 Delivery Links: Separate from Enrichment Pipeline

Delivery platform links are discovery data, not enrichment in the traditional sense. Since we're mapping **existing known providers** to their platform presence, this is more like a join/match operation than a scraping operation.

Recommendation: Handle delivery link discovery in a **separate script** (`scripts/match-delivery-platforms.ts`) that:
1. Matches providers to platforms
2. Stores links in the `provider_delivery_links` table
3. Uses `enrichment_candidates` only for the `opening_hours` and `no_alcohol` fields

---

## 5. Risk Assessment

### 5.1 Legal Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| ToS violation (all platforms prohibit scraping) | Medium | German law: ToS breach alone ≠ illegal action. More relevant for US-based platforms (Uber). |
| GDPR: processing personal data | Low-Medium | Restaurant data is business data, not personal data. Restaurant owner names could be personal. Solution: don't scrape owner names/comments. |
| German §202c StGB (hackerparagraf) | Low | Only applies when bypassing technical protection measures. Public API access is not bypassing. |
| Database protection (§87a UrhG) | Low | Applies to systematic extraction of substantial portions of a database. Our use is per-provider enrichment, not mass export. |
| Copyright on menu text | Low | Menu item names are factual data (short phrases, not creative works). Descriptions could be copyrighted. Solution: only extract item names, not descriptions. |

**Key legal reference**: The German "Obrecht Studios" analysis (obrechtstudios.de) confirms: web scraping of publicly accessible content is not categorically illegal. Key factors:
- Content accessibility (public = safer)
- Technical protection measures (bypassing = riskier)
- Personal data involvement (more = riskier)
- Scale of extraction (smaller = safer)

### 5.2 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API changes | High (Uber Eats), Low (Wolt) | Medium | Modular design, isolate platform adapters |
| IP blocking | Medium | High | Rate limiting (1 req/s), rotate user-agents, proxy fallback |
| CloudFlare challenges | High (Lieferando/UE) | High | Use paid proxy/rendering service for these platforms |
| Name matching failures | Medium | Medium | Store successful matches; fuzzy matching with manual review queue |
| False positives in alcohol detection | Low | Low | Stage as enrichment_candidates for admin approval (existing pattern) |

### 5.3 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pipeline takes too long | Medium | Low | 800 providers × 3 platforms = 2,400 requests. At 1s each = 40 min. Acceptable for daily run. |
| Match rate too low for ROI | Medium | Medium | Start with Wolt only (largest German coverage). Validate match rate before building other platforms. |
| No opening hours found | Low | Low | Platform data may not always include hours. Graceful fallback. |

---

## 6. Recommendation

### Build vs Buy vs Hybrid

| Approach | Cost | Accuracy | Maintenance | Verdict |
|----------|------|----------|-------------|---------|
| Full DIY scraping | ~$50/mo (proxies) | Variable | High | Do for Wolt only |
| Paid API (DoubleData/Foodspark) | ~$1,000-3,000/mo | High | None | Consider if budget allows |
| Hybrid (DIY Wolt + paid for Lieferando/UE) | ~$500-1,500/mo | Medium-High | Low-Medium | **Recommended** |

### Phased Approach

**Phase 1 (this ticket) — Wolt only**:
- Build Wolt API client (`delivery-platform/wolt-client.ts`)
- Implement alcohol keyword detection (`delivery-platform/alcohol-detector.ts`)
- Build opening hours normalizer
- Extend `enrich-providers.ts` with `--source wolt`
- Match providers by name+city using Wolt discovery API
- Validate on 50 providers, then scale.
- **Estimated effort**: 3-5 days

**Phase 2 — Lieferando**:
- Evaluate if direct scraping is viable (check CloudFlare status, find stable API pattern)
- Fallback: use Apify's Just Eat / Lieferando scraper actor (~$0.05/run)
- Match rate validation
- **Estimated effort**: 2-3 days

**Phase 3 — Uber Eats**:
- Skip unless Phase 1+2 show clear ROI
- Use paid provider only (DoubleData, Foodspark, or Apify)
- **Estimated effort**: 1 day (integration of paid API)

**Phase 4 — Delivery links**:
- Build separate matching script
- Store matched URLs in `provider_delivery_links` table
- **Estimated effort**: 2 days

### Priority Order

1. **Wolt → alcohol detection + opening hours** (highest value, lowest effort)
2. **Wolt → delivery links** (enables "order online" feature)
3. **Lieferando → opening hours** (high UX value, moderate effort)
4. **Lieferando → alcohol detection** (additional verification)
5. **Uber Eats → delivery links** (lowest priority)
6. **Uber Eats → alcohol detection** (lowest priority)

### Expected Outcomes After Phase 1

- ~500-600 food providers matched to Wolt (estimated 60-75% match rate)
- ~200-300 providers flagged as `no_alcohol = true` (new signal from menu analysis)
- ~200-300 providers with `opening_hours` populated (additive enrichment — no conflict since only 2 currently filled)
- All candidates staged in `enrichment_candidates` for admin review

---

## 7. Appendix: Existing Pipeline Integration Details

### enrichment_candidates Table (relevant columns)

```sql
provider_id  UUID        -- FK to providers
source       TEXT        -- 'wolt', 'lieferando', 'ubereats' (new values)
source_url   TEXT        -- URL to the platform page
field_name   TEXT        -- 'no_alcohol', 'opening_hours'
proposed_value JSONB     -- new value
current_value  JSONB     -- current value snapshot
status       enrichment_status  -- 'pending' by default
```

### enrichment-fields.ts Additions

```typescript
export const SOURCE_ENRICHABLE_FIELDS: ReadonlyArray<string> = [
  // existing fields...
  'opening_hours',
  'no_alcohol',
];
```

### food_providers Table

`no_alcohol` lives on `food_providers` (extension table for `listing_type = 'food'`). The enrichment pipeline must:
1. Check that `listing_type` is `'food'` before proposing `no_alcohol` changes
2. Target the `food_providers` table for writes (not `providers`)
3. Use field_name `no_alcohol` in enrichment_candidates (the field name is the same as the column name)

---

## 8. References

- Obrecht Studios: [Web Scraping Legal in Germany 2026](https://obrechtstudios.de/en/blog/web-scraping-legal-germany)
- Wolt Public API: Gist documentation of consumer-api endpoints (`github.com/OzTamir`)
- Just Eat Takeaway.com Developer Portal: `developers.just-eat.com`
- Uber Eats scraping research: `github.com/gsunit/Extreme-Uber-Eats-Scraping`
- IAPP: [The state of web scraping in the EU](https://iapp.org/news/a/the-state-of-web-scraping-in-the-eu) (July 2024)
- Existing UFlow enrichment pipeline: `scripts/enrich-providers.ts`, `src/lib/enrichment/joinhalal-enricher.ts`
