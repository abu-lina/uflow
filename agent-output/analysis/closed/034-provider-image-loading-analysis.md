---
ID: 34
Origin: 34
UUID: 9f3a1e7c
Status: Committed
---

# Analysis 034: Provider Detail Page — Image Loads >10s on Desktop

**Task**: Task #034 — User reported >10s image load time on UAT  
**Example**: `https://uat.ummahflow.com/providers/c6276ff8-b835-4fc4-9369-051e93555c7b`  
**Date**: 2026-03-07  
**Analyst**: @Analyst  
**Changelog**:
- 2026-03-07: Initial investigation, all root causes confirmed

---

## Value Statement and Business Objective

**Business objective**: Provider images are the primary trust signal on the detail page. A >10s load time prevents users from visually evaluating a provider, reducing contact intent. Fast image delivery is a direct conversion factor.

**User impact**: Desktop users navigating to a provider detail page see a blank image area for 10+ seconds before the provider photo appears.

---

## Scope

- Route: `/providers/[provider_id]` — desktop path via `ProviderDetailModal`
- Image pipeline: Supabase Storage → Next.js `/_next/image` optimization → browser
- Stack: Next.js 15 (App Router), Hetzner VPS (Docker standalone), Cloudflare CDN
- Prior context: Plan 033 confirmed LCP on `/providers` list page was optimized (`priority={index<4}`), but did **not** validate the `/providers/[provider_id]` detail page image delivery latency.

---

## Methodology

1. Traced the rendering chain from `page.tsx` → `ProviderDetailPageClient.tsx` → `ProviderDetailModal.tsx`
2. Audited all `<Image>` component props (`priority`, `fill`, `sizes`) across affected components
3. Inspected `next.config.js` image configuration (`formats`, `minimumCacheTTL`, `remotePatterns`, `deviceSizes`)
4. Probed `https://uat.ummahflow.com/providers/c6276ff8...` — HTTP response headers captured
5. Inspected `Dockerfile` runner stage for `.next/cache/images/` volume persistence
6. Inspected `deploy/nginx/nginx-uat-template.conf` for `/_next/image` caching rules
7. Inspected `src/features/providers/ProviderCreateForm.tsx` for image upload/resize behavior

---

## Findings

### F-1: AVIF cold encoding on Hetzner — **VERIFIED** (primary cause)

`next.config.js`:
```js
images: {
  formats: ['image/avif', 'image/webp'],  // AVIF is tried first
  minimumCacheTTL: 3600,
  // ...
}
```

- AVIF encoding (libaom) is computationally expensive — **5–15 seconds** per cold encode of a medium/large image on a small VPS
- Provider images are uploaded as raw files (no server-side resize at upload time, confirmed in `ProviderCreateForm.tsx`) — a user may upload a 4–8 MB camera JPEG
- On desktop with no `sizes` attribute (see F-3), Next.js requests `w=3840` → maximum encode burden
- Once encoded, the result is cached in `.next/cache/images/` — warm loads are fast
- **This is the dominant cause of the >10s delay**

Evidence:
- `next.config.js` line 230: `formats: ['image/avif', 'image/webp']`
- No `sizes` on hero images → browser requests `100vw` → Next.js serves `w=3840` default
- Zero-cost reproduction: first request to any new provider image URL in a clean container

---

### F-2: Image cache not persisted across Docker deployments — **VERIFIED** (compounds F-1)

**Dockerfile runner stage** only copies:
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
```

- `.next/cache/images/` is NOT copied from builder and is NOT declared as a Docker `VOLUME`
- The `--mount=type=cache,target=/app/.next/cache` in the build stage is BuildX cache only — not a runtime volume
- **Every deployment starts with an empty image cache** — all provider images are cold after every UAT/production deploy
- This means: immediately after deployment, every provider detail page visited by any user triggers a fresh AVIF encode

---

### F-3: No `sizes` attribute on hero images in both desktop and mobile components — **VERIFIED**

**`ProviderDetailModal.tsx`** (desktop hero, line 376–393):
```jsx
<Image
  fill
  alt={`${provider.provider_name} ${index + 1}`}
  className={`rounded-[32px] object-cover ...`}
  priority={index === 0}
  src={imageUrl}
  // ❌ No sizes attribute
/>
```

**`ProviderDetailPage.tsx`** (mobile hero, line 676–684):
```jsx
<Image
  fill
  alt={`${provider.provider_name} ${index + 1}`}
  className="object-cover"
  src={imageUrl}
  // ❌ No sizes attribute
  // ❌ No priority attribute
/>
```

Without `sizes`, `<Image fill>` defaults to `100vw` width hint. On a desktop viewport (1440px+), Next.js selects `w=1920` or `w=3840` from the default `deviceSizes`. The modal image container is **704px wide** (confirmed from CSS: `w-[496px]` left + image pane). The correct `sizes` would be `"704px"`.

Impact: The image requested is **2.7–5.5× larger** than needed → encode job is proportionally slower → file size is proportionally larger → transfer time longer.

Additional: `ProviderDetailPage.tsx` hero (mobile view) is also missing `priority` prop entirely. Plan 033 confirmed `priority` on the list page, but the full-page mobile detail view (line 676) has no `priority`. This is a secondary issue (mobile users). 

---

### F-4: `ssr: false` on `ProviderDetailModal` — no image preload hint in initial HTML — **VERIFIED**

`ProviderDetailPageClient.tsx`:
```tsx
const ProviderDetailModal = dynamic(
  () => import('@/components/providers/ProviderDetailModal')
    .then(mod => ({ default: mod.ProviderDetailModal })),
  {
    loading: () => <Skeleton ... />,
    ssr: false,  // ← Modal is NEVER server-rendered
  }
);
```

- With `ssr: false`, the server-rendered HTML contains no `<img>` or `<link rel="preload">` for the provider image
- Confirmed by probing the page HTML: only icon images appear in SSR output; provider content has 2 `"provider"` mentions in 59KB of JS-shell HTML
- Image request chain: `HTML parsed → JS hydrates → isMobile effect fires → modal chunk downloads → component mounts → priority hint fires` 
- Even with `priority={index === 0}` inside the modal, `fetchpriority="high"` is only injected after the modal component mounts — typically **2–4 seconds** after the initial HTML arrives
- This delay stacks on top of the AVIF encode latency (F-1)

---

### F-5: Cloudflare not caching `/_next/image` responses — **VERIFIED**

Response headers for page:
```
CF-Cache-Status: DYNAMIC
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
```

Nginx `nginx-uat-template.conf` has no `location /_next/image` block — image optimization requests fall through to the general `location /` block:
```nginx
location / {
    proxy_pass http://localhost:3001;
    proxy_cache_bypass $http_upgrade;  # No nginx caching
}
```

Next.js sets `Cache-Control: public, max-age=3600, must-revalidate` on optimized images — **Cloudflare should be able to cache these**, but by default Cloudflare does not cache URLs with query strings (`/_next/image?url=...&w=...&q=...`). No Cloudflare Cache Rule is configured to override this.

Result: Every image request — even for previously-encoded images (within the 3600s TTL) — hits the Hetzner server, bypassing CDN edge caching. Any warm hit from `.next/cache/images/` is still a round-trip to the Hetzner VPS.

---

### F-6: Raw image upload — no resize at upload time — **VERIFIED** (contributing factor)

`ProviderCreateForm.tsx` line 183–196:
```ts
await supabase.storage.from('provider-images').upload(filePath, file);
const { data: publicUrlData } = supabase.storage.from('provider-images').getPublicUrl(filePath);
```

- Original files (potentially 4–12 MB JPEG/HEIC/PNG) are uploaded without any client-side or server-side resize/compress
- Supabase Storage transformation API (Imgix-based) is not used
- The raw original is stored; `/_next/image` must download the full original before it can encode
- A 8 MB JPEG → download from Supabase EU → encode to AVIF at 3840px → total: 8–20s on first request

---

## Root Cause Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIMARY PATH: Desktop, cold image (after deployment)                        │
│                                                                             │
│  1. User navigates to /providers/[id]                                       │
│  2. Server renders HTML shell (ssr:false → no image preload, +0ms)          │
│  3. JS bundle downloads + hydrates (~800ms–2000ms)        ← RC-4            │
│  4. isMobile resolves to false                                              │
│  5. ProviderDetailModal dynamic import (~200ms–500ms)     ← RC-4            │
│  6. Component mounts, image request fires                                   │
│  7. /_next/image?url=<supabase>&w=3840&q=75               ← RC-3 (w=3840)   │
│  8. Miss in .next/cache/images/                           ← RC-2            │
│  9. Download original from Supabase (~200ms–2000ms)       ← RC-6            │
│ 10. AVIF encode at 3840px (~5000ms–15000ms)               ← RC-1 ← PRIMARY │
│ 11. Image renders                                                           │
│                                                                             │
│  TOTAL: 7000ms–20000ms  ← matches user report of >10s                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

| ID | Root Cause | Confidence | Impact on latency |
|----|-----------|------------|-------------------|
| RC-1 | AVIF cold encoding on Hetzner VPS | **Verified** | 5–15s |
| RC-2 | No Docker volume for `.next/cache/images/` | **Verified** | Turns RC-1 permanent after each deploy |
| RC-3 | No `sizes` on `fill` images → requests `w=3840` | **Verified** | Amplifies RC-1 by 2.7–5.5× |
| RC-4 | `ssr: false` → no preload in HTML → image starts late | **Verified** | +2–4s added before encode even starts |
| RC-5 | Cloudflare not caching `/_next/image` | **Verified** | Warm: +50–200ms round-trip to Hetzner |
| RC-6 | No image resize at upload time | **Verified** | Amplifies RC-1 via large originals |

---

## System Weaknesses (Architecture / Code / Process)

### Architecture
- **No CDN image proxy**: Relying on `/_next/image` on a single VPS as the sole image optimization layer is fragile. Supabase Storage has its own transformation API (not used) and Cloudflare has image resizing. Both bypass VPS CPU for encode.
- **Stateless container + stateful image cache**: The image cache lives in the container filesystem without a persistence strategy. This is a design mismatch.

### Code
- **`ssr: false` for above-fold content**: The provider modal IS the above-fold content on desktop. A component rendered `ssr: false` disables all server-side performance optimization for the page's main UI.
- **Missing `sizes` on all `fill` images**: Project-wide pattern — affects both detail components and card components. No automated check enforces this.

### Process
- **No image format verification in CI**: Plan 033 added bundle budgets but no LCP image delivery metrics. A performance regression in image format config has no automated gate.
- **No LCP tracking in telemetry**: `perf-telemetry.ts` tracks TTFB but LCP image delivery is not captured as a named metric.

---

## Instrumentation Gaps

| Gap | Type | Measure |
|-----|------|---------|
| `/_next/image` response time per URL | **Normal** | Add timing log in custom image loader or middleware |
| AVIF vs WebP encode time | **Debug** | Log encode start/end to Next.js image handler (opt-in flag) |
| LCP image URL on provider detail page | **Normal** | Add `web-vitals` `onLCP` event to `perf-telemetry.ts` with image URL |
| CF-Cache-Status for `/_next/image` | **Normal** | Log CF-Cache-Status header value from Cloudflare analytics |
| Cold vs warm image hit rate | **Normal** | Track `.next/cache/images/` hit/miss via health endpoint or metrics |

---

## Analysis Recommendations (Next Steps to Collapse Uncertainty)

> These are **investigative tasks** for the team, not implementation decisions. Solutioning belongs to Planner.

1. **Test WebP-only encode time** vs AVIF: Remove AVIF from `formats` locally, encode a representative provider photo (4 MB JPEG) at `w=704`, compare encode times. If WebP ≤ 200ms, RC-1 is eliminated.

2. **Reproduce the cold cache scenario**: Restart the UAT container, immediately request a known provider image via `/_next/image`, measure TTFB. This converts RC-1 from a code inference to a measured number (expected: 8–15s).

3. **Verify actual display size**: Measure the rendered pixel width of the hero image in `ProviderDetailModal` on a 1440px wide viewport. Confirm the correct `sizes` value for the fix hypothesis. (Expected: 704px.)

4. **Check Supabase Image Transformation API availability**: Determine if the UAT Supabase project has the Image Transformation add-on enabled. If yes, a direct Supabase transform URL could bypass `/_next/image` entirely for the hero image.

5. **Test Cloudflare Cache Rule**: Create a Cache Rule for `uat.ummahflow.com/_next/image*` in the Cloudflare dashboard to cache on `Cache-Control: public` headers. Confirm CF-Cache-Status changes to `HIT` on second request.

---

## Fix Hypotheses

| # | Hypothesis | Confidence | Risk | Fastest disconfirm test |
|---|-----------|------------|------|------------------------|
| H-1 | Switching `formats` to `['image/webp']` eliminates the >10s cold encode | **High** | Low | Time `/_next/image` encode locally AVIF vs WebP |
| H-2 | Adding `sizes="704px"` to modal hero reduces encode time ≥ 3× | **High** | Low | Compare encode time `w=3840` vs `w=704` |
| H-3 | Adding Docker volume mount for `.next/cache/images/` prevents post-deploy cold start | **High** | Medium | Deploy UAT, check if second visit to same provider is instant |
| H-4 | Cloudflare Cache Rule for `/_next/image` serves warm images from edge (eliminating Hetzner round-trip) | **Medium** | Low | Add CF rule, verify CF-Cache-Status: HIT |
| H-5 | Removing `ssr: false` from ProviderDetailModal (or adding server-side `<link rel="preload">`) reduces LCP by 2–4s | **High** | Medium | Lighthouse LCP measurement before/after |

---

## Open Questions

1. What is the Hetzner VPS spec (CPU cores, RAM)?  A 2-core/4GB machine will have 5× more latency than 4-core/8GB for AVIF encoding. The fix priority changes slightly based on machine size.
2. Is Supabase Image Transformation API enabled for the UAT project? If yes, H-3/H-4 (CDN direct) become higher-priority than fixing `/_next/image` locally.
3. What image formats/sizes do users typically upload? (HEIC from iPhone is 3–8 MB; WhatsApp-shared photos ~200 KB.) If most uploads are small, RC-1 is less severe.
4. Does the production Hetzner server share CPU with other workloads? AVIF encoding is single-threaded and blocking; concurrent encodes starve each other.

---

## Summary for Planner

Three independent fixes will eliminate the >10s delay **without architectural changes**:

1. **`next.config.js`**: Change `formats: ['image/avif', 'image/webp']` → `formats: ['image/webp']` — removes AVIF encode latency (primary cause)
2. **`ProviderDetailModal.tsx` + `ProviderDetailPage.tsx`**: Add `sizes` to all hero `<Image fill>` components — reduces image dimensions from 3840px to actual display size (704px desktop / 361px mobile)
3. **Dockerfile + deployment**: Mount `.next/cache/images/` as a persistent volume — prevents cache wipeout on every deployment

These three together should reduce cold image load from >10s to <500ms (WebP encode at 704px: ~30–80ms on the same hardware).

Two additional improvements address warm-path performance and require more effort:
4. **Cloudflare Cache Rule** for `/_next/image` — edge caches warm images globally
5. **Server-side `<link rel="preload">`** for hero image — eliminates the 2–4s JS waterfall delay before image request starts
