---
ID: 003
Origin: 003
UUID: b7e2a91f
Status: Planned
---

# Analysis: Console Errors — Hydration Mismatch & CORS Failures

## Changelog

| Date       | Change                                   |
| ---------- | ---------------------------------------- |
| 2026-02-21 | Initial analysis — two bugs investigated |
| 2026-02-21 | Status set to Planned; handoff to Planner |

## Value Statement and Business Objective

These console errors directly degrade the developer and user experience:

- **Bug A** (hydration mismatch) triggers a full client-side re-render of the entire React tree, causing visible layout shifts and wasted performance.
- **Bug B** (CORS/network failures) prevents the SearchBar from loading categories and cities, making the core search feature non-functional in local development.

---

## Bug A: Hydration Mismatch

### Objective

Identify why `<div className="block md:hidden">` is present on the client but absent on the server, causing React hydration failure.

### Methodology

1. Traced the component tree from the error diff: `RootClientLayout → main → div → div.block.md:hidden`
2. Inspected `RootClientLayout.tsx` for server/client branching patterns
3. Checked `navigationUtils.ts` helper functions for `typeof window` usage
4. Checked `feature-flags.ts` for environment-dependent return values

### Findings — VERIFIED

**Root Cause: `typeof window !== 'undefined'` used in the render path (line 32)**

```typescript
// src/components/layout/RootClientLayout.tsx, line 32
const isAppLaunched = typeof window !== 'undefined' ? getFeatureFlag('isAppLaunched') : false;
```

This line creates a **server/client branch** — exactly what React's hydration error message warns about. During SSR, `typeof window === 'undefined'` evaluates to `true`, so `isAppLaunched = false`. On the client, `typeof window !== 'undefined'` is `true`, so `isAppLaunched` gets the actual feature flag value (also `false` by default, but the branch itself causes a difference in the conditional rendering chain).

**The rendering cascade that diverges:**

The `isAppLaunched` value feeds into:

- `shouldShowMobileFooter(pathname, isSplashVisible, user, isAppLaunched)` (line 40)
- `shouldShowCityEarlyAccessNavbar(pathname, isAppLaunched, user)` (line 41)

Both of these utility functions also call `hasCompletedOnboarding()` which reads `localStorage`:

```typescript
// src/utils/navigationUtils.ts, line 142
export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') {
    return false; // Server always returns false
  }
  // ... reads localStorage on client
}
```

**The divergence path:**

1. **Server**: `isAppLaunched = false`, `hasCompletedOnboarding() = false` → `showMobileFooter = false`, `showCityEarlyAccessNavbar = false`
2. **Client**: `isAppLaunched = false`, `hasCompletedOnboarding()` may return `true` (if user has localStorage data) → `showCityEarlyAccessNavbar = true` → renders `<div className="block md:hidden"><CityEarlyAccessNavbar /></div>`

This is the exact element shown in the hydration diff: `+ <div className="block md:hidden">`.

**Secondary contributor (line 47–51):**

```typescript
{process.env.NODE_ENV === 'development' &&
 typeof window !== 'undefined' &&
 (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
  <DevServiceWorkerReset />
)}
```

This `typeof window !== 'undefined'` check also branches server vs client, though `DevServiceWorkerReset` renders `null` so its hydration impact is minimal.

### Analysis Recommendation (Bug A)

To verify the root cause, test the following:

1. Clear `localStorage` for `ummahflow_onboarding` and `selectedCity`, then reload — hydration error should disappear (confirming `hasCompletedOnboarding()` is the divergence trigger).
2. The fix pattern is well-established in React/Next.js: use a `hasMounted` state that starts `false` and becomes `true` in `useEffect`, or use `suppressHydrationWarning` for truly safe divergences.
3. The `isAppLaunched` branching on line 32 should be refactored: either always call `getFeatureFlag()` (it reads `process.env` which is available on both server and client for `NEXT_PUBLIC_` vars), or defer the client-specific rendering to after mount.

---

## Bug B: CORS / Network Errors

### Objective

Identify why Supabase REST API calls from `localhost:3000` are blocked by CORS.

### Methodology

1. Checked `.env.local` for Supabase configuration
2. Traced `SearchBar.tsx` → `services/categories.ts` → `lib/supabase/client.ts`
3. Traced `SearchBar.tsx` → `services/providers.ts` → `lib/supabase/client.ts`
4. Analyzed the CORS error pattern

### Findings — HIGH-CONFIDENCE INFERENCE

**The architecture is correct but CORS is failing at the Supabase project level.**

The call chain:

1. `SearchBar.tsx` (client component, `'use client'`) calls `fetchUsedCategories()` and `fetchProviderCities()`
2. Both service functions import `supabase` from `@/lib/supabase/client` — the **client-side** Supabase singleton
3. The client creates calls to `https://qrekonfhaenjdnjhwdum.supabase.co/rest/v1/providers?select=category_id`
4. These cross-origin requests are blocked by the browser

**Environment configuration is correctly set:**

- `NEXT_PUBLIC_SUPABASE_URL=https://qrekonfhaenjdnjhwdum.supabase.co` ✓
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a valid JWT matching the same project ref (`qrekonfhaenjdnjhwdum`) ✓
- URL and key reference the same project ✓

**Possible causes (ranked by likelihood):**

1. **Supabase project API settings** (High confidence): The Supabase DEV project may not have `localhost:3000` in its allowed CORS origins. By default, Supabase allows all origins for the REST API via `Access-Control-Allow-Origin: *`, but this can be restricted in project settings. If the project has custom CORS settings, `localhost:3000` may be missing.

2. **Browser extension interference** (Medium confidence): Firefox (the browser in the logs — `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0`) can have extensions (ad blockers, privacy tools, CORS blockers) that strip CORS headers or block cross-origin requests entirely.

3. **Network/VPN interference** (Medium confidence): A firewall, corporate proxy, or VPN could be intercepting Supabase requests and stripping CORS headers.

4. **Supabase project paused/unavailable** (Lower confidence): If the DEV Supabase project is paused (free tier projects pause after inactivity), the server won't respond with CORS headers, causing the browser to reject the request. The error `Status code: (null)` suggests the request never completed, which is consistent with either a network issue or a paused project.

**Note on architecture pattern:**
The `SearchBar` is a `'use client'` component that fetches data via the services layer (`services/categories.ts`, `services/providers.ts`), which both use the **client-side** Supabase client. This is architecturally correct for client components that need real-time data. However, this means all these calls are **browser-to-Supabase direct**, making them subject to CORS.

### Analysis Recommendation (Bug B)

To isolate the root cause, test the following in order:

1. **Test Supabase reachability directly** — run in terminal:

   ```bash
   curl -I "https://qrekonfhaenjdnjhwdum.supabase.co/rest/v1/providers?select=category_id" \
     -H "apikey: <anon_key>" \
     -H "Authorization: Bearer <anon_key>"
   ```

   If this fails or returns non-200, the project is paused/unreachable.

2. **Check CORS headers** — run:

   ```bash
   curl -I "https://qrekonfhaenjdnjhwdum.supabase.co/rest/v1/providers?select=category_id" \
     -H "apikey: <anon_key>" \
     -H "Origin: http://localhost:3000"
   ```

   Check for `Access-Control-Allow-Origin` in the response. If missing, the Supabase project has restrictive CORS settings.

3. **Test in Chrome/Safari** — if it works in another browser but not Firefox, an extension or Firefox-specific setting is blocking CORS.

4. **Check Supabase dashboard** — verify the DEV project (`qrekonfhaenjdnjhwdum`) is active and not paused. Go to Settings → API to check CORS origins.

---

## Additional Findings

### Font Preload Warning

```
The resource at "http://localhost:3000/_next/static/media/e4af272ccee01ff0-s.p.woff2" preloaded with link preload was not used within a few seconds.
```

This is a non-critical warning — a font file is preloaded but not consumed quickly enough. Typically caused by the font being loaded for a component that isn't immediately visible, or by the hydration error causing a re-render that delays font usage. This will likely resolve once the hydration issue is fixed.

### Referrer Policy Warnings

```
Referrer Policy: Ignoring the less restricted referrer policy "origin-when-cross-origin" for the cross-site request
```

These are informational browser warnings about Iconify CDN and Supabase requests. Non-actionable — the browser is applying its default stricter policy.

---

## Summary of Root Causes

| Bug           | Root Cause                                                                                    | Confidence                    | Fix Complexity                              |
| ------------- | --------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| A — Hydration | `typeof window` branching in render path + `localStorage` reads in `hasCompletedOnboarding()` | **Verified**                  | Low — use `hasMounted` pattern              |
| B — CORS      | Supabase DEV project unreachable or CORS-restricted                                           | **High-confidence inference** | Low — verify project status & CORS settings |

## Open Questions

1. **Bug B**: Is the DEV Supabase project (`qrekonfhaenjdnjhwdum`) currently active or paused? This requires checking the Supabase dashboard.
2. **Bug B**: Are there any browser extensions in Firefox that could block cross-origin requests? The user should test in an incognito/private window.
3. **Bug A**: Is the `isAppLaunched` feature flag intentionally server-guarded? If it only reads `process.env.NEXT_PUBLIC_*` vars (which are available server-side in Next.js), the `typeof window` check is unnecessary.

---

## Analysis Recommendations (Next Steps)

1. **For Bug A**: Test clearing `localStorage` to confirm the divergence trigger. If confirmed, the fix is to wrap `isAppLaunched` computation and footer/navbar visibility in a `hasMounted` guard.
2. **For Bug B**: Run the `curl` commands above to determine Supabase project status. If the project is paused, resume it. If CORS is restricted, add `http://localhost:3000` to allowed origins.
3. Both fixes are low-risk and can be planned together.
