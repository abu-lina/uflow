---
ID: 166
Origin: 166
UUID: b8f4a3c2
Status: Active
---

# Architecture Assessment: Desktop Admin Edit Page Layout

**Date**: 2026-06-12
**Scope**: Fix two desktop layout issues on `/dashboard/providers/[id]/edit`

## Current State

### 1. Header overlap on desktop
The `<main>` element in `page.tsx` uses a hardcoded padding-top:
```
pt-[calc(env(safe-area-inset-top)+24px+40px)]
```
The `40px` is the mobile header height (`--header-height-mobile`). But on desktop (`sm:` breakpoint), the header is 48px (`h-header-height-tablet`). Total header height on desktop is:
- 24px top padding + 48px content + 8px bottom padding = **80px**
- The `<main>` only clears **64px** (24 + 40)
- Result: **16px** of content hidden behind the fixed header

### 2. Full-width fields on desktop
No `max-width` constraint exists anywhere in the layout chain:
- `<div className="flex h-screen-fix flex-col">` — no max-w
- `<main className="flex flex-1 flex-col px-6">` — flex-1 fills viewport width
- `<form className="flex flex-1 flex-col">` — flex-1 fills
- `<div className="flex flex-1 flex-col gap-8 pt-8 pb-24">` — flex-1 fills
- All fields use `w-full`

On a 1920px monitor: form fields stretch to ~1872px wide.

## Proposed Changes

### Approach: Minimal, focused CSS changes without component restructuring
Instead of introducing `ScrollablePageLayout` or `PageContent` wrappers (which would change the component architecture), use targeted responsive Tailwind classes:

#### Fix 1: Responsive padding-top
Change `<main>` padding to use `md:` breakpoint:
- Mobile (default): `pt-[calc(env(safe-area-inset-top)+24px+40px)]` (64px + safe)
- Desktop (md+): `md:pt-[calc(env(safe-area-inset-top)+80px)]` (matches desktop header at 80px)

#### Fix 2: Constrain content width on desktop
Wrap the `<ProviderEditForm>` + delete section in a container:
- Desktop (md+): `md:max-w-2xl md:mx-auto`
- This limits content to ~672px max on desktop and centers it
- Also constrain the admin footer button area to match

#### Fix 3: Admin footer width constraint
In `ProviderEditForm.tsx`, the admin footer's inner button container needs:
- `md:max-w-2xl md:mx-auto` to match the content width

## Rationale

- **No architectural restructuring**: Minimal CSS changes, no new components
- **Progressive enhancement**: Mobile layout unchanged, desktop gets better spacing
- **Existing patterns**: `max-w-2xl` is used elsewhere in the dashboard; `md:` breakpoint matches standard Tailwind desktop targets
- **No data model or logic changes**: Pure CSS/layout

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Mobile layout regression | Medium | Low | Only add `md:` prefixed classes, mobile defaults unchanged |
| Footer not aligning with content | Low | Low | Both use same `max-w-2xl mx-auto` pattern |
| Header overlap on tablet | Low | Low | Use `md:` breakpoint (768px), safe for all tablet sizes |

## Verdict

**APPROVED** — Low-risk CSS-only changes. Two files to modify: `page.tsx` and `ProviderEditForm.tsx`. No architectural concerns.
