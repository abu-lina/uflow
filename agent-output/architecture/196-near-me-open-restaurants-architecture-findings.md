---
ID: 196
Origin: 196
UUID: e5a3b7d1
Status: Active
---

# Architecture Findings 196 — "Near Me + Open Now" Restaurant Search

| Field    | Value                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chain ID | 196 (inherited)                                                                                                                                                                                                                |
| Reviewed | [Plan 196](../planning/196-near-me-open-restaurants-search-plan.md), [Analysis 196](../analysis/196-near-me-open-restaurants-search-analysis.md), [Critique 196](../critiques/196-near-me-open-restaurants-search-critique.md) |
| Verdict  | **APPROVED**                                                                                                                                                                                                                   |
| Memory   | NO-MEMORY MODE                                                                                                                                                                                                                 |

## Changelog

| Date (UTC) | Agent     | Change                        | Outcome                                                               |
| ---------- | --------- | ----------------------------- | --------------------------------------------------------------------- |
| 2026-07-21 | architect | Architecture review completed | APPROVED — aligned with existing architecture; no structural conflict |

---

## Verdict: APPROVED

The proposed design is architecturally sound, aligns with the Postgres-first principle, reuses existing primitives correctly, and introduces no new external services or structural risks. Implementation may proceed.

---

## System Fit Assessment

| Dimension                    | Status  | Notes                                                                                                                                                       |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres-first               | ✅ PASS | Haversine in SQL, no PostGIS; matches `find_nearby_food_providers` precedent                                                                                |
| Discovery flow compatibility | ✅ PASS | Extends the existing "Search → Service → Cards" flow with a location-aware path                                                                             |
| RLS / Data boundaries        | ✅ PASS | `locations` already has "Locations are publicly readable" policy; RPC is `SECURITY INVOKER` over read-only public data; no new privilege escalation surface |
| Service layer convention     | ✅ PASS | New service function in `src/services/` calls the new RPC; follows established pattern                                                                      |
| Client component pattern     | ✅ PASS | Geolocation hook + `getOpenStatus` filter are client-side; search page already uses `'use client'` patterns for interactivity                               |
| Observability                | ✅ PASS | Analysis specifies `search_near_me` event (normal) + debug-gated candidate decisions; aligns with system observability requirements                         |
| Cache implications           | ✅ N/A  | Client-side RPC call with unique coordinates each time — no caching surface; no conflict with ADR-004                                                       |
| Security posture             | ✅ PASS | Critic conditions F1/F2 (server-side LIMIT/radius clamp + coordinate validation) close the anon-abuse vector; no auth/state mutation added                  |

---

## Architectural Observations (non-blocking, for record)

### O1 — Dual query path on `/search` (information, not risk)

The search page gains a **second query path**: text-based search (existing `search_offers`/`search_providers` RPCs) vs. proximity-based search (new `search_food_near_me` RPC). These are **mutually exclusive** at runtime (user toggles "near me" on/off), so there is no composition complexity — the UI switches the backing query, not merging two result sets.

**No action needed** — but document in the search page's header comment that two query paths exist.

### O2 — RPC is food-only; section extension is straightforward

The new RPC filters `listing_type = 'food'`. If "near me" is later requested for STORES or UMMAH, a parameterized `p_listing_type` argument can be added. Current approach is YAGNI-correct: only food has the "open now" + "near me" need today.

### O3 — `locations` index will be the first non-trivial read index on that table

Today `locations` has two lightweight indexes (`provider_id`, `address_city`) + the unique primary-per-provider constraint. The new partial index (approved food + non-null coords) is the first scan-optimized index for a direct user query. This is fine; flagging for awareness during EXPLAIN verification (M2 acceptance criteria already requires it).

### O4 — Single-timezone assumption is safe today but explicit

`getOpenStatus` uses device-local time. All current providers are in Germany (DE). If listings span timezones (e.g., AT/CH expansion), a per-location timezone annotation would be needed. **Not blocking** — mentioned in Analysis system-weaknesses; documented here for design-debt awareness.

---

## Integration with Existing Architecture Patterns

| Pattern                                                    | How Plan 196 aligns                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| RPC naming (`verb_noun_qualifier`)                         | ✅ `search_food_near_me` follows `find_nearby_food_providers`, `search_offers` precedents               |
| Grant convention (anon/authenticated/service_role)         | ✅ Specified in plan M2                                                                                 |
| Migration numbering (sequential in `supabase/migrations/`) | ✅ Plan specifies additive migration                                                                    |
| TypeScript service layer                                   | ✅ New function in `src/services/` (or inline in `providers.ts`)                                        |
| Feature folder (`src/features/`)                           | ✅ Geolocation hook + NearMe UI belong in `src/features/search/` or extend current search page directly |
| Partial index convention                                   | ✅ Matches `idx_providers_food_approved_location` pattern but targets `locations` table                 |

---

## Conflict Scan Against Known Problem Areas

| Problem Area                    | Conflict? | Notes                                                                                                                                                                                                                                                            |
| ------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PA-1 (Role fragmentation)       | No        | Read-only; no role check needed                                                                                                                                                                                                                                  |
| PA-4 (App Router value leakage) | No        | Search page is already client-rendered for interactivity; adding geo controls doesn't change the SSR boundary                                                                                                                                                    |
| PA-10 (`provider_stats` drift)  | No        | Not touching MV                                                                                                                                                                                                                                                  |
| PA-11 (Badge/Boolean coherence) | No        | Not touching filters that rely on boolean columns                                                                                                                                                                                                                |
| PA-12 (Schema structural debt)  | No        | Additive change only; doesn't touch dual-PK tables or UUID arrays                                                                                                                                                                                                |
| PA-13 (Migration management)    | Low       | New migration follows forward-only pattern from baseline; won't regress other envs                                                                                                                                                                               |
| PA-15 (Supertype monolith)      | **Note**  | The RPC JOINs `locations → providers` where `listing_type = 'food'`. If FL-26 supertype unification happens, the enum value might change from `'food'` to something else — but the RPC filter is trivially patchable. No pre-emptive abstraction needed (YAGNI). |

---

## ADR Integration (into system-architecture.md)

No new ADR is required — Plan 196's approach is a **natural extension** of established patterns (haversine RPC, `SECURITY INVOKER`, additive migration, client-side filtering). The decision to add a new RPC rather than generalize `find_nearby_food_providers` is a localized technical choice, not an architectural precedent-setting decision.

**Master doc changelog entry** will be added when the implementation is completed and merged (reconciliation trigger per Architect session-start protocol). Nothing to pre-update since this is APPROVED and the architecture hasn't changed yet.

---

## Recommendations for Implementer

1. Place the geolocation hook in `src/hooks/useGeolocation.ts` (shared utility — not domain-specific enough for a feature folder).
2. The RPC service function should go in `src/services/providers.ts` alongside the existing nearby call, keeping the providers service as the single service module for provider-related queries.
3. Return `opening_hours` from the RPC as raw JSONB — the client already has the typed parser (`getOpenStatus`); don't add a SQL-side open-now column.
4. The "near me" control on the search page should integrate as an additional filter state alongside the existing `selectedWas`/`selectedWo` pattern, not as a separate page or route.
