---
ID: 268
Origin: 268
Status: Active
Type: change-request
Branch: cr/268-remove-create-chat-hint
Worktree: ../uflow-wt/268-remove-create-chat-hint
Created: 2026-09-29
---

# Request 268: Remove the Chat Assistant hint from /create

## Original request

> on https://uat.ummahflow.com/create on mobile view and desktop remove any hints for chat assistance creations.
> "You can also register quickly via the Chat Assistant"

## Classification

- **Type:** change-request
- **Route:** CR flow (grilling skipped: scope is a single verified UI element, no open design question)
- **Confidence:** high

## Phases

| #   | Phase                 | Status | Outcome                                |
| --- | --------------------- | ------ | -------------------------------------- |
| 0   | Tracking file created | Done   | This file                              |
| 1   | Locate the hint       | Done   | See Decisions                          |
| 2   | Implement             | Done   | Commit `dc1bf61f`, 8 files, +53/-36    |
| 3   | Code review           | Done   | No findings, diff matches spec exactly |
| 4   | Done                  | Done   | Pushed, PR #437                        |

## Decisions

| #   | Decision                    | Choice                                                | Rationale                                                                                                                   |
| --- | --------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Where the hint lives        | `src/app/(public)/create/page.tsx` lines 110-119      | Single `<p>` with no responsive gating, so one removal covers mobile and desktop. No other surface renders this hint.       |
| 2   | Remove vs feature-flag gate | Remove outright                                       | User asked to remove. The link pointed at `/` (QA 251 finding F10), so there is nothing to gate it on.                      |
| 3   | Translation keys            | Delete `create.chatHint` from all 6 locales           | `scripts/check-i18n.mjs` only flags keys missing vs `en`; deleting across all locales keeps parity and leaves no dead keys. |
| 4   | Regression coverage         | Source-text assertions in `src/__tests__/regression/` | Matches the existing convention in `255-create-entry.test.tsx`.                                                             |

## Spec

- `/create` renders no Chat Assistant hint at any viewport width.
- The two option cards ("I own a provider", "I know a provider") are untouched.
- No locale file retains a `create.chatHint` entry.
- `npm run i18n:check`, `npm run type-check`, `npm run lint:check` pass.

## Implementation notes

- Branch: `cr/268-remove-create-chat-hint`, commit `dc1bf61f` (not pushed)
- Tests added: `src/__tests__/regression/268-create-chat-hint-removed.test.tsx` (10 assertions, source-text style). Red first: 8 of 10 failed before the change.
- Files changed: `src/app/(public)/create/page.tsx` (removed the hint block and the now-unused `next/link` import), `src/translations/{en,de,ar,tr,ur,ps}.ts` (removed `create.chatHint`).

## Review findings

### Standards axis

No findings. Diff is removal-only apart from the new test. The `next/link` import came out with its only consumer, so no dead import. Commit message states the why.

### Spec axis

Matches. The hint was one non-responsive `<p>`, so mobile and desktop are both covered by the single removal. Verified the `src/app/(public)/create` subtree now has zero chat/assistant references; the remaining `assistant` strings in `en.ts` belong to the `chat.*` section (the chat page itself), which is out of scope.

## QA results

- Suite: pass. `vitest run` on 268 + 255-create-entry + 255-i18n-extraction: 54 tests pass. `i18n:check` exit 0 (all locales key-complete vs en). `type-check` clean.
- `lint:check` exits 1 on 146 pre-existing warnings (0 errors) under `--max-warnings 0`. None in the changed files; pre-commit lint-staged passed on the staged set.

## Follow-up requests

## Learnings

Captured in `docs/ai/LEARNINGS.md` as "268 - Symlinking node_modules into a fresh worktree inherits the stale checkout's missing deps". A symlinked `node_modules` made the worktree inherit the canonical checkout's stale install; `vitest` passed (lazy per-import resolution) but `tsc --noEmit` failed on `@electric-sql/pglite`, which is declared in `package.json` but not installed there. `npm ci` in the worktree took ~17s, less than diagnosing the phantom type error. The canonical checkout still needs `npm ci`.
