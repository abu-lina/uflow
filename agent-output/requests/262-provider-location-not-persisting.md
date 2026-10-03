---
ID: 262
Origin: 262
UUID: 262-provider-location-not-persisting
Status: Active
Type: bug
Branch: fix/262-provider-location-not-persisting
Worktree: ../uflow-wt/262-provider-location-not-persisting
Created: 2026-09-26
---

# Request 262: Additional provider locations silently dropped on save

## Original request

> on desktop https://uat.ummahflow.com/dashboard/providers/a9e5e969-5552-452b-ad6e-16158dcdaf04/edit/locations
> when i add an additional location i noticed after saving the entire provider and checking the provider
> details it doesnt show the additional location and when going into the edit mode again the location is
> not there.

## Classification

- **Type:** bug
- **Route:** Bug flow (Diagnose -> Fix -> Code Review -> Done)
- **Confidence:** high

## Phases

| #   | Phase                 | Status | Outcome                                                                          |
| --- | --------------------- | ------ | -------------------------------------------------------------------------------- |
| 0   | Tracking file created | Done   | This file                                                                        |
| 1   | Diagnose              | Done   | Root cause confirmed in `admin_update_provider` RPC                              |
| 2   | Fix                   | Done   | Migration `133`, commit `535377c3` (reworked from a stale `129`)                 |
| 3   | Code Review           | Done   | Reviewed by lead; diff vs `131` clean, control flow verified                     |
| 4   | Done                  | Done   | Pushed; PR [#422](https://github.com/abu-lina/uflow/pull/422); learning captured |

## Diagnosis

Save returns HTTP 200 and the new location is silently discarded. The failure is in the
`admin_update_provider` RPC, not in the frontend or the API contract.

**Verified working (ruled out):**

- `edit/locations/page.tsx` stages locations to `localStorage[admin_edit_locations_<id>]`.
- `ProviderEditForm.syncFromLocalStorage()` reads `${pfx}edit_locations_${pid}` into `formData.locations`
  (<ref_snippet file="/Users/NARAFIQ/Projects/uflow/src/features/providers/pages/ProviderEditForm.tsx" lines="239-247" />).
- `dashboard/providers/[id]/edit/page.tsx` includes `locations` in the PATCH body (lines 135-136).
- `providerEditUpdateSchema` has `locations: z.array(locationSchema).optional()` — not stripped by Zod.
- `buildLocationsPayload` / `updateProviderFields` forward `locations` into `p_data`.

**Root cause — defect A (the reported symptom):**

`supabase/migrations/124_fix_nullable_string_coalesce.sql` lines 208-247 branch on whether
`location_id` is present:

- `location_id` present -> `UPDATE ... WHERE location_id = v_location_id AND provider_id = p_provider_id`
- `location_id` absent -> `INSERT`

`createDefaultLocation()` in the locations sub-page assigns `location_id: crypto.randomUUID()` to every
**new** location. So a new location takes the UPDATE branch, matches **zero** rows, and is silently
discarded (a 0-row UPDATE is not an error). The phantom UUID is then appended to `v_existing_ids`, so the
trailing delete-sweep leaves the pre-existing rows intact. Net effect: existing locations survive, the new
one vanishes — exactly as reported.

**Root cause — defect B (latent, would block the naive fix):**

The `ELSE` (insert) branch never appends the inserted row's id to `v_existing_ids`. The delete-sweep at
lines 250-252 (`DELETE ... WHERE location_id <> ALL(v_existing_ids)`) would therefore delete any location
inserted without an id in the same call. So simply dropping the client-generated `location_id` would not
fix the bug — the row would be inserted and then immediately deleted.

**Not verified:** that the deployed UAT database actually runs migration 124's definition. Both Supabase
MCP servers failed to list tools and no `SUPABASE_DB_URL` is present locally. Migration 124 is the newest
of the 6 migrations defining `admin_update_provider` (125-128 do not touch it), so the migration files are
internally consistent. Confirming the live function definition is a step in the Fix phase.

## Decisions

| #   | Decision       | Choice                                        | Rationale                                                                                                                                                                                                                                                                              |
| --- | -------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fix layer      | New migration, DB-only (landed as `133`)      | Makes the RPC honour a caller-supplied UUID as a true upsert (what migration 102 already promised). Keeps React `key={loc.location_id}` stable and the Zod contract unchanged. Fixes every caller, not just this page.                                                                 |
| 2   | Tenancy safety | Raise when the id belongs to another provider | Preserves the `provider_id` guard the original UPDATE had; prevents a client-supplied UUID from hijacking another provider's row or hitting a bare PK unique violation.                                                                                                                |
| 3   | Migration base | Rebuild as `133` on top of `131`, not `124`   | `origin/main` moved mid-request and added `131_admin_update_provider_tri_state_halal.sql`, a newer full-body definition of the same function. The original `129` would have collided on number and either been overwritten by `131` or silently reverted `131`'s tri-state halal work. |

## Implementation notes

- Branch: `fix/262-provider-location-not-persisting`, single commit `b22b574e` on top of `origin/main`
- Files changed:
  - `supabase/migrations/133_fix_location_upsert_supplied_id.sql` (new, 303 lines)
  - `src/__tests__/migrations/133-location-upsert-supplied-id.test.ts` (new, 9 assertions)
- The superseded `129_fix_location_upsert_supplied_id.sql` and its test were removed during rework.

## Review findings

Reviewed by the lead against the merge-base.

### Standards axis

- `diff origin/main:131 -> 133` produces exactly three hunks: header comment, locations block, `COMMENT ON FUNCTION`. No drift in the providers / food_providers / store_providers / menu_items / delivery_links / community_service_ids blocks.
- Control-flow nesting hand-verified balanced: `IF locations` (216/286), `IF array_length` (218/282), `FOR..LOOP` (219/281), `IF id IS NOT NULL` (224/253), `IF FOUND` (242/245), `IF EXISTS` (249/252).
- All four paths traced correct: owned id -> UPDATE + `CONTINUE`; phantom id -> INSERT honouring it; no id -> INSERT with `gen_random_uuid()`; foreign id -> `RAISE EXCEPTION`.
- Verified the two tri-state halal guard strings genuinely originate in `131` (`grep -c` = 1 each), so the carry-forward assertion is meaningful rather than tautological.

### Spec axis

Fixes both diagnosed defects. Scope held to DB-only per Decision 1; no frontend, Zod, or service-layer files touched.

## QA results

- Targeted suite: **pass**, 33/33 across 4 files. Re-run independently by the lead.
- Full suite: **pass**, 280 files / 2542 tests, 0 failures, 2 files + 28 tests skipped.
- `npm run type-check`: clean. `eslint` on the new test: clean.
- CI on PR #422: confirmed actually triggered against `main` (Build Verification, Lint & Type Check, Run Tests, Security Audit), not the idle-gate situation from Plan 255.
- **Runtime behaviour: UNPROVEN.** The 10 assertions only match text in a `.sql` file. Per the Plan 255 learning this does not count as coverage. Migration `133` has not been applied to any database and no location has been observed persisting. Applying it to UAT and re-testing the reported flow is required to close this.

## Final scope

Three defects fixed in `supabase/migrations/133_fix_location_upsert_supplied_id.sql`:

- **A** Client-generated `location_id` forced a 0-row UPDATE, silently discarding new locations (the reported bug).
- **B** The INSERT branch never appended the inserted id to `v_existing_ids`, so the delete-sweep removed the row it had just inserted. This is why dropping the client UUID alone would not have worked.
- **C** An empty or JSON-null `locations` payload wiped every location, because `x <> ALL(ARRAY[]::uuid[])` is true for all rows. Sweep now sits inside the non-empty-array check. (Promoted from Follow-up on the user's call.)

## Follow-up requests

- ~~Empty-array delete-sweep wipes all locations.~~ **Resolved in this request** as defect C, on the
  user's decision to fix it here rather than defer.
- `v_listing_type` is selected into at the top of `admin_update_provider` and never read, carried
  verbatim through migrations 124, 131, and now 133. Dead variable; harmless but worth deleting next time
  the function is touched.
- The one-primary-per-provider partial unique index (`idx_locations_unique_primary`) makes the loop
  order-sensitive: a payload that promotes a new location to primary before demoting the old one would
  raise. Safe today only because `addLocation` appends and the form enforces a single primary, so the
  demotion is processed first. Fragile invariant, not currently reachable.

## Learnings

_Captured after review and test (workflow.mdc rule)._
