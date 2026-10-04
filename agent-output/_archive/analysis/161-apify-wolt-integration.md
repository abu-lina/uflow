---
ID: 161
Origin: 161
UUID: a1b2c3d4
Status: Active
Type: Analysis
Domain: enrichment
---

# Analysis: Apify Wolt Integration for Delivery Menu Enrichment

## Overview

Replace the custom Wolt HTTP client (`fetchMenuData`) with Apify's Wolt Restaurant & Menu Scraper actor. This gives us:

- **Opening hours** — the Apify actor returns `openingTimesSchedule` with per-day open/close times
- **Full menu data** — with prices, categories, images, dietary info (richer than current)
- **Reliable access** — Apify handles anti-bot measures (Cloudflare, rate limiting)
- **Additional data** — website, phone, description (usable in future)

## Current Architecture

```
enrich-delivery-menus.ts
  → wolt-client.ts (fetchMenuData)
    → Wolt restaurant-api.wolt.com/v4/venues/slug/{slug}/menu/data
    → Returns: { items: [{ name, description?, category? }] }
    → No opening hours
    → Prone to blocking / rate limiting
```

## Proposed Architecture

```
enrich-delivery-menus.ts
  → apify-wolt-client.ts (fetchWoltRestaurant)
    → Apify API POST /acts/y0NfA98a3bpJBTodv/runs
    → Input: {"restaurantUrl": "...", "includeDetails": true, "maxItems": 0}
    → Returns: menuItems + openingTimesSchedule + website + phone + etc.
    → Normalizes openingTimesSchedule to our OpeningHours type
```

## Apify Actor Details

| Property | Value |
|----------|-------|
| Actor ID | `y0NfA98a3bpJBTodv` |
| Name | Wolt Restaurant & Menu Scraper |
| Author | needy_hammock |
| Pricing | $0.0015/detailed result (FREE tier) |
| ~Cost for 100 restaurants | $0.15 |
| Last updated | 2026-05-24 |

### Input (for URL mode)

```json
{
  "restaurantUrl": "https://wolt.com/de/deu/restaurant/{slug}",
  "includeDetails": true,
  "maxItems": 0
}
```

### Output (key fields)

| Field | Type | Example |
|-------|------|---------|
| `openingTimesSchedule` | `[{ day, open, close }]` | `[{"day": "Monday", "open": "11:00", "close": "20:45"}]` |
| `menuItems` | `[{ id, name, description, priceInCents, category }]` | Menu items with prices |
| `website` | string | `http://noodlestory.fi` |
| `phone` | string | `+358449898941` |
| `description` | string | Restaurant description |

### Opening Hours Format (Verified)

The actor returns English day names in `openingTimesSchedule`:

```json
[
  { "day": "Monday", "open": "11:00", "close": "20:45" },
  { "day": "Tuesday", "open": "11:00", "close": "20:45" },
  ...
  { "day": "Sunday", "open": "11:30", "close": "20:45" }
]
```

Our `OpeningHours` type uses lowercase English keys:
```typescript
interface OpeningHours {
  monday?: OpeningHoursDay;  // { open: string; close: string } | null
  tuesday?: OpeningHoursDay;
  // ...
  sunday?: OpeningHoursDay;
}
```

The normalizer maps the Apify format to ours.

## Write Strategy (Additive-Only)

| Field | Write condition | RPC payload key |
|-------|----------------|-----------------|
| `menu_items` | Only if existing `food_menu` count is 0 | `p_data.menu_items` |
| `opening_hours` | Only if provider's current `opening_hours` is null | `p_data.providers.opening_hours` |

The `admin_update_provider` RPC uses:
- `CASE WHEN v_providers ? 'opening_hours'` — overwrites if key is present in payload
- Full array replace for `menu_items` (DELETE + INSERT)

## Files Changed

1. **New**: `src/lib/enrichment/delivery-platform/apify-wolt-client.ts` — Apify integration client
2. **Modified**: `scripts/enrich-delivery-menus.ts` — Replace Wolt branch, add opening hours RPC
3. **Unchanged**: `src/lib/enrichment/delivery-platform/wolt-client.ts` — Kept for legacy search-based pipeline

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Apify actor returns empty dataset for some restaurants | Medium | Script handles null result → `skipped` with "not found on Wolt" |
| Cost creep if many restaurants | Low | $0.15/100 restaurants, capped by delivery links count |
| Apify actor changes format | Low | Normalizer maps by known field names; errors handled gracefully |
| Run timeout | Low | `waitForFinish=60` covers typical cases; errors propagate as failures |

## Recommendations

1. Start with a dry run to preview changes
2. Monitor Apify billing dashboard for cost
3. Consider also enriching opening hours from Lieferando/UberEats (they return hours too)
