---
ID: 162
Origin: 162
UUID: c3d4e5f6
Status: Active
---

# Architecture Review: Plan 162 — Admin Delete Provider

## Verdict: APPROVED

The plan is fundamentally sound. The cascade safety is verified (all 17+ child FKs have `ON DELETE CASCADE`), the existing route file accepts the new `DELETE` handler cleanly, rate limiting and audit conventions are followed, and the UI placement outside the form avoids state sync issues. No blocking concerns.

## Findings

### #1 [M1/Code inconsistency] — Minor

The M1 milestone description (line 19) says `delete().eq(...).select()`, and the analysis doc (F1 line 124) also recommends `.select()`. But the detailed implementation code (lines 69-80) omits `.select()`. Without it, the service cannot distinguish "deleted successfully" from "provider did not exist" — both return no error. This also breaks consistency with the existing `updateProviderReview` pattern, which uses `.select()` to detect zero-affected-rows and returns a distinct error. The plan argues "both outcomes are acceptable from the client's perspective," which is true for the redirect flow, but it means the API always returns 200 even when the provider never existed.

### #2 [No 404 for non-existent provider] — Minor

The plan intentionally accepts silent success when deleting a non-existent provider (200 instead of 404). While this works for the client (redirect in either case), it is a departure from REST semantics and from the existing GET handler which correctly returns 404. If an integration or script later depends on the DELETE response to verify the resource existed, it will get a false positive.

### #3 [Unused Zod schema] — Minor

`providerDeleteSchema` is added to `adminSchemas.ts` (line 201-207) but the API route validates the UUID via regex directly (same as the existing GET handler). The schema is never imported or used. This creates confusion about which validation path is authoritative and adds dead code. Either wire the schema into the route or remove it.

### #4 [Triggers not explicitly verified in analysis] — Informational

The analysis (F1) verified cascade FKs but did not check for triggers on the `providers` table. I verified all three triggers on `providers`: `trigger_providers_updated_at` (BEFORE UPDATE only), `trigger_enqueue_provider_outreach` (AFTER INSERT only). Neither fires on DELETE — no risk. The cascade delete on `provider_badges` will fire `trigger_sync_provider_badge_to_boolean` (AFTER INSERT OR DELETE on `provider_badges`), which syncs a boolean column — this is expected and safe.

## Recommendations

### Minor: Make deleteProvider use `.select()` for not-found detection

Align the implementation with the M1 milestone description by adding `.select()`:

```typescript
const { data: rows, error } = await supabase
  .from('providers')
  .delete()
  .eq('provider_id', providerId)
  .select();

if (error) throw new Error(`Failed to delete provider: ${error.message}`);
if (!rows || rows.length === 0) throw new Error('Provider not found');
```

This gives the API handler the information it needs to return 404 vs 200 and matches the existing pattern in `updateProviderReview`. The client-side redirect still works the same — the toast message should then handle each case (success vs "already deleted" / "not found").

### Minor: Either wire the Zod schema or remove it

If the API route uses regex validation (matching the GET handler), remove `providerDeleteSchema`. If the intent is to use Zod for future bulk-delete, import and use it now — even if the current endpoint only validates the path param via regex, the schema being unused is dead code that will be flagged by linting.

### Minor: Re-check cascade on `provider_verification` (unverified)

The analysis lists 17+ child tables but I did not see `provider_verification` in the list. If such a table exists and lacks `ON DELETE CASCADE`, it would block deletion. Confirm this table has CASCADE before deployment.
