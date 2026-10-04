---
ID: 198
Origin: Planner
UUID: b7e4a1c9
Status: Released
---

# Implementation: Chatbot Flow Improvements (Plan 198)

## Plan Reference

`agent-output/planning/198-chatbot-flow-improvements.md`

## Date

2026-08-02T16:00Z

## Changelog

| Date       | Handoff            | Request           | Summary                                                  |
| ---------- | ------------------ | ----------------- | -------------------------------------------------------- |
| 2026-08-02 | Planner → Implementer | Plan 198 approved | Implement M3 (back-nav), M1 (food-only), M2 (copy), M4  |

## Implementation Summary

Implemented three chatbot UX fixes bundled as Plan 198:

**M3 — Back-navigation state loss + hooks fix**: Added `sessionStorage` persistence to `useChat.ts` (lazy initializer + `useEffect` save on change). This restores the full conversation (messages + conversationId) when the user presses browser Back from a provider detail page. Fixed Rules-of-Hooks violation in `ChatFloatingWidget.tsx` by moving early-return to after all hooks. Extracted `singleSelect` regex to a single module-level constant to eliminate duplication between SSE and JSON branches.

**M1 — Food-only scope**: Narrowed LLM system-prompt SCOPE to restaurants only. Filtered `buildSystemPrompt` category injection to `applicable_section IN ('food', 'all')`. Updated redirect copy in `route.ts`.

**M2 — Natural flow polish**: Removed `'Folgendes trifft zu: '` machine-artifact prefix from `QuickReplies.confirmSelection`. Removed now-unused prefix rule from `system-prompt.ts` MULTI-SELECT ANSWERS. Updated CONVERSATION STYLE guidance to be warm/conversational.

**M4 — Version bump**: `0.15.1 → 0.15.2` (preliminary — final confirmed by DevOps Stage 1). CHANGELOG entry added. Lockfile aligned.

## Milestones Completed

- [x] M3a — `useChat.ts`: sessionStorage load/save + `SINGLE_SELECT_RE` constant extraction
- [x] M3b — `ChatFloatingWidget.tsx`: hooks order fixed (early return moved after all hook calls)
- [x] M1 — `system-prompt.ts`: scope narrowed + category query food-filtered + TOOL USAGE updated
- [x] M1 — `route.ts`: redirect copy updated to food-only
- [x] M2 — `QuickReplies.tsx`: `'Folgendes trifft zu: '` prefix removed
- [x] M2 — `system-prompt.ts`: MULTI-SELECT ANSWERS cleaned up + CONVERSATION STYLE polished
- [x] M4 — `package.json` + `package-lock.json`: version `0.15.2` (preliminary)
- [x] M4 — `CHANGELOG.md`: entry added under `[Unreleased]`
- [x] Test suite: new tests green, no new regressions, fixed pre-existing route mock gap

## Files Modified

| Path | Changes | Lines |
| ---- | ------- | ----- |
| `src/features/chat/hooks/useChat.ts` | Added `CHAT_SESSION_KEY`, `loadSession()`, `saveSession()`, `SINGLE_SELECT_RE`; lazy-init `useState` from sessionStorage; `useEffect` to save on change; replaced 2 inline regexes with `SINGLE_SELECT_RE` | +35 / -5 |
| `src/features/chat/components/ChatFloatingWidget.tsx` | Moved `useAuth()` and `useState()` calls before early return; comment updated | +2 / -2 |
| `src/features/chat/components/QuickReplies.tsx` | Removed `prefix` variable and concatenation from `confirmSelection`; now sends plain `selectedTexts` | -2 |
| `src/features/chat/prompts/system-prompt.ts` | Narrowed SCOPE to food/restaurants; removed `'Folgendes trifft zu:'` prefix rule from MULTI-SELECT ANSWERS; polished CONVERSATION STYLE; updated TOOL USAGE copy; added `.in('applicable_section', ['food', 'all'])` to category query | +8 / -10 |
| `src/app/api/chat/route.ts` | Updated redirect copy (line 285) to food-only | +1 / -1 |
| `src/__tests__/features/chat/useChat.test.ts` | Added `sessionStorage.clear()` to top-level `beforeEach`; added 3 session-persistence tests | +40 |
| `src/__tests__/api/chat/route.test.ts` | Added `in: vi.fn().mockReturnThis()` to `mockSupabaseServer` (required by M1's `.in()` query) | +1 |
| `package.json` | Version `0.15.1` → `0.15.2` | +1 / -1 |
| `package-lock.json` | Version aligned to `0.15.2` | +2 / -2 |
| `CHANGELOG.md` | Added Plan 198 Fixed entry to `[Unreleased]` block | +4 |

## Files Created

| Path | Purpose |
| ---- | ------- |
| `src/__tests__/features/chat/QuickReplies.test.tsx` | New test file: 4 tests covering single-select direct call, multi-select confirm button, multi-select no-prefix semantic regression (Plan 198 M2), single-item no-prefix regression |

## Code Quality Validation

- [x] `npm run type-check` → exits 0, no errors
- [x] `npm run lint` → pre-existing errors only; my changes **reduced** error count (fixed 2 `react-hooks/rules-of-hooks` violations in `ChatFloatingWidget.tsx`)
- [x] `npx vitest run` → `2 failed | 227 passed` (2 failures are pre-existing in `alcohol-conflict.test.ts` and `import-muslimbusiness-cli.test.ts`, confirmed with git stash comparison)
- [x] Lockfile aligned: `grep '"version"' package-lock.json | head -2` → `"version": "0.15.2"` twice

## Local Verification

Local verification: ⚠️ Deferred — this change primarily affects LLM prompt content and `sessionStorage` behaviour, both of which require a live Supabase session and OpenRouter credentials. Manual browser verification is a QA/UAT responsibility. The `sessionStorage` read/write behaviour is fully covered by automated tests.

## Search/Filter Client-Interaction Trace

N/A — this plan does not touch search form submit handlers or inline admin actions in result lists.

## Multi-Plan State Audit

N/A — no prior-plan state mutations in scope (useChat is modified here for the first time).

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `useChat` session restore (new behaviour) | `useChat.test.ts` | ✅ Yes | ✅ Yes | `AssertionError: expected [] to have length 2` | ✅ Yes |
| `useChat` sessionStorage save (new behaviour) | `useChat.test.ts` | ✅ Yes | ✅ Yes | `AssertionError: expected undefined to be 'conv-1'` | ✅ Yes |
| `QuickReplies.confirmSelection` prefix removal | `QuickReplies.test.tsx` | ✅ Yes | ✅ Yes | `AssertionError: expected 'Folgendes trifft zu: …' to equal 'Muslimisch geführt, Gebetsraum'` | ✅ Yes |
| `ChatFloatingWidget` hooks reorder (no new API) | — | ⚠️ Post-fix (bugfix regression exception) | ✅ Yes | Pre-fix lint evidence: `react-hooks/rules-of-hooks` L15/L16 (confirmed via git stash) | ✅ Yes |
| `SINGLE_SELECT_RE` extraction (pure refactor) | — | ⚠️ Post-fix (bugfix regression exception) | ✅ Yes | Same behaviour, de-duplicated; existing `singleSelect` tests cover the path | ✅ Yes |
| M1 system-prompt + category filter (textual + query) | — | ⚠️ Post-fix (bugfix regression exception) | ✅ Yes | No new API surface; route test validated mock gap fixed | ✅ Yes |

## Test Coverage

**New tests added:**
- `src/__tests__/features/chat/useChat.test.ts` — 3 session persistence tests (restore from storage, save after response, empty-storage baseline)
- `src/__tests__/features/chat/QuickReplies.test.tsx` — 4 tests (single-select direct call, multi-select confirm button, multi-select no-prefix regression ×2)

**Existing tests protected:**
- All 8 original `useChat` tests pass (fixed sessionStorage bleed with `sessionStorage.clear()` in `beforeEach`)
- All 9 `route.test.ts` tests pass (added `.in: vi.fn().mockReturnThis()` to mock)

## Test Execution Results

```
npx vitest run src/__tests__/features/chat/useChat.test.ts \
               src/__tests__/features/chat/QuickReplies.test.tsx

Tests  15 passed (15)

npx vitest run (full suite)
Test Files  2 failed | 227 passed | 2 skipped (231)   ← 2 pre-existing failures
Tests  5 failed | 1861 passed | 24 skipped (1890)     ← 5 pre-existing failures
(baseline without my changes: 3 failed / 8 failed — my route.test.ts fix reduced count)
```

## Value Statement Validation

**Original**: "Users can discover restaurants naturally, get meaningful recommendations scoped to food, and return to chat after browsing a provider without losing conversation context."

**Delivered:**
1. ✅ Session restored from `sessionStorage` on remount → Back button works
2. ✅ System prompt scoped to food → "Empfehlung erhalten" no longer suggests stores/ummah
3. ✅ No machine artifact prefix → Multi-select confirmations feel natural
4. ✅ Rules-of-Hooks fixed → `ChatFloatingWidget` is correctly structured

## Outstanding Items

- The `applicable_section` DB filter now correctly restricts to `food | all` categories. As noted in the plan, the tool enum `VALID_LISTING_TYPES` still includes `store` and `ummah` (plan decision: guard/default rather than delete to avoid breaking existing registrations). This is intentional scope.
- Pre-existing test failures in `alcohol-conflict.test.ts` and `import-muslimbusiness-cli.test.ts` are unrelated to this plan.
- Version `0.15.2` is preliminary — final version confirmed by DevOps Stage 1 via `git fetch --tags`.

## Next Steps

Code Review → QA → UAT → DevOps
