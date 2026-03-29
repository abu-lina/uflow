# Implementation: Plan 064 — Iconify SW CORS Fix

| Field         | Value                                          |
|---------------|------------------------------------------------|
| Plan ID       | 064                                            |
| Status        | Implemented                                    |
| Version       | 0.9.8 → 0.9.9                                  |
| Branch        | session/64-iconify-sw-cors-fix                 |
| Date          | 2026-03-29                                     |

---

## Summary

Two bugs fixed in this plan:

### Fix 1 — `sw-push-handler.js` served with 1-year immutable cache (nginx)

**Root cause**: `/sw-push-handler.js` lives in `public/` and is imported by the
generated service worker via `importScripts: ['/sw-push-handler.js']`. The nginx
config had an exact-match rule for `/sw.js` with `no-cache` headers, but no
corresponding rule for `sw-push-handler.js`. It fell through to
`location ~* \.(js)$` receiving `Cache-Control: public, immutable; Expires: 1y`.
This meant browser HTTP cache would silently serve the stale push handler for up to
1 year after a deployment, even when `sw.js` was updated.

**Fix**: Added `location = /sw-push-handler.js` exact-match blocks (identical
treatment to `location = /sw.js`) in both `deploy/nginx/nginx-template.conf` and
`deploy/nginx/nginx-uat-template.conf`, placed before the generic `~* \.(js)$` rule.

### Fix 2 — Iconify API domains incorrectly listed in CSP `frame-src`

**Root cause**: `frame-src` restricts where `<iframe>` and `<frame>` elements may
embed content FROM. Iconify APIs (`api.iconify.design`, `api.unisvg.com`,
`api.simplesvg.com`) serve JSON data and are never used as iframe sources. They were
correctly listed in `connect-src` and `default-src` but their presence in `frame-src`
was incorrect CSP hygiene.

**Fix**: Removed the three Iconify API domains from `frame-src` in `next.config.js`.
Value changed from `"frame-src 'self' https://api.iconify.design ..."` to
`"frame-src 'self'"`. Iconify origins remain in `connect-src` (correct) and
`default-src` (correct).

---

## Files Changed

| File                                       | Change                                            |
|--------------------------------------------|---------------------------------------------------|
| `deploy/nginx/nginx-template.conf`         | Added `location = /sw-push-handler.js` no-cache block |
| `deploy/nginx/nginx-uat-template.conf`     | Added `location = /sw-push-handler.js` no-cache block |
| `next.config.js`                           | Removed Iconify origins from `frame-src` directive |
| `package.json`                             | Version bump 0.9.8 → 0.9.9                       |
| `src/__tests__/config/nginx-config.test.ts`| New: 7 regression tests for nginx cache fix       |
| `src/__tests__/config/pwa-config.test.ts`  | Extended: 2 new CSP regression tests              |

---

## TDD Compliance

| Test                                                             | Status  |
|------------------------------------------------------------------|---------|
| has an exact-match location block for /sw-push-handler.js (prod)| ✅ PASS |
| serves /sw-push-handler.js with no-cache headers (prod)          | ✅ PASS |
| places sw-push-handler.js BEFORE generic JS rule (prod)          | ✅ PASS |
| does NOT give sw-push-handler.js a 1-year cache (prod)           | ✅ PASS |
| has an exact-match location block for /sw-push-handler.js (uat)  | ✅ PASS |
| serves /sw-push-handler.js with no-cache headers (uat)           | ✅ PASS |
| places sw-push-handler.js BEFORE generic JS rule (uat)           | ✅ PASS |
| frame-src does not contain Iconify API domains                   | ✅ PASS |
| connect-src retains Iconify API domains                          | ✅ PASS |
| Plan 046 regression suite (5 existing tests)                     | ✅ PASS |

---

## Test Evidence

```
Test Files  2 passed (2)     [config suite]
Tests       14 passed (14)

Full suite:
Test Files  71 passed | 1 skipped (72)
Tests       736 passed | 18 skipped (754)

tsc --noEmit: clean (0 errors)
```

---

## Deferred Items (carried forward from Plan 046)

| ID   | Item                                                                 | Resolution |
|------|----------------------------------------------------------------------|------------|
| DF-1 | Browser-backed icon rendering on `/providers/[id]` with SW active   | Deferred - requires live browser |
| DF-2 | Provider image CacheFirst regression check                           | Deferred - requires live browser |
| DF-3 | Push notification handler smoke test                                 | Deferred - requires live browser |
| DF-4 | Full production build with valid env vars (CI)                       | Deferred - CI gate |
