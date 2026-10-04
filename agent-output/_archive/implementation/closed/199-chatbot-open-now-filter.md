---
ID: 199
Origin: 199
UUID: c4e8f213
Status: Active
---

# Implementation 199: Chatbot "Open Now" Filter

## Plan Reference

`agent-output/planning/199-chatbot-open-now-filter.md`
Analysis: `agent-output/analysis/closed/199-chatbot-open-now-filter-analysis.md`
Critique: `agent-output/critiques/199-chatbot-open-now-filter-critique.md` (APPROVED)

## Date

2026-08-02

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-08-02 | Critic → Implementer | Execute Plan 199 milestones M1–M4 | Implemented `opening_hours` RPC column, `open_now` filter + `is_open` annotation in tool executor, system prompt guidance, version bump to 0.15.3 |

## Implementation Summary

Fixed the reported bug ("open burger restaurants in Stuttgart" showed closed providers too) by:
1. Adding `opening_hours JSONB` to the `search_providers_chat` RPC's `RETURNS TABLE` (migration 121, additive/backward-compatible).
2. Adding an `open_now` boolean parameter to the chatbot's `search_providers` tool, and annotating every result with `is_open` (computed via the existing, already-tested `getOpenStatus()` utility — same logic used by `/search`'s "Open now" chip). When `open_now: true`, results are filtered to only `is_open === true`.
3. Adding system-prompt guidance so the LLM sets `open_now: true` on temporal keywords ("offen", "geöffnet", "jetzt", "open now") and presents `is_open` status to the user.

This delivers the plan's value statement: users asking for currently-open providers now get only open providers (or an honest "no open results" message), reusing proven, tested time-computation logic rather than introducing new logic.

## Milestones Completed

- [x] M1 — RPC: added `opening_hours` column to `search_providers_chat` (migration 121)
- [x] M2 — Tool executor: `open_now` param + `is_open` annotation + filter
- [x] M3 — System prompt: temporal keyword + presentation guidance
- [x] M4 — Version bump to 0.15.3 + CHANGELOG + lockfile sync

## Files Modified

| Path | Changes | Lines |
|------|---------|-------|
| `src/features/chat/services/tool-executor.ts` | Added `getOpenStatus`/`OpeningHours` imports, `open_now` tool param, post-RPC annotation + filter logic in `search_providers` case | +25/-1 |
| `src/features/chat/prompts/system-prompt.ts` | Added TOOL USAGE bullet for temporal keywords + presentation bullet for `is_open` | +2 |
| `src/__tests__/features/chat/tool-executor.test.ts` | Added `getOpenStatus` mock + 3 new test cases (annotation, filter, tool-definition param) | +62 |
| `package.json` | Version bump 0.15.2 → 0.15.3 | 1 |
| `package-lock.json` | Synced via `npm install --package-lock-only` | 2 |
| `CHANGELOG.md` | Added `[Unreleased] - 2026-08-02` entry for Plan 199 | +5 |

## Files Created

| Path | Purpose |
|------|---------|
| `supabase/migrations/121_plan_199_chatbot_open_now.sql` | Adds `opening_hours JSONB` to `search_providers_chat` RETURNS TABLE (CREATE OR REPLACE, additive) |
| `src/__tests__/features/chat/system-prompt.test.ts` | Regression test asserting `buildSystemPrompt()` includes `open_now` guidance |

## Schema Verification Gate

`opening_hours JSONB` was confirmed to already exist on `public.providers` — added in migration `078_provider_opening_hours.sql` and already read/written by migrations 094, 098, 101, 102, 106, 119, and consumed identically (raw JSONB passthrough) by the Plan 196 RPC in `120_plan_196_search_food_near_me.sql`. No schema drift risk — this migration only changes the RPC's `RETURNS TABLE`/`SELECT`, referencing an already-existing column.

## Code Quality Validation

- [x] `npx vitest run` (full suite): 1865 passed, 5 failed (pre-existing, unrelated — see Outstanding Items), 24 skipped
- [x] `npm run type-check`: clean, 0 errors
- [x] `npm run lint` (full-repo): 70 pre-existing errors / 164 pre-existing warnings across unrelated files, confirmed via `git stash` diff — zero new errors introduced by this change (3 pre-existing errors in `tool-executor.ts` verified identical before/after)
- [x] `npm run build`: succeeds, no new errors

## Value Statement Validation

**Original**: Users asking the chatbot for currently-open providers (e.g., "open burger restaurants in Stuttgart") should only see open providers, or an honest message if none are open.
**Delivered**: `open_now: true` now filters chatbot results to `is_open === true` only, reusing the same `getOpenStatus()` logic already trusted for `/search`. Providers without opening-hours data are annotated `is_open: null` and excluded from `open_now` queries (per Decision D6) rather than silently assumed open or closed.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `search_providers` open_now filter + is_open annotation (tool-executor.ts) | `tool-executor.test.ts` | ✅ Yes | ✅ Yes | `AssertionError: expected undefined to be true` / `expected length 3, got 1 (inverted)` | ✅ Yes |
| `search_providers` tool definition `open_now` param | `tool-executor.test.ts` | ✅ Yes | ✅ Yes | `AssertionError: expected {...} to have property "open_now"` | ✅ Yes |
| `buildSystemPrompt()` temporal keyword guidance | `system-prompt.test.ts` | ✅ Yes | ✅ Yes | `AssertionError: expected prompt to contain 'open_now'` | ✅ Yes |
| `search_providers_chat` RPC `opening_hours` column (SQL, migration) | N/A — DB-layer additive change, verified via schema check (see Schema Verification Gate) rather than a unit test; covered indirectly by mocked RPC response shape in tool-executor tests | ⚠️ N/A (SQL DDL, no test framework applies) | N/A | N/A | N/A |

## Test Coverage

- **Unit**: 3 new tests in `tool-executor.test.ts` (annotation with mixed opening_hours/null, `open_now: true` filtering, tool definition shape)
- **Unit**: 1 new test in `system-prompt.test.ts` (prompt content regression guard)
- **Regression**: existing `search_providers` tests (RPC call args, empty-query passthrough) continue to pass unchanged — confirms no behavior change when `open_now` is omitted

## Test Execution Results

```
npx vitest run
Test Files  2 failed | 228 passed | 2 skipped (232)
     Tests  5 failed | 1865 passed | 24 skipped (1894)
```

The 5 failures are all in `src/__tests__/api/admin/review-provider/alcohol-conflict.test.ts` (Plan 193 menu-alcohol-check feature) — confirmed via `git stash` to fail identically with Plan 199 changes removed. Unrelated pre-existing failure, out of scope for this plan.

```
npm run type-check → 0 errors
npm run lint → 70 pre-existing errors (unrelated files), 0 new errors from this change
npm run build → success
```

## Outstanding Items

- **Pre-existing test failure** (`alcohol-conflict.test.ts`, 5 tests, Plan 193 scope) — confirmed unrelated to Plan 199 via git-stash diff. Not fixed here; flagging for separate investigation/plan if not already tracked.
- **Pre-existing lint debt** (70 errors / 164 warnings repo-wide, unrelated files) — confirmed unrelated via git-stash diff on `tool-executor.ts`. Out of scope for this plan.
- Per critique's LOW advisory: `getOpenStatus()` uses server-local `new Date()` (no explicit timezone handling). Acknowledged, no action required for this release — carried over from Plan 196 precedent.
- Migration 121 has not yet been applied to any remote/UAT Supabase project — DevOps/QA to apply via standard migration deployment process before functional QA of `open_now` filtering.

## Next Steps

QA → then UAT.
