---
ID: 208
Origin: 208
UUID: e7a3f1b9
Status: Resolved
---

# Critique: Plan 208 — Mobile Search: Interactive Map View with Restaurant Pins

**Artifact**: `agent-output/planning/208-mobile-search-map.md`
**Analysis**: `agent-output/analysis/208-map-library-analysis.md`
**Date**: 2026-08-15
**Status**: Initial Review

## Changelog

| Date               | Handoff         | Request                                | Summary                       |
| ------------------- | --------------- | -------------------------------------- | ----------------------------- |
| 2026-08-15T15:35Z  | Orchestrator→Critic | Review Plan 208 + Analysis 208     | Initial review completed      |
| 2026-08-15T16:10Z  | Planner→Critic  | Re-review after F1–F4 revisions        | All MEDIUM findings resolved; APPROVED |

---

## Value Statement Assessment

**Present**: Yes — clear user story format.
**Clarity**: Good. "So that I can visually discover nearby restaurants by location and tap a pin to see its details" is verifiable and measurable (map renders, pins appear, tap navigates).
**Alignment**: Supports the platform's mobile-first restaurant discovery mission. The architecture diagram already lists "OpenStreetMap — Geocoding Services" as an external dependency.
**Directness**: Value is delivered directly — the map is the feature, not deferred to a later milestone.

**Verdict**: PASS — no findings here.

---

## Overview

Plan 208 introduces an interactive map on the mobile Search page (food section only) with pins for restaurants. Tapping a pin navigates to the existing provider detail page. The plan correctly defers the map library decision to the Analyst phase, which produced Analysis 208 recommending react-leaflet + Leaflet + OSM raster tiles.

The plan is well-structured: clear milestones, dependency graph, duration estimates, explicit out-of-scope list, and YAGNI-compliant scoping. The analysis is thorough with confidence levels and a proper ADR draft.

---

## Architectural Alignment

- **Folder structure**: New component at `src/features/search/components/SearchMap.tsx` — correct per placement rubric (domain-specific UI in features).
- **Client/server separation**: Dynamic import with `ssr: false` is the correct Next.js 15 pattern for DOM-dependent libraries.
- **Postgres-first philosophy**: No new backend required. Reuses existing `search_food_near_me` RPC or a simpler query. No premature service additions.
- **Existing OSM ecosystem**: UFlow already uses OpenStreetMap data (Nominatim, Overpass). react-leaflet + OSM tiles is consistent.
- **New dependency**: Adding `leaflet` and `react-leaflet` is the plan's first new external rendering dependency. The ADR correctly documents this with alternatives considered.

**Verdict**: Good alignment. No architectural concerns.

---

## Scope Assessment

- **YAGNI compliance**: Excellent. Explicitly excludes clustering, routing, geofencing, desktop map, non-food sections. Each exclusion is reasonable.
- **Milestone granularity**: M0→M1→M2/M3→M4 is clean. M2 and M3 can parallelize after M1.
- **Duration estimates**: Present and reasonable (3–5 days total).

---

## Technical Debt Risks

1. **react-leaflet v4.x maintenance mode**: Last published Dec 2024. When UFlow migrates to React 19, this will require upgrading to v5.x. This is a known, accepted tech debt — the analysis documents the upgrade path. **Risk: LOW**.
2. **D1 still DEFERRED**: Decision D1 (library selection) is marked `[DEFERRED]` to Analyst. The Analyst has now completed the evaluation and recommends react-leaflet. The Planner should resolve D1 to `[RESOLVED]` before implementation. **This is a process gap, not a blocker** — the recommendation exists.

---

## Findings

### MEDIUM

#### F1: OSM Tile Usage Policy Compliance Not Addressed

**Status**: RESOLVED
**Issue**: Neither the plan nor the analysis documents the OpenStreetMap tile usage policy requirements. The OSM Foundation's tile policy (https://operations.osmfoundation.org/policies/tiles/) mandates:

1. **Attribution**: Visible `© OpenStreetMap contributors` credit on the map (typically bottom-right). Leaflet adds this by default only if configured.
2. **User-Agent**: Clear identification of the application (browser default is acceptable for web, but the policy recommends stable identification).
3. **Referrer header**: Must not be stripped — the plan should confirm UFlow's Cloudflare/Nginx config doesn't strip `Referer` headers for tile requests.
4. **No SLA guarantee**: OSM tiles are best-effort, community-funded. The policy explicitly warns: *"Commercial services, or those that seek donations, should be especially aware that access may be withdrawn at any point."*

**Impact**: Non-compliance could result in UFlow being blocked from tile servers without notice. This would break the map feature entirely with no fallback.

**Recommendation**: Add an acceptance criterion to M1: "OSM attribution visible on map. Tile URL uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (or `tile.openstreetmap.de` for German labels — verify that German tile server has equivalent usage policy). Referrer headers not stripped by CDN/proxy."

---

#### F2: No Fallback Strategy for Map Load Failure

**Status**: RESOLVED
**Issue**: The plan specifies loading/empty states but does not address what happens when:
- The map library fails to load (network error, CDN outage)
- OSM tile servers are unreachable (best-effort service, no SLA)
- WebGL/Canvas is unavailable on the device

The current search page has a working category-based UI. If the map fails, mobile users on the food section would see nothing.

**Impact**: Degraded experience for mobile users when map rendering fails. This is the most likely hotfix scenario post-deployment.

**Recommendation**: M3 acceptance criteria should include: "If the map component fails to render (error boundary), fall back to the existing category accordion view." This is a graceful degradation requirement, not a complex feature.

---

#### F3: Data Source Decision Ambiguity

**Status**: RESOLVED
**Issue**: Decision D7 says "reuse existing `search_food_near_me` RPC or a simpler unbounded query" — this is two options without resolution. The `search_food_near_me` RPC requires `p_lat`, `p_lon`, and `p_radius_km` parameters (it's designed for geo-proximity search). For the map's initial load (show ALL food providers), this RPC is not the right fit — it would need a position and radius, but the plan says "No user geolocation required for initial load."

The map needs a different data source: a query that returns all approved food providers with non-null coordinates, regardless of distance. This might be a simple Supabase client query against `locations` joined with `providers`, or a new lightweight RPC.

**Impact**: Implementer ambiguity — they'll need to make this decision during M1, which should be resolved at plan level.

**Recommendation**: Resolve D7 to specify: the map's initial data source is a direct client query (e.g., `supabase.from('locations').select('provider_id, location_latitude, location_longitude, providers!inner(provider_name, provider_images, review_status, listing_type)').not('location_latitude', 'is', null).eq('providers.listing_type', 'food').eq('providers.review_status', 'approved')`) — NOT the `search_food_near_me` RPC. The RPC remains available if the user activates near-me mode on the map later.

---

### LOW

#### F4: D1 Should Be Resolved Before Implementation Handoff

**Status**: RESOLVED
**Issue**: Decision D1 remains `[DEFERRED]` despite Analysis 208 completing with a clear recommendation (react-leaflet + Leaflet + OSM). The plan should be updated to mark D1 as `[RESOLVED]` with the chosen library before handoff to Implementer.

**Impact**: Process gap only — the analysis recommendation is clear. But downstream agents should not need to re-derive the library choice.

**Recommendation**: Planner updates D1 status to `[RESOLVED]` and adds the chosen library.

---

#### F5: Planner Chatmode File Missing

**Status**: OPEN
**Issue**: `.github/chatmodes/planner.chatmode.md` does not exist. Per Critic protocol, this is a LOW process note.

**Impact**: No immediate impact — planning proceeded correctly without it.

**Recommendation**: Create the chatmode file when convenient. Not blocking.

---

#### F6: Coordinate Coverage Gap Unquantified

**Status**: OPEN
**Issue**: Analysis 208 Remaining Gap #1 identifies that the percentage of approved food providers with coordinates is unknown. If most providers lack coordinates, the map would appear nearly empty — undermining the feature's value.

**Impact**: LOW risk — the enrichment pipeline populates coordinates, and the plan correctly notes "providers without coordinates will simply not appear as pins." But quantifying this gap before implementation would validate that the feature delivers value.

**Recommendation**: Run the SQL query from Analysis 208 Gap #1 before implementation starts. If coverage is below ~70%, consider whether the map view adds enough value or if the feature should wait for better geocoding coverage.

---

## Unresolved Open Questions

The plan contains **no explicit `OPEN QUESTION` markers** — all unknowns were captured as Decision D1 (deferred to Analyst, now resolved via Analysis 208) or as Assumptions.

**However**, the following items effectively function as unresolved questions:
1. **D1 library selection**: Answered by Analysis 208 but not yet marked `[RESOLVED]` in the plan (see F4).
2. **D7 data source**: Ambiguous between two options (see F3).
3. **Coordinate coverage %**: Unknown (see F6).

**Items 1 and 3** are non-blocking. **Item 2 (F3)** should be resolved before implementation handoff.

---

## Decision Record Check

| Decision | Status in Plan | Critic Assessment |
|----------|---------------|-------------------|
| D1 | DEFERRED | Should be RESOLVED (Analysis 208 recommends react-leaflet) — see F4 |
| D2 | RESOLVED | OK |
| D3 | RESOLVED | OK |
| D4 | RESOLVED | OK |
| D5 | RESOLVED | OK |
| D6 | RESOLVED | OK |
| D7 | RESOLVED | **Ambiguous** — should clarify data source (see F3) |

---

## Risk Assessment

**Hotfix scenarios** — "How will this plan result in a hotfix after deployment?"

1. **OSM tile server blocks UFlow** (most likely): If attribution is missing, Referrer stripped, or usage violates policy → tiles stop loading → map is blank. Mitigation: F1 (compliance) + F2 (fallback).
2. **Map rendering failure on specific mobile browsers**: Leaflet's Canvas/SVG rendering is broadly compatible, but edge cases on older WebView-based browsers could cause crashes. Mitigation: F2 (error boundary + fallback).
3. **Empty map due to low coordinate coverage**: If <30% of providers have coordinates, users see a sparsely populated map that feels broken. Mitigation: F6 (quantify before implementing).

**Overall risk**: LOW-MEDIUM. The plan is well-scoped and the library choice is sound. The primary risk is operational (OSM tile policy compliance) rather than technical.

---

## Recommendations

1. **Address F1** (MEDIUM): Add OSM tile usage policy compliance requirements to M1 acceptance criteria — attribution, correct tile URL, no referrer stripping.
2. **Address F2** (MEDIUM): Add error boundary + fallback to category view in M3 acceptance criteria.
3. **Address F3** (MEDIUM): Clarify D7 — specify the initial data source as a direct Supabase query, not the `search_food_near_me` RPC.
4. **Address F4** (LOW): Resolve D1 to `[RESOLVED]` with the analyst's recommendation.
5. **Address F6** (LOW): Run coordinate coverage query before implementation.

---

## Verdict

**APPROVED** — All three MEDIUM findings (F1–F3) and LOW finding F4 have been resolved in the plan revision of 2026-08-15T16:00Z. The plan now includes OSM tile policy compliance requirements in M1, error boundary fallback in M3, a clarified data source in D7, and a resolved library decision in D1. Remaining LOW findings (F5 chatmode file, F6 coordinate coverage) are non-blocking and do not require plan revisions. The plan is ready for implementation.

---

## Revision History

| Date              | Revision | Findings Addressed |
| ----------------- | -------- | ------------------- |
| 2026-08-15T16:10Z | Planner revision accepted | F1 (OSM policy → M1 acceptance criteria), F2 (error boundary → M3), F3 (D7 clarified to direct query), F4 (D1 resolved to react-leaflet) |
