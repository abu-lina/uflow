---
ID: 166
Origin: 166
Status: Draft
---

# Implementation Plan: Desktop Admin Edit Page Layout Fixes

**Date**: 2026-06-12
**Scope**: Fix two desktop layout issues on `/dashboard/providers/[id]/edit`

Architecture assessment: `agent-output/architecture/166-desktop-admin-edit-layout.md`

---

## Files to Modify

### File 1: `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`

**Fix 1 — Header overlap (line 337)**

Before:
```tsx
<main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] px-6 pb-4">
```

After:
```tsx
<main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] md:pt-[calc(env(safe-area-inset-top)+80px)] px-6 pb-4">
```

**Fix 2 — Full-width fields (wrap content starting ~line 338)**

Before:
```tsx
      <main className="...">
        <ProviderEditForm ... />
        {/* Delete Provider Section */}
        <div className="mt-8 border-t ...">...</div>
        <RejectModal ... />
        <DeleteProviderModal ... />
      </main>
```

After:
```tsx
      <main className="...">
        <div className="w-full md:max-w-2xl md:mx-auto">
          <ProviderEditForm ... />
          {/* Delete Provider Section */}
          <div className="mt-8 border-t ...">...</div>
        </div>
        <RejectModal ... />
        <DeleteProviderModal ... />
      </main>
```

Note: Modals must remain outside the width-constrained wrapper so they overlay correctly.

---

### File 2: `src/components/providers/ProviderEditForm.tsx`

**Fix 3 — Admin footer button container (line 1081)**

Before:
```tsx
<div className="flex w-full gap-3.5 px-6 pt-4" style={{ ... }}>
```

After:
```tsx
<div className="flex w-full gap-3.5 px-6 pt-4 md:max-w-2xl md:mx-auto" style={{ ... }}>
```

---

## Order of Implementation

1. **page.tsx Fix 1** — Add `md:pt-[calc(env(safe-area-inset-top)+80px)]`
2. **page.tsx Fix 2** — Wrap content div with `md:max-w-2xl md:mx-auto`
3. **ProviderEditForm.tsx Fix 3** — Constrain admin footer width

---

## Testing Approach

- **No logic changes** — pure CSS/Tailwind class additions
- **Visual check on desktop** (min 1024px width):
  - Verify top of form content is visible (no header overlap)
  - Verify form fields and buttons max out at ~672px (`max-w-2xl`)
  - Verify admin footer buttons align with form content width
- **Mobile regression check** (< 768px):
  - Verify padding-top is unchanged (still 24px + 40px)
  - Verify content is still full-width (no `md:` classes apply)
  - Verify footer is still full-width
- **Tablet regression check** (768px–1023px):
  - `md:` breakpoint activates at 768px, so tablet also gets the fixes — verify this is acceptable

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Mobile layout unchanged | All changes use `md:` prefix, mobile defaults untouched |
| Modals broken by width constraint | Modals remain outside the constrained `<div>` |
| Footer misalignment | Footer uses same `max-w-2xl mx-auto` as content wrapper |
