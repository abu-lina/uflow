---
ID: 142
Origin: 142
UUID: a3f7c2b1
Status: Active
---

# Code Review: Nearby Provider Click Navigation

**Plan Reference**: `agent-output/planning/142-nearby-clickable-plan.md`
**Implementation Reference**: `agent-output/implementation/142-nearby-clickable-implementation.md`
**Date**: 2026-06-04
**Reviewer**: Code Reviewer

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-06-04 | Implementer | Code Review | Review clickable nearby provider navigation |

## Architecture Alignment

**Alignment Status**: ALIGNED

Implementation follows the established pattern of `useRouter` + `onClick` for client-side navigation, consistent with the rest of the codebase. All changes stay within `src/features/providers/components/ProviderDetailSections.tsx`. No architecture concerns.

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes
**Concerns**: None. Pre-change tests (10 passing), post-change tests (12 passing), TypeScript compiles.

## Findings

### Medium

**[MEDIUM] UX/Usability**: `cursor-pointer` on non-interactive `DetailListItem` elements
- **Location**: `src/features/providers/components/ProviderDetailSections.tsx:135`
- **Issue**: `cursor-pointer` is applied to all `DetailListItem` instances via the shared `className` string. When no `onClick` is provided, the element renders as a `<div>` with `cursor-pointer`, making it appear clickable when it isn't (amenities, menu items). This is misleading — users will see a pointer cursor on non-interactive elements and may attempt to click them with no feedback.
- **Impact**: Misleading affordance. Users expect clickability from elements showing pointer cursor.
- **Recommendation**: Move `cursor-pointer` to the `<button>` branch only, or make it conditional on `onClick`:

  ```tsx
  const className = `flex w-full items-center gap-3 rounded-xl p-2${onClick ? ' cursor-pointer' : ''}`;
  ```
  or rely on the browser default (buttons already show pointer cursor).

### Minor

**[MINOR] Accessibility**: Missing `type="button"` on `<button>` element
- **Location**: `src/features/providers/components/ProviderDetailSections.tsx:132-143`
- **Issue**: The conditional `<button>` element lacks a `type` attribute. The default type for `<button>` is `submit`, which could cause unintended form submissions if the component is ever used within a `<form>`.
- **Impact**: No impact in current usage (no wrapping form). But it's a best-practice violation that could cause bugs if the component is reused.
- **Recommendation**: Add `type="button"` to the button element:

  ```tsx
  const buttonProps = onClick ? { type: 'button' as const, onClick } : {};
  // or inline:
  <Component type={Component === 'button' ? 'button' : undefined} ... />
  ```

**[MINOR] Test quality**: Inconsistent mock setup between navigation and non-navigation tests
- **Location**: `src/__tests__/features/providers/ProviderDetailSections.test.tsx:329` and `:361`
- **Issue**: The navigation test (line 329) wraps `useRouter` in `vi.fn(() => ...)`, while the non-navigation test (line 361) uses a plain arrow function `() => ...`. This inconsistency doesn't affect correctness but violates the principle of consistent test patterns, especially within the same test suite.
- **Recommendation**: Use `vi.fn(() => ...)` consistently in both tests for the `useRouter` mock.

### Info

**[INFO] Security**: No injection risk
- The `provider_id` value used in `router.push(`/providers/${nearby.provider_id}`)` comes from the Supabase query result (database output), not user input. Even if a malicious `provider_id` existed in the database, `router.push` properly encodes URLs. No remediation needed.

**[INFO] Performance**: No concerns
- `useRouter()` is called once at the component level. Inline arrow functions for `onClick` are recreated each render, but `DetailListItem` is not memoized, so this causes no unnecessary re-renders.

**[INFO] Critique findings addressed**: F1 and F2 from the critique were both addressed. F1: navigation test uses `getByRole('button', ...)`. F2: `cursor-pointer` added (though its blanket application created the MEDIUM finding above).

## Positive Observations

- Clean, minimal change surface. The `Component = onClick ? 'button' : 'div'` pattern is idiomatic and readable.
- Test coverage includes both the happy path (navigation works) and the regression path (non-clickable items don't navigate).
- Dynamic import pattern in `beforeAll` creatively works around the global mock to intercept `useRouter` calls — though fragile, it's a documented and deliberate approach.
- All existing 10 tests pass, and both new tests pass. TypeScript compiles cleanly.

## Verdict

**Status**: APPROVED_WITH_COMMENTS

The implementation is correct, well-structured, and causes no regressions. The functional behavior (navigate to provider detail on nearby item click) works as specified. Two minor issues and one medium UX concern should be addressed but don't warrant rejection.

## Required Actions

1. **MEDIUM**: Fix `cursor-pointer` to only apply to the interactive `<button>` variant (not non-interactive `<div>` elements).
2. **MINOR**: Add `type="button"` to the `<button>` element.
3. **MINOR**: Align `useRouter` mock style between the two new tests.

## Next Steps

Handoff to Implementer for the above fixes, then route back for verification.
