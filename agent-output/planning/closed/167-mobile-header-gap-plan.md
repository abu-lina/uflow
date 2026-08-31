---
ID: 167
Origin: 167
Status: Committed
---

# 167 — Mobile Header Gap Fix Implementation Plan

## Changelog

| Date | Event | Outcome |
|------|-------|---------|
| 2026-06-13 | Plan created (Planner) | Implementation steps defined. Handoff to Implementer. |

## Implementation Steps

### Step 1 — Fix `tailwind.config.ts` spacing tokens (source of truth)

**File**: `tailwind.config.ts:168-170`

Current (wrong, all flattened to 160px):
```ts
'header-spacing': 'calc(env(safe-area-inset-top) + 160px)',
'header-spacing-sm': 'calc(env(safe-area-inset-top) + 160px)',
'header-spacing-md': 'calc(env(safe-area-inset-top) + 160px)',
```

Replace with design system values from `src/design-system/tokens/spacing.ts:43-45`:
```ts
'header-spacing': 'calc(env(safe-area-inset-top) + 16px + 40px + 24px)',
'header-spacing-sm': 'calc(env(safe-area-inset-top) + 24px + 48px + 24px)',
'header-spacing-md': 'calc(env(safe-area-inset-top) + 24px + 56px + 24px)',
```

These evaluate to:
- Mobile: `safe-top + 80px`
- Tablet (sm): `safe-top + 96px`
- Desktop (md): `safe-top + 104px`

### Step 2 — Fix `tailwind.config.ts` height tokens (mirror)

**File**: `tailwind.config.ts:382-384`

Same three lines duplicated in the `height` section. Apply identical correction.

### Step 3 — Fix `PageContent.tsx` padding-top

**File**: `src/components/layout/PageContent.tsx:115`

Change the flat mobile padding:
```
'pt-[calc(env(safe-area-inset-top)+160px)]',
```
to responsive classes:
```ts
'pt-[calc(env(safe-area-inset-top)+80px)]',
'sm:pt-[calc(env(safe-area-inset-top)+96px)]',
'md:pt-[calc(env(safe-area-inset-top)+104px)]',
```

**File**: `src/components/layout/PageContent.tsx:122-123`

Also fix the desktop fallback path when `centerVertically` is false (line 123):
```
: 'md:pt-[calc(env(safe-area-inset-top)+160px)]',
```
→
```
: 'md:pt-[calc(env(safe-area-inset-top)+104px)]',
```

Line 113 comment is outdated — optionally fix the comment to match real values.

### Step 4 — Fix `HeaderSpacer.tsx` (auto-fix via tokens)

**File**: `src/components/layout/HeaderSpacer.tsx:39`

No code change needed. This component already uses `h-header-spacing sm:h-header-spacing-sm md:h-header-spacing-md` which resolves to the Tailwind token values. Fixing the tokens in Step 1 + Step 2 automatically fixes this component.

### Step 5 — Fix `figma-test/page.tsx` (dev-only, low priority)

**File**: `src/app/(public)/figma-test/page.tsx:24`

Contains hardcoded `pt-[calc(env(safe-area-inset-top)+160px)]` with a comment `// Figma uses pt-[calc(env(safe-area-inset-top)+160px)]`. Update to match final values or flag as a dev-only page that will be removed.

## Files Not Requiring Changes

The following files match "160px" but use it for non-header-spacing purposes (image heights, card widths, form fields):
- `src/components/providers/ProviderDetailModal.tsx` — card image dimensions (unrelated)
- `src/components/ui/FormField.tsx` — textarea height (unrelated)
- `src/components/shared/SelectableCard.tsx` — card width/height (unrelated)
- `src/components/create/ProviderOptionCard.tsx` — min-height for card (unrelated)
- `src/components/providers/ProviderCreationForm.tsx` — textarea height (unrelated)
- `src/app/(public)/create/media/images/page.tsx` — image preview height (unrelated)
- `src/app/(public)/profile/providers/[provider_id]/edit/images/page.tsx` — image preview height (unrelated)
- `src/app/(dashboard)/dashboard/providers/[id]/edit/images/page.tsx` — image preview height (unrelated)
- `src/app/(dashboard)/dashboard/community-services/[id]/edit/images/page.tsx` — image preview height (unrelated)

No changes needed for these files.

## Affected Pages (47 files import PageContent)

All pages using `ScrollablePageLayout + PageHeader + PageContent` pattern are affected and will be fixed automatically by changing `PageContent.tsx`. No per-page changes needed.

Key affected routes:
- `/create` and all create-flow sub-pages
- `/saved`
- `/profile` (mobile)
- `/search`
- `/terms`, `/privacy-policy`, `/impressum`

## Edge Cases

1. **DesktopCreateLayout** (`/create` on desktop): Uses separate `DesktopCreateLayout` component, not `PageContent`. Verify desktop `/create` is unaffected after the fix.

2. **Profile desktop branch**: `/profile` renders a `desktopContent` branch without `PageContent`. Verify desktop profile renders correctly.

3. **`centerVertically` prop**: When `true`, desktop already uses `80px` for top padding. Ensure this still works after changing the `md:` values. The `centerVertically` branch already has its own desktop padding (80px), which is different from the standard 104px — this is intentional (visual centering uses a smaller offset). Do not change the `centerVertically` branch.

4. **Non-notch devices (iPhone SE)**: `env(safe-area-inset-top)` evaluates to `0px` on non-notch devices. Validate gap is correct on SE and iPhone 15.

5. **Dark mode**: Tailwind config has no dark-mode specific spacing values — no changes needed.

## Testing Strategy

### Unit tests
- Run `npm test` to ensure no existing tests break.
- Check if `PageContent` has component tests; add one if missing that explicitly tests the padding classes.

### Type checking
- Run `npm run type-check` — all changes are pure CSS value swaps, no type impact expected.

### Linting
- Run `npm run lint` — no structural changes, should pass.

### Visual verification (manual)
1. Mobile viewport (375px): Verify 80px gap (safe-top + 80px) between header bottom and content top.
2. Tablet viewport (640px+): Verify 96px gap.
3. Desktop viewport (768px+): Verify 104px gap.
4. `/create` page: Verify mobile gap is correct; verify desktop uses `DesktopCreateLayout` unaffected.
5. `/profile` page: Verify mobile gap is correct; verify desktop desktopContent branch unaffected.
6. iPhone SE: Verify `env(safe-area-inset-top)` = 0px produces correct 80px gap.
7. iPhone 15 Pro: Verify `env(safe-area-inset-top)` = 47px produces correct 127px gap.

### Regression check
- Open 3-4 affected pages (`/saved`, `/search`, `/terms`, a create-flow sub-page) and verify content is not clipped or overlapped by the header.

## Rollback

The fix is a single-commit change to 2 files (`PageContent.tsx` + `tailwind.config.ts`). If issues arise:
1. `git revert <commit-hash>` to restore previous behavior
2. Verify regression with same visual checks above
