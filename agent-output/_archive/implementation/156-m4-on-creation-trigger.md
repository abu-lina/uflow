---
ID: 156
Origin: 156
UUID: a7b93d1f
Status: Active
---

# M4: On-Creation Trigger — Implementation

## Summary

Built the on-creation trigger for food provider auto-enrichment. When a new food provider without an owner is created, a Supabase Database Webhook POSTs to a Next.js API route, which enqueues the provider into `pending_enrichments`. The scheduled enrichment workflow picks up pending rows at startup and processes them.

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/104_plan_156_pending_enrichments.sql` | NEW | Creates `pending_enrichments` queue table with `source` column (LOW-1) |
| `src/app/api/webhooks/enrich-provider/route.ts` | NEW | Webhook handler — validates secret, checks listing_type/owner, inserts to queue |
| `src/app/api/webhooks/enrich-provider/__tests__/route.test.ts` | NEW | 7 tests covering valid, skip, 401, 400, and failure cases |
| `scripts/enrich-providers.ts` | MODIFIED | `processPendingEnrichments()` called at startup in auto-apply mode |

## Design Decisions

- **Fast response**: Webhook returns 200 immediately — actual enrichment is async via the scheduled run
- **Log failures, return 200**: Prevents Supabase from retrying the webhook with backoff
- **Source column**: Added per LOW-1 recommendation (nullable TEXT), future webhooks can specify which source
- **Optimistic lock**: Pending rows are marked `processing` before processing to prevent double-processing
- **Double-processing safe**: Auto-apply is additive-only (writes null/empty fields only), so even if a provider is processed by both pending queue and main batch, no data is overwritten

## Test Results

```
 ✓ src/app/api/webhooks/enrich-provider/__tests__/route.test.ts (7 tests)
   ✓ inserts pending_enrichments for valid food provider without owner
   ✓ skips non-food providers (no insert)
   ✓ skips owned providers (no insert)
   ✓ returns 401 for invalid webhook secret
   ✓ returns 400 for missing provider_id
   ✓ returns 400 for invalid webhook type
   ✓ returns 200 (not 500) when DB insert fails
```

## Verification

- `npx tsc --noEmit` — PASS (no output)
- `npx vitest run src/app/api/webhooks/enrich-provider/__tests__/route.test.ts --no-coverage` — 7/7 passed
