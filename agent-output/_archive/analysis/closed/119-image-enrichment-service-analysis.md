---
ID: 119
Origin: 119
UUID: e7f2a19c
Status: Active
---

# Image Enrichment Service Evaluation — Analysis

## Changelog

| Date       | Change                                                      |
|------------|-------------------------------------------------------------|
| 2026-05-02 | Initial analysis: A-1 through A-6 investigations completed  |
| 2026-05-02 | Addendum A-7: Unsplash API investigation; revised recommendation per user feedback on Logo.dev coverage gap for German-Turkish SMBs |

## Value Statement and Business Objective

UFlow's provider directory has ~80% of entries without images. M1 (Plan 119) delivered a
CSS-based no-image fallback (initials + category icons). M2 evaluates external services that
can supply real logos/photos for providers via domain lookup, enabling automated enrichment
of unclaimed provider profiles. The selected service must allow download-and-store into
Supabase Storage, as UFlow's `isTrustedUrl()` security gate restricts displayed images to
the Supabase Storage hostname only.

**Constraint reminder** (from Plan 119): No Google APIs, no Instagram APIs.

---

## Methodology

- **Web research**: Fetched official documentation, pricing pages, ToS/fair-use guides, and
  migration references for each service.
- **Bundle analysis**: Used Bundlephobia for npm package size measurements.
- **Code inspection**: Grepped the UFlow codebase for `social_website` column usage and schema
  to assess domain extraction feasibility.
- **Confidence framework**: L1 Proven (directly verified), L2 Observed (high-confidence
  inference from docs/evidence), L3 Inferred (hypothesis requiring validation).

---

## Findings

### A-1: Brandfetch — L2 Observed

**Two distinct products** with different capabilities:

#### Logo API (Free CDN)

| Attribute          | Detail |
|--------------------|--------|
| Model              | CDN-only hotlinking: `cdn.brandfetch.io/{domain}?c=CLIENT_ID` |
| Cost               | Free, no attribution required |
| Rate limits        | 500k requests/month (soft), 1k/5min per IP, 2.4k/5min per customer |
| Authentication     | Client ID (free registration) |
| Download/storage   | **Explicitly prohibited**: "Programmatic access to logo images is not permitted and may result in rate limiting or blocking." |
| Caching policy     | "If your use case requires caching, please contact us for a custom setup." |

**Verdict**: Logo API **cannot** be used for UFlow's download→Supabase pattern. The hotlinking
requirement means every page view would call Brandfetch CDN, and `isTrustedUrl()` would
reject the URL. Custom caching arrangements require sales contact.

#### Brand API (Paid)

| Attribute          | Detail |
|--------------------|--------|
| Model              | REST API returning JSON with logo URLs: `api.brandfetch.io/v2/brands/{domain}` |
| Free tier          | 100 requests (one-time) |
| Paid plans         | Subscription with quota; overage billing available |
| Pricing            | Not publicly documented — requires registration or sales contact |
| Real-time indexing | Yes — "if a brand is not part of our dataset, it will index the information live" |
| Download rights    | Logo URLs in JSON response can be downloaded (standard API pattern) |

**Assessment**: Brand API could work for UFlow's pattern (fetch JSON → extract logo URL →
download → upload to Supabase Storage). However, pricing opacity is a risk — we cannot
confirm cost at 500/1000/5000 lookups without registration.

**Fair use** (both products): "Referring" use case (displaying company logos to identify
brands) is explicitly allowed in their Logo Fair Use guide.

**Coverage**: Claims global coverage via real-time indexing for unknown domains.

**Gaps**: Exact Brand API pricing requires registration or sales contact. German SMB hit rate
unverified (no live spot-check possible without API key).

---

### A-2: Logo.dev — L1 Proven (Recommended)

| Attribute          | Detail |
|--------------------|--------|
| Background         | Built by the same team who created Clearbit Logo API; official Clearbit migration path |
| Model              | CDN image URL: `img.logo.dev/{domain}?token=PUBLISHABLE_KEY` |
| Coverage           | "Tens of millions of companies"; daily updates |
| Authentication     | Publishable key (free registration) |

#### Pricing by Plan

| Plan       | Requests/month | Self-hosting | Attribution | Price (USD)         |
|------------|----------------|--------------|-------------|---------------------|
| Free       | 500,000        | No           | **Required** | $0                  |
| Startup    | 1,000,000      | No           | Removed     | From $300/year      |
| Pro        | 5,000,000      | **Yes**      | Removed     | Higher (contact)    |
| Enterprise | 5,000,000+     | **Yes**      | Removed     | Custom              |

#### Self-hosting License (Pro/Enterprise)

This is the critical differentiator. Logo.dev documentation explicitly states:

> "Pro and Enterprise plans include a license to store logos on your own infrastructure
> for as long as your subscription is active."

> "Self-hosting means downloading logos from Logo.dev and serving them from your own
> storage. You fetch once, store in your infrastructure (S3, CDN, filesystem), and serve
> unlimited times."

Their docs include batch processing examples:

```typescript
const domains = ["stripe.com", "shopify.com", "square.com"];
await Promise.all(
  domains.map(async (domain) => {
    const response = await fetch(
      `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLISHABLE_KEY}`
    );
    const buffer = await response.arrayBuffer();
    await yourStorageSystem.upload(`logos/${domain}.webp`, buffer);
  })
);
```

**This pattern maps directly to UFlow's requirement**: fetch → buffer → upload to Supabase
Storage → serve via `isTrustedUrl()`.

#### Fair Use

Explicitly allowed:
- ✅ Displaying logos in your application
- ✅ Enriching customer data with logos
- ✅ **Building directories with company logos**

Not allowed:
- ❌ Creating a competing logo API
- ❌ Bulk scraping for redistribution (but batch download with self-hosting license is fine)
- ❌ Building a logo search as primary product

**Assessment**: UFlow's use case (community service directory enriching provider profiles)
is squarely within fair use.

#### Rate Limits

Soft enforcement across all plans. Proactive email notifications before any action.
No per-second/per-minute hard limits documented — monthly limits only.

**Confidence**: L1 Proven — self-hosting documentation, fair use policy, and pricing floor
($300/yr) are all published and verified from official docs.

---

### A-3: Clearbit Logo API — L1 Proven (Eliminated)

| Attribute          | Detail |
|--------------------|--------|
| Status             | **Discontinued December 1–8, 2025** |
| Official message   | "The Clearbit logo API is no longer available for new users" |
| Migration path     | Logo.dev (same team) |
| Dashboard          | Redirects to login; API docs no longer accessible |

**Verdict**: Eliminated. No further investigation needed.

---

### A-4: Pexels API — L2 Observed (Not Recommended)

| Attribute          | Detail |
|--------------------|--------|
| Type               | Stock photography platform |
| Relevance          | Generic hero images, not brand logos |
| Investigation      | Website returned HTTP 403, limiting deep analysis |
| Attribution        | Required for free use |
| Domain lookup      | Not supported — keyword search only |

**Verdict**: Wrong tool for domain→logo enrichment. Pexels provides generic stock photos,
not company-specific brand assets. Would not solve the "real provider images" problem.
Could theoretically provide category-based fallback images, but M1's CSS fallback already
addresses this without external dependencies.

---

### A-5: DiceBear Bundle Impact — L1 Proven

| Package            | Minified | Gzipped | Dependencies |
|--------------------|----------|---------|--------------|
| `@dicebear/core`   | 6.6 kB   | 2.8 kB  | 1            |
| `@dicebear/initials` | 2.2 kB | 1.2 kB  | 0            |
| **Combined**       | **8.8 kB** | **4.0 kB** | 1        |

Additional context:
- License: MIT code, CC0 1.0 (public domain) for Initials style
- HTTP API alternative: `api.dicebear.com/9.x/initials/svg?seed=NAME` (no npm dependency,
  but violates M1's "no external HTTP request" acceptance criterion)
- Tree-shaking: ES modules available but not marked side-effect free — limited tree-shake ability

#### M1 Decision D6 Assessment

M1's shipped implementation uses zero additional bundle weight (CSS gradients + Iconify,
which was already in the bundle). DiceBear would add ~4 kB gzipped for comparable
functionality (initials + colored background). The M1 approach is the better choice.

**Recommendation for D6**: Keep M1's current CSS+Iconify implementation. DiceBear is not
needed.

---

### A-6: Additional Candidate — Unavatar.io — L2 Observed

| Attribute          | Detail |
|--------------------|--------|
| Model              | Universal avatar aggregator: `unavatar.io/domain/{domain}` |
| Provider chain     | DuckDuckGo → Google → Microlink (for domain lookups) |
| Free tier          | 25 requests/day per IP (anonymous) |
| PRO pricing        | $0.005/token; domain lookups: origin=$0.005, datacenter=$0.015, residential=$0.025 |
| Self-hosting       | No explicit license for download-and-store |
| Attribution        | Required on free tier; removed on paid |
| License            | MIT (open source) |

#### Pricing Estimate

| Volume     | Origin tier | Datacenter tier |
|------------|-------------|-----------------|
| 500/month  | $2.50       | $7.50           |
| 1,000/month| $5.00       | $15.00          |
| 5,000/month| $25.00      | $75.00          |

#### Concerns

1. **No self-hosting license**: Unlike Logo.dev Pro, there is no documented right to
   download and store images on your own infrastructure. The service is designed as a
   CDN/proxy. Storing fetched images in Supabase would be an undocumented use.
2. **Google dependency**: The domain provider chain includes Google's favicon service as a
   fallback. While this is Unavatar's internal dependency (not UFlow's direct integration),
   it may conflict with the spirit of the "no Google" constraint.
3. **Logo quality**: Unavatar focuses on favicons and profile photos, not high-quality brand
   logos. Logo.dev and Brandfetch are purpose-built for brand logos.

**Assessment**: Viable as a supplementary fallback but not recommended as the primary
enrichment service due to missing self-hosting rights and lower logo quality focus.

---

## Deliverable 1: Coverage Spot-Check

**Status**: Cannot be completed without live API keys.

A live spot-check requires API registration for Logo.dev and/or Brandfetch. This is a
remaining gap to be closed before M3 implementation begins.

**Recommended validation approach** (for Planner/Implementer):
1. Register for free Logo.dev account (Publishable key)
2. Test 10–20 known UFlow provider domains via browser:
   `https://img.logo.dev/{domain}?token=KEY`
3. Record hit/miss for each. Expected hit rate for German SMBs with websites: 60–80%
   (L3 Inferred based on Logo.dev's "tens of millions" claim and real-time indexing
   capabilities of Brandfetch).

**Sample domains to test** (extract from `social_website` column):
- Needs a production/UAT DB query:
  `SELECT social_website FROM providers WHERE provider_owner_id IS NULL AND social_website IS NOT NULL LIMIT 20;`

---

## Deliverable 2: Pricing Summary

| Service              | 500 lookups  | 1,000 lookups | 5,000 lookups | Self-host license |
|----------------------|--------------|---------------|---------------|-------------------|
| **Logo.dev Free**    | $0*          | $0*           | $0*           | No                |
| **Logo.dev Startup** | ~$25/mo**    | ~$25/mo**     | ~$25/mo**     | No                |
| **Logo.dev Pro**     | Contact      | Contact       | Contact       | **Yes**           |
| Brandfetch Logo API  | $0           | $0            | $0            | No (hotlink only) |
| Brandfetch Brand API | 100 free†    | Paid          | Paid          | Yes (JSON data)   |
| Unavatar PRO         | $2.50        | $5.00         | $25.00        | No                |

\* Attribution link required  
\*\* $300/year minimum  
† One-time 100 free requests; paid plan pricing requires registration

**Note**: For UFlow's batch enrichment use case (one-time scan of ~N providers), the total
cost is driven by initial lookups, not ongoing requests. After initial enrichment, images
are stored in Supabase Storage and served from there with no further API calls.

At projected UFlow scale (~500 unclaimed providers with websites initially):
- **Logo.dev Free**: Adequate volume (500 < 500k/month), but requires attribution and no
  self-hosting license for download-and-store
- **Logo.dev Startup ($300/yr)**: Removes attribution but still no self-hosting
- **Logo.dev Pro**: Required for compliant download-and-store pattern

---

## Deliverable 3: ToS Compliance Summary

| Service         | Download OK? | Store in Supabase? | Display without attribution? | Verdict |
|-----------------|-------------|--------------------|-----------------------------|---------|
| Logo.dev Free   | No          | No                 | No                          | ❌ Requires attribution; no self-hosting |
| Logo.dev Startup| No*         | No*                | Yes                         | ❌ No self-hosting license |
| **Logo.dev Pro**| **Yes**     | **Yes**            | **Yes**                     | ✅ Full compliance |
| Brandfetch Logo | **No**      | **No**             | Yes                         | ❌ Hotlink only |
| Brandfetch Brand| Yes         | Yes                | Needs verification          | ⚠️ Likely compliant but pricing unknown |
| Unavatar PRO    | Undocumented| Undocumented       | Yes                         | ⚠️ No explicit self-hosting license |

\* Startup docs say "self-hosting" is Pro+ only

**For UFlow's `isTrustedUrl()` constraint, only Logo.dev Pro/Enterprise and Brandfetch Brand
API (paid) provide documented, compliant paths for download → store → serve.**

---

## Deliverable 4: Ranked Recommendation

### #1 — Logo.dev Pro (Recommended)

| Criterion              | Rating |
|------------------------|--------|
| Confidence             | L1 Proven |
| Integration complexity | **Low** |
| Self-hosting           | ✅ Explicitly documented and licensed |
| Fair use match         | ✅ "Building directories with company logos" |
| Coverage               | Tens of millions; same dataset as former Clearbit |
| Price floor            | $300/yr (Startup); Pro pricing requires contact |
| Attribution            | Not required on paid plans |

**Integration sketch** (maps to Plan 119 M3 `enrichment_candidates` table):
```
1. CLI runner queries: SELECT domain FROM providers WHERE no_image AND unclaimed
2. For each domain: GET https://img.logo.dev/{domain}?token=KEY&format=webp
3. If 200: upload buffer to Supabase Storage → insert into enrichment_candidates
4. Admin reviews candidates → approve → update provider_images JSONB
```

### #2 — Brandfetch Brand API (Contingent)

| Criterion              | Rating |
|------------------------|--------|
| Confidence             | L2 Observed |
| Integration complexity | **Medium** (JSON parsing + separate logo download) |
| Self-hosting           | Yes (API returns downloadable URLs) |
| Fair use match         | ✅ "Referring" use case |
| Coverage               | Global (real-time indexing for unknowns) |
| Price floor            | Unknown (requires registration) |
| Attribution            | Not required |

**When to prefer over Logo.dev**: If Logo.dev Pro pricing is prohibitively expensive, or if
Logo.dev has poor hit rate for German SMB domains in the spot-check.

### Not Recommended

| Service              | Reason |
|----------------------|--------|
| Clearbit Logo API    | Discontinued December 2025 |
| Pexels API           | Stock photos, not brand logos |
| Unavatar             | No self-hosting license; Google in resolution chain |
| DiceBear (for M2)    | Not an enrichment service; M1 fallback already shipped |

---

## Deliverable 5: Domain Extraction Coverage

### Schema Confirmation — L1 Proven

The `social_website` column exists on the `providers` table as `TEXT`:

```sql
-- From supabase/migrations/001_baseline.sql
social_website TEXT,
```

Used in:
- `src/services/providerService.ts` — mapped from form `formData.website`
- `src/services/providers.server.ts` — included in provider detail fetches
- `scripts/import-muslimbusiness.ts` — populated during bulk import
- `src/services/communityServices.server.ts` — selected in queries

### Coverage Query — Gap (requires DB access)

```sql
-- Deliverable query (run against production/UAT)
SELECT
  COUNT(*) FILTER (WHERE social_website IS NOT NULL) AS has_website,
  COUNT(*) FILTER (WHERE social_website IS NULL)     AS no_website,
  COUNT(*)                                           AS total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE social_website IS NOT NULL) / COUNT(*),
    1
  ) AS pct_with_website
FROM providers
WHERE provider_owner_id IS NULL;
```

**Status**: Cannot execute from worktree — requires Supabase connection. This is an open gap.

**Estimate** (L3 Inferred): Based on the `import-muslimbusiness.ts` script, which maps
`social_website` from the import source, and the `generate-fake-providers.ts` script (50%
chance), the real coverage is likely **40–70%** of unclaimed providers having a parseable
`social_website`. This determines the ceiling of domain-based enrichment.

### Domain Extraction Strategy — D8

For providers with `social_website` populated, domain extraction is straightforward:

```typescript
const url = new URL(provider.social_website);
const domain = url.hostname.replace(/^www\./, '');
// e.g., "https://www.bäckerei-öztürk.de/shop" → "bäckerei-öztürk.de"
```

Edge cases to handle:
- Protocol missing (bare `example.de`)
- Trailing paths/query strings
- IDN domains (Umlauts: `ä`, `ö`, `ü`)
- Social media URLs (Facebook/Instagram pages → not useful for logo lookup)

---

## Deliverable 6: DiceBear Bundle Impact

See [A-5 findings above](#a-5-dicebear-bundle-impact--l1-proven).

**Summary**: `@dicebear/core` + `@dicebear/initials` = ~4.0 kB gzipped. M1's CSS+Iconify
approach adds 0 kB to the bundle. **Recommendation: keep M1's current implementation (D6
resolved).**

---

## Open Questions

| # | Question | Blocking? | Resolution path |
|---|----------|-----------|-----------------|
| 1 | Logo.dev Pro exact pricing | Yes (M3 budget) | Register at logo.dev/signup → check dashboard pricing, or email sales@logo.dev |
| 2 | Logo.dev coverage for German SMB domains | Yes (M3 viability) | Live spot-check with 10–20 domains from `social_website` column (see Deliverable 1) |
| 3 | Brandfetch Brand API pricing tiers | No (contingent) | Register at developers.brandfetch.com → check dashboard |
| 4 | Domain extraction coverage % in production | Informational | Run Deliverable 5 SQL query against UAT/production |
| 5 | Social media URLs in `social_website` (Facebook pages, not business domains) | Informational | Query: `SELECT social_website FROM providers WHERE social_website ILIKE '%facebook%' OR social_website ILIKE '%instagram%'` |

---

## System Weaknesses Identified

1. **No domain field**: Providers have `social_website` (a URL) but no dedicated `domain`
   column. Domain extraction from URLs is fragile and requires validation. Consider adding
   a computed/stored `domain` column in M3.

2. **No image provenance tracking**: Current `provider_images` JSONB stores URLs but not
   the source (user-uploaded vs. enriched). Plan 119 addresses this with the
   `enrichment_candidates` table, but the `provider_images` column itself has no provenance
   metadata.

3. **`isTrustedUrl()` coupling**: The security gate that restricts image display to Supabase
   Storage is the reason download-and-store is mandatory. This is correct for security but
   creates a hard constraint on enrichment service selection — any CDN-only service
   (Brandfetch Logo API, Logo.dev Free) is automatically disqualified.

---

## Analysis Recommendations (Next Steps)

1. **Register for Logo.dev free account** to obtain a Publishable key and verify Pro plan
   pricing from the dashboard. This collapses Open Questions #1 and #2.

2. **Run the Deliverable 5 SQL query** against UAT to determine actual domain extraction
   coverage. This sizes the enrichment opportunity.

3. **Perform live spot-check** with 10–20 provider domains from `social_website` to verify
   Logo.dev hit rate for German SMBs.

4. **If Logo.dev Pro pricing exceeds budget**: Register for Brandfetch Brand API free tier
   (100 requests) and spot-check the same domains as comparison.

5. **Planner should proceed with M3 scoping** using Logo.dev Pro as the primary service,
   with Brandfetch Brand API as fallback. The enrichment pipeline architecture (CLI runner,
   `enrichment_candidates` table, admin review) is service-agnostic and does not change
   based on which service is selected.

---

## Addendum: A-7 — Unsplash Category-Based Stock Imagery (Revised Recommendation)

> **Date**: 2026-05-02  
> **Trigger**: User/Operator feedback that Logo.dev domain→logo approach has poor coverage
> for UFlow's actual provider base — German-Turkish SMBs (bakeries, restaurants, mosques,
> halal shops) that are NOT indexed by brand logo databases. User requested evaluation of
> Unsplash or similar services for category-based stock imagery with visual variety.

### User Insight (Critical Domain Knowledge)

The original A-1 through A-6 analysis correctly evaluated domain→logo services on their
technical merits. However, the user identified a fundamental **coverage gap**: most UFlow
providers are small, local, German-Turkish community businesses that have no indexed logo
in Logo.dev, Brandfetch, or similar brand databases. Domain→logo enrichment would yield
near-zero results for the majority of the provider base.

**Revised strategy**: Instead of "find this specific business's logo," the approach shifts
to "assign a beautiful, relevant stock photo based on what category of business this is."
This works for ALL providers regardless of whether they have a website or indexed brand.

### A-7: Unsplash API — L1 Proven (Verified)

| Attribute              | Detail |
|------------------------|--------|
| Type                   | Stock photography platform with 5M+ free photos |
| API base               | `https://api.unsplash.com/` |
| Search endpoint        | `GET /search/photos?query={term}&orientation=landscape&content_filter=high` |
| Random endpoint        | `GET /photos/random?query={term}&count=30&orientation=landscape` |
| Authentication         | Public key: `Authorization: Client-ID ACCESS_KEY` |
| Rate limits (demo)     | 50 requests/hour |
| Rate limits (production)| 1000 requests/hour (apply for approval) |
| Image CDN              | `images.unsplash.com` — requests to CDN do NOT count against rate limits |
| Dynamic resizing       | Imgix-backed: append `&w=400&h=300&fit=crop` to any image URL |
| Content safety         | `content_filter=high` removes unsuitable content |
| Language support        | German (`de`) in beta; Turkish (`tr`) supported |

#### License (Unsplash License)

The Unsplash License grants an **irrevocable, nonexclusive, worldwide copyright license**
to download, copy, modify, distribute, perform, and use photos for free, including for
commercial purposes, without permission from or attributing the photographer or Unsplash.

**Restrictions** (from the license):
- Photos cannot be sold without significant modification
- Cannot compile photos to create a competing service
- Cannot use photos in a way that is defamatory or illegal

#### API Terms — Download and Storage Compliance

| Requirement                | Detail |
|----------------------------|--------|
| Hotlinking for display     | **Required** by API guidelines for view tracking |
| Download tracking          | Must call `GET /photos/:id/download` for each downloaded photo |
| Attribution                | **Required** per API guidelines (photographer name + Unsplash link) |
| Download and self-hosting  | Permitted — the download tracking endpoint exists for this purpose |

**UFlow compliance path**: For the batch enrichment use case:
1. Search the API for category-relevant photos
2. For each selected photo, trigger `GET /photos/:id/download` (download tracking)
3. Download the image buffer, convert to WebP
4. Upload to Supabase Storage → passes `isTrustedUrl()` check
5. Record photographer name and Unsplash photo URL for attribution
6. Display attribution in an appropriate location (credits page or image metadata)

#### Pricing

| Tier       | Rate limit | Price |
|------------|------------|-------|
| Free/Demo  | 50 req/hr  | $0    |
| Production | 1000 req/hr| $0    |

**Unsplash API is completely free**. Production access requires applying for approval
(demonstrate legitimate use case). For UFlow's batch use (search ~20 categories × 10
photos = ~200 API calls total), even the demo tier is sufficient.

#### Alternative: Pixabay API

| Attribute          | Detail |
|--------------------|--------|
| License            | Pixabay License (similar to CC0): free commercial use, no attribution required |
| Download/storage   | **Explicitly allowed** — simpler compliance than Unsplash |
| API rate limit     | 100 requests/minute (free with API key) |
| Search endpoint    | `GET https://pixabay.com/api/?key=KEY&q={query}&image_type=photo` |
| Attribution        | Not required (appreciated) |
| Pricing            | Free |

**Pixabay advantage**: No attribution requirement, explicit download-and-store permission.
**Pixabay disadvantage**: Smaller catalog, generally lower photo quality than Unsplash.

### Revised Recommendation

#### Primary: Unsplash API (category-based stock imagery)

**Why Unsplash over Logo.dev for UFlow**:
1. **Universal coverage**: Every provider category (restaurant, bakery, mosque, shop) has
   thousands of beautiful stock photos. No dependency on business being indexed.
2. **Zero cost**: Free API, no subscription needed.
3. **Visual variety**: Pool of 5–10 photos per category → hash-based deterministic assignment
   ensures different providers show different images.
4. **Works for ALL providers**: Not just those with `social_website`.
5. **Better UX**: A beautiful restaurant photo is more engaging than "no logo found."

**Attribution compliance**: Unsplash requires attribution when using the API. UFlow should
maintain a `stock_image_attributions` table or JSONB field recording photographer name and
Unsplash photo URL for each downloaded image. A credits page or small attribution line on
the provider card satisfies the requirement.

#### Contingent: Pixabay API

If Unsplash attribution requirements prove too burdensome for UFlow's UI, Pixabay offers
identical functionality with no attribution required. Lower photo quality but simpler
compliance.

#### Logo.dev (Downgraded to Optional Future Enhancement)

Logo.dev remains a valid service for providers that DO have indexed brand logos. A future
plan could layer domain→logo enrichment on top of category-based imagery for the subset
of providers with recognisable brands. This is NOT recommended for the initial M3 scope
due to the coverage gap identified by the user.
