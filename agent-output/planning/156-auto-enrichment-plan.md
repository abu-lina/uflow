---
ID: 156
Origin: 156
UUID: 3f8b5c2e
Status: Active
---

# Plan 156: Automatic Food Provider Enrichment Pipeline

## 1. Summary

Extend the existing enrichment pipeline to support Wolt (existing), Lieferando (new), and UberEats (new) with an auto-apply mode that writes directly to provider fields only when they are null/empty. Trigger on provider creation via a queue + weekly scheduled GitHub Actions workflow. Scope: food providers without owners (`listing_type='food' AND provider_owner_id IS NULL`).

## 2. Milestones

| # | Milestone | Effort | Dependencies |
|---|-----------|--------|-------------|
| M1 | Auto-Apply Mode (Core Pipeline Rework) | Medium | None |
| M2 | Lieferando Client | Medium | M1 (reuses auto-apply path) |
| M3 | UberEats Client (Experimental) | High | M1 (reuses auto-apply path) |
| M4 | On-Creation Trigger | Low | M1 (needs auto-apply) |
| M5 | Unified GitHub Actions Workflow | Low | M1, M2, M3 |
| M6 | Schema Updates | Low | M1 (for migration number ordering) |

## 3. Milestone Details

### M1: Auto-Apply Mode (Core Pipeline Rework)

**Goal**: Add `--auto-apply` flag to `scripts/enrich-providers.ts` that writes directly to DB (skipping `enrichment_candidates`) but only for null/empty fields. Keep existing `--dry-run` preview mode.

**Files to modify**:

1. **`scripts/enrich-providers.ts`** — Add `--auto-apply` flag. Restructure the Wolt path (`runWoltEnrichment`) and JoinHalal path to support three modes: `dry-run`, `write` (candidates), `auto-apply`. Add CLI args: `--auto-apply`, `--mode {dry-run|write|auto-apply}`. Keep backward compat with `--write`.

2. **`src/lib/enrichment/delivery-enricher.ts`** — Add a new function `buildAutoApplyPayload(provider, result)` that builds the filtered RPC payload. Use `detectConflict()` to identify additive-only changes. Return the JSONB payload for `admin_update_provider`.

3. **`src/lib/enrichment/joinhalal-enricher.ts`** — Add `buildAutoApplyPayload(snapshot, parsed)` analogous to the delivery version but for JoinHalal fields.

**Auto-apply payload structure**:

```typescript
interface AutoApplyPayload {
  providers?: {
    contact_phone?: string;
    social_website?: string;
    // ... only fields that are currently null AND have proposed values
  };
  food_providers?: {
    no_alcohol?: boolean;
  };
  delivery_links?: Array<{
    platform: 'wolt' | 'lieferando' | 'ubereats';
    platform_url: string;
    platform_slug?: string;
    is_active: boolean;
  }>;
  menu_items?: Array<{
    name_de: string;
    description_de?: string;
    price_cents?: number;
    category?: string;
  }>;
}
```

**Write path**: Call `supabase.rpc('admin_update_provider', { p_provider_id, p_data })` with the filtered payload. The RPC's `COALESCE` behavior means only included fields are written — but since we pre-filter to only null fields, this is safe.

**For `delivery_links`**: Do NOT use `menu_items`/`delivery_links` sub-objects of `admin_update_provider` because those do DELETE+INSERT (destructive). Instead:
- Check `SELECT COUNT(*) FROM provider_delivery_links WHERE provider_id = X AND platform = Y` first.
- Only INSERT if no row exists.
- Use a direct `supabase.from('provider_delivery_links').insert(...)` with `ON CONFLICT DO NOTHING`.

**For `menu_items`**: 
- Check `SELECT COUNT(*) FROM food_menu WHERE provider_id = X` first.
- Only insert if zero existing menu items. Use direct inserts in batches.

**Run log**: Add an `auto_applied_fields` column to the run log stats (JSONB or array of field names). Write `enrichment_candidates` with `status = 'auto_applied'` for logging purposes.

**Test strategy**: Unit tests for `buildAutoApplyPayload()` — verify additive-only values pass, conflicts are excluded. Integration test: mock DB, verify RPC call payload is correct.

---

### M2: Lieferando Client

**Goal**: Build a web scraper for Lieferando.de. Search by city, fetch restaurant page, parse HTML + JSON-LD.

**New files**:

1. **`src/lib/enrichment/delivery-platform/lieferando-client.ts`** — HTTP-based client. Use `cheerio` for HTML parsing and JSON-LD extraction.
   - `searchRestaurants(city: string, lat: number, lng: number): Promise<LieferandoSearchResult[]>`
   - `getRestaurantPage(slug: string): Promise<LieferandoRestaurantData>`
   - Rate limiting (500ms-1s delay), retry logic (exponential backoff, max 3 retries), User-Agent header
   - Parse JSON-LD (`<script type="application/ld+json">`) for structured data (name, address, phone, opening hours)
   - Fall back to DOM parsing for menu items, ratings, description
   - Extract menu categories + items (name, description, price in cents)
   - Return typed interfaces matching the spec in the analysis doc

2. **`src/lib/enrichment/delivery-platform/lieferando-types.ts`** — TypeScript interfaces for Lieferando data structures.

3. **`src/lib/enrichment/delivery-platform/lieferando-enricher.ts`** — Orchestration function `enrichFromLieferando(provider, client)` following the pattern of `enrichFromWolt()` in `delivery-enricher.ts`.
   - Geocode city → search Lieferando → match provider → fetch restaurant page → build candidates
   - Reuse `provider-matcher.ts` — but it currently depends on `WoltVenue` type. **Make generic**: extract a shared `Venue` interface that all platform clients implement (or accept duck-typing). Or create a `matchProviderToDeliveryVenues()` function that works with `{ name: string; slug: string; city?: string }`.
   - Return `DeliveryEnrichmentResult` (same type as Wolt path)

**Files to modify**:

4. **`src/lib/enrichment/delivery-platform/provider-matcher.ts`** — Extract the matching logic to work with a generic `VenueLike` interface (`{ name: string; city?: string }`) instead of `WoltVenue`. Keep backward compat.

5. **`scripts/enrich-providers.ts`** — Add `lieferando` as a supported source in `runWoltEnrichment` (rename to `runDeliveryEnrichment` or add parallel dispatch). The Lieferando path should work with `--auto-apply`, `--dry-run`, and `--write`.

6. **`package.json`** — Add `cheerio` dependency.

**Integration**:
- Update `delivery-enricher.ts` to export a common `enrichFromDeliveryPlatform()` dispatcher that routes to Wolt/Lieferando based on source param.
- Or keep them separate and have the CLI invoke the right one.

**Rate limiting**: 500ms between requests. Respect `robots.txt` (check before scraping). Implement concurrent delay per-domain (not per-request) to avoid hammering Lieferando.

**Error handling**: Wrap each provider fetch in try/catch. Count failures. Circuit breaker (same 20% threshold). Never block pipeline — log and skip.

**Test strategy**:
- Unit tests for HTML parsing with fixture HTML files (test different page layouts)
- Unit tests for JSON-LD extraction
- Unit tests for the matching integration (mock client)
- Integration test against a known Lieferando restaurant URL (optional, manual)

---

### M3: UberEats Client (Experimental)

**Goal**: Build an experimental UberEats scraper. Headless browser approach (Playwright) due to anti-bot protections. Mark as experimental — errors never block pipeline.

**New files**:

1. **`src/lib/enrichment/delivery-platform/ubereats-client.ts`** — Playwright-based client.
   - `searchRestaurants(city: string, lat: number, lon: number): Promise<UberEatsSearchResult[]>`
   - `getRestaurantPage(slug: string): Promise<UberEatsRestaurantData>`
   - Launch headless Chromium, navigate to UberEats page, wait for content to load
   - Parse page content for restaurant data, menu items, ratings
   - Stealth configuration: playwright-extra with puppeteer-extra-plugin-stealth (if available) or manual evasion
   - Timeout handling: each page load has a 30s timeout; if exceeded, skip and log
   - Rate limiting: 2s+ between requests to avoid detection

2. **`src/lib/enrichment/delivery-platform/ubereats-types.ts`** — TypeScript interfaces.

3. **`src/lib/enrichment/delivery-platform/ubereats-enricher.ts`** — Orchestration function `enrichFromUberEats(provider, client)`.
   - Same pattern as Lieferando/Wolt
   - Always wrapped in try/catch — any error returns `{ error: 'UberEats experimental: ...' }` and continues

**Files to modify**:

4. **`scripts/enrich-providers.ts`** — Add `ubereats` as supported source. Wrap entire UberEats run in a top-level try/catch so it never blocks other sources.

5. **`package.json`** — Add `playwright` and `@playwright/test` dependencies.

**Key design decisions**:
- **Experimental flag**: UberEats enrichment runs last (after Wolt, Lieferando). If it errors out, the run log records the failure but the workflow succeeds.
- **Browser management**: Launch browser once per workflow run (not once per provider). Reuse context. Close when done.
- **Stealth**: Use `playwright-extra` with stealth plugin. Set realistic viewport, user agent, locale. Randomize timing.
- **Proxy**: Start without proxy. If Cloudflare blocking becomes a problem, add rotating proxy support (configurable via env var).

**Test strategy**:
- Unit tests for page data parsing (use saved HTML fixtures)
- Integration test: try against a well-known UberEats restaurant, but accept failure gracefully
- Test that errors are never thrown out of the enrichment pipeline (always caught)

---

### M4: On-Creation Trigger

**Goal**: Automatically enrich newly created food providers.

**Approach**: Supabase Database Webhook → lightweight queue → picked up by scheduled enrichment.

**New files**:

1. **`src/app/api/webhooks/enrich-provider/route.ts`** — Next.js API route.
   - Receives POST from Supabase Database Webhook (payload: `{ type: 'INSERT', table: 'providers', record: { provider_id, listing_type, provider_owner_id } }`)
   - Validates webhook secret from env var
   - Checks `listing_type === 'food'` and `provider_owner_id IS NULL`
   - Inserts into `pending_enrichments` table (provider_id, status='pending', created_at)
   - Returns 200 (fast — we don't wait for enrichment)
   - Authentication: use `X-Webhook-Secret` header verification

**Files to modify**:

2. **Migration: `supabase/migrations/104_plan_156_pending_enrichments.sql`** — New table:
   ```sql
   CREATE TABLE IF NOT EXISTS public.pending_enrichments (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     started_at TIMESTAMPTZ,
     completed_at TIMESTAMPTZ,
     error_message TEXT,
     run_log_id UUID REFERENCES public.enrichment_run_logs(id) ON DELETE SET NULL
   );

   CREATE INDEX IF NOT EXISTS idx_pending_enrichments_status
     ON public.pending_enrichments(status, created_at)
     WHERE status IN ('pending', 'processing');
   
   ALTER TABLE public.pending_enrichments ENABLE ROW LEVEL SECURITY;
   ```

3. **`scripts/enrich-providers.ts`** — At startup, if `--auto-apply` mode: query `pending_enrichments WHERE status = 'pending' ORDER BY created_at LIMIT 50`, process them, update status to 'completed'/'failed'. After processing, update `last_enriched_at` on providers.

**Alternative (simpler)**: Skip the webhook entirely. Have the scheduled workflow query `providers WHERE listing_type='food' AND provider_owner_id IS NULL AND (last_enriched_at IS NULL OR last_enriched_at < NOW() - INTERVAL '7 days')`. This is simpler and avoids the webhook infra entirely. But the user explicitly asks for on-creation trigger. Keep the `pending_enrichments` table as the queue mechanism.

**Webhook setup as code**: Document the Supabase Dashboard setup steps in comments:
   - Go to Database → Webhooks → Create
   - Table: `providers`, Event: `INSERT`, Condition: `NEW.listing_type = 'food' AND NEW.provider_owner_id IS NULL`
   - URL: `https://<domain>/api/webhooks/enrich-provider`
   - Headers: `X-Webhook-Secret: <secret>`
   - HTTP Method: POST

**Test strategy**:
- Unit test the API route handler (mock Supabase client, verify insert into pending_enrichments)
- Integration test: insert a provider via service-role API, verify pending_enrichments row created
- Manual: trigger webhook via Supabase Dashboard

---

### M5: Unified GitHub Actions Workflow

**Goal**: Single workflow that runs all sources with auto-apply on a weekly schedule, plus manual trigger for dry-run/testing.

**New file**:

1. **`.github/workflows/enrich-food-providers.yml`** — Unified enrichment workflow.
   ```yaml
   name: Food Provider Enrichment

   on:
     schedule:
       - cron: '0 3 * * 0'  # Sunday 3am UTC
     workflow_dispatch:
       inputs:
         sources:
           description: 'Sources (comma-separated: wolt,lieferando,ubereats)'
           default: 'wolt,lieferando,ubereats'
           type: string
         mode:
           description: 'Mode: auto-apply, dry-run, write'
           default: 'auto-apply'
           type: choice
           options:
             - auto-apply
             - dry-run
             - write
         limit:
           description: 'Max providers per source (blank = all)'
           required: false
           type: string
   ```

   Steps:
   1. Checkout, setup Node (20), cache npm
   2. Install dependencies: `npm ci`
   3. Install Playwright browsers (only if UberEats source selected): `npx playwright install chromium`
   4. Run enrichment per source sequentially (Wolt, Lieferando, UberEats)
      - Each source is a separate `npx tsx scripts/enrich-providers.ts --source <name> --mode <mode>` call
      - If `--limit` is set, pass it to each source
   5. Capture logs as artifacts

   **Timeout**: 60 minutes (matching current Wolt workflow).

   **Note**: The workflow runs sources sequentially so failure in one doesn't affect others. UberEats runs last.

**Files to modify**:

2. **`.github/workflows/enrich-wolt.yml`** — Deprecate or rename to redirect to the new unified workflow. Add a comment pointing to the new workflow. Keep it for backward compat but note it's superseded.

3. **`.github/workflows/enrich-providers.yml`** — Same treatment (JoinHalal enrichment is separate; this can stay).

**Test strategy**:
- Dry-run the workflow manually from GitHub Actions UI
- Verify logs show each source running independently
- Verify schedule trigger fires correctly

---

### M6: Schema Updates

**Goal**: Minimal schema changes needed to support all enrichment features.

**Migration**: `supabase/migrations/104_plan_156_auto_enrichment.sql`

1. **`food_menu.image_url`** (optional):
   ```sql
   ALTER TABLE public.food_menu 
   ADD COLUMN IF NOT EXISTS image_url TEXT;
   ```

2. **`pending_enrichments` table** (if not already created by M4 migration — merge with M4's migration or keep separate):
   - Include the `pending_enrichments` table here as well (or reference it from M4).
   - Decision: put `pending_enrichments` in this migration, not M4.

3. **`enrichment_run_logs.auto_applied_fields`** — Add a column to track what was auto-applied:
   ```sql
   ALTER TABLE public.enrichment_run_logs 
   ADD COLUMN IF NOT EXISTS auto_applied_fields JSONB;
   ```

4. **`enrichment_candidates.status`** — Already uses `text` type, no change needed. Ensure `'auto_applied'` is documented as a valid status value in comments.

5. **`providers.last_enriched_at`** — Already exists. No change needed.

**No new tables needed** beyond `pending_enrichments`. The existing schema supports the full pipeline.

**Test strategy**: Run migration against local DB. Verify columns added. Run `npm run type-check` to ensure type definitions match.

---

## 4. Dependencies

```
M1 (Auto-Apply) ─┬── M2 (Lieferando) ──┬── M5 (Workflow)
                  │                     │
                  ├── M3 (UberEats) ────┤
                  │                     │
                  └── M4 (Trigger) ─────┘
                  │
                  └── M6 (Schema)
```

- **M1 must be first**: Everything else builds on auto-apply.
- **M2 and M3 are independent**: Can be built in parallel once M1 is done.
- **M4 depends on M1**: Needs auto-apply to actually enrich on creation.
- **M5 depends on M1 + M2 + M3**: Needs all sources to be integrated.
- **M6 depends on M1**: Migration ordering; can happen anytime before M5.

## 5. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| UberEats anti-bot blocks completely | High | Medium | Mark as experimental; graceful skip. Pipeline keeps working with Wolt+Lieferando. |
| Lieferando page structure changes | Medium | Medium | Fixture-based integration tests. Add monitoring on `enrichment_run_logs` failure rate. |
| `admin_update_provider` RPC overwrites data | Low | High | Pre-read values before building payload. Only include null fields. Double-check with unit tests. |
| Webhook timeout (Supabase 5s limit) | Medium | Medium | Webhook only enqueues (fast write to `pending_enrichments`). Actual enrichment is async. |
| Playwright browser binary in CI | Medium | Low | Cache browser binaries. Install only chromium. Use `npx playwright install chromium --with-deps`. |
| Rate limiting (Lieferando blocks IP) | Medium | Low | Exponential backoff (3 retries). 1s delay between requests. Run on weekend schedule only. |
| Data overwrite on concurrent admin edits | Low | Low | Auto-apply only writes null fields. Admin edits set non-null values. Race condition is benign. |

## 6. Test Strategy

### Per-Milestone Tests

| Milestone | Test Type | What to Test |
|-----------|-----------|-------------|
| M1 | Unit | `buildAutoApplyPayload()` filters correctly: additive passes, conflict excluded, no-change excluded |
| M1 | Unit | RPC payload structure for each table target |
| M1 | Integration | Full auto-apply cycle against test DB: verify null fields filled, non-null fields untouched |
| M2 | Unit | HTML parsing with fixture files for various page layouts |
| M2 | Unit | JSON-LD extraction from fallback to DOM parsing |
| M2 | Unit | Provider matching with Lieferando data format |
| M2 | Integration | (Optional, manual) Against a known Lieferando URL |
| M3 | Unit | Page data parsing with saved HTML fixtures |
| M3 | Unit | Error handling: verify errors never propagate |
| M3 | Integration | (Manual) Against known UberEats URL with flag to skip in CI |
| M4 | Unit | Webhook handler: validate secret, check listing_type, insert to pending_enrichments |
| M4 | Integration | Verify pending_enrichments rows get picked up by scheduled run |
| M5 | E2E | Dry-run workflow manually from GitHub Actions |
| M6 | Unit | Migration runs cleanly, columns exist |

### Key Test Files to Create

```
src/lib/enrichment/__tests__/auto-apply-payload.test.ts
src/lib/enrichment/delivery-platform/__tests__/lieferando-client.test.ts
src/lib/enrichment/delivery-platform/__tests__/lieferando-enricher.test.ts
src/lib/enrichment/delivery-platform/__tests__/ubereats-client.test.ts
src/lib/enrichment/delivery-platform/__tests__/ubereats-enricher.test.ts
src/app/api/webhooks/enrich-provider/__tests__/route.test.ts
scripts/__tests__/enrich-providers.test.ts  (integration-style)
```

### Regression Tests

- Existing Wolt enrichment must continue working (all three modes: dry-run, write, auto-apply)
- JoinHalal enrichment must continue working unchanged
- `provider-matcher.ts` must still match Wolt venues (regression after making it generic)

## 7. Estimated Effort

| Milestone | Days | Notes |
|-----------|------|-------|
| M1: Auto-Apply | 2-3 | CLI rework, payload builder, RPC integration, tests |
| M2: Lieferando | 3-4 | Client, enricher, matcher refactor, HTML parsing, tests |
| M3: UberEats | 3-5 | Playwright setup, evasions, experimental wrapper, tests |
| M4: On-Creation Trigger | 1-2 | Migration, webhook route, pending_enrichments integration |
| M5: GitHub Actions | 1 | Workflow, deprecation of old workflows |
| M6: Schema | 0.5 | Migration, column additions |
| **Total** | **~10-15 days** | Full pipeline end-to-end |

Note: M2 and M3 can be parallelized by different developers. M1 is the critical path.
