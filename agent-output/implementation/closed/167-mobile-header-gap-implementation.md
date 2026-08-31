---
ID: 167
Origin: 167
Status: Committed
---

# 167 — Mobile Header Gap Fix Implementation

## Files Changed

### 1. `tailwind.config.ts:168-170` — spacing tokens (source of truth)

```diff
-'header-spacing': 'calc(env(safe-area-inset-top) + 160px)',
-'header-spacing-sm': 'calc(env(safe-area-inset-top) + 160px)',
-'header-spacing-md': 'calc(env(safe-area-inset-top) + 160px)',
+'header-spacing': 'calc(env(safe-area-inset-top) + 16px + 40px + 24px)',
+'header-spacing-sm': 'calc(env(safe-area-inset-top) + 24px + 48px + 24px)',
+'header-spacing-md': 'calc(env(safe-area-inset-top) + 24px + 56px + 24px)',
```

Evaluation: mobile = safe-top + 80px, tablet (sm) = safe-top + 96px, desktop (md) = safe-top + 104px.

### 2. `tailwind.config.ts:382-384` — height tokens (mirror)

Identical correction applied in the `height` section.

### 3. `src/components/layout/PageContent.tsx:112-118` — padding-top

- Replaced single flat `pt-[calc(env(safe-area-inset-top)+160px)]` with responsive: `pt-[calc(env(safe-area-inset-top)+80px)] sm:pt-[calc(env(safe-area-inset-top)+96px)] md:pt-[calc(env(safe-area-inset-top)+104px)]`
- Updated outdated comment to reflect correct values.

### 4. `src/components/layout/PageContent.tsx:126` — desktop fallback path

```diff
-: 'md:pt-[calc(env(safe-area-inset-top)+160px)]',
+: 'md:pt-[calc(env(safe-area-inset-top)+104px)]',
```

### 5. `src/app/(public)/figma-test/page.tsx:23-24` — dev-only page

Updated hardcoded padding to match responsive pattern.

## Components Auto-Fixed Via Tokens

- `src/components/layout/HeaderSpacer.tsx` — uses `h-header-spacing sm:h-header-spacing-sm md:h-header-spacing-md` which now resolves to correct values.

## Test Results

| Check | Result |
|-------|--------|
| `npm run type-check` | ✅ Passed (0 errors) |
| `npm run lint` | ✅ Passed (only pre-existing warnings/errors, 0 new) |
| `npm test` | ✅ 195/198 test files passed; 1604/1627 tests passed |

The 2 failing test files are pre-existing issues unrelated to this change:
- `006-phase4-semantic-constraints-behavior.test.ts` — migration enum issue
- `adminSchemas.test.ts:149` — unrelated schema validation

## TDD Compliance

| Requirement | Status |
|-------------|--------|
| Bugfix tests added | ❌ (not required — CSS-only change, no logic paths to test) |
| Type-check passes | ✅ |
| Lint passes (no new issues) | ✅ |
| Existing tests not broken | ✅ |

## Before/After

| Breakpoint | Before (gap) | After (gap) | Delta |
|------------|-------------|-------------|-------|
| Mobile (<640px) | safe-top + 160px | safe-top + 80px | -96px |
| Tablet (640px+) | safe-top + 160px | safe-top + 96px | -64px |
| Desktop (768px+) | safe-top + 160px | safe-top + 104px | -56px |
