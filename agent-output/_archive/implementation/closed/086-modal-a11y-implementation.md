---
ID: 086
Origin: 086
UUID: a7f3c91e
Status: Committed
---

# Implementation — Plan 086: Modal.tsx Accessibility Refactor

## Plan Reference
`agent-output/planning/086-modal-a11y-plan.md`

## Date
2026-04-07T09:40Z

## Changelog

| Date                | Handoff              | Request                       | Summary                                                                                                             |
| ------------------- | -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 2026-04-07T09:40Z   | Critic → Implementer | Implementation of approved plan | All 7 milestones complete. 934 tests pass. type-check EXIT 0. lint EXIT 0 (pre-existing warnings only).            |
| 2026-04-07T11:45Z   | DevOps | Stage 1 commit. Status → Committed. Moved to closed/. Target release v0.10.17. |

---

## Implementation Summary

Refactored `src/components/ui/Modal.tsx` to close all 9 accessibility and UX gaps identified in the Airbnb DLS reference analysis. Created 4 new reusable hooks in `src/hooks/`. All changes are self-contained — no new props, no changes to consumers, no new external dependencies.

The value statement is delivered: screen-reader and keyboard users can now interact with modal dialogs correctly — focus is trapped, background is hidden from assistive technology, Escape is scoped, and focus is restored on close.

---

## Critique Findings Acknowledgement

- **F1 (Exit animation ineffective for current consumers)**: Both consumers pass `isOpen={true}` and close by unmounting the parent. The `useDelayedUnmount` hook's exit delay never fires for them (React unmount cleanup clears the timer immediately). The hook is still architecturally correct for future consumers that toggle `isOpen`. Test coverage includes the "parent unmounts while isOpen=true" path (M6 test: "when parent mounts isOpen=true and unmounts, cleanup runs without error") confirming no leaked timers.
- **F2 (D9 missing from Decision Record)**: Acknowledged — z-index is covered in M5 AC#9.
- **F3 (className prop reference)**: Irrelevant to implementation.
- **F4 (Portal container naming)**: `containerRef.current` is the dialog wrapper div — direct child of `document.body` as the portal root.

---

## Milestones Completed

- [x] M1 — `useScrollLock` — counter-based, stack-safe, original overflow restore
- [x] M2 — `useAriaHidden` — body sibling hiding, previous value restore
- [x] M3 — `useFocusTrap` — sentinel-pattern via `keydown` on container, focus restoration
- [x] M4 — `useDelayedUnmount` — 300ms default, 0ms for `prefers-reduced-motion`
- [x] M5 — `Modal.tsx` refactored — all 9 gaps closed
- [x] M6 — 35 new tests (23 hook units + 12 Modal integration), 934 total passing
- [x] M7 — `package.json` bumped to `0.10.17` (preliminary — final version confirmed at DevOps Stage 1), `package-lock.json` aligned, `CHANGELOG.md` updated

**Version note**: Bumped to `0.10.17` (preliminary - final version confirmed at DevOps Stage 1). Current `origin/main` is `v0.10.16`.

---

## Files Modified

| Path | Changes | Net Lines |
|---|---|---|
| `src/components/ui/Modal.tsx` | Full refactor: integrated 4 hooks, escape→keyup with contains() guard, mousedown-track drag-close, aria-labelledby via useId(), sr-only title span, delayed unmount render gate, z-index fix | +30 / -28 |
| `src/__tests__/components/ProviderDetailModal.test.tsx` | Updated one test to use `getAllByText` (regression: sr-only span now also contains the provider name) | +1 / -1 |
| `package.json` | Version: 0.10.15 → 0.10.17 | +1 / -1 |
| `package-lock.json` | Version aligned to 0.10.17 | +2 / -2 |
| `CHANGELOG.md` | Added v0.10.17 entry documenting all 9 fixes | +23 |

---

## Files Created

| Path | Purpose |
|---|---|
| `src/hooks/useScrollLock.ts` | Counter-based scroll lock hook with original overflow capture/restore. Exports `_resetScrollLockForTesting()` for test isolation. |
| `src/hooks/useAriaHidden.ts` | Marks `document.body` siblings `aria-hidden="true"` while modal is open; restores previous values on cleanup. |
| `src/hooks/useFocusTrap.ts` | Traps Tab/Shift+Tab focus within container; restores focus to previous element on cleanup. |
| `src/hooks/useDelayedUnmount.ts` | Delays unmount for CSS exit animations; respects `prefers-reduced-motion`. |
| `src/__tests__/hooks/useScrollLock.test.ts` | 5 unit tests for useScrollLock |
| `src/__tests__/hooks/useAriaHidden.test.ts` | 6 unit tests for useAriaHidden |
| `src/__tests__/hooks/useFocusTrap.test.ts` | 5 unit tests for useFocusTrap |
| `src/__tests__/hooks/useDelayedUnmount.test.ts` | 7 unit tests for useDelayedUnmount |
| `src/__tests__/components/ui/Modal.test.tsx` | 12 integration tests for Modal.tsx covering all 9 gaps |

---

## Code Quality Validation

- [x] `npx tsc --noEmit` — EXIT 0 (no errors)
- [x] `npx next lint` — EXIT 0 / warnings only (all pre-existing, none introduced by this change)
- [x] `./node_modules/.bin/vitest run` — 934 passed / 18 skipped / 0 failed
- [x] `npm install --package-lock-only` — lockfile aligned to v0.10.17

---

## Value Statement Validation

**Original**: "As a screen-reader or keyboard-only user visiting UFlow, I want the provider/community-service detail modals to trap focus, restore focus, hide background from assistive tech, and handle keyboard dismissal correctly."

**Implementation delivers**:
- ✅ Focus trap: `useFocusTrap` with container-scoped Tab handler
- ✅ Focus restoration: previous element reference captured on mount, restored on cleanup
- ✅ Background hidden: `useAriaHidden` marks all body siblings `aria-hidden="true"`
- ✅ Keyboard dismissal scoped: `keyup` + `contains()` guard
- ✅ Pointer UX fixes: drag-close prevented, scroll-lock stack-safe, z-index correct
- ✅ Correct semantic labeling: `aria-labelledby` now points to a real element

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `useScrollLock` | `useScrollLock.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/hooks/useScrollLock"` (module not found) | ✅ Yes |
| `useAriaHidden` | `useAriaHidden.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/hooks/useAriaHidden"` (module not found) | ✅ Yes |
| `useFocusTrap` | `useFocusTrap.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/hooks/useFocusTrap"` (module not found) | ✅ Yes |
| `useDelayedUnmount` | `useDelayedUnmount.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/hooks/useDelayedUnmount"` (module not found) | ✅ Yes |
| `Modal` (Gap 7: aria-labelledby) | `Modal.test.tsx` | ✅ Yes | ✅ Yes | `expected null not to be null` (label element didn't exist) | ✅ Yes |
| `Modal` (Gap 4: Escape scoping) | `Modal.test.tsx` | ✅ Yes | ✅ Yes | `expected "spy" to be called 1 times, but got 0 times` (keydown vs keyup) | ✅ Yes |
| `Modal` (Gap 9: z-index) | `Modal.test.tsx` | ✅ Yes | ✅ Yes | `expected null not to be null` (data-testid="modal-content" didn't exist) | ✅ Yes |
| `Modal` (Gap 3: aria-hidden) | `Modal.test.tsx` | ✅ Yes | ✅ Yes | `expected null to be 'true'` (useAriaHidden not integrated) | ✅ Yes |
| `Modal` (Gap 1+2: focus) | `Modal.test.tsx` | ✅ Yes | ✅ Yes | `expected <body> to be <button>` (first button) | ✅ Yes |

---

## Test Coverage

**New tests added**: 35 (23 hook unit + 12 integration)
**Total suite**: 934 passing / 18 skipped / 0 failed

### Gap → Test Mapping

| Gap | Tests | Pass |
|---|---|---|
| 1. Focus trap | `useFocusTrap.test.ts` – 2 Tab-wrap tests (hook); `Modal.test.tsx` – initial focus test | ✅ |
| 2. Focus restoration | `useFocusTrap.test.ts` – restore + DOM-removed fallback; `Modal.test.tsx` (implicit via cleanup) | ✅ |
| 3. aria-hidden on background | `useAriaHidden.test.ts` – 6 tests; `Modal.test.tsx` – 1 integration test | ✅ |
| 4. Escape scoping | `Modal.test.tsx` – 3 tests (scoped inside, not outside, keyup vs keydown) | ✅ |
| 5. Drag-close | `Modal.test.tsx` – 2 tests (drag misfire blocked, clean click succeeds) | ✅ |
| 6. Scroll lock stacking | `useScrollLock.test.ts` – 5 tests including stack-safe scenario | ✅ |
| 7. aria-labelledby | `Modal.test.tsx` – 2 tests (wired when title given, absent when not) | ✅ |
| 8. Exit animation | `useDelayedUnmount.test.ts` – 7 tests; `Modal.test.tsx` – 2 lifecycle tests | ✅ |
| 9. Z-index | `Modal.test.tsx` – CSS class assertion test | ✅ |

---

## Test Execution Results

```
Test Files  99 passed | 1 skipped (100)
Tests       934 passed | 18 skipped (952)
Duration    18.23s
```

**Regression guard**: `ProviderDetailModal.test.tsx` test for "should render provider name in modal title" updated from `getByText` to `getAllByText` because the new `sr-only` title span correctly renders the provider name alongside the existing content div — both are expected and valid.

---

## Local Verification

`Local verification: ⚠️ Blocked` — No `.env.local` file in the worktree; Supabase credentials required for dev server boot. All 9 gaps are covered by automated tests. Manual browser verification remains a QA/UAT responsibility.

---

## Outstanding Items

- None blocking. All 9 gaps implemented and tested.
- Design debt items (z-index proliferation, multiple independent modal implementations, redundant ARIA in CommunityServiceDetailModal) remain out of scope per plan, logged in Arch 086 §7.
- Exit animation (Gap 8) is architecturally correct but not visible with current consumers (both use always-`isOpen={true}` pattern) — F1 from Critique, acknowledged and non-blocking.

---

## Next Steps

Code Reviewer → QA
