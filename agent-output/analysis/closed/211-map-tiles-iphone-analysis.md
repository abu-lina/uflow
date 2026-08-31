---
ID: 211
Origin: 211
UUID: b7e2d4f1
Status: Planned
---

# Analysis 211 — Map Tiles Not Rendering on iPhone (Plan 208 Regression)

## Changelog

| Date              | Agent   | Change                                              |
| ----------------- | ------- | --------------------------------------------------- |
| 2026-08-16T00:00Z | analyst | Analysis created; root cause identified (L2 Observed) |
| 2026-08-16T00:30Z | planner | Status → Planned; plan 211-map-tiles-iphone-fix.md created |

---

## Value Statement and Business Objective

The mobile search map (/search, food section) shows grey fill with no streets or buildings when zooming on iPhone Safari. Pins are visible and tappable. This regression from Plan 208 makes the map feature unusable on iOS — the primary mobile platform for UFlow users in Germany.

---

## Context

**Plan reference**: Plan 208 — Mobile Search Map View
**Prior art**:
- `agent-output/analysis/208-map-library-analysis.md` — Leaflet + OSM DE tiles selected
- `agent-output/implementation/closed/208-mobile-search-map-implementation.md` — SearchMap.tsx implementation
- `agent-output/analysis/closed/046-iconify-pwa-analysis.md` — **Same bug class** (SW intercepting cross-origin resources)

**Affected files**:
- `src/features/search/components/SearchMap.tsx` — tile layer with `crossOrigin: 'anonymous'`
- `src/components/shared/RootPageContent.tsx` — second usage of SearchMap
- `next.config.js` — PWA `runtimeCaching` with overly broad `.png` pattern

---

## Methodology

1. Code inspection of SearchMap.tsx tile configuration, Leaflet options, CSS rendering stack
2. Code inspection of next.config.js CSP directives, PWA runtimeCaching, security headers
3. POC: curl tile server (`tile.openstreetmap.de`) at zoom levels 14–20, with/without iOS UA, with CORS Origin header
4. Cross-reference with Plan 046 retrospective (identical bug class: SW intercepting cross-origin resources)
5. Verified no canvas readback exists (no `toDataURL`, `getImageData`, `html2canvas` in codebase)

---

## Findings

### F1 [L1 Proven]: PWA Service Worker intercepts ALL tile `.png` requests

The `runtimeCaching` in `next.config.js` (line ~52) registers a CacheFirst route:

```javascript
{
  urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'images-cache',
    expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
  },
}
```

This regex matches `https://tile.openstreetmap.de/{z}/{x}/{y}.png`. Every tile request is intercepted by the Service Worker and handled via CacheFirst strategy.

**Evidence**: Regex `^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$` verified against sample URL `https://tile.openstreetmap.de/14/8529/5509.png` — match confirmed.

**Impact**: A single map zoom session generates 100–300+ unique tile URLs. The `maxEntries: 100` limit causes constant LRU cache eviction during map interaction.

This is the **same bug class as Plan 046** (Iconify CDN). The lesson from Plan 046's own comments in `next.config.js`:

> "Without a registered route, Workbox does NOT intercept these requests at all — the browser handles them natively, bypassing any SW-context network restriction."

The comment was written specifically about Iconify, but the principle applies identically to map tiles: the broad `.png` pattern unintentionally catches tile requests that should be handled natively by the browser.

---

### F2 [L1 Proven]: `crossOrigin: 'anonymous'` is unnecessary and adds CORS complexity

SearchMap.tsx line ~121:
```javascript
L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
  attribution: '...',
  crossOrigin: 'anonymous',
}).addTo(map);
```

The `crossOrigin: 'anonymous'` option adds `crossorigin="anonymous"` to each tile `<img>` element. This is ONLY needed for canvas readback (map export, screenshot). Verified: **no canvas readback exists anywhere in the codebase** (`toDataURL`, `getImageData`, `drawImage.*map`, `html2canvas`, `leaflet-image` — zero matches).

When `crossOrigin` is set:
- The browser sends a CORS request (`mode: 'cors'`) instead of a simple `no-cors` image load
- The SW's CacheFirst handler must handle CORS-mode requests
- On iOS Safari, SW-cached CORS responses for `<img crossorigin>` elements have known WebKit rendering issues
- Without `crossOrigin`, image loads are simple `no-cors` requests that always display (cannot be tainted, but that's irrelevant since no canvas readback exists)

**Evidence**: `grep -r 'toDataURL\|toBlob\|getImageData\|drawImage.*map\|html2canvas\|leaflet-image' src/` — zero results.

---

### F3 [L2 Observed]: iOS Safari SW + CORS image interaction causes rendering failure

The combination of F1 + F2 creates an iOS-specific failure:

1. Leaflet creates `<img crossorigin="anonymous" src="https://tile.openstreetmap.de/...">` for each tile
2. The browser sends a CORS request (`mode: cors`, `destination: image`)
3. The PWA Service Worker's `fetch` event fires (CacheFirst route matches `.png`)
4. SW attempts cache lookup → miss (first visit or evicted entry)
5. SW calls `fetch(request)` in the SW context to get the tile
6. Server responds with `Access-Control-Allow-Origin: *` (verified via curl POC)
7. SW calls `Cache.put()` to store the response
8. On iOS Safari: concurrent cache operations (reads + writes + evictions from 100-entry limit) during rapid tile loading can fail silently
9. When the CacheFirst handler encounters a cache failure, the response may not be properly returned to the `<img>` element
10. Tile shows grey (Leaflet's default empty tile background)

**Why pins are unaffected**: Pins are Leaflet `DivIcon` overlays — inline SVG in DOM `<div>` elements. They are NOT image resources and are never intercepted by the Service Worker.

**Why desktop works**: Chrome's Service Worker implementation handles concurrent Cache API operations more robustly than iOS Safari's WebKit implementation. Chrome's larger cache storage quota also reduces eviction pressure.

**Confidence L2**: The mechanism is confirmed by code inspection and pattern match with Plan 046. On-device verification on iPhone is required to elevate to L1.

---

### F4 [L1 Proven]: CSP `connect-src` missing `tile.openstreetmap.de`

`next.config.js` CSP `connect-src` includes `https://tile.openstreetmap.org` but NOT `https://tile.openstreetmap.de`. The code uses `tile.openstreetmap.de`.

This is NOT the primary cause (tiles load via `<img>` governed by `img-src: 'self' data: https: blob:`, which allows all HTTPS). However, it's a defense-in-depth gap: if any code path uses `fetch()` for tiles (e.g., preloading, future changes), the CSP would silently block it.

**Evidence**: `grep -n 'connect-src' next.config.js` shows `tile.openstreetmap.org` at line 112; code uses `tile.openstreetmap.de` at SearchMap.tsx line ~121.

---

### F5 [L1 Proven]: Tile server is fully functional

`tile.openstreetmap.de` responds correctly:
- HTTP 200 at zoom levels 14, 17, 18, 19, 20
- `Content-Type: image/png` with valid PNG data
- `Access-Control-Allow-Origin: *` (CORS enabled)
- `Cache-Control: max-age=269697` (~3.1 days)
- Works with iOS Safari User-Agent and `Referer: https://uat.ummahflow.com/search`
- No redirects, no subdomain requirements
- Subdomain variants (`a.tile.openstreetmap.de`, `b.tile.openstreetmap.de`) also work

**Evidence**: curl POC with `-H 'Origin: https://ummahflow.com'` and iOS Safari UA — all returned HTTP 200 with CORS headers.

---

### F6 [L3 Inferred]: CSS filter/compositing stack may contribute to rendering failure

SearchMap.tsx injects:
```css
.uflow-map-tiles .leaflet-tile-pane { filter: grayscale(1) brightness(1.08) contrast(0.88); }
```

The outer container has `position: fixed; overflow: hidden; isolation: isolate`. This creates nested GPU compositing layers. On iOS WebKit, CSS `filter` on a container with `transform`-positioned children (Leaflet tiles use `transform: translate3d()`) can cause rendering artifacts.

**Why L3**: This alone is unlikely to cause complete tile invisibility. It may amplify the primary SW issue or cause separate visual artifacts. Requires on-device testing with filter removed to confirm/disconfirm.

---

## Root Cause (L2 Observed)

**Primary**: The PWA Service Worker's `CacheFirst` route for `.png` images (F1) intercepts all tile requests. Combined with `crossOrigin: 'anonymous'` (F2), this creates CORS-mode SW-cached image requests that fail to render on iOS Safari (F3).

**Contributing**: The CSS filter/compositing stack (F6) may amplify the primary issue. The missing CSP connect-src entry (F4) is a defense-in-depth gap.

**Prior art**: This is the same bug class as Plan 046 (Iconify CDN requests intercepted by SW), confirmed by the comments in `next.config.js` that document the exact mechanism and solution pattern.

---

## Hypothesis Ranking

| Rank | Hypothesis | Confidence | Mechanism | Disconfirming Test |
|------|-----------|------------|-----------|-------------------|
| 1 | SW CacheFirst `.png` route intercepts tile requests; iOS Safari SW cache + CORS fails | **L2 Observed** | F1 + F2 + F3 | Exclude tile URLs from SW runtimeCaching; test on iPhone |
| 2 | `crossOrigin: 'anonymous'` unnecessary attribute adds CORS overhead that fails in SW context on iOS | **L2 Observed** | F2 + F3 | Remove `crossOrigin` option; test on iPhone |
| 3 | CSS filter + compositing stack causes iOS WebKit rendering failure | **L3 Inferred** | F6 | Remove CSS filter; test on iPhone |
| 4 | CSP connect-src missing `.de` domain causes silent fetch block on iOS | **L3 Inferred** | F4 | Add `tile.openstreetmap.de` to connect-src; test on iPhone |
| 5 | Tile server rate-limits iPhone IP ranges | **L3 Inferred** | (none found) | Disproven by curl POC with iOS UA |

---

## System Weaknesses Identified

### W1: Overly Broad SW runtimeCaching Pattern
The regex `^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$` catches ALL `.png` URLs across the entire internet. It was designed for Supabase provider photos but inadvertently catches map tiles, CDN assets, and any other cross-origin PNG. This is the second time this class of bug has occurred (Plan 046).

### W2: No On-Device UAT for Mobile Features
Plan 208 UAT was document-based only — never tested on an actual iPhone. A map rendering feature that's mobile-only must be tested on target devices.

### W3: Missing `crossOrigin` Justification
The `crossOrigin: 'anonymous'` option was added without a documented need. It should only be used when canvas readback is required.

---

## Instrumentation Gaps

| Type | Description | Normal / Debug |
|------|-------------|---------------|
| Missing | SW fetch event logging for tile URLs | **Debug** — enable via SW debug flag to log intercepted tile requests, cache hits/misses |
| Missing | Browser console monitoring for tile img `onerror` events | **Debug** — add temporary error handler in SearchMap useEffect |
| Missing | CSP violation reporting | **Normal** — add `report-uri` or `report-to` directive to CSP for long-term monitoring |

---

## Analysis Recommendations (for Planner)

### R1: Fix the SW runtimeCaching pattern (Primary)
The CacheFirst `.png` pattern must not intercept tile URLs. Two options:
- **Option A**: Narrow the regex to only match Supabase storage URLs (e.g., `^https:\/\/.*\.supabase\.co\/.*\.(?:png|jpg|jpeg|svg|gif)$`)
- **Option B**: Add a preceding `NetworkOnly` or passthrough route for `tile.openstreetmap.de` URLs before the broad `.png` pattern

Apply the Plan 046 principle: "Without a registered route, Workbox does NOT intercept these requests at all."

### R2: Remove `crossOrigin: 'anonymous'` from TileLayer
No canvas readback exists. The option adds CORS complexity with zero benefit. Removing it converts tile loads from CORS-mode to simple `no-cors` image loads, eliminating the WebKit SW interaction entirely.

### R3: Add `tile.openstreetmap.de` to CSP `connect-src`
Defense-in-depth. Replace `tile.openstreetmap.org` (unused) with `tile.openstreetmap.de` (actual).

### R4: On-device iPhone UAT required
Fixes must be verified on an actual iPhone with Safari. The UAT should test: initial load, zoom in/out, pan, near-me geolocation, and pin tap navigation.

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Does removing crossOrigin + excluding tiles from SW fully fix the issue on-device? | No (high-confidence L2) | On-device iPhone test after fix | QA |
| 2 | Does the CSS filter (F6) cause separate rendering issues on iOS? | No | Test with filter intact after primary fix; if still broken, remove filter | QA |
| 3 | Are there other cross-origin resources caught by the broad `.png` SW pattern? | Non-blocking | Audit all image URLs in the app against the SW pattern | Analyst (future) |
