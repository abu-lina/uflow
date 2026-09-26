---
ID: 263
Origin: 263
UUID: 263-recommend-server-side-writes
Status: Active
Type: bug
Branch: fix/263-recommend-server-side-writes
Worktree: None (worked in the canonical repo)
Created: 2026-09-26
---

# Request 263: Recommending a provider fails with an RLS violation on `locations`

## Original request

> im not able to execute the sql and im getting an error when i want to recommend and submit a provider
>
> ```
> XHR POST https://rdtdtcfntopcxcigkqoq.supabase.co/rest/v1/locations [HTTP/3 403 132ms]
> Error creating primary location: { code: "42501", message: 'new row violates row-level
> security policy for table "locations"' }
> Error creating recommendation: { code: "42501", ... }
> ```

## Classification

- **Type:** bug
- **Route:** Bug flow (Diagnose -> Fix -> Code Review -> Done)
- **Confidence:** high

## Phases

| #   | Phase                 | Status | Outcome                                                         |
| --- | --------------------- | ------ | --------------------------------------------------------------- |
| 0   | Tracking file created | Done   | This file                                                       |
| 1   | Diagnose              | Done   | Two independent RLS defects, both verified empirically          |
| 2   | Fix                   | Done   | Writes moved server-side; commits `a466a0b0`, `ed31c380`        |
| 3   | Code Review           | Done   | Reviewed by lead; 5 defects found and reworked in `ed31c380`    |
| 4   | Test hardening        | Done   | Ported abandoned-branch cleanup coverage; commit `c4bedf58`     |
| 5   | Done                  | Done   | PR [#423](https://github.com/abu-lina/uflow/pull/423), CI green |

## Diagnosis

Two independent RLS defects. The reported error is only the first one hit.

**Defect A — `locations` INSERT policy compares against a nullable column.**

`supabase/migrations/101_plan_151_multi_location.sql` lines 68-77:

```sql
WITH CHECK (
  auth.uid() IN (
    SELECT provider_owner_id FROM public.providers
    WHERE provider_id = locations.provider_id
  )
)
```

A recommendation has `provider_owner_id = NULL` by design. The subquery returns a single NULL row, `x IN (NULL)` evaluates to NULL, and a WITH CHECK of NULL is a denial. This is SQL three-valued logic, not a data problem — no value of `auth.uid()` can ever satisfy it for a recommendation.

**Defect B — the extension tables have RLS enabled and zero policies.**

`supabase/migrations/083_m5a_supertype_unification.sql` lines 114-117 run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on `food_providers` and `store_providers` and never create a policy. Grepping all of `origin/main` for those table names in policy statements returns only those two `ENABLE` lines. No client role can write them — authenticated or not. Because `origin/main` treats the extension write as fatal (it throws and compensates), every food or store submission dies there even once Defect A is fixed.

**Verification method.** Probed each child table over the REST API with the dev project's anon key, using a non-existent `provider_id`. Every table returned `42501` (RLS) rather than `23503` (FK violation), proving the policy rejects the row before the FK is evaluated:

| Table             | Result  |
| ----------------- | ------- |
| `locations`       | `42501` |
| `provider_offers` | `42501` |
| `provider_needs`  | `42501` |
| `provider_badges` | `42501` |
| `food_providers`  | `42501` |
| `store_providers` | `42501` |

**Secondary consequence.** The `providers` insert succeeds before the children fail, so every failed attempt left an orphan `pending` provider with no location. The 228 halal gate can never approve such a row.

## Fix

All provider/service creation writes moved server-side behind `POST /api/providers` using the service-role client, which bypasses RLS. Chosen over a policy migration because:

1. The reporter cannot execute SQL against the database — that was the original constraint.
2. The pre-existing policy fix (`133_recommendation_location_and_cleanup_policies.sql`, on the already-merged `feature/255-create-recommend-menu-2`) addresses Defect A only, so food/store submissions would still fail on Defect B.
3. It removes the browser's direct write access to seven tables and adds a server-side validation boundary.

New files:

- `src/app/api/providers/route.ts` — session required (401 otherwise), 5/hour rate limit, `.strict()` zod allowlist so the body cannot carry `provider_id` / `user_created_id` / `provider_owner_id` / `review_status`, media URLs constrained to our own storage prefix. Ownership derived from the session cookie, never the body.
- `src/features/providers/services/create-provider.server.ts` — all writes via `getSupabaseAdmin()`, behaviour preserved verbatim from the client path. Any failure of a required child write deletes the provider row; if that delete also fails, the error names the orphan id.

`mutations.ts` keeps its signature (no call sites changed) and is now upload-then-`fetch`.

## Code review findings (reworked in `ed31c380`)

Five defects, three of them caused by briefing implementation against a local `main` that was 5 commits behind `origin/main`:

1. The route accepted unauthenticated submissions, re-opening the door the #418 login gate closed. Now 401.
2. `recommender_email` was reintroduced against #255's explicit removal and its two regression tests. Removed.
3. `CreateProviderActor.userId` was `string | null`, keeping the anonymous case representable. Narrowed to `string`.
4. The ummah insert began setting `provider_owner_id` to a user id, but per migration 083 that column holds the linked organisation's `provider_id` on ummah rows. Reverted.
5. `createProviderCommunityServiceRelationship` uses the **browser** Supabase client, so calling it from a `server-only` module would have run with no session and silently dropped every `provider_engagements` link. Replaced with a direct admin-client insert.

Plus one coverage hole: `255-submission-validation.test.tsx` greps `mutations.ts` source for `recommender_email`, so the move made it pass vacuously. Extended to grep all three files.

## Overlap resolution

`feature/255-create-recommend-menu-2` is **already merged** (PR #418, squash-merged as `643a36e3`). Work continued on the merged branch afterwards and was never shipped; the real unmerged delta is 4 files.

- Migration 133 and its 3 file-content assertions — **dropped**. Superseded by the route, unappliable without DB access, and collides with open PR #422's `133_` filename.
- The `mutations.ts` cleanup generalization — **already equivalent** in `create-provider.server.ts`, including rethrowing the original `PostgrestError` so `code`/`details` survive.
- The 4 behavioural tests — **ported** (commit `c4bedf58`). Three were real gaps, most importantly the ummah branch's separate cleanup path, which was completely untested. The fourth was already covered by the existing H4 cases.

Branch left in place, not deleted.

## Verification

- `npx tsc --noEmit` clean
- Full local suite: 281 files, 2554 tests, 0 failures
- CI on PR #423: all 7 checks green (Lint & Type Check, Build Verification, Run Tests, Security Audit, Supply Chain IOC, Snyk, CI Summary)
- Cleanup assertions spot-checked red/green by temporarily removing the `cleanupOrphan` call

Note: a local `npm run lint:check` reported 54 errors, all in untouched files. CI's lint gate is green — the local run was an artifact of `node_modules` (Sep 9) predating `package-lock.json` (Sep 20). CI is the authority.

## Open actions

| Action                                                                                                                                                            | Owner  | Status |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| Land migration 133's `providers` DELETE widening as defence-in-depth, renumbered past PR #422                                                                     | DevOps | Open   |
| Clear existing orphan `pending` providers. Re-check `255-uat-orphan-cleanup.sql`'s "UAT ONLY" scope first — `rdtdtcfntopcxcigkqoq` is the shared UAT+prod project | DevOps | Open   |
| Run `npm ci` locally — `node_modules` is stale against the lockfile                                                                                               | Owner  | Open   |
