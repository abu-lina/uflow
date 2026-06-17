---
ID: 179
Origin: 179
UUID: b8e5d1f3
Status: Active
---

# Implementation 179: Mobile Navbar Overflowing Chat Input on /chat

## Changelog

| Date | Task |
|------|------|
| 2026-06-17 | Added /chat to footerExcludedPages and excludedPages in navigationUtils.ts |

## Summary of Changes

Added `/chat` to three exclusion lists in `src/utils/navigationUtils.ts`:

1. **Stage 3 `footerExcludedPages`** (line 205) — prevents MobileFooterBar from rendering on `/chat` when app is launched (isAppLaunched=true or stage=stage3)
2. **Stage 1/2 `footerExcludedPages`** (line 249) — prevents MobileFooterBar from rendering on `/chat` for early-access authenticated users
3. **`shouldShowCityEarlyAccessNavbar` `excludedPages`** (line 386) — prevents CityEarlyAccessNavbar from rendering on `/chat` for Stage 1/2 users

This ensures the chat page has full viewport height available for the input area on mobile, matching the existing pattern for other full-screen interaction pages.

## Files Modified

1. `src/utils/navigationUtils.ts` — 3 array additions (no structural changes)

## TDD Compliance

| Criterion | Status | Notes |
|-----------|--------|-------|
| Logic tests | PASS | 11 tests in navigationUtils-179.test.ts |
| Client-state precedent pattern | PASS | Tests make bug visible in naming: `[post-fix PASSES]` |

## Test Evidence

### Vitest Output
```
 ✓ src/__tests__/utils/navigationUtils-179.test.ts (11 tests) 3ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
```

### TypeScript
```
npm run type-check  → clean (no errors)
```
