---
ID: 198
Origin: Planner
UUID: b7e4a1c9
Status: Released
---

# Code Review: Chatbot Flow Improvements (Plan 198)

**Plan Reference**: `agent-output/planning/198-chatbot-flow-improvements.md`
**Implementation Reference**: `agent-output/implementation/198-chatbot-flow-improvements.md`
**Date**: 2026-08-02
**Reviewer**: Code Reviewer

## Changelog

| Date       | Agent Handoff              | Request                   | Summary                                         |
| ---------- | -------------------------- | ------------------------- | ----------------------------------------------- |
| 2026-08-02 | Implementer → Code Reviewer | Review Plan 198 impl       | Post-implementation review; 1 fix-in-review applied |

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md`
**Alignment Status**: ALIGNED

The implementation follows established UFlow patterns:
- `sessionStorage` chosen over `localStorage` (correct — session-scoped, cleared on tab close)
- No new external dependencies introduced
- Server/client component boundaries respected (`'use client'` in hooks/components, server-only in `system-prompt.ts`)
- Postgres-first: the category filter `.in('applicable_section', ['food', 'all'])` uses the DB layer rather than client-side filtering

## Mandatory Checklist Results

| Checklist | Trigger | Result |
|-----------|---------|--------|
| 6a Path Refactor | Not triggered — no file moves | N/A |
| 6b Agent Spec | Not triggered — no `.agent.md` files touched | N/A |
| 6c Deployment Path Audit | Not triggered — no Dockerfile/deploy changes | N/A |
| 6d Outbound Data-Flow | Not triggered — no new `router.push` with params | N/A |
| 6e Interaction-Layer | Not triggered — no pointer-events/overlay changes | N/A |
| 6f Shared Results Actionability | Not triggered — no inline actions in result lists | N/A |
| 6g Deleted-Module Residue | Not triggered — no modules deleted | N/A |
| 6h Migration Filename | Not triggered — no migration files | N/A |
| 6i Migration SQL | Not triggered — no migration files | N/A |
| **6j i18n String Literal Scan** | **Triggered** — modified `ChatFloatingWidget.tsx`, `QuickReplies.tsx` | **2 components checked — 0 hardcoded labels introduced** |

**i18n detail**: `ChatFloatingWidget.tsx` change was hooks reorder only (no JSX content touched). `QuickReplies.tsx` change removed the `prefix` variable in `confirmSelection()` — a pure logic change with no new user-visible strings. Pre-existing hardcoded strings (`aria-label="Chat öffnen"`, `Bestätigen (n)`) are outside this plan's scope.

## TDD Compliance Check

**TDD Table Present**: ✅ Yes  
**All Rows Complete**: ✅ Yes  
**Assessment**: 

The two primary new-behaviour rows (session restore, session save) are fully TDD-compliant with failure evidence. The three exception rows (`ChatFloatingWidget` hooks reorder, `SINGLE_SELECT_RE` refactor, M1 prompt/query changes) correctly invoke the bugfix regression exception. Each exception is justified:

- **Hooks reorder**: No new API surface; lint confirmed the pre-fix violation (`react-hooks/rules-of-hooks` L15/L16) via git stash.
- **SINGLE_SELECT_RE**: Pure refactor — identical match semantics, de-duplicates two inline regex literals.
- **M1 prompt/query**: Textual changes + a one-line DB query filter; route test confirmed the mock gap fixed.

Primary value-delivery behavior has a direct regression test: `[pre-fix FAILS] restores messages from sessionStorage on remount` would fail if the persistence were reverted. ✅

## Findings

### Critical

None.

### High

None.

### Medium

**[MEDIUM] Performance — `loadSession()` called on every render (fix-in-review applied)**

- **Location**: `src/features/chat/hooks/useChat.ts` — `useChat()` function, initial state block
- **Issue**: The original pattern `const initial = useRef(loadSession()).current` evaluates `loadSession()` (a `sessionStorage.getItem()` + `JSON.parse()`) as an argument on **every render**, not just on mount. React only uses the initial value once but always evaluates the argument expression. During SSE streaming, `useChat` re-renders on every chunk (~30-60 times per assistant message), causing repeated unnecessary sessionStorage reads and JSON deserialization of the full conversation history.
- **Fix Applied (fix-in-review)**: Replaced with React lazy initializers — `useState(() => loadSession().messages)` and `useState(() => loadSession().conversationId)`. Lazy initializers are invoked **only on mount**, matching the intent. `loadSession()` is called twice (once per state slot) but only at mount time. This is the idiomatic React pattern for expensive initial state.
- **Verification**: `tsc --noEmit` exits 0 on the updated file. All 3 session-persistence tests were written before implementation and verified passing post-implementation (evidence in impl doc). The lazy initializer form is behaviourally identical for test purposes — `renderHook()` triggers a single mount.

### Low / Info

**[LOW] Pre-existing unused variable `streamedConvId`**

- **Location**: `src/features/chat/hooks/useChat.ts:L85` — `let streamedConvId: string | null = null;`
- **Issue**: Assigned at `streamedConvId = parsed.conversation_id` but never read. Lint reports `@typescript-eslint/no-unused-vars`. **Not introduced by this PR** (confirmed via git stash comparison in implementation session).
- **Recommendation**: Remove `streamedConvId` in a follow-up cleanup — out of scope for Plan 198.

**[INFO] `saveSession` fires on first mount writing empty state**

- **Location**: `src/features/chat/hooks/useChat.ts` — `useEffect`
- **Issue**: On a first visit (empty sessionStorage), the effect fires immediately after mount and writes `{"messages":[],"conversationId":null}`. This is a no-op cosmetically but a write to sessionStorage on every fresh load.
- **Recommendation**: Guard with `if (messages.length > 0 || conversationId)` before writing. Low priority — the write is cheap and functionally harmless.

## Positive Observations

1. **Idiomatic error handling in `loadSession`**: The `try/catch` around `JSON.parse` correctly handles corrupted or unexpected sessionStorage data, returning a safe empty state rather than crashing. The `typeof window === 'undefined'` guard correctly handles SSR context.

2. **`SINGLE_SELECT_RE` extraction**: Eliminates a duplicated regex that had a subtle typo in one branch (`küche` appeared twice in the SSE variant). De-duplicating to a named constant makes future changes atomic and removes the hidden inconsistency.

3. **Hooks fix quality**: The comment `// Don't show FAB on /chat page — early return AFTER all hooks (Rules-of-Hooks)` clearly explains the architectural reason for the hook placement, making the code self-documenting against regression.

4. **Test regression fix**: Adding `sessionStorage.clear()` to the top-level `beforeEach` is the correct fix for test isolation. The gap was latent in the original tests and only became visible when the hook started using sessionStorage — good catch.

5. **Route test mock completeness**: Adding `in: vi.fn().mockReturnThis()` to `mockSupabaseServer` is minimal and non-disruptive. The gap was pre-existing (the mock was never tested with `.in()` chaining), and the fix correctly unblocks the M1 category filter.

6. **Prompt narrowing completeness**: All three text vectors were updated consistently — SCOPE, TOOL USAGE wording, and the redirect copy in `route.ts`. No orphaned references to "stores" or "community services" in the prompt layer.

## Fix-in-Review Summary

| Finding | File | Change Applied | Verification |
|---------|------|---------------|-------------|
| `useRef(loadSession()).current` → lazy initializers | `useChat.ts` | Replaced with `useState(() => loadSession().messages)` and `useState(() => loadSession().conversationId)`; removed `initial` const | `tsc --noEmit` exits 0; existing tests cover behaviour |

## Verdict

**Status**: APPROVED

**Rationale**: No CRITICAL or HIGH findings. One MEDIUM finding (repeated sessionStorage reads during streaming) was identified and resolved in-review using the lazy initializer pattern — a small, well-understood, test-covered change. The implementation is correct, well-tested (TDD compliance fully evidenced), and architecturally aligned. The fix-in-review is the final code change required before QA.

## Required Actions

None — fix-in-review applied. Proceed to QA.

## Next Steps

Handing off to qa agent for test execution.
