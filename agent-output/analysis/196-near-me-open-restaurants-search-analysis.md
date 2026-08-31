---
ID: 196
Origin: 196
UUID: c4e1d8a6
Status: Active
---

# Analysis 196 — "Near Me + Open Now" Restaurant Search: Investigation

| Field        | Value                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Chain ID     | 196 (inherited from Plan 196)                                                                          |
| Source Plan  | [196-near-me-open-restaurants-search-plan.md](../planning/196-near-me-open-restaurants-search-plan.md) |
| GitHub Issue | https://github.com/abu-lina/uflow/issues/282                                                           |
| Scope        | Resolve the 4 REQUIRES ANALYSIS items only                                                             |
| Memory       | NO-MEMORY MODE (daemon reported no workspace folder)                                                   |

## Changelog

| Date (UTC) | Agent   | Change                                                                                                              |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| 2026-07-21 | analyst | Analysis created; resolved items #2/#3/#4 at L1/L2; item #1 (coverage) left as instrumentation gap with exact query |

---

## Value Statement and Business Objective

Enable a mobile user (evening, on the go) to find restaurants **near their location** that are **open now**. This analysis de-risks implementation by converting the plan's four unknowns into evidence-backed determinations so the Implementer builds on the correct primitives with minimal rework.

## Objective of This Analysis

Resolve the four REQUIRES ANALYSIS items from Plan 196:

1. Data coverage (coordinates + opening hours for approved food providers).
2. RPC strategy (new function vs. generalize `find_nearby_food_providers`).
3. Open-now placement (SQL vs. client-side).
4. Multi-location distance semantics.

## Methodology

Read-only code and migration inspection; grep-based caller enumeration; DB-connectivity probes for a live coverage query. Confidence levels per `analysis-methodology`: **L1 Proven** (directly verified in code), **L2 Observed** (high-confidence inference), **L3 Inferred** (needs live validation).

---

## Findings

### Item #2 — RPC Strategy → **Recommend NEW RPC** (Confidence: **L1 Proven**)

**Evidence:**

- `find_nearby_food_providers(p_lat, p_lon, p_exclude_id, p_radius_km, p_limit)` returns only `(provider_id, provider_name, distance_km)` — [093_plan_141_nearby_food_haversine.sql](../../supabase/migrations/093_plan_141_nearby_food_haversine.sql).
- It has **exactly one caller**: [ProviderDetailSections.tsx](../../src/features/providers/components/ProviderDetailSections.tsx#L176), which passes `p_exclude_id` (the current provider) and needs only name + distance for a small "related nearby food" list.
- It filters on **provider-level** coords (`providers.location_latitude/longitude`) and has **no open-now** filter and **no category/text** filter.

**Determination:** A user-facing near-me search needs (a) richer return columns for result cards (coordinates, `address_city`, `opening_hours`, images, category), (b) no `p_exclude_id`, and (c) per-location distance (see #4). Changing the existing function's **return signature** would break the typed caller and its "related nearby" UX for zero benefit. Adding a **new** function (e.g., `search_food_near_me`) isolates risk entirely.

**Recommended resolution:** Add a **new** SECURITY INVOKER function that reuses the clamped-haversine pattern, queries `locations` joined to approved food providers, returns card-ready columns + `distance_km`, and grants EXECUTE to `anon/authenticated/service_role`. Leave `find_nearby_food_providers` untouched. This confirms the plan's recommended default.

---

### Item #3 — Open-Now Placement → **Recommend CLIENT-SIDE** over radius-limited set (Confidence: **L1 Proven** for logic; **L2 Observed** for scale)

**Evidence:**

- `getOpenStatus` ([src/utils/openStatus.ts](../../src/utils/openStatus.ts)) computes open/closed using the **device's local time** (`now.getHours()/getMinutes()`), correctly handles **overnight windows** (close ≤ open) and overnight carry-over from the previous day, and returns next-change info. It is already unit-tested and drives `OpenStatusLine`.
- The persisted `opening_hours` shape is the canonical weekday-object `{ monday: { open, close }, … }` ([src/types/openingHours.ts](../../src/types/openingHours.ts)); the delivery-enrichment array shape `[{day,opens,closes}]` is converted to canonical **before** persistence ([normalizer.ts](../../src/lib/enrichment/delivery-platform/normalizer.ts#L55)), confirmed by [auto-apply-payload.test.ts](../../src/lib/enrichment/__tests__/auto-apply-payload.test.ts#L121).

**Determination:**

- Replicating open-now in SQL means re-implementing overnight logic + a timezone assumption (Europe/Berlin) in PL/pgSQL and parsing JSONB weekday windows — a **DRY violation** and a **timezone-correctness risk** (SQL would use server time, not the user's device time).
- The candidate set is **radius-limited** (e.g., ≤10 km), so it is small; client-side filtering over it is trivial. This is Postgres-first (no premature SQL complexity) and reuses the single tested source of truth.

**Recommended resolution:** RPC returns candidates within radius (distance-sorted) **including each row's `opening_hours`**; the client filters/labels open-now via `getOpenStatus`. **Implication to document for the Implementer:** when "Open now" is ON, the client filters the returned set, so the RPC must return a **generous candidate cap** within radius (e.g., up to ~100) rather than a tight `LIMIT`, so filtering doesn't starve the list. Pagination, if added, must page over the pre-filter candidate set.

---

### Item #4 — Multi-Location Distance Semantics → **Recommend nearest-location, query the `locations` table** (Confidence: **L1 Proven**)

**Evidence:**

- `locations` table ([101_plan_151_multi_location.sql](../../supabase/migrations/101_plan_151_multi_location.sql)) holds **per-location** `location_latitude`, `location_longitude`, and `opening_hours`; a provider can have multiple rows; exactly one `is_primary`.
- Backfill created one primary location per existing provider mirroring provider-level coords/hours, so **primary-location coords == provider coords** for legacy rows.
- The existing RPC uses only **provider-level** (i.e., primary) coords — a provider with a second location in another city would **not** surface when searching near that second location.
- The sync trigger keeps only `providers.address_city` in sync with the primary location — **not** coordinates — so provider-level and per-location coords can drift over time.

**Determination:** For correctness, "near me" should compute distance against **each location's** coordinates and return the **nearest matching location** per provider (a Berlin+Munich provider should appear near either). Open-now for that result should use the **nearest location's** `opening_hours`, falling back to provider-level hours (mirrors `OpenStatusLine`'s resolution order). Querying `locations` also works for single-location providers (backfilled), so it is strictly more correct with no downside.

**Recommended resolution:** New RPC joins `locations l` → `providers p` (filter `p.listing_type='food' AND p.review_status='approved'`, `l.location_*` non-null), computes per-location haversine, and returns the nearest location row per provider (e.g., `DISTINCT ON (provider_id) … ORDER BY provider_id, distance_km`). Return the location's `opening_hours` for the client open-now step.

---

### Item #1 — Data Coverage → **UNRESOLVED (Confidence: L3 Inferred)** — requires a live query

**Why unresolved:** No local Supabase stack is running (`supabase status` empty; port 54322 refused) and only `NEXT_PUBLIC_SUPABASE_URL` is present in env — there are **no DB credentials** available in this environment to run a production/staging coverage query, and I must not use production credentials ad hoc. Per the uncertainty hard-pivot rule, I stopped here rather than spinning up a stack (seed coverage ≠ production coverage).

**L2 proxy evidence:** The columns and canonical `opening_hours` shape exist and are populated by the enrichment pipeline and admin edit flows, so the fields are real and structured — but the **percentage** of approved food providers with _both_ usable coords and hours is unknown without a query.

**Exact query to run (Supabase SQL editor / staging) — resolves this item:**

```sql
-- A) Provider-level readiness
WITH food AS (
  SELECT provider_id, location_latitude, location_longitude, opening_hours
  FROM public.providers
  WHERE listing_type = 'food' AND review_status = 'approved'
)
SELECT
  count(*)                                                                              AS total_food_approved,
  count(*) FILTER (WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL) AS with_coords,
  count(*) FILTER (WHERE opening_hours IS NOT NULL)                                      AS with_hours,
  count(*) FILTER (WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL
                        AND opening_hours IS NOT NULL)                                   AS ready_both,
  round(100.0 * count(*) FILTER (WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL
                        AND opening_hours IS NOT NULL) / NULLIF(count(*),0), 1)          AS pct_ready
FROM food;

-- B) Location-level readiness (the surface the new RPC should query)
SELECT
  count(*)                                                                              AS total_food_locations,
  count(*) FILTER (WHERE l.location_latitude IS NOT NULL AND l.location_longitude IS NOT NULL) AS loc_with_coords,
  count(DISTINCT l.provider_id) FILTER (WHERE l.location_latitude IS NOT NULL AND l.location_longitude IS NOT NULL) AS providers_locatable
FROM public.locations l
JOIN public.providers p USING (provider_id)
WHERE p.listing_type = 'food' AND p.review_status = 'approved';

-- C) opening_hours shape sanity (should be ~100% object, ~0 array)
SELECT
  count(*) FILTER (WHERE jsonb_typeof(opening_hours) = 'object') AS object_shape,
  count(*) FILTER (WHERE jsonb_typeof(opening_hours) = 'array')  AS array_shape
FROM public.providers
WHERE opening_hours IS NOT NULL AND listing_type='food' AND review_status='approved';

-- D) Multi-location prevalence (does #4 matter in practice today?)
SELECT count(*) AS providers_with_multiple_locations
FROM (SELECT provider_id FROM public.locations GROUP BY provider_id HAVING count(*) > 1) x;
```

**Decision guidance for whoever runs it:**

- If `pct_ready` is high (say ≥60%): proceed as planned.
- If low: the feature still ships, but M5's empty-state/fallback copy and possibly a data-backfill task become higher priority — surface this to Planner/Roadmap. Query **D** tells you whether the nearest-location logic (#4) is exercised today or is future-proofing.

---

## System Weaknesses (surfaced for hardening, not blocking)

1. **No DB-level guarantee of canonical `opening_hours` shape.** Legacy/manual rows could hold a non-canonical shape; `getOpenStatus` silently returns "hidden" for those, so such providers would never show as "open." Query **C** quantifies this; a CHECK/normalization is a possible future hardening.
2. **Provider-level vs. location-level coordinate drift.** The sync trigger syncs `address_city` only, not coords/hours. Querying `locations` (per #4) avoids reliance on the provider-level snapshot.
3. **No index yet for location-based radius search.** The existing partial index is on `providers` for the food/approved/coords predicate; a matching partial index on `locations` (approved food, non-null coords) will be needed for the new RPC — flagged for M2.
4. **Timezone assumption.** `getOpenStatus` uses device-local time — correct while all providers are in a single timezone (DE). If listings ever span timezones, open-now (client or SQL) needs a per-location timezone. Out of scope now; noted for future.

## Instrumentation Gaps (normal vs. debug)

- **Normal (always-on, low-volume):** emit a `search_near_me` event with `{ radius_km, result_count, open_now_count, permission_state }`. Enables the plan's north-star metric (searches surfacing ≥1 open result) and gives an ongoing signal on data coverage without ad-hoc SQL. No PII (no raw coordinates).
- **Debug (flag-gated):** when a debug flag is on, log candidate `{provider_id, location_id, distance_km, isOpen}` decisions to triage "why did/didn't X show up." High-cardinality; short windows only; no coordinates persisted.
- **Immediate gap:** the coverage query (item #1) — run once in staging/prod SQL editor to unblock the coverage decision.

## Analysis Recommendations (next steps, analysis-scoped)

1. Run the item #1 coverage query in a credentialed environment and record results back into this doc (flips #1 to L1).
2. Planner folds the resolved determinations (#2 new RPC, #3 client-side open-now with generous candidate cap, #4 nearest-location via `locations`) into M2/M3 acceptance criteria, and adds the M2 `locations` partial-index task.
3. Critic reviews the updated plan (gate: APPROVED before implementation).

## Open Questions

- **[OPEN — needs live query]** Item #1 coverage percentages and multi-location prevalence (query provided above).
- **[RESOLVED]** Items #2, #3, #4 — determinations above with L1 evidence.
