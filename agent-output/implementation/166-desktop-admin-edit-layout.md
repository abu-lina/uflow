# Implementation: Desktop Admin Edit Page Layout Fixes

**Plan**: `agent-output/planning/166-desktop-admin-edit-layout.md`
**Date**: 2026-06-12

## Changes Made

### Change 1 — Fix header overlap on desktop

**File**: `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:337`

Added `md:pt-[calc(env(safe-area-inset-top)+80px)]` to the `<main>` element's className, providing extra top padding on desktop (`md:` breakpoint, ≥768px) to prevent content from being hidden behind the header.

Before:
```tsx
<main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] px-6 pb-4">
```

After:
```tsx
<main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] md:pt-[calc(env(safe-area-inset-top)+80px)] px-6 pb-4">
```

### Change 2 — Constrain content width on desktop

**File**: `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:338-380`

Wrapped the `ProviderEditForm` component and the "Delete Provider" section in a `<div className="w-full md:max-w-2xl md:mx-auto">` container. The modals (`RejectModal`, `DeleteProviderModal`) remain outside this wrapper so they overlay correctly at full viewport width.

### Change 3 — Constrain admin footer width

**File**: `src/components/providers/ProviderEditForm.tsx:1081`

Added `md:max-w-2xl md:mx-auto` to the admin footer's inner button div className, aligning it with the form content width on desktop.

Before:
```tsx
<div className="flex w-full gap-3.5 px-6 pt-4" style={{ ... }}>
```

After:
```tsx
<div className="flex w-full gap-3.5 px-6 pt-4 md:max-w-2xl md:mx-auto" style={{ ... }}>
```

## Verification Results

| Check | Result |
|-------|--------|
| `npm run type-check` | Passed — 0 errors |
| `npm run lint:fix` | Passed — no new errors introduced (14 pre-existing errors, 137 pre-existing warnings unrelated to these changes) |

## Issues Encountered

None. All 3 changes were pure CSS/Tailwind class additions with no logic changes, new dependencies, or side effects.
