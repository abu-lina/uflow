# Architecture Review — Plan 156: Automatic Food Provider Enrichment Pipeline

**Reviewer**: Architect
**Date**: 2026-06-09
**Plan**: `agent-output/planning/156-auto-enrichment-plan.md`
**Analysis**: `agent-output/analysis/156-auto-enrichment-analysis.md`

---
ID: 156
Origin: 156
UUID: cda21819
Status: Active
---

## Overall Verdict

**APPROVED** — 4 recommendations (3 MEDIUM, 1 LOW) to address before implementation.

The plan is architecturally sound. The core design decisions are correct: pre-reading + filtering to null-only fields before the RPC call is the right approach, bypassing the RPC's destructive sub-objects for delivery_links/menu_items is the right call, and the queue-based on-creation trigger is the right pattern given the 5s webhook timeout.

---

## Detailed Review

### 1. Auto-apply approach (M1) — Pre-read + filter to null-only fields

**Verdict: CORRECT.**

The RPC (migration 102) uses `COALESCE(v_providers->>'field', field)` for scalar fields in the `providers` table. When a key is absent from the payload, the entire `providers` update block is skipped (`IF v_providers IS NOT NULL AND v_providers != 'null'::jsonb`). When a key is present with a non-null value, only that field is written — all other fields COALESCE to their current values.

**Key nuance — empty strings**: `COALESCE('', field)` returns `''`, not the existing value. The `providers` block has no `NULLIF` guard on text fields like `contact_phone`, `social_website` (though it does for `category_id`). The payload builder must never include empty strings — only include a field when the proposed value is truthy AND the current value is null/empty. The plan's `detectConflict()` already returns `'additive'` for this case, so this is correct in practice. But the implementation must be explicit: treat empty string as "null" for auto-apply purposes.

**`food_providers` sub-object**: Uses INSERT ... ON CONFLICT DO UPDATE with COALESCE on each column. If a field is included with its actual non-null value, it overwrites. If included as null/absent, it preserves. Same constraint applies — only include fields where proposed is non-null and current is null. Verified correct.

### 2. Delivery links + menu items write path

**Verdict: CORRECT — but with a noted gap.**

The RPC uses `IF p_data ? 'delivery_links'` and `IF p_data ? 'menu_items'` — these check for key EXISTENCE, not non-null value. If the key exists with `[]` or `null`, it still triggers DELETE + INSERT. The plan correctly identifies this and chooses direct INSERT instead.

**Gap — atomicity**: The write path is now split across two mechanisms — RPC for scalar fields, direct INSERT for arrays. If the RPC succeeds but the INSERT fails (network blip, constraint violation), the provider has partial enrichment. For auto-apply this is acceptable (additive-only, partial writes are safe to retry), but it should be documented as a known inconsistency window.

**Recommendation**: Accept the split-path approach for MVP. If transactional guarantees become important later, create an `auto_enrich_provider` RPC with non-destructive semantics as a follow-up. No need to block the current plan.

### 3. Lieferando client architecture

**Verdict: CORRECT.**

`fetch` + `cheerio` + JSON-LD parsing is the right starting point. The analysis confirms Lieferando has no Cloudflare Turnstile, moderate rate limiting, and uses SSR HTML. A headless browser would add unnecessary complexity.

**Alternative considered (consumer API)**: Lieferando has internal search APIs (`api/restaurants/search`), but these are undocumented and change more frequently than page HTML. JSON-LD (Schema.org) in the page is standardized and stable. Starting with HTML parsing is correct.

**Recommendation**: If scraping degrades over time (the analysis notes medium risk of page structure changes), escalate to a headless approach for Lieferando as a secondary path, not a replacement.

### 4. UberEats experimental architecture

**Verdict: APPROVED with recommendation.**

Playwright is the right browser automation choice. It has first-class GitHub Actions support (`npx playwright install --with-deps chromium`), better auto-wait APIs than Puppeteer, and active maintenance.

**Issue: `playwright-extra` dependency**. The plan recommends `playwright-extra` with `puppeteer-extra-plugin-stealth`. This is a community wrapper that lags behind Playwright releases. A better approach:

Use **plain Playwright** with manual stealth evasions via `addInitScript`:
```typescript
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
```
Plus realistic launch args (`--disable-blink-features=AutomationControlled`), viewport, user agent, and locale. This gives more control, fewer dependencies, and avoids the unmaintained-wrapper risk.

**Recommendation**: Drop `playwright-extra`. Use plain Playwright with manual stealth. Keep the experimental guard and graceful skip. The plan's error containment (top-level try/catch, never blocks pipeline) is correct.

### 5. On-creation trigger — Queue pattern vs Edge Function

**Verdict: CORRECT. Queue pattern is the right call.**

| Concern | Queue (plan choice) | Edge Function (alternative) |
|---------|---------------------|----------------------------|
| Webhook 5s timeout | ✅ Fast enqueue only | ❌ Would need to start enrichment within 5s |
| Enrichment logic location | ✅ CLI (unified) | ❌ Duplicated in Edge Function |
| Retry semantics | ✅ `pending` → `processing` → retry on failure | ❌ Stateless, no built-in retry |
| Error handling | ✅ CLI circuit breaker, run logs | ❌ Edge Function timeout/error handling |
| Infrastructure | ✅ Same as existing enrichment | ⚠️ New Supabase Function + deployment |

The webhook condition (`listing_type = 'food' AND provider_owner_id IS NULL`) is set at the Supabase Database Webhook level — fast filtering before the HTTP call. The webhook payload is tiny (just the `provider_id`). The `pending_enrichments` table acts as a durable queue.

**Recommendation**: Consider adding a `source` column to `pending_enrichments` so different webhooks (if added later) can specify which source to enrich from. Not required for MVP but cheap to add now.

### 6. Provider-matcher generification

**Verdict: Plan lacks detail. Recommendation provided.**

The plan says "Make generic" without specifying the approach. The cleanest solution:

**Extract a `VenueLike` interface and use a generic type parameter:**

```typescript
// New: shared interface
export interface VenueLike {
  name: string;
  slug: string;
  city?: string;
  [key: string]: unknown;
}

// Modified: remove WoltVenue dependency
export interface MatchCandidate<T extends VenueLike = VenueLike> {
  providerId: string;
  providerName: string;
  providerCity: string;
  venue: T;
  confidence: number;
  matchType: 'exact_name_city' | 'fuzzy_name_city' | 'fuzzy_name_only';
}

// Modified: generic function
export function matchProviderToVenues<T extends VenueLike>(
  providerName: string,
  providerCity: string,
  venues: T[],
  config?: ProviderMatchConfig
): MatchCandidate<T> | null {
```

This preserves type safety (the caller knows the concrete venue type), allows backward-compatible usage with `WoltVenue` (which satisfies `VenueLike` via its `name`, `slug`, `city`, and index signature), and gives Lieferando/UberEats their own typed venue interfaces.

**Recommendation**: Update the plan with this approach before implementing.

### 7. Schema design

**Verdict: APPROVED. Well-designed.**

| Element | Assessment |
|---------|-----------|
| `pending_enrichments` | Clean. Partial index on `(status, created_at) WHERE status IN ('pending', 'processing')` is correct for queue polling. |
| `food_menu.image_url` | Minimal addition. Nullable TEXT is correct. No index needed unless queried in isolation. |
| `enrichment_run_logs.auto_applied_fields` | JSONB is appropriate for variable-length field lists. Consider an additional `stats` sub-object to track counts per source (e.g., `{ "wolt": 3, "lieferando": 0 }`). |

**Minor**: The plan mentions putting `pending_enlargements` in the migration for M6, not M4. This is fine — just ensure the migration numbers are correctly ordered (M4 must run after M6).

### 8. RPC modifications — New `auto_enrich_provider` RPC?

**Verdict: No new RPC needed for MVP. Revisit later.**

Arguments against a new RPC:

1. **Maintenance burden**: The existing RPC has been modified 3 times (migrations 094, 098, 102). Adding another variant doubles the surface area.
2. **Split-path is acceptable**: For auto-apply's additive-only semantics, partial writes are benign. The next scheduled run picks up any leftovers.
3. **Direct INSERT is simpler**: No RPC debugging needed, standard Supabase JS client patterns.
4. **Future option**: If transactional guarantees become critical (e.g., if we start writing 10+ fields across 4 tables), create `auto_enrich_provider` with `INSERT ... ON CONFLICT DO NOTHING` semantics for arrays. This is an additive change that doesn't require reworking the current plan.

---

## Recommendations

### MEDIUM-1: Handle empty strings in payload builder

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Plan ref** | M1 — `buildAutoApplyPayload()` |
| **File** | `src/lib/enrichment/delivery-enricher.ts` |

The RPC's `COALESCE` treats empty strings as non-null and will overwrite existing values. The payload builder must explicitly exclude empty strings — treat them as "null" for auto-apply purposes. A field should only be included when `proposed_value !== null && proposed_value !== '' && (current_value === null || current_value === '')`.

### MEDIUM-2: Use plain Playwright, not playwright-extra

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Plan ref** | M3 — UberEats client |
| **File** | `package.json`, `ubereats-client.ts` |

Drop `playwright-extra` and `puppeteer-extra-plugin-stealth`. Use plain Playwright with manual stealth evasions via `addInitScript` and appropriate Chromium launch args. This reduces dependency risk and gives more control.

### MEDIUM-3: Generic provider-matcher via type parameter

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Plan ref** | M2 — provider-matcher refactor |
| **File** | `src/lib/enrichment/delivery-platform/provider-matcher.ts` |

Use the generic `VenueLike` interface + type parameter approach described in section 6 above. Ensure backward compatibility with the existing `matchProviderToVenues(providerName, city, WoltVenue[])` call site in `delivery-enricher.ts`.

### LOW-1: Add `source` column to `pending_enrichments`

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Plan ref** | M4 — Migration |
| **File** | `supabase/migrations/104_plan_156_pending_enrichments.sql` |

Add `source TEXT` (nullable) to `pending_enrichments` so future webhooks can specify which platform to enrich from. Not required for MVP but cheap to add now and avoids a migration later.

---

## ADR

None required. All significant decisions (queue-based trigger, split write path, generic matcher, plain Playwright) are well-established patterns that don't require a formal ADR entry.
