---
ID: 208
Origin: 208
UUID: c4b2e8a3
Status: Active
---

# Analysis 208 — Map Library Evaluation for Mobile Search Map View

## Changelog

| Date              | Agent   | Change                                          |
| ----------------- | ------- | ----------------------------------------------- |
| 2026-08-15T15:00Z | analyst | Analysis created; library evaluation complete   |

---

## Value Statement and Business Objective

Select an interactive map library for Plan 208 (mobile search page map view with restaurant pins). The library must render an interactive map on mobile without Google Maps, support pin markers with tap navigation, and integrate cleanly with Next.js 15 App Router + React 18. UFlow is a Germany-focused, privacy-conscious community platform — license terms and data practices matter.

---

## Context

**Plan reference**: `agent-output/planning/208-mobile-search-map.md`

**Existing ecosystem alignment**: UFlow already uses OpenStreetMap data via `osmPlaceService.ts` (Nominatim geocoding, Overpass API queries). The `useGeolocation` hook provides browser geolocation. The `search_food_near_me` RPC returns `location_latitude` / `location_longitude` for all approved food providers with coordinates.

**Project constraints**:
- React 18.3.1 (`^18.3.1`)
- Next.js 15.5.19 (`^15.5.19`)
- TypeScript strict mode
- Google Maps explicitly excluded
- Hetzner Cloud EU hosting + Cloudflare CDN
- Privacy-conscious (EU-focused users)
- Current DAU < 5,000

---

## Methodology

1. Identified three candidate libraries per Plan 208 Decision D1
2. Gathered package metadata from npm registry (versions, peer deps, licenses, unpacked sizes, last publish dates)
3. Obtained gzipped bundle size from bundlephobia API (leaflet confirmed; MapLibre/Mapbox from published benchmarks)
4. Evaluated React 18 compatibility, Next.js 15 SSR-off dynamic import pattern
5. Assessed tile provider options, cost at scale, and data privacy implications
6. Classified all findings by confidence level (L1 Proven / L2 Observed / L3 Inferred)

---

## Findings

### F1: Candidate Overview

Three library stacks were evaluated. For MapLibre and Mapbox, `react-map-gl` (by Uber/Vis.gl) provides the React wrapper.

| Criterion | react-leaflet + Leaflet + OSM tiles | react-map-gl + MapLibre GL JS | react-map-gl + Mapbox GL JS |
|-----------|--------------------------------------|-------------------------------|------------------------------|
| **Library versions** | react-leaflet 4.2.1 + leaflet 1.9.4 | react-map-gl 8.1.2 + maplibre-gl 6.3.0 | react-map-gl 8.1.2 + mapbox-gl 3.28.1 |
| **React peer dep** | React ^18.0.0 (v4.x) | React >=16.3.0 | React >=16.3.0 |
| **React 18 compat** | **L1 Proven**: v4.x targets React 18 exactly | **L1 Proven**: react-map-gl works >=16.3 | **L1 Proven**: react-map-gl works >=16.3 |
| **TypeScript** | Built-in types (lib/index.d.ts) | Built-in types | Built-in types |
| **License** | BSD-2-Clause (Leaflet) | BSD-3-Clause (MapLibre) + MIT (react-map-gl) | **Proprietary** (Mapbox TOS v2+) + MIT (react-map-gl) |
| **Unpacked size** | ~48 kB (react-leaflet) + ~3.7 MB (leaflet) | ~390 kB (react-map-gl) + ~19 MB (maplibre-gl) | ~390 kB (react-map-gl) + ~65 MB (mapbox-gl) |
| **Gzipped bundle** | ~42 kB (leaflet) + ~6 kB (react-leaflet) ≈ **~48 kB total** | ~250 kB (maplibre-gl) + ~30 kB (react-map-gl) ≈ **~280 kB total** | ~350 kB (mapbox-gl) + ~30 kB (react-map-gl) ≈ **~380 kB total** |
| **Rendering engine** | SVG/Canvas (raster tiles) | WebGL (vector tiles) | WebGL (vector tiles) |
| **Last published** | leaflet: 2025-08-16; react-leaflet: 2024-12-14 | maplibre-gl: 2026-08-10 | mapbox-gl: 2026-08-13 |
| **Tile cost** | Free (OSM raster tiles) | Free tier (Maptiler 100k/month, Stadia 200k/month) or self-host | Requires Mapbox account; 50k free loads/month, then $5/1k |
| **Privacy** | No telemetry; OSM tiles carry no tracking | No telemetry in library | **SDK sends de-identified location/usage data** (per license) |
| **SSR compat** | Dynamic import `ssr: false` required (window dependency) | Dynamic import `ssr: false` required (WebGL dependency) | Dynamic import `ssr: false` required (WebGL dependency) |

**Confidence**: Bundle sizes for leaflet are L1 Proven (bundlephobia API returned exact values: 42.0 kB gzipped). MapLibre/Mapbox gzipped sizes are L2 Observed (from published benchmarks and npm metadata; not directly verified via bundlephobia due to rate limiting).

---

### F2: Disqualification — Mapbox GL JS [L1 Proven]

Mapbox GL JS v2+ is **disqualified** for UFlow based on three factors:

1. **Proprietary license**: From v2.0 onwards, Mapbox GL JS is licensed under the Mapbox Terms of Service, not an open-source license. The license states: *"This license allows developers with a current active Mapbox account to use and modify the authorized portions of the Software... This license terminates automatically if a developer no longer has a Mapbox account in good standing."* This creates vendor lock-in.

2. **Mandatory telemetry**: The license explicitly states the SDK *"sends limited de-identified location and usage data."* Modifications that interfere with data collection are *"not authorized."* For a privacy-conscious EU-targeted platform, this is a non-starter.

3. **Largest bundle**: At ~380 kB gzipped (the map engine alone), Mapbox GL JS is 8x larger than the Leaflet stack and 35% larger than MapLibre.

**Verdict**: Mapbox GL JS is eliminated from consideration.

---

### F3: react-leaflet + OSM Raster Tiles — Analysis [L1 Proven / L2 Observed]

**Strengths**:
- **Smallest bundle**: ~48 kB gzipped total — the lightest option by a wide margin. On mobile networks this is a meaningful advantage.
- **Zero tile cost**: OpenStreetMap raster tiles are free, donation-funded, and have no API key requirement. The German variant (`tile.openstreetmap.de`) provides German-language labels, which matches UFlow's primary locale.
- **Proven React 18 compatibility**: react-leaflet v4.2.1 explicitly peers on React ^18.0.0.
- **Mature ecosystem**: Leaflet is the most widely deployed open-source mapping library. react-leaflet has been maintained since 2014.
- **Simple API for markers**: `<Marker position={[lat, lng]} eventHandlers={{ click: () => router.push(...) }} />` — the use case (pins + click) maps directly to Leaflet's core API.
- **No telemetry**: Pure open-source; tiles are fetched directly from OSM tile servers.
- **Existing ecosystem fit**: UFlow already uses OSM data (Nominatim, Overpass API in `osmPlaceService.ts`). Staying in the OSM ecosystem avoids introducing a new data provider dependency.

**Weaknesses**:
- **Raster tiles only**: No vector tile rendering. Raster tiles are slightly less crisp on high-DPI mobile screens compared to vector tiles (L2 Observed — this is a cosmetic difference, not functional).
- **react-leaflet v4.x maintenance**: Last published 2024-12-14. The v5.x line targets React 19 and is actively developed, but v4.x is in maintenance mode. This is not a risk for the foreseeable future — React 18 support is stable.
- **No 3D/globe features**: Not needed for Plan 208 scope (2D pins on a flat map).

**Next.js 15 integration pattern** (L3 Inferred — standard pattern, not POC-verified in this project):
```tsx
import dynamic from 'next/dynamic';
const SearchMap = dynamic(() => import('@/features/search/components/SearchMap'), { ssr: false });
```
Leaflet CSS must be imported in the client component or via a global stylesheet.

---

### F4: react-map-gl + MapLibre GL JS — Analysis [L1 Proven / L2 Observed]

**Strengths**:
- **Vector tiles**: WebGL-based rendering produces crisp, resolution-independent maps on high-DPI mobile displays. Supports smooth zoom/rotation animations.
- **Actively maintained**: MapLibre GL JS was last published 2026-08-10 (5 days ago). It's a community fork of Mapbox GL JS v1 (before the license change), with an active open-source community.
- **Open-source license**: BSD-3-Clause. No vendor lock-in, no telemetry.
- **react-map-gl**: Maintained by the Vis.gl team (Uber open-source). MIT-licensed. Supports both MapLibre and Mapbox as interchangeable backends.

**Weaknesses**:
- **Larger bundle**: ~280 kB gzipped — 5.8x larger than the Leaflet stack. For a feature that's only used on one mobile page, this is a significant overhead. Dynamic import mitigates first-load impact but still affects the search page load time.
- **Tile hosting cost**: Free vector tiles require a provider. Maptiler offers 100k tile requests/month free; Stadia offers 200k/month free for non-commercial use. UFlow's current traffic fits within free tiers, but tile costs would grow with DAU. Self-hosting vector tiles (e.g., via OpenMapTiles) is complex.
- **More complex setup**: Vector tile styles require a style JSON URL pointing to a tile provider. This adds a configuration dependency (API key for Maptiler/Stadia).
- **WebGL overhead on low-end mobile**: Some older Android devices may struggle with WebGL rendering for maps. Leaflet's SVG/Canvas rendering is lighter.

---

### F5: Tile Provider Comparison for Plan 208 Context [L2 Observed]

| Provider | Tile Type | Free Tier | API Key Required | German Labels | Privacy |
|----------|-----------|-----------|-----------------|---------------|---------|
| OpenStreetMap.org | Raster | Unlimited (fair use) | No | Via `tile.openstreetmap.de` | No tracking |
| OpenStreetMap.de | Raster | Unlimited (fair use) | No | Yes (native) | No tracking |
| Maptiler | Vector | 100k requests/month | Yes | Configurable | GDPR-compliant |
| Stadia Maps | Raster+Vector | 200k tiles/month (non-commercial) | Yes (for prod) | Via style config | GDPR-compliant |

For UFlow's current scale (< 5,000 DAU, Germany-focused), OSM raster tiles are the simplest and most cost-effective option.

---

## ADR Draft

### ADR-208: Map Library Selection for Mobile Search Map View

**Status**: Proposed (pending Planner resolution of Decision D1)

**Context**: Plan 208 requires an interactive map on the mobile search page with restaurant pins. User explicitly excluded Google Maps. Three candidates evaluated: react-leaflet + OSM, react-map-gl + MapLibre GL JS, react-map-gl + Mapbox GL JS. The map shows ~100–500 pins with tap-to-navigate. No 3D, routing, or advanced map features needed.

**Decision**: Use **react-leaflet v4.2.1 + leaflet v1.9.4 + OpenStreetMap raster tiles**.

**Consequences**:

#### Positive
- Smallest bundle impact (~48 kB gzipped vs ~280 kB for MapLibre)
- Zero tile hosting cost (no API keys, no vendor accounts)
- No telemetry or tracking — aligns with UFlow's privacy-first approach
- Simple Marker API maps directly to the pin + click use case
- Ecosystem alignment — UFlow already uses OSM (Nominatim, Overpass)
- BSD-2-Clause license — no vendor lock-in

#### Negative
- Raster tiles only — slightly less crisp on high-DPI screens compared to vector tiles
- react-leaflet v4.x is in maintenance mode (v5.x targets React 19)
- No smooth vector rotation/tilt (not needed for Plan 208 scope)

#### Neutral
- German-language tiles available via `tile.openstreetmap.de`
- Dynamic import `ssr: false` pattern required (same for all three candidates)
- When/if UFlow migrates to React 19, react-leaflet v5.x is available

**Alternatives Considered**:
1. **react-map-gl + MapLibre GL JS**: Rejected because 5.8x larger bundle for a feature that doesn't benefit from vector tiles. Vector tile hosting adds cost and configuration complexity. Could be reconsidered if future features need WebGL map capabilities (3D, smooth rotation, custom vector styles).
2. **react-map-gl + Mapbox GL JS**: Rejected — proprietary license (Mapbox TOS), mandatory telemetry incompatible with EU privacy standards, largest bundle (380 kB gzipped), vendor lock-in.

---

## Root Cause

N/A — this is a technology selection analysis, not a bug investigation.

---

## System Weaknesses

1. **No existing map rendering infrastructure**: The codebase has no prior map rendering component. This is the first time a visual map is being introduced. Integration testing will need to mock the map library since Leaflet depends on DOM/Canvas APIs not available in jsdom.
2. **Coordinate data completeness unknown**: The analysis confirms `location_latitude`/`location_longitude` columns exist in the `locations` table and the `search_food_near_me` RPC returns them, but the actual percentage of providers with populated coordinates is unknown. A SQL query (`SELECT COUNT(*) FROM locations WHERE location_latitude IS NOT NULL`) would quantify this gap.

---

## Instrumentation Gaps

| Gap | Type | What to add | Normal vs Debug |
|-----|------|-------------|-----------------|
| Coordinate coverage metric | Data quality | Periodic query: % of approved food providers with non-null coordinates | Normal — needed for map feature health monitoring |
| Map load performance | User experience | Performance mark when map renders first tiles + all pins | Debug — only during initial rollout, disable after baseline established |

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Status |
|---|---------|---------|-----------------|--------|
| 1 | Actual % of food providers with coordinates | Non-blocking (map works with available data) | Run SQL: `SELECT COUNT(*) FILTER (WHERE location_latitude IS NOT NULL) * 100.0 / COUNT(*) FROM providers WHERE listing_type = 'food' AND review_status = 'approved'` | Open |
| 2 | Leaflet CSS import pattern in Next.js 15 App Router | Non-blocking (standard pattern exists) | Implementer validates during M1: import `leaflet/dist/leaflet.css` in client component or use `next/head` | Open |
| 3 | Leaflet marker icon path resolution in Next.js | Non-blocking (known issue with well-documented fix) | Implementer must configure `L.Icon.Default.imagePath` or use custom marker icons from `/public` | Open |

---

## Analysis Recommendations

1. **Planner**: Resolve Decision D1 to `react-leaflet v4.2.1 + leaflet v1.9.4 + OSM raster tiles` based on this ADR.
2. **Implementer**: Use `tile.openstreetmap.de` for German-language labels as the default tile layer. Validate Leaflet CSS import and marker icon path in the dynamic import context during M1.
3. **Future consideration**: If UFlow later needs vector maps (custom styling, 3D views, smooth animations), MapLibre GL JS is the natural upgrade path — it shares the OSM data ecosystem and is BSD-licensed. The `react-map-gl` wrapper supports both backends, so the React component API would remain similar.
