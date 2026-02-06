# Design System Color Migration Guide

This document maps hardcoded colors and undefined tokens to semantic design system tokens. Use it when migrating components.

## Hardcoded hex → semantic tokens

### Brand / primary

| Hardcoded | Replace with |
|-----------|--------------|
| `bg-[#589d96]` | `bg-primary` |
| `bg-[#4a8a84]` | `bg-primary-dark` |
| `text-[#589d96]` | `text-primary` |
| `border-[#589d96]` | `border-primary` |
| `#589d96` (inline/CSS) | `hsl(var(--color-primary))` |
| `#438983` | `primary-dark` |
| `#356e6a` | `primary-darker` |
| `#b8d6d2` | `primary-light` |

### Success / green

| Hardcoded | Replace with |
|-----------|--------------|
| `bg-[#4CA987]` | `bg-success` |
| `text-[#4CA987]` | `text-success` |
| `#4a8a84` (teal-green) | `bg-primary-dark` or `bg-success` (by context) |

### Danger / red

| Hardcoded | Replace with |
|-----------|--------------|
| `bg-[#D86363]` | `bg-danger` |
| `bg-[#B84F4F]` | `bg-danger-dark` |
| `text-[#D86363]` | `text-danger` |
| `text-red-500` | `text-danger` |
| `outline-red-500` | `outline-danger` |

### Warning / orange

| Hardcoded | Replace with |
|-----------|--------------|
| `bg-[#E6A94C]` | `bg-warning` |
| `text-[#E6A94C]` | `text-warning` |

### Neutral / gray

| Hardcoded | Replace with |
|-----------|--------------|
| `#0b0b0b` | `text-content-heading` or `text-text-primary` |
| `#3d3d3d` | `text-content` or `text-text-primary` |
| `#888888` | `text-content-muted` or `text-text-muted` |
| `#232323` | `text-text-primary` |
| `#D4D4D4` | `border-border` or `border` |
| `#E7E7E7` | `border-border-light` or `bg-neutral-100` |
| `#EEEEEE` | `bg-neutral-100` |
| `#F6F6F6` | `bg-neutral-50` or `bg-neutral-muted` |
| `#CDCDCD` | `bg-neutral-300` or `neutral` |
| `#f5f5f5` | `bg-neutral-50` (or keep gradient) |
| `#fbfbfb` | `bg-neutral-50` |
| `gray-300` | `neutral-300` or `border` |

### White / black

| Hardcoded | Replace with |
|-----------|--------------|
| `#FFFFFF` | `bg-background` or `bg-white` |
| `#000000` | `text-text-primary` (dark) or `bg-overlay` |
| `bg-black/40` | Keep or use `bg-overlay/40` |

---

## Undefined tokens → semantic tokens

These class names were used but not defined in Tailwind. Replace with the following.

| Undefined / legacy | Replace with |
|--------------------|--------------|
| `text-uFlowDarkGrey` | `text-content` or `text-text-primary` |
| `outline-uFlowDarkGrey` | `outline-border` or `outline-border-default` |
| `bg-card` | `bg-surface` or `bg-card` (now defined) |
| `text-card-foreground` | `text-card-foreground` (now defined) or `text-text-primary` |

---

## Deprecated → new token

Prefer the new names in new code; old names remain supported during migration.

| Deprecated | New |
|------------|-----|
| `text-content` | `text-text-primary` or keep `text-content` |
| `text-content-heading` | `text-text-primary` or `text-content-heading` |
| `text-content-muted` | `text-text-muted` or `text-content-muted` |
| `bg-neutral` (old semantic) | `bg-neutral-300` or `bg-neutral` |
| `bg-neutral-light` | `bg-neutral-100` or `bg-neutral-light` |
| `bg-neutral-muted` | `bg-neutral-50` or `bg-neutral-muted` |

---

## Migration pattern

1. **In JSX/className**
   - Replace hex classes like `bg-[#589d96]` with `bg-primary`.
   - Replace undefined classes like `text-uFlowDarkGrey` with `text-content` or `text-text-primary`.

2. **In inline styles**
   - Replace `backgroundColor: '#589d96'` with `backgroundColor: 'hsl(var(--color-primary))'`.

3. **In CSS/SCSS**
   - Replace `#589d96` with `hsl(var(--color-primary))`.

4. **Context-dependent**
   - `#4a8a84`: primary action → `primary-dark`; success state → `success`.
   - `uFlowDarkGrey`: text → `text-content`; border/outline → `border` or `outline-border`.

---

## Priority order for migrating files

1. **Priority 1 – Core UI (25 files)**  
   Button, Input, Card, FormInput, FormField, IconButton, skeleton components.

2. **Priority 2 – Layout (15 files)**  
   Header, MobileHeader, DesktopFooter, PageHeader, ScrollablePageHeader.

3. **Priority 3 – Feature (27 files)**  
   Provider cards, provider forms/modals, auth (LoginModal, SignupModal), create flow pages.

---

## Verification

After migrating a file:

- [ ] No hex color literals in `className` or `style`.
- [ ] No `uFlowDarkGrey`, `bg-card`, or `text-card-foreground` unless they are the now-defined tokens.
- [ ] Interactive states use semantic tokens (e.g. `hover:bg-primary-dark`).
- [ ] Visual check: colors match previous appearance (or intended design).
