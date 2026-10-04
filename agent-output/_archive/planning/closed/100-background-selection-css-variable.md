---
ID: 100
Origin: 100
UUID: 3c1a8f2e
Status: Committed
---

# Plan 100 — Convert background.selection to CSS Variable

| Field          | Value |
| -------------- | ----- |
| Plan ID        | 100 |
| Target Release | Next available patch after current origin/main version; confirm at DevOps Stage 1 |
| Epic Alignment | Developer Experience / Design System Consistency |
| Related Issues | None |
| Classification | Refactor |
| Pipeline       | Abbreviated |
| GitHub Issue   | (populate after creation) |
| Created        | 2026-04-24T15:10Z |

## Value Statement and Business Objective

**As a** developer working on UFlow, **I want** `background.selection` in `tailwind.config.ts` to use a CSS variable instead of a hardcoded hex value, **so that** the token is consistent with every other color in the design system, can be overridden by themes, and does not break if a dark mode or alternative theme is added.

## Problem Statement

The `background.selection` Tailwind token is the only color in the entire `colors` section of `tailwind.config.ts` that uses a hardcoded hex (`#F2F8F7`) instead of `hsl(var(--color-*))`. Every other token — primary, secondary, success, warning, danger, info, neutral, background, surface, text, border, card — references a CSS variable.

This means:
- `background.selection` is invisible to the runtime theme system
- A future dark-mode or brand-theme override cannot remap it
- It violates the project's stated design principle: *"CSS variables for runtime theme switching"*
- The token is not registered in `src/design-system/tokens/colors.ts` (the canonical design system source of truth)

**Used by**: `bg-background-selection` in `src/features/search/components/WasCategoryResults.tsx` (active selection row + icon fallback slot).

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| 1 | Use `--color-background-selection` as the CSS variable name, following the existing `--color-background` naming convention | [RESOLVED] — consistent with all other background tokens |
| 2 | HSL value for `#F2F8F7` is `170 30% 96%` — a very light, desaturated teal derived from the primary hue | [RESOLVED] — computed via precise hex-to-HSL conversion; visually identical to the current hardcoded color |
| 3 | Register the token in `src/design-system/tokens/colors.ts` so it is part of the canonical token set | [RESOLVED] — all other tokens are registered there; the `background` token there is incomplete (no `selection` key), this fixes that too |
| 4 | No version bump needed — zero runtime UI change; the rendered color is identical | [RESOLVED] — pure refactor of config infrastructure |
| 5 | No test changes needed — existing tests assert the CSS class name (`bg-background-selection`), not the underlying hex value | [RESOLVED] — class name is unchanged; test assertions remain valid |

## Release Strategy

Standalone — no other known active plans target this release. Orthogonal to Plans 098 and 099 (those are closed/QA complete). Can be bundled at DevOps discretion.

## Assumptions

1. `#F2F8F7` → `170 30% 96%` is the correct HSL conversion (verified mathematically)
2. The rendered visual output will be identical before and after — the CSS variable resolves to the same color value in the `:root` block
3. No other components use `background-selection` as a hardcoded hex directly (grep confirms only `tailwind.config.ts` holds the hex; all consumers use the Tailwind class)
4. `src/design-system/tokens/colors.ts` is not imported by runtime code that would break if the `background` token shape changes — it is used only for theme config derivation

## Plan

### Milestone 1: Add CSS variable to globals.css

**Objective**: Register `--color-background-selection` in the `:root` block, under the Surface colors section alongside `--color-background` and `--color-surface`.

**Files**: `src/styles/globals.css`

**Where**: After the existing `--color-overlay: 0 0% 0%;` line in the `/* Design system: Surface colors */` section.

**Value**: `170 30% 96%` (HSL components of `#F2F8F7`)

**Acceptance Criteria**:
- `--color-background-selection: 170 30% 96%;` appears in `:root`
- Placement is in the Surface colors section, not mixed into other token groups
- No other variables are modified

### Milestone 2: Update tailwind.config.ts

**Objective**: Replace the hardcoded hex with `hsl(var(--color-background-selection))`.

**Files**: `tailwind.config.ts`

**Change**: `selection: '#F2F8F7'` → `selection: 'hsl(var(--color-background-selection))'`

**Acceptance Criteria**:
- No hardcoded hex remains in the `colors` section
- The Tailwind class `bg-background-selection` still compiles correctly
- `npm run build` exits 0

### Milestone 3: Register token in design-system tokens

**Objective**: Add the `selection` key to the `background` token in `src/design-system/tokens/colors.ts` so the canonical token file matches the Tailwind config.

**Files**: `src/design-system/tokens/colors.ts`

**Change**: Expand `background` from a flat string to an object with `DEFAULT` and `selection` keys.

**Current**:
```ts
background: '0 0% 100%',
```

**Target shape** (**ILLUSTRATIVE ONLY**):
```ts
background: {
  DEFAULT: '0 0% 100%',
  selection: '170 30% 96%',
},
```

**Acceptance Criteria**:
- `colorTokens.background` is an object with both `DEFAULT` and `selection` keys
- TypeScript compilation passes (`npm run type-check` exits 0)
- No consumers of `colorTokens.background` break (inspect usages — currently it is spread into `defaultTheme.colors` which expects `ThemeConfig['colors']`)

**Risk note**: If `ThemeConfig` types `background` as a plain string, the shape change may require a type update in `src/design-system/themes/theme.types.ts`. Implementer must check `ThemeConfig` definition and update if needed. This is low-risk — the type system will catch any mismatch at compile time.

## Testing Strategy

**Type coverage**: `npm run type-check` — verifies no TypeScript errors from the shape change in `colors.ts`

**Build coverage**: `npm run build` — verifies Tailwind resolves `bg-background-selection` correctly with the new variable

**Regression coverage**: `npm test -- --run` — confirms `WasCategoryResults` tests still pass (they assert the CSS class name, not the hex value)

**Visual regression**: None required — the rendered color is identical (same hex, different encoding)

No new tests are needed. This is a pure config/infrastructure refactor.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `ThemeConfig` type expects `background` as `string`, not object | Low | Low | TypeScript will surface this at compile time; Implementer updates the type to match |
| Theme overrides in `globals.css` (e.g., `[data-theme='dark']`) do not define `--color-background-selection` | Very Low | Low | No dark theme is implemented yet; when one is added, `globals.css` instructions already document the pattern |
| HSL rounding produces a slightly different shade | Very Low | Very Low | `170 30% 96%` round-trips to `#F2F8F7` within 1 digit; imperceptible |

## Duration Estimates

| Phase | Estimate | Notes |
|-------|----------|-------|
| Implementation | 10–15 min | 3 mechanical file edits |
| Verification | 5 min | type-check + build + test |
| Total | 15–20 min | Very low complexity |

## Changelog

| Date | Agent | Change | Notes |
|------|-------|--------|-------|
| 2026-04-24T15:10Z | Planner | Created plan | Convert background.selection from hardcoded hex to CSS variable |
| 2026-04-24T15:16Z | Implementer | Implementation started | Executing M1-M3: globals.css variable addition, tailwind token conversion, design-system token alignment |
| 2026-04-24T16:45Z | Implementer | Implementation complete | M1-M3 delivered; lint/type-check/tests/build all passing; ready for Code Review |
| 2026-04-24T17:05Z | Code Reviewer | Code review approved | Verified Plan 100 token refactor plus post-implementation divider-removal delta; no blocking quality findings before QA |
| 2026-04-24T17:15Z | QA | QA complete | All verification gates pass; 1,068/1,068 tests pass; zero regressions; ready for UAT |
| 2026-04-24T17:21Z | UAT | UAT approved | Value statement delivered; token is consistent with design system, theme-ready; APPROVED FOR RELEASE |
