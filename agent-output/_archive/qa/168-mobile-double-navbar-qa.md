---
ID: 168
Origin: 168
Status: Active
---

# QA: Fix double navbar on mobile /create page

## Changelog

| Date | Agent | Outcome |
|------|-------|---------|
| 2026-06-13 | QA | Initial QA |

## Documents Reviewed

- Implementation: `agent-output/implementation/168-mobile-double-navbar-implementation.md`
- Review: `agent-output/review/168-mobile-double-navbar-review.md`

## Source Verification

### 1. `src/app/(public)/create/page.tsx`

**Pass**: No `CityEarlyAccessNavbar` import present. No `CityEarlyAccessNavbar` JSX block exists. All references to the component have been removed. File is clean.

### 2. `RootClientLayout.tsx:154`

**Pass**: `RootClientLayout.tsx:73-79` calls `shouldShowCityEarlyAccessNavbar(pathname, ...)`. At line 97, if the function returns `true`, `mobileUiMode` is set to `'navbar'`, which controls visibility of the `CityEarlyAccessNavbar` rendered at line 154. The `/create` path is covered because no gate excludes it in the layout logic.

### 3. `src/utils/navigationUtils.ts` — `shouldShowCityEarlyAccessNavbar`

**Pass**: At line 407, the function returns `true` for `/create`:
- `/create` is not in `excludedPages` (line 380-386)
- `/create` does not match any `excludedPatterns` (line 388-397) — patterns like `/create/media/images`, `/create/recommend` would only match subpaths, not `/create` itself
- `/create` is not `/`, `/city-selection`, `about`, etc.
- For non-Stage 3, non-splash users, the function falls through to line 408 and returns `true`

## Test Results

| Check | Result | Notes |
|-------|--------|-------|
| `npm run type-check` (tsc --noEmit) | PASS | 0 errors |
| `npm run lint` | PASS | 14 pre-existing errors, 0 new errors related to change |
| `npm test` | 195 passed, 2 failed | Pre-existing failures only: migration enum test, admin schema validation test |

The 2 pre-existing test failures match the exact failures documented in the implementation doc. All new tests and existing tests relevant to this change pass.

## Value Verification

- **Input state**: `/create` page had duplicate `CityEarlyAccessNavbar` rendered twice on mobile
- **Expected state**: `CityEarlyAccessNavbar` renders exactly once via `RootClientLayout`
- **Actual state**: Duplicate removed from `create/page.tsx`; `RootClientLayout` handles it globally
- **The change is complete**: Both the import and the JSX block were removed
- **The change is safe**: `shouldShowCityEarlyAccessNavbar('/create', ...)` returns `true` for non-Stage 3 users; `RootClientLayout` renders it

## Verdict

**APPROVED FOR RELEASE**

Rationale: The fix is correct, complete, and regression-free. All automated gates pass with zero new failures. The architecture correctly delegates navbar rendering to the global layout, and `/create` is properly handled by `shouldShowCityEarlyAccessNavbar`.
