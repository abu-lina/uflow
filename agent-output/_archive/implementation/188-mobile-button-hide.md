---
ID: 188
Origin: 188
UUID: c1d5e4f3
Status: Active
---

# Plan 188 — Mobile Admin Button Hide

## 1. Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Initial implementation | Implementer |

## 2. Summary

Bug: On mobile, admin Approve/Reject buttons in ProviderCard moderation mode were oversized (h-12, flex-1) and dominated the card. Fixed by hiding the moderation button wrapper below the `sm:` breakpoint (640px) using Tailwind's responsive utility classes.

## 3. Files Changed

**`src/components/providers/ProviderCard.tsx`** (line 548)
- Changed wrapper div className from `"flex w-full gap-2"` to `"hidden w-full gap-2 sm:flex"`
- This hides the moderation buttons on mobile (<640px) and shows them on desktop (>=640px)

**`src/__tests__/components/ProviderCard.test.tsx`**
- Added import of `mockMatchMedia` from test-utils
- Added test `should have hidden class on moderation wrapper for mobile (Plan 188)` that verifies:
  - The wrapper div has the `hidden` CSS class
  - The wrapper div has the `sm:flex` CSS class
  - The buttons are still present in the DOM

## 4. TDD Compliance Table

| Phase | Action | Result |
|-------|--------|--------|
| RED | Write test expecting `hidden` class on wrapper | Test fails — `hidden` class not yet present on wrapper (Received: `flex w-full gap-2`) |
| GREEN | Change wrapper className to `hidden w-full gap-2 sm:flex` | All 44 tests pass |
| REFACTOR | No refactoring needed | — |

## 5. Test Evidence

```
 ✓ src/__tests__/components/ProviderCard.test.tsx (44 tests) 215ms

 Test Files  1 passed (1)
      Tests  44 passed (44)
   Start at  21:39:49
   Duration  1.13s (transform 154ms, setup 65ms, collect 285ms, tests 215ms, environment 347ms, prepare 55ms)
```
