# Architecture Review: Plan 141 — Nearby Food-Only Proximity Rework

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-06-04 | opencode (architect) | Initial architecture review |

## Summary Verdict

**APPROVED_WITH_CHANGES**

The plan is architecturally sound and follows established project patterns. Two non-blocking issues should be addressed before implementation: (1) the `acos()` argument clamp to prevent NaN on floating-point edge cases, and (2) removing the `STABLE` keyword from the RPC declaration for codebase consistency.

---

## Findings

### F1: Missing acos argument clamp for Haversine NaN edge case

**Severity**: Non-blocking (recommended fix)

**Description**: The Haversine formula can produce arguments to `acos()` outside [-1, 1] due to floating-point rounding when points are very close together or at antipodal positions. The plan's risk analysis identifies this (`acos(NaN)`) but defers mitigation ("add if production data shows errors"). This is a well-known edge case with a trivial one-line fix:

```sql
acos(GREATEST(-1, LEAST(1, ...)))
```

The plan computes the Haversine expression twice (once in SELECT, once in WHERE clause), doubling the surface area for this edge case.

**Recommendation**: Clamp the acos argument inline in both the SELECT and WHERE clauses. A CTE could deduplicate the distance calculation, but that's optional since this is a low-volume RPC (max 5 rows).

---

### F2: `LANGUAGE sql STABLE` — inconsistent with existing RPCs

**Severity**: Non-blocking (consistency)

**Description**: The plan declares `LANGUAGE sql STABLE`. All existing `LANGUAGE sql` RPCs in the codebase omit `STABLE` (see `089_fix_search_food_concepts_junction.sql`, `archive/077_food_search_prefix_matching.sql`, and others). While `STABLE` is technically correct for a read-only function and is used by older `LANGUAGE plpgsql` functions in `001_baseline.sql`, using it on a `LANGUAGE sql` function breaks from the established convention.

**Recommendation**: Remove `STABLE` to match existing `LANGUAGE sql` RPC style:

```sql
LANGUAGE sql SECURITY INVOKER
```

---

### F3: Two-path fallback strategy — clean but has a double-query cost on persistent RPC failure

**Severity**: Non-blocking (observational)

**Description**: On RPC error, the queryFn falls through to the city-based fallback. This means if the RPC is consistently broken (permissions, function dropped, schema mismatch), every provider detail page load executes 2 queries instead of 1. This is the correct behavior for a client-rendered fallback — availability over performance — and matches the plan's error-handling philosophy. The impact is negligible at current scale (<5K providers).

**Recommendation**: Accept as-is. If RPC error rates become significant, add a client-side flag to skip the RPC attempt after N consecutive failures per session.

---

### F4: `queryKey` includes `address_city` — but RPC path never uses it

**Severity**: Non-blocking (correctness)

**Description**: The proposed `queryKey` is `['provider-nearby-food', provider.provider_id, provider.location_latitude, provider.location_longitude, provider.address_city]`. The `address_city` field is included but only the fallback path uses it. Because `queryKey` is used for caching, including unused fields is harmless but means the cache invalidates when `address_city` changes even if the RPC result would be identical.

**Recommendation**: Minor nit — acceptable as-is since the staleTime (5 min) limits churn, and `address_city` changing alongside coordinates is a realistic scenario that should trigger a refetch.

---

### F5: Test strategy — mocked `useQuery` provides no coverage of queryFn logic

**Severity**: Non-blocking (adequacy concern)

**Description**: The plan acknowledges that all tests mock `useQuery` entirely, meaning the actual RPC call, fallback branching, error handling, and Supabase interaction are never exercised. The new tests verify queryKey changes and component rendering given mock data, but do not test that:
- The RPC path is preferred when lat/lng are non-null
- The fallback path activates when RPC errors
- The empty fallback is triggered when lat/lng and `address_city` are both null

Per the project's testing pattern, this is consistent with the existing test suite approach. However, the fallback branching logic is an ideal candidate for a focused function-level test if the queryFn were extracted.

**Recommendation**: Accept for now. If this component develops more branching logic in the future, extract the queryFn to a service function and unit-test it with a mocked Supabase client.

---

### F6: `distance_km` returned by RPC but discarded by the frontend

**Severity**: Non-blocking (missed opportunity)

**Description**: The RPC computes and returns `distance_km`, but the frontend type (`NearbyResult`) only captures `provider_id` and `provider_name`. The plan lists distance display as a future consideration. Returning an unused column is slightly wasteful (though negligible for 5 rows).

**Recommendation**: Accept as-is — keeping `distance_km` in the RPC signature avoids a future migration to add it back when the UI is ready to display it.

---

## Overall Assessment

The plan is well-structured and demonstrates good understanding of the project's patterns:

| Dimension | Score | Notes |
|-----------|-------|-------|
| Architectural soundness | 9/10 | Correct use of Haversine (no PostGIS needed — aligns with Postgres-first philosophy) |
| Data layer | 8/10 | Migration number is correct (093 follows 092). RPC signature, permissions, and index design are correct. `listing_type_enum` cast matches existing convention (`'food'::listing_type_enum`). |
| Frontend architecture | 9/10 | Clean two-path strategy. Correct separation of concerns (inline queryFn keeps the component self-contained). |
| Test architecture | 6/10 | Consistent with existing patterns but the queryFn branching logic is untested. |
| Security | 10/10 | SQL injection is not possible — `LANGUAGE sql` with parameterized arguments uses strict parameter binding. `SECURITY INVOKER` + `GRANT EXECUTE TO anon/authenticated` matches existing migration patterns (e.g., `090`, `091`). |
| Consistency with codebase | 7/10 | Nearly all patterns match. Only the `STABLE` keyword diverges. |

### Next steps

1. **Before implementation**: Add the `GREATEST(-1, LEAST(1, ...))` clamp to the acos argument and remove `STABLE` from the RPC declaration.
2. **Before merge**: Verify migration runs on UAT, run `npm run type-check && npm run lint && npm test`.
3. **Post-deployment**: Monitor Supabase logs for RPC errors on the `find_nearby_food_providers` function to ensure the permissions and function signature are correct.
