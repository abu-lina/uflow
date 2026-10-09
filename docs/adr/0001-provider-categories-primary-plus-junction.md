---
status: accepted
---

# A Provider's categories live in a junction table; `providers.category_id` stays as the Primary Category

A Provider needs to be findable under several Categories (a Turkish restaurant that sells Döner), but 134 files and ~12 RPCs read `providers.category_id` as if a Provider had exactly one Category, and `providers.listing_type` is derived from the Category's `applicable_section` at creation time. So we add `provider_categories (provider_id, category_id)` as the complete set of a Provider's Categories and keep `providers.category_id` as the Primary Category pointer, with the invariant that the junction always contains a row for `category_id`. Only matching reads the junction; every display path keeps reading `category_id` and keeps working unchanged.

The Primary Category is the one shown in results and the one `listing_type` and `entityType` are derived from. Secondary Categories affect matching only, never display. There is no `is_primary` column: a second definition of "primary" is the sync bug this ADR exists to avoid.

## Considered options

- **`is_primary` flag in the junction, drop `providers.category_id`.** The purer model, and it removes the redundancy. Rejected for this change: it rewrites every one of those read paths in a single pass, and the FK `providers_category_id_fkey` plus the `ON DELETE SET NULL` behaviour would have to be rebuilt as trigger logic.
- **`category_ids uuid[]` on `providers`.** No join, but gives up referential integrity to `categories` and makes `ON DELETE SET NULL` on a deleted Category impossible to express.
- **Match Döner via the existing menu search.** `food_menu` and `search_food_menu_items` already index dish names, so a Döner query could hit menu items instead. Rejected as the primary fix: most imported Providers have no menu rows, so coverage would be arbitrary.

## Consequences

- The redundancy between `providers.category_id` and the junction is real and must be enforced in the database, not in application code: the Primary Category row cannot be deleted from the junction, and inserting or changing `category_id` must keep the junction in step. Enforced by one immediate sync trigger on `providers` plus one deferred constraint trigger over both tables.
- Changing a Provider's Primary Category resets its Category set to just the new Primary Category. Carrying the old Primary Category over as a Secondary Category can breach both the cap and the section invariant, and the owner edit path writes `providers.category_id` by plain PostgREST update with no knowledge of the junction, so the trigger has to leave a legal state unaided.
- Every Secondary Category must have the same `applicable_section` as the Primary Category, and `applicable_section = 'all'` Categories may never be Secondary Categories. A Provider whose Primary Category is one of the six `'all'` Categories therefore has no Secondary Categories at all. Without this, `resolveListingType()` and `shouldCreateCommunityService()` contradict each other.
- A Provider is capped at 5 Categories (1 Primary + 4 Secondary), enforced by the same deferred trigger.
- Matching must use `EXISTS (SELECT 1 FROM provider_categories ...)` rather than a join, or a Provider with several matching Categories is returned more than once. Verified: the equivalent join returns 2 rows where `EXISTS` returns 1.
- Display paths that still read only `category_id` (gallery images, facet lists, per-Category provider counts, the `/food/[city]/[category]` SEO route) will undercount Secondary Category membership until they are migrated separately. That inconsistency is accepted, not overlooked.
- Chat registration still collects exactly one Category. Secondary Categories are set only in edit mode.
