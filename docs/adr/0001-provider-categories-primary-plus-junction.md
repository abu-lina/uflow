---
status: proposed
---

# A Provider's categories live in a junction table; `providers.category_id` stays as the primary

A Provider needs to be findable under several Categories (a Turkish restaurant that sells Döner), but 134 files and ~12 RPCs read `providers.category_id` as if a Provider had exactly one Category, and `providers.listing_type` is derived from the Category's `applicable_section` at creation time. So we add `provider_categories (provider_id, category_id)` as the complete set of a Provider's Categories and keep `providers.category_id` as the Primary Category pointer, with the invariant that the junction always contains a row for `category_id`. Only matching reads the junction; every display path keeps reading `category_id` and keeps working unchanged.

## Considered options

- **`is_primary` flag in the junction, drop `providers.category_id`.** The purer model, and it removes the redundancy. Rejected for this change: it rewrites every one of those read paths in a single pass, and the FK `providers_category_id_fkey` plus the `ON DELETE SET NULL` behaviour would have to be rebuilt as trigger logic.
- **`category_ids uuid[]` on `providers`.** No join, but gives up referential integrity to `categories` and makes `ON DELETE SET NULL` on a deleted Category impossible to express.
- **Match Döner via the existing menu search.** `food_menu` and `search_food_menu_items` already index dish names, so a Döner query could hit menu items instead. Rejected as the primary fix: most imported Providers have no menu rows, so coverage would be arbitrary.

## Consequences

- The redundancy between `providers.category_id` and the junction is real and must be enforced in the database, not in application code: the Primary row cannot be deleted from the junction, and inserting or changing `category_id` must keep the junction in step.
- Every Category in the junction must have `applicable_section` equal to the Provider's `listing_type` or `all`, otherwise `listing_type` becomes ambiguous.
- Matching must use `EXISTS (SELECT 1 FROM provider_categories ...)` rather than a join, or a Provider with several matching Categories is returned more than once.
- Display paths that still read only `category_id` (gallery images, facet lists, per-Category provider counts, the `/food/[city]/[category]` SEO route) will undercount Secondary Category membership until they are migrated separately. That inconsistency is accepted, not overlooked.
