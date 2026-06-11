---
ID: 161
Origin: 161
UUID: e5f6g7h8
Status: Active
Type: Plan
Domain: enrichment
---

# Plan 161: Apify Wolt Integration

## Milestones

### M1 — Create Apify Wolt Client
- File: `src/lib/enrichment/delivery-platform/apify-wolt-client.ts`
- Function: `fetchWoltRestaurant(url, apiToken) → ApifyWoltResult | null`
- Calls Apify actor, normalizes opening hours + menu items
- Handles empty dataset (restaurant not found → null)

### M2 — Update enrich-delivery-menus.ts
- Replace Wolt branch: use `fetchWoltRestaurant` instead of `woltClient.fetchMenuData`
- Remove unused imports: `createWoltClient`, `StaticCityGeocoder`, `woltClient` variable
- Add API token validation at startup
- Add opening hours to RPC payload (additive-only)
- Track `openingHoursWritten` in stats

### M3 — Verification
- TypeScript compiles clean
- Existing tests still pass
- Logic verified: menu items and opening hours only written to empty fields

## Acceptance Criteria

1. `enrich-delivery-menus.ts` uses Apify actor for Wolt URLs (not `fetchMenuData`)
2. Opening hours from `openingTimesSchedule` are written to provider when:
   - Provider has no existing `opening_hours`
   - Apify returned valid schedule data
3. Old Wolt HTTP client preserved for backward compatibility
4. `APIFY_API_TOKEN` env var required only when Wolt links exist in the batch
5. Dry run shows both menu items AND opening hours in preview
6. Stats output includes opening hours written count

## Commits

No commits planned yet — user to review and approve before commit.
