# uFlow Design System

CSS variable-based design system with runtime theme switching. All UI components use semantic color tokens so you can change the theme by swapping CSS variables.

## Overview

- **Colors**: Defined as CSS variables in `src/styles/globals.css` (`:root` and `[data-theme="dark"]`).
- **Tailwind**: `tailwind.config.ts` maps semantic names (e.g. `primary`, `danger`) to `hsl(var(--color-*))`.
- **Theming**: `ThemeProvider` and `ThemeSwitcher` enable runtime theme switching (default / dark).

## Usage

### Theme Provider

Wrap the app (or a subtree) with `ThemeProvider`. Already integrated in `ClientProviders`.

```tsx
import { ThemeProvider } from '@/design-system';

<ThemeProvider defaultTheme="default" storageKey="uflow-theme">
  <App />
</ThemeProvider>
```

### Theme Switcher

Use `ThemeSwitcher` where you want users to change theme (e.g. settings or header).

```tsx
import { ThemeSwitcher } from '@/design-system';

<ThemeSwitcher className="..." />
```

### Using tokens in components

Use semantic Tailwind classes so colors follow the active theme:

```tsx
<button className="bg-primary text-white hover:bg-primary-dark">
  Submit
</button>

<p className="text-content-heading">Title</p>
<p className="text-content-muted">Secondary text</p>

<div className="border border-border bg-surface rounded-lg" />
```

In custom CSS:

```css
.my-element {
  background: hsl(var(--color-primary));
  color: hsl(var(--color-text-inverse));
}
```

## Design tokens

### Colors

| Token | Usage |
|-------|--------|
| **Brand** | `primary`, `primary-light`, `primary-dark`, `primary-darker` |
| **Semantic** | `success`, `warning`, `danger`, `info` (each: DEFAULT, light, dark, soft) |
| **Neutral** | `neutral-50` … `neutral-950` |
| **Surface** | `background`, `surface` |
| **Text** | `text-primary`, `text-secondary`, `text-muted`, `text-inverse` (via `text-text-*` or `content.*`) |
| **Border** | `border`, `border-light`, `border-muted` |

### Typography

- **Fonts**: `font-inter`, `font-inter-tight` (heading).
- **Scale**: Minor Third (1.2) — see `tailwind.config.ts` `fontSize`.

### Spacing

- Rule of 8: 8, 16, 24, 32, 40, 48, 64, 80, 96, 128 px.
- Use Tailwind spacing scale and design tokens in `tailwind.config.ts`.

### Border radius

- `rounded-xs` (8px), `rounded-sm` (12px), `rounded-md` (14px), `rounded-lg` (16.8px), `rounded-full`.

## Adding a new theme

1. In `globals.css`, add a block:

   ```css
   [data-theme='custom'] {
     --color-primary: 210 100% 50%;
     /* override other --color-* as needed */
   }
   ```

2. In `ThemeProvider`, add `'custom'` to `availableThemes`.
3. Optionally add a label in `ThemeSwitcher` for the new theme.

## Creating a custom theme (brand colors only)

Override only the variables you need; the rest inherit from `:root` or the base theme.

## Migration

See [MIGRATION.md](./MIGRATION.md) for replacing hardcoded hex colors and legacy tokens with semantic tokens.

## QA checklist (after changes)

- [ ] `npm run build` passes.
- [ ] Key pages render (home, login, profile, create flow).
- [ ] Theme switcher toggles `[data-theme]` and persists in localStorage.
- [ ] Dark theme applies (if implemented) with readable contrast.
- [ ] No console errors from design-system or theme code.
- [ ] Buttons, inputs, cards use semantic colors (no raw hex in classNames).

## Future package extraction

This folder is structured so it can be moved into its own repo and published (e.g. `@uflow/design-system`). When extracting:

1. Move `src/design-system` to the new package.
2. Add a `package.json` with peer deps: `react`, `react-dom`, `tailwindcss`.
3. In the app, install the package and replace `@/design-system` imports with the package name.
4. Ensure the app’s `globals.css` (or equivalent) still defines the same `--color-*` variables, or ship a base CSS file from the package.
