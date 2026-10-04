---
ID: 205
Origin: 205
UUID: a4e9c1f3
Status: Planned
---

# 205 — iOS Keyboard UX Deficiency in ChatInput Textarea

**Date:** 2026-08-09
**Author:** @Analyst
**Pipeline:** Bugfix (Phase 1 of 6)

---

## Changelog

| Version | Date | Author | Note |
|---------|------|--------|------|
| 1.0 | 2026-08-09 | @Analyst | Initial analysis |

---

## Value Statement and Business Objective

iOS users composing chatbot messages experience suppressed autocorrect and QuickType bar, leading to increased typos in natural-language queries. Fixing this aligns with the platform objective of lowering friction for mobile users — who are the primary UFlow demographic. The fix is a one-line, zero-risk attribute addition.

---

## Objective

Determine the root cause of missing iOS keyboard assistance in the chat input textarea and confirm there are no other affected surfaces or downstream risks.

---

## Context

The chatbot feature (`/chat` page + floating widget) uses a single shared input component. Users on iOS Safari type into a `<textarea>` that is missing four standard HTML attributes that browsers use to configure the virtual keyboard and language assistance subsystem.

---

## Methodology

1. Read skill files: `analysis-methodology`, `document-lifecycle`
2. Read `src/features/chat/components/ChatInput.tsx` directly — verified at source
3. Searched all `*.tsx` files under `src/` for `textarea`, `ChatInput`, and chat-related patterns
4. Read `ChatFloatingWidget.tsx` and `ChatWidget.tsx` to trace the component tree
5. Read existing test file `src/__tests__/features/chat/ChatInput.test.tsx` to understand regression surface

---

## Findings

### F1 — Missing iOS Attributes on the Textarea

**Confidence: L1 Proven** (directly read from source)

File: [src/features/chat/components/ChatInput.tsx](../../src/features/chat/components/ChatInput.tsx)

The `<textarea>` is at **line 47**. Current props:

```tsx
<textarea
  ref={textareaRef}
  value={value}
  onChange={(e) => setValue(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Nachricht schreiben..."
  disabled={isLoading}
  rows={1}
  className="..."
  aria-label="Chat message input"
/>
```

**Missing:** `autoCorrect`, `autoCapitalize`, `spellCheck`, `enterKeyHint`

iOS Safari reads these attributes to configure its text input subsystem. When absent, the browser defaults to its most conservative behavior: no autocorrect, no capitalisation, no QuickType suggestions, and a generic Return key on the virtual keyboard.

---

### F2 — Single Input Surface (No Duplication Risk)

**Confidence: L1 Proven**

Component tree:
```
/chat (page)          → ChatWidget → ChatInput (SOLE TEXTAREA)
ChatFloatingWidget    → ChatWidget → ChatInput (SOLE TEXTAREA)
```

`ChatFloatingWidget` contains no textarea of its own. On mobile it redirects to `/chat` via `router.push('/chat')`. On desktop it renders `ChatWidget` inline. Both paths converge on `ChatInput`. No other chat textarea exists in the codebase.

---

### F3 — Technical Rationale for Each Attribute

**Confidence: L1 Proven** (standard HTML/iOS specification behaviour)

| Attribute | Value | Effect |
|-----------|-------|--------|
| `autoCorrect` | `"on"` | Enables iOS autocorrect engine. When absent (or `"off"`), autocorrect is suppressed even if the user has it enabled system-wide. |
| `autoCapitalize` | `"sentences"` | Capitalises the first word of each sentence. Without this, iOS defaults to `"off"` for `<textarea>` elements (unlike `<input>` which defaults to `"sentences"`). |
| `spellCheck` | `{true}` | Shows the red-underline spell-check UI and powers iOS suggestions. Without it, the browser decides — typically off for textarea in strict mode. |
| `enterKeyHint` | `"send"` | Replaces the virtual keyboard's Return key label/icon with a Send action affordance. Cosmetic but a strong UX signal for chat interfaces. |

---

### F4 — Risk Assessment

**Confidence: L1 Proven**

**Change isolation:** The four attributes are additive HTML hints. They do not alter React controlled-input behaviour, state, event flow, or rendering output beyond the DOM attributes.

**SSR / Hydration:** `spellCheck={true}` renders as `spellcheck="true"` in HTML. React 17+ aligns SSR and client rendering for boolean HTML attributes; this project uses Next.js 15 (React 19). No hydration mismatch risk.

**Cross-platform:** `autoCorrect` and `autoCapitalize` are iOS/Android-specific; desktop browsers ignore them silently. `spellCheck` is honoured on desktop as well — which is desirable for a chat input. `enterKeyHint` is supported on all modern mobile browsers and ignored gracefully on desktop.

**Keyboard behaviour change:** `enterKeyHint="send"` changes the keyboard's visual affordance only. The actual Enter-key send logic is already implemented in `handleKeyDown`. No double-send risk.

**Testing surface:** 6 existing tests cover: render, disabled state, send on click, send on Enter, empty send prevention, and clear after send. None currently assert the iOS attributes. The Implementer phase should add regression tests confirming the attributes are present on the rendered textarea.

---

## Root Cause

**L1 Proven.** The `<textarea>` in `ChatInput.tsx` was created without iOS-specific keyboard hint attributes. This is a specification omission rather than a regression — the attributes were never set. iOS Safari interprets absence of `autoCapitalize` on a textarea as `"off"`, and absence of `autoCorrect` as `"off"`, silently degrading the typing experience for all iPhone users.

---

## System Weaknesses

| Weakness | Risk Mechanism | Detection |
|----------|---------------|-----------|
| No lint rule or component convention for mobile input attributes | New `<textarea>` or `<input>` elements can be added without iOS attributes, repeating this gap | Add a custom ESLint rule or a team convention doc for mobile-chat inputs |
| Existing test suite does not verify HTML attribute presence | iOS-specific attributes can be stripped accidentally without test failure | Add attribute presence assertions to `ChatInput.test.tsx` |

---

## Instrumentation Gaps

None material to this fix. The issue is a static attribute omission — no runtime instrumentation is needed to diagnose or monitor it.

---

## Recommended Fix Summary

Add the following four props to the `<textarea>` in `ChatInput.tsx`:

```tsx
autoCorrect="on"
autoCapitalize="sentences"
spellCheck={true}
enterKeyHint="send"
```

Add regression tests to `ChatInput.test.tsx` asserting that the rendered textarea carries these attributes.

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| — | None | — | — | — |

All questions are resolved. No open gaps.

---

## Open Questions

None.

---

## Analysis Recommendations

1. Implement the four-prop addition in `ChatInput.tsx` (one `<textarea>` element, ~4 new attributes)
2. Add assertion tests: `expect(textarea).toHaveAttribute('autocorrect', 'on')`, `autocapitalize`, `spellcheck`, `enterkeyhint`
3. Consider a team convention doc or ESLint rule to prevent recurrence in new input surfaces
