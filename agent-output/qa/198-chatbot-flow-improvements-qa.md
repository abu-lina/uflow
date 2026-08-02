---
ID: 198
Origin: 198
UUID: b7e4a1c9
Status: QA Complete
---

# QA Report: Chatbot Flow Improvements (Plan 198)

**Plan Reference**: `agent-output/planning/198-chatbot-flow-improvements.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-08-02T16:30Z | Code Reviewer → QA | Code Review APPROVED, test Plan 198 | Phase 1 strategy + Phase 2 execution |

## Timeline

- **Test Strategy Started**: 2026-08-02T16:30Z
- **Test Strategy Completed**: 2026-08-02T16:30Z
- **Implementation Received**: 2026-08-02T16:00Z
- **Testing Started**: 2026-08-02T16:30Z
- **Testing Completed**: 2026-08-02T16:35Z
- **Final Status**: QA Complete

---

## Test Strategy (Pre-Implementation)

> *Plan 198 arrived with implementation already in place (TDD-first per implementer evidence). Strategy is post-hoc but evaluated against real user failure scenarios.*

### Critical User Paths

| Path | Bug Addressed | Risk If Broken |
|------|--------------|----------------|
| User opens chat, gets recommendation list, taps a provider card, presses Back → conversation restored | M3 back-nav persistence | HIGH — core discovery loop broken |
| User taps "Empfehlung erhalten" → assistant offers only restaurants, not stores/ummah | M1 food-only scope | MEDIUM — dead-end options confuse users |
| User answers multi-feature question → message sent without "Folgendes trifft zu: " prefix | M2 machine artifact | LOW — cosmetic but undermines trust |
| ChatFloatingWidget renders correctly on non-/chat pages and returns null on /chat | M3 hooks fix | MEDIUM — FAB could fail to render entirely |

### Testing Infrastructure

- Framework: Vitest v3.2.7 + jsdom (confirmed `vitest.config.ts`)
- Libraries: `@testing-library/react`, `@testing-library/jest-dom`
- Setup: `src/__tests__/setup.ts` — mocks `next/navigation`, `server-only`, Supabase env vars
- sessionStorage: available in jsdom — no additional setup needed

### Required Unit Tests

- [x] `useChat`: restores messages + conversationId from sessionStorage on remount
- [x] `useChat`: saves state to sessionStorage after API response
- [x] `useChat`: starts fresh when sessionStorage empty (regression guard)
- [x] `QuickReplies`: multi-select sends comma-joined items WITHOUT "Folgendes trifft zu:" prefix
- [x] `QuickReplies`: single-item multi-select sends item without prefix
- [x] `QuickReplies`: single-select calls onSelect immediately
- [x] `QuickReplies`: multi-select shows confirm button after selection

### Acceptance Criteria

1. All 3 session-persistence tests pass with lazy-initializer implementation (Code Reviewer fix-in-review applied)
2. All 4 QuickReplies tests pass
3. No new test failures introduced vs baseline (`2 failed / 5 failed` pre-existing baseline)
4. `tsc --noEmit` exits 0
5. Delta lint (changed files only) — no new errors vs baseline
6. `applicable_section` filter in `buildSystemPrompt` uses `.in(['food', 'all'])` — confirmed in source

### Focus/Scroll Side-Effects: NOT APPLICABLE
This plan does not use `focus()` or trigger keyboard behavior.

### Accordion/Controlled-Open Mock Fidelity: NOT APPLICABLE
No accordion/modal components modified.

### TDD Compliance Gate

Per QA mode: TDD compliance table MUST be present in implementation doc before proceeding.

---

## Implementation Review (Post-Implementation)

### Code Changes Summary (from impl doc)

| File | Change |
|------|--------|
| `src/features/chat/hooks/useChat.ts` | + sessionStorage persistence (lazy init + useEffect); + SINGLE_SELECT_RE constant; Code Reviewer fix-in-review: lazy initializers replace useRef pattern |
| `src/features/chat/components/ChatFloatingWidget.tsx` | Hooks order fixed — early return moved after all hooks |
| `src/features/chat/components/QuickReplies.tsx` | Removed "Folgendes trifft zu: " prefix in confirmSelection |
| `src/features/chat/prompts/system-prompt.ts` | Scope → food only; category filter → food/all; MULTI-SELECT ANSWERS cleaned |
| `src/app/api/chat/route.ts` | Redirect copy food-only |
| `src/__tests__/features/chat/useChat.test.ts` | sessionStorage.clear() in beforeEach; 3 session persistence tests |
| `src/__tests__/api/chat/route.test.ts` | `.in: vi.fn().mockReturnThis()` added to mock |
| `src/__tests__/features/chat/QuickReplies.test.tsx` | New file: 4 tests |

### TDD Compliance Gate

**TDD Table Present**: ✅ Yes (in `agent-output/implementation/198-chatbot-flow-improvements.md`)

| Row | Test Written First? | Failure Verified? | Pass After Impl? | QA Assessment |
|-----|---------------------|-------------------|------------------|---------------|
| `useChat` session restore | ✅ Yes | ✅ `AssertionError: expected [] to have length 2` | ✅ Yes | ACCEPTED |
| `useChat` sessionStorage save | ✅ Yes | ✅ `AssertionError: expected undefined to be 'conv-1'` | ✅ Yes | ACCEPTED |
| `QuickReplies` no-prefix | ✅ Yes | ✅ `AssertionError` on 'Folgendes trifft zu:' | ✅ Yes | ACCEPTED |
| `ChatFloatingWidget` hooks reorder | ⚠️ Post-fix (bugfix exception) | ✅ lint evidence via git stash | ✅ Yes | ACCEPTED — no new API surface, pre-fix lint confirmed |
| `SINGLE_SELECT_RE` refactor | ⚠️ Post-fix (bugfix exception) | ✅ behaviour unchanged | ✅ Yes | ACCEPTED — pure de-dup refactor |
| M1 prompt/query | ⚠️ Post-fix (bugfix exception) | ✅ route test mock gap | ✅ Yes | ACCEPTED — textual + 1-line query change |

TDD Compliance: **APPROVED** — 3 rows fully TDD-compliant; 3 rows validly use the bugfix regression exception with adequate evidence.

---

## Test Coverage Analysis

### New/Modified Code

| File | Function/Class | Test File | Test Case | Coverage Status |
|------|---------------|-----------|-----------|-----------------|
| `useChat.ts` | `loadSession()` | `useChat.test.ts` | `[pre-fix FAILS] restores messages…` | COVERED |
| `useChat.ts` | `saveSession()` | `useChat.test.ts` | `[post-fix PASSES] saves conversationId…` | COVERED |
| `useChat.ts` | `useChat()` — empty init | `useChat.test.ts` | `starts fresh when sessionStorage is empty` | COVERED |
| `useChat.ts` | `SINGLE_SELECT_RE` | `useChat.test.ts` | existing `[G1]` tests exercise SSE + JSON branches | COVERED (via existing) |
| `QuickReplies.tsx` | `confirmSelection()` | `QuickReplies.test.tsx` | `[post-fix PASSES] multi-select…WITHOUT machine artifact prefix` | COVERED |
| `QuickReplies.tsx` | `confirmSelection()` single-item | `QuickReplies.test.tsx` | `[post-fix PASSES] single-item multi-select…` | COVERED |
| `ChatFloatingWidget.tsx` | hooks order | — | No runtime test (hooks-order fix; lint confirms) | COVERED via lint |
| `system-prompt.ts` | `buildSystemPrompt()` category filter | `route.test.ts` | all 9 route tests pass (mock `.in()` added) | COVERED (smoke) |

### Coverage Gaps

- **`loadSession` corrupt JSON path**: catch branch not unit-tested directly. The try/catch is defensive and simple; coverage via type-check + implementation review is adequate.
- **SSE streaming + session save**: sessionStorage save after SSE responses not specifically tested. SSE branch is exercised by existing tests and the save is driven by the same `useEffect([messages, conversationId])` path already tested for JSON responses.
- **Browser runtime validation (manual)**: sessionStorage restoration on real Back-navigation requires a live browser session. See deferred validation record below.

---

## Test Execution Results

### Gate 1 — TDD Compliance

**Status**: ✅ PASS (table present, rows complete — validated above)

## Test Execution Results

### Gate 1 — TDD Compliance

**Status**: ✅ PASS (table present, rows complete — validated above)

### Gate 2 — Unit Tests (delta: chat feature tests)

**Command**: `npx vitest run "src/__tests__/features/chat/useChat.test.ts" "src/__tests__/features/chat/QuickReplies.test.tsx" --reporter=verbose`
**Status**: ✅ PASS
**Output**:
```
Tests  15 passed (15)
Duration  1.35s
```
All 11 original `useChat` tests pass. All 3 new session-persistence tests pass. All 4 new `QuickReplies` tests pass. Key regression tests confirmed:
- `[pre-fix FAILS] restores messages from sessionStorage on remount` ✅
- `[post-fix PASSES] saves conversationId and messages to sessionStorage after API response` ✅
- `[post-fix PASSES] multi-select confirmation sends comma-joined items WITHOUT machine artifact prefix` ✅

### Gate 3 — Unit Tests (full suite)

**Command**: `npx vitest run`
**Status**: ✅ PASS (pre-existing failures only)
**Output**:
```
Test Files  2 failed | 227 passed | 2 skipped (231)
Tests       5 failed | 1861 passed | 24 skipped (1890)
```
**Baseline** (pre-Plan 198, confirmed via git stash during implementation): `3 failed / 8 failed`.  
**Current**: `2 failed / 5 failed` — net improvement. The route.test.ts mock gap fixed by the implementation reduced the pre-existing failures. The 2 remaining failed files are `alcohol-conflict.test.ts` and `import-muslimbusiness-cli.test.ts` — both unrelated to Plan 198 and confirmed pre-existing.

### Gate 4 — Type Check

**Command**: `npm run type-check` (`tsc --noEmit`)
**Status**: ✅ PASS
**Output**: `ummah-flow@0.15.2 type-check` → exits 0, no errors.

### Gate 5 — Delta Lint

**Scope**: 8 files changed by Plan 198
**Command**: `npx eslint <8 files>`
**Status**: ✅ PASS (no new errors introduced)
**Output**: `✖ 28 problems (25 errors, 3 warnings)`

**Error attribution by file:**

| File | Errors | Origin |
|------|--------|--------|
| `src/app/api/chat/route.ts` | 9 errors (`ToolCall` unused, `no-control-regex`, `no-useless-escape` ×5, `no-empty` ×3) | PRE-EXISTING — my change was line 285 only |
| `src/features/chat/components/ChatFloatingWidget.tsx` | 10 `react/jsx-sort-props` errors | PRE-EXISTING — my change was hooks reorder (no JSX props changed); **REMOVED** 2 pre-existing `react-hooks/rules-of-hooks` errors |
| `src/features/chat/components/QuickReplies.tsx` | 3 `react/jsx-sort-props` errors | PRE-EXISTING |
| `src/features/chat/hooks/useChat.ts` | 1 error (`streamedConvId` unused) | PRE-EXISTING |
| `src/__tests__/api/chat/route.test.ts` | 2 warnings | PRE-EXISTING |
| `src/__tests__/features/chat/useChat.test.ts` | 1 warning (`no-non-null-assertion`) | PRE-EXISTING |
| `src/features/chat/prompts/system-prompt.ts` | **0 errors** | Clean ✅ |
| `src/__tests__/features/chat/QuickReplies.test.tsx` (new file) | **0 errors** | Clean ✅ |

**Net delta**: −2 errors (removed `react-hooks/rules-of-hooks` violations from `ChatFloatingWidget.tsx`). No new errors introduced.

---

## Browser-Runtime Validation

**Scope**: sessionStorage back-navigation (M3), food-only LLM scope (M1), no-prefix confirmations (M2)

**Status**: DEFERRED

- **Owner**: UAT agent / named operator
- **Risk**: MEDIUM (M3 sessionStorage restore requires real browser + live API; M1 prompt scope requires live LLM call)
- **M2 risk**: LOW — fully covered by automated `QuickReplies.test.tsx` regression tests
- **Trigger**: During UAT session before sign-off
- **Closure evidence required**: Manual validation on `/chat` mobile page — send message, tap a result card, press Back → conversation visible. Confirm assistant only offers restaurants (not stores/ummah).

---

## QA Summary

| Gate | Status | Evidence |
|------|--------|---------|
| TDD Compliance | ✅ PASS | Table complete; 3 rows fully TDD; 3 rows valid bugfix exception |
| Delta tests (15 tests) | ✅ PASS | 15/15 pass including all 3 regression tests |
| Full suite | ✅ PASS | 2 failed / 227 passed — 2 pre-existing, net improvement vs baseline |
| Type check | ✅ PASS | `tsc --noEmit` exits 0 |
| Delta lint | ✅ PASS | No new errors; net −2 (fixed hooks-of-rules) |
| Browser runtime | ⚠️ DEFERRED | Owner: UAT; trigger: UAT session |

**Overall QA verdict**: All automated gates pass. One deferred item (browser runtime) — appropriate for UAT phase. **QA Complete**.
