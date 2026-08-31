---
ID: 156
Origin: 156
UUID: a8f4e7c2
Status: Active
---

# Code Review — Plan 156: Automatic Food Provider Enrichment Pipeline

**Reviewer**: Security/Architect
**Date**: 2026-06-09
**Scope**: 6 milestones, ~20 files, ~2,000+ lines changed

## Overall Verdict

**CHANGES REQUESTED** — 2 HIGH, 3 MEDIUM, 3 LOW findings.

The implementation is generally well-structured and follows the plan and architecture recommendations closely (MEDIUM-1 empty strings, MEDIUM-2 plain Playwright, MEDIUM-3 generic matcher, LOW-1 source column are all addressed). However, two functional bugs were introduced where UberEats enrichment reuses Wolt-specific code paths without adapting the platform tag. These must be fixed before merge.

---

## Per-File Review

### `src/lib/enrichment/auto-apply-payload.ts`
**Verdict**: APPROVED

- **Findings**: Clean, well-structured implementation. `detectConflict()` is used correctly. Empty string handling per MEDIUM-1 is explicit. FOOD_PROVIDER_FIELDS routing is correct (no_alcohol, no_pork, no_gambling → food_providers sub-object). Delivery links and menu items are correctly separated from the RPC payload per the plan's architectural guidance.
- **Severity**: INFO — Minor: `record<string, unknown>` typing loses some type safety for the payload structure, but this matches the existing RPC pattern.

---

### `src/lib/enrichment/__tests__/auto-apply-payload.test.ts`
**Verdict**: APPROVED

- **Findings**: 15 tests covering all critical paths: additive, conflict, no-change, empty-string handling (MEDIUM-1), field routing (delivery_links, menu_items, food_providers), mixed candidates, empty input, null proposed. Test quality is high.
- **Severity**: INFO — None.

---

### `src/lib/enrichment/delivery-platform/lieferando-client.ts`
**Verdict**: APPROVED

- **Findings**: Well-architected HTTP client with proper rate limiting (750ms), exponential backoff retry (3 max), User-Agent header. JSON-LD extraction is robust (handles malformed JSON, non-Restaurant types). Menu parsing has good selector coverage. Private methods (`rateLimit`, `fetchHtmlWithRetry`) are correctly encapsulated.
- **Severity**: LOW — `parsePriceCents` returns 0 for unparseable input instead of `null` or throwing. This masks data issues (a restaurant with no prices gets price_cents=0 instead of being flagged). And `parseRestaurantCards` selector `a[href*="/speisekarte/"]` is broad and may include non-restaurant links (Anmelden, Lieferando links are filtered out by text, but other navigational links could slip through).

---

### `src/lib/enrichment/delivery-platform/lieferando-types.ts`
**Verdict**: APPROVED

- **Findings**: Clean interfaces. `LieferandoSearchResult` includes `[key: string]: unknown` index signature which correctly satisfies the `VenueLike` constraint for the generic matcher.
- **Severity**: INFO — None.

---

### `src/lib/enrichment/delivery-platform/lieferando-enricher.ts`
**Verdict**: APPROVED

- **Findings**: Correctly uses generic `matchProviderToVenues<LieferandoSearchResult>()`. `buildLieferandoCandidates()` correctly tags source as `'lieferando'`. Alcohol detection integration is consistent with Wolt pattern. Geocoder is used only for city-validation, not for search (Lieferando search is city-slug based).
- **Severity**: LOW — `buildLieferandoCandidates()` duplicates the `buildDeliveryCandidates()` pattern instead of extending it. The duplication means any future changes to the candidate-building logic must be mirrored in both places.

---

### `src/lib/enrichment/delivery-platform/ubereats-client.ts`
**Verdict**: APPROVED

- **Findings**: Plain Playwright (MEDIUM-2 recommendation followed). Manual stealth via `addInitScript` and Chromium args. Dynamic import for Playwright (lazy loading). Two-tier parsing strategy (INITIAL_STATE → DOM fallback). Browser lifecycle: one instance per run, `close()` available. Rate limiting (2s) appropriate. Timeout handling (30s) correct.
- **Severity**: LOW — `--disable-web-security` in stealth args is unnecessary and reduces security posture for the browser instance. Remove it — there's no cross-origin request requirement for this use case. Also, the `toCitySlug()` function doesn't handle all Unicode (İstanbul → Istanbul normalization not handled, but this is a minor edge case for German cities).

---

### `src/lib/enrichment/delivery-platform/ubereats-types.ts`
**Verdict**: APPROVED

- **Findings**: `UberEatsSearchResult` notably lacks a `city` field, meaning it can't satisfy `VenueLike` (which has `city?: string`). This is why UberEats has its own `findBestMatch()` instead of using the generic `matchProviderToVenues()`. This is a design inconsistency.
- **Severity**: INFO — Acceptable for experimental mode. Documented.

---

### `src/lib/enrichment/delivery-platform/ubereats-enricher.ts`
**Verdict**: CHANGES REQUESTED

- **Findings**:
  1. **HIGH**: Calls `buildDeliveryCandidates()` which hardcodes `source: 'wolt'` at `delivery-enricher.ts:129` and `:139`. UberEats candidates will be incorrectly tagged with `source: 'wolt'`. This affects run logs and audit trail accuracy.
  2. **MEDIUM**: `findBestMatch()` uses `stringSimilarity` with `matchThreshold: 0.4` but doesn't consider city at all (unlike the generic matcher which matches by name + city). This means an UberEats provider in Berlin could match a venue in Hamburg with a similar name, producing false positives.
- **Actions**: (See corrective actions below)

---

### `src/lib/enrichment/delivery-platform/provider-matcher.ts`
**Verdict**: APPROVED

- **Findings**: Generification with `VenueLike` interface + `MatchCandidate<T>` + `matchProviderToVenues<T>()` is clean and follows the MEDIUM-3 recommendation. Backward compatible with `WoltVenue` (which satisfies `VenueLike` via name, slug, and index signature). The `exact_name_city` early return is preserved.
- **Severity**: INFO — `providerId` field in `MatchCandidate` returns empty string (not the actual provider ID). The callers don't use it, so this is cosmetic but misleading. Consider populating it or removing the field.

---

### `src/lib/enrichment/delivery-enricher.ts`
**Verdict**: CHANGES REQUIRED

- **Findings**:
  1. **HIGH**: `buildDeliveryCandidates()` (line 115-150) hardcodes `source: 'wolt'` in both candidate push statements. This function is called by `enrichFromUberEats()` in `ubereats-enricher.ts:113`, causing UberEats candidates to be mislabeled as Wolt. The function should accept a `source` parameter.
- **Actions**: (See corrective actions below)

---

### `scripts/enrich-providers.ts`
**Verdict**: CHANGES REQUESTED

- **Findings**:
  1. **HIGH**: Line 1040: `autoApplyWoltFields()` is called for UberEats auto-apply results. `autoApplyWoltFields()` hardcodes:
     - `slugMatch = sourceUrl.match(/venue\/([^/]+)$/)` — Won't match UberEats URLs (which use `/de/store/{slug}`)
     - `platform: 'wolt'` — delivery link will be tagged with wrong platform
  2. **MEDIUM**: `processPendingEnrichments()` processes Wolt and Lieferando sources for pending items but doesn't include UberEats. Since UberEats is experimental, this is intentional but undocumented.
  3. **MEDIUM**: Source dispatch logic (lines 194-222) has confusing flow. `lieferando` with auto-apply would actually work correctly (handled at line 200), but lines 204-207 suggest it would error with "Auto-apply mode is only supported for 'wolt' and 'ubereats' sources." This error message is unreachable for `lieferando` but misleading for a reader.
  4. **LOW**: `runUberEatsEnrichment` is wrapped in try/catch per the experimental requirement, but the circuit breaker check runs inside the try block — if all providers fail due to anti-bot blocking, the circuit breaker fires and creates a run log. This is correct behavior but could cause noisy alerts.
- **Actions**: (See corrective actions below)

---

### `src/app/api/webhooks/enrich-provider/route.ts`
**Verdict**: APPROVED

- **Findings**: Clean webhook handler. Webhook secret validation (401 on mismatch). Input validation (type, table, provider_id). Listing_type filter (200 + skip for non-food). Provider owner check (200 + skip for owned). Error swallowing (returns 200 on DB insert failure — correct per design to prevent Supabase webhook retries). Service-role key used correctly.
- **Severity**: INFO — None.

---

### `src/app/api/webhooks/enrich-provider/__tests__/route.test.ts`
**Verdict**: APPROVED

- **Findings**: 7 tests covering all paths: valid insert, non-food skip, owned skip, invalid secret 401, missing provider_id 400, invalid type 400, DB failure returns 200. Mocking is clean. Env vars set before module import.
- **Severity**: INFO — None.

---

### `.github/workflows/enrich-food-providers.yml`
**Verdict**: APPROVED

- **Findings**: Well-structured workflow. Sequential source execution with `set +e` for failure isolation. Playwright installed conditionally. Artifact capture with 30-day retention. CLI args match script syntax. Sources ordered Wolt → Lieferando → UberEats (correct per plan).
- **Severity**: LOW — `if: contains(github.event.inputs.sources || 'wolt,lieferando,ubereats', 'ubereats')` — the `||` fallback in GitHub Actions expressions uses the first truthy value, but `github.event.inputs.sources` is always an empty string on schedule trigger (not undefined). The fallback to default sources only works correctly for `workflow_dispatch`. For schedule triggers, the expression evaluates to `contains('', 'ubereats')` which is `false`, so Playwright would NOT be installed on the scheduled run. However, since UberEats would then also fail at runtime (no browser), this creates a silent failure on the scheduled run. See corrective actions.

---

### `.github/workflows/enrich-wolt.yml`
**Verdict**: APPROVED

- **Findings**: Deprecation banner added. Schedule disabled (commented). Kept for backward compat. Correct approach per M5 plan.
- **Severity**: INFO — None.

---

### `supabase/migrations/101_plan_156_auto_enrichment.sql`
**Verdict**: APPROVED

- **Findings**: All additions use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`. `pending_enrichments` table has partial index for queue polling. RLS enabled with service-role grant. `food_menu.image_url` is nullable TEXT (correct). `auto_applied_fields` and `source_stats` columns added to `enrichment_run_logs`. `source` column included per LOW-1 recommendation.
- **Severity**: INFO — None.

---

### `supabase/migrations/104_plan_156_pending_enrichments.sql`
**Verdict**: CHANGES REQUESTED

- **Findings**:
  1. **MEDIUM**: Duplicate of `pending_enrichments` table from migration 101. Both use `IF NOT EXISTS` so no runtime error occurs, but this is confusing and unnecessary. The table definition is identical. This migration should be removed or converted to a reference-only file with a comment pointing to 101.
- **Actions**: (See corrective actions below)

---

### `package.json`
**Verdict**: APPROVED

- **Findings**: `cheerio` added as production dependency (line 81). `playwright` (not `playwright-extra`) added. Correct per MEDIUM-2 recommendation.
- **Severity**: INFO — None.

---

## Summary of Findings

### HIGH

| ID | Finding | File(s) | Line(s) |
|----|---------|---------|---------|
| H-1 | `buildDeliveryCandidates()` hardcodes `source: 'wolt'`, causes UberEats candidates to be mislabeled | `delivery-enricher.ts`, `ubereats-enricher.ts` | 129, 139, 113 |
| H-2 | `autoApplyWoltFields()` called for UberEats results — wrong URL regex + wrong platform tag | `scripts/enrich-providers.ts` | 1040, 1182-1286 |

### MEDIUM

| ID | Finding | File(s) | Line(s) |
|----|---------|---------|---------|
| M-1 | Duplicate migration 104 — creates `pending_enrichments` table already created in migration 101 | `supabase/migrations/104_plan_156_pending_enrichments.sql` | Entire file |
| M-2 | UberEats `findBestMatch()` doesn't consider city (0.4 threshold on name only) — potential false positives | `ubereats-enricher.ts` | 16-32 |
| M-3 | Scheduled workflow won't install Playwright Chromium (empty string fallback issue) | `.github/workflows/enrich-food-providers.yml` | 44 |

### LOW

| ID | Finding | File(s) | Line(s) |
|----|---------|---------|---------|
| L-1 | `--disable-web-security` in stealth args unnecessarily reduces browser security | `ubereats-client.ts` | 24 |
| L-2 | `parsePriceCents` silently returns 0 for unparseable prices instead of null/error | `lieferando-client.ts` | 19-26 |
| L-3 | Misleading error message about auto-apply support for `lieferando` (line 204-207, unreachable but confusing) | `scripts/enrich-providers.ts` | 204-207 |

---

## Corrective Actions

### H-1: Fix `buildDeliveryCandidates()` to accept a source parameter

**File**: `src/lib/enrichment/delivery-enricher.ts`

```typescript
export function buildDeliveryCandidates(
  providerId: string,
  sourceUrl: string,
  source: string,  // NEW PARAMETER
  currentOpeningHours: unknown,
  currentNoAlcohol: unknown,
  proposedOpeningHours: unknown,
  proposedNoAlcohol: unknown,
): EnrichmentCandidate[] {
  // ...
  candidates.push({
    provider_id: providerId,
    source,  // was: 'wolt'
    source_url: sourceUrl,
    // ...
  });
  // repeat for no_alcohol
}
```

**Update callers**:
- `delivery-enricher.ts:97` — pass `'wolt'`
- `ubereats-enricher.ts:113` — pass `'ubereats'`

### H-2: Create `autoApplyUberEatsFields()` or parameterize `autoApplyWoltFields()`

**File**: `scripts/enrich-providers.ts`

```typescript
async function autoApplyDeliveryFields(
  provider,
  result,
  noAlcoholMap,
  stats,
  platform: 'wolt' | 'ubereats',  // NEW PARAMETER
): Promise<void> {
  // Use platform parameter for:
  // - URL regex (venue/... vs store/...)
  // - Platform tag in delivery link insert
  // ...
}
```

Replace line 1040: `await autoApplyWoltFields(provider, result, noAlcoholMap, stats)` with `await autoApplyDeliveryFields(provider, result, noAlcoholMap, stats, 'ubereats')`.

### M-1: Remove duplicate migration

**Action**: Delete `supabase/migrations/104_plan_156_pending_enrichments.sql` or convert to a comment-only reference:

```sql
-- Plan 156, M4: Pending Enrichments Queue
-- NOTE: The pending_enrichments table is created in migration 101.
-- This file documents the webhook setup but requires no SQL changes.
-- See supabase/migrations/101_plan_156_auto_enrichment.sql
```

### M-2: Fix Playwright installation on schedule trigger

**File**: `.github/workflows/enrich-food-providers.yml`, line 44

```yaml
- name: Install Playwright Chromium (UberEats only)
  if: always() && contains(github.event.inputs.sources || 'wolt,lieferando,ubereats', 'ubereats')
  run: npx playwright install chromium --with-deps
```

In GitHub Actions, `github.event.inputs.sources` is an empty string for schedule events. The `||` fallback doesn't trigger because `''` is not falsy in the expression evaluator context. Use `format()` or a separate step to set default sources:

```yaml
- name: Set sources (default for schedule)
  id: set-sources
  run: |
    SOURCES="${{ github.event.inputs.sources }}"
    echo "sources=${SOURCES:-wolt,lieferando,ubereats}" >> $GITHUB_OUTPUT
- name: Install Playwright Chromium (UberEats only)
  if: contains(steps.set-sources.outputs.sources, 'ubereats')
  run: npx playwright install chromium --with-deps
```

### M-3 (optional): Add city consideration to UberEats matching

**File**: `src/lib/enrichment/delivery-platform/ubereats-enricher.ts`

Either add `city` to `UberEatsSearchResult` so it can use the generic `matchProviderToVenues()`, or add city filtering to `findBestMatch()`. For experimental mode, this is LOW priority but should be tracked.

---

## Re-review Requirements

After applying corrective actions:

1. Verify `buildDeliveryCandidates()` now accepts a source parameter and all callers pass the correct value
2. Verify `autoApplyWoltFields` is no longer called for UberEats (or is properly parameterized)
3. Remove/convert migration 104
4. Fix the Playwright installation for schedule-triggered runs
5. Run full test suite: `npx vitest run src/lib/enrichment/` — expect 125+ tests passing
6. Run TypeScript check: `npx tsc --noEmit` — zero errors
7. Run `scripts/enrich-providers.ts --source ubereats --dry-run --limit 1` to verify startup

No re-review needed for Low-priority items (L-1, L-2, L-3) — these can be tracked as future improvements.
