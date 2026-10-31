---
status: accepted
---

# Halal screening uses a per-provider timestamp guard; bar categories are soft signals, not early exits

The halal compliance pipeline (`enrich-halal-compliance.ts`) screens food Providers for alcohol and pork signals. Without a guard, re-running the pipeline re-screens every pending Provider, wasting Apify calls on Providers already found clean. A `food_providers.halal_screened_at` timestamp marks each Provider as screened; the pipeline skips them until the timestamp is older than 90 days or `--force` is passed.

Bar-type Google Maps categories (Bar, Pub, Cocktail bar, etc.) were initially treated as definitive alcohol indicators, triggering an early exit that staged `no_alcohol=false` without checking the menu. This is inaccurate: a venue categorised as a bar can be alcohol-free (e.g. a mocktail bar, a shisha bar miscategorised). Only the explicit `"Serves alcohol": true` Maps attribute remains a hard early exit; bar categories are downgraded to a soft signal passed into `detectCompliance()` alongside menu text.

## Considered options

### Screening guard

- **`halal_screened_at` on `food_providers` (chosen).** Follows the `apify_checked_at` pattern on `provider_delivery_links`. One column, one WHERE clause extension, no new table.
- **A `screened_clean` row in `enrichment_candidates`.** No schema change, but `enrichment_candidates` rows require a `proposed_value`; a "nothing found" row has no value to propose and overloads the table's purpose.
- **Reuse `providers.last_enriched_at`.** Already exists, but it covers all enrichment pipelines, not just halal screening. A delivery-menu enrichment run would reset the halal guard.

### Bar categories

- **Hard early exit on bar categories (rejected).** Fast, but produces false positives: an alcohol-free venue with a bar category gets `no_alcohol=false` without menu evidence.
- **Soft signal into `detectCompliance()` (chosen).** The category adds weight to a menu-based signal but never substitutes for it. A bar with no alcohol keywords in the menu is not flagged.
- **Drop bar categories entirely.** Discards useful signal. A menu item named "Bier" in a restaurant is weaker evidence than "Bier" in a venue categorised as a bar.

## Consequences

- Migration adds `halal_screened_at TIMESTAMPTZ DEFAULT NULL` to `food_providers`.
- `listProviders` WHERE clause becomes `halal_screened_at IS NULL OR halal_screened_at < now() - interval '90 days'`, skipped when `--force` is set.
- The timestamp is written at the end of processing, so a crash mid-pipeline leaves the Provider eligible for retry.
- `--force` overwrites the timestamp with the current date after completion.
- `ALCOHOL_CATEGORIES` is removed from the early-exit path. The category is noted in the per-provider log line as metadata; `detectCompliance()` is unchanged.
- The only hard early exit remaining is `"Serves alcohol": true` in Maps `additionalInfo`.
- Existing tests for the bar-category early exit must be rewritten to expect menu fetching and compliance detection.
