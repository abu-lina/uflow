---
ID: 168
Origin: 168
Status: Active
---

# Implementation: Fix double navbar on mobile /create page

## Problem
`/create` page rendered `CityEarlyAccessNavbar` twice on mobile:
1. Explicitly in `create/page.tsx:107-110`
2. Already managed by `RootClientLayout.tsx:154` (global layout)

## Changes

### File: `src/app/(public)/create/page.tsx`

**Removed import:**
```diff
- import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';
```

**Removed JSX block:**
```diff
-      {/* Bottom Navigation Bar - Mobile Only */}
-      <div className="block md:hidden">
-        <CityEarlyAccessNavbar />
-      </div>
```

The import was verified to be used only in the removed block.

## Verification

| Check | Result |
|-------|--------|
| `npm run type-check` | 0 errors |
| `npm run lint` | No new issues (all warnings/errors pre-existing) |
| `npm test` | 195 passed, 2 pre-existing failures (unrelated): migration enum test, admin schema validation test |
