---
ID: 151
Origin: 151
UUID: f8d9c4e1
Status: Active
---

# UAT Report 151: Multi-Location Support

## Verdict
APPROVED FOR RELEASE — with Phase 2 commitment for city search indexing

## Scenario Results

### Scenario 1: Browsing — PASS (with note)
The "N Standorte" badge appears on ProviderCard when `locations.length > 1`. The card shows the primary location's address and falls back to legacy fields when `locations` is absent. **Note**: multi-city providers only appear in search results for their primary city, not all branch cities. This is the Phase 2 gap documented below.

### Scenario 2: Exploring branches — PASS
All three detail views (page, modal, mobile) include a "Standorte" section. Each branch renders as a LocationCard with address, opening hours indicator, primary badge, and "Open in Maps" link. `locations(*)` join prevents N+1 queries.

### Scenario 3: Switching branches — PASS
Clicking a LocationCard updates `?location=` in the URL via `router.replace`. The selected location is highlighted. Address, opening hours (via OpenStatusLine), and maps link update to the selected branch. Works across all three detail views.

### Scenario 4: Deep linking — PASS
`?location=` URL param is read on mount and survives refresh. The selected location is properly resolved. **Minor gap**: the share button copies only the provider URL without `?location=`, so shared links don't deep-link to a specific branch. This is a UX polish item, not a blocker.

### Scenario 5: Admin management — PASS
The `buildLocationsPayload()` preserves `location_id` values. The RPC uses the upsert pattern: existing IDs get UPDATE, new entries get INSERT, removed entries get DELETE. Tests confirm IDs are preserved and the payload structure is correct.

### Scenario 6: Legacy backward compat — PASS
Providers without `locations` array fall back to `providers.address_street`, `providers.address_city`, etc. The backfill migration (101) creates exactly one location per existing provider. OpenStatusLine falls back to `provider.opening_hours`. No regressions in any detail view or card.

## Value Assessment

### 1. "Easily see if a restaurant has more than one location" — YES
The "N Standorte" badge on the card makes this instantly visible during browsing. The Locations section on the detail page lets users browse all branches. This directly solves the stated need.

### 2. "Smooth way for restaurants to have multiple locations" — PARTIALLY
The schema (1:M FK, partial unique primary index, sync trigger) is clean and well-designed. Provider creation auto-creates a primary location row. The admin RPC upsert pattern is safe. **The gap is city search indexing**: a restaurant chain with branches in Berlin, Hamburg, and Munich only appears when searching for its primary city. This contradicts design decision #2 ("All cities indexed").

### 3. UX gaps for non-technical users — MINOR
- Share button doesn't preserve `?location=` in the copied URL (can't share a specific branch link)
- The "N Standorte" badge text is hardcoded in German ("Standorte") — won't localize when the UI language is English/Arabic/Turkish
- No distinction between the badge showing 2+ locations versus a badge that's clickable (LocationBadge component exists but is not used by ProviderCard — it uses an inline `<div>` instead)

## Known Limitations

| # | Limitation | Impact | Phase |
|---|-----------|--------|-------|
| 1 | **City search indexing**: `searchProviders()` filters by `providers.address_city` (denormalized primary city only). Multi-city providers don't appear in all branch city searches. | Medium — contradicts the "All cities indexed" design decision | Phase 2 |
| 2 | **Share URL**: share button copies `/providers/{id}` without `?location=` — no branch deep-linking | Low — users can still manually add `?location=` | Phase 2 |
| 3 | **Badge hardcoded German**: `{count} Standorte` doesn't use i18n | Low — visible in non-German UIs | Phase 2 |
| 4 | **LocationBadge unused**: the reusable `LocationBadge` component exists but ProviderCard uses inline markup instead | Low — maintenance duplicate | Tech debt |
| 5 | **Sync trigger `is_primary` downgrade**: if admin changes which location is primary, there's a small race window where `providers.address_city` could desync | Low — documented in QA report | Phase 2 |

## Verdict

**APPROVED FOR RELEASE** with the condition that Phase 2 city search indexing is committed to the roadmap. The core user need — "easily see if a restaurant has more than one location" — is fully delivered. The city indexing gap is the only material deviation from the confirmed design decisions, and it's documented as out-of-scope in the plan.
