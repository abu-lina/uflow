---
ID: 196
Origin: 196
UUID: b9d2f0e3
Status: Active
---

# Critique 196 — "Near Me + Open Now" Restaurant Search (Pre-Implementation Review)

| Field        | Value                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chain ID     | 196 (inherited)                                                                                                                                  |
| Reviews      | [Plan 196](../planning/196-near-me-open-restaurants-search-plan.md), [Analysis 196](../analysis/196-near-me-open-restaurants-search-analysis.md) |
| GitHub Issue | https://github.com/abu-lina/uflow/issues/282                                                                                                     |
| Verdict      | **APPROVED WITH CONDITIONS**                                                                                                                     |
| Memory       | NO-MEMORY MODE                                                                                                                                   |

## Changelog

| Date (UTC) | Agent  | Change                                                                                                                |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| 2026-07-21 | critic | Pre-implementation review completed; APPROVED with 4 conditions (2 MEDIUM, 2 LOW) + 1 non-blocking coverage condition |

---

## Verdict: APPROVED WITH CONDITIONS

The plan has a clear user-story value statement, measurable outcome (north-star: searches surfacing ≥1 open result), aligned scope, per-milestone acceptance criteria, sequenced dependencies, risk table, and a version milestone. The Analyst resolved 3 of 4 unknowns at L1. **No CRITICAL or HIGH findings.** Implementation may proceed once the MEDIUM conditions below are folded into M2/M4 acceptance criteria (Planner may tighten wording; Implementer MUST satisfy them regardless).

## Checklist Summary

| Dimension                                                         | Result                                          |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| Value statement (presence/clarity/alignment/directness)           | PASS                                            |
| Plan completeness (scope/deliverables/dependencies/risks/version) | PASS                                            |
| Constraint compliance (no code / WHAT-not-HOW / architecture)     | PASS                                            |
| Postgres-first adherence                                          | PASS (reuses primitives; no premature services) |
| Security posture                                                  | PASS with conditions (see F1/F2)                |

---

## Findings

### F1 — MEDIUM — Server-side candidate cap + radius clamp must live in the RPC

Analysis #3 recommends a "generous candidate cap (~100)" so client-side open-now filtering isn't starved. This cap MUST be enforced as a **server-side `LIMIT`** inside the new RPC, and `p_radius_km` MUST be **clamped to a maximum** server-side. Otherwise an anonymous caller (the RPC grants `anon`) could pass a huge radius and pull the entire `locations` table — a cheap resource-exhaustion vector on a read path.
**Resolution:** Add to M2 acceptance criteria: RPC clamps `p_radius_km` to a documented max and always applies a hard server-side `LIMIT`; the "generous cap" is server-authoritative, not client-trusted.

### F2 — MEDIUM — Validate RPC coordinate inputs

`p_lat` and `p_lon` should be validated/bounded server-side (`p_lat ∈ [-90,90]`, `p_lon ∈ [-180,180]`); out-of-range input should return empty rather than compute garbage distances. Parameterized RPC args already prevent SQL injection (PASS), so this is defensive correctness, not injection.
**Resolution:** Add to M2 acceptance criteria: RPC guards coordinate ranges.

### F3 — LOW — M2 partial index must target `locations`, not `providers`

Analysis #4 moves the query surface to the `locations` table (nearest-location semantics). Plan M2's index task is generic ("Add/confirm a supporting partial index"). Existing index `idx_providers_food_approved_location` is on `providers` and won't serve the new join.
**Resolution:** M2 explicitly adds a partial index on `locations` for the approved-food + non-null-coords predicate; confirm usage with `EXPLAIN`.

### F4 — LOW — Nearest-location ordering correctness

`DISTINCT ON (provider_id) ... ORDER BY provider_id, distance_km` picks the nearest location per provider but yields provider-id ordering; a final re-sort by `distance_km` is required for display order. Flag as an explicit correctness test (wrap in an outer query ordered by distance).
**Resolution:** Add a test to the QA/testing strategy asserting final result order is by ascending distance.

### F5 — LOW (clarification) — Open/closed labels when "Open now" is OFF

When the "Open now" toggle is OFF, cards should still render open/closed status (reuse `OpenStatusLine`/`getOpenStatus`) rather than hiding it, matching existing detail-page behavior and the risk-table note about de-emphasizing closed results.
**Resolution:** M4 acceptance criteria states cards show open/closed status regardless of the toggle; the toggle only _filters_, it doesn't own the labels.

### F6 — NON-BLOCKING CONDITION — Item #1 data coverage still unresolved (L3)

Not an architectural blocker (does not change the RPC/UI design). But if approved-food coverage of coords+hours is low, the empty-state UX (M5) and a possible backfill become higher priority.
**Resolution/condition:** Run the coverage SQL (Analysis 196, queries A–D) in a credentialed environment **before UAT sign-off**; record results in Analysis 196 (flips #1 to L1). Implementation may start in parallel.

---

## Security & Privacy Notes (positive confirmations)

- New RPC as `SECURITY INVOKER` over publicly-readable `locations` (RLS: "publicly readable") + approved-only filter — appropriate; no privilege escalation. PASS.
- User geolocation is client-obtained and not persisted; normal telemetry excludes raw coordinates (Analysis instrumentation section). PASS.
- No auth-protected route or state mutation introduced (read-only discovery). No CSRF/authz surface added. PASS.

## Conditions Rollup (must be honored before/at implementation)

1. **[M2]** Server-side `LIMIT` + `p_radius_km` clamp (F1).
2. **[M2]** Coordinate range validation (F2).
3. **[M2]** Partial index on `locations` + `EXPLAIN` verification (F3).
4. **[M4/QA]** Distance-ascending final ordering test (F4) and open/closed labels independent of toggle (F5).
5. **[Before UAT]** Run coverage SQL and record results (F6).

No conditions require a plan re-loop; they are additive acceptance criteria. **Gate satisfied: APPROVED.**
