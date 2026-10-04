---
ID: 188
Origin: 188
UUID: b8d4e3f2
Status: Active
---

# Plan 188: Hide Admin Approve/Reject Buttons on Mobile

## 1. Changelog

| Date | Change |
|------|--------|
| 2026-06-18 | Initial plan created |

## 2. Value Statement

Mobile admin UX: eliminate oversized buttons that dominate cards on narrow screens, improving scanability during moderation.

## 3. Scope

Single file change to `src/components/providers/ProviderCard.tsx`, plus test updates in `src/__tests__/components/ProviderCard.test.tsx`.

## 4. Deliverables

- Add `hidden sm:flex` to the moderation button wrapper `<div>` at line 548 of `ProviderCard.tsx`
- Add responsive test verifying buttons are hidden below the `sm:` breakpoint (640px)

## 5. Acceptance Criteria

1. No Approve/Reject buttons visible on screens <640px
2. Buttons visible on screens >=640px
3. All existing tests pass
4. New responsive test passes

## 6. Risks

None identified. The change is a single Tailwind class addition on a responsive breakpoint. Existing tests render at jsdom's default viewport width (1024px), so buttons remain visible in existing test scenarios.

## 7. Version Impact

Patch bump (bugfix).
