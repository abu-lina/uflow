# 086 — Modal Accessibility Refactor — Architecture Findings

**ID**: 086
**Origin**: Session S086-modal-a11y
**Status**: APPROVED_WITH_CHANGES
**Verdict**: APPROVED_WITH_CHANGES — all 9 gaps are addressable within current architecture; no new dependencies required

## Changelog

| Date       | Context                        | Summary                                                                 |
| ---------- | ------------------------------ | ----------------------------------------------------------------------- |
| 2026-04-07 | Architect Phase 1 — S086       | Initial findings: 9 gaps mapped to patterns, ADRs emitted, risks noted |

---

## 1. Scope & Current State

### Source File

`src/components/ui/Modal.tsx` — 66 LOC, client component (`'use client'`), renders via `createPortal` to `document.body`.

### Consumers (2 — no changes allowed to these)

| Consumer | Usage |
|---|---|
| `src/components/providers/ProviderDetailModal.tsx` | `<Modal isOpen={true} title={name} onClose={onClose}>` |
| `src/components/community-services/CommunityServiceDetailModal.tsx` | Same pattern; **also duplicates `role="dialog"` + `aria-modal` inside children** (technical debt — out of scope for this task but noted) |

### Constraints

- TypeScript strict mode must stay green
- No new public props beyond what's required to close the 9 gaps
- No changes to callers (`isOpen`, `onClose`, `title`, `children`, optional `className` — current API)
- Existing `className` override pattern must remain intact

---

## 2. Gap Analysis & Recommended Patterns

### Gap 1: No Focus Trap (CRITICAL)

**Current**: No focus containment. Tab key moves focus to elements behind the modal backdrop.

**Recommended Pattern**: Sentinel-div focus trap (Airbnb pattern).

Two zero-height `<div tabIndex={0}>` elements placed at the start and end of the dialog content. On focus of either sentinel, redirect to the opposite boundary's first/last focusable child.

**Implementation**: New hook `useFocusTrap(containerRef, isOpen)` in `src/hooks/useFocusTrap.ts`.

**Why sentinel divs over `focusin` listener**: Sentinel divs are synchronous, require no DOM query on every focus event, and work correctly with screen readers that skip the tab order. They match WAI-ARIA dialog pattern and the Airbnb reference.

**Why not a third-party library (e.g., focus-trap-react)**: Adding a dependency for 40 lines of hook code violates YAGNI and introduces supply-chain surface. The sentinel pattern is well-understood and testable.

**Trade-off**: Sentinel divs add 2 DOM nodes. Negligible cost. Accepted.

**ADR-086-1**: Use sentinel-div focus trap implemented as a custom hook. No third-party dependency.

---

### Gap 2: No Focus Restoration (CRITICAL)

**Current**: When modal closes, focus stays on `document.body` or wherever the browser leaves it.

**Recommended Pattern**: Capture `document.activeElement` on mount, restore on unmount.

**Implementation**: Integrate into `useFocusTrap` hook — store `previouslyFocusedElement` ref on mount, call `.focus()` on cleanup. Must guard for element still being in DOM (it may have been removed).

**Edge case**: If trigger element is removed from DOM while modal is open (unlikely in current consumers but must be defensive), fall back to `document.body`.

**ADR-086-2**: Focus restoration is part of the focus trap hook lifecycle. Capture on mount, restore on cleanup.

---

### Gap 3: No `aria-hidden` on Background (HIGH)

**Current**: Background content remains fully visible to screen readers while modal is open.

**Recommended Pattern**: Set `aria-hidden="true"` on all direct children of `document.body` except the portal container.

**Implementation**: New hook `useAriaHidden(containerRef, isOpen)` in `src/hooks/useAriaHidden.ts`. On open, iterate `document.body.children`, skip the portal container and `<script>` tags, set `aria-hidden="true"`. On close (cleanup), restore previous values.

**Why not `inert` attribute**: `inert` also blocks pointer/keyboard which could interfere with scroll-lock and other behaviors in unexpected ways. `aria-hidden` is the minimal-invasive a11y fix. Additionally, `inert` still has partial Safari support concerns for some user segments.

**Trade-off**: `aria-hidden` approach requires iterating siblings on open/close. With typical DOM depth (< 10 direct children of body), this is negligible.

**ADR-086-3**: Use `aria-hidden` on sibling elements (not `inert`). Implemented as a standalone hook.

---

### Gap 4: Global Keydown Listener — Scoping & Event Phase (HIGH)

**Current**: `document.addEventListener('keydown', handleEscape)` — fires for ALL modals in stack, no `contains()` guard, uses `keydown` (triggers on repeat).

**Recommended Pattern**:
1. Switch from `keydown` to `keyup` — prevents repeat-fire and matches Airbnb pattern
2. Add `contains()` guard: only fire `onClose` if the event target is within `modalRef.current`
3. Add `stopPropagation()` to prevent parent modals from also closing

**Implementation**: Inline in the existing `useEffect` — no new hook needed.

**Why `keyup` over `keydown`**: `keydown` fires on auto-repeat (holding Escape). `keyup` fires once on release. For modal dismiss this is the correct UX — you don't want rapid-fire close events in a stacked scenario. The Airbnb bundle confirms this choice.

**ADR-086-4**: Escape handling moves to `keyup`, adds `contains()` guard and `stopPropagation()`.

---

### Gap 5: Drag-Close Bug (HIGH)

**Current**: Clicking backdrop calls `onClose` via `onClick`. If user mousedowns inside modal content, drags to backdrop, and releases — `onClick` fires on backdrop → unintended close.

**Recommended Pattern**: Track `mousedown` target. Only allow close if both `mousedown` AND `mouseup` (or `click`) occurred on the backdrop element.

**Implementation**: `mouseDownTarget` ref inside the Modal component. Set on `onMouseDown` of the outer wrapper. In the backdrop's `onClick`, check `mouseDownTarget.current === backdropElement`.

**ADR-086-5**: Mousedown-tracking pattern for backdrop dismiss. No new hook — inline refs.

---

### Gap 6: Non-Stack-Safe Scroll Lock (HIGH)

**Current**: `document.body.style.overflow = 'hidden'` / `'unset'` — no counter. If Modal A and Modal B are both open and B closes, scroll is restored even though A still needs it locked.

**Recommended Pattern**: Counter-based scroll lock. Global counter incremented on each modal mount, decremented on unmount. Only apply `overflow: hidden` when counter goes from 0→1, restore when counter goes from 1→0.

**Implementation**: New hook `useScrollLock(isOpen)` in `src/hooks/useScrollLock.ts`. Module-level `let lockCount = 0` inside the hook file. Increment on mount, decrement on cleanup. Only mutate `document.body.style.overflow` at the 0↔1 boundary.

**Why module-level counter over Context**: Context would require a provider wrapper, breaking the "no changes to callers" contract. Module-level counter is the simplest correct solution for same-module usage. Airbnb's reference also uses a file-level counter.

**Side note**: `document.body.style.overflow = 'unset'` is incorrect — it should restore the *previous* value. The hook should capture the original `overflow` value on first lock and restore it on last unlock.

**ADR-086-6**: Module-level counter-based scroll lock hook. Captures and restores original overflow value.

---

### Gap 7: `aria-labelledby` Not Wired (MEDIUM)

**Current**: `aria-labelledby={title ? 'modal-title' : undefined}` — uses hardcoded `'modal-title'` but no element ever receives `id="modal-title"`.

**Recommended Pattern**: Generate a stable, unique ID per modal instance. Render a visually-hidden `<span>` (or visible heading) with that ID inside the dialog, containing the `title` text. Wire `aria-labelledby` to that ID.

**Implementation**: Use `useId()` (React 18+) to generate the ID. Add a visually-hidden `<span id={titleId} className="sr-only">` rendered when `title` is provided.

**Why `useId()` over hardcoded string**: Multiple simultaneous modals would collide on `id="modal-title"`. `useId()` is guaranteed unique per component instance.

**Why visually-hidden `<span>` rather than requiring children to have a heading**: This keeps the pattern self-contained in Modal without requiring consumers to wire IDs. The `title` prop already exists and provides the semantic label.

**ADR-086-7**: Use `React.useId()` for unique label ID. Render visually-hidden `<span>` when `title` is provided.

---

### Gap 8: Immediate Unmount — No Exit Animation (MEDIUM)

**Current**: `if (!isOpen) return null` — component unmounts immediately, no exit transition.

**Recommended Pattern**: Delayed unmount using a `shouldRender` state that remains `true` for the exit animation duration after `isOpen` goes `false`.

**Implementation**: New hook `useDelayedUnmount(isOpen, durationMs)` in `src/hooks/useDelayedUnmount.ts`. Returns `{ shouldRender, isAnimating }`. When `isOpen` transitions from `true` to `false`, keep `shouldRender = true` for `durationMs` (default: 300ms). Expose `isAnimating` for CSS transition classes.

**Why 300ms default**: Matches typical modal exit animation duration. The Airbnb reference uses 667ms but that's specific to their complex multi-step transitions. 300ms is standard for a simple fade/scale-out and respects `prefers-reduced-motion` (set to 0ms when reduced motion is preferred).

**`prefers-reduced-motion` respect**: The hook MUST check `window.matchMedia('(prefers-reduced-motion: reduce)')` and skip the delay entirely if true. The codebase already has `useReduceMotion` but that hook is dev-only (iOS flicker). The delayed-unmount hook should do its own media query check.

**CSS transition classes**: The Modal component will conditionally apply opacity/transform classes based on `isAnimating` state. No JavaScript animation library needed — CSS transitions suffice.

**ADR-086-8**: CSS-transition-based exit animation with delayed unmount hook. 300ms default, 0ms for reduced motion.

---

### Gap 9: Z-Index Collision (LOW)

**Current**: Both the outer wrapper (`z-[999999]`) and inner content div (`z-[999999]`) share the same z-index value.

**Recommended Pattern**: Distinct z-index values with clear layering:
- Outer dialog wrapper: `z-[999999]` (unchanged — establishes stacking context)
- Backdrop: no explicit z-index needed (part of the wrapper flow)
- Content: `z-[1000000]` or just `z-10` (relative within the wrapper's stacking context)

**Better approach**: Since the outer wrapper creates a new stacking context via `position: fixed`, the inner elements only need *relative* z-index values. The backdrop and content are siblings within the wrapper:
- Backdrop: `z-0` (or no explicit z-index)
- Content: `z-10`

This is cleaner and avoids the z-index arms race visible across the codebase (`z-[9999]`, `z-[99999]`, `z-[999999]`).

**ADR-086-9**: Use stacking-context-relative z-index: backdrop `z-0`, content `z-10`, within the existing `z-[999999]` wrapper.

---

## 3. New Hooks Summary

| Hook | File | Responsibility |
|---|---|---|
| `useFocusTrap` | `src/hooks/useFocusTrap.ts` | Sentinel-div focus trap + focus restoration on unmount |
| `useAriaHidden` | `src/hooks/useAriaHidden.ts` | Set `aria-hidden` on body siblings while modal is open |
| `useScrollLock` | `src/hooks/useScrollLock.ts` | Counter-based scroll lock with original-value restoration |
| `useDelayedUnmount` | `src/hooks/useDelayedUnmount.ts` | Delayed render for exit animations, reduced-motion aware |

**Placement rationale**: All four hooks are generic and reusable beyond Modal (any dialog, drawer, sheet component could use them). Per `docs/guides/PLACEMENT_RUBRIC.md`, shared hooks go in `src/hooks/`.

---

## 4. Props Contract — No Breaking Changes

Current API:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}
```

**No new props required.** All 9 gaps are addressable internally:
- Focus trap, restoration, aria-hidden, scroll lock → hooks using existing `isOpen`
- aria-labelledby → uses existing `title` prop
- Escape scoping → uses existing `modalRef`
- Drag-close → uses existing `onClose`
- Exit animation → uses existing `isOpen`
- Z-index → CSS-only change

The `className` pass-through pattern (if used by consumers) remains untouched.

---

## 5. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Focus trap interferes with rich content (image carousels, swipe handlers) inside modal | Medium | `useFocusTrap` only intercepts Tab key via sentinel focus redirect — does not prevent pointer/touch events on children. Carousel swipe (useImageSwipe) is pointer-driven, unaffected. |
| Exit animation delay causes stale content flash | Low | Content is frozen during exit animation — opacity fades to 0 so stale content is invisible. `shouldRender` prevents indefinite stale mount. |
| Counter-based scroll lock leaks if component crashes mid-lifecycle | Low | React `useEffect` cleanup guarantees decrement even on error boundary catch + unmount. |
| `aria-hidden` loop misses dynamically-added body children | Low | Applied on mount and cleaned on unmount. Short-lived dynamic children (e.g., toast portals) are transient and self-manage their a11y. |
| Duplicate `role="dialog"` + `aria-modal` in `CommunityServiceDetailModal` | Informational | **Out of scope** for this task. Logged as technical debt. The inner `role="dialog"` on the `<section>` is redundant with Modal's own `role="dialog"`. Should be cleaned up in a follow-up. |

---

## 6. Observability

This is a pure UI/a11y refactor with no backend or data-flow changes. No new telemetry points are required.

**Debug-level**: If focus trap or scroll lock misbehaves in production, developers can inspect via browser DevTools (aria-hidden attributes, computed overflow, focus order). No custom logging warranted for this scope.

---

## 7. Codebase-Wide Observations (Design Debt)

These are **out of scope** for Task 086 but recorded for the design debt registry:

1. **Z-index proliferation**: The codebase has at least 4 distinct z-index tiers (`z-[9999]`, `z-[99999]`, `z-[999999]`, `z-[1000000]`) across 10+ components. A centralized z-index scale (e.g., Tailwind theme extension) would prevent collisions.

2. **Multiple modal implementations**: `CitySearchModal`, `IOSInstallInstructionsModal`, `ProviderSelectionModal`, `LegalLinksModal`, `CitySelectionModal`, `AccountDeletionModal` — all implement their own portal/backdrop/dismiss logic independently of `Modal.tsx`. These should migrate to use the now-improved `Modal.tsx` to inherit the a11y fixes.

3. **Redundant ARIA in CommunityServiceDetailModal**: The inner `<section role="dialog" aria-modal="true">` duplicates what `Modal.tsx` already provides. Should be cleaned to just `<section>` on next touch.

---

## 8. Testing Requirements (for Planner)

Each gap needs regression test coverage:

| Gap | Test Strategy |
|---|---|
| 1. Focus trap | Tab from last focusable → wraps to first. Shift+Tab from first → wraps to last. |
| 2. Focus restoration | After close, `document.activeElement` equals the trigger element. |
| 3. aria-hidden | While open, body siblings have `aria-hidden="true"`. After close, restored. |
| 4. Escape scoping | Escape on `keyup` inside modal → closes. Escape outside `contains()` → does not close. |
| 5. Drag-close | Mousedown inside content, mouseup on backdrop → does NOT close. Click on backdrop → closes. |
| 6. Scroll lock | Open two modals, close one → body overflow still hidden. Close second → restored. |
| 7. aria-labelledby | When `title` provided, dialog has `aria-labelledby` pointing to element with matching `id` containing the title text. |
| 8. Exit animation | After `isOpen` → false, content remains in DOM for transition duration. After duration, removed. Reduced-motion: immediate removal. |
| 9. Z-index | Backdrop z-index < content z-index within the wrapper stacking context. |

---

## 9. Implementation Priority Order

Recommended task ordering for Planner (dependency-driven):

1. **useScrollLock** — standalone, no deps on other hooks
2. **useAriaHidden** — standalone, no deps
3. **useFocusTrap** (includes focus restoration) — standalone
4. **useDelayedUnmount** — standalone
5. **Refactor Modal.tsx** — integrates all 4 hooks + inline fixes (escape scoping, drag-close, aria-labelledby, z-index)
6. **Tests** — regression suite for all 9 gaps

Steps 1–4 can optionally be parallelized. Step 5 depends on 1–4. Step 6 depends on 5.

---

## Verdict

**APPROVED_WITH_CHANGES**

All 9 gaps are closable within the current architecture using 4 new hooks + inline fixes. No new dependencies, no API changes, no consumer modifications. The approach is minimal, testable, and follows established React patterns.

**Required condition**: Planner must ensure all 4 hooks have unit tests AND Modal.tsx has integration-level tests for the 9 gaps. TDD compliance is expected.
