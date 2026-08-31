# 167 — Excessive Mobile Header Gap on /create, /saved, /profile

## Changelog

| Date       | Event                        | Outcome                                    |
| ---------- | ---------------------------- | ------------------------------------------ |
| 2026-06-13 | Initial analysis (Analyst)   | Root cause identified (L1 Proven). Handoff. |

## Value Statement

On mobile, the `/create`, `/saved`, and `/profile` pages show an excessive ~96 px gap between the fixed `PageHeader` and the body content. This wastes vertical space on small screens, pushes content below the fold, and makes the pages feel broken.

## Methodology

1. **Component Hierarchy Trace** — Traced layout from page files through `ScrollablePageLayout` → `PageHeader` + `PageContent`.
2. **Height Arithmetic** — Computed actual header height vs. the content offset padding.
3. **Config Drift Detection** — Compared `tailwind.config.ts` spacing tokens against the design system source of truth in `src/design-system/tokens/spacing.ts`.

## Findings

### F1 — Root Cause: `PageContent` padding-top is 2× the correct value [L1 Proven]

All three pages share the same layout pattern:

```tsx
<ScrollablePageLayout>
  <PageHeader title="..." variant="title-only" />
  <PageContent ...>
    {children}
  </PageContent>
</ScrollablePageLayout>
```

**Actual header height (mobile):** — `src/components/layout/PageHeader.tsx:190`

```
pt-[calc(env(safe-area-inset-top)+16px)]   = 16px + safe area
h-header-height-mobile                      = 40px
pb-2                                        = 8px
Total: env(safe-area-inset-top) + 64px
```

**Content offset:** — `src/components/layout/PageContent.tsx:115`

```
pt-[calc(env(safe-area-inset-top)+160px)]
```

**Gap:** 160 − 64 = **96 px** on mobile.

The correct padding-top (matching header + 24px `content-gap`) would be:

```
pt-[calc(env(safe-area-inset-top)+80px)]
```

| Dimension | Value |
|-----------|-------|
| Actual header height | safe-area + 64 px |
| Current content offset | safe-area + 160 px |
| **Excess gap** | **96 px** |
| Correct offset | safe-area + 80 px |

### F2 — `tailwind.config.ts` spacing tokens are stale/wrong [L1 Proven]

The design system source of truth (`src/design-system/tokens/spacing.ts:43-45`) has the correct values:

| Token | Design system value | Tailwind config value |
|-------|-------------------|----------------------|
| `header-spacing` (mobile) | `calc(env(sai-top) + 16 + 40 + 24)` = **80px** | `calc(env(sai-top) + 160px)` = **160px** |
| `header-spacing-sm` (tablet) | `calc(env(sai-top) + 24 + 48 + 24)` = **96px** | `calc(env(sai-top) + 160px)` = **160px** |
| `header-spacing-md` (desktop) | `calc(env(sai-top) + 24 + 56 + 24)` = **104px** | `calc(env(sai-top) + 160px)` = **160px** |

The `tailwind.config.ts` flattened all three breakpoints to 160px, which:
- Mobile: 80px too much
- Tablet: 64px too much
- Desktop: 56px too much

**Source**: `tailwind.config.ts:168-170`

### F3 — Both inlined styles AND config-derived classes are broken [L1 Proven]

`PageContent.tsx:115` hardcodes `pt-[calc(env(safe-area-inset-top)+160px)]` directly. This is the value that produces the visible gap.

The `HeaderSpacer` component (`src/components/layout/HeaderSpacer.tsx:39`) uses the Tailwind utility class `h-header-spacing` which resolves to the same wrong 160px value from `tailwind.config.ts`.

Two separate mechanisms, same wrong number.

### F4 — Correct pattern exists elsewhere in codebase [L2 Observed]

Several pages correctly compute the header offset:

```
src/app/(public)/profile/providers/[provider_id]/edit/needs/page.tsx:151
  pt-[calc(env(safe-area-inset-top)+24px+40px+24px)]   ← correct (24+40+24 = 88px)

src/app/(public)/profile/providers/[provider_id]/edit/category/page.tsx:157
  pt-[calc(env(safe-area-inset-top)+24px+40px+24px)]   ← correct

src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:337
  pt-[calc(env(safe-area-inset-top)+24px+40px)]         ← correct for no-gap layout
```

These use inline `calc()` with explicit token values rather than the broken Tailwind utility class.

### F5 — Scope: all pages using `PageContent` with the broken offset [L1 Proven]

47 files import `PageContent` (from `src/components/layout/PageContent`). All pages using `ScrollablePageLayout + PageHeader + PageContent` are affected, including but not limited to:
- `/create` and all create-flow sub-pages
- `/saved`
- `/profile` (mobile)
- `/search`
- `/terms`, `/privacy-policy`, `/impressum`

### F6 — Desktop may appear unaffected due to different layouts [L3 Inferred]

On desktop, `/create` uses `DesktopCreateLayout` which has its own max-width structure. `/profile` renders a separate `desktopContent` branch without `PageContent`. However, **desktop** scrollable pages using `PageContent` would still get 160px (header at md breakpoint would be `24+56+8=88px`, so gap = 72px — still excessive but less noticeable on larger screens).

## Invisible Interceptor Summary

| Candidate | Type | Confirmed? |
|-----------|------|-----------|
| `PageContent` padding-top | CSS `pt-[calc(...)+160px]` | Yes — primary cause. 96px excess gap. |
| `tailwind.config.ts` tokens | Stale config values | Yes — source of wrong 160px for `h-header-spacing` classes. |
| `h-header-spacing` utility | Used by `HeaderSpacer` | Yes — but `HeaderSpacer` isn't used in these three pages. |
| `PageHeader` itself | `fixed top-0` | No — header renders correctly at 64px. |

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Why 160px was chosen originally | No — root cause is clear (doubled 80px) | N/A — fix it. | N/A |
| 2 | Whether DesktopCreateLayout compensates differently | Low — desktop uses separate layout | Verify visually after fix. | QA |
| 3 | Test on iPhone SE (non-notch) | Low | Validate gap is correct on SE and iPhone 15. | QA |

## Analysis Recommendations

1. **Fix `PageContent.tsx:115`:** Change `pt-[calc(env(safe-area-inset-top)+160px)]` to `pt-[calc(env(safe-area-inset-top)+80px)]` for mobile. For responsive:
   - Mobile: `pt-[calc(env(safe-area-inset-top)+80px)]`
   - Tablet (sm): `sm:pt-[calc(env(safe-area-inset-top)+96px)]`
   - Desktop (md): `md:pt-[calc(env(safe-area-inset-top)+104px)]`

2. **Fix `tailwind.config.ts:168-170`:** Replace the flat 160px values with the correct per-breakpoint values from `src/design-system/tokens/spacing.ts:43-45`.

3. **Align with design system:** The existing `content-gap` (24px) token should be the single source of truth for the gap between header bottom and content. Express all header spacing as `header-padding + header-height + content-gap`.

## Open Questions

None — root cause fully determined at L1 Proven.
